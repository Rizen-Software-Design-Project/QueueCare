import { useState, useEffect } from "react";
import { supabase } from "#lib/supabase";
import { Badge, formatDate, formatTime } from "./DashboardHelpers";
import "./AppointmentHistory.css";

// Appointments dated today or later that are still active
const UPCOMING_STATUSES = ["booked", "confirmed"];
// Appointments that are finished or past
const HISTORY_STATUSES  = ["complete", "cancelled", "no_show", "no-show"];
// Today's date string used to split upcoming vs past
const TODAY = new Date().toISOString().split("T")[0];

function isUpcoming(appt) {
  const status = (appt.status ?? "").toLowerCase();
  const date   = appt.appointment_slots?.slot_date ?? "";
  return UPCOMING_STATUSES.includes(status) && date >= TODAY;
}

function isHistory(appt) {
  const status = (appt.status ?? "").toLowerCase();
  const date   = appt.appointment_slots?.slot_date ?? "";
  return HISTORY_STATUSES.includes(status) || date < TODAY;
}

// Maps appointment status to a left-border accent colour on each card
function statusColor(status) {
  const map = {
    booked:    "#16a34a",
    confirmed: "#7c3aed",
    complete:  "#2563eb",
    cancelled: "#dc2626",
    no_show:   "#f59e0b",
    "no-show": "#f59e0b",
  };
  return map[(status ?? "").toLowerCase()] || "#9ca3af";
}

// ── Patient History View ──────────────────────────────────────────────────────
// Receives the already-loaded appointments array from PatientDashboard — no
// extra network request needed here.
export function PatientHistoryView({ appointments, onReschedule, onCancel }) {
  const [tab, setTab] = useState("upcoming");

  const upcoming = appointments.filter(isUpcoming);
  const history  = appointments.filter(isHistory);
  const list     = tab === "upcoming" ? upcoming : history;

  return (
    <div className="db-section">
      <h2 className="db-section-title">My Appointments</h2>

      <div className="ah-tabs">
        <button
          className={`ah-tab ${tab === "upcoming" ? "ah-tab-active" : ""}`}
          onClick={() => setTab("upcoming")}
        >
          Upcoming <span className="ah-tab-count">{upcoming.length}</span>
        </button>
        <button
          className={`ah-tab ${tab === "history" ? "ah-tab-active" : ""}`}
          onClick={() => setTab("history")}
        >
          History <span className="ah-tab-count">{history.length}</span>
        </button>
      </div>

      {list.length === 0 ? (
        <div className="ah-empty">
          <p>{tab === "upcoming" ? "No upcoming appointments." : "No appointment history yet."}</p>
        </div>
      ) : (
        list.map((appt) => (
          <PatientCard
            key={appt.id}
            appt={appt}
            isUpcoming={tab === "upcoming"}
            onReschedule={onReschedule}
            onCancel={onCancel}
          />
        ))
      )}
    </div>
  );
}

// Single appointment card for patient view
function PatientCard({ appt, isUpcoming, onReschedule, onCancel }) {
  const slot   = appt.appointment_slots;
  const clinic = slot?.facilities;
  // Only show action buttons for upcoming appointments that aren't already cancelled
  const canAct = isUpcoming && appt.status !== "cancelled";

  return (
    <div className="ah-card" style={{ borderLeftColor: statusColor(appt.status) }}>
      <div className="ah-card-top">
        <div>
          <div className="ah-card-clinic">{clinic?.name || "Unknown clinic"}</div>
          <div className="ah-card-meta">
            {clinic?.district && <span>{clinic.district}</span>}
            {clinic?.province && <span> · {clinic.province}</span>}
          </div>
        </div>
        <Badge status={appt.status} />
      </div>

      <div className="ah-card-datetime">
        📅 {formatDate(slot?.slot_date)} &nbsp; 🕐 {formatTime(slot?.slot_time)}
        {slot?.duration_minutes && (
          <span className="ah-card-duration"> · {slot.duration_minutes} min</span>
        )}
      </div>

      {appt.reason && (
        <div className="ah-card-reason">Reason: {appt.reason}</div>
      )}

      {canAct && (
        <div className="ah-card-actions">
          <button className="db-btn db-btn-reschedule" onClick={() => onReschedule(appt)}>
            Reschedule
          </button>
          <button className="db-btn db-btn-cancel" onClick={() => onCancel(appt)}>
            Cancel
          </button>
        </div>
      )}
    </div>
  );
}

