import { useState, useEffect } from "react";
import { signOut } from "firebase/auth";
import { auth } from "../firebase";
import { supabase } from "#lib/supabase";
import { useNavigate } from "react-router-dom";
import { FiCalendar, FiClock, FiLogOut } from "react-icons/fi";
import { FaStethoscope } from "react-icons/fa";
import AIAssistant from "./AIAssistant";

import {
  PATIENT_NAV, formatDate, formatTime, playReminderSound, CountdownTimer,
} from "./DashboardHelpers";
import {
  OverviewPanel, AppointmentsPanel, PatientQueuePanel,
  NotificationsPanel, ProfilePanel,
} from "./DashboardPanels";
import { PatientHistoryView } from "./AppointmentHistory";
import { getMyQueue, removeFromQueue, addToQueue } from "../queueApi";
import "./Dashboard.css";
import ClinicSearch from "./Clinic_search.jsx";
import ServicePolicy from "./ServicePolicy.jsx";
import ProfilePage from "./ProfilePage.jsx";
import BookAppointment from "./BookAppointment.jsx";
import { Search } from "lucide-react";

const API_BASE =
  import.meta.env.VITE_API_BASE ||
  "https://queuecare-gubjeae9fqdzekfv.southafricanorth-01.azurewebsites.net";

function getSoonestActiveAppointment(appointments) {
  const today = new Date().toISOString().split("T")[0];
  return (
    appointments
      .filter(
        (a) =>
          (a.status === "booked" || a.status === "confirmed") &&
          a.appointment_slots?.slot_date >= today
      )
      .sort((a, b) =>
        (a.appointment_slots?.slot_date || "").localeCompare(
          b.appointment_slots?.slot_date || ""
        )
      )[0] || null
  );
}

