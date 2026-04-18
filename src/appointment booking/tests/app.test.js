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
    gte: () => chain,
    lte: () => chain,
    single: async () => response,
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

  test('returns 404 when no slots are found', async () => {
    mockFrom.mockReturnValue(chainResult({ data: [], error: null }));
    const res = await request(app).post('/slots/available').send({ facility_id: 1 });
    expect(res.statusCode).toBe(404);
    expect(res.body.error).toBe('No available slots for this clinic.');
  });

  test('returns 200 with available slots', async () => {
    const slots = [{ id: 1, slot_time: '09:00', slot_date: '2026-04-20' }];
    mockFrom.mockReturnValue(chainResult({ data: slots, error: null }));
    const res = await request(app).post('/slots/available').send({ facility_id: 1 });
    expect(res.statusCode).toBe(200);
    expect(res.body).toEqual(slots);
  });

  test('returns 500 when an unexpected error is thrown', async () => {
    mockFrom.mockImplementation(() => { throw new Error('DB down'); });
    const res = await request(app).post('/slots/available').send({ facility_id: 1 });
    expect(res.statusCode).toBe(500);
    expect(res.body.error).toBe('DB down');
  });
});

describe('POST /appointments/book', () => {
  test('returns 400 when patient_id is missing', async () => {
    const res = await request(app).post('/appointments/book').send({ facility_id: 1, slot_id: 2, reason: 'Checkup' });
    expect(res.statusCode).toBe(400);
    expect(res.body.error).toBe('patient_id is required');
  });

  test('returns 400 when facility_id or slot_id is missing', async () => {
    const res = await request(app).post('/appointments/book').send({ patient_id: 'abc', reason: 'Checkup' });
    expect(res.statusCode).toBe(400);
    expect(res.body.error).toBe('facility_id and slot_id are required');
  });

  test('returns 400 when reason is missing', async () => {
    const res = await request(app).post('/appointments/book').send({ patient_id: 'abc', facility_id: 1, slot_id: 2 });
    expect(res.statusCode).toBe(400);
    expect(res.body.error).toBe('reason is required');
  });

  test('returns 400 when insert fails', async () => {
    mockFrom.mockReturnValue(chainResult({ data: null, error: { message: 'Insert failed' } }));
    const res = await request(app).post('/appointments/book').send({ patient_id: 'abc', facility_id: 1, slot_id: 2, reason: 'Checkup' });
    expect(res.statusCode).toBe(400);
    expect(res.body.error).toBe('Insert failed');
  });

  test('returns 200 when booking succeeds', async () => {
    mockFrom.mockReturnValue(chainResult({ data: { id: 10, status: 'booked' }, error: null }));
    const res = await request(app).post('/appointments/book').send({ patient_id: 'abc', facility_id: 1, slot_id: 2, reason: 'Checkup' });
    expect(res.statusCode).toBe(200);
    expect(res.body.message).toBe('Appointment booked successfully');
  });

  test('returns 400 when an unexpected error is thrown', async () => {
    mockFrom.mockImplementation(() => { throw new Error('crash'); });
    const res = await request(app).post('/appointments/book').send({ patient_id: 'abc', facility_id: 1, slot_id: 2, reason: 'Checkup' });
    expect(res.statusCode).toBe(400);
    expect(res.body.error).toBe('crash');
  });
});

describe('POST /staff/slots', () => {
  const validSlot = { slot_time: '09:00', slot_date: '2026-04-20', total_capacity: 5, duration_minutes: 30, facility_id: 1 };

  test('returns 400 when required fields are missing', async () => {
    const res = await request(app).post('/staff/slots').send({ slot_time: '09:00' });
    expect(res.statusCode).toBe(400);
    expect(res.body.error).toBe('Missing required fields');
  });

  test('returns 400 when supabase insert fails', async () => {
    mockFrom.mockReturnValue(chainResult({ data: null, error: { message: 'Duplicate slot' } }));
    const res = await request(app).post('/staff/slots').send(validSlot);
    expect(res.statusCode).toBe(400);
    expect(res.body.error).toBe('Duplicate slot');
  });

  test('returns 200 when slot is created successfully', async () => {
    const created = { id: 1, ...validSlot };
    mockFrom.mockReturnValue(chainResult({ data: created, error: null }));
    const res = await request(app).post('/staff/slots').send(validSlot);
    expect(res.statusCode).toBe(200);
    expect(res.body.message).toBe('Slot created successfully');
    expect(res.body.slot.id).toBe(1);
  });

  test('returns 500 when an unexpected error is thrown', async () => {
    mockFrom.mockImplementation(() => { throw new Error('insert crash'); });
    const res = await request(app).post('/staff/slots').send(validSlot);
    expect(res.statusCode).toBe(500);
    expect(res.body.error).toBe('insert crash');
  });
});

