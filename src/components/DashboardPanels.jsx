import { FiCalendar, FiClock } from "react-icons/fi";
import { DAYS, CountdownTimer } from "./DashboardHelpers";

export function Badge({ status }) {
  const colorMap = {
    booked: "#16a34a",
    complete: "#2563eb",
    cancelled: "#dc2626",
    confirmed: "#7c3aed",
  };
  return (
    <mark style={{
      padding: "2px 8px", borderRadius: 6, fontSize: 12,
      background: colorMap[status] || "#6b7280", color: "white",
    }}>
      {status}
    </mark>
  );
}

// ── Queue Status Card ────────────────────────────────────────────────────────
function QueueCard({ queueData, slotDate, slotTime }) {
  if (!queueData || queueData.error) return null;

  // Appointment complete
  if (queueData.status === "complete" || queueData.status === "completed") {
    return (
      <article className="db-card" style={{ marginTop: 20, textAlign: "center", padding: "24px 16px" }}>
        <p style={{ fontSize: 40, margin: 0 }}>✅</p>
        <h3 style={{ margin: "12px 0 6px", color: "#14532d" }}>Appointment Complete</h3>
        <p style={{ color: "#6b7280", fontSize: 14 }}>Thank you for your visit. You're all done!</p>
      </article>
    );
  }

  // In consultation
  if (queueData.status === "called" || queueData.status === "In-consultation") {
    return (
      <article className="db-card" style={{ marginTop: 20, textAlign: "center", padding: "24px 16px" }}>
        <p style={{ fontSize: 40, margin: 0 }}>🩺</p>
        <h3 style={{ margin: "12px 0 6px", color: "#1e40af" }}>You're being seen now</h3>
        <p style={{ color: "#6b7280", fontSize: 14 }}>Please follow the nurse's instructions.</p>
      </article>
    );
  }

  // Normal waiting state
  return (
    <article className="db-card" style={{ marginTop: 20 }}>
      <header style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
        <h3 style={{ margin: 0 }}>Queue Status</h3>
        <mark style={{
          fontSize: 12, fontWeight: 600, textTransform: "uppercase",
          letterSpacing: "0.05em", padding: "3px 10px", borderRadius: 999,
          background: "#fef9c3", color: "#854d0e",
        }}>
          {queueData.status}
        </mark>
      </header>

      <section style={{ display: "flex", gap: 12, marginBottom: 16 }}>
        <aside style={{ flex: 1, background: "#f8fafc", borderRadius: 10, padding: "12px 16px" }}>
          <p style={{ margin: 0, fontSize: 12, color: "#64748b" }}>Position</p>
          <p style={{ margin: 0, fontSize: 28, fontWeight: 700, lineHeight: 1.2 }}>
            #{queueData.position}
          </p>
          <p style={{ margin: 0, fontSize: 12, color: "#94a3b8" }}>
            {queueData.patients_before_you === 0
              ? "You're next!"
              : `${queueData.patients_before_you} ahead of you`}
          </p>
        </aside>

        <aside style={{ flex: 1, background: "#f8fafc", borderRadius: 10, padding: "12px 16px" }}>
          <p style={{ margin: 0, fontSize: 12, color: "#64748b" }}>Est. Wait</p>
          <p style={{ margin: 0, fontSize: 28, fontWeight: 700, lineHeight: 1.2 }}>
            {queueData.time_until_appointment}
          </p>
          <p style={{ margin: 0, fontSize: 12, color: "#94a3b8" }}>
            {queueData.eta_minutes === 0
              ? "Being seen now"
              : `~${queueData.eta_minutes} min total`}
          </p>
        </aside>
      </section>

      {queueData.estimated_service_at && (
        <aside style={{
          background: "#eff6ff", borderRadius: 10, padding: "10px 14px",
          display: "flex", alignItems: "center", gap: 8, marginBottom: 12,
        }}>
          <i style={{ fontSize: 18 }}>🕐</i>
          <section>
            <p style={{ margin: 0, fontSize: 12, color: "#3b82f6", fontWeight: 600 }}>
              Estimated appointment time
            </p>
            <p style={{ margin: 0, fontSize: 14, fontWeight: 600, color: "#1e40af" }}>
              {new Date(queueData.estimated_service_at).toLocaleTimeString([], {
                hour: "2-digit", minute: "2-digit",
              })}
            </p>
          </section>
        </aside>
      )}

      {slotDate && slotTime && (
        <CountdownTimer slotDate={slotDate} slotTime={slotTime} />
      )}
    </article>
  );
}

