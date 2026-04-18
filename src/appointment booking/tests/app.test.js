import { beforeEach, describe, expect, jest, test } from '@jest/globals';
import request from 'supertest';

const mockSendMail = jest.fn();
const mockGetUserById = jest.fn();
const mockFrom = jest.fn();

function chainResult(response) {
  const chain = {
    select: () => chain,
    insert: () => chain,
    delete: () => chain,
    update: () => chain,
    eq: () => chain,
    neq: () => chain,
    gte: () => chain,
    lte: () => chain,
    in: () => chain,
    order: () => chain,
    limit: () => chain,
    single: async () => response,
    maybeSingle: async () => response,
    then: (resolve) => resolve(response),
  };
  return chain;
}

jest.unstable_mockModule('@supabase/supabase-js', () => ({
  createClient: () => ({
    from: (...args) => mockFrom(...args),
    auth: { admin: { getUserById: (...args) => mockGetUserById(...args) } },
  }),
}));

jest.unstable_mockModule('nodemailer', () => {
  const transporterMock = {
    sendMail: (...args) => mockSendMail(...args),
    verify: () => Promise.resolve(true),
  };
  return {
    default: { createTransport: () => transporterMock },
    createTransport: () => transporterMock,
  };
});

const { default: app } = await import('../servers/app.js');

beforeEach(() => {
  jest.clearAllMocks();
});

// ── GET /appointments/:id ─────────────────────────────────────────────────────

describe('GET /appointments/:id', () => {
  test('returns 200 with appointment data', async () => {
    mockFrom.mockReturnValue(chainResult({ data: { id: 1, status: 'booked' }, error: null }));
    const res = await request(app).get('/appointments/1');
    expect(res.statusCode).toBe(200);
    expect(res.body.id).toBe(1);
  });

  test('returns 400 when supabase returns an error', async () => {
    mockFrom.mockReturnValue(chainResult({ data: null, error: { message: 'Not found' } }));
    const res = await request(app).get('/appointments/999');
    expect(res.statusCode).toBe(400);
    expect(res.body.error).toBe('Not found');
  });

  test('returns 500 when an unexpected error is thrown', async () => {
    mockFrom.mockImplementation(() => { throw new Error('connection failed'); });
    const res = await request(app).get('/appointments/1');
    expect(res.statusCode).toBe(500);
    expect(res.body.error).toBe('connection failed');
  });
});

// ── GET /appointments/my/:patient_id ──────────────────────────────────────────

describe('GET /appointments/my/:patient_id', () => {
  test('returns 200 with patient appointments', async () => {
    const appointments = [{ id: 'a1', status: 'booked' }, { id: 'a2', status: 'completed' }];
    mockFrom.mockReturnValue(chainResult({ data: appointments, error: null }));
    const res = await request(app).get('/appointments/my/p1');
    expect(res.statusCode).toBe(200);
    expect(res.body).toEqual(appointments);
  });

  test('returns 400 when supabase returns an error', async () => {
    mockFrom.mockReturnValue(chainResult({ data: null, error: { message: 'Query failed' } }));
    const res = await request(app).get('/appointments/my/p1');
    expect(res.statusCode).toBe(400);
    expect(res.body.error).toBe('Query failed');
  });

  test('returns 500 when an unexpected error is thrown', async () => {
    mockFrom.mockImplementation(() => { throw new Error('crash'); });
    const res = await request(app).get('/appointments/my/p1');
    expect(res.statusCode).toBe(500);
    expect(res.body.error).toBe('crash');
  });
});

// ── POST /slots/available ─────────────────────────────────────────────────────

describe('POST /slots/available', () => {
  test('returns 400 when facility_id is missing', async () => {
    const res = await request(app).post('/slots/available').send({});
    expect(res.statusCode).toBe(400);
    expect(res.body.error).toBe('facility_id is required');
  });

  test('returns 400 when supabase returns an error', async () => {
    mockFrom.mockReturnValue(chainResult({ data: null, error: { message: 'Query failed' } }));
    const res = await request(app).post('/slots/available').send({ facility_id: 1 });
    expect(res.statusCode).toBe(400);
    expect(res.body.error).toBe('Query failed');
  });

  test('returns 404 when all slots are fully booked', async () => {
    mockFrom.mockReturnValue(chainResult({
      data: [{ id: 1, booked_count: 5, total_capacity: 5 }],
      error: null,
    }));
    const res = await request(app).post('/slots/available').send({ facility_id: 1 });
    expect(res.statusCode).toBe(404);
    expect(res.body.error).toBe('No available slots for this clinic.');
  });

  test('returns 404 when no slots exist', async () => {
    mockFrom.mockReturnValue(chainResult({ data: [], error: null }));
    const res = await request(app).post('/slots/available').send({ facility_id: 1 });
    expect(res.statusCode).toBe(404);
    expect(res.body.error).toBe('No available slots for this clinic.');
  });

  test('returns 200 with count and available slots', async () => {
    const slots = [
      { id: 1, booked_count: 0, total_capacity: 5, slot_time: '09:00', slot_date: '2026-04-20' },
    ];
    mockFrom.mockReturnValue(chainResult({ data: slots, error: null }));
    const res = await request(app).post('/slots/available').send({ facility_id: 1 });
    expect(res.statusCode).toBe(200);
    expect(res.body.count).toBe(1);
    expect(res.body.slots).toEqual(slots);
  });

  test('returns 500 when an unexpected error is thrown', async () => {
    mockFrom.mockImplementation(() => { throw new Error('DB down'); });
    const res = await request(app).post('/slots/available').send({ facility_id: 1 });
    expect(res.statusCode).toBe(500);
    expect(res.body.error).toBe('DB down');
  });
});

