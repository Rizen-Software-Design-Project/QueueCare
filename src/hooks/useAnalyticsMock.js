export function useFacilities() {
  return [
    { id: 1, name: 'Soweto Community Clinic' },
    { id: 2, name: 'Sandton Medical Centre' },
    { id: 3, name: 'Alexandra Health Post' },
  ]
}

const MOCK_WAIT_TIMES = [
  { facility_id: 1, facility_name: 'Soweto Community Clinic', hour_of_day: 7,  total_served: 12, avg_wait_minutes: 8,  min_wait_minutes: 3,  max_wait_minutes: 18 },
  { facility_id: 1, facility_name: 'Soweto Community Clinic', hour_of_day: 8,  total_served: 28, avg_wait_minutes: 22, min_wait_minutes: 10, max_wait_minutes: 45 },
  { facility_id: 1, facility_name: 'Soweto Community Clinic', hour_of_day: 9,  total_served: 35, avg_wait_minutes: 31, min_wait_minutes: 14, max_wait_minutes: 58 },
  { facility_id: 1, facility_name: 'Soweto Community Clinic', hour_of_day: 10, total_served: 30, avg_wait_minutes: 27, min_wait_minutes: 12, max_wait_minutes: 50 },
  { facility_id: 1, facility_name: 'Soweto Community Clinic', hour_of_day: 11, total_served: 25, avg_wait_minutes: 19, min_wait_minutes: 8,  max_wait_minutes: 38 },
  { facility_id: 1, facility_name: 'Soweto Community Clinic', hour_of_day: 12, total_served: 18, avg_wait_minutes: 14, min_wait_minutes: 5,  max_wait_minutes: 28 },
  { facility_id: 1, facility_name: 'Soweto Community Clinic', hour_of_day: 13, total_served: 22, avg_wait_minutes: 17, min_wait_minutes: 6,  max_wait_minutes: 32 },
  { facility_id: 1, facility_name: 'Soweto Community Clinic', hour_of_day: 14, total_served: 26, avg_wait_minutes: 24, min_wait_minutes: 11, max_wait_minutes: 42 },
  { facility_id: 1, facility_name: 'Soweto Community Clinic', hour_of_day: 15, total_served: 20, avg_wait_minutes: 16, min_wait_minutes: 7,  max_wait_minutes: 30 },
  { facility_id: 1, facility_name: 'Soweto Community Clinic', hour_of_day: 16, total_served: 10, avg_wait_minutes: 9,  min_wait_minutes: 4,  max_wait_minutes: 20 },

  { facility_id: 2, facility_name: 'Sandton Medical Centre',  hour_of_day: 8,  total_served: 15, avg_wait_minutes: 10, min_wait_minutes: 4,  max_wait_minutes: 22 },
  { facility_id: 2, facility_name: 'Sandton Medical Centre',  hour_of_day: 9,  total_served: 22, avg_wait_minutes: 15, min_wait_minutes: 6,  max_wait_minutes: 30 },
  { facility_id: 2, facility_name: 'Sandton Medical Centre',  hour_of_day: 10, total_served: 20, avg_wait_minutes: 13, min_wait_minutes: 5,  max_wait_minutes: 25 },
  { facility_id: 2, facility_name: 'Sandton Medical Centre',  hour_of_day: 14, total_served: 18, avg_wait_minutes: 11, min_wait_minutes: 5,  max_wait_minutes: 20 },
]

export function useWaitTimes({ facilityId = null } = {}) {
  const data = facilityId
    ? MOCK_WAIT_TIMES.filter(d => d.facility_id === facilityId)
    : MOCK_WAIT_TIMES
  return { data, loading: false, error: null }
}

function daysAgo(n) {
  const d = new Date()
  d.setDate(d.getDate() - n)
  return d.toISOString().split('T')[0]
}