describe('POST /appointments/send-confirmation', () => {
  test('returns 400 when patient_id or slot_id is missing', async () => {
    const res = await request(app).post('/appointments/send-confirmation').send({ facility_id: 1 });
    expect(res.statusCode).toBe(400);
    expect(res.body.error).toBe('patient_id and slot_id required');
  });

  test('returns 200 with skipped when no email is found', async () => {
    mockFrom
      .mockReturnValueOnce(chainResult({ data: { email: null, name: 'Jane' }, error: null }))
      .mockReturnValueOnce(chainResult({ data: { slot_date: '2026-04-20', slot_time: '09:00:00' }, error: null }))
      .mockReturnValueOnce(chainResult({ data: { name: 'City Clinic' }, error: null }));
    mockGetUserById.mockResolvedValue({ data: { user: { email: null } } });
    const res = await request(app).post('/appointments/send-confirmation').send({ patient_id: 'p1', slot_id: 's1', facility_id: 'f1' });
    expect(res.statusCode).toBe(200);
    expect(res.body.message).toBe('No email found, skipped');
  });

  test('returns 200 and sends email when profile has email', async () => {
    mockFrom
      .mockReturnValueOnce(chainResult({ data: { email: 'jane@test.com', name: 'Jane' }, error: null }))
      .mockReturnValueOnce(chainResult({ data: { slot_date: '2026-04-20', slot_time: '09:00:00', duration_minutes: 30 }, error: null }))
      .mockReturnValueOnce(chainResult({ data: { name: 'City Clinic' }, error: null }));
    mockSendMail.mockResolvedValue({ messageId: 'msg-123' });
    const res = await request(app).post('/appointments/send-confirmation').send({ patient_id: 'p1', slot_id: 's1', facility_id: 'f1', reason: 'Checkup' });
    expect(res.statusCode).toBe(200);
    expect(res.body.message).toBe('Email sent');
    expect(res.body.messageId).toBe('msg-123');
  });

  test('falls back to auth email when profile email is null', async () => {
    mockFrom
      .mockReturnValueOnce(chainResult({ data: { email: null, name: 'Jane' }, error: null }))
      .mockReturnValueOnce(chainResult({ data: { slot_date: '2026-04-20', slot_time: '09:00:00' }, error: null }))
      .mockReturnValueOnce(chainResult({ data: { name: 'City Clinic' }, error: null }));
    mockGetUserById.mockResolvedValue({ data: { user: { email: 'jane-auth@test.com' } } });
    mockSendMail.mockResolvedValue({ messageId: 'msg-456' });
    const res = await request(app).post('/appointments/send-confirmation').send({ patient_id: 'p1', slot_id: 's1', facility_id: 'f1' });
    expect(res.statusCode).toBe(200);
    expect(res.body.message).toBe('Email sent');
  });

  test('returns 500 when sendMail throws', async () => {
    mockFrom
      .mockReturnValueOnce(chainResult({ data: { email: 'jane@test.com', name: 'Jane' }, error: null }))
      .mockReturnValueOnce(chainResult({ data: { slot_date: '2026-04-20', slot_time: '09:00:00' }, error: null }))
      .mockReturnValueOnce(chainResult({ data: { name: 'City Clinic' }, error: null }));
    mockSendMail.mockRejectedValue(new Error('SMTP timeout'));
    const res = await request(app).post('/appointments/send-confirmation').send({ patient_id: 'p1', slot_id: 's1', facility_id: 'f1' });
    expect(res.statusCode).toBe(500);
    expect(res.body.error).toBe('SMTP timeout');
  });
});

