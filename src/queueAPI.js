const API_BASE = "";

export async function addToQueue(contactDetails, facilityId) {
  const res = await fetch(
    `${API_BASE}/queue/add_to_queue?contact_details=${encodeURIComponent(contactDetails)}&facility_id=${facilityId}`,
    { method: "POST" }
  );
  return res.json();
}

export async function getMyQueue(contactDetails, facilityId) {
  const res = await fetch(
    `${API_BASE}/queue/my_queue?contact_details=${encodeURIComponent(contactDetails)}&facility_id=${facilityId}`
  );
  return res.json();
}

export async function removeFromQueue(contactDetails, facilityId) {
  const res = await fetch(
    `${API_BASE}/queue/remove_queue?contact_details=${encodeURIComponent(contactDetails)}&facility_id=${facilityId}`,
    { method: "DELETE" }
  );
  return res.json();
}

export async function viewFullQueue(facilityId) {
  const res = await fetch(
    `${API_BASE}/staff/view_queue?facility_id=${facilityId}`
  );
  return res.json();
}

export async function updateQueueStatus(contactDetails, facilityId, status) {
  const res = await fetch(
    `${API_BASE}/queue/queue_status?contact_details=${encodeURIComponent(contactDetails)}&facility_id=${facilityId}&status=${encodeURIComponent(status)}`,
    { method: "PUT" }
  );
  return res.json();
}

export async function notifyPatient(email, facilityId) {
  const res = await fetch(
    `${API_BASE}/notify/notify_patient?email=${encodeURIComponent(email)}&facility_id=${facilityId}`
  );
  return res.json();
}