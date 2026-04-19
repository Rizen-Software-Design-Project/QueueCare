import request from 'supertest';
import { jest } from '@jest/globals';

process.env.SUPABASE_URL = 'https://fakeUrlFrom.supabase.co';
process.env.SUPABASE_KEY = 'test-key';

class QueryMock {
    constructor(table, state) {
        this.table = table;
        this.state = state;
        this.action = 'select';
        this.singleMode = false;
        this.payload = null;
        this.filters = {
            eq: [],
            ilike: [],
            gte: [],
            lt: [],
            order: [],
            limit: null
        };
    }

    insert(payload) {
        this.action = 'insert';
        this.payload = payload;
        return this;
    }

    select() {
        if (this.action !== 'insert') {
            this.action = 'select';
        }
        return this;
    }

    eq(field, value) {
        this.filters.eq.push({ field, value });
        return this;
    }

    ilike(field, value) {
        this.filters.ilike.push({ field, value });
        return this;
    }

    gte(field, value) {
        this.filters.gte.push({ field, value });
        return this;
    }

    lt(field, value) {
        this.filters.lt.push({ field, value });
        return this;
    }

    order(field, value) {
        this.filters.order.push({ field, value });
        return this;
    }

    limit(value) {
        this.filters.limit = value;
        return this;
    }

    single() {
        this.singleMode = true;
        return this._resolve();
    }

    then(resolve, reject) {
        return this._resolve().then(resolve, reject);
    }

    async _resolve() {
        const call = {
            table: this.table,
            action: this.action,
            payload: this.payload,
            filters: this.filters,
            singleMode: this.singleMode
        };

        this.state.calls.push(call);

        let result = { data: null, error: null };

        if (this.state.handler) {
            result = await this.state.handler(call);
        }

        if (!result) {
            result = { data: null, error: null };
        }

        if (!('data' in result)) {
            result.data = null;
        }

        if (!('error' in result)) {
            result.error = null;
        }

        return result;
    }
}

const setupApp = async (handler) => {
    const state = {
        calls: [],
        handler
    };

    jest.resetModules();

    jest.unstable_mockModule('@supabase/supabase-js', () => {
        return {
            createClient: () => {
                return {
                    from: (table) => {
                        return new QueryMock(table, state);
                    }
                };
            }
        };
    });

    const { default: app } = await import('../servers/app.js');
    return { app, state };
};