describe('POST /appointments/remind', () => {
  test('returns 500 when appointments query fails', async () => {
    mockFrom.mockReturnValue(chainResult({ data: null, error: { message: 'Query failed' } }));
    const res = await request(app).post('/appointments/remind').send({ patient_id: 'p1' });
    expect(res.statusCode).toBe(500);
    expect(res.body.error).toBe('Query failed');
  });

  test('returns 500 when slot query fails inside loop', async () => {
    mockFrom
      .mockReturnValueOnce(chainResult({ data: [{ id: 'a1', slot_id: 's1', facility_id: 'f1' }], error: null }))
      .mockReturnValueOnce(chainResult({ data: { email: 'jane@test.com', name: 'Jane' }, error: null }))
      .mockReturnValueOnce(chainResult({ data: null, error: { message: 'Slot not found' } }))
      .mockReturnValueOnce(chainResult({ data: { name: 'City Clinic' }, error: null }));
    const res = await request(app).post('/appointments/remind').send({ patient_id: 'p1' });
    expect(res.statusCode).toBe(500);
    expect(res.body.error).toBe('Slot not found');
  });

  test('returns 400 when patient has no email', async () => {
    mockFrom
      .mockReturnValueOnce(chainResult({ data: [{ id: 'a1', slot_id: 's1', facility_id: 'f1' }], error: null }))
      .mockReturnValueOnce(chainResult({ data: { email: null, name: null }, error: null }))
      .mockReturnValueOnce(chainResult({ data: { slot_date: '2026-04-20', slot_time: '09:00:00' }, error: null }))
      .mockReturnValueOnce(chainResult({ data: { name: 'City Clinic' }, error: null }));
    const res = await request(app).post('/appointments/remind').send({ patient_id: 'p1' });
    expect(res.statusCode).toBe(400);
    expect(res.body.message).toBe('No email found');
  });

  test('returns 200 and sends reminder email', async () => {
    mockFrom
      .mockReturnValueOnce(chainResult({ data: [{ id: 'a1', slot_id: 's1', facility_id: 'f1' }], error: null }))
      .mockReturnValueOnce(chainResult({ data: { email: 'jane@test.com', name: 'Jane' }, error: null }))
      .mockReturnValueOnce(chainResult({ data: { slot_date: '2026-04-20', slot_time: '09:00:00' }, error: null }))
      .mockReturnValueOnce(chainResult({ data: { name: 'City Clinic' }, error: null }));
    mockSendMail.mockResolvedValue({});
    const res = await request(app).post('/appointments/remind').send({ patient_id: 'p1' });
    expect(res.statusCode).toBe(200);
    expect(res.body.message).toBe('Reminder sent');
    expect(mockSendMail).toHaveBeenCalledTimes(1);
  });

  test('returns 500 when sendMail throws', async () => {
    mockFrom
      .mockReturnValueOnce(chainResult({ data: [{ id: 'a1', slot_id: 's1', facility_id: 'f1' }], error: null }))
      .mockReturnValueOnce(chainResult({ data: { email: 'jane@test.com', name: 'Jane' }, error: null }))
      .mockReturnValueOnce(chainResult({ data: { slot_date: '2026-04-20', slot_time: '09:00:00' }, error: null }))
      .mockReturnValueOnce(chainResult({ data: { name: 'City Clinic' }, error: null }));
    mockSendMail.mockRejectedValue(new Error('SMTP error'));
    const res = await request(app).post('/appointments/remind').send({ patient_id: 'p1' });
    expect(res.statusCode).toBe(500);
    expect(res.body.error).toBe('SMTP error');
  });
});

describe('GET /staff/appointments-booked/facility', () => {
  test('returns 200 with appointments', async () => {
    mockFrom.mockReturnValue(chainResult({ data: [{ facility_id: 1 }], error: null }));
    const res = await request(app).get('/staff/appointments-booked/facility?facility_id=1');
    expect(res.statusCode).toBe(200);
    expect(res.body).toEqual([{ facility_id: 1 }]);
  });

  test('returns 400 when facility_id is missing', async () => {
    const res = await request(app).get('/staff/appointments-booked/facility');
    expect(res.statusCode).toBe(400);
    expect(res.body.error).toBe('facility_id not found check existence');
  });

  test('returns 400 when supabase returns an error', async () => {
    mockFrom.mockReturnValue(chainResult({ data: null, error: { message: 'DB error' } }));
    const res = await request(app).get('/staff/appointments-booked/facility?facility_id=1');
    expect(res.statusCode).toBe(400);
    expect(res.body.error).toBe('DB error');
  });

  test('returns 500 when an unexpected error is thrown', async () => {
    mockFrom.mockImplementation(() => { throw new Error('crash'); });
    const res = await request(app).get('/staff/appointments-booked/facility?facility_id=1');
    expect(res.statusCode).toBe(500);
    expect(res.body.error).toBe('crash');
  });
});

