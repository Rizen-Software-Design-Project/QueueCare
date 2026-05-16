/* v8 ignore next */
const API_BASE = import.meta.env.VITE_API_BASE || "https://queuecare-gubjeae9fqdzekfv.southafricanorth-01.azurewebsites.net";

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

    const data = await res.json(); 
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



export async function getQueueHistory(contactDetails, facilityId) {
  const res = await fetch(
    `${API_BASE}/queue/history?contact_details=${encodeURIComponent(contactDetails)}&facility_id=${facilityId}`
  );
  return res.json();
}


export async function viewFullQueue(facilityId) {
  const res = await fetch(
    `${API_BASE}/queue/full_queue?facility_id=${facilityId}`
  );
  return res.json();
}




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



export async function notifyPatient(email, facilityId) {
  const res = await fetch(
    `${API_BASE}/notify/notify_patient?email=${encodeURIComponent(email)}&facility_id=${facilityId}`
  );
  return res.json();
}
//Staff Functionality
export async function getSchedule(staff_id) {
  try {
    const res = await fetch(`${API_BASE}/schedule?staff_id=${staff_id}`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } catch (err) {
    return { success: false, error: err.message };
  }
}

async function checkStaff(staff_id) {
  try {
    const res = await fetch(`${API_BASE}/get_staff?staff_id=${staff_id}`);
    if (!res.ok) return false;
    const data = await res.json();
    return data.status === true;  // check the actual payload
  } catch (err) {
    console.error("Network error:", err.message);
    return false;
  }
}

export async function createSchedule(rows) {
  const staffId = rows?.[0]?.staff_id;

  if (!staffId) {
    return { success: false, error: "Missing staff_id" };
  }

  try {
    const res = await fetch(`${API_BASE}/schedule`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        staff_id: staffId,
        rows,
      }),
    });

    const data = await res.json().catch(() => ({}));

    if (!res.ok) {
      return {
        success: false,
        error: /* v8 ignore next */ data?.error || data?.message || `HTTP ${res.status}`,
      };
    }

    return data;
  } catch (err) {
    return { success: false, error: err.message };
  }
}
export async function updateDaySchedule(body) {
  const exists = await checkStaff(body.staff_id);
  if (!exists) return { success: false, error: "Staff not found" };

  try {
    const res = await fetch(`${API_BASE}/schedule`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } catch (err) {
    return { success: false, error: err.message };
  }
}

export async function deleteSchedule(staff_id) {
  try {
    const res = await fetch(`${API_BASE}/schedule?staff_id=${staff_id}`, {
      method: "DELETE",
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } catch (err) {
    return { success: false, error: err.message };
  }
}
