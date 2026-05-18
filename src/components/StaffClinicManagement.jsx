import { useState, useEffect } from "react";
import { supabase } from "#lib/supabase";
import AIAssistant from "./AIAssistant";
import { viewFullQueue, updateQueueStatus } from "../queueApi";
import "./StaffClinicManagement.css";

const API_BASE = import.meta.env.VITE_API_BASE
  || "https://queuecare-gubjeae9fqdzekfv.southafricanorth-01.azurewebsites.net";

const STATUS_OPTIONS = ["booked", "confirmed", "complete", "cancelled", "no_show"];

const QUEUE_STATUS_OPTIONS = [
  { value: "waiting",   label: "Waiting" },
  { value: "called",    label: "In Consultation" },
  { value: "completed", label: "Completed" },
];

export default function StaffClinicManagement({ facilityId, facilityName, authProvider, providerUserId, queueOnly = false }) {
  const [appointments,    setAppointments]    = useState([]);
  const [apptLoading,     setApptLoading]     = useState(true);
  const [apptError,       setApptError]       = useState("");
  const [updatingId,      setUpdatingId]      = useState(null);
  const [appointmentView, setAppointmentView] = useState("today");

  const [createSlotMsg,   setCreateSlotMsg]   = useState({ type: "", text: "" });
  const [creatingSlot,    setCreatingSlot]    = useState(false);
  const [slotBatchDate,   setSlotBatchDate]   = useState("");
  const [slots,           setSlots]           = useState([]);
  const [slotsLoading,    setSlotsLoading]    = useState(false);
  const [slotsError,      setSlotsError]      = useState("");
  const [slotDateFilter,  setSlotDateFilter]  = useState("");
  const [deletingSlotId,  setDeletingSlotId]  = useState(null);
  const [editingSlotId,   setEditingSlotId]   = useState(null);
  const [editSlotDate,    setEditSlotDate]    = useState("");
  const [editSlotTime,    setEditSlotTime]    = useState("");
  const [editSlotCapacity,  setEditSlotCapacity]  = useState("");
  const [editSlotDuration,  setEditSlotDuration]  = useState("");
  const [updatingSlot,    setUpdatingSlot]    = useState(false);
  const [updateSlotMsg,   setUpdateSlotMsg]   = useState({ type: "", text: "" });
  const [showCreateSlots, setShowCreateSlots] = useState(false);
  const [queueList,       setQueueList]       = useState([]);
  const [queueLoading,    setQueueLoading]    = useState(false);

  const [rescheduleModalOpen,   setRescheduleModalOpen]   = useState(false);
  const [rescheduleAppointment, setRescheduleAppointment] = useState(null);
  const [rescheduleSlotId,      setRescheduleSlotId]      = useState("");
  const [rescheduling,          setRescheduling]          = useState(false);
  const [rescheduleMsg,         setRescheduleMsg]         = useState({ type: "", text: "" });

  const [slotBlocks, setSlotBlocks] = useState([
    { id: crypto.randomUUID(), label: "Morning",     start: "08:00", end: "12:00", duration: "15", capacity: "5", enabled: true  },
    { id: crypto.randomUUID(), label: "Lunch break", start: "12:00", end: "13:00", duration: "15", capacity: "0", enabled: false },
    { id: crypto.randomUUID(), label: "Afternoon",   start: "13:00", end: "16:00", duration: "30", capacity: "3", enabled: true  },
  ]);

  function getTodayString() {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
  }

  function formatDate(val) {
    if (!val) return "—";
    return new Date(val).toLocaleDateString("en-ZA", { day: "numeric", month: "short", year: "numeric" });
  }

  function formatTime(val) {
    return val ? String(val).slice(0, 5) : "—";
  }

  function isUpcomingAppointment(slotDate) {
    return slotDate ? slotDate >= getTodayString() : false;
  }

  function generateSlotTimes(start, end, durationMinutes) {
    const result = [];
    if (!start || !end || !durationMinutes) return result;
    const [startH, startM] = start.split(":").map(Number);
    const [endH, endM]     = end.split(":").map(Number);
    let current        = startH * 60 + startM;
    const endTotal     = endH * 60 + endM;
    const duration     = Number(durationMinutes);
    while (current + duration <= endTotal) {
      const h = String(Math.floor(current / 60)).padStart(2, "0");
      const m = String(current % 60).padStart(2, "0");
      result.push(`${h}:${m}`);
      current += duration;
    }
    return result;
  }

  function updateSlotBlock(id, field, value) {
    setSlotBlocks((prev) => prev.map((block) => block.id === id ? { ...block, [field]: value } : block));
  }

  function addSlotBlock() {
    setSlotBlocks((prev) => [...prev, { id: crypto.randomUUID(), label: "Custom block", start: "09:00", end: "10:00", duration: "15", capacity: "5", enabled: true }]);
  }

  function removeSlotBlock(id) {
    setSlotBlocks((prev) => prev.length === 1 ? prev : prev.filter((block) => block.id !== id));
  }

  function getDistributedSlotPreview() {
    return slotBlocks.flatMap((block) => {
      if (!block.enabled) return [];
      const capacity = parseInt(block.capacity, 10);
      const duration = parseInt(block.duration, 10);
      if (!block.start || !block.end || !capacity || !duration) return [];
      if (capacity < 1 || duration < 5) return [];
      return generateSlotTimes(block.start, block.end, duration).map((time) => ({
        time, capacity, duration, blockLabel: block.label,
      }));
    });
  }

  async function fetchAppointments(fId) {
    setApptLoading(true);
    setApptError("");
    const { data, error } = await supabase
      .from("appointments")
      .select(`id, status, reason, booked_at, patient_id, slot_id, facility_id,
        appointment_slots(slot_date, slot_time, duration_minutes, facility_id),
        profiles(name, surname, email, phone_number)`)
      .eq("facility_id", fId)
      .limit(100);
    setApptLoading(false);
    if (error) { setApptError(error.message); return; }
    const sorted = (data || []).sort((a, b) => {
      const aDateTime = `${a.appointment_slots?.slot_date || ""}T${a.appointment_slots?.slot_time || "00:00"}`;
      const bDateTime = `${b.appointment_slots?.slot_date || ""}T${b.appointment_slots?.slot_time || "00:00"}`;
      return new Date(aDateTime) - new Date(bDateTime);
    });
    setAppointments(sorted);
  }

  async function fetchSlots(fId) {
    setSlotsLoading(true);
    setSlotsError("");
    const { data, error } = await supabase
      .from("appointment_slots")
      .select("id, slot_date, slot_time, duration_minutes, total_capacity, booked_count, facility_id")
      .eq("facility_id", fId)
      .order("slot_date", { ascending: true })
      .order("slot_time", { ascending: true });
    setSlotsLoading(false);
    if (error) { setSlotsError(error.message); return; }
    const now = new Date();
    setSlots((data || []).filter((s) => new Date(`${s.slot_date}T${s.slot_time}`) > now));
  }

  async function handleCreateBatchSlots(e) {
    e.preventDefault();
    setCreateSlotMsg({ type: "", text: "" });
    if (!facilityId) { setCreateSlotMsg({ type: "error", text: "No facility assigned." }); return; }
    if (!slotBatchDate) { setCreateSlotMsg({ type: "error", text: "Please choose a date." }); return; }
    const slotsToCreate = getDistributedSlotPreview();
    if (slotsToCreate.length === 0) { setCreateSlotMsg({ type: "error", text: "No appointment slots generated. Enable at least one time block." }); return; }
    setCreatingSlot(true);
    let successCount = 0;
    let failedMessage = "";
    for (const slot of slotsToCreate) {
      const { data, error } = await supabase.rpc("create_appointment_slot", {
        p_auth_provider: authProvider, p_provider_user_id: providerUserId,
        p_facility_id: facilityId, p_slot_date: slotBatchDate, p_slot_time: slot.time,
        p_total_capacity: parseInt(slot.capacity, 10), p_duration_minutes: parseInt(slot.duration, 10),
      });
      if (error || data?.error) { failedMessage = error?.message || data?.error || "Some slots failed."; }
      else { successCount += 1; }
    }
    setCreatingSlot(false);
    if (successCount > 0) {
      setCreateSlotMsg({ type: "success", text: `${successCount} slot${successCount === 1 ? "" : "s"} created successfully.` });
      await fetchSlots(facilityId);
    } else {
      setCreateSlotMsg({ type: "error", text: failedMessage || "Failed to create slots." });
    }
  }

  useEffect(() => {
    if (!facilityId) return;
    void fetchAppointments(facilityId);
    void fetchSlots(facilityId);
  }, [facilityId]);

  useEffect(() => {
    if (!facilityId) return;
    let isFirstLoad = true;
    let polling = false;
    async function pollQueue() {
      if (polling) return;
      polling = true;
      if (isFirstLoad) setQueueLoading(true);
      const result = await viewFullQueue(facilityId);
      if (!result.error) {
        const nextQueue = result.data || [];
        setQueueList((prev) => {
          const prevJson = JSON.stringify(prev);
          const nextJson = JSON.stringify(nextQueue);
          return prevJson === nextJson ? prev : nextQueue;
        });
      }
      if (isFirstLoad) { setQueueLoading(false); isFirstLoad = false; }
      polling = false;
    }
    pollQueue();
    const interval = setInterval(pollQueue, 5000);
    return () => clearInterval(interval);
  }, [facilityId]);

  async function removeFromQueueSilent(contactDetails) {
    try {
      const res = await fetch(
        `${API_BASE}/queue/remove_queue?contact_details=${encodeURIComponent(contactDetails)}&facility_id=${facilityId}`,
        { method: "DELETE" }
      );
      const data = await res.json();
      if (data.error) { alert("Failed to remove: " + data.error); return; }
      setQueueList((prev) => prev.filter((e) => e.profiles?.email !== contactDetails && e.profiles?.phone_number !== contactDetails));
    } catch (err) {
      alert("Failed to remove: " + err.message);
    }
  }

  async function handleQueueStatusUpdate(contactDetails, newStatus) {
    const result = await updateQueueStatus(contactDetails, facilityId, newStatus);
    if (result.error) { alert("Failed to update queue: " + result.error); return; }
    const entry = queueList.find((e) => e.profiles?.email === contactDetails || e.profiles?.phone_number === contactDetails);
    if (entry?.patient_id) {
      fetch(`${API_BASE}/appointments/queue/send-status-email`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ patient_id: entry.patient_id, status: newStatus, facility_id: facilityId, position: entry.position }),
      }).catch(err => console.warn("Queue status email failed:", err.message));
    }
    if (newStatus === "completed") {
      const appt = Array.isArray(entry?.appointments) ? entry.appointments[0] : entry?.appointments;
      if (appt?.id) { await supabase.from("appointments").update({ status: "complete" }).eq("id", appt.id); }
      await removeFromQueueSilent(contactDetails);
      return;
    }
    setQueueList((prev) => prev.map((e) =>
      e.profiles?.email === contactDetails || e.profiles?.phone_number === contactDetails
        ? { ...e, status: newStatus } : e
    ));
  }

  async function handleRemoveFromQueue(contactDetails) {
    if (!confirm("Remove this patient from the queue?")) return;
    await removeFromQueueSilent(contactDetails);
  }

  async function updateStatus(apptId, newStatus) {
    setUpdatingId(apptId);
    const { error } = await supabase.from("appointments").update({ status: newStatus }).eq("id", apptId).select();
    setUpdatingId(null);
    if (error) { alert("Failed to update: " + error.message); return; }
    setAppointments((prev) => prev.map((a) => a.id === apptId ? { ...a, status: newStatus } : a));
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
    setEditingSlotId(null); setEditSlotDate(""); setEditSlotTime("");
    setEditSlotCapacity(""); setEditSlotDuration("");
    setUpdateSlotMsg({ type: "", text: "" });
  }

  async function handleDeleteSlot(slot) {
    if ((slot.booked_count ?? 0) > 0) { alert("This slot already has bookings, so it cannot be deleted."); return; }
    if (!confirm(`Delete slot on ${formatDate(slot.slot_date)} at ${formatTime(slot.slot_time)}?`)) return;
    setDeletingSlotId(slot.id);
    const { data, error } = await supabase.rpc("delete_appointment_slot_as_staff", {
      p_auth_provider: authProvider, p_provider_user_id: providerUserId, p_slot_id: slot.id,
    });
    setDeletingSlotId(null);
    if (error || data?.error) { alert("Failed to delete slot: " + (error?.message || data?.error)); return; }
    setSlots((prev) => prev.filter((s) => s.id !== slot.id));
  }

  async function handleUpdateSlot(slotId) {
    setUpdateSlotMsg({ type: "", text: "" });
    setUpdatingSlot(true);
    const { data, error } = await supabase.rpc("update_appointment_slot", {
      p_auth_provider: authProvider, p_provider_user_id: providerUserId,
      p_slot_id: slotId, p_slot_date: editSlotDate, p_slot_time: editSlotTime,
      p_total_capacity: parseInt(editSlotCapacity, 10), p_duration_minutes: parseInt(editSlotDuration, 10),
    });
    setUpdatingSlot(false);
    if (error) { setUpdateSlotMsg({ type: "error", text: error.message || "Failed to update slot." }); return; }
    if (data?.error) { setUpdateSlotMsg({ type: "error", text: data.error }); return; }
    setUpdateSlotMsg({ type: "success", text: data?.message || "Slot updated successfully." });
    cancelEditSlot();
    if (facilityId) fetchSlots(facilityId);
  }

  function openRescheduleModal(appointment) {
    setRescheduleAppointment(appointment); setRescheduleSlotId("");
    setRescheduleMsg({ type: "", text: "" }); setRescheduleModalOpen(true);
  }

  function closeRescheduleModal() {
    setRescheduleModalOpen(false); setRescheduleAppointment(null);
    setRescheduleSlotId(""); setRescheduleMsg({ type: "", text: "" });
  }

  async function handleRescheduleAppointment(e) {
    e.preventDefault();
    if (!rescheduleAppointment || !rescheduleSlotId) { setRescheduleMsg({ type: "error", text: "Please select a new slot." }); return; }
    setRescheduling(true);
    setRescheduleMsg({ type: "", text: "" });
    try {
      const { error } = await supabase.from("appointments").update({ slot_id: rescheduleSlotId }).eq("id", rescheduleAppointment.id).select();
      if (error) { setRescheduleMsg({ type: "error", text: error.message || "Failed to reschedule appointment." }); setRescheduling(false); return; }
      setRescheduleMsg({ type: "success", text: "Appointment rescheduled successfully." });
      if (facilityId) { await fetchAppointments(facilityId); await fetchSlots(facilityId); }
      setTimeout(() => closeRescheduleModal(), 1500);
    } catch (err) {
      setRescheduleMsg({ type: "error", text: err.message || "Failed to reschedule appointment." });
    }
    setRescheduling(false);
  }

  const visibleAppointments = appointments.filter((a) => {
    const slotDate = a.appointment_slots?.slot_date;
    if (appointmentView === "today")    return slotDate === getTodayString();
    if (appointmentView === "upcoming") return isUpcomingAppointment(slotDate) && a.status !== "cancelled" && a.status !== "complete" && a.status !== "no_show";
    return true;
  });

  const now = new Date();
  const availableSlotsForRescheduling = slots.filter((slot) => {
    const hasCapacity = (slot.total_capacity ?? 0) > (slot.booked_count ?? 0);
    const isFuture    = new Date(`${slot.slot_date}T${slot.slot_time}`) > now;
    const isDifferent = slot.id !== rescheduleAppointment?.slot_id;
    return hasCapacity && isFuture && isDifferent;
  });

  const distributedSlotPreview = getDistributedSlotPreview();
  const filteredSlots = slotDateFilter ? slots.filter((slot) => slot.slot_date === slotDateFilter) : slots;

  return (
    <main className="staff-dash">
      <header className="staff-dash-header">
        <hgroup>
          <h1>{queueOnly ? "Live Patient Queue" : "Staff Dashboard"}</h1>
          {facilityName && <p style={{ margin: 0, fontSize: 14, color: "#ccc" }}>📍 {facilityName}</p>}
        </hgroup>
      </header>

      <section className="staff-dash-grid">

        {/* Appointments Table */}
        {!queueOnly && (
          <section className="staff-card" style={{ gridColumn: "1 / -1" }}>
            <header style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16, gap: 12, flexWrap: "wrap" }}>
              <h2 style={{ margin: 0 }}>{appointmentView === "today" ? "Today's Appointments" : "Upcoming Appointments"}</h2>
              <menu style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                <button type="button" onClick={() => setAppointmentView("today")} style={{ padding: "10px 16px", background: appointmentView === "today" ? "#1d4ed8" : "#2563eb", color: "white", border: "none", borderRadius: "6px", cursor: "pointer", fontWeight: 600 }}>Today</button>
                <button type="button" onClick={() => setAppointmentView("upcoming")} style={{ padding: "10px 16px", background: appointmentView === "upcoming" ? "#15803d" : "#16a34a", color: "white", border: "none", borderRadius: "6px", cursor: "pointer", fontWeight: 600 }}>View Upcoming</button>
                {facilityId && <button type="button" onClick={() => fetchAppointments(facilityId)} style={{ padding: "10px 16px", background: "#111827", color: "white", border: "none", borderRadius: "6px", cursor: "pointer", fontWeight: 600 }}>{apptLoading ? "Refreshing..." : "Refresh"}</button>}
              </menu>
            </header>
            {apptLoading && <p style={{ color: "#888" }}>Loading appointments...</p>}
            {apptError && <p className="staff-error">{apptError}</p>}
            {!apptLoading && !apptError && visibleAppointments.length === 0 && <p style={{ color: "#888" }}>{appointmentView === "today" ? "No appointments found for today." : "No upcoming appointments found."}</p>}
            {!apptLoading && visibleAppointments.length > 0 && (
              <section style={{ overflowX: "auto" }}>
                <table className="staff-table">
                  <thead>
                    <tr><th>Patient</th><th>Email</th><th>Phone</th><th>Date</th><th>Time</th><th>Duration</th><th>Reason</th><th>Status</th><th>Actions</th></tr>
                  </thead>
                  <tbody>
                    {visibleAppointments.map((a) => (
                      <tr key={a.id}>
                        <td>{a.profiles?.name ? `${a.profiles.name} ${a.profiles.surname || ""}` : a.patient_id.slice(0, 8) + "…"}</td>
                        <td>{a.profiles?.email || "—"}</td>
                        <td>{a.profiles?.phone_number || "—"}</td>
                        <td>{formatDate(a.appointment_slots?.slot_date)}</td>
                        <td>{formatTime(a.appointment_slots?.slot_time)}</td>
                        <td>{a.appointment_slots?.duration_minutes ?? "—"} min</td>
                        <td>{a.reason || "—"}</td>
                        <td><mark className={`staff-badge staff-badge-${a.status}`}>{a.status}</mark></td>
                        <td>
                          {a.status === "complete" || a.status === "cancelled" || a.status === "no_show" ? (
                            <small style={{ color: "#9ca3af", fontSize: 12 }}>—</small>
                          ) : (
                            <menu style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
                              <button type="button" className="staff-action-btn" style={{ fontSize: 11, padding: "3px 8px" }} onClick={() => openRescheduleModal(a)}>Reschedule</button>
                              {STATUS_OPTIONS.filter((s) => s !== a.status).map((s) => (
                                <button key={s} className="staff-back-btn" style={{ fontSize: 11, padding: "3px 8px" }} disabled={updatingId === a.id} onClick={() => updateStatus(a.id, s)}>
                                  {updatingId === a.id ? "..." : s}
                                </button>
                              ))}
                            </menu>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </section>
            )}
          </section>
        )}

        {/* Reschedule Modal */}
        {!queueOnly && rescheduleModalOpen && rescheduleAppointment && (
          <section className="staff-card" style={{ gridColumn: "1 / -1" }}>
            <h2>Reschedule Appointment</h2>
            <aside style={{ marginBottom: 16, padding: 12, background: "#f3f4f6", borderRadius: 6 }}>
              <p style={{ margin: "0 0 8px 0", fontWeight: 600 }}>Current Appointment:</p>
              <p style={{ margin: "0 0 4px 0", fontSize: 14 }}><strong>Patient:</strong> {rescheduleAppointment.profiles?.name} {rescheduleAppointment.profiles?.surname}</p>
              <p style={{ margin: "0 0 4px 0", fontSize: 14 }}><strong>Current Date & Time:</strong> {formatDate(rescheduleAppointment.appointment_slots?.slot_date)} at {formatTime(rescheduleAppointment.appointment_slots?.slot_time)}</p>
              <p style={{ margin: 0, fontSize: 14 }}><strong>Reason:</strong> {rescheduleAppointment.reason || "—"}</p>
            </aside>
            <form onSubmit={handleRescheduleAppointment} className="staff-form">
              <label>
                Select New Slot
                <select value={rescheduleSlotId} onChange={(e) => setRescheduleSlotId(e.target.value)} required>
                  <option value="">Choose a new slot</option>
                  {availableSlotsForRescheduling.map((slot) => (
                    <option key={slot.id} value={slot.id}>
                      {formatDate(slot.slot_date)} - {formatTime(slot.slot_time)} ({(slot.total_capacity ?? 0) - (slot.booked_count ?? 0)} available)
                    </option>
                  ))}
                </select>
              </label>
              <menu style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                <button type="submit" disabled={rescheduling}>{rescheduling ? "Rescheduling..." : "Confirm Reschedule"}</button>
                <button type="button" className="staff-action-btn" onClick={closeRescheduleModal} disabled={rescheduling}>Cancel</button>
              </menu>
            </form>
            {rescheduleMsg.text && <p className={rescheduleMsg.type === "error" ? "staff-error" : "staff-success"}>{rescheduleMsg.text}</p>}
          </section>
        )}

        {/* Live Patient Queue — always shown */}
        <section className="staff-card" style={{ gridColumn: "1 / -1" }}>
          <h2>Live Patient Queue</h2>
          {queueLoading && <p style={{ color: "#888" }}>Loading queue...</p>}
          {!queueLoading && queueList.length === 0 ? (
            <p style={{ color: "#888" }}>No patients currently in queue.</p>
          ) : (
            !queueLoading && (
              <section style={{ overflowX: "auto", minHeight: 220 }}>
                <table className="staff-table">
                  <thead>
                    <tr><th>Position</th><th>Patient</th><th>Reason</th><th>Slot Time</th><th>End Time</th><th>Status</th><th>Actions</th></tr>
                  </thead>
                  <tbody>
                    {queueList.map((entry, i) => {
                      const contact = entry.profiles?.email || entry.profiles?.phone_number;
                      const status  = entry.status;
                      const appt    = Array.isArray(entry.appointments) ? entry.appointments[0] : entry.appointments;
                      const slot    = appt?.appointment_slots;
                      return (
                        <tr key={entry.id || i}>
                          <td>{entry.position ?? "—"}</td>
                          <td>{entry.profiles?.name} {entry.profiles?.surname}</td>
                          <td>{appt?.reason || "—"}</td>
                          <td>{slot?.slot_time?.slice(0, 5) || "—"}</td>
                          <td>{slot?.end_time?.slice(0, 5) || "—"}</td>
                          <td><mark className={`staff-badge staff-badge-${String(status || "").toLowerCase().replaceAll(" ", "-")}`}>{status}</mark></td>
                          <td style={{ minWidth: "220px" }}>
                            {status !== "completed" && (
                              <menu style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
                                {QUEUE_STATUS_OPTIONS.filter((o) => o.value !== status).map((option) => (
                                  <button key={option.value} className="staff-back-btn" style={{ fontSize: 11, padding: "3px 8px" }} onClick={() => handleQueueStatusUpdate(contact, option.value)}>{option.label}</button>
                                ))}
                                <button className="staff-back-btn" style={{ fontSize: 11, padding: "3px 8px", background: "#dc2626", color: "white" }} onClick={() => handleRemoveFromQueue(contact)}>Remove</button>
                              </menu>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </section>
            )
          )}
        </section>

        {/* Create Appointment Slots */}
        {!queueOnly && (
          <section className="staff-card" style={{ gridColumn: "1 / -1" }}>
            <header style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
              <hgroup>
                <h2 style={{ margin: 0 }}>Create Appointment Slots</h2>
                <p style={{ margin: "6px 0 0", color: "#6b7280", fontSize: 14 }}>Add distributed slots with breaks, lunch time, and custom capacity.</p>
              </hgroup>
              <button type="button" className="staff-action-btn" onClick={() => setShowCreateSlots((prev) => !prev)} style={{ fontSize: 20, width: 40, height: 40, borderRadius: "50%" }}>{showCreateSlots ? "−" : "+"}</button>
            </header>

            {showCreateSlots && (
              <>
                <form onSubmit={handleCreateBatchSlots} className="staff-form" style={{ marginTop: 18 }}>
                  <article className="slot-quick-card">
                    <h3>Slot distribution</h3>
                    <p>Create slots in blocks. Disable lunch or admin time so no appointments are created during breaks.</p>
                    <label>Date<input type="date" value={slotBatchDate} onChange={(e) => setSlotBatchDate(e.target.value)} required /></label>
                    <ul className="slot-blocks">
                      {slotBlocks.map((block) => (
                        <li key={block.id} className={`slot-block-row ${!block.enabled ? "disabled" : ""}`}>
                          <label>Block name<input type="text" value={block.label} onChange={(e) => updateSlotBlock(block.id, "label", e.target.value)} /></label>
                          <label>Start<input type="time" value={block.start} disabled={!block.enabled} onChange={(e) => updateSlotBlock(block.id, "start", e.target.value)} /></label>
                          <label>End<input type="time" value={block.end} disabled={!block.enabled} onChange={(e) => updateSlotBlock(block.id, "end", e.target.value)} /></label>
                          <label>Duration
                            <select value={block.duration} disabled={!block.enabled} onChange={(e) => updateSlotBlock(block.id, "duration", e.target.value)}>
                              <option value="10">10 min</option><option value="15">15 min</option><option value="20">20 min</option>
                              <option value="30">30 min</option><option value="45">45 min</option><option value="60">60 min</option>
                            </select>
                          </label>
                          <label>Capacity<input type="number" min="1" value={block.capacity} disabled={!block.enabled} onChange={(e) => updateSlotBlock(block.id, "capacity", e.target.value)} /></label>
                          <label className="slot-toggle"><input type="checkbox" checked={block.enabled} onChange={(e) => updateSlotBlock(block.id, "enabled", e.target.checked)} />Create slots</label>
                          <button type="button" className="staff-action-btn" onClick={() => removeSlotBlock(block.id)} disabled={slotBlocks.length === 1}>Remove</button>
                        </li>
                      ))}
                    </ul>
                    <button type="button" className="staff-action-btn" onClick={addSlotBlock}>+ Add time block</button>
                  </article>
                  <aside className="slot-preview">
                    <strong>Preview:</strong>
                    <ul className="slot-preview-list">
                      {distributedSlotPreview.map((slot) => (
                        <li key={`${slot.blockLabel}-${slot.time}`} className="slot-chip">{slot.time} · {slot.duration}min · cap {slot.capacity}</li>
                      ))}
                    </ul>
                    {distributedSlotPreview.length === 0 && <p style={{ color: "#888", marginTop: 8 }}>No slots will be created yet.</p>}
                  </aside>
                  <button type="submit" disabled={creatingSlot || !facilityId}>{creatingSlot ? "Creating slots..." : "Create Distributed Slots"}</button>
                </form>
                {createSlotMsg.text && <p className={createSlotMsg.type === "error" ? "staff-error" : "staff-success"}>{createSlotMsg.text}</p>}
              </>
            )}
          </section>
        )}

        {/* Available Slots */}
        {!queueOnly && (
          <section className="staff-card" style={{ gridColumn: "1 / -1" }}>
            <header style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16, gap: 12, flexWrap: "wrap" }}>
              <h2 style={{ margin: 0 }}>Available Appointment Slots</h2>
              <section style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
                <input type="date" className="slot-date-filter" value={slotDateFilter} onChange={(e) => setSlotDateFilter(e.target.value)} />
                {slotDateFilter && <button type="button" className="staff-action-btn" onClick={() => setSlotDateFilter("")}>Clear date</button>}
                {facilityId && <button className="staff-back-btn" onClick={() => fetchSlots(facilityId)} disabled={slotsLoading}>{slotsLoading ? "Refreshing..." : "↻ Refresh"}</button>}
              </section>
            </header>
            {slotsLoading && <p style={{ color: "#888" }}>Loading slots...</p>}
            {slotsError && <p className="staff-error">{slotsError}</p>}
            {!slotsLoading && !slotsError && filteredSlots.length === 0 && <p style={{ color: "#888" }}>No slots found for this facility.</p>}
            {!slotsLoading && filteredSlots.length > 0 && (
              <section style={{ overflowX: "auto" }}>
                <table className="staff-table">
                  <thead><tr><th>Date</th><th>Time</th><th>Duration</th><th>Capacity</th><th>Booked</th><th>Available</th><th>Actions</th></tr></thead>
                  <tbody>
                    {filteredSlots.map((slot) => (
                      <tr key={slot.id}>
                        <td>{formatDate(slot.slot_date)}</td>
                        <td>{formatTime(slot.slot_time)}</td>
                        <td>{slot.duration_minutes ?? "—"} min</td>
                        <td>{slot.total_capacity ?? 0}</td>
                        <td>{slot.booked_count ?? 0}</td>
                        <td>{(slot.total_capacity ?? 0) - (slot.booked_count ?? 0)}</td>
                        <td>
                          <menu style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                            <button type="button" className="staff-action-btn" onClick={() => startEditSlot(slot)}>Edit</button>
                            <button type="button" className="staff-action-btn" style={{ background: "#dc2626" }} disabled={deletingSlotId === slot.id || (slot.booked_count ?? 0) > 0} onClick={() => handleDeleteSlot(slot)} title={(slot.booked_count ?? 0) > 0 ? "Cannot delete booked slots" : "Delete slot"}>
                              {deletingSlotId === slot.id ? "Deleting..." : "Delete"}
                            </button>
                          </menu>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </section>
            )}
            {editingSlotId && (
              <section className="staff-card">
                <h2>Edit Slot</h2>
                <form onSubmit={(e) => { e.preventDefault(); handleUpdateSlot(editingSlotId); }} className="staff-form">
                  <label>Date<input type="date" value={editSlotDate} onChange={(e) => setEditSlotDate(e.target.value)} required /></label>
                  <label>Time<input type="time" value={editSlotTime} onChange={(e) => setEditSlotTime(e.target.value)} required /></label>
                  <label>Capacity<input type="number" min="1" value={editSlotCapacity} onChange={(e) => setEditSlotCapacity(e.target.value)} required /></label>
                  <label>Duration (min)<input type="number" min="5" value={editSlotDuration} onChange={(e) => setEditSlotDuration(e.target.value)} required /></label>
                  <menu style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                    <button type="submit" disabled={updatingSlot}>{updatingSlot ? "Saving..." : "Save Changes"}</button>
                    <button type="button" className="staff-action-btn" onClick={cancelEditSlot}>Cancel</button>
                  </menu>
                </form>
                {updateSlotMsg.text && <p className={updateSlotMsg.type === "error" ? "staff-error" : "staff-success"}>{updateSlotMsg.text}</p>}
              </section>
            )}
          </section>
        )}

      </section>

      <AIAssistant context={{ role: "staff", facilityId, facilityName, pageContext: "clinic management - appointments, queue, slots" }} />
    </main>
  );
}