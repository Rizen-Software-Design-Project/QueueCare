const API_BASE = import.meta.env.VITE_API_BASE || "https://queuecare-gubjeae9fqdzekfv.southafricanorth-01.azurewebsites.net";;

//
// ─────────────────────────────────────────────
// LIVE QUEUE (virtual_queues)
// ─────────────────────────────────────────────
//

export async function addToQueue(contactDetails, facilityId) {
  const res = await fetch(`${API_BASE}/queue/add_to_queue`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contact_details: contactDetails,
      facility_id: facilityId,
    }),
  });
  return res.json();
}

export async function getMyQueue(contactDetails, facilityId) {
  try {
    const res = await fetch(
      `${API_BASE}/queue/my_queue?contact_details=${encodeURIComponent(contactDetails)}&facility_id=${facilityId}`
    );

    if (!res.ok) {
      return { error: true, status: res.status, data: null };
    }

    const data = await res.json(); // ✅ await the json parse
    return data;

  } catch (err) {
    return { error: true, message: err.message, data: null };
  }
}

// FIX: backend DELETE reads from req.query, not req.body — use query params
export async function removeFromQueue(contactDetails, facilityId) {
  const res = await fetch(
    `${API_BASE}/queue/remove_queue?contact_details=${encodeURIComponent(contactDetails)}&facility_id=${facilityId}`,
    { method: "DELETE" }
  );
  return res.json();
}

//
// ─────────────────────────────────────────────
// HISTORY (queue_entries)
// ─────────────────────────────────────────────
//

export async function getQueueHistory(contactDetails, facilityId) {
  const res = await fetch(
    `${API_BASE}/queue/history?contact_details=${encodeURIComponent(contactDetails)}&facility_id=${facilityId}`
  );
  return res.json();
}

//
// ─────────────────────────────────────────────
// STAFF VIEW (LIVE FULL QUEUE)
// ─────────────────────────────────────────────
//

// FIX: was hitting /staff/view_queue which doesn't return position data
// now correctly hits /queue/full_queue
export async function viewFullQueue(facilityId) {
  const res = await fetch(
    `${API_BASE}/queue/full_queue?facility_id=${facilityId}`
  );
  return res.json();
}

//
// ─────────────────────────────────────────────
// STATUS UPDATE (LIVE ONLY)
// ─────────────────────────────────────────────
//

// FIX: added API_BASE prefix (was using relative URL which breaks in some envs)
export async function updateQueueStatus(contactDetails, facilityId, newStatus) {
  try {
    const res = await fetch(`${API_BASE}/queue/update_status`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contact_details: contactDetails,
        facility_id: facilityId,
        status: newStatus,
      }),
    });
    const data = await res.json();
    return data;
  } catch (err) {
    return { error: err.message };
  }
}

//
// ─────────────────────────────────────────────
// NOTIFICATIONS
// ─────────────────────────────────────────────
//

export async function notifyPatient(email, facilityId) {
  const res = await fetch(
    `${API_BASE}/notify/notify_patient?email=${encodeURIComponent(email)}&facility_id=${facilityId}`
  );
  return res.json();
}