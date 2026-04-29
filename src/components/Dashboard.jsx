import { useEffect, useMemo, useState } from "react";
import { onAuthStateChanged, signOut } from "firebase/auth";
import { auth } from "../firebase";
import { supabase } from "#lib/supabase";  

import { useNavigate } from "react-router-dom";
import { FiCalendar, FiClock, FiLogOut } from "react-icons/fi";
import { FaStethoscope } from "react-icons/fa";

import Applications from "./Applications.jsx";
import AdminClinics from "./AdminClinics";
import AdminStaff from "./AdminStaff.jsx";
import { getMyQueue, removeFromQueue, addToQueue } from "../queueApi.js";
import "./Dashboard.css";

import {
  PATIENT_NAV, STAFF_NAV, ADMIN_NAV,
  formatDate, formatTime, normalizeAvailability, playReminderSound, CountdownTimer,
} from "./DashboardHelpers";
import {
  OverviewPanel, AppointmentsPanel, PatientQueuePanel,
  NotificationsPanel, ProfilePanel,
} from "./DashboardPanels";

// FIX: shared helper to pick the soonest upcoming active appointment
function getSoonestActiveAppointment(appointments) {
  const today = new Date().toISOString().split("T")[0];
  return appointments
    .filter(
      (a) =>
        (a.status === "booked" || a.status === "confirmed") &&
        a.appointment_slots?.slot_date >= today
    )
    .sort((a, b) =>
      (a.appointment_slots?.slot_date || "").localeCompare(
        b.appointment_slots?.slot_date || ""
      )
    )[0] || null;
}