// ── POST /appointments/book ───────────────────────────────────────────────────

describe('POST /appointments/book', () => {
  const validBooking = { patient_id: 'p1', facility_id: 'f1', slot_id: 's1', reason: 'Checkup' };
  const validSlot = { id: 's1', booked_count: 0, total_capacity: 5, slot_date: '2026-04-20', slot_time: '09:00:00', is_active: true };

  test('returns 400 when patient_id is missing', async () => {
    const res = await request(app).post('/appointments/book').send({ facility_id: 'f1', slot_id: 's1', reason: 'Checkup' });
    expect(res.statusCode).toBe(400);
    expect(res.body.error).toBe('patient_id is required');
  });

  test('returns 400 when facility_id is missing', async () => {
    const res = await request(app).post('/appointments/book').send({ patient_id: 'p1', slot_id: 's1', reason: 'Checkup' });
    expect(res.statusCode).toBe(400);
    expect(res.body.error).toBe('facility_id is required');
  });

  test('returns 400 when reason is missing', async () => {
    const res = await request(app).post('/appointments/book').send({ patient_id: 'p1', facility_id: 'f1', slot_id: 's1' });
    expect(res.statusCode).toBe(400);
    expect(res.body.error).toBe('reason is required');
  });

  test('returns 404 when slot is not found', async () => {
    mockFrom.mockReturnValue(chainResult({ data: null, error: { message: 'No rows' } }));
    const res = await request(app).post('/appointments/book').send(validBooking);
    expect(res.statusCode).toBe(404);
    expect(res.body.error).toBe('Slot not found');
  });

  test('returns 409 when slot is fully booked', async () => {
    mockFrom.mockReturnValue(chainResult({ data: { ...validSlot, booked_count: 5 }, error: null }));
    const res = await request(app).post('/appointments/book').send(validBooking);
    expect(res.statusCode).toBe(409);
    expect(res.body.error).toBe('This slot is fully booked. Please choose another.');
  });

  test('returns 409 when patient already has a booking for this slot', async () => {
    mockFrom
      .mockReturnValueOnce(chainResult({ data: validSlot, error: null }))
      .mockReturnValueOnce(chainResult({ data: { id: 'existing' }, error: null }));
    const res = await request(app).post('/appointments/book').send(validBooking);
    expect(res.statusCode).toBe(409);
    expect(res.body.error).toBe('You already have a booking for this slot.');
  });

  test('returns 400 when insert fails', async () => {
    mockFrom
      .mockReturnValueOnce(chainResult({ data: validSlot, error: null }))
      .mockReturnValueOnce(chainResult({ data: null, error: null }))
      .mockReturnValueOnce(chainResult({ data: null, error: { message: 'Insert failed' } }));
    const res = await request(app).post('/appointments/book').send(validBooking);
    expect(res.statusCode).toBe(400);
    expect(res.body.error).toBe('Insert failed');
  });

  test('returns 201 when booking succeeds', async () => {
    mockFrom
      .mockReturnValueOnce(chainResult({ data: validSlot, error: null }))
      .mockReturnValueOnce(chainResult({ data: null, error: null }))
      .mockReturnValueOnce(chainResult({ data: { id: 'a1', status: 'booked' }, error: null }))
      .mockReturnValueOnce(chainResult({ data: null, error: null }))
      .mockReturnValueOnce(chainResult({ data: null, error: null }));
    const res = await request(app).post('/appointments/book').send(validBooking);
    expect(res.statusCode).toBe(201);
    expect(res.body.message).toBe('Appointment booked successfully');
    expect(res.body.appointment.id).toBe('a1');
  });

  test('returns 500 when an unexpected error is thrown', async () => {
    mockFrom.mockImplementation(() => { throw new Error('crash'); });
    const res = await request(app).post('/appointments/book').send(validBooking);
    expect(res.statusCode).toBe(500);
    expect(res.body.error).toBe('crash');
  });
});