export default function PatientDashboard({ profile: initialProfile }) {
  const navigate = useNavigate();

  const [profile,       setProfile]       = useState(initialProfile);
  const [appointments,  setAppointments]  = useState([]);
  const [queueHistory,  setQueueHistory]  = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount,   setUnreadCount]   = useState(0);
  const [activeTab,     setActiveTab]     = useState("overview");
  const [sidebarOpen,   setSidebarOpen]   = useState(false);
  const [queueData,     setQueueData]     = useState(null);
  const [reminderBanner, setReminderBanner] = useState(null);
  const [bookingClinicId, setBookingClinicId] = useState(null);

  
  const [rescheduleAppt,   setRescheduleAppt]   = useState(null);
  const [rescheduleSlots,  setRescheduleSlots]  = useState([]);
  const [rescheduleSlotId, setRescheduleSlotId] = useState(null);
  const [rescheduleLoading, setRescheduleLoading] = useState(false);

  // Load everything the patient needs when the dashboard first opens
  useEffect(() => {
    async function load() {
      const [{ data: appts }, { data: queueEntries }, { data: notif }] = await Promise.all([
        supabase
          .from("appointments")
          .select(`*, appointment_slots(slot_date, slot_time, duration_minutes, facility_id, facilities(name, district, province))`)
          .eq("patient_id", profile.id)
          .order("booked_at", { ascending: false })
          .limit(20),
        supabase
          .from("virtual_queues")
          .select("*")
          .eq("patient_id", profile.id)
          .order("joined_at", { ascending: false })
          .limit(10),
        supabase
           .from("notifications")
           .select("*")
           .eq("profile_id", profile.id)
           .eq("channel", "in_app")        // ← add this
           .order("sent_at", { ascending: false })
           .limit(30),
      ]);
      
      
      setAppointments(appts || []);
      setQueueHistory(queueEntries || []);
      setNotifications(notif || []);
      setUnreadCount((notif || []).filter((n) => !n.is_read).length);

      // Send a reminder email to the patient about today's appointments (only sent once per login)
      const reminderKey = `reminders_sent_${profile.id}_${new Date().toISOString().slice(0, 10)}`;
      if (!sessionStorage.getItem(reminderKey)) {
        sessionStorage.setItem(reminderKey, "true");
        fetch(`${API_BASE}/appointments/remind`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ patient_id: profile.id }),
        }).catch((err) => console.warn("Reminder email failed:", err.message));
      }

      // Check if the patient is already in a queue at a clinic
      const soonest = getSoonestActiveAppointment(appts || []);
      if (soonest) {
        const contact    = profile.email || profile.phone_number;
        const facilityId = soonest.appointment_slots?.facility_id || soonest.facility_id;
        if (contact && facilityId) {
          const qData = await getMyQueue(contact, facilityId);
          if (!qData.error) setQueueData(qData);
        }
      }
    }

    load();
  }, [profile.id]);

  // Keep checking the queue every 30 seconds so the patient always sees their real position
  useEffect(() => {
    const contact    = profile.email || profile.phone_number;
    const activeAppt = getSoonestActiveAppointment(appointments);
    if (!contact || !activeAppt) return;

    /* v8 ignore start */
    const facilityId = activeAppt.appointment_slots?.facility_id || activeAppt.facility_id;
    if (!facilityId) return;

    const interval = setInterval(async () => {
      const data = await getMyQueue(contact, facilityId);
      if (data.error) { clearInterval(interval); return; }
      setQueueData(data);
      if (data.status === "complete" || data.status === "completed") clearInterval(interval);
    }, 2000);

    return () => clearInterval(interval);
    /* v8 ignore stop */
  }, [profile, appointments]);

  // Show a reminder pop-up on screen if the patient has an appointment coming up soon
  const today        = new Date().toISOString().split("T")[0];
  const upcomingAppts = appointments.filter(
    (a) => a.status === "booked" && a.appointment_slots?.slot_date >= today
  );

  useEffect(() => {
    if (upcomingAppts.length === 0) return;

    /* v8 ignore start */
    function checkReminders() {
      const now = Date.now();
      for (const appt of upcomingAppts) {
        const slotDate = appt.appointment_slots?.slot_date;
        const slotTime = appt.appointment_slots?.slot_time;
        if (!slotDate || !slotTime) continue;

        const diffMinutes = (new Date(`${slotDate}T${slotTime}`).getTime() - now) / 60000;
        const key30 = `reminder_30_${appt.id}`;
        const key5  = `reminder_5_${appt.id}`;

        if (diffMinutes <= 30 && diffMinutes > 5 && !sessionStorage.getItem(key30)) {
          sessionStorage.setItem(key30, "true");
          playReminderSound(false);
          setReminderBanner({ apptId: appt.id, minutes: 30, clinic: appt.appointment_slots?.facilities?.name || "your clinic", time: formatTime(slotTime) });
          return;
        }
        if (diffMinutes <= 5 && diffMinutes >= 0 && !sessionStorage.getItem(key5)) {
          sessionStorage.setItem(key5, "true");
          playReminderSound(true);
          setReminderBanner({ apptId: appt.id, minutes: 5, clinic: appt.appointment_slots?.facilities?.name || "your clinic", time: formatTime(slotTime) });
          return;
        }
      }
    }

    checkReminders();
    const interval = setInterval(checkReminders, 30000);
    return () => clearInterval(interval);
    /* v8 ignore stop */
  }, [upcomingAppts]);

  // Things the patient can do - like leaving the queue or logging out
  async function handleLogout() {
    await Promise.allSettled([supabase.auth.signOut(), signOut(auth)]);
    localStorage.removeItem("userIdentity");
    navigate("/signin");
  }

  async function markAllRead() {
    await supabase.from("notifications").update({ is_read: true }).eq("profile_id", profile.id);
    setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
    setUnreadCount(0);
  }


  async function cancelAppointment(appt) {
    if (!confirm("Are you sure you want to cancel this appointment?")) return;
    /* v8 ignore start */
    const res  = await fetch(`${API_BASE}/appointments/${appt.id}/cancel`, {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ patient_id: profile.id }),
    });
    const data = await res.json();
    if (!res.ok) { alert("Failed to cancel: " + (data.error || "Unknown error")); return; }

    setAppointments((prev) => prev.map((a) => a.id === appt.id ? { ...a, status: "cancelled" } : a));

    const activeAppt = getSoonestActiveAppointment(appointments);
    if (activeAppt?.id === appt.id) {
      const contact    = profile.email || profile.phone_number;
      const facilityId = appt.appointment_slots?.facility_id;
      if (contact && facilityId) { await removeFromQueue(contact, facilityId); setQueueData(null); }
    }
    /* v8 ignore stop */
  }

  /* v8 ignore start */
  async function openReschedule(appt) {
    setRescheduleAppt(appt);
    setRescheduleSlotId(null);
    setRescheduleLoading(true);
    const facilityId = appt.appointment_slots?.facility_id;
    if (!facilityId) { alert("Cannot determine facility."); setRescheduleLoading(false); return; }
    const { data: allSlots } = await supabase.from("appointment_slots").select("*").eq("facility_id", facilityId);
    setRescheduleSlots((allSlots || []).filter((s) => s.id !== appt.slot_id && (s.booked_count || 0) < (s.total_capacity || 1)));
    setRescheduleLoading(false);
  }

  async function confirmReschedule() {
    if (!rescheduleSlotId || !rescheduleAppt) return;
    setRescheduleLoading(true);
    const res  = await fetch(`${API_BASE}/appointments/${rescheduleAppt.id}/reschedule`, {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ patient_id: profile.id, new_slot_id: rescheduleSlotId }),
    });
    const data = await res.json();
    if (!res.ok) { alert("Reschedule failed: " + (data.error || "Unknown error")); setRescheduleLoading(false); return; }

    const { data: updatedSlot } = await supabase
      .from("appointment_slots")
      .select("slot_date, slot_time, duration_minutes, facility_id, facilities(name, district, province)")
      .eq("id", rescheduleSlotId)
      .single();

    setAppointments((prev) =>
      prev.map((a) => a.id === rescheduleAppt.id ? { ...a, slot_id: rescheduleSlotId, appointment_slots: updatedSlot } : a)
    );
    setRescheduleAppt(null); setRescheduleSlots([]); setRescheduleSlotId(null);
    setRescheduleLoading(false);
  }

  async function joinQueue() {
    const contact    = profile.email || profile.phone_number;
    const bookedAppt = getSoonestActiveAppointment(appointments);
    if (!bookedAppt) { alert("No active upcoming appointment found."); return; }
    const facilityId = bookedAppt.appointment_slots?.facility_id || bookedAppt.facility_id;
    if (!contact || !facilityId) { alert("Missing details to join queue."); return; }

    const res = await addToQueue(contact, facilityId);
    if (res.error) { alert(res.error); return; }

    const updated = await getMyQueue(contact, facilityId);
    if (!updated.error) setQueueData(updated);

    fetch(`${API_BASE}/appointments/queue/send-status-email`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ patient_id: profile.id, status: "waiting", facility_id: facilityId, position: updated.position }),
    }).catch((err) => console.warn("Join queue email failed:", err.message));
  }
  /* v8 ignore stop */

  // Calculate some useful numbers from the data we already loaded
  const bookedAppt       = getSoonestActiveAppointment(appointments);
  const activeQueue      = queueData?.data || null;
  const isAppointmentToday = bookedAppt?.appointment_slots?.slot_date === today;

  const lastClinic = appointments.find(
  (a) => a.appointment_slots?.facility_id && a.appointment_slots?.facilities?.name)?.appointment_slots ?? null;

  // Decide which section to show based on which menu tab the patient clicked
  function goTo(id) {
  
  setSidebarOpen(false);
  setActiveTab(id);
  if (id !== "book") setBookingClinicId(null);
  }



  function renderContent() {
    const sharedProps = {
      profile, appointments, upcomingAppts, activeQueue, unreadCount,
      queueData, onReschedule: openReschedule, onCancel: cancelAppointment,
      onJoinQueue: joinQueue, isAppointmentToday,
      slotDate: bookedAppt?.appointment_slots?.slot_date || null,
      slotTime: bookedAppt?.appointment_slots?.slot_time || null,
      lastClinic, 
      onBookAgain: (id) => { setBookingClinicId(id); setActiveTab("book"); },
    };

    switch (activeTab) {
      case "overview":
        return (
            <>
            <OverviewPanel {...sharedProps} />
            <article className="db-card" style={{ marginTop: 20 }}>
                <p style={{ color: "#6b7280", marginBottom: 16 }}>Quick Actions</p>
                <footer style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                <button className="db-btn db-btn-reschedule" onClick={() => goTo("appointments")}>
                    My Appointments
                </button>
                <button className="db-btn db-btn-reschedule" onClick={() => goTo("find-clinic")}>
                    Find a Clinic
                </button>
                </footer>
            </article>
            </>
        );
      case "appointments":  return <PatientHistoryView appointments={appointments} onReschedule={openReschedule} onCancel={cancelAppointment} />;
      case "queue":         return <PatientQueuePanel queueData={queueData} slotDate={sharedProps.slotDate} slotTime={sharedProps.slotTime} />;
        case "notifications":
  return (
    <section className="db-section db-notifications">

      <section className="db-notifications-header">
        <section>
          <h2 className="db-notifications-title">
            Notifications
          </h2>

          <p className="db-notifications-count">
            {unreadCount} unread
          </p>
        </section>

        {unreadCount > 0 && (
          <button
            className="db-notifications-readall"
            onClick={markAllRead}
          >
            Mark all as read
          </button>
        )}
      </section>

      {notifications.length === 0 ? (
        <section className="db-notifications-empty">
          <h3>No notifications yet</h3>

          <p>
            You're all caught up.
          </p>
        </section>
      ) : (
        <section className="db-notification-list">
          {notifications.map((notification) => (
            <article
              key={notification.id}
              className={`db-notification-card ${
                !notification.is_read
                  ? "db-notification-unread"
                  : ""
              }`}
            >
              <section className="db-notification-icon">
                🔔
              </section>

              <section className="db-notification-content">
                <h3 className="db-notification-title">
                  {notification.title || "Notification"}
                </h3>

                <p className="db-notification-message">
                  {notification.message}
                </p>

                <time className="db-notification-time">
                  {new Date(
                    notification.sent_at
                  ).toLocaleString()}
                </time>
              </section>
            </article>
          ))}
        </section>
      )}
    </section>
  );
    
  
      case "find-clinic": return <ClinicSearch onBook={(id) => { setBookingClinicId(id); setActiveTab("book"); }} />;
      case "book": return <BookAppointment 
          clinicId={bookingClinicId} 
          onBack={() => setActiveTab("find-clinic")}
          onDone={() => setActiveTab("overview")}
        />;
      case "profile":     return <ProfilePage profile={profile} />;
      case "policy":        return <ServicePolicy />;
      default:              return <section className="db-section"><h2>{activeTab}</h2></section>;
    }
  }

  // Put the full patient dashboard on screen
  return (
    <section className="db-root">
      <aside className={`db-sidebar ${sidebarOpen ? "open" : ""}`}>
        <header className="db-sidebar-brand"><FaStethoscope style={{ color: "white" }} /> QueueCare</header>
        <nav className="db-nav">
          {PATIENT_NAV.map((item) => (
            <button key={item.id} className={`db-nav-item ${activeTab === item.id ? "db-nav-active" : ""}`} onClick={() => goTo(item.id)}>
              {item.icon} {item.label}
            </button>
          ))}
        </nav>
        <footer>
        <button className="db-sidebar-logout" onClick={handleLogout}><FiLogOut /> Logout</button>
        </footer>
      </aside>

      <section className="db-main">
        <header className="db-topbar">
          <section style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <button className="db-hamburger" /* v8 ignore next */ onClick={() => setSidebarOpen((v) => !v)}>☰</button>
            <b>{PATIENT_NAV.find((n) => n.id === activeTab)?.label || "Dashboard"}</b>
          </section>
          <p>Hi, {profile.name || "User"}</p>
        </header>

        {/* Small banner at the top reminding the patient about an upcoming appointment */}
        {/* v8 ignore start */
        reminderBanner && (
          <aside role="alert" style={{ background: reminderBanner.minutes <= 5 ? "#fdecea" : "#fff8e1", borderBottom: `3px solid ${reminderBanner.minutes <= 5 ? "#c62828" : "#e65100"}`, color: reminderBanner.minutes <= 5 ? "#c62828" : "#7a3900", padding: "13px 20px", display: "flex", alignItems: "center", justifyContent: "space-between", fontSize: 14, fontWeight: 500, gap: 12 }}>
            <em>
              {reminderBanner.minutes <= 5 ? "🚨" : "⏰"} Your appointment at <strong>{reminderBanner.clinic}</strong> is in <strong>{reminderBanner.minutes} minutes</strong> <small style={{ opacity: 0.8 }}>({reminderBanner.time})</small>
            </em>
            <button onClick={() => setReminderBanner(null)} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 20, color: "inherit", opacity: 0.7 }}>×</button>
          </aside>
        ) /* v8 ignore stop */}

        <main className="db-content">{renderContent()}</main>
      </section>

      {/* A popup window that opens when the patient wants to reschedule their appointment */}
      {/* v8 ignore start */
      rescheduleAppt && (
        <aside className="db-modal-overlay" onClick={() => setRescheduleAppt(null)}>
          <section className="db-modal" onClick={(e) => e.stopPropagation()}>
            <h3>Reschedule Appointment</h3>
            <p>Current: {formatDate(rescheduleAppt.appointment_slots?.slot_date)} at {formatTime(rescheduleAppt.appointment_slots?.slot_time)}</p>
            {rescheduleLoading && <p>Loading available slots…</p>}
            {!rescheduleLoading && rescheduleSlots.length === 0 && <p className="db-empty">No other available slots for this clinic.</p>}
            {!rescheduleLoading && rescheduleSlots.length > 0 && (
              <ul className="db-reschedule-slots">
                {rescheduleSlots.map((slot) => {
                  const isSelected = rescheduleSlotId === slot.id;
                  const spotsLeft  = (slot.total_capacity || 1) - (slot.booked_count || 0);
                  return (
                    <li key={slot.id} className={`db-reschedule-slot ${isSelected ? "db-reschedule-selected" : ""}`} onClick={() => setRescheduleSlotId(slot.id)}>
                      <b><FiCalendar /> {formatDate(slot.slot_date)}</b>
                      <b><FiClock /> {formatTime(slot.slot_time)}</b>
                      <b>{slot.duration_minutes} min</b>
                      <b>{spotsLeft} spot{spotsLeft !== 1 ? "s" : ""} left</b>
                      {isSelected && <i className="db-check">✔</i>}
                    </li>
                  );
                })}
              </ul>
            )}
            <footer className="db-modal-actions">
              <button className="db-btn db-btn-reschedule" disabled={!rescheduleSlotId || rescheduleLoading} onClick={confirmReschedule}>{rescheduleLoading ? "Saving…" : "Confirm Reschedule"}</button>
              <button className="db-btn db-btn-secondary" onClick={() => setRescheduleAppt(null)}>Cancel</button>
            </footer>
          </section>
        </aside>
      ) /* v8 ignore stop */}

      <AIAssistant
        context={{
          role: 'patient',
          profile,
          pageContext: activeTab,
        }}
      />
    </section>
  );
}