const MOCK_NOSHOWS = [
  { facility_id: 1, facility_name: 'Soweto Community Clinic', date: daysAgo(0),  total_appointments: 42, no_shows: 9,  completed: 28, cancelled: 5, no_show_rate_pct: 21.4 },
  { facility_id: 1, facility_name: 'Soweto Community Clinic', date: daysAgo(1),  total_appointments: 38, no_shows: 6,  completed: 27, cancelled: 5, no_show_rate_pct: 15.8 },
  { facility_id: 1, facility_name: 'Soweto Community Clinic', date: daysAgo(2),  total_appointments: 45, no_shows: 11, completed: 29, cancelled: 5, no_show_rate_pct: 24.4 },
  { facility_id: 1, facility_name: 'Soweto Community Clinic', date: daysAgo(3),  total_appointments: 40, no_shows: 7,  completed: 28, cancelled: 5, no_show_rate_pct: 17.5 },
  { facility_id: 1, facility_name: 'Soweto Community Clinic', date: daysAgo(4),  total_appointments: 36, no_shows: 5,  completed: 26, cancelled: 5, no_show_rate_pct: 13.9 },
  { facility_id: 1, facility_name: 'Soweto Community Clinic', date: daysAgo(5),  total_appointments: 50, no_shows: 13, completed: 32, cancelled: 5, no_show_rate_pct: 26.0 },
  { facility_id: 1, facility_name: 'Soweto Community Clinic', date: daysAgo(6),  total_appointments: 44, no_shows: 8,  completed: 31, cancelled: 5, no_show_rate_pct: 18.2 },
  { facility_id: 1, facility_name: 'Soweto Community Clinic', date: daysAgo(7),  total_appointments: 39, no_shows: 4,  completed: 30, cancelled: 5, no_show_rate_pct: 10.3 },
  { facility_id: 1, facility_name: 'Soweto Community Clinic', date: daysAgo(8),  total_appointments: 41, no_shows: 10, completed: 26, cancelled: 5, no_show_rate_pct: 24.4 },
  { facility_id: 1, facility_name: 'Soweto Community Clinic', date: daysAgo(9),  total_appointments: 37, no_shows: 6,  completed: 26, cancelled: 5, no_show_rate_pct: 16.2 },
  { facility_id: 1, facility_name: 'Soweto Community Clinic', date: daysAgo(10), total_appointments: 43, no_shows: 8,  completed: 30, cancelled: 5, no_show_rate_pct: 18.6 },
  { facility_id: 1, facility_name: 'Soweto Community Clinic', date: daysAgo(11), total_appointments: 35, no_shows: 3,  completed: 27, cancelled: 5, no_show_rate_pct: 8.6  },
  { facility_id: 1, facility_name: 'Soweto Community Clinic', date: daysAgo(12), total_appointments: 48, no_shows: 12, completed: 31, cancelled: 5, no_show_rate_pct: 25.0 },
  { facility_id: 1, facility_name: 'Soweto Community Clinic', date: daysAgo(13), total_appointments: 46, no_shows: 9,  completed: 32, cancelled: 5, no_show_rate_pct: 19.6 },

  { facility_id: 2, facility_name: 'Sandton Medical Centre',  date: daysAgo(0),  total_appointments: 20, no_shows: 2,  completed: 16, cancelled: 2, no_show_rate_pct: 10.0 },
  { facility_id: 2, facility_name: 'Sandton Medical Centre',  date: daysAgo(1),  total_appointments: 18, no_shows: 1,  completed: 15, cancelled: 2, no_show_rate_pct: 5.6  },
  { facility_id: 2, facility_name: 'Sandton Medical Centre',  date: daysAgo(2),  total_appointments: 22, no_shows: 3,  completed: 17, cancelled: 2, no_show_rate_pct: 13.6 },
]

export function useNoShowRates({ facilityId = null, startDate = null, endDate = null } = {}) {
  let data = facilityId
    ? MOCK_NOSHOWS.filter(d => d.facility_id === facilityId)
    : MOCK_NOSHOWS

  if (startDate) data = data.filter(d => d.date >= startDate)
  if (endDate)   data = data.filter(d => d.date <= endDate)

  return { data, loading: false, error: null }
}