// ── PATCH /appointments/:appointment_id/cancel ───────────────────────────────

describe('PATCH /appointments/:appointment_id/cancel', () => {
  test('returns 400 when patient_id is missing', async () => {
    const res = await request(app).patch('/appointments/a1/cancel').send({});
    expect(res.statusCode).toBe(400);
    expect(res.body.error).toBe('patient_id is required');
  });

  test('returns 404 when appointment is not found', async () => {
    mockFrom.mockReturnValue(chainResult({ data: null, error: { message: 'Not found' } }));
    const res = await request(app).patch('/appointments/a1/cancel').send({ patient_id: 'p1' });
    expect(res.statusCode).toBe(404);
    expect(res.body.error).toBe('Appointment not found');
  });

  test('returns 403 when patient does not own the appointment', async () => {
    mockFrom.mockReturnValue(chainResult({ data: { id: 'a1', patient_id: 'p2', slot_id: 's1', status: 'booked' }, error: null }));
    const res = await request(app).patch('/appointments/a1/cancel').send({ patient_id: 'p1' });
    expect(res.statusCode).toBe(403);
    expect(res.body.error).toBe('You can only cancel your own appointments');
  });

  test('returns 400 when appointment is already cancelled', async () => {
    mockFrom.mockReturnValue(chainResult({ data: { id: 'a1', patient_id: 'p1', slot_id: 's1', status: 'cancelled' }, error: null }));
    const res = await request(app).patch('/appointments/a1/cancel').send({ patient_id: 'p1' });
    expect(res.statusCode).toBe(400);
    expect(res.body.error).toBe('Appointment is already cancelled');
  });

  test('returns 400 when appointment is completed', async () => {
    mockFrom.mockReturnValue(chainResult({ data: { id: 'a1', patient_id: 'p1', slot_id: 's1', status: 'completed' }, error: null }));
    const res = await request(app).patch('/appointments/a1/cancel').send({ patient_id: 'p1' });
    expect(res.statusCode).toBe(400);
    expect(res.body.error).toBe('Cannot cancel a completed appointment');
  });

  test('returns 200 when cancellation succeeds', async () => {
    mockFrom
      .mockReturnValueOnce(chainResult({ data: { id: 'a1', patient_id: 'p1', slot_id: 's1', status: 'booked' }, error: null }))
      .mockReturnValueOnce(chainResult({ error: null }))
      .mockReturnValueOnce(chainResult({ data: { booked_count: 2 }, error: null }))
      .mockReturnValueOnce(chainResult({ error: null }))
      .mockReturnValueOnce(chainResult({ error: null }));
    const res = await request(app).patch('/appointments/a1/cancel').send({ patient_id: 'p1' });
    expect(res.statusCode).toBe(200);
    expect(res.body.message).toBe('Appointment cancelled successfully');
  });

  test('returns 500 when an unexpected error is thrown', async () => {
    mockFrom.mockImplementation(() => { throw new Error('crash'); });
    const res = await request(app).patch('/appointments/a1/cancel').send({ patient_id: 'p1' });
    expect(res.statusCode).toBe(500);
    expect(res.body.error).toBe('crash');
  });
});

// ── PATCH /appointments/:appointment_id/reschedule ───────────────────────────