export default function Dashboard() {
  const [profile, setProfile]                   = useState(null);
  const [appointments, setAppointments]         = useState([]);
  // FIX: removed separate liveQueue state — queueData is the single source of truth
  const [queueHistory, setQueueHistory]         = useState([]);
  const [notifications, setNotifications]       = useState([]);
  const [staffAssignments, setStaffAssignments] = useState([]);
  const [loading, setLoading]                   = useState(true);
  const [activeTab, setActiveTab]               = useState("overview");
  const [sidebarOpen, setSidebarOpen]           = useState(false);
  const [unreadCount, setUnreadCount]           = useState(0);

  const [availability, setAvailability]               = useState({});
  const [savingAvailability, setSavingAvailability]   = useState(false);
  const [availabilityStatus, setAvailabilityStatus]   = useState({ type: "", message: "" });

  const [editProfile, setEditProfile]   = useState(false);
  const [editForm, setEditForm]         = useState({});
  const [savingProfile, setSavingProfile] = useState(false);

  const [rescheduleAppt, setRescheduleAppt]       = useState(null);
  const [rescheduleSlots, setRescheduleSlots]     = useState([]);
  const [rescheduleSlotId, setRescheduleSlotId]   = useState(null);
  const [rescheduleLoading, setRescheduleLoading] = useState(false);

  const [queueData, setQueueData]           = useState(null);
  const [reminderBanner, setReminderBanner] = useState(null);

  const navigate = useNavigate();

  const NAV_ITEMS = useMemo(() => {
    if (profile?.role === "admin") return ADMIN_NAV;
    if (profile?.role === "staff") return STAFF_NAV;
    return PATIENT_NAV;
  }, [profile?.role]);

  // ── Auth guard + data loader ──────────────────────────────────────────────
  useEffect(() => {
    let cancelled = false;
    let unsubFirebase = null;

    async function bootstrap() {
      async function resolveIdentity(firebaseUser) {
        if (firebaseUser || auth.currentUser) {
          const fb = firebaseUser || auth.currentUser;
          return { authProvider: "firebase", providerUserId: fb.uid };
        }
        const { data } = await supabase.auth.getUser();
        if (data?.user) return { authProvider: "supabase", providerUserId: data.user.id };
        return null;
      }

      try {
        unsubFirebase = onAuthStateChanged(auth, async (firebaseUser) => {
          if (cancelled) return;

          setProfile(null);
          setAppointments([]);
          setQueueData(null);
          setQueueHistory([]);
          setNotifications([]);
          setStaffAssignments([]);
          setAvailability(normalizeAvailability(null));

          const identity = await resolveIdentity(firebaseUser);

          if (!identity) {
            setLoading(false);
            navigate("/signin", { replace: true });
            return;
          }

          const { authProvider, providerUserId } = identity;

          const { data: prof } = await supabase
            .from("profiles")
            .select("*")
            .eq("auth_provider", authProvider)
            .eq("provider_user_id", providerUserId)
            .maybeSingle();

          if (cancelled) return;

          if (!prof) {
            const { data: app } = await supabase
              .from("role_applications")
              .select("requested_role, status")
              .eq("auth_provider", authProvider)
              .eq("provider_user_id", providerUserId)
              .order("submitted_at", { ascending: false })
              .maybeSingle();

            const msg =
              app?.status === "pending"
                ? `Your ${app.requested_role} application is still pending approval.`
                : app?.status === "rejected"
                ? `Your ${app.requested_role} application was rejected.`
                : null;

            setLoading(false);
            navigate("/signin", { replace: true, state: msg ? { pendingMessage: msg } : undefined });
            return;
          }

          setProfile(prof);
          setEditForm({
            name:         prof.name         || "",
            surname:      prof.surname      || "",
            phone_number: prof.phone_number || "",
            dob:          prof.dob          || "",
          });

          const { data: notif } = await supabase
            .from("notifications")
            .select("*")
            .eq("profile_id", prof.id)
            .order("sent_at", { ascending: false })
            .limit(30);

          setNotifications(notif || []);
          setUnreadCount((notif || []).filter((n) => !n.is_read).length);

          if (prof.role === "patient") {
            const { data: appts } = await supabase
              .from("appointments")
              .select(`*, appointment_slots(slot_date, slot_time, duration_minutes, facility_id, facilities(name, district, province))`)
              .eq("patient_id", prof.id)
              .order("booked_at", { ascending: false })
              .limit(20);

            const { data: queueEntries } = await supabase
              .from("queue_entries")
              .select("*, facilities(name, district)")
              .eq("patient_id", prof.id)
              .order("joined_at", { ascending: false })
              .limit(10);

            setAppointments(appts || []);
            setQueueHistory(queueEntries || []);
            setStaffAssignments([]);

            // FIX: fetch initial queue data using soonest active appointment
            const soonest = getSoonestActiveAppointment(appts || []);
            if (soonest) {
              const contactDetails = prof.email || prof.phone_number;
              const facilityId = soonest.appointment_slots?.facility_id || soonest.facility_id;
              if (contactDetails && facilityId) {
                const qData = await getMyQueue(contactDetails, facilityId);
                if (!qData.error) setQueueData(qData);
              }
            }
          } else {
            const { data: assignments } = await supabase
              .from("staff_assignments")
              .select("*, facilities(name, district, province)")
              .eq("profile_id", prof.id);

            const { data: appts } = await supabase
              .from("appointments")
              .select(`*, appointment_slots(slot_date, slot_time, duration_minutes), facilities(name, district, province)`)
              .order("booked_at", { ascending: false })
              .limit(20);

            setStaffAssignments(assignments || []);
            setAppointments(appts || []);
            setQueueData(null);
            setQueueHistory([]);
            setAvailability(normalizeAvailability(assignments?.[0]?.availability ?? null));
          }

          if (!cancelled) setLoading(false);
        });
      } catch (err) {
        console.error("Dashboard bootstrap error:", err);
        if (!cancelled) { setLoading(false); navigate("/signin", { replace: true }); }
      }
    }

    bootstrap();
    return () => { cancelled = true; if (unsubFirebase) unsubFirebase(); };
  }, [navigate]);

  // ── Queue polling (patient only) ──────────────────────────────────────────
  useEffect(() => {
    if (!profile || profile.role !== "patient") return;

    const contactDetails = profile.email || profile.phone_number;
    if (!contactDetails) return;

    // FIX: use soonest upcoming appointment, not first in array
    const activeAppt = getSoonestActiveAppointment(appointments);
    if (!activeAppt) return;

    const facilityId = activeAppt.appointment_slots?.facility_id || activeAppt.facility_id;
    if (!facilityId) return;

    let queueInterval;
    queueInterval = setInterval(async () => {
      const data = await getMyQueue(contactDetails, facilityId);
      if (!data.error) {
        // FIX: single source of truth — only queueData, no separate liveQueue
        setQueueData(data);
        if (data.status === "complete" || data.status === "completed") {
          clearInterval(queueInterval);
        }
      }
    }, 2000);

    /*const notifyInterval = setInterval(async () => {
      if (profile.email) await notifyPatient(profile.email, facilityId);
    }, 60000);

    return () => {
      clearInterval(queueInterval);
      clearInterval(notifyInterval);
    };*/
  }, [profile, appointments]);

  // ── In-app appointment reminders with sound ───────────────────────────────
  // FIX: filter to future dates only so past booked appointments don't trigger reminders
  const today = new Date().toISOString().split("T")[0];
  const upcomingAppts = appointments.filter(
    (a) => a.status === "booked" && a.appointment_slots?.slot_date >= today
  );

  useEffect(() => {
    if (!profile || profile.role !== "patient" || upcomingAppts.length === 0) return;

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
          setReminderBanner({
            apptId: appt.id, minutes: 30,
            clinic: appt.appointment_slots?.facilities?.name || "your clinic",
            time: formatTime(slotTime),
          });
          return;
        }
        if (diffMinutes <= 5 && diffMinutes >= 0 && !sessionStorage.getItem(key5)) {
          sessionStorage.setItem(key5, "true");
          playReminderSound(true);
          setReminderBanner({
            apptId: appt.id, minutes: 5,
            clinic: appt.appointment_slots?.facilities?.name || "your clinic",
            time: formatTime(slotTime),
          });
          return;
        }
      }
    }

    checkReminders();
    const interval = setInterval(checkReminders, 30000);
    return () => clearInterval(interval);
  }, [profile, upcomingAppts]);

  // ── Actions ───────────────────────────────────────────────────────────────
  async function handleLogout() {
    await Promise.allSettled([supabase.auth.signOut(), signOut(auth)]);
    localStorage.removeItem("userIdentity");
    navigate("/signin");
  }

  async function markAllRead() {
    if (!profile?.id) return;
    await supabase.from("notifications").update({ is_read: true }).eq("profile_id", profile.id);
    setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
    setUnreadCount(0);
  }

  async function saveProfile() {
    if (!profile?.id) return;
    setSavingProfile(true);
    const { error } = await supabase.from("profiles").update(editForm).eq("id", profile.id);
    if (!error) { setProfile((prev) => ({ ...prev, ...editForm })); setEditProfile(false); }
    setSavingProfile(false);
  }

  async function cancelAppointment(appt) {
    if (!confirm("Are you sure you want to cancel this appointment?")) return;
    try {
      const res  = await fetch(`/appointments/${appt.id}/cancel`, {
        method: "PATCH", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ patient_id: profile.id }),
      });
      const data = await res.json();
      if (!res.ok) { alert("Failed to cancel: " + (data.error || "Unknown error")); return; }

      setAppointments((prev) =>
        prev.map((a) => a.id === appt.id ? { ...a, status: "cancelled" } : a)
      );

      const contactDetails = profile.email || profile.phone_number;
      const facilityId     = appt.appointment_slots?.facility_id;
      if (contactDetails && facilityId) {
        // FIX: removeFromQueue now uses query params to match backend req.query
        await removeFromQueue(contactDetails, facilityId);
        setQueueData(null);
      }
    } catch (err) {
      alert("Failed to cancel: " + err.message);
    }
  }

  async function openReschedule(appt) {
    setRescheduleAppt(appt);
    setRescheduleSlotId(null);
    setRescheduleLoading(true);
    const facilityId = appt.appointment_slots?.facility_id;
    if (!facilityId) { alert("Cannot determine facility."); setRescheduleLoading(false); return; }
    const { data: allSlots } = await supabase
      .from("appointment_slots")
      .select("*")
      .eq("facility_id", facilityId);
    setRescheduleSlots(
      (allSlots || []).filter((s) => s.id !== appt.slot_id && (s.booked_count || 0) < (s.total_capacity || 1))
    );
    setRescheduleLoading(false);
  }

  async function confirmReschedule() {
    if (!rescheduleSlotId || !rescheduleAppt) return;
    setRescheduleLoading(true);
    try {
      const res  = await fetch(`/appointments/${rescheduleAppt.id}/reschedule`, {
        method: "PATCH", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ patient_id: profile.id, new_slot_id: rescheduleSlotId }),
      });
      const data = await res.json();
      if (!res.ok) {
        alert("Reschedule failed: " + (data.error || "Unknown error"));
        setRescheduleLoading(false);
        return;
      }

      const { data: updatedSlot } = await supabase
        .from("appointment_slots")
        .select("slot_date, slot_time, duration_minutes, facility_id, facilities(name, district, province)")
        .eq("id", rescheduleSlotId)
        .single();

      setAppointments((prev) =>
        prev.map((a) =>
          a.id === rescheduleAppt.id
            ? { ...a, slot_id: rescheduleSlotId, appointment_slots: updatedSlot }
            : a
        )
      );
      setRescheduleAppt(null);
      setRescheduleSlots([]);
      setRescheduleSlotId(null);
    } catch (err) {
      alert("Reschedule failed: " + err.message);
    }
    setRescheduleLoading(false);
  }

  function goTo(id) {
    setSidebarOpen(false);
    if (id === "find-clinic") { navigate("/clinic-search"); return; }
    if (["staff-appointments", "patients", "staff-queue"].includes(id)) { navigate("/staff-dashboard"); return; }
    setActiveTab(id);
  }

  async function saveAvailability() {
    if (!latestAssignment) return;
    setSavingAvailability(true);
    const { error } = await supabase
      .from("staff_assignments")
      .update({ availability })
      .eq("id", latestAssignment.id);
    setSavingAvailability(false);
    setAvailabilityStatus(error
      ? { type: "error",   message: error.message }
      : { type: "success", message: "Availability saved successfully." }
    );
  }

  function updateAvailabilityDay(day, field, value) {
    setAvailability((prev) => ({
      ...prev,
      [day]: {
        ...prev[day],
        [field]: value,
        ...(field === "available" && !value ? { start: "", end: "" } : {}),
      },
    }));
  }

  async function joinQueue() {
    try {
      const contactDetails = profile.email || profile.phone_number;

      // FIX: use soonest upcoming appointment, not first booked in array
      const bookedAppt = getSoonestActiveAppointment(appointments);

      if (!bookedAppt) {
        alert("No active upcoming appointment found.");
        return;
      }

      const facilityId = bookedAppt.appointment_slots?.facility_id || bookedAppt.facility_id;

      if (!contactDetails || !facilityId) {
        alert("Missing details to join queue.");
        return;
      }

      const res = await addToQueue(contactDetails, facilityId);

      if (res.error) {
        alert(res.error);
        return;
      }

      // FIX: refresh queueData only (single source of truth)
      const updated = await getMyQueue(contactDetails, facilityId);
      if (!updated.error) {
        setQueueData(updated);
      }
    } catch (err) {
      console.error(err);
      alert("Failed to join queue");
    }
  }

  // ── Loading splash ────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="db-splash">
        <div className="db-spinner" />
        <p>Loading your dashboard…</p>
      </div>
    );
  }

  // ── Derived data ──────────────────────────────────────────────────────────
  const latestAssignment = staffAssignments[0] || null;

  // FIX: queueData is the single source of truth for queue state
  const activeQueue = queueData?.data || null;

  // ── Content router ────────────────────────────────────────────────────────
  function renderContent() {
    const bookedAppt = getSoonestActiveAppointment(appointments);

    const sharedOverviewProps = {
      profile,
      appointments,
      upcomingAppts,
      activeQueue,
      unreadCount,
      staffAssignments,
      latestAssignment,
      queueData,
      availability,
      availabilityStatus,
      savingAvailability,
      onSaveAvailability:      saveAvailability,
      onUpdateAvailabilityDay: updateAvailabilityDay,
      onReschedule:            openReschedule,
      onCancel:                cancelAppointment,
      onJoinQueue:             joinQueue,
      slotDate: bookedAppt?.appointment_slots?.slot_date || null,
      slotTime: bookedAppt?.appointment_slots?.slot_time || null,
    };

    switch (activeTab) {
      case "overview":
        return <OverviewPanel {...sharedOverviewProps} />;

      case "appointments":
      case "staff-appointments":
        return (
          <AppointmentsPanel
            profile={profile}
            appointments={appointments}
            onReschedule={openReschedule}
            onCancel={cancelAppointment}
          />
        );

      case "queue":
        return profile?.role === "patient"
          ? <PatientQueuePanel queueData={queueData} slotDate={sharedOverviewProps.slotDate} slotTime={sharedOverviewProps.slotTime} />
          : null;

      case "staff-queue":
      case "patients":
        return (
          <div className="db-section">
            <h2 className="db-section-title">
              {activeTab === "staff-queue" ? "Patient Queue" : "Patients"}
            </h2>
            <div className="db-card" style={{ textAlign: "center", padding: 40 }}>
              <p style={{ fontSize: 32, marginBottom: 8 }}>🧑‍⚕️</p>
              <p style={{ color: "#666", marginBottom: 20 }}>
                Manage appointments, slots, and patients in the Staff Dashboard.
              </p>
              <button
                className="db-btn db-btn-reschedule"
                onClick={() => navigate("/staff-dashboard")}
              >
                Open Staff Dashboard →
              </button>
            </div>
          </div>
        );

      case "applications":
        return (
          <Applications
            profile={profile}
            onRoleUpdated={(profileId, newRole) => {
              if (profile?.id === profileId)
                setProfile((prev) => ({ ...prev, role: newRole }));
            }}
          />
        );

      case "staff":   return <AdminStaff />;
      case "clinics": return <AdminClinics />;

      case "notifications":
        return (
          <NotificationsPanel
            notifications={notifications}
            unreadCount={unreadCount}
            onMarkAllRead={markAllRead}
          />
        );

      case "profile":
        return (
          <ProfilePanel
            profile={profile}
            editProfile={editProfile}
            editForm={editForm}
            savingProfile={savingProfile}
            onEdit={() => setEditProfile(true)}
            onCancel={() => setEditProfile(false)}
            onSave={saveProfile}
            onFormChange={(key, val) =>
              setEditForm((prev) => ({ ...prev, [key]: val }))
            }
          />
        );

      case "policy":
        return (
          <div className="db-section">
            <h2 className="db-section-title">Service Policy</h2>
            <p>Policy content goes here.</p>
          </div>
        );

      case "settings":
        return (
          <div className="db-section">
            <h2 className="db-section-title">Settings</h2>
            <p>Patient settings page goes here.</p>
          </div>
        );

      default:
        return <div className="db-section"><h2>{activeTab}</h2></div>;
    }
  }

  // ── Layout ────────────────────────────────────────────────────────────────
  return (
    <div className="db-root">
      <aside className={`db-sidebar ${sidebarOpen ? "open" : ""}`}>
        <div className="db-sidebar-brand">
          <FaStethoscope style={{ color: "white" }} /> QueueCare
        </div>
        <nav className="db-nav">
          {NAV_ITEMS.map((item) => (
            <button
              key={item.id}
              className={`db-nav-item ${activeTab === item.id ? "db-nav-active" : ""}`}
              onClick={() => goTo(item.id)}
            >
              {item.icon} {item.label}
            </button>
          ))}
        </nav>
        <button className="db-sidebar-logout" onClick={handleLogout}>
          <FiLogOut /> Logout
        </button>
      </aside>

      <div className="db-main">
        <header className="db-topbar">
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <button
              className="db-hamburger"
              onClick={() => setSidebarOpen((v) => !v)}
              aria-label="Toggle menu"
            >
              ☰
            </button>
            <span>{NAV_ITEMS.find((n) => n.id === activeTab)?.label || "Dashboard"}</span>
          </div>
          <div>
            Hi, {profile?.name || "User"}
            {profile?.role ? ` (${profile.role})` : ""}
          </div>
        </header>

        {/* Reminder banner */}
        {reminderBanner && (
          <div
            role="alert"
            style={{
              background:     reminderBanner.minutes <= 5 ? "#fdecea" : "#fff8e1",
              borderBottom:   `3px solid ${reminderBanner.minutes <= 5 ? "#c62828" : "#e65100"}`,
              color:          reminderBanner.minutes <= 5 ? "#c62828" : "#7a3900",
              padding:        "13px 20px",
              display:        "flex",
              alignItems:     "center",
              justifyContent: "space-between",
              fontSize:        14,
              fontWeight:      500,
              gap:             12,
              animation:       "db-reminder-slide-in 0.3s ease",
            }}
          >
            <span>
              {reminderBanner.minutes <= 5 ? "🚨" : "⏰"}{" "}
              Your appointment at <strong>{reminderBanner.clinic}</strong> is in{" "}
              <strong>{reminderBanner.minutes} minutes</strong>{" "}
              <span style={{ fontWeight: 400, opacity: 0.8 }}>({reminderBanner.time})</span>
            </span>
            <button
              onClick={() => setReminderBanner(null)}
              aria-label="Dismiss reminder"
              style={{
                background: "none", border: "none", cursor: "pointer",
                fontSize: 20, lineHeight: 1, color: "inherit",
                padding: "0 4px", opacity: 0.7, flexShrink: 0,
              }}
            >
              ×
            </button>
          </div>
        )}

        <main className="db-content">{renderContent()}</main>
      </div>

      {/* Reschedule modal */}
      {rescheduleAppt && (
        <div className="db-modal-overlay" onClick={() => setRescheduleAppt(null)}>
          <div className="db-modal" onClick={(e) => e.stopPropagation()}>
            <h3>Reschedule Appointment</h3>
            <p>
              Current: {formatDate(rescheduleAppt.appointment_slots?.slot_date)} at{" "}
              {formatTime(rescheduleAppt.appointment_slots?.slot_time)}
            </p>

            {rescheduleLoading && <p>Loading available slots…</p>}

            {!rescheduleLoading && rescheduleSlots.length === 0 && (
              <p className="db-empty">No other available slots for this clinic.</p>
            )}

            {!rescheduleLoading && rescheduleSlots.length > 0 && (
              <div className="db-reschedule-slots">
                {rescheduleSlots.map((slot) => {
                  const isSelected = rescheduleSlotId === slot.id;
                  const spotsLeft  = (slot.total_capacity || 1) - (slot.booked_count || 0);
                  return (
                    <div
                      key={slot.id}
                      className={`db-reschedule-slot ${isSelected ? "db-reschedule-selected" : ""}`}
                      onClick={() => setRescheduleSlotId(slot.id)}
                    >
                      <span><FiCalendar /> {formatDate(slot.slot_date)}</span>
                      <span><FiClock />    {formatTime(slot.slot_time)}</span>
                      <span>{slot.duration_minutes} min</span>
                      <span>{spotsLeft} spot{spotsLeft !== 1 ? "s" : ""} left</span>
                      {isSelected && <span className="db-check">✔</span>}
                    </div>
                  );
                })}
              </div>
            )}

            <div className="db-modal-actions">
              <button
                className="db-btn db-btn-reschedule"
                disabled={!rescheduleSlotId || rescheduleLoading}
                onClick={confirmReschedule}
              >
                {rescheduleLoading ? "Saving…" : "Confirm Reschedule"}
              </button>
              <button
                className="db-btn db-btn-secondary"
                onClick={() => setRescheduleAppt(null)}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}