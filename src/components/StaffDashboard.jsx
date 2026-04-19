import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { createClient } from "@supabase/supabase-js";
import "./StaffDashboard.css";

const SUPABASE_URL = "https://vktjtxljwzyakobkkhol.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZrdGp0eGxqd3p5YWtvYmtraG9sIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzU1ODE1ODYsImV4cCI6MjA5MTE1NzU4Nn0.LVNelw--Xp1t_weGNwhPGMrzqg0iS7J5TAXw9ZM6aUA";
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

const STATUS_OPTIONS = ["booked", "completed", "cancelled"];

export default function StaffDashboard() {
  const navigate = useNavigate();

  // ── State ────────────────────────────────────────────────────────────────
  const [facilityId,    setFacilityId]    = useState(null);
  const [facilityName,  setFacilityName]  = useState("");
  const [appointments,  setAppointments]  = useState([]);
  const [apptLoading,   setApptLoading]   = useState(true);
  const [apptError,     setApptError]     = useState("");
  const [updatingId,    setUpdatingId]    = useState(null); // which appt is being updated

  // Create slot
  const [newSlotDate,     setNewSlotDate]     = useState("");
  const [newSlotTime,     setNewSlotTime]     = useState("");
  const [newSlotCapacity, setNewSlotCapacity] = useState("");
  const [newSlotDuration, setNewSlotDuration] = useState("");
  const [createSlotMsg,   setCreateSlotMsg]   = useState({ type: "", text: "" });
  const [creatingSlot,    setCreatingSlot]    = useState(false);
  const [slots, setSlots] = useState([]);
  const [slotsLoading, setSlotsLoading] = useState(false);
  const [slotsError, setSlotsError] = useState("");
  const [editingSlotId, setEditingSlotId] = useState(null);
  const [editSlotDate, setEditSlotDate] = useState("");
  const [editSlotTime, setEditSlotTime] = useState("");
  const [editSlotCapacity, setEditSlotCapacity] = useState("");
  const [editSlotDuration, setEditSlotDuration] = useState("");
  const [updatingSlot, setUpdatingSlot] = useState(false);
  const [updateSlotMsg, setUpdateSlotMsg] = useState({ type: "", text: "" });
  // ── On mount: resolve facility from staff assignment ─────────────────────
 

  // ── Fetch appointments for facility ──────────────────────────────────────
  async function fetchAppointments(fId) {
    setApptLoading(true);
    setApptError("");

    const { data, error } = await supabase
      .from("appointments")
      .select(`
        id,
        status,
        reason,
        booked_at,
        patient_id,
        slot_id,
        appointment_slots!inner(
          slot_date,
          slot_time,
          duration_minutes,
          facility_id
        ),
        profiles(name, surname, email, phone_number)
      `)
      .eq("appointment_slots.facility_id", fId)
      .order("booked_at", { ascending: false })
      .limit(50);

    setApptLoading(false);

    if (error) { setApptError(error.message); return; }
    setAppointments(data || []);
  }

  async function fetchSlots(fId) {
  setSlotsLoading(true);
  setSlotsError("");

  const { data, error } = await supabase
    .from("appointment_slots")
    .select(`
      id,
      slot_date,
      slot_time,
      duration_minutes,
      total_capacity,
      booked_count,
      facility_id
    `)
    .eq("facility_id", fId)
    .order("slot_date", { ascending: true })
    .order("slot_time", { ascending: true });

  setSlotsLoading(false);

  if (error) {
    setSlotsError(error.message);
    return;
  }

  setSlots(data || []);
}
   useEffect(() => {
    async function loadFacility() {
      const identity = JSON.parse(localStorage.getItem("userIdentity") || "{}");

      if (!identity.auth_provider || !identity.provider_user_id) {
        setApptError("Not logged in. Please sign in again.");
        setApptLoading(false);
        return;
      }

      // Get profile
      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("id")
        .eq("auth_provider", identity.auth_provider)
        .eq("provider_user_id", identity.provider_user_id)
        .maybeSingle();

      if (profileError || !profile) {
        setApptError("Could not load your profile.");
        setApptLoading(false);
        return;
      }

      // Get assignment
      const { data: assignment, error: assignError } = await supabase
        .from("staff_assignments")
        .select("facility_id, facilities(id, name)")
        .eq("profile_id", profile.id)
        .maybeSingle();

      if (assignError || !assignment?.facility_id) {
        setApptError("You are not assigned to a facility yet. Please contact your admin.");
        setApptLoading(false);
        return;
      }

      setFacilityId(assignment.facility_id);
      setFacilityName(assignment.facilities?.name || "");
      fetchAppointments(assignment.facility_id);
      fetchSlots(assignment.facility_id);
    }

    loadFacility();
  }, []);

  
  // ── Inline status update ──────────────────────────────────────────────────
  async function updateStatus(apptId, newStatus) {
    setUpdatingId(apptId);

    const { error } = await supabase
      .from("appointments")
      .update({ status: newStatus })
      .eq("id", apptId);

    setUpdatingId(null);

    if (error) { alert("Failed to update: " + error.message); return; }

    setAppointments((prev) =>
      prev.map((a) => a.id === apptId ? { ...a, status: newStatus } : a)
    );
  }

  // ── Create slot ───────────────────────────────────────────────────────────
  async function handleCreateSlot(e) {
  e.preventDefault();
  setCreateSlotMsg({ type: "", text: "" });
  setCreatingSlot(true);

  const identity = JSON.parse(localStorage.getItem("userIdentity") || "{}");

  const { data, error } = await supabase.rpc("create_appointment_slot", {
    p_auth_provider: identity.auth_provider,
    p_provider_user_id: identity.provider_user_id,
    p_facility_id: facilityId,
    p_slot_date: newSlotDate,
    p_slot_time: newSlotTime,
    p_total_capacity: parseInt(newSlotCapacity, 10),
    p_duration_minutes: parseInt(newSlotDuration, 10),
  });

  setCreatingSlot(false);

  if (error) {
    setCreateSlotMsg({
      type: "error",
      text: error.message || "Failed to create slot.",
    });
    return;
  }

  if (data?.error) {
    setCreateSlotMsg({
      type: "error",
      text: data.error,
    });
    return;
  }

  setCreateSlotMsg({
    type: "success",
    text: data?.message || "Slot created successfully.",
  });
  if (facilityId) {
  fetchSlots(facilityId);
}
  setNewSlotDate("");
  setNewSlotTime("");
  setNewSlotCapacity("");
  setNewSlotDuration("");
}
function startEditSlot(slot) {
  setEditingSlotId(slot.id);
  setEditSlotDate(slot.slot_date || "");
  setEditSlotTime(formatTime(slot.slot_time));
  setEditSlotCapacity(String(slot.total_capacity ?? ""));
  setEditSlotDuration(String(slot.duration_minutes ?? ""));
  setUpdateSlotMsg({ type: "", text: "" });
}

function cancelEditSlot() {
  setEditingSlotId(null);
  setEditSlotDate("");
  setEditSlotTime("");
  setEditSlotCapacity("");
  setEditSlotDuration("");
  setUpdateSlotMsg({ type: "", text: "" });
}
async function handleUpdateSlot(slotId) {
  setUpdateSlotMsg({ type: "", text: "" });
  setUpdatingSlot(true);

  const identity = JSON.parse(localStorage.getItem("userIdentity") || "{}");

  const { data, error } = await supabase.rpc("update_appointment_slot", {
    p_auth_provider: identity.auth_provider,
    p_provider_user_id: identity.provider_user_id,
    p_slot_id: slotId,
    p_slot_date: editSlotDate,
    p_slot_time: editSlotTime,
    p_total_capacity: parseInt(editSlotCapacity, 10),
    p_duration_minutes: parseInt(editSlotDuration, 10),
  });

  setUpdatingSlot(false);

  if (error) {
    setUpdateSlotMsg({
      type: "error",
      text: error.message || "Failed to update slot.",
    });
    return;
  }

  if (data?.error) {
    setUpdateSlotMsg({
      type: "error",
      text: data.error,
    });
    return;
  }

  setUpdateSlotMsg({
    type: "success",
    text: data?.message || "Slot updated successfully.",
  });

  cancelEditSlot();
  if (facilityId) fetchSlots(facilityId);
}
  // ── Helpers ───────────────────────────────────────────────────────────────
  function formatDate(val) {
    if (!val) return "—";
    return new Date(val).toLocaleDateString("en-ZA", {
      day: "numeric", month: "short", year: "numeric",
    });
  }

  function formatTime(val) {
    return val ? String(val).slice(0, 5) : "—";
  }

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="staff-dash">
      <header className="staff-dash-header">
        <div>
          <h1>Staff Dashboard</h1>
          {facilityName && (
            <p style={{ margin: 0, fontSize: 14, color: "#ccc" }}>
              📍 {facilityName}
            </p>
          )}
        </div>
        <button className="staff-back-btn" onClick={() => navigate("/dashboard")}>
          ← Back
        </button>
      </header>

      <div className="staff-dash-grid">

        {/* ── Appointments ── */}
        <section className="staff-card" style={{ gridColumn: "1 / -1" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
            <h2 style={{ margin: 0 }}>Facility Appointments</h2>
            {facilityId && (
              <button
                className="staff-back-btn"
                onClick={() => fetchAppointments(facilityId)}
                disabled={apptLoading}
              >
                {apptLoading ? "Refreshing..." : "↻ Refresh"}
              </button>
            )}
          </div>

          {apptLoading && <p style={{ color: "#888" }}>Loading appointments...</p>}
          {apptError  && <p className="staff-error">{apptError}</p>}

          {!apptLoading && !apptError && appointments.length === 0 && (
            <p style={{ color: "#888" }}>No appointments found for this facility.</p>
          )}

          {!apptLoading && appointments.length > 0 && (
            <div style={{ overflowX: "auto" }}>
              <table className="staff-table">
                <thead>
                  <tr>
                    <th>Patient</th>
                    <th>email</th>
                    <th>Phone</th>
                    <th>Date</th>
                    <th>Time</th>
                    <th>Duration</th>
                    <th>Reason</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {appointments.map((a) => (
                    <tr key={a.id}>
                      <td>
                        {a.profiles?.name
                          ? `${a.profiles.name} ${a.profiles.surname || ""}`
                          : a.patient_id.slice(0, 8) + "…"}
                      </td>
                      <td>{a.profiles?.email || "—"}</td>
                      <td>{a.profiles?.phone_number || "—"}</td>
                      <td>{formatDate(a.appointment_slots?.slot_date)}</td>
                      <td>{formatTime(a.appointment_slots?.slot_time)}</td>
                      <td>{a.appointment_slots?.duration_minutes ?? "—"} min</td>
                      <td>{a.reason || "—"}</td>
                      <td>
                        <span className={`staff-badge staff-badge-${a.status}`}>
                          {a.status}
                        </span>
                      </td>
                      <td>
                        <div style={{ display: "flex", gap: 4 }}>
                          {STATUS_OPTIONS.filter((s) => s !== a.status).map((s) => (
                            <button
                              key={s}
                              className={`staff-back-btn`}
                              style={{ fontSize: 11, padding: "3px 8px" }}
                              disabled={updatingId === a.id}
                              onClick={() => updateStatus(a.id, s)}
                            >
                              {updatingId === a.id ? "..." : s}
                            </button>
                          ))}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        {/* ── Create Slot ── */}
        <section className="staff-card">
          <h2>Create New Appointment Slot</h2>
          <form onSubmit={handleCreateSlot} className="staff-form">
            <label>
              Date
              <input
                type="date"
                value={newSlotDate}
                onChange={(e) => setNewSlotDate(e.target.value)}
                required
              />
            </label>
            <label>
              Time
              <input
                type="time"
                value={newSlotTime}
                onChange={(e) => setNewSlotTime(e.target.value)}
                required
              />
            </label>
            <label>
              Capacity
              <input
                type="number"
                min="1"
                value={newSlotCapacity}
                onChange={(e) => setNewSlotCapacity(e.target.value)}
                placeholder="e.g. 5"
                required
              />
            </label>
            <label>
              Duration (min)
              <input
                type="number"
                min="5"
                value={newSlotDuration}
                onChange={(e) => setNewSlotDuration(e.target.value)}
                placeholder="e.g. 15"
                required
              />
            </label>
            <button type="submit" disabled={creatingSlot || !facilityId}>
              {creatingSlot ? "Creating..." : "Create Slot"}
            </button>
          </form>

          {createSlotMsg.text && (
            <p className={createSlotMsg.type === "error" ? "staff-error" : "staff-success"}>
              {createSlotMsg.text}
            </p>
          )}

          {!facilityId && !apptLoading && (
            <p className="staff-error">
              No facility assigned — cannot create slots.
            </p>
          )}
        </section>
        <section className="staff-card" style={{ gridColumn: "1 / -1" }}>
  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
    <h2 style={{ margin: 0 }}>Available Appointment Slots</h2>
    {facilityId && (
      <button
        className="staff-back-btn"
        onClick={() => fetchSlots(facilityId)}
        disabled={slotsLoading}
      >
        {slotsLoading ? "Refreshing..." : "↻ Refresh"}
      </button>
    )}
  </div>

  {slotsLoading && <p style={{ color: "#888" }}>Loading slots...</p>}
  {slotsError && <p className="staff-error">{slotsError}</p>}

  {!slotsLoading && !slotsError && slots.length === 0 && (
    <p style={{ color: "#888" }}>No slots found for this facility.</p>
  )}

  {!slotsLoading && slots.length > 0 && (
    <div style={{ overflowX: "auto" }}>
      <table className="staff-table">
        <thead>
          <tr>
            <th>Date</th>
            <th>Time</th>
            <th>Duration</th>
            <th>Capacity</th>
            <th>Booked</th>
            <th>Available</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {slots.map((slot) => (
            <tr key={slot.id}>
              <td>{formatDate(slot.slot_date)}</td>
              <td>{formatTime(slot.slot_time)}</td>
              <td>{slot.duration_minutes ?? "—"} min</td>
              <td>{slot.total_capacity ?? 0}</td>
              <td>{slot.booked_count ?? 0}</td>
              <td>{(slot.total_capacity ?? 0) - (slot.booked_count ?? 0)}</td>
              <td>
                <button
                  type="button"
                  className="staff-action-btn"
                  onClick={() => startEditSlot(slot)}
                >
                  Edit
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )}
  {editingSlotId && (
  <section className="staff-card">
    <h2>Edit Slot</h2>

    <form
      onSubmit={(e) => {
        e.preventDefault();
        handleUpdateSlot(editingSlotId);
      }}
      className="staff-form"
    >
      <label>
        Date
        <input
          type="date"
          value={editSlotDate}
          onChange={(e) => setEditSlotDate(e.target.value)}
          required
        />
      </label>

      <label>
        Time
        <input
          type="time"
          value={editSlotTime}
          onChange={(e) => setEditSlotTime(e.target.value)}
          required
        />
      </label>

      <label>
        Capacity
        <input
          type="number"
          min="1"
          value={editSlotCapacity}
          onChange={(e) => setEditSlotCapacity(e.target.value)}
          required
        />
      </label>

      <label>
        Duration (min)
        <input
          type="number"
          min="5"
          value={editSlotDuration}
          onChange={(e) => setEditSlotDuration(e.target.value)}
          required
        />
      </label>

      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        <button type="submit" disabled={updatingSlot}>
          {updatingSlot ? "Saving..." : "Save Changes"}
        </button>

        <button
          type="button"
          className="staff-action-btn"
          onClick={cancelEditSlot}
        >
          Cancel
        </button>
      </div>
    </form>

    {updateSlotMsg.text && (
      <p className={updateSlotMsg.type === "error" ? "staff-error" : "staff-success"}>
        {updateSlotMsg.text}
      </p>
    )}
  </section>
)}
</section>

      </div>
    </div>
  );
}