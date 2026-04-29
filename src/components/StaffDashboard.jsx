import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabase"; 
import { viewFullQueue, updateQueueStatus } from "../queueApi";
import "./StaffDashboard.css";


// FIX: use API_BASE consistently for all fetch calls

const API_BASE = import.meta.env.VITE_API_BASE 
  || "https://queuecare-gubjeae9fqdzekfv.southafricanorth-01.azurewebsites.net";

const STATUS_OPTIONS = ["booked", "complete", "cancelled"];

const QUEUE_STATUS_OPTIONS = [
  { value: "waiting", label: "Waiting" },
  { value: "called", label: "In Consultation" },
  { value: "completed", label: "Completed" },
];

export default function StaffDashboard() {
  const navigate = useNavigate();

  const [facilityId, setFacilityId] = useState(null);
  const [facilityName, setFacilityName] = useState("");

  const [appointments, setAppointments] = useState([]);
  const [apptLoading, setApptLoading] = useState(true);
  const [apptError, setApptError] = useState("");
  const [updatingId, setUpdatingId] = useState(null);
  const [appointmentView, setAppointmentView] = useState("today");

  const [newSlotDate, setNewSlotDate] = useState("");
  const [newSlotTime, setNewSlotTime] = useState("");
  const [newSlotCapacity, setNewSlotCapacity] = useState("");
  const [newSlotDuration, setNewSlotDuration] = useState("");
  const [createSlotMsg, setCreateSlotMsg] = useState({ type: "", text: "" });
  const [creatingSlot, setCreatingSlot] = useState(false);

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

  const [queueList, setQueueList] = useState([]);
  const [queueLoading, setQueueLoading] = useState(false);

  const [patientName, setPatientName] = useState("");
  const [patientSurname, setPatientSurname] = useState("");
  const [patientPhone, setPatientPhone] = useState("");
  const [patientEmail, setPatientEmail] = useState("");
  const [patientSex, setPatientSex] = useState("");
  const [patientDob, setPatientDob] = useState("");
  const [patientIdNumber, setPatientIdNumber] = useState("");
  const [bookingReason, setBookingReason] = useState("");
  const [selectedSlotId, setSelectedSlotId] = useState("");
  const [bookingPatient, setBookingPatient] = useState(false);
  const [bookingMsg, setBookingMsg] = useState({ type: "", text: "" });
  const [addQueueContact, setAddQueueContact] = useState("");
  const [addingToQueue, setAddingToQueue] = useState(false);
  const [addQueueMsg, setAddQueueMsg] = useState({ type: "", text: "" });

  // Reschedule state
  const [rescheduleModalOpen, setRescheduleModalOpen] = useState(false);
  const [rescheduleAppointment, setRescheduleAppointment] = useState(null);
  const [rescheduleSlotId, setRescheduleSlotId] = useState("");
  const [rescheduling, setRescheduling] = useState(false);
  const [rescheduleMsg, setRescheduleMsg] = useState({ type: "", text: "" });

  function getTodayString() {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, "0");
    const day = String(now.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  }

  function formatDate(val) {
    if (!val) return "—";
    return new Date(val).toLocaleDateString("en-ZA", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  }

  function formatTime(val) {
    return val ? String(val).slice(0, 5) : "—";
  }

  function isUpcomingAppointment(slotDate) {
    if (!slotDate) return false;
    return slotDate >= getTodayString();
  }

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
        facility_id,
        appointment_slots(
          slot_date,
          slot_time,
          duration_minutes,
          facility_id
        ),
        profiles(name, surname, email, phone_number)
      `)
      .eq("facility_id", fId)
      .limit(100);

    setApptLoading(false);

    if (error) {
      setApptError(error.message);
      return;
    }

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

      const { data: assignment, error: assignError } = await supabase
        .from("staff_assignments")
        .select("facility_id, facilities(id, name)")
        .eq("profile_id", profile.id)
        .maybeSingle();

      if (assignError || !assignment?.facility_id) {
        setApptError(
          "You are not assigned to a facility yet. Please contact your admin."
        );
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

  // FIX: poll every 3s instead of 1s to avoid stacking requests
  useEffect(() => {
    if (!facilityId) return;

    let isFirstLoad = true;
    let polling = false;

    async function pollQueue() {
      // Guard: skip if previous request is still in flight
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

      if (isFirstLoad) {
        setQueueLoading(false);
        isFirstLoad = false;
      }

      polling = false;
    }

    pollQueue();
    const interval = setInterval(pollQueue, 3000);
    return () => clearInterval(interval);
  }, [facilityId]);

  // FIX: use API_BASE — was using relative URL which misses the backend port
  async function removeFromQueueSilent(contactDetails) {
    try {
      const res = await fetch(
        `${API_BASE}/queue/remove_queue?contact_details=${encodeURIComponent(contactDetails)}&facility_id=${facilityId}`,
        { method: "DELETE" }
      );
      const data = await res.json();
      if (data.error) {
        alert("Failed to remove: " + data.error);
        return;
      }
      setQueueList((prev) =>
        prev.filter(
          (e) =>
            e.profiles?.email !== contactDetails &&
            e.profiles?.phone_number !== contactDetails
        )
      );
    } catch (err) {
      alert("Failed to remove: " + err.message);
    }
  }

  async function handleQueueStatusUpdate(contactDetails, newStatus) {
    const result = await updateQueueStatus(contactDetails, facilityId, newStatus);

    if (result.error) {
      alert("Failed to update queue: " + result.error);
      return;
    }

    if (newStatus === "completed") {
      await removeFromQueueSilent(contactDetails);
      return;
    }

    setQueueList((prev) =>
      prev.map((entry) =>
        entry.profiles?.email === contactDetails ||
        entry.profiles?.phone_number === contactDetails
          ? { ...entry, status: newStatus }
          : entry
      )
    );
  }

  async function handleRemoveFromQueue(contactDetails) {
    if (!confirm("Remove this patient from the queue?")) return;
    await removeFromQueueSilent(contactDetails);
  }

  async function updateStatus(apptId, newStatus) {
    setUpdatingId(apptId);

    const { data, error } = await supabase
      .from("appointments")
      .update({ status: newStatus })
      .eq("id", apptId)
      .select();

    console.log("updateStatus result:", data, error);

    setUpdatingId(null);

    if (error) {
      alert("Failed to update: " + error.message);
      return;
    }

    setAppointments((prev) =>
      prev.map((a) => (a.id === apptId ? { ...a, status: newStatus } : a))
    );
  }

  async function handleBookForPatient(e) {
    e.preventDefault();
    setBookingMsg({ type: "", text: "" });
    setBookingPatient(true);

    const identity = JSON.parse(localStorage.getItem("userIdentity") || "{}");

    const { data, error } = await supabase.rpc("book_appointment_for_patient", {
      p_auth_provider: identity.auth_provider,
      p_provider_user_id: identity.provider_user_id,
      p_name: patientName,
      p_surname: patientSurname,
      p_phone_number: patientPhone,
      p_email: patientEmail,
      p_sex: patientSex,
      p_dob: patientDob || null,
      p_id_number: patientIdNumber,
      p_reason: bookingReason,
      p_slot_id: Number(selectedSlotId),
    });

    setBookingPatient(false);

    if (error) {
      setBookingMsg({
        type: "error",
        text: error.message || "Failed to book appointment.",
      });
      return;
    }

    if (data?.error) {
      setBookingMsg({ type: "error", text: data.error });
      return;
    }

    setBookingMsg({
      type: "success",
      text: data?.message || "Appointment booked successfully.",
    });

    setPatientName("");
    setPatientSurname("");
    setPatientPhone("");
    setPatientEmail("");
    setPatientSex("");
    setPatientDob("");
    setPatientIdNumber("");
    setBookingReason("");
    setSelectedSlotId("");

    if (facilityId) {
      fetchAppointments(facilityId);
      fetchSlots(facilityId);
    }
  }

  // FIX: use API_BASE — was using relative URL which misses the backend port
  async function handleAddToQueue(e) {
    e.preventDefault();
    setAddingToQueue(true);
    setAddQueueMsg({ type: "", text: "" });

    try {
      const res = await fetch(`${API_BASE}/queue/add_to_queue`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contact_details: addQueueContact,
          facility_id: facilityId,
        }),
      });
      const data = await res.json();
      console.log("add_to_queue response:", data);

      if (!res.ok || data.error) {
        setAddQueueMsg({
          type: "error",
          text: data.error || "Failed to add to queue.",
        });
      } else {
        setAddQueueMsg({ type: "success", text: "Patient added to queue." });
        setAddQueueContact("");
      }
    } catch (err) {
      setAddQueueMsg({ type: "error", text: err.message });
    }

    setAddingToQueue(false);
  }

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
      setCreateSlotMsg({ type: "error", text: data.error });
      return;
    }

    setCreateSlotMsg({
      type: "success",
      text: data?.message || "Slot created successfully.",
    });

    if (facilityId) fetchSlots(facilityId);

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
      setUpdateSlotMsg({ type: "error", text: data.error });
      return;
    }

    setUpdateSlotMsg({
      type: "success",
      text: data?.message || "Slot updated successfully.",
    });

    cancelEditSlot();
    if (facilityId) fetchSlots(facilityId);
  }

  // NEW: Open reschedule modal
  function openRescheduleModal(appointment) {
    setRescheduleAppointment(appointment);
    setRescheduleSlotId("");
    setRescheduleMsg({ type: "", text: "" });
    setRescheduleModalOpen(true);
  }

  // NEW: Close reschedule modal
  function closeRescheduleModal() {
    setRescheduleModalOpen(false);
    setRescheduleAppointment(null);
    setRescheduleSlotId("");
    setRescheduleMsg({ type: "", text: "" });
  }

  // NEW: Handle appointment reschedule
  async function handleRescheduleAppointment(e) {
    e.preventDefault();

    if (!rescheduleAppointment || !rescheduleSlotId) {
      setRescheduleMsg({
        type: "error",
        text: "Please select a new slot.",
      });
      return;
    }

    setRescheduling(true);
    setRescheduleMsg({ type: "", text: "" });

    try {
      const { data, error } = await supabase
        .from("appointments")
        .update({ slot_id: rescheduleSlotId })
        .eq("id", rescheduleAppointment.id)
        .select();

      if (error) {
        setRescheduleMsg({
          type: "error",
          text: error.message || "Failed to reschedule appointment.",
        });
        setRescheduling(false);
        return;
      }

      setRescheduleMsg({
        type: "success",
        text: "Appointment rescheduled successfully.",
      });

      // Refresh data
      if (facilityId) {
        await fetchAppointments(facilityId);
        await fetchSlots(facilityId);
      }

      // Close modal after short delay
      setTimeout(() => {
        closeRescheduleModal();
      }, 1500);
    } catch (err) {
      setRescheduleMsg({
        type: "error",
        text: err.message || "Failed to reschedule appointment.",
      });
    }

    setRescheduling(false);
  }

  const visibleAppointments = appointments.filter((a) => {
    const slotDate = a.appointment_slots?.slot_date;

    if (appointmentView === "today") {
      return slotDate === getTodayString();
    }

    if (appointmentView === "upcoming") {
      return (
        isUpcomingAppointment(slotDate) &&
        a.status !== "cancelled" &&
        a.status !== "complete"
      );
    }

    return true;
  });

  const availableSlotsForBooking = slots.filter(
    (slot) => (slot.total_capacity ?? 0) > (slot.booked_count ?? 0)
  );

  // NEW: Filter available slots for rescheduling (exclude current slot)
  const availableSlotsForRescheduling = slots.filter(
    (slot) =>
      (slot.total_capacity ?? 0) > (slot.booked_count ?? 0) &&
      slot.id !== rescheduleAppointment?.slot_id
  );

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

        <button
          className="staff-back-btn"
          onClick={() => navigate("/dashboard")}
        >
          ← Back
        </button>
      </header>

      <div className="staff-dash-grid">
        {/* Book Appointment For Patient */}
        <section className="staff-card">
          <h2>Book Appointment For Patient</h2>

          <form onSubmit={handleBookForPatient} className="staff-form">
            <label>
              Name
              <input
                type="text"
                value={patientName}
                onChange={(e) => setPatientName(e.target.value)}
                required
              />
            </label>

            <label>
              Surname
              <input
                type="text"
                value={patientSurname}
                onChange={(e) => setPatientSurname(e.target.value)}
                required
              />
            </label>

            <label>
              Phone Number
              <input
                type="text"
                value={patientPhone}
                onChange={(e) => setPatientPhone(e.target.value)}
              />
            </label>

            <label>
              Email
              <input
                type="email"
                value={patientEmail}
                onChange={(e) => setPatientEmail(e.target.value)}
              />
            </label>

            <label>
              ID Number
              <input
                type="text"
                value={patientIdNumber}
                onChange={(e) => setPatientIdNumber(e.target.value)}
              />
            </label>

            <label>
              Sex
              <select
                value={patientSex}
                onChange={(e) => setPatientSex(e.target.value)}
              >
                <option value="">Select sex</option>
                <option value="Male">Male</option>
                <option value="Female">Female</option>
              </select>
            </label>

            <label>
              Date of Birth
              <input
                type="date"
                value={patientDob}
                onChange={(e) => setPatientDob(e.target.value)}
              />
            </label>

            <label>
              Reason
              <input
                type="text"
                value={bookingReason}
                onChange={(e) => setBookingReason(e.target.value)}
                required
              />
            </label>

            <label>
              Select Slot
              <select
                value={selectedSlotId}
                onChange={(e) => setSelectedSlotId(e.target.value)}
                required
              >
                <option value="">Choose a slot</option>
                {availableSlotsForBooking.map((slot) => (
                  <option key={slot.id} value={slot.id}>
                    {formatDate(slot.slot_date)} - {formatTime(slot.slot_time)} (
                    {(slot.total_capacity ?? 0) - (slot.booked_count ?? 0)} available)
                  </option>
                ))}
              </select>
            </label>

            <button type="submit" disabled={bookingPatient || !facilityId}>
              {bookingPatient ? "Booking..." : "Book Appointment"}
            </button>
          </form>

          {bookingMsg.text && (
            <p
              className={
                bookingMsg.type === "error" ? "staff-error" : "staff-success"
              }
            >
              {bookingMsg.text}
            </p>
          )}
        </section>

        {/* Add Patient to Queue */}
        <section className="staff-card">
          <h2>Add Patient to Queue</h2>
          <form onSubmit={handleAddToQueue} className="staff-form">
            <label>
              Patient Email or Phone
              <input
                type="text"
                value={addQueueContact}
                onChange={(e) => setAddQueueContact(e.target.value)}
                placeholder="email@example.com or 0821234567"
                required
              />
            </label>
            <button type="submit" disabled={addingToQueue || !facilityId}>
              {addingToQueue ? "Adding..." : "Add to Queue"}
            </button>
          </form>
          {addQueueMsg.text && (
            <p
              className={
                addQueueMsg.type === "error" ? "staff-error" : "staff-success"
              }
            >
              {addQueueMsg.text}
            </p>
          )}
        </section>

        {/* Appointments Table */}
        <section className="staff-card" style={{ gridColumn: "1 / -1" }}>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: 16,
              gap: 12,
              flexWrap: "wrap",
            }}
          >
            <h2 style={{ margin: 0 }}>
              {appointmentView === "today"
                ? "Today's Appointments"
                : "Upcoming Appointments"}
            </h2>

            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              <button
                type="button"
                onClick={() => setAppointmentView("today")}
                style={{
                  padding: "10px 16px",
                  background: appointmentView === "today" ? "#1d4ed8" : "#2563eb",
                  color: "white",
                  border: "none",
                  borderRadius: "6px",
                  cursor: "pointer",
                  fontWeight: 600,
                }}
              >
                Today
              </button>

              <button
                type="button"
                onClick={() => setAppointmentView("upcoming")}
                style={{
                  padding: "10px 16px",
                  background:
                    appointmentView === "upcoming" ? "#15803d" : "#16a34a",
                  color: "white",
                  border: "none",
                  borderRadius: "6px",
                  cursor: "pointer",
                  fontWeight: 600,
                }}
              >
                View Upcoming
              </button>

              {facilityId && (
                <button
                  type="button"
                  onClick={() => fetchAppointments(facilityId)}
                  style={{
                    padding: "10px 16px",
                    background: "#111827",
                    color: "white",
                    border: "none",
                    borderRadius: "6px",
                    cursor: "pointer",
                    fontWeight: 600,
                  }}
                >
                  {apptLoading ? "Refreshing..." : "Refresh"}
                </button>
              )}
            </div>
          </div>

          {apptLoading && <p style={{ color: "#888" }}>Loading appointments...</p>}
          {apptError && <p className="staff-error">{apptError}</p>}

          {!apptLoading && !apptError && visibleAppointments.length === 0 && (
            <p style={{ color: "#888" }}>
              {appointmentView === "today"
                ? "No appointments found for today."
                : "No upcoming appointments found."}
            </p>
          )}

          {!apptLoading && visibleAppointments.length > 0 && (
            <div style={{ overflowX: "auto" }}>
              <table className="staff-table">
                <thead>
                  <tr>
                    <th>Patient</th>
                    <th>Email</th>
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
                  {visibleAppointments.map((a) => (
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
                        {a.status === "complete" || a.status === "cancelled" ? (
                          <span style={{ color: "#9ca3af", fontSize: 12 }}>—</span>
                        ) : (
                          <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
                            <button
                              type="button"
                              className="staff-action-btn"
                              style={{ fontSize: 11, padding: "3px 8px" }}
                              onClick={() => openRescheduleModal(a)}
                            >
                              Reschedule
                            </button>

                            {STATUS_OPTIONS.filter((s) => s !== a.status).map((s) => (
                              <button
                                key={s}
                                className="staff-back-btn"
                                style={{ fontSize: 11, padding: "3px 8px" }}
                                disabled={updatingId === a.id}
                                onClick={() => updateStatus(a.id, s)}
                              >
                                {updatingId === a.id ? "..." : s}
                              </button>
                            ))}
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        {/* Reschedule Modal */}
        {rescheduleModalOpen && rescheduleAppointment && (
          <section className="staff-card" style={{ gridColumn: "1 / -1" }}>
            <h2>Reschedule Appointment</h2>

            <div style={{ marginBottom: 16, padding: 12, background: "#f3f4f6", borderRadius: 6 }}>
              <p style={{ margin: "0 0 8px 0", fontWeight: 600 }}>Current Appointment:</p>
              <p style={{ margin: "0 0 4px 0", fontSize: 14 }}>
                <strong>Patient:</strong>{" "}
                {rescheduleAppointment.profiles?.name}{" "}
                {rescheduleAppointment.profiles?.surname}
              </p>
              <p style={{ margin: "0 0 4px 0", fontSize: 14 }}>
                <strong>Current Date & Time:</strong>{" "}
                {formatDate(rescheduleAppointment.appointment_slots?.slot_date)} at{" "}
                {formatTime(rescheduleAppointment.appointment_slots?.slot_time)}
              </p>
              <p style={{ margin: 0, fontSize: 14 }}>
                <strong>Reason:</strong> {rescheduleAppointment.reason || "—"}
              </p>
            </div>

            <form onSubmit={handleRescheduleAppointment} className="staff-form">
              <label>
                Select New Slot
                <select
                  value={rescheduleSlotId}
                  onChange={(e) => setRescheduleSlotId(e.target.value)}
                  required
                >
                  <option value="">Choose a new slot</option>
                  {availableSlotsForRescheduling.map((slot) => (
                    <option key={slot.id} value={slot.id}>
                      {formatDate(slot.slot_date)} - {formatTime(slot.slot_time)} (
                      {(slot.total_capacity ?? 0) - (slot.booked_count ?? 0)} available)
                    </option>
                  ))}
                </select>
              </label>

              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                <button type="submit" disabled={rescheduling}>
                  {rescheduling ? "Rescheduling..." : "Confirm Reschedule"}
                </button>

                <button
                  type="button"
                  className="staff-action-btn"
                  onClick={closeRescheduleModal}
                  disabled={rescheduling}
                >
                  Cancel
                </button>
              </div>
            </form>

            {rescheduleMsg.text && (
              <p
                className={
                  rescheduleMsg.type === "error"
                    ? "staff-error"
                    : "staff-success"
                }
              >
                {rescheduleMsg.text}
              </p>
            )}
          </section>
        )}

        {/* Live Patient Queue */}
        <section className="staff-card" style={{ gridColumn: "1 / -1" }}>
          <h2>Live Patient Queue</h2>

          {queueLoading && <p style={{ color: "#888" }}>Loading queue...</p>}

          {!queueLoading && queueList.length === 0 ? (
            <p style={{ color: "#888" }}>No patients currently in queue.</p>
          ) : (
            !queueLoading && (
              <div style={{ overflowX: "auto", minHeight: 220 }}>
                <table className="staff-table">
                  <thead>
                    <tr>
                      <th>Position</th>
                      <th>Patient</th>
                      <th>Reason</th>
                      <th>Slot Time</th>
                      <th>End Time</th>
                      <th>Status</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {queueList.map((entry, i) => {
                      const contact =
                        entry.profiles?.email || entry.profiles?.phone_number;
                      const status = entry.status;
                      const appt = Array.isArray(entry.appointments)
                        ? entry.appointments[0]
                        : entry.appointments;
                      const slot = appt?.appointment_slots;

                      return (
                        <tr key={entry.id || i}>
                          <td>{entry.position ?? "—"}</td>
                          <td>
                            {entry.profiles?.name} {entry.profiles?.surname}
                          </td>
                          <td>{appt?.reason || "—"}</td>
                          <td>{slot?.slot_time?.slice(0, 5) || "—"}</td>
                          <td>{slot?.end_time?.slice(0, 5) || "—"}</td>
                          <td>
                            <span
                              className={`staff-badge staff-badge-${String(
                                status || ""
                              )
                                .toLowerCase()
                                .replaceAll(" ", "-")}`}
                            >
                              {status}
                            </span>
                          </td>
                          <td style={{ minWidth: "220px" }}>
                            {status !== "completed" && (
                              <div
                                style={{ display: "flex", gap: 4, flexWrap: "wrap" }}
                              >
                                {QUEUE_STATUS_OPTIONS.filter(
                                  (o) => o.value !== status
                                ).map((option) => (
                                  <button
                                    key={option.value}
                                    className="staff-back-btn"
                                    style={{ fontSize: 11, padding: "3px 8px" }}
                                    onClick={() =>
                                      handleQueueStatusUpdate(contact, option.value)
                                    }
                                  >
                                    {option.label}
                                  </button>
                                ))}
                                <button
                                  className="staff-back-btn"
                                  style={{
                                    fontSize: 11,
                                    padding: "3px 8px",
                                    background: "#dc2626",
                                    color: "white",
                                  }}
                                  onClick={() => handleRemoveFromQueue(contact)}
                                >
                                  Remove
                                </button>
                              </div>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )
          )}
        </section>

        {/* Create New Appointment Slot */}
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
            <p
              className={
                createSlotMsg.type === "error" ? "staff-error" : "staff-success"
              }
            >
              {createSlotMsg.text}
            </p>
          )}

          {!facilityId && !apptLoading && (
            <p className="staff-error">
              No facility assigned — cannot create slots.
            </p>
          )}
        </section>

        {/* Available Appointment Slots */}
        <section className="staff-card" style={{ gridColumn: "1 / -1" }}>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: 16,
            }}
          >
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
                      <td>
                        {(slot.total_capacity ?? 0) - (slot.booked_count ?? 0)}
                      </td>
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
                <p
                  className={
                    updateSlotMsg.type === "error"
                      ? "staff-error"
                      : "staff-success"
                  }
                >
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