describe('DELETE /staff/appointments-booked/facility/remove', () => {
  test('returns 200 when appointment is deleted', async () => {
    mockFrom.mockReturnValue(chainResult({ data: null, error: null }));
    const res = await request(app).delete('/staff/appointments-booked/facility/remove?appointment_id=1');
    expect(res.statusCode).toBe(200);
    expect(res.body).toEqual({ message: 'Appointment deleted', data: null });
  });

  test('returns 400 when appointment_id is missing', async () => {
    const res = await request(app).delete('/staff/appointments-booked/facility/remove');
    expect(res.statusCode).toBe(400);
    expect(res.body.error).toBe('appointment_id is required');
  });

  test('returns 400 when supabase returns an error', async () => {
    mockFrom.mockReturnValue(chainResult({ data: null, error: { message: 'Delete failed' } }));
    const res = await request(app).delete('/staff/appointments-booked/facility/remove?appointment_id=1');
    expect(res.statusCode).toBe(400);
    expect(res.body.error).toBe('Delete failed');
  });

  test('returns 400 when an unexpected error is thrown', async () => {
    mockFrom.mockImplementation(() => { throw new Error('crash'); });
    const res = await request(app).delete('/staff/appointments-booked/facility/remove?appointment_id=1');
    expect(res.statusCode).toBe(400);
    expect(res.body.error).toBe('crash');
  });
});

describe('PUT /staff/appointments-booked/facility/update', () => {
  test('returns 400 when appointment_id is missing', async () => {
    const res = await request(app).put('/staff/appointments-booked/facility/update').send({ status: 'cancelled' });
    expect(res.statusCode).toBe(400);
    expect(res.body.error).toBe('appointment_id and status are required');
  });

  test('returns 400 when status is missing', async () => {
    const res = await request(app).put('/staff/appointments-booked/facility/update?appointment_id=1').send({});
    expect(res.statusCode).toBe(400);
    expect(res.body.error).toBe('appointment_id and status are required');
  });

  test('returns 400 when supabase update fails', async () => {
    mockFrom.mockReturnValue(chainResult({ data: null, error: { message: 'Update failed' } }));
    const res = await request(app).put('/staff/appointments-booked/facility/update?appointment_id=1').send({ status: 'booked' });
    expect(res.statusCode).toBe(400);
    expect(res.body.error).toBe('Update failed');
  });

  test('returns 200 when appointment is updated with non-cancelled status', async () => {
    mockFrom.mockReturnValue(chainResult({ data: { id: 1, status: 'booked' }, error: null }));
    const res = await request(app).put('/staff/appointments-booked/facility/update?appointment_id=1').send({ status: 'booked' });
    expect(res.statusCode).toBe(200);
    expect(res.body).toEqual({ message: 'Appointment updated', appointment: { id: 1, status: 'booked' } });
  });

  test('returns 200 and restores slot capacity when status is cancelled', async () => {
    mockFrom
      .mockReturnValueOnce(chainResult({ data: { id: 1, status: 'cancelled', slot_id: 's1' }, error: null }))
      .mockReturnValueOnce(chainResult({ data: { total_capacity: 5 }, error: null }))
      .mockReturnValueOnce(chainResult({ data: null, error: null }));
    const res = await request(app).put('/staff/appointments-booked/facility/update?appointment_id=1').send({ status: 'cancelled' });
    expect(res.statusCode).toBe(200);
    expect(res.body.message).toBe('Appointment updated');
  });

  test('returns 400 when slot query fails during cancellation', async () => {
    mockFrom
      .mockReturnValueOnce(chainResult({ data: { id: 1, status: 'cancelled', slot_id: 's1' }, error: null }))
      .mockReturnValueOnce(chainResult({ data: null, error: { message: 'Slot not found' } }));
    const res = await request(app).put('/staff/appointments-booked/facility/update?appointment_id=1').send({ status: 'cancelled' });
    expect(res.statusCode).toBe(400);
    expect(res.body.error).toBe('Slot not found');
  });

  test('returns 400 when slot capacity update fails during cancellation', async () => {
    mockFrom
      .mockReturnValueOnce(chainResult({ data: { id: 1, status: 'cancelled', slot_id: 's1' }, error: null }))
      .mockReturnValueOnce(chainResult({ data: { total_capacity: 5 }, error: null }))
      .mockReturnValueOnce(chainResult({ data: null, error: { message: 'Capacity update failed' } }));
    const res = await request(app).put('/staff/appointments-booked/facility/update?appointment_id=1').send({ status: 'cancelled' });
    expect(res.statusCode).toBe(400);
    expect(res.body.error).toBe('Capacity update failed');
  });

  test('returns 500 when an unexpected error is thrown', async () => {
    mockFrom.mockImplementation(() => { throw new Error('crash'); });
    const res = await request(app).put('/staff/appointments-booked/facility/update?appointment_id=1').send({ status: 'booked' });
    expect(res.statusCode).toBe(500);
    expect(res.body.error).toBe('crash');
  });
});

