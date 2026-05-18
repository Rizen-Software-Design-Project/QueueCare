import { useState, useEffect } from "react";
import { supabase } from "#lib/supabase";
import { Badge, formatDate, formatTime } from "./DashboardHelpers";
import "./AppointmentHistory.css";

const UPCOMING_STATUSES = ["booked", "confirmed"];
const HISTORY_STATUSES  = ["complete", "cancelled", "no_show", "no-show"];
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
export function PatientHistoryView({ appointments, onReschedule, onCancel }) {
  const [tab, setTab] = useState("upcoming");

  const upcoming = appointments.filter(isUpcoming);
  const history  = appointments.filter(isHistory);
  const list     = tab === "upcoming" ? upcoming : history;

  return (
    <section className="db-section">
      <h2 className="db-section-title">My Appointments</h2>

      <nav className="ah-tabs" aria-label="Appointment tabs">
        <ul role="tablist">
          <li role="presentation">
            <button
              role="tab"
              aria-selected={tab === "upcoming"}
              aria-controls="tabpanel-upcoming"
              id="tab-upcoming"
              className={`ah-tab ${tab === "upcoming" ? "ah-tab-active" : ""}`}
              onClick={() => setTab("upcoming")}
            >
              Upcoming <section className="ah-tab-count">{upcoming.length}</section>
            </button>
          </li>
          <li role="presentation">
            <button
              role="tab"
              aria-selected={tab === "history"}
              aria-controls="tabpanel-history"
              id="tab-history"
              className={`ah-tab ${tab === "history" ? "ah-tab-active" : ""}`}
              onClick={() => setTab("history")}
            >
              History <section className="ah-tab-count">{history.length}</section>
            </button>
          </li>
        </ul>
      </nav>

      <section
        id="tabpanel-upcoming"
        role="tabpanel"
        aria-labelledby="tab-upcoming"
        hidden={tab !== "upcoming"}
      >
        {upcoming.length === 0 ? (
          <p className="ah-empty">No upcoming appointments.</p>
        ) : (
          <ul className="ah-list">
            {upcoming.map((appt) => (
              <li key={appt.id}>
                <PatientCard appt={appt} isUpcoming onReschedule={onReschedule} onCancel={onCancel} />
              </li>
            ))}
          </ul>
        )}
      </section>

      <section
        id="tabpanel-history"
        role="tabpanel"
        aria-labelledby="tab-history"
        hidden={tab !== "history"}
      >
        {history.length === 0 ? (
          <p className="ah-empty">No appointment history yet.</p>
        ) : (
          <ul className="ah-list">
            {history.map((appt) => (
              <li key={appt.id}>
                <PatientCard appt={appt} isUpcoming={false} onReschedule={onReschedule} onCancel={onCancel} />
              </li>
            ))}
          </ul>
        )}
      </section>
    </section>
  );
}

// Single appointment card for patient view
function PatientCard({ appt, isUpcoming, onReschedule, onCancel }) {
  const slot   = appt.appointment_slots;
  const clinic = slot?.facilities;
  const canAct = isUpcoming && appt.status !== "cancelled";

  return (
    <article className="ah-card" style={{ borderLeftColor: statusColor(appt.status) }}>
      <header className="ah-card-top">
        <section className="ah-card-clinic-info">
          <h3 className="ah-card-clinic">{clinic?.name || "Unknown clinic"}</h3>
          <section className="ah-card-meta">
            {clinic?.district && <section>{clinic.district}</section>}
            {clinic?.province && <section> · {clinic.province}</section>}
          </section>
        </section>
        <Badge status={appt.status} />
      </header>

      <section className="ah-card-datetime">
        📅 {formatDate(slot?.slot_date)} &nbsp; 🕐 {formatTime(slot?.slot_time)}
        {slot?.duration_minutes && (
          <section className="ah-card-duration"> · {slot.duration_minutes} min</section>
        )}
      </section>

      {appt.reason && (
        <p className="ah-card-reason">Reason: {appt.reason}</p>
      )}

      {canAct && (
        <menu className="ah-card-actions">
          <li>
            <button className="db-btn db-btn-reschedule" onClick={() => onReschedule(appt)}>
              Reschedule
            </button>
          </li>
          <li>
            <button className="db-btn db-btn-cancel" onClick={() => onCancel(appt)}>
              Cancel
            </button>
          </li>
        </menu>
      )}
    </article>
  );
}