describe('Appointment API', () => {
    test('returns 404 for an unknown route', async () => {
        const { app } = await setupApp();
        const response = await request(app).get('/this-route-does-not-exist');

        expect(response.statusCode).toBe(404);
        expect(response.body).toEqual({ error: 'Route not found' });
    });

    test('returns 400 when clinic search is missing required query values', async () => {
        const { app } = await setupApp();
        const response = await request(app).get('/clinics/available');

        expect(response.statusCode).toBe(400);
        expect(response.body).toEqual({ error: 'name and province are required' });
    });

    test('returns 400 when slot search is missing facility name', async () => {
        const { app } = await setupApp();
        const response = await request(app).get('/slots/available');

        expect(response.statusCode).toBe(400);
        expect(response.body).toEqual({ error: 'nameOfFacility is required' });
    });

    test('returns 404 when slot search runs before clinic search', async () => {
        const { app } = await setupApp();
        const response = await request(app)
            .get('/slots/available')
            .query({ nameOfFacility: 'Alpha Clinic' });

        expect(response.statusCode).toBe(404);
        expect(response.body).toEqual({ error: 'Facility not found. Please search for clinics first.' });
    });

    test('returns 401 when booking without patient sign-in', async () => {
        const { app } = await setupApp();
        const response = await request(app)
            .post('/appointments/book_appointment')
            .send({ reason: 'Headache' });

        expect(response.statusCode).toBe(401);
        expect(response.body).toEqual({ error: 'No patient signed in' });
    });

    test('returns 400 when appointments query returns a Supabase error', async () => {
        const { app } = await setupApp(async (call) => {
            if (call.table === 'appointments' && call.action === 'select') {
                return {
                    data: null,
                    error: { message: 'DB read failed' }
                };
            }

            return { data: null, error: null };
        });

        const response = await request(app).get('/appointments');

        expect(response.statusCode).toBe(400);
        expect(response.body).toEqual({ error: 'DB read failed' });
    });

    test('returns 400 when signup insert fails', async () => {
        const { app } = await setupApp(async (call) => {
            if (call.table === 'profiles' && call.action === 'insert') {
                return {
                    data: null,
                    error: { message: 'Duplicate email' }
                };
            }

            return { data: null, error: null };
        });

        const response = await request(app)
            .post('/signup')
            .send({
                email: 'sam@example.com',
                password: '123456',
                name: 'Sam',
                surname: 'Test',
                phone_number: '555-111',
                id_number: 'ID-1'
            });

        expect(response.statusCode).toBe(400);
        expect(response.body).toEqual({ error: 'Duplicate email' });
    });

    test('returns 400 for book appointment after signup when slot is not selected', async () => {
        const { app } = await setupApp(async (call) => {
            if (call.table === 'profiles' && call.action === 'insert') {
                return { data: [{ id: 'inserted' }], error: null };
            }

            if (call.table === 'profiles' && call.action === 'select') {
                return { data: { id: 'patient-1' }, error: null };
            }

            return { data: null, error: null };
        });

        const signupResponse = await request(app)
            .post('/signup')
            .send({
                email: 'jane@example.com',
                password: '123456',
                name: 'Jane',
                surname: 'Doe',
                phone_number: '555-222',
                id_number: 'ID-2'
            });

        expect(signupResponse.statusCode).toBe(200);

        const bookResponse = await request(app)
            .post('/appointments/book_appointment')
            .send({ reason: 'Follow-up' });

        expect(bookResponse.statusCode).toBe(400);
        expect(bookResponse.body).toEqual({ error: 'No slot selected. Please search for a clinic and slot first.' });
    });

    test('returns appointments list successfully', async () => {
        const { app } = await setupApp(async (call) => {
            if (call.table === 'appointments' && call.action === 'select') {
                return {
                    data: [
                        { id: 'a1', status: 'booked' },
                        { id: 'a2', status: 'completed' }
                    ],
                    error: null
                };
            }

            return { data: null, error: null };
        });

        const response = await request(app).get('/appointments');

        expect(response.statusCode).toBe(200);
        expect(response.body).toEqual([
            { id: 'a1', status: 'booked' },
            { id: 'a2', status: 'completed' }
        ]);
    });

    test('returns appointment by id successfully', async () => {
        const { app } = await setupApp(async (call) => {
            if (call.table === 'appointments' && call.action === 'select' && call.singleMode) {
                return {
                    data: { id: '42', status: 'booked' },
                    error: null
                };
            }

            return { data: null, error: null };
        });

        const response = await request(app).get('/appointments/42');

        expect(response.statusCode).toBe(200);
        expect(response.body).toEqual({ id: '42', status: 'booked' });
    });

    test('completes signup, clinic search, slot selection, and booking successfully', async () => {
        const { app } = await setupApp(async (call) => {
            if (call.table === 'profiles' && call.action === 'insert') {
                return { data: [{ id: 'created' }], error: null };
            }

            if (call.table === 'profiles' && call.action === 'select') {
                return { data: { id: 'patient-100' }, error: null };
            }

            if (call.table === 'facilities' && call.action === 'select') {
                return {
                    data: [
                        { id: 'facility-1', name: 'Alpha Clinic', province: 'AB', is_active: true }
                    ],
                    error: null
                };
            }

            if (call.table === 'appointment_slots' && call.action === 'select') {
                return {
                    data: [
                        {
                            id: 'slot-1',
                            facility_id: 'facility-1',
                            slot_date: '2099-01-01',
                            booked_count: 0,
                            is_active: true
                        }
                    ],
                    error: null
                };
            }

            if (call.table === 'appointments' && call.action === 'insert') {
                return {
                    data: {
                        id: 'appointment-1',
                        patient_id: 'patient-100',
                        facility_id: 'facility-1',
                        slot_id: 'slot-1',
                        status: 'booked',
                        appointment_type: 'scheduled',
                        reason: call.payload.reason
                    },
                    error: null
                };
            }

            return { data: null, error: null };
        });

        const signupResponse = await request(app)
            .post('/signup')
            .send({
                email: 'happy@example.com',
                password: '123456',
                name: 'Happy Path',
                surname: 'Tester',
                phone_number: '555-444',
                id_number: 'ID-4'
            });

        expect(signupResponse.statusCode).toBe(200);
        expect(signupResponse.body).toEqual({
            message: 'User created successfully',
            user: { id: 'patient-100' }
        });

        const clinicsResponse = await request(app)
            .get('/clinics/available')
            .query({ name: 'Alpha', province: 'AB' });

        expect(clinicsResponse.statusCode).toBe(200);
        expect(clinicsResponse.body).toEqual({
            facilities: [
                { id: 'facility-1', name: 'Alpha Clinic', province: 'AB', is_active: true }
            ]
        });

        const slotsResponse = await request(app)
            .get('/slots/available')
            .query({ nameOfFacility: 'Alpha Clinic' });

        expect(slotsResponse.statusCode).toBe(200);
        expect(slotsResponse.body).toEqual({
            id: 'slot-1',
            facility_id: 'facility-1',
            slot_date: '2099-01-01',
            booked_count: 0,
            is_active: true
        });

        const bookingResponse = await request(app)
            .post('/appointments/book_appointment')
            .send({ reason: 'General checkup' });

        expect(bookingResponse.statusCode).toBe(200);
        expect(bookingResponse.body).toEqual({
            message: 'Appointment booked successfully',
            appointment: {
                id: 'appointment-1',
                patient_id: 'patient-100',
                facility_id: 'facility-1',
                slot_id: 'slot-1',
                status: 'booked',
                appointment_type: 'scheduled',
                reason: 'General checkup'
            }
        });
    });
});