const MOCK_APPOINTMENTS = [
  { id: '1', booked_at: new Date(Date.now() - 3600000).toISOString(),  patient_name: 'Thabo',    patient_surname: 'Nkosi',    patient_email: 'thabo@example.com',    patient_phone: null,            patient_contact: 'thabo@example.com',    facility_id: 1, facility_name: 'Soweto Community Clinic', appointment_type: 'scheduled', status: 'completed', queue_status: 'completed', joined_at: new Date(Date.now() - 5400000).toISOString(), called_at: new Date(Date.now() - 3960000).toISOString(), completed_at: new Date(Date.now() - 3600000).toISOString(), wait_minutes: 24, service_minutes: 6,  reason: 'Annual check-up' },
  { id: '2', booked_at: new Date(Date.now() - 7200000).toISOString(),  patient_name: 'Naledi',   patient_surname: 'Dlamini',  patient_email: null,                   patient_phone: '0821234567',    patient_contact: '0821234567',           facility_id: 1, facility_name: 'Soweto Community Clinic', appointment_type: 'walk_in',   status: 'completed', queue_status: 'completed', joined_at: new Date(Date.now() - 9000000).toISOString(), called_at: new Date(Date.now() - 7560000).toISOString(), completed_at: new Date(Date.now() - 7200000).toISOString(), wait_minutes: 30, service_minutes: 6,  reason: 'Fever' },
  { id: '3', booked_at: new Date(Date.now() - 86400000).toISOString(), patient_name: 'Sipho',    patient_surname: 'Mahlangu', patient_email: 'sipho@example.com',    patient_phone: null,            patient_contact: 'sipho@example.com',    facility_id: 1, facility_name: 'Soweto Community Clinic', appointment_type: 'scheduled', status: 'no_show',   queue_status: null,        joined_at: null,                                         called_at: null,                                          completed_at: null,                                          wait_minutes: null, service_minutes: null, reason: 'Follow-up' },
  { id: '4', booked_at: new Date(Date.now() - 172800000).toISOString(),patient_name: 'Lerato',   patient_surname: 'Mokoena',  patient_email: 'lerato@example.com',   patient_phone: '0839876543',    patient_contact: 'lerato@example.com',   facility_id: 2, facility_name: 'Sandton Medical Centre',  appointment_type: 'scheduled', status: 'completed', queue_status: 'completed', joined_at: new Date(Date.now() - 174600000).toISOString(), called_at: new Date(Date.now() - 173700000).toISOString(), completed_at: new Date(Date.now() - 172800000).toISOString(), wait_minutes: 15, service_minutes: 15, reason: 'Blood pressure' },
  { id: '5', booked_at: new Date(Date.now() - 259200000).toISOString(),patient_name: 'Bongani',  patient_surname: 'Zulu',     patient_email: null,                   patient_phone: '0711112222',    patient_contact: '0711112222',           facility_id: 1, facility_name: 'Soweto Community Clinic', appointment_type: 'walk_in',   status: 'cancelled', queue_status: null,        joined_at: null,                                         called_at: null,                                          completed_at: null,                                          wait_minutes: null, service_minutes: null, reason: 'Headache' },
  { id: '6', booked_at: new Date(Date.now() - 345600000).toISOString(),patient_name: 'Zanele',   patient_surname: 'Khumalo',  patient_email: 'zanele@example.com',   patient_phone: null,            patient_contact: 'zanele@example.com',   facility_id: 2, facility_name: 'Sandton Medical Centre',  appointment_type: 'scheduled', status: 'completed', queue_status: 'completed', joined_at: new Date(Date.now() - 347400000).toISOString(), called_at: new Date(Date.now() - 346500000).toISOString(), completed_at: new Date(Date.now() - 345600000).toISOString(), wait_minutes: 15, service_minutes: 15, reason: 'Diabetes review' },
  { id: '7', booked_at: new Date(Date.now() - 432000000).toISOString(),patient_name: 'Mpho',     patient_surname: 'Sithole',  patient_email: 'mpho@example.com',     patient_phone: '0623334444',    patient_contact: 'mpho@example.com',     facility_id: 1, facility_name: 'Soweto Community Clinic', appointment_type: 'scheduled', status: 'no_show',   queue_status: null,        joined_at: null,                                         called_at: null,                                          completed_at: null,                                          wait_minutes: null, service_minutes: null, reason: 'Skin rash' },
  { id: '8', booked_at: new Date(Date.now() - 518400000).toISOString(),patient_name: 'Thandeka', patient_surname: 'Ndlovu',   patient_email: 'thandeka@example.com', patient_phone: null,            patient_contact: 'thandeka@example.com', facility_id: 3, facility_name: 'Alexandra Health Post',   appointment_type: 'walk_in',   status: 'completed', queue_status: 'completed', joined_at: new Date(Date.now() - 520200000).toISOString(), called_at: new Date(Date.now() - 519300000).toISOString(), completed_at: new Date(Date.now() - 518400000).toISOString(), wait_minutes: 15, service_minutes: 15, reason: 'Child vaccination' },
  { id: '9', booked_at: new Date().toISOString(),                       patient_name: 'Karabo',   patient_surname: 'Moagi',    patient_email: null,                   patient_phone: '0845556666',    patient_contact: '0845556666',           facility_id: 1, facility_name: 'Soweto Community Clinic', appointment_type: 'scheduled', status: 'booked',    queue_status: 'waiting',   joined_at: new Date().toISOString(),                     called_at: null,                                          completed_at: null,                                          wait_minutes: null, service_minutes: null, reason: 'TB test' },
]

export function useCustomView({
  facilityId = null,
  status     = null,
  type       = null,
  startDate  = null,
  endDate    = null,
} = {}) {
  let data = [...MOCK_APPOINTMENTS]

  if (facilityId) data = data.filter(d => d.facility_id === facilityId)
  if (status)     data = data.filter(d => d.status === status)
  if (type)       data = data.filter(d => d.appointment_type === type)
  if (startDate)  data = data.filter(d => d.booked_at >= startDate)
  if (endDate)    data = data.filter(d => d.booked_at <= endDate + 'T23:59:59Z')

  return { data, loading: false, error: null }
}