describe('PATCH /appointments/:appointment_id/reschedule', () => {
  test('returns 400 when patient_id is missing', async () => {
    const res = await request(app).patch('/appointments/a1/reschedule').send({ new_slot_id: 's2' });
    expect(res.statusCode).toBe(400);
    expect(res.body.error).toBe('patient_id is required');
  });

  test('returns 400 when new_slot_id is missing', async () => {
    const res = await request(app).patch('/appointments/a1/reschedule').send({ patient_id: 'p1' });
    expect(res.statusCode).toBe(400);
    expect(res.body.error).toBe('new_slot_id is required');
  });

  test('returns 404 when appointment is not found', async () => {
    mockFrom.mockReturnValue(chainResult({ data: null, error: { message: 'Not found' } }));
    const res = await request(app).patch('/appointments/a1/reschedule').send({ patient_id: 'p1', new_slot_id: 's2' });
    expect(res.statusCode).toBe(404);
    expect(res.body.error).toBe('Appointment not found');
  });

  test('returns 403 when patient does not own the appointment', async () => {
    mockFrom.mockReturnValue(chainResult({ data: { id: 'a1', patient_id: 'p2', status: 'booked', slot_id: 's1' }, error: null }));
    const res = await request(app).patch('/appointments/a1/reschedule').send({ patient_id: 'p1', new_slot_id: 's2' });
    expect(res.statusCode).toBe(403);
    expect(res.body.error).toBe('You can only reschedule your own appointments');
  });

  test('returns 400 when appointment is cancelled', async () => {
    mockFrom.mockReturnValue(chainResult({ data: { id: 'a1', patient_id: 'p1', status: 'cancelled', slot_id: 's1' }, error: null }));
    const res = await request(app).patch('/appointments/a1/reschedule').send({ patient_id: 'p1', new_slot_id: 's2' });
    expect(res.statusCode).toBe(400);
    expect(res.body.error).toBe('Cannot reschedule a cancelled appointment');
  });

  test('returns 409 when new slot is fully booked', async () => {
    mockFrom
      .mockReturnValueOnce(chainResult({ data: { id: 'a1', patient_id: 'p1', status: 'booked', slot_id: 's1' }, error: null }))
      .mockReturnValueOnce(chainResult({ data: { id: 's2', is_active: true, booked_count: 5, total_capacity: 5 }, error: null }));
    const res = await request(app).patch('/appointments/a1/reschedule').send({ patient_id: 'p1', new_slot_id: 's2' });
    expect(res.statusCode).toBe(409);
    expect(res.body.error).toBe('New slot is fully booked. Please choose another.');
  });

  test('returns 200 when reschedule succeeds', async () => {
    mockFrom
      .mockReturnValueOnce(chainResult({ data: { id: 'a1', patient_id: 'p1', status: 'booked', slot_id: 's1' }, error: null }))
      .mockReturnValueOnce(chainResult({ data: { id: 's2', is_active: true, booked_count: 0, total_capacity: 5, facility_id: 'f1', slot_date: '2026-04-21', slot_time: '10:00:00' }, error: null }))
      .mockReturnValueOnce(chainResult({ data: { booked_count: 1 }, error: null }))
      .mockReturnValueOnce(chainResult({ error: null }))
      .mockReturnValueOnce(chainResult({ data: { id: 'a1', slot_id: 's2', status: 'booked' }, error: null }))
      .mockReturnValueOnce(chainResult({ error: null }))
      .mockReturnValueOnce(chainResult({ error: null }));
    const res = await request(app).patch('/appointments/a1/reschedule').send({ patient_id: 'p1', new_slot_id: 's2' });
    expect(res.statusCode).toBe(200);
    expect(res.body.message).toBe('Appointment rescheduled successfully');
  });

  test('returns 500 when an unexpected error is thrown', async () => {
    mockFrom.mockImplementation(() => { throw new Error('crash'); });
    const res = await request(app).patch('/appointments/a1/reschedule').send({ patient_id: 'p1', new_slot_id: 's2' });
    expect(res.statusCode).toBe(500);
    expect(res.body.error).toBe('crash');
  });
});

// ── POST /queue/walk-in ───────────────────────────────────────────────────────

describe('POST /queue/walk-in', () => {
  test('returns 400 when patient_id is missing', async () => {
    const res = await request(app).post('/queue/walk-in').send({ facility_id: 'f1' });
    expect(res.statusCode).toBe(400);
    expect(res.body.error).toBe('patient_id is required');
  });

  test('returns 400 when facility_id is missing', async () => {
    const res = await request(app).post('/queue/walk-in').send({ patient_id: 'p1' });
    expect(res.statusCode).toBe(400);
    expect(res.body.error).toBe('facility_id is required');
  });

  test('returns 409 when patient is already in queue', async () => {
    mockFrom.mockReturnValue(chainResult({ data: { id: 'q1', status: 'waiting' }, error: null }));
    const res = await request(app).post('/queue/walk-in').send({ patient_id: 'p1', facility_id: 'f1' });
    expect(res.statusCode).toBe(409);
    expect(res.body.error).toBe('You are already in the queue at this clinic.');
  });

  test('returns 201 when successfully joined', async () => {
    mockFrom
      .mockReturnValueOnce(chainResult({ data: null, error: null }))
      .mockReturnValueOnce(chainResult({ count: 0 }))
      .mockReturnValueOnce(chainResult({ data: { id: 'q1', queue_position: 1 }, error: null }))
      .mockReturnValueOnce(chainResult({ error: null }));
    const res = await request(app).post('/queue/walk-in').send({ patient_id: 'p1', facility_id: 'f1' });
    expect(res.statusCode).toBe(201);
    expect(res.body.message).toBe('You have joined the queue');
    expect(res.body.queue_position).toBe(1);
  });

  test('returns 400 when insert fails', async () => {
    mockFrom
      .mockReturnValueOnce(chainResult({ data: null, error: null }))
      .mockReturnValueOnce(chainResult({ count: 0 }))
      .mockReturnValueOnce(chainResult({ data: null, error: { message: 'Insert failed' } }));
    const res = await request(app).post('/queue/walk-in').send({ patient_id: 'p1', facility_id: 'f1' });
    expect(res.statusCode).toBe(400);
    expect(res.body.error).toBe('Insert failed');
  });

  test('returns 500 when an unexpected error is thrown', async () => {
    mockFrom.mockImplementation(() => { throw new Error('crash'); });
    const res = await request(app).post('/queue/walk-in').send({ patient_id: 'p1', facility_id: 'f1' });
    expect(res.statusCode).toBe(500);
    expect(res.body.error).toBe('crash');
  });
});