// ── Staff History View ────────────────────────────────────────────────────────
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

  if (loading) return <section className="db-section"><p>Loading appointments…</p></section>;

  if (!facilityId) {
    return (
      <section className="db-section">
        <p className="ah-empty">No clinic assignment found.</p>
      </section>
    );
  }

  return (
    <section className="db-section">
      <h2 className="db-section-title">Appointment History</h2>

      <nav className="ah-tabs" aria-label="Appointment tabs">
        <ul role="tablist">
          <li role="presentation">
            <button
              role="tab"
              aria-selected={tab === "upcoming"}
              aria-controls="staff-tabpanel-upcoming"
              id="staff-tab-upcoming"
              className={`ah-tab ${tab === "upcoming" ? "ah-tab-active" : ""}`}
              onClick={() => setTab("upcoming")}
            >
              Upcoming <section className="ah-tab-count">{upcoming.length}</section>
            </button>
          </li>
          <li role="presentation">
            <button
              role="tab"
              aria-selected={tab === "history"}
              aria-controls="staff-tabpanel-history"
              id="staff-tab-history"
              className={`ah-tab ${tab === "history" ? "ah-tab-active" : ""}`}
              onClick={() => setTab("history")}
            >
              History <section className="ah-tab-count">{history.length}</section>
            </button>
          </li>
        </ul>
      </nav>

      <search className="ah-filters">
        <label htmlFor="patient-search" className="sr-only">Search by patient name or email</label>
        <input
          id="patient-search"
          className="ah-search"
          placeholder="Search by patient name or email…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        {search && (
          <button className="ah-clear" onClick={() => setSearch("")}>✕ Clear</button>
        )}
      </search>

      <section
        id="staff-tabpanel-upcoming"
        role="tabpanel"
        aria-labelledby="staff-tab-upcoming"
        hidden={tab !== "upcoming"}
      >
        {list.length === 0 ? (
          <p className="ah-empty">No upcoming appointments.</p>
        ) : (
          <ul className="ah-list">
            {list.map((appt) => (
              <li key={appt.id}><StaffCard appt={appt} /></li>
            ))}
          </ul>
        )}
      </section>

      <section
        id="staff-tabpanel-history"
        role="tabpanel"
        aria-labelledby="staff-tab-history"
        hidden={tab !== "history"}
      >
        {list.length === 0 ? (
          <p className="ah-empty">No appointment history.</p>
        ) : (
          <ul className="ah-list">
            {list.map((appt) => (
              <li key={appt.id}><StaffCard appt={appt} /></li>
            ))}
          </ul>
        )}
      </section>
    </section>
  );
}

// Single appointment card for staff view
function StaffCard({ appt }) {
  const slot    = appt.appointment_slots;
  const patient = appt.profiles;

  return (
    <article className="ah-card" style={{ borderLeftColor: statusColor(appt.status) }}>
      <header className="ah-card-top">
        <section className="ah-card-patient-info">
          <h3 className="ah-card-patient">
            {patient?.name} {patient?.surname}
          </h3>
          <p className="ah-card-patient-sub">
            {patient?.email}
            {patient?.phone_number ? ` · ${patient.phone_number}` : ""}
          </p>
        </section>
        <Badge status={appt.status} />
      </header>

      <section className="ah-card-datetime">
        📅 {formatDate(slot?.slot_date)} &nbsp; 🕐 {formatTime(slot?.slot_time)}
        {slot?.duration_minutes && (
          <section className="ah-card-duration"> · {slot.duration_minutes} min</section>
        )}
      </section>

      {appt.reason && (
        <p className="ah-card-reason">Reason: {appt.reason}</p>
      )}
    </article>
  );
}