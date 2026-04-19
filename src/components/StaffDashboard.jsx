import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import "./StaffDashboard.css";

const API_BASE = "";

export default function StaffDashboard() {
  const navigate = useNavigate();

  // --- state ---
  const [facilityId, setFacilityId] = useState("");
  const [appointments, setAppointments] = useState([]);
  const [apptLoading, setApptLoading] = useState(false);
  const [apptError, setApptError] = useState("");

  // update appointment
  const [updateId, setUpdateId] = useState("");
  const [updateStatus, setUpdateStatus] = useState("booked");
  const [updateMsg, setUpdateMsg] = useState("");

  // update slot
  const [updateSlotId, setUpdateSlotId] = useState("");
  const [slotTime, setSlotTime] = useState("");
  const [slotDate, setSlotDate] = useState("");
  const [slotCapacity, setSlotCapacity] = useState("");
  const [slotDuration, setSlotDuration] = useState("");
  const [updateSlotMsg, setUpdateSlotMsg] = useState("");

  // create slot
  const [newSlotTime, setNewSlotTime] = useState("");
  const [newSlotDate, setNewSlotDate] = useState("");
  const [newSlotCapacity, setNewSlotCapacity] = useState("");
  const [newSlotDuration, setNewSlotDuration] = useState("");
  const [newSlotFacility, setNewSlotFacility] = useState("");
  const [createSlotMsg, setCreateSlotMsg] = useState("");

  // --- fetch appointments ---
  async function fetchAppointments(e) {
    e.preventDefault();
    if (!facilityId.trim()) {
      setApptError("Enter a facility ID");
      return;
    }
    setApptLoading(true);
    setApptError("");
    try {
      const res = await fetch(
        `${API_BASE}/staff/appointments?facility_id=${encodeURIComponent(facilityId)}`
      );
      const data = await res.json();
      if (!res.ok) {
        setApptError(data.error || "Failed to fetch");
        setAppointments([]);
      } else {
        setAppointments(data.appointments || []);
      }
    } catch (err) {
      setApptError(err.message);
    } finally {
      setApptLoading(false);
    }
  }

  // --- update appointment status ---
  async function handleUpdateAppointment(e) {
    e.preventDefault();
    setUpdateMsg("");
    if (!updateId.trim()) {
      setUpdateMsg("Enter an appointment ID");
      return;
    }
    try {
      const res = await fetch(
        `${API_BASE}/staff/appointments/${encodeURIComponent(updateId)}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status: updateStatus }),
        }
      );
      const data = await res.json();
      if (!res.ok) {
        setUpdateMsg("Error: " + (data.error || "Failed"));
      } else {
        setUpdateMsg(data.message);
      }
    } catch (err) {
      setUpdateMsg("Error: " + err.message);
    }
  }

  // --- create slot ---
  async function handleCreateSlot(e) {
    e.preventDefault();
    setCreateSlotMsg("");
    try {
      const res = await fetch(`${API_BASE}/staff/slots`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          slot_time: newSlotTime,
          slot_date: newSlotDate,
          total_capacity: Number(newSlotCapacity),
          duration_minutes: Number(newSlotDuration),
          facility_id: Number(newSlotFacility),
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setCreateSlotMsg("Error: " + (data.error || "Failed"));
      } else {
        setCreateSlotMsg(data.message);
      }
    } catch (err) {
      setCreateSlotMsg("Error: " + err.message);
    }
  }

  // --- update slot ---
  async function handleUpdateSlot(e) {
    e.preventDefault();
    setUpdateSlotMsg("");
    if (!updateSlotId.trim()) {
      setUpdateSlotMsg("Enter a slot ID");
      return;
    }
    const body = {};
    if (slotTime) body.slot_time = slotTime;
    if (slotDate) body.slot_date = slotDate;
    if (slotCapacity) body.total_capacity = Number(slotCapacity);
    if (slotDuration) body.duration_minutes = Number(slotDuration);

    try {
      const res = await fetch(
        `${API_BASE}/staff/slots/${encodeURIComponent(updateSlotId)}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        }
      );
      const data = await res.json();
      if (!res.ok) {
        setUpdateSlotMsg("Error: " + (data.error || "Failed"));
      } else {
        setUpdateSlotMsg(data.message);
      }
    } catch (err) {
      setUpdateSlotMsg("Error: " + err.message);
    }
  }

  return (
    <div className="staff-dash">
      <header className="staff-dash-header">
        <h1>Staff Dashboard</h1>
        <button className="staff-back-btn" onClick={() => navigate("/dashboard")}>
          ← Back
        </button>
      </header>

      <div className="staff-dash-grid">
        {/* --- View Appointments --- */}
        <section className="staff-card">
          <h2>View Facility Appointments</h2>
          <form onSubmit={fetchAppointments} className="staff-form">
            <label>
              Facility ID
              <input
                type="text"
                value={facilityId}
                onChange={(e) => setFacilityId(e.target.value)}
                placeholder="e.g. 1"
              />
            </label>
            <button type="submit" disabled={apptLoading}>
              {apptLoading ? "Loading..." : "Fetch"}
            </button>
          </form>
          {apptError && <p className="staff-error">{apptError}</p>}
          {appointments.length > 0 && (
            <table className="staff-table">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Patient</th>
                  <th>Slot</th>
                  <th>Status</th>
                  <th>Reason</th>
                  <th>Booked At</th>
                </tr>
              </thead>
              <tbody>
                {appointments.map((a) => (
                  <tr key={a.id}>
                    <td title={a.id}>{a.id.slice(0, 8)}…</td>
                    <td title={a.patient_id}>{a.patient_id.slice(0, 8)}…</td>
                    <td title={a.slot_id}>{a.slot_id ? a.slot_id.slice(0, 8) + "…" : "—"}</td>
                    <td>
                      <span className={`staff-badge staff-badge-${a.status}`}>
                        {a.status}
                      </span>
                    </td>
                    <td>{a.reason || "—"}</td>
                    <td>{a.booked_at ? new Date(a.booked_at).toLocaleString() : "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </section>

        {/* --- Update Appointment Status --- */}
        <section className="staff-card">
          <h2>Update Appointment Status</h2>
          <form onSubmit={handleUpdateAppointment} className="staff-form">
            <label>
              Appointment ID
              <input
                type="text"
                value={updateId}
                onChange={(e) => setUpdateId(e.target.value)}
                placeholder="UUID"
              />
            </label>
            <label>
              New Status
              <select value={updateStatus} onChange={(e) => setUpdateStatus(e.target.value)}>
                <option value="booked">booked</option>
                <option value="completed">completed</option>
                <option value="cancelled">cancelled</option>
              </select>
            </label>
            <button type="submit">Update</button>
          </form>
          {updateMsg && <p className={updateMsg.startsWith("Error") ? "staff-error" : "staff-success"}>{updateMsg}</p>}
        </section>

        {/* --- Create Slot --- */}
        <section className="staff-card">
          <h2>Create New Slot</h2>
          <form onSubmit={handleCreateSlot} className="staff-form">
            <label>
              Facility ID
              <input
                type="number"
                value={newSlotFacility}
                onChange={(e) => setNewSlotFacility(e.target.value)}
                placeholder="e.g. 1"
                required
              />
            </label>
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
            <button type="submit">Create Slot</button>
          </form>
          {createSlotMsg && <p className={createSlotMsg.startsWith("Error") ? "staff-error" : "staff-success"}>{createSlotMsg}</p>}
        </section>

        {/* --- Update Slot --- */}
        <section className="staff-card">
          <h2>Update Existing Slot</h2>
          <form onSubmit={handleUpdateSlot} className="staff-form">
            <label>
              Slot ID
              <input
                type="text"
                value={updateSlotId}
                onChange={(e) => setUpdateSlotId(e.target.value)}
                placeholder="UUID"
                required
              />
            </label>
            <label>
              Date
              <input
                type="date"
                value={slotDate}
                onChange={(e) => setSlotDate(e.target.value)}
              />
            </label>
            <label>
              Time
              <input
                type="time"
                value={slotTime}
                onChange={(e) => setSlotTime(e.target.value)}
              />
            </label>
            <label>
              Capacity
              <input
                type="number"
                min="1"
                value={slotCapacity}
                onChange={(e) => setSlotCapacity(e.target.value)}
              />
            </label>
            <label>
              Duration (min)
              <input
                type="number"
                min="5"
                value={slotDuration}
                onChange={(e) => setSlotDuration(e.target.value)}
              />
            </label>
            <button type="submit">Update Slot</button>
          </form>
          {updateSlotMsg && <p className={updateSlotMsg.startsWith("Error") ? "staff-error" : "staff-success"}>{updateSlotMsg}</p>}
        </section>
      </div>
    </div>
  );
}
