import { useState, useEffect } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { supabase } from "#lib/supabase";  
 
import { onAuthStateChanged } from "firebase/auth";
import { auth } from "../firebase";
import { FiArrowLeft, FiClock, FiCheck, FiCalendar } from "react-icons/fi";
import "./BookAppointment.css"

const API_BASE = import.meta.env.VITE_API_BASE 
  || "https://queuecare-gubjeae9fqdzekfv.southafricanorth-01.azurewebsites.net";


export default function BookAppointment() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const clinicId = searchParams.get("id");
  const clinicName = searchParams.get("name");

  const [slots, setSlots] = useState([]);
  const [selectedSlotId, setSelectedSlotId] = useState(null);
  const [reason, setReason] = useState("");
  const [status, setStatus] = useState({
    type: "loading",
    message: "Loading available slots...",
  });
  const [booking, setBooking] = useState(null);
  const [patientId, setPatientId] = useState(null);
  const [profile, setProfile]   = useState(null);

  useEffect(() => {
    let unsub = null;

    async function resolveProfile() {
      const {
        data: { user: supabaseUser },
      } = await supabase.auth.getUser();

      unsub = onAuthStateChanged(auth, async (firebaseUser) => {
        const resolvedFirebaseUser = firebaseUser || auth.currentUser || null;

        const authProvider = supabaseUser
          ? "supabase"
          : resolvedFirebaseUser
          ? "firebase"
          : null;

        const providerUserId =
          supabaseUser?.id || resolvedFirebaseUser?.uid || null;

        if (!authProvider || !providerUserId) {
          setStatus({
            type: "error",
            message: "You must be signed in to book an appointment.",
          });
          return;
        }

        const { data: profile, error: profileError } = await supabase
          .from("profiles")
          .select("id, email, phone_number")
          .eq("auth_provider", authProvider)
          .eq("provider_user_id", providerUserId)
          .maybeSingle();

        if (profileError || !profile) {
          setStatus({
            type: "error",
            message: "Patient profile not found.",
          });
          return;
        }

        setPatientId(profile.id);
        setProfile(profile);
      });
    }

    resolveProfile();

    return () => {
      if (unsub) unsub();
    };
  }, []);

  useEffect(() => {
    if (!clinicId || !patientId) {
      if (!clinicId) {
        setStatus({ type: "error", message: "No clinic ID provided." });
      }
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
          setStatus({
            type: "error",
            message: "No available slots for this clinic.",
          });
          return;
        }
        const now = new Date();

        let available = data.filter((s) => {
      // Filter 1: slot must not be full
      const hasCapacity = (s.booked_count || 0) < (s.total_capacity || 1);

      // Filter 2: slot datetime must be in the future
      const slotDateTime = new Date(`${s.slot_date}T${s.slot_time}`);
      const isFuture = slotDateTime > now;

      return hasCapacity && isFuture;
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
          setStatus({
            type: "error",
            message: "No available slots for this clinic.",
          });
          return;
        }
        available.sort((a, b) => {
      const aDateTime = `${a.slot_date}T${a.slot_time}`;
      const bDateTime = `${b.slot_date}T${b.slot_time}`;
      return aDateTime.localeCompare(bDateTime);
    });
    
        setSlots(available);
        setStatus({
          type: "count",
          message: `${available.length} slot(s) available`,
        });
      } catch (err) {
        setStatus({ type: "error", message: err.message });
      }
    };

    fetchSlots();
  }, [clinicId, patientId]);

  const handleSelectSlot = (slotId) => {
    setSelectedSlotId(slotId);
  };

  async function handleBook() {
  if (!selectedSlotId) {
    setStatus({
      type: "error",
      message: "Please select a time slot first.",
    });
    return;
  }

  if (!reason.trim()) {
    setStatus({
      type: "error",
      message: "Please enter a reason for the appointment.",
    });
    return;
  }

  setStatus({ type: "loading", message: "Booking appointment..." });

  try {
    // ✅ Step 1: Book appointment
    const res = await fetch(`${API_BASE}/appointments/book`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        patient_id: patientId,
        facility_id: Number(clinicId),
        slot_id: selectedSlotId,
        reason: reason.trim(),
      }),
    });

    const data = await res.json();

    if (!res.ok) {
      throw new Error(data.error || "Booking failed.");
    }
   
    // ✅ Step 2: Update UI
    setBooking(data.appointment);
    setStatus({
      type: "success",
      message: "Appointment booked successfully",
    });

    fetch(`${API_BASE}/appointments/send-confirmation`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      patient_id: patientId,
      facility_id: Number(clinicId),
      slot_id: selectedSlotId,
      reason: reason.trim(),
    }),
  }).catch(err => console.warn("Confirmation email failed:", err.message));

  } 
  
  catch (err) {
    setStatus({
      type: "error",
      message: `Booking failed: ${err.message}`,
    });
  }
}
  

  const formatDate = (dateStr) => {
    if (!dateStr) return "N/A";
    const d = new Date(dateStr);
    return d.toLocaleDateString("en-ZA", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  const formatTime = (timeStr) => {
    if (!timeStr) return "N/A";
    return timeStr.slice(0, 5);
  };

  return (
    <>
    
      <div className="booking-module">
        <div className="container">
          <button className="back-btn" onClick={() => navigate(-1)}>
            <FiArrowLeft /> Back to search
          </button>

          <h2><FiCalendar /> Book Appointment</h2>
          <h3>{clinicName || "Unknown Clinic"}</h3>

          <div className={`status ${status.type}`}>{status.message}</div>

          {/* Booking confirmation */}
          {booking && (
            <div className="confirmation">
              <h3><FiCheck /> Appointment Confirmed</h3>
              <p><strong>Status:</strong> {booking.status}</p>
              <p><strong>Reason:</strong> {booking.reason}</p>
              <button onClick={() => navigate("/dashboard")}>
                Back to Dashboard
              </button>
            </div>
          )}

          {/* Slot selection */}
          {!booking && slots.length > 0 && (
            <>
              <div className="slots">
                <h4>Available Time Slots</h4>
                {slots.map((slot) => {
                  const isSelected = String(selectedSlotId) === String(slot.id);
                  return (
                    <div
                      key={slot.id}
                      className={`slot-card ${isSelected ? "selected" : ""}`}
                      onClick={() => handleSelectSlot(slot.id)}
                    >
                      <div className="slot-date">{formatDate(slot.slot_date)}</div>
                      <div className="slot-time">
                        <FiClock /> {formatTime(slot.slot_time)}
                      </div>
                      <div className="slot-meta">
                        {slot.duration_minutes ? `${slot.duration_minutes} min` : ""}
                        {slot.total_capacity
                          ? ` · ${slot.total_capacity - (slot.booked_count || 0)} spot${slot.total_capacity - (slot.booked_count || 0) !== 1 ? "s" : ""} left`
                          : ""}
                      </div>
                      {isSelected && (
                        <div className="slot-check">
                          <FiCheck /> Selected
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              <div className="reason-group">
                <label htmlFor="reason">Reason for visit</label>
                <textarea
                  id="reason"
                  placeholder="e.g. General checkup, Flu symptoms, Follow-up..."
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  rows={3}
                />
              </div>

              <button
                className="book-btn"
                onClick={handleBook}
                disabled={!selectedSlotId || !reason.trim()}
              >
                Confirm Booking
              </button>
            </>
          )}
        </div>
      </div>
    </>
  );
}