import { useState, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { supabase } from "#lib/supabase";
import { FiCalendar, FiClock, FiArrowLeft, FiFilter } from "react-icons/fi";
import { formatDate, formatTime, Badge } from "./DashboardHelpers";
import "./Dashboard.css";
import "./AppointmentHistory.css";

// TODAY is calculated once at module load time (YYYY-MM-DD format) so that
// all appointment date comparisons in this file use the same reference point.
const TODAY = new Date().toISOString().split("T")[0];

// Statuses that mean an appointment is still active and hasn't been resolved yet.
const UPCOMING_STATUSES  = ["booked", "confirmed"];
// Statuses that mean an appointment has been completed, cancelled, or missed.
const HISTORY_STATUSES   = ["complete", "cancelled", "no_show", "no-show"];

// Returns true when an appointment should appear in the Upcoming tab.
// Both conditions must be true: the status is still active AND the slot date
// is today or in the future. A fallback of "9999" treats missing dates as far-future.
function isUpcoming(appt) {
  return (
    UPCOMING_STATUSES.includes(appt.status) &&
    (appt.appointment_slots?.slot_date ?? "9999") >= TODAY
  );
}

// Returns true when an appointment should appear in the History tab.
// An appointment is historical if its status is terminal (complete/cancelled/no-show)
// OR if its slot date has already passed, even if the status wasn't updated.
function isHistory(appt) {
  return (
    HISTORY_STATUSES.includes(appt.status) ||
    (appt.appointment_slots?.slot_date ?? "9999") < TODAY
  );
}

// PatientHistoryView — rendered inside PatientDashboard when the user clicks
// the Appointments tab. Fetches this patient's own appointments from Supabase,
// then splits them into Upcoming and History tabs with an optional status filter.
// Receives onReschedule and onCancel callbacks from PatientDashboard so the
// existing reschedule modal and cancel logic are reused without duplication.
export function PatientHistoryView({ profile, onReschedule, onCancel }) {
  const [appointments, setAppointments] = useState([]);
  const [loading,      setLoading]      = useState(true);
  // "upcoming" or "history" — controls which list of appointments is displayed.
  const [tab,          setTab]          = useState("upcoming");
  // Status dropdown value; "all" means no filter is applied.
  const [statusFilter, setStatusFilter] = useState("all");

  // Fetch appointments once on mount (or if the patient's id changes).
  // Joins appointment_slots and facilities so date, time, and clinic name
  // are all available without a second query.
  useEffect(() => {
    async function load() {
      const { data } = await supabase
        .from("appointments")
        .select(`
          id, status, appointment_type, reason, booked_at, updated_at,
          appointment_slots(
            id, slot_date, slot_time, duration_minutes, facility_id,
            facilities(name, district, province)
          )
        `)
        .eq("patient_id", profile.id)
        .order("booked_at", { ascending: false })
        .limit(100);

      setAppointments(data || []);
      setLoading(false);
    }
    load();
  }, [profile.id]);

  // Split the full appointments array into two derived lists using the
  // isUpcoming / isHistory filter functions defined above.
  const upcoming = appointments.filter(isUpcoming);
  const history  = appointments.filter(isHistory);

  // Pick the list for the active tab, then apply the status dropdown filter on top.
  // This means counts in the tab badges always reflect the unfiltered total.
  const displayed = (tab === "upcoming" ? upcoming : history).filter(
    (a) => statusFilter === "all" || a.status === statusFilter
  );

  // Only show status options that are relevant to the current tab so the
  // dropdown never offers a filter that would return zero results.
  const statusOptions =
    tab === "upcoming"
      ? ["all", "booked", "confirmed"]
      : ["all", "complete", "cancelled", "no_show"];

  return (
    <div className="db-section">
      <h2 className="db-section-title">My Appointments</h2>

      {/* Switching tabs also resets the status filter so stale filter values
          from the previous tab don't carry over and hide results. */}
      <div className="ah-tabs">
        <button
          className={`ah-tab${tab === "upcoming" ? " ah-tab-active" : ""}`}
          onClick={() => { setTab("upcoming"); setStatusFilter("all"); }}
        >
          Upcoming <span className="ah-tab-count">{upcoming.length}</span>
        </button>
        <button
          className={`ah-tab${tab === "history" ? " ah-tab-active" : ""}`}
          onClick={() => { setTab("history"); setStatusFilter("all"); }}
        >
          History <span className="ah-tab-count">{history.length}</span>
        </button>
      </div>

      {/* Status dropdown — options change depending on the active tab so
          only relevant statuses are offered (e.g. booked/confirmed for Upcoming,
          complete/cancelled for History). The Clear button appears only when a
          specific filter is active, making it easy to reset. */}
      <div className="ah-filters">
        <FiFilter className="ah-filter-icon" />
        <select
          className="ah-select"
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
        >
          {statusOptions.map((s) => (
            <option key={s} value={s}>
              {s === "all" ? "All statuses" : s.charAt(0).toUpperCase() + s.slice(1).replace("_", " ")}
            </option>
          ))}
        </select>
        {statusFilter !== "all" && (
          <button className="ah-clear" onClick={() => setStatusFilter("all")}>
            ✕ Clear
          </button>
        )}
      </div>

      {/* Three possible render states:
          1. Still loading data from Supabase — show a loading message.
          2. No appointments match the current tab + filter — show an empty state.
          3. One or more appointments — render a card for each one. */}
      {loading ? (
        <p className="ah-loading">Loading appointments…</p>
      ) : displayed.length === 0 ? (
        <div className="ah-empty">
          <span className="ah-empty-icon">{tab === "upcoming" ? "📅" : "🗂️"}</span>
          <p>
            {tab === "upcoming"
              ? "No upcoming appointments. Book one from the clinic search."
              : "No appointment history yet."}
          </p>
        </div>
      ) : (
        <div className="ah-list">
          {displayed.map((appt) => (
            <AppointmentCard
              key={appt.id}
              appt={appt}
              isUpcoming={tab === "upcoming"}
              onReschedule={onReschedule}
              onCancel={onCancel}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// StaffHistoryView — shown when a staff member or admin navigates to
// /appointment-history from StaffDashboard. Instead of fetching a single
// patient's appointments, it loads ALL appointments for the staff member's
// assigned clinic (matched by facility_id) and joins patient profile data
// so the staff can see who each appointment belongs to.
// Also includes a live text search so staff can quickly find a specific patient.
function StaffHistoryView({ facilityId, facilityName }) {
  const [appointments, setAppointments] = useState([]);
  const [loading,      setLoading]      = useState(true);
  // "upcoming" or "history" — same tab logic as PatientHistoryView.
  const [tab,          setTab]          = useState("upcoming");
  // Status dropdown filter value.
  const [statusFilter, setStatusFilter] = useState("all");
  // Free-text search across patient name, email, and phone number.
  const [searchQuery,  setSearchQuery]  = useState("");

  // Skip the fetch entirely if no facility is assigned and stop loading.
  useEffect(() => {
    if (!facilityId) { setLoading(false); return; }

    async function load() {
      const { data } = await supabase
        .from("appointments")
        .select(`
          id, status, appointment_type, reason, booked_at, updated_at,
          appointment_slots(
            id, slot_date, slot_time, duration_minutes, facility_id
          ),
          profiles(name, surname, email, phone_number)
        `)
        .eq("facility_id", facilityId)
        .order("booked_at", { ascending: false })
        .limit(200);

      setAppointments(data || []);
      setLoading(false);
    }
    load();
  }, [facilityId]);

  // Same split logic as PatientHistoryView — divide all appointments into
  // upcoming (active status + future date) and history (terminal or past).
  const upcoming = appointments.filter(isUpcoming);
  const history  = appointments.filter(isHistory);

  // Status options are scoped to the active tab (same as patient view).
  const statusOptions =
    tab === "upcoming"
      ? ["all", "booked", "confirmed"]
      : ["all", "complete", "cancelled", "no_show"];

  // Start from the tab's list, then apply both the status filter AND the
  // text search. The search checks name, surname, email, and phone so staff
  // can locate a patient using whatever detail they have on hand.
  const base = tab === "upcoming" ? upcoming : history;

  const displayed = base.filter((a) => {
    const matchStatus = statusFilter === "all" || a.status === statusFilter;
    // If the search box is empty, only the status filter applies.
    if (!searchQuery.trim()) return matchStatus;

    const q = searchQuery.toLowerCase();
    const patient = a.profiles;
    // Match against any of the patient's identifiable fields.
    const matchName =
      patient?.name?.toLowerCase().includes(q) ||
      patient?.surname?.toLowerCase().includes(q) ||
      patient?.email?.toLowerCase().includes(q) ||
      patient?.phone_number?.includes(q);
    return matchStatus && matchName;
  });

  return (
    <div className="db-section">
      <h2 className="db-section-title">
        Clinic Appointments
        {facilityName && (
          <span style={{ fontWeight: 400, fontSize: 14, color: "var(--text-sub)", marginLeft: 8 }}>
            — {facilityName}
          </span>
        )}
      </h2>

      {/* Switching tabs resets both the status filter and the search query
          so results from the previous tab don't bleed into the new one. */}
      <div className="ah-tabs">
        <button
          className={`ah-tab${tab === "upcoming" ? " ah-tab-active" : ""}`}
          onClick={() => { setTab("upcoming"); setStatusFilter("all"); setSearchQuery(""); }}
        >
          Upcoming <span className="ah-tab-count">{upcoming.length}</span>
        </button>
        <button
          className={`ah-tab${tab === "history" ? " ah-tab-active" : ""}`}
          onClick={() => { setTab("history"); setStatusFilter("all"); setSearchQuery(""); }}
        >
          History <span className="ah-tab-count">{history.length}</span>
        </button>
      </div>

      {/* Status dropdown + patient search input side by side.
          The search field is only shown in the staff view since patients
          are always looking at their own appointments. */}
      <div className="ah-filters">
        <FiFilter className="ah-filter-icon" />
        <select
          className="ah-select"
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
        >
          {statusOptions.map((s) => (
            <option key={s} value={s}>
              {s === "all" ? "All statuses" : s.charAt(0).toUpperCase() + s.slice(1).replace("_", " ")}
            </option>
          ))}
        </select>
        <input
          type="text"
          className="ah-search"
          placeholder="Search patient name / email / phone…"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
      </div>

      {loading ? (
        <p className="ah-loading">Loading appointments…</p>
      ) : !facilityId ? (
        <p className="ah-loading">No facility assigned.</p>
      ) : displayed.length === 0 ? (
        <div className="ah-empty">
          <span className="ah-empty-icon">{tab === "upcoming" ? "📅" : "🗂️"}</span>
          <p>
            {tab === "upcoming"
              ? "No upcoming appointments for this clinic."
              : "No appointment history yet."}
          </p>
        </div>
      ) : (
        <div className="ah-list">
          {displayed.map((appt) => (
            <StaffAppointmentCard key={appt.id} appt={appt} isUpcoming={tab === "upcoming"} />
          ))}
        </div>
      )}
    </div>
  );
}

// AppointmentCard — renders a single appointment row in the patient view.
// Shows the slot date/time, clinic name, reason, and booking metadata.
// Reschedule and Cancel buttons are only shown when the appointment is
// upcoming AND not already cancelled — there's no point acting on past ones.
function AppointmentCard({ appt, isUpcoming, onReschedule, onCancel }) {
  // Pull the joined slot and facility data from the nested Supabase response.
  const slot    = appt.appointment_slots;
  const clinic  = slot?.facilities;
  // canAct controls whether action buttons are rendered for this card.
  const canAct  = isUpcoming && appt.status !== "cancelled";

  return (
    <div className="ah-card" style={{ borderLeftColor: statusColor(appt.status) }}>
      <div className="ah-card-top">
        <div className="ah-card-meta">
          <div className="ah-card-datetime">
            <FiCalendar />
            <span>{formatDate(slot?.slot_date)}</span>
            <FiClock />
            <span>{formatTime(slot?.slot_time)}</span>
            {slot?.duration_minutes && (
              <span className="ah-card-duration">({slot.duration_minutes} min)</span>
            )}
          </div>
          {clinic && (
            <p className="ah-card-clinic">
              📍 {clinic.name}{clinic.district && `, ${clinic.district}`}
            </p>
          )}
          {appt.reason && (
            <p className="ah-card-reason">Reason: {appt.reason}</p>
          )}
          <p className="ah-card-footer">
            Booked {formatDate(appt.booked_at)}
            {appt.appointment_type && ` · ${appt.appointment_type}`}
          </p>
        </div>
        <Badge status={appt.status} />
      </div>

      {canAct && (
        <div className="ah-card-actions">
          <button className="db-btn db-btn-reschedule" onClick={() => onReschedule(appt)}>
            Reschedule
          </button>
          <button className="db-btn db-btn-secondary" onClick={() => onCancel(appt)}>
            Cancel
          </button>
        </div>
      )}
    </div>
  );
}

// StaffAppointmentCard — same visual structure as AppointmentCard but tailored
// for the staff view. Instead of a clinic name it shows the patient's name,
// email, and phone number (joined from the profiles table in the Supabase query).
// No action buttons are shown — staff manage appointments through StaffClinicManagement.
function StaffAppointmentCard({ appt }) {
  // Pull the joined slot data and patient profile from the Supabase response.
  const slot    = appt.appointment_slots;
  const patient = appt.profiles;

  return (
    <div className="ah-card" style={{ borderLeftColor: statusColor(appt.status) }}>
      <div className="ah-card-top">
        <div className="ah-card-meta">
          <div className="ah-card-datetime">
            <FiCalendar />
            <span>{formatDate(slot?.slot_date)}</span>
            <FiClock />
            <span>{formatTime(slot?.slot_time)}</span>
            {slot?.duration_minutes && (
              <span className="ah-card-duration">({slot.duration_minutes} min)</span>
            )}
          </div>
          {patient && (
            <p className="ah-card-patient">
              👤 {patient.name} {patient.surname}
              {(patient.email || patient.phone_number) && (
                <span className="ah-card-patient-sub">
                  {patient.email && ` · ${patient.email}`}
                  {patient.phone_number && ` · ${patient.phone_number}`}
                </span>
              )}
            </p>
          )}
          {appt.reason && (
            <p className="ah-card-reason">Reason: {appt.reason}</p>
          )}
          <p className="ah-card-footer">
            Booked {formatDate(appt.booked_at)}
            {appt.appointment_type && ` · ${appt.appointment_type}`}
          </p>
        </div>
        <Badge status={appt.status} />
      </div>
    </div>
  );
}

// Maps an appointment status string to a hex colour used as the left-border
// accent on each card, giving an at-a-glance visual cue about the appointment state.
// Falls back to a neutral grey for any unknown/future status values.
function statusColor(status) {
  const map = {
    booked:    "#16a34a",
    confirmed: "#7c3aed",
    complete:  "#2563eb",
    cancelled: "#dc2626",
    no_show:   "#d97706",
    "no-show": "#d97706",
  };
  return map[status] || "#9ca3af";
}

// AppointmentHistory — the standalone page rendered at /appointment-history.
// It is reached from StaffDashboard (staff/admin role) which passes facilityId
// and facilityName through React Router state so the correct clinic's data loads.
// Patient-facing appointment history is rendered inline inside PatientDashboard
// via the exported PatientHistoryView component instead of this route, which
// avoids navigating away from the dashboard sidebar layout.
export default function AppointmentHistory() {
  const { state }  = useLocation();
  const navigate   = useNavigate();

  // Accept either a patient or staff profile passed via router state.
  // The role field on the profile determines which view to render.
  const profile      = state?.patient || state?.staff || null;
  const role         = profile?.role ?? "patient";
  // facilityId and facilityName are only relevant for the staff view.
  const facilityId   = state?.facilityId ?? null;
  const facilityName = state?.facilityName ?? "";

  // These are no-ops when not provided — PatientHistoryView handles its own
  // reschedule/cancel via callbacks from PatientDashboard when embedded there.
  const handleReschedule = state?.onReschedule ?? (() => {});
  const handleCancel     = state?.onCancel     ?? (() => {});

  if (!profile) {
    return (
      <div className="db-root ah-auth-wall">
        <div className="ah-auth-card">
          <span className="ah-auth-icon">🔒</span>
          <p>Please sign in to view appointment history.</p>
          <button className="db-btn db-btn-reschedule" onClick={() => navigate("/signin")}>
            Go to Sign In
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="db-root">
      <div className="ah-page">
        <button className="ah-back" onClick={() => navigate(-1)}>
          <FiArrowLeft /> Back
        </button>

        {role === "staff" || role === "admin" ? (
          <StaffHistoryView facilityId={facilityId} facilityName={facilityName} />
        ) : (
          <PatientHistoryView
            profile={profile}
            onReschedule={handleReschedule}
            onCancel={handleCancel}
          />
        )}
      </div>
    </div>
  );
}