// ── POST /appointments/send-confirmation ──────────────────────────────────────

describe('POST /appointments/send-confirmation', () => {
  test('returns 400 when required fields are missing', async () => {
    const res = await request(app).post('/appointments/send-confirmation').send({ facility_id: 'f1' });
    expect(res.statusCode).toBe(400);
    expect(res.body.error).toBe('patient_id, facility_id, and slot_id are required');
  });

  test('returns 200 with skipped when no email is found', async () => {
    mockFrom
      .mockReturnValueOnce(chainResult({ data: { email: null, name: 'Jane', surname: 'Doe' }, error: null }))
      .mockReturnValueOnce(chainResult({ data: { slot_date: '2026-04-20', slot_time: '09:00:00', duration_minutes: 30 }, error: null }))
      .mockReturnValueOnce(chainResult({ data: { name: 'City Clinic', address: '123 Main St' }, error: null }));
    mockGetUserById.mockResolvedValue({ data: { user: { email: null } } });
    const res = await request(app).post('/appointments/send-confirmation').send({ patient_id: 'p1', slot_id: 's1', facility_id: 'f1' });
    expect(res.statusCode).toBe(200);
    expect(res.body.message).toBe('No email address found for this patient, skipped');
  });

  test('returns 200 and sends email when profile has email', async () => {
    mockFrom
      .mockReturnValueOnce(chainResult({ data: { email: 'jane@test.com', name: 'Jane', surname: 'Doe' }, error: null }))
      .mockReturnValueOnce(chainResult({ data: { slot_date: '2026-04-20', slot_time: '09:00:00', duration_minutes: 30 }, error: null }))
      .mockReturnValueOnce(chainResult({ data: { name: 'City Clinic', address: '123 Main St' }, error: null }));
    mockSendMail.mockResolvedValue({ messageId: 'msg-123' });
    const res = await request(app).post('/appointments/send-confirmation').send({ patient_id: 'p1', slot_id: 's1', facility_id: 'f1' });
    expect(res.statusCode).toBe(200);
    expect(res.body.message).toBe('Confirmation email sent');
    expect(res.body.messageId).toBe('msg-123');
  });

  test('falls back to auth email when profile email is null', async () => {
    mockFrom
      .mockReturnValueOnce(chainResult({ data: { email: null, name: 'Jane', surname: 'Doe' }, error: null }))
      .mockReturnValueOnce(chainResult({ data: { slot_date: '2026-04-20', slot_time: '09:00:00', duration_minutes: 30 }, error: null }))
      .mockReturnValueOnce(chainResult({ data: { name: 'City Clinic', address: '123 Main St' }, error: null }));
    mockGetUserById.mockResolvedValue({ data: { user: { email: 'jane-auth@test.com' } } });
    mockSendMail.mockResolvedValue({ messageId: 'msg-456' });
    const res = await request(app).post('/appointments/send-confirmation').send({ patient_id: 'p1', slot_id: 's1', facility_id: 'f1' });
    expect(res.statusCode).toBe(200);
    expect(res.body.message).toBe('Confirmation email sent');
  });

  test('returns 500 when sendMail throws', async () => {
    mockFrom
      .mockReturnValueOnce(chainResult({ data: { email: 'jane@test.com', name: 'Jane', surname: 'Doe' }, error: null }))
      .mockReturnValueOnce(chainResult({ data: { slot_date: '2026-04-20', slot_time: '09:00:00', duration_minutes: 30 }, error: null }))
      .mockReturnValueOnce(chainResult({ data: { name: 'City Clinic', address: '123 Main St' }, error: null }));
    mockSendMail.mockRejectedValue(new Error('SMTP timeout'));
    const res = await request(app).post('/appointments/send-confirmation').send({ patient_id: 'p1', slot_id: 's1', facility_id: 'f1' });
    expect(res.statusCode).toBe(500);
    expect(res.body.error).toBe('SMTP timeout');
  });
});

