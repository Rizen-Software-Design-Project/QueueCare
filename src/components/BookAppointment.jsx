import { useState, useEffect } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { supabase } from "#lib/supabase";  
 
import { onAuthStateChanged } from "firebase/auth";
import { auth } from "../firebase";
import { addToQueue } from "../queueApi";
import { FiArrowLeft, FiClock, FiCheck, FiCalendar } from "react-icons/fi";


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
  const [profile,   setProfile]   = useState(null);

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

        let available = data.filter(
          (s) => (s.booked_count || 0) < (s.total_capacity || 1)
        );

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

    // ✅ Step 3: Add to queue (THIS is your integration)
    const contactDetails = profile?.email || profile?.phone_number;

    if (contactDetails && clinicId) {
      const queueResult = await addToQueue(contactDetails, clinicId);

      if (queueResult?.error) {
        console.warn("Queue add failed:", queueResult.error);
      }
    }

  } catch (err) {
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
      <style>{`
        /* ----- GLOBAL RESET & VARIABLES (scoped) ----- */
        .booking-module * {
          box-sizing: border-box;
          margin: 0;
        }
        .booking-module {
          --primary: #1B5E20;
          --primary-light: #2e7d32;
          --primary-dark: #0a3b0f;
          --gray-100: #f8f9fa;
          --gray-200: #e9ecef;
          --gray-300: #dee2e6;
          --gray-600: #6c757d;
          --gray-800: #212529;
          --shadow-sm: 0 1px 3px rgba(0,0,0,0.12), 0 1px 2px rgba(0,0,0,0.08);
          --shadow-md: 0 4px 6px rgba(0,0,0,0.05), 0 1px 3px rgba(0,0,0,0.1);
          --radius: 12px;
          --radius-sm: 8px;
          font-family: system-ui, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
          color: var(--gray-800);
        }

        .booking-module .container {
          max-width: 800px;
          margin: 2rem auto;
          padding: 1.5rem;
        }

        /* Back button */
        .booking-module .back-btn {
          display: inline-flex;
          align-items: center;
          gap: 0.5rem;
          background: none;
          border: 1px solid var(--gray-300);
          padding: 0.5rem 1rem;
          border-radius: var(--radius-sm);
          cursor: pointer;
          font-size: 0.9rem;
          margin-bottom: 1.5rem;
          transition: all 0.2s;
          color: var(--gray-800);
        }
        .booking-module .back-btn:hover {
          background: var(--gray-100);
          border-color: var(--primary);
        }

        /* Titles */
        .booking-module h2 {
          font-size: 1.8rem;
          font-weight: 600;
          margin-bottom: 0.25rem;
          color: var(--primary-dark);
          display: flex;
          align-items: center;
          gap: 0.5rem;
        }
        .booking-module h3 {
          font-size: 1.2rem;
          font-weight: 500;
          margin-bottom: 1.25rem;
          color: var(--gray-600);
        }

        /* Status messages */
        .booking-module .status {
          padding: 0.75rem 1rem;
          border-radius: var(--radius-sm);
          margin-bottom: 1.5rem;
          font-size: 0.9rem;
          font-weight: 500;
        }
        .booking-module .status.loading { background: #e3f2fd; color: #0d47a1; border-left: 4px solid #1976d2; }
        .booking-module .status.count { background: #e8f5e9; color: var(--primary-dark); border-left: 4px solid var(--primary); }
        .booking-module .status.error { background: #ffebee; color: #b71c1c; border-left: 4px solid #d32f2f; }
        .booking-module .status.success { background: #e8f5e9; color: var(--primary-dark); border-left: 4px solid var(--primary); font-weight: 600; }

        /* Slots section */
        .booking-module .slots {
          margin-bottom: 1.5rem;
        }
        .booking-module .slots h4 {
          font-size: 1.1rem;
          font-weight: 600;
          margin-bottom: 1rem;
        }

        /* Slot card */
        .booking-module .slot-card {
          border: 2px solid var(--gray-300);
          border-radius: var(--radius);
          padding: 1rem 1.25rem;
          margin-bottom: 0.75rem;
          cursor: pointer;
          transition: all 0.2s ease;
          background: white;
        }
        .booking-module .slot-card:hover {
          border-color: var(--primary);
          box-shadow: var(--shadow-sm);
          transform: translateY(-2px);
        }
        .booking-module .slot-card.selected {
          border-color: var(--primary);
          background: #e8f5e9;
          box-shadow: var(--shadow-sm);
        }
        .booking-module .slot-date {
          font-weight: 700;
          font-size: 1rem;
          color: var(--primary-dark);
        }
        .booking-module .slot-time {
          margin-top: 0.25rem;
          font-size: 0.95rem;
          display: flex;
          align-items: center;
          gap: 0.4rem;
          color: var(--gray-800);
        }
        .booking-module .slot-meta {
          margin-top: 0.4rem;
          font-size: 0.8rem;
          color: var(--gray-600);
        }
        .booking-module .slot-check {
          margin-top: 0.5rem;
          color: var(--primary);
          font-weight: 600;
          font-size: 0.85rem;
          display: flex;
          align-items: center;
          gap: 0.3rem;
        }

        /* Reason textarea */
        .booking-module .reason-group {
          margin-bottom: 1.5rem;
        }
        .booking-module .reason-group label {
          display: block;
          font-weight: 600;
          margin-bottom: 0.5rem;
        }
        .booking-module .reason-group textarea {
          width: 100%;
          padding: 0.75rem;
          border: 1px solid var(--gray-300);
          border-radius: var(--radius-sm);
          font-size: 0.95rem;
          font-family: inherit;
          resize: vertical;
          transition: 0.2s;
        }
        .booking-module .reason-group textarea:focus {
          outline: none;
          border-color: var(--primary);
          box-shadow: 0 0 0 3px rgba(27,94,32,0.2);
        }

        /* Book button */
        .booking-module .book-btn {
          width: 100%;
          padding: 0.85rem;
          background: var(--primary);
          color: white;
          font-size: 1rem;
          font-weight: 600;
          border: none;
          border-radius: var(--radius-sm);
          cursor: pointer;
          transition: all 0.2s;
          box-shadow: var(--shadow-sm);
        }
        .booking-module .book-btn:hover:not(:disabled) {
          background: var(--primary-light);
          transform: translateY(-1px);
        }
        .booking-module .book-btn:disabled {
          background: var(--gray-600);
          cursor: not-allowed;
          opacity: 0.7;
        }

        /* Confirmation card */
        .booking-module .confirmation {
          background: #e8f5e9;
          border: 2px solid var(--primary);
          border-radius: var(--radius);
          padding: 1.25rem;
          margin-bottom: 1.5rem;
        }
        .booking-module .confirmation h3 {
          color: var(--primary-dark);
          margin: 0 0 0.75rem;
          display: flex;
          align-items: center;
          gap: 0.5rem;
        }
        .booking-module .confirmation p {
          margin-bottom: 0.5rem;
        }
        .booking-module .confirmation button {
          margin-top: 1rem;
          padding: 0.6rem 1.25rem;
          background: var(--primary);
          color: white;
          border: none;
          border-radius: var(--radius-sm);
          cursor: pointer;
          font-size: 0.9rem;
          transition: background 0.2s;
        }
        .booking-module .confirmation button:hover {
          background: var(--primary-light);
        }

        @media (max-width: 640px) {
          .booking-module .container {
            padding: 1rem;
          }
          .booking-module h2 {
            font-size: 1.5rem;
          }
        }
      `}</style>

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