// ── Staff History View ────────────────────────────────────────────────────────
// Fetches all appointments for the staff member's clinic from Supabase and
// splits them into upcoming / history tabs with a patient name search filter.
export function StaffHistoryView({ facilityId }) {
  const [appointments, setAppointments] = useState([]);
  const [loading,      setLoading]      = useState(true);
  const [tab,          setTab]          = useState("upcoming");
  const [search,       setSearch]       = useState("");

  useEffect(() => {
    if (!facilityId) { setLoading(false); return; }

    async function load() {
      const { data } = await supabase
        .from("appointments")
        .select(`
          *,
          appointment_slots!inner(slot_date, slot_time, duration_minutes, facility_id,
            facilities(name, district, province)),
          profiles!patient_id(name, surname, email, phone_number)
        `)
        .eq("appointment_slots.facility_id", facilityId)
        .order("booked_at", { ascending: false })
        .limit(200);

      setAppointments(data || []);
      setLoading(false);
    }

    load();
  }, [facilityId]);

  const upcoming = appointments.filter(isUpcoming);
  const history  = appointments.filter(isHistory);
  const base     = tab === "upcoming" ? upcoming : history;

  // Filter the visible list by the patient name / email search term
  const list = search.trim()
    ? base.filter((a) => {
        const q = search.toLowerCase();
        const p = a.profiles;
        return (
          p?.name?.toLowerCase().includes(q) ||
          p?.surname?.toLowerCase().includes(q) ||
          p?.email?.toLowerCase().includes(q)
        );
      })
    : base;

  if (loading) return <div className="db-section"><p>Loading appointments…</p></div>;

  if (!facilityId) {
    return (
      <div className="db-section">
        <p className="ah-empty">No clinic assignment found.</p>
      </div>
    );
  }

  return (
    <div className="db-section">
      <h2 className="db-section-title">Appointment History</h2>

      <div className="ah-tabs">
        <button
          className={`ah-tab ${tab === "upcoming" ? "ah-tab-active" : ""}`}
          onClick={() => setTab("upcoming")}
        >
          Upcoming <span className="ah-tab-count">{upcoming.length}</span>
        </button>
        <button
          className={`ah-tab ${tab === "history" ? "ah-tab-active" : ""}`}
          onClick={() => setTab("history")}
        >
          History <span className="ah-tab-count">{history.length}</span>
        </button>
      </div>

      <div className="ah-filters">
        <input
          className="ah-search"
          placeholder="Search by patient name or email…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        {search && (
          <button className="ah-clear" onClick={() => setSearch("")}>✕ Clear</button>
        )}
      </div>

      {list.length === 0 ? (
        <div className="ah-empty">
          <p>{tab === "upcoming" ? "No upcoming appointments." : "No appointment history."}</p>
        </div>
      ) : (
        list.map((appt) => <StaffCard key={appt.id} appt={appt} />)
      )}
    </div>
  );
}

// Single appointment card for staff view — shows patient details, no action buttons
function StaffCard({ appt }) {
  const slot    = appt.appointment_slots;
  const patient = appt.profiles;

  return (
    <div className="ah-card" style={{ borderLeftColor: statusColor(appt.status) }}>
      <div className="ah-card-top">
        <div>
          <div className="ah-card-patient">
            {patient?.name} {patient?.surname}
          </div>
          <div className="ah-card-patient-sub">
            {patient?.email}
            {patient?.phone_number ? ` · ${patient.phone_number}` : ""}
          </div>
        </div>
        <Badge status={appt.status} />
      </div>

      <div className="ah-card-datetime">
        📅 {formatDate(slot?.slot_date)} &nbsp; 🕐 {formatTime(slot?.slot_time)}
        {slot?.duration_minutes && (
          <span className="ah-card-duration"> · {slot.duration_minutes} min</span>
        )}
      </div>

      {appt.reason && (
        <div className="ah-card-reason">Reason: {appt.reason}</div>
      )}
    </div>
  );
}