// ── POST /appointments/remind ─────────────────────────────────────────────────

describe('POST /appointments/remind', () => {
  test('returns 400 when patient_id is missing', async () => {
    const res = await request(app).post('/appointments/remind').send({});
    expect(res.statusCode).toBe(400);
    expect(res.body.error).toBe('patient_id is required');
  });

  test('returns 500 when appointments query fails', async () => {
    mockFrom.mockReturnValue(chainResult({ data: null, error: { message: 'Query failed' } }));
    const res = await request(app).post('/appointments/remind').send({ patient_id: 'p1' });
    expect(res.statusCode).toBe(500);
    expect(res.body.error).toBe('Query failed');
  });

  test('returns 200 when no upcoming appointments', async () => {
    mockFrom.mockReturnValue(chainResult({ data: [], error: null }));
    const res = await request(app).post('/appointments/remind').send({ patient_id: 'p1' });
    expect(res.statusCode).toBe(200);
    expect(res.body.message).toBe('No upcoming appointments in the next 24 hours');
  });

  test('returns 200 when patient has no email', async () => {
    mockFrom
      .mockReturnValueOnce(chainResult({
        data: [{
          id: 'a1', reason: 'Checkup', facility_id: 'f1', slot_id: 's1',
          appointment_slots: { slot_date: '2026-04-20', slot_time: '09:00:00', duration_minutes: 30 },
        }],
        error: null,
      }))
      .mockReturnValueOnce(chainResult({ data: { email: null, name: null, surname: null }, error: null }));
    const res = await request(app).post('/appointments/remind').send({ patient_id: 'p1' });
    expect(res.statusCode).toBe(200);
    expect(res.body.message).toBe('No email found for this patient, skipped');
  });

  test('returns 200 and sends reminder emails', async () => {
    mockFrom
      .mockReturnValueOnce(chainResult({
        data: [{
          id: 'a1', reason: 'Checkup', facility_id: 'f1', slot_id: 's1',
          appointment_slots: { slot_date: '2026-04-20', slot_time: '09:00:00', duration_minutes: 30 },
        }],
        error: null,
      }))
      .mockReturnValueOnce(chainResult({ data: { email: 'jane@test.com', name: 'Jane', surname: 'Doe' }, error: null }))
      .mockReturnValueOnce(chainResult({ data: { name: 'City Clinic', address: '123 Main St' }, error: null }))
      .mockReturnValueOnce(chainResult({ error: null }));
    mockSendMail.mockResolvedValue({});
    const res = await request(app).post('/appointments/remind').send({ patient_id: 'p1' });
    expect(res.statusCode).toBe(200);
    expect(res.body.message).toContain('Reminders sent');
    expect(res.body.appointment_ids).toEqual(['a1']);
    expect(mockSendMail).toHaveBeenCalledTimes(1);
  });

  test('returns 500 when sendMail throws', async () => {
    mockFrom
      .mockReturnValueOnce(chainResult({
        data: [{
          id: 'a1', reason: 'Checkup', facility_id: 'f1', slot_id: 's1',
          appointment_slots: { slot_date: '2026-04-20', slot_time: '09:00:00', duration_minutes: 30 },
        }],
        error: null,
      }))
      .mockReturnValueOnce(chainResult({ data: { email: 'jane@test.com', name: 'Jane', surname: 'Doe' }, error: null }))
      .mockReturnValueOnce(chainResult({ data: { name: 'City Clinic', address: '123 Main St' }, error: null }));
    mockSendMail.mockRejectedValue(new Error('SMTP error'));
    const res = await request(app).post('/appointments/remind').send({ patient_id: 'p1' });
    expect(res.statusCode).toBe(500);
    expect(res.body.error).toBe('SMTP error');
  });
});

// ── GET /staff/appointments ───────────────────────────────────────────────────

describe('GET /staff/appointments', () => {
  test('returns 400 when facility_id is missing', async () => {
    const res = await request(app).get('/staff/appointments');
    expect(res.statusCode).toBe(400);
    expect(res.body.error).toBe('facility_id is required');
  });

  test('returns 200 with count and appointments', async () => {
    const appointments = [{ id: 'a1', facility_id: 'f1' }];
    mockFrom.mockReturnValue(chainResult({ data: appointments, error: null }));
    const res = await request(app).get('/staff/appointments?facility_id=f1');
    expect(res.statusCode).toBe(200);
    expect(res.body.count).toBe(1);
    expect(res.body.appointments).toEqual(appointments);
  });

  test('returns 400 when supabase returns an error', async () => {
    mockFrom.mockReturnValue(chainResult({ data: null, error: { message: 'DB error' } }));
    const res = await request(app).get('/staff/appointments?facility_id=f1');
    expect(res.statusCode).toBe(400);
    expect(res.body.error).toBe('DB error');
  });

  test('returns 500 when an unexpected error is thrown', async () => {
    mockFrom.mockImplementation(() => { throw new Error('crash'); });
    const res = await request(app).get('/staff/appointments?facility_id=f1');
    expect(res.statusCode).toBe(500);
    expect(res.body.error).toBe('crash');
  });
});