describe('DELETE /staff/appointment-slots/remove', () => {
  test('returns 200 when slot is deleted', async () => {
    mockFrom.mockReturnValue(chainResult({ data: null, error: null }));
    const res = await request(app).delete('/staff/appointment-slots/remove?slot_id=1');
    expect(res.statusCode).toBe(200);
    expect(res.body).toEqual({ message: 'Slot deleted', data: null });
  });

  test('returns 400 when slot_id is missing', async () => {
    const res = await request(app).delete('/staff/appointment-slots/remove');
    expect(res.statusCode).toBe(400);
    expect(res.body.error).toBe('slot_id is required');
  });

  test('returns 400 when supabase returns an error', async () => {
    mockFrom.mockReturnValue(chainResult({ data: null, error: { message: 'Delete failed' } }));
    const res = await request(app).delete('/staff/appointment-slots/remove?slot_id=1');
    expect(res.statusCode).toBe(400);
    expect(res.body.error).toBe('Delete failed');
  });

  test('returns 500 when an unexpected error is thrown', async () => {
    mockFrom.mockImplementation(() => { throw new Error('crash'); });
    const res = await request(app).delete('/staff/appointment-slots/remove?slot_id=1');
    expect(res.statusCode).toBe(500);
    expect(res.body.error).toBe('crash');
  });
});

describe('PUT /staff/appointment-slots/update', () => {
  test('returns 200 when slot is updated', async () => {
    const updatedSlot = { id: 1, slot_time: '10:00', slot_date: '2026-04-21' };
    mockFrom.mockReturnValue(chainResult({ data: updatedSlot, error: null }));
    const res = await request(app).put('/staff/appointment-slots/update?slot_id=1').send({ slot_time: '10:00', slot_date: '2026-04-21' });
    expect(res.statusCode).toBe(200);
    expect(res.body).toEqual({ message: 'Slot updated', slot: updatedSlot });
  });

  test('returns 400 when slot_id is missing', async () => {
    const res = await request(app).put('/staff/appointment-slots/update').send({ slot_time: '10:00' });
    expect(res.statusCode).toBe(400);
    expect(res.body.error).toBe('slot_id is required');
  });

  test('returns 400 when supabase returns an error', async () => {
    mockFrom.mockReturnValue(chainResult({ data: null, error: { message: 'Update failed' } }));
    const res = await request(app).put('/staff/appointment-slots/update?slot_id=1').send({ slot_time: '10:00' });
    expect(res.statusCode).toBe(400);
    expect(res.body.error).toBe('Update failed');
  });

  test('returns 500 when an unexpected error is thrown', async () => {
    mockFrom.mockImplementation(() => { throw new Error('crash'); });
    const res = await request(app).put('/staff/appointment-slots/update?slot_id=1').send({ slot_time: '10:00' });
    expect(res.statusCode).toBe(500);
    expect(res.body.error).toBe('crash');
  });
});

describe('Middleware', () => {
  test('returns 404 for unknown routes', async () => {
    // Use POST because GET unknown routes serve the SPA index.html (catch-all)
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