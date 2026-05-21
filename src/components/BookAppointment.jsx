import { useState, useEffect } from "react";

import { supabase } from "#lib/supabase";  
 
import { onAuthStateChanged } from "firebase/auth";
import { auth } from "../firebase";
import { FiArrowLeft, FiClock, FiCheck, FiCalendar } from "react-icons/fi";
import "./BookAppointment.css"

const API_BASE = import.meta.env.VITE_API_BASE 
  || "https://queuecare-gubjeae9fqdzekfv.southafricanorth-01.azurewebsites.net";


export default function BookAppointment({ clinicId, onBack, onDone }) {
  
  const [clinicName, setClinicName] = useState("");

  const [slots, setSlots] = useState([]);
  const [selectedSlotId, setSelectedSlotId] = useState(null);
  const [reason, setReason] = useState("");
  const [status, setStatus] = useState({
    type: "loading",
    message: "Loading available slots...",
  });
  const [booking, setBooking] = useState(null);
  const [patientId, setPatientId] = useState(null);
  const [profile, setProfile] = useState(null);
  const [clinicDetails, setClinicDetails] = useState(null);

  const REASON_SUGGESTIONS = [
    "General Checkup", "Flu Symptoms", "Medication Refill", "Follow-up Visit",
    "Chronic Condition", "Headache", "Stomach Pain", "Vaccination",
    "Blood Pressure Check", "Family Planning",
  ];

  useEffect(() => {
    let unsub = null;

    async function resolveProfile() {
      const { data: { user: supabaseUser } } = await supabase.auth.getUser();

      unsub = onAuthStateChanged(auth, async (firebaseUser) => {
        const resolvedFirebaseUser = firebaseUser || auth.currentUser || null;
        const authProvider = supabaseUser ? "supabase" : resolvedFirebaseUser ? "firebase" : null;
        const providerUserId = supabaseUser?.id || resolvedFirebaseUser?.uid || null;

        if (!authProvider || !providerUserId) {
          setStatus({ type: "error", message: "You must be signed in to book an appointment." });
          return;
        }

        const { data: profile, error: profileError } = await supabase
          .from("profiles")
          .select("id, email, phone_number")
          .eq("auth_provider", authProvider)
          .eq("provider_user_id", providerUserId)
          .maybeSingle();

        if (profileError || !profile) {
          setStatus({ type: "error", message: "Patient profile not found." });
          return;
        }

        setPatientId(profile.id);
        setProfile(profile);
      });
    }

    resolveProfile();
    return () => { if (unsub) unsub(); };
  }, []);

  useEffect(() => {
    async function fetchClinicDetails() {
      const parsed = parseInt(String(clinicId), 10);
      if (!clinicId || isNaN(parsed) || parsed <= 0) { onBack?.(); return; }

      const { data, error } = await supabase
        .from("facilities")
        .select("id, name, facility_type, province, district, services_offered, operating_hours, is_active")
        .eq("id", parsed)
        .maybeSingle();

      
    if (error) { console.error("Clinic details error:", error); return; }
    if (!data || data.is_active === false) { onBack?.(); return; }

      setClinicName(data.name);
      setClinicDetails(data);
    }

    fetchClinicDetails();
  }, [clinicId]);

  useEffect(() => {
    if (!clinicId || !patientId) {
      if (!clinicId) setStatus({ type: "error", message: "No clinic ID provided." });
      return;
    }

    const fetchSlots = async () => {
      try {
        const { data, error } = await supabase
          .from("appointment_slots")
          .select("*")
          .eq("facility_id", Number(clinicId));

        if (error) throw new Error(error.message);

        if (!data || data.length === 0) {
          setSlots([]);
          setStatus({ type: "error", message: "No available slots for this clinic." });
          return;
        }

        const now = new Date();
        let available = data.filter((s) => {
          const hasCapacity = (s.booked_count || 0) < (s.total_capacity || 1);
          const slotDateTime = new Date(`${s.slot_date}T${s.slot_time}`);
          return hasCapacity && slotDateTime > now;
        });

        const { data: existing } = await supabase
          .from("appointments")
          .select("slot_id")
          .eq("patient_id", patientId)
          .eq("status", "booked");

        if (existing?.length) {
          const bookedSlotIds = new Set(existing.map((a) => a.slot_id));
          available = available.filter((s) => !bookedSlotIds.has(s.id));
        }

        if (available.length === 0) {
          setSlots([]);
          setStatus({ type: "error", message: "No available slots for this clinic." });
          return;
        }

        available.sort((a, b) =>
          `${a.slot_date}T${a.slot_time}`.localeCompare(`${b.slot_date}T${b.slot_time}`)
        );

        setSlots(available);
        setStatus({ type: "count", message: `${available.length} slot(s) available` });
      } catch (err) {
        setStatus({ type: "error", message: err.message });
      }
    };

    fetchSlots();
  }, [clinicId, patientId]);

  const handleSelectSlot = (slotId) => setSelectedSlotId(slotId);

  const handleSelectReason = (suggestion) => {
    const reasons = reason.split(",").map((r) => r.trim()).filter(Boolean);
    const alreadySelected = reasons.includes(suggestion);
    const updatedReasons = alreadySelected
      ? reasons.filter((r) => r !== suggestion)
      : [...reasons, suggestion];
    setReason(updatedReasons.join(", "));
  };

  async function handleBook() {
    if (!selectedSlotId) {
      setStatus({ type: "error", message: "Please select a time slot first." });
      return;
    }
    if (!reason.trim()) {
      setStatus({ type: "error", message: "Please enter a reason for the appointment." });
      return;
    }

    setStatus({ type: "loading", message: "Booking appointment..." });

    try {
      const res = await fetch(`${API_BASE}/appointments/book`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          patient_id:  patientId,
          facility_id: Number(clinicId),
          slot_id:     selectedSlotId,
          reason:      reason.trim(),
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Booking failed.");

      setBooking(data.appointment);
      setStatus({ type: "success", message: "Appointment booked successfully" });

      fetch(`${API_BASE}/appointments/send-confirmation`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          patient_id:  patientId,
          facility_id: Number(clinicId),
          slot_id:     selectedSlotId,
          reason:      reason.trim(),
        }),
      }).catch(err => console.warn("Confirmation email failed:", err.message));
    } catch (err) {
      setStatus({ type: "error", message: `Booking failed: ${err.message}` });
    }
  }

  const formatDate = (dateStr) => {
    if (!dateStr) return "N/A";
    return new Date(dateStr).toLocaleDateString("en-ZA", {
      weekday: "long", year: "numeric", month: "long", day: "numeric",
    });
  };

  const formatTime = (timeStr) => timeStr ? timeStr.slice(0, 5) : "N/A";

  const formatHours = (hours) => {
    if (!hours) return [];
    const days = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"];
    return days.map((day) => {
      const entry = hours[day];
      if (!entry) return { day, text: "Not listed" };
      if (entry.closed) return { day, text: "Closed" };
      return { day, text: entry.open && entry.close ? `${entry.open} - ${entry.close}` : "Not listed" };
    });
  };

  return (
    <main className="booking-module">
      <section className="container">
         <button className="back-btn" onClick={onBack}>
          <FiArrowLeft aria-hidden="true" /> Back to search
        </button>

        <h2><FiCalendar aria-hidden="true" /> Book Appointment</h2>
        <h3>{clinicName || "Unknown Clinic"}</h3>

        {clinicDetails && (
          <article className="booking-clinic-details">
            <header>
              <h4>{clinicDetails.name}</h4>
              <p>
                {clinicDetails.facility_type || "Clinic"} · {clinicDetails.district || "Unknown district"}
                {clinicDetails.province ? `, ${clinicDetails.province}` : ""}
              </p>
            </header>

            <section className="booking-clinic-section">
              <h5>Services offered</h5>
              {Array.isArray(clinicDetails.services_offered) && clinicDetails.services_offered.length > 0 ? (
                <ul className="booking-service-tags">
                  {clinicDetails.services_offered.map((service) => (
                    <li key={service} className="booking-service-tag">{service}</li>
                  ))}
                </ul>
              ) : (
                <p className="booking-muted">No services listed.</p>
              )}
            </section>

            <section className="booking-clinic-section">
              <h5>Operating hours</h5>
              <dl className="booking-hours-list">
                {formatHours(clinicDetails.operating_hours).map(({ day, text }) => (
                  <section key={day} className="booking-hour-row">
                    <dt>{day.charAt(0).toUpperCase() + day.slice(1)}</dt>
                    <dd>{text}</dd>
                  </section>
                ))}
              </dl>
            </section>
          </article>
        )}

        <p role="status" className={`status ${status.type}`}>{status.message}</p>

        {/* The confirmation screen shown after the patient successfully books an appointment */}
        {booking && (
          <section className="confirmation">
            <h3><FiCheck aria-hidden="true" /> Appointment Confirmed</h3>
            <p><strong>Status:</strong> {booking.status}</p>
            <p><strong>Reason:</strong> {booking.reason}</p>
           <button onClick={onDone}>Back to Dashboard</button>
          </section>
        )}

        {/* The screen where the patient picks a date and time slot for their appointment */}
        {!booking && slots.length > 0 && (
          <>
            <section className="slots">
              <h4>Available Time Slots</h4>
              <ul>
                {slots.map((slot) => {
                  const isSelected = String(selectedSlotId) === String(slot.id);
                  const spotsLeft = slot.total_capacity - (slot.booked_count || 0);
                  return (
                    <li key={slot.id}>
                      <article
                        className={`slot-card ${isSelected ? "selected" : ""}`}
                        onClick={() => handleSelectSlot(slot.id)}
                        aria-pressed={isSelected}
                        role="button"
                        tabIndex={0}
                        onKeyDown={(e) => e.key === "Enter" && handleSelectSlot(slot.id)}
                      >
                        <p className="slot-date">{formatDate(slot.slot_date)}</p>
                        <p className="slot-time">
                          <FiClock aria-hidden="true" /> {formatTime(slot.slot_time)}
                        </p>
                        <p className="slot-meta">
                          {slot.duration_minutes ? `${slot.duration_minutes} min` : ""}
                          {slot.total_capacity
                            ? ` · ${spotsLeft} spot${spotsLeft !== 1 ? "s" : ""} left`
                            : ""}
                        </p>
                        {isSelected && (
                          <p className="slot-check">
                            <FiCheck aria-hidden="true" /> Selected
                          </p>
                        )}
                      </article>
                    </li>
                  );
                })}
              </ul>
            </section>

            <section className="reason-group">
              <label htmlFor="reason">Reason for visit</label>
              <textarea
                id="reason"
                placeholder="e.g. General checkup, Flu symptoms, Follow-up..."
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                rows={3}
              />
              <ul className="reason-suggestions">
                {REASON_SUGGESTIONS.map((suggestion) => {
                  const isActive = reason.split(",").map((r) => r.trim()).includes(suggestion);
                  return (
                    <li key={suggestion}>
                      <button
                        type="button"
                        className={`reason-chip ${isActive ? "active" : ""}`}
                        aria-pressed={isActive}
                        onClick={() => handleSelectReason(suggestion)}
                      >
                        {suggestion}
                      </button>
                    </li>
                  );
                })}
              </ul>
            </section>

            <button
              className="book-btn"
              onClick={handleBook}
              disabled={!selectedSlotId || !reason.trim()}
            >
              Confirm Booking
            </button>
          </>
        )}
      </section>
    </main>
  );
}