// ── PATCH /staff/appointments/:appointment_id ─────────────────────────────────

describe('PATCH /staff/appointments/:appointment_id', () => {
  test('returns 400 when status is missing', async () => {
    const res = await request(app).patch('/staff/appointments/a1').send({});
    expect(res.statusCode).toBe(400);
    expect(res.body.error).toBe('status is required');
  });

  test('returns 400 when status is invalid', async () => {
    const res = await request(app).patch('/staff/appointments/a1').send({ status: 'invalid' });
    expect(res.statusCode).toBe(400);
    expect(res.body.error).toContain('Invalid status');
  });

  test('returns 404 when appointment is not found', async () => {
    mockFrom.mockReturnValue(chainResult({ data: null, error: { message: 'No rows' } }));
    const res = await request(app).patch('/staff/appointments/a1').send({ status: 'confirmed' });
    expect(res.statusCode).toBe(404);
    expect(res.body.error).toBe('Appointment not found');
  });

  test('returns 200 when appointment is updated', async () => {
    mockFrom
      .mockReturnValueOnce(chainResult({ data: { id: 'a1', slot_id: 's1', status: 'booked', patient_id: 'p1' }, error: null }))
      .mockReturnValueOnce(chainResult({ data: { id: 'a1', status: 'confirmed' }, error: null }));
    const res = await request(app).patch('/staff/appointments/a1').send({ status: 'confirmed' });
    expect(res.statusCode).toBe(200);
    expect(res.body.message).toContain('confirmed');
  });

  test('returns 200 and restores slot when status is cancelled', async () => {
    mockFrom
      .mockReturnValueOnce(chainResult({ data: { id: 'a1', slot_id: 's1', status: 'booked', patient_id: 'p1' }, error: null }))
      .mockReturnValueOnce(chainResult({ data: { id: 'a1', status: 'cancelled' }, error: null }))
      .mockReturnValueOnce(chainResult({ data: { booked_count: 2 }, error: null }))
      .mockReturnValueOnce(chainResult({ error: null }))
      .mockReturnValueOnce(chainResult({ error: null }));
    const res = await request(app).patch('/staff/appointments/a1').send({ status: 'cancelled' });
    expect(res.statusCode).toBe(200);
    expect(res.body.message).toContain('cancelled');
  });

  test('returns 400 when update fails', async () => {
    mockFrom
      .mockReturnValueOnce(chainResult({ data: { id: 'a1', slot_id: 's1', status: 'booked', patient_id: 'p1' }, error: null }))
      .mockReturnValueOnce(chainResult({ data: null, error: { message: 'Update failed' } }));
    const res = await request(app).patch('/staff/appointments/a1').send({ status: 'confirmed' });
    expect(res.statusCode).toBe(400);
    expect(res.body.error).toBe('Update failed');
  });

  test('returns 500 when an unexpected error is thrown', async () => {
    mockFrom.mockImplementation(() => { throw new Error('crash'); });
    const res = await request(app).patch('/staff/appointments/a1').send({ status: 'confirmed' });
    expect(res.statusCode).toBe(500);
    expect(res.body.error).toBe('crash');
  });
});

// ── POST /staff/slots ─────────────────────────────────────────────────────────

describe('POST /staff/slots', () => {
  const validSlot = { facility_id: 1, slot_date: '2026-04-20', slot_time: '09:00', total_capacity: 5, duration_minutes: 30 };

  test('returns 400 when required fields are missing', async () => {
    const res = await request(app).post('/staff/slots').send({ slot_time: '09:00' });
    expect(res.statusCode).toBe(400);
    expect(res.body.error).toContain('required');
  });

  test('returns 409 when a duplicate slot exists', async () => {
    mockFrom.mockReturnValue(chainResult({ data: { id: 99 }, error: null }));
    const res = await request(app).post('/staff/slots').send(validSlot);
    expect(res.statusCode).toBe(409);
    expect(res.body.error).toContain('already exists');
  });

  test('returns 201 when slot is created', async () => {
    mockFrom
      .mockReturnValueOnce(chainResult({ data: null, error: null }))
      .mockReturnValueOnce(chainResult({ data: { id: 1, ...validSlot }, error: null }));
    const res = await request(app).post('/staff/slots').send(validSlot);
    expect(res.statusCode).toBe(201);
    expect(res.body.message).toBe('Slot created successfully');
    expect(res.body.slot.id).toBe(1);
  });

  test('returns 400 when supabase insert fails', async () => {
    mockFrom
      .mockReturnValueOnce(chainResult({ data: null, error: null }))
      .mockReturnValueOnce(chainResult({ data: null, error: { message: 'Insert error' } }));
    const res = await request(app).post('/staff/slots').send(validSlot);
    expect(res.statusCode).toBe(400);
    expect(res.body.error).toBe('Insert error');
  });

  test('returns 500 when an unexpected error is thrown', async () => {
    mockFrom.mockImplementation(() => { throw new Error('crash'); });
    const res = await request(app).post('/staff/slots').send(validSlot);
    expect(res.statusCode).toBe(500);
    expect(res.body.error).toBe('crash');
  });
});