// ── Overview Panel ────────────────────────────────────────────────────────────
export function OverviewPanel({
  profile, appointments, upcomingAppts = [], activeQueue, unreadCount,
  staffAssignments, latestAssignment, queueData, availability,
  availabilityStatus, savingAvailability, onSaveAvailability,
  onUpdateAvailabilityDay, onReschedule, onCancel, slotDate, slotTime, onJoinQueue, isAppointmentToday, lastClinic, onBookAgain,
}) {
  
  if (!profile) return null;

  return (
    <section className="db-section">
      <h2 className="db-section-title">Overview</h2>

      <ul className="db-stat-grid">
        <li className="db-stat-card db-stat-green">
          <strong className="db-stat-num">{upcomingAppts.length}</strong>
          <small className="db-stat-label">Upcoming</small>
        </li>
        <li className="db-stat-card db-stat-blue">
          <strong className="db-stat-num">{appointments.length}</strong>
          <small className="db-stat-label">Appointments</small>
        </li>
        <li className="db-stat-card db-stat-orange">
          <strong className="db-stat-num">
            {Array.isArray(activeQueue) ? activeQueue.length : 0}
          </strong>
          <small className="db-stat-label">In Queue</small>
        </li>
        <li className="db-stat-card db-stat-red">
          <strong className="db-stat-num">{unreadCount}</strong>
          <small className="db-stat-label">Notifications</small>
        </li>
      </ul>

      {profile.role === "patient" && isAppointmentToday && !activeQueue && (
          <button className="db-btn db-btn-primary" onClick={onJoinQueue}>
            Check In — Join Queue
          </button>
        )}
      {profile.role === "patient" && isAppointmentToday && activeQueue && (
          <p style={{ color: "#16a34a", fontWeight: 600 }}>
            ✅ You're checked in — Position #{queueData?.position}
          </p>
        )}

        {profile.role === "patient" && !isAppointmentToday && upcomingAppts.length > 0 && (
          <p style={{ color: "#6b7280", fontSize: 14 }}>
            ⏳ Check-in opens on the day of your appointment
          </p>
        )}
        {profile.role === "patient" && lastClinic && (
          <article className="db-card" style={{ marginTop: 20, display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
            <section>
              <p style={{ margin: 0, fontSize: 12, color: "#6b7280" }}>Last visited</p>
              <p style={{ margin: 0, fontWeight: 600 }}>{lastClinic.facilities?.name}</p>
              <p style={{ margin: 0, fontSize: 13, color: "#6b7280" }}>
                {lastClinic.facilities?.district}
              </p>
            </section>
            <button
              className="db-btn db-btn-reschedule"
              onClick={() => onBookAgain(lastClinic.facility_id)}
            >
              Book Again
            </button>
          </article>
        )}
      <QueueCard queueData={queueData} slotDate={slotDate} slotTime={slotTime} />

      {profile.role === "staff" && latestAssignment && (
        <article className="db-card" style={{ marginTop: 20 }}>
          <h3>Facility</h3>
          <p>{latestAssignment.facilities?.name}</p>
          <p>{latestAssignment.facilities?.district}</p>
        </article>
      )}

      {profile.role === "admin" && (
        <article className="db-card" style={{ marginTop: 20 }}>
          <p>Admin overview panel active</p>
        </article>
      )}
    </section>
  );
}

// ── Appointments Panel ────────────────────────────────────────────────────────
export function AppointmentsPanel({ appointments, onReschedule, onCancel }) {
  return (
    <section className="db-section">
      <h2 className="db-section-title">Appointments</h2>

      {appointments.length === 0 ? (
        <p>No appointments found.</p>
      ) : (
        appointments.map((appt) => {
          const isTerminal = appt.status === "complete" || appt.status === "cancelled";
          return (
            <article key={appt.id} className="db-card">
              <p>
                <FiCalendar /> {appt.appointment_slots?.slot_date}{" "}
                <FiClock /> {appt.appointment_slots?.slot_time?.slice(0, 5)}
              </p>
              <Badge status={appt.status} />
              {!isTerminal && (
                <footer style={{ display: "flex", gap: 10, marginTop: 8 }}>
                  <button onClick={() => onReschedule(appt)}>Reschedule</button>
                  <button onClick={() => onCancel(appt)}>Cancel</button>
                </footer>
              )}
            </article>
          );
        })
      )}
    </section>
  );
}

// ── Patient Queue Panel ───────────────────────────────────────────────────────
export function PatientQueuePanel({ queueData, slotDate, slotTime }) {
  return (
    <section className="db-section">
      <h2 className="db-section-title">My Queue</h2>
      {!queueData ? (
        <p>Not in queue.</p>
      ) : (
        <QueueCard queueData={queueData} slotDate={slotDate} slotTime={slotTime} />
      )}
    </section>
  );
}

// ── Notifications Panel ───────────────────────────────────────────────────────
export function NotificationsPanel({ notifications, unreadCount, onMarkAllRead }) {
  return (
    <section className="db-section">
      <h2 className="db-section-title">Notifications ({unreadCount} unread)</h2>
      <button onClick={onMarkAllRead} style={{ marginBottom: 16 }}>Mark all as read</button>
      {notifications.length === 0 ? (
        <p>No notifications.</p>
      ) : (
        notifications.map((n) => (
          <article key={n.id} className="db-card" style={{
            borderLeft: `4px solid ${n.is_read ? "#e5e7eb" : "#2563eb"}`,
            opacity: n.is_read ? 0.7 : 1,
          }}>
            <header style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8 }}>
              <p style={{ margin: 0, fontWeight: n.is_read ? 400 : 600 }}>{n.message}</p>
              {!n.is_read && (
                <mark style={{ background: "#2563eb", color: "white", borderRadius: 999, fontSize: 10, padding: "2px 7px", whiteSpace: "nowrap" }}>
                  New
                </mark>
              )}
            </header>
            {n.sent_at && (
              <p style={{ margin: "6px 0 0", fontSize: 12, color: "#9ca3af" }}>
                {new Date(n.sent_at).toLocaleString("en-ZA", {
                  day: "numeric", month: "short", year: "numeric",
                  hour: "2-digit", minute: "2-digit",
                })}
              </p>
            )}
          </article>
        ))
      )}
    </section>
  );
}

// ── Profile Panel ─────────────────────────────────────────────────────────────
export function ProfilePanel({
  profile, editProfile, editForm, savingProfile,
  onEdit, onCancel, onSave, onFormChange,
}) {
  if (!profile) return null;

  return (
    <section className="db-section">
      <h2 className="db-section-title">Profile</h2>
      {!editProfile ? (
        <article className="db-card">
          <p>Name: {profile.name}</p>
          <p>Surname: {profile.surname}</p>
          <p>Email: {profile.email}</p>
          <button onClick={onEdit}>Edit</button>
        </article>
      ) : (
        <article className="db-card">
          <input value={editForm.name} onChange={(e) => onFormChange("name", e.target.value)} placeholder="Name" />
          <input value={editForm.surname} onChange={(e) => onFormChange("surname", e.target.value)} placeholder="Surname" />
          <input value={editForm.phone_number} onChange={(e) => onFormChange("phone_number", e.target.value)} placeholder="Phone" />
          <button onClick={onSave} disabled={savingProfile}>Save</button>
          <button onClick={onCancel}>Cancel</button>
        </article>
      )}
    </section>
  );
}