// ── PATCH /staff/slots/:slot_id ───────────────────────────────────────────────

describe('PATCH /staff/slots/:slot_id', () => {
  test('returns 400 when no fields are provided', async () => {
    const res = await request(app).patch('/staff/slots/1').send({});
    expect(res.statusCode).toBe(400);
    expect(res.body.error).toBe('No fields provided to update');
  });

  test('returns 200 when slot is updated', async () => {
    const updatedSlot = { id: 1, slot_time: '10:00', slot_date: '2026-04-21' };
    mockFrom.mockReturnValue(chainResult({ data: updatedSlot, error: null }));
    const res = await request(app).patch('/staff/slots/1').send({ slot_time: '10:00', slot_date: '2026-04-21' });
    expect(res.statusCode).toBe(200);
    expect(res.body.message).toBe('Slot updated');
    expect(res.body.slot).toEqual(updatedSlot);
  });

  test('returns 400 when supabase returns an error', async () => {
    mockFrom.mockReturnValue(chainResult({ data: null, error: { message: 'Update failed' } }));
    const res = await request(app).patch('/staff/slots/1').send({ slot_time: '10:00' });
    expect(res.statusCode).toBe(400);
    expect(res.body.error).toBe('Update failed');
  });

  test('returns 500 when an unexpected error is thrown', async () => {
    mockFrom.mockImplementation(() => { throw new Error('crash'); });
    const res = await request(app).patch('/staff/slots/1').send({ slot_time: '10:00' });
    expect(res.statusCode).toBe(500);
    expect(res.body.error).toBe('crash');
  });
});

// ── DELETE /staff/slots/:slot_id ──────────────────────────────────────────────

describe('DELETE /staff/slots/:slot_id', () => {
  test('returns 409 when slot has active bookings', async () => {
    mockFrom.mockReturnValue(chainResult({ data: { booked_count: 2 }, error: null }));
    const res = await request(app).delete('/staff/slots/1');
    expect(res.statusCode).toBe(409);
    expect(res.body.error).toContain('Cannot remove this slot');
  });

  test('returns 200 when slot is deactivated', async () => {
    mockFrom
      .mockReturnValueOnce(chainResult({ data: { booked_count: 0 }, error: null }))
      .mockReturnValueOnce(chainResult({ error: null }));
    const res = await request(app).delete('/staff/slots/1');
    expect(res.statusCode).toBe(200);
    expect(res.body.message).toBe('Slot deactivated successfully');
  });

  test('returns 400 when supabase update fails', async () => {
    mockFrom
      .mockReturnValueOnce(chainResult({ data: { booked_count: 0 }, error: null }))
      .mockReturnValueOnce(chainResult({ error: { message: 'Update failed' } }));
    const res = await request(app).delete('/staff/slots/1');
    expect(res.statusCode).toBe(400);
    expect(res.body.error).toBe('Update failed');
  });

  test('returns 500 when an unexpected error is thrown', async () => {
    mockFrom.mockImplementation(() => { throw new Error('crash'); });
    const res = await request(app).delete('/staff/slots/1');
    expect(res.statusCode).toBe(500);
    expect(res.body.error).toBe('crash');
  });
});

// ── Middleware ─────────────────────────────────────────────────────────────────

describe('Middleware', () => {
  test('returns 404 for unknown routes', async () => {
    const res = await request(app).post('/this-route-does-not-exist');
    expect(res.statusCode).toBe(404);
    expect(res.body.error).toBe('Route not found');
  });

  test('error handler catches malformed JSON', async () => {
    const res = await request(app)
      .post('/appointments/book')
      .set('Content-Type', 'application/json')
      .send('{ invalid json }');
    expect(res.statusCode).toBeGreaterThanOrEqual(400);
    expect(res.body.error).toBeDefined();
  });
});
