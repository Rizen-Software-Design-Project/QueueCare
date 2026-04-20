/**
 * Dashboard.jsx
 *
 * Responsibility: Post-login dashboard for all roles (patient, staff, admin).
 *
 * Auth guard: on mount it checks both Firebase and Supabase sessions.
 * If neither session resolves to a profile, the user is sent back to /signin.
 * If a pending/rejected application is found instead of a profile, the user
 * is redirected to /signin with a message in location.state.
 *
 * Role-specific nav and content panels are rendered based on profile.role.
 */

import { useEffect, useMemo, useState } from "react";
import { onAuthStateChanged, signOut } from "firebase/auth";
import { auth } from "../firebase";
import { createClient } from "@supabase/supabase-js";
import { useNavigate } from "react-router-dom";
import Applications from "./Applications.jsx";
import AdminClinics from "./AdminClinics";
import AdminStaff from "./AdminStaff.jsx";
import "./Dashboard.css";

import { FiGrid, FiClock, FiCalendar, FiHash, FiBell, FiUser, FiSettings, FiFileText, FiLogOut} from "react-icons/fi";
import { FaStethoscope } from "react-icons/fa";

import { FaHospital } from "react-icons/fa";




const supabase = createClient(
  "https://vktjtxljwzyakobkkhol.supabase.co",
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZrdGp0eGxqd3p5YWtvYmtraG9sIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzU1ODE1ODYsImV4cCI6MjA5MTE1NzU4Nn0.LVNelw--Xp1t_weGNwhPGMrzqg0iS7J5TAXw9ZM6aUA"
);

// ── Navigation config ────────────────────────────────────────────────────────
const PATIENT_NAV = [
  { id: "overview",      icon: <FiGrid />,      label: "Overview" },
  { id: "appointments",  icon: <FiCalendar />,  label: "Appointments" },
  { id: "queue",         icon: <FiHash />,      label: "My Queue" },
  { id: "notifications", icon: <FiBell />,      label: "Notifications" },
  { id: "profile",       icon: <FiUser />,      label: "Profile" },
  { id: "find-clinic",   icon: <FaHospital />,  label: "Find a Clinic" },
  { id: "policy",        icon: <FiFileText />,  label: "Service Policy" },
  { id: "settings",      icon: <FiSettings />,  label: "Settings" },
];

const STAFF_NAV = [
  { id: "overview",          icon: <FiGrid />,  label: "Overview" },
  { id: "staff-appointments",icon: <FiCalendar />, label: "Clinic Appointments" },
  { id: "staff-queue",       icon: <FiHash />,       label: "Patient Queue" },
  { id: "patients",          icon: <FiUser />,label: "Patients" },
  { id: "notifications",     icon: <FiBell />, label: "Notifications" },
  { id: "profile",           icon: <FiUser />, label: "Profile" },
];

const ADMIN_NAV = [
  { id: "overview",      icon: <FiGrid />,  label: "Overview" },
  { id: "applications",  icon: <FiFileText />, label: "Applications" },
  { id: "staff",         icon: <FiUser />,label: "Staff Management" },
  { id: "clinics",       icon: <FaHospital />, label: "Clinics" },
  { id: "notifications", icon: <FiBell />, label: "Notifications" },
  { id: "profile",       icon: <FiUser />, label: "Profile" },
];

// ── Status badge ─────────────────────────────────────────────────────────────
const STATUS_COLOR = {
  booked:    { bg: "#e8f5e9", color: "#2E7D32", label: "Booked" },
  cancelled: { bg: "#fdecea", color: "#c62828", label: "Cancelled" },
  completed: { bg: "#e3f2fd", color: "#1565c0", label: "Completed" },
  waiting:   { bg: "#fff8e1", color: "#e65100", label: "Waiting" },
  called:    { bg: "#f3e5f5", color: "#6a1b9a", label: "Called" },
};

function Badge({ status }) {
  const s = STATUS_COLOR[status] || { bg: "#f0f0f0", color: "#555", label: status || "Unknown" };
  return <span style={{ background: s.bg, color: s.color }} className="db-badge">{s.label}</span>;
}



// ── Formatters ────────────────────────────────────────────────────────────────
function formatDate(val) {
  if (!val) return "—";
  return new Date(val).toLocaleDateString("en-ZA", { day: "numeric", month: "short", year: "numeric" });
}
function formatTime(val) { return val ? String(val).slice(0, 5) : ""; }
function formatDateTime(val) {
  if (!val) return "—";
  return new Date(val).toLocaleString("en-ZA", {
    day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit",
  });
}
const DAYS = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"];

function normalizeAvailability(availability) {
  const normalized = {};
  DAYS.forEach((day) => {
    normalized[day] = {
      available: availability?.[day]?.available ?? false,
      start:     availability?.[day]?.start ?? "",
      end:       availability?.[day]?.end ?? "",
    };
  });
  return normalized;
}
// ── Dashboard ─────────────────────────────────────────────────────────────────
export default function Dashboard() {
  const [profile,          setProfile]          = useState(null);
  const [appointments,     setAppointments]     = useState([]);
  const [queue,            setQueue]            = useState([]);
  const [notifications,    setNotifications]    = useState([]);
  const [staffAssignments, setStaffAssignments] = useState([]);
  const [loading,          setLoading]          = useState(true);
  const [activeTab,        setActiveTab]        = useState("overview");
  const [sidebarOpen,      setSidebarOpen]      = useState(false);
  const [unreadCount,      setUnreadCount]      = useState(0);
  // After your existing useState declarations (around line 30)
const [availability,     setAvailability]     = useState({});
const [savingAvailability, setSavingAvailability] = useState(false);
const [availabilityStatus, setAvailabilityStatus] = useState({ type: "", message: "" });
  // Profile edit
  const [editProfile,   setEditProfile]   = useState(false);
  const [editForm,      setEditForm]      = useState({});
  const [savingProfile, setSavingProfile] = useState(false);

  // Reschedule modal
  const [rescheduleAppt,   setRescheduleAppt]   = useState(null);
  const [rescheduleSlots,  setRescheduleSlots]  = useState([]);
  const [rescheduleSlotId, setRescheduleSlotId] = useState(null);
  const [rescheduleLoading,setRescheduleLoading]= useState(false);

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

      // Try Firebase first
      if (firebaseUser || auth.currentUser) {
        const fb = firebaseUser || auth.currentUser;

        return {
          authProvider: "firebase",
          providerUserId: fb.uid
        };
      }

      // Then Supabase
      const { data } = await supabase.auth.getUser();

      if (data?.user) {
        return {
          authProvider: "supabase",
          providerUserId: data.user.id
        };
      }

      return null;
    }

    try {

      unsubFirebase = onAuthStateChanged(auth, async (firebaseUser) => {

        if (cancelled) return;

        // Reset previous session
        setProfile(null);
        setAppointments([]);
        setQueue([]);
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

        // Fetch profile
        const { data: prof } = await supabase
          .from("profiles")
          .select("*")
          .eq("auth_provider", authProvider)
          .eq("provider_user_id", providerUserId)
          .maybeSingle();

        if (cancelled) return;

        // If no profile check application
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

          navigate("/signin", {
            replace: true,
            state: msg ? { pendingMessage: msg } : undefined
          });

          return;
        }

        // Profile found
        setProfile(prof);

        setEditForm({
          name: prof.name || "",
          surname: prof.surname || "",
          phone_number: prof.phone_number || "",
          dob: prof.dob || ""
        });

        // Load notifications
        const { data: notif } = await supabase
          .from("notifications")
          .select("*")
          .eq("profile_id", prof.id)
          .order("sent_at", { ascending: false })
          .limit(30);

        setNotifications(notif || []);
        setUnreadCount((notif || []).filter(n => !n.is_read).length);

        // Patient data
        if (prof.role === "patient") {

          const { data: appts } = await supabase
            .from("appointments")
            .select(`
              *,
              appointment_slots(
                slot_date,
                slot_time,
                duration_minutes,
                facility_id,
                facilities(name, district, province)
              )
            `)
            .eq("patient_id", prof.id)
            .order("booked_at", { ascending: false })
            .limit(20);

          const { data: queueData } = await supabase
            .from("queue_entries")
            .select("*, facilities(name, district)")
            .eq("patient_id", prof.id)
            .order("joined_at", { ascending: false })
            .limit(10);

          setAppointments(appts || []);
          setQueue(queueData || []);
          setStaffAssignments([]);

        } else {

          const { data: assignments } = await supabase
            .from("staff_assignments")
            .select("*, facilities(name, district, province)")
            .eq("profile_id", prof.id);

          const { data: appts } = await supabase
            .from("appointments")
            .select(`
              *,
              appointment_slots(slot_date, slot_time, duration_minutes),
              facilities(name, district, province)
            `)
            .order("booked_at", { ascending: false })
            .limit(20);

          setStaffAssignments(assignments || []);
          setAppointments(appts || []);
          setQueue([]);

          if (assignments?.[0]?.availability) {
            setAvailability(normalizeAvailability(assignments[0].availability));
          } else {
            setAvailability(normalizeAvailability(null));
          }

        }

        if (!cancelled) setLoading(false);

      });

    } catch (err) {

      console.error("Dashboard bootstrap error:", err);

      if (!cancelled) {
        setLoading(false);
        navigate("/signin", { replace: true });
      }
    }
  }

  bootstrap();

  return () => {
    cancelled = true;
    if (unsubFirebase) unsubFirebase();
  };

}, [navigate]);

  // ── Actions ───────────────────────────────────────────────────────────────
  async function handleLogout() {
    await Promise.allSettled([supabase.auth.signOut(), signOut(auth)]);
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
    if (!confirm("Are you sure you want to cancel this appointment?")) {
      return;
    }
    try {
      const res = await fetch(`/appointments/${appt.id}/cancel`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ patient_id: profile.id }),
      });
      const data = await res.json();
      if (!res.ok) {
        alert("Failed to cancel: " + (data.error || "Unknown error"));
        return;
      }
      setAppointments(prev => prev.map(a => a.id === appt.id ? { ...a, status: "cancelled" } : a));
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
    const { data: allSlots } = await supabase.from("appointment_slots").select("*").eq("facility_id", facilityId);
    setRescheduleSlots(
      (allSlots || []).filter((s) => s.id !== appt.slot_id && (s.booked_count || 0) < (s.total_capacity || 1))
    );
    setRescheduleLoading(false);
  }

  async function confirmReschedule() {
    if (!rescheduleSlotId || !rescheduleAppt) return;
    setRescheduleLoading(true);

    try {
      const res = await fetch(`/appointments/${rescheduleAppt.id}/reschedule`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          patient_id: profile.id,
          new_slot_id: rescheduleSlotId,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        alert("Reschedule failed: " + (data.error || "Unknown error"));
        setRescheduleLoading(false);
        return;
      }

      // Update local state with new slot data
      const { data: updatedSlot } = await supabase
        .from("appointment_slots")
        .select("slot_date, slot_time, duration_minutes, facility_id, facilities(name, district, province)")
        .eq("id", rescheduleSlotId)
        .single();

      setAppointments(prev => prev.map(a => {
        if (a.id === rescheduleAppt.id) {
          return { ...a, slot_id: rescheduleSlotId, appointment_slots: updatedSlot };
        }
        return a;
      }));

      setRescheduleAppt(null);
      setRescheduleSlots([]);
      setRescheduleSlotId(null);
    } catch (err) {
      alert("Reschedule failed: " + err.message);
    }
    setRescheduleLoading(false);
  }

  function goTo(id) {
    if (id === "find-clinic") { navigate("/clinic-search"); return; }
    if (id === "staff-appointments" || id === "patients") { navigate("/staff-dashboard"); return; }
  setActiveTab(id);
  setSidebarOpen(false);
    
  }
    async function saveAvailability() {
  if (!latestAssignment) return;
  setSavingAvailability(true);

  const { error } = await supabase
    .from("staff_assignments")
    .update({ availability })
    .eq("id", latestAssignment.id);

  setSavingAvailability(false);

  if (error) {
    setAvailabilityStatus({ type: "error", message: error.message });
    return;
  }

  setAvailabilityStatus({ type: "success", message: "Availability saved successfully." });
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
  const upcomingAppts    = appointments.filter((a) => a.status === "booked");
  const activeQueue      = queue.filter((q) => q.status === "waiting" || q.status === "called");
  const latestAssignment = staffAssignments[0] || null;

  // ── Content renderers ─────────────────────────────────────────────────────
  function renderOverview() {
    if (profile?.role === "admin") {
      return (
        <div className="db-section">
          <h2 className="db-section-title">Admin Overview</h2>
          <div className="db-stat-grid">
            <div className="db-stat-card db-stat-blue">
              <span className="db-stat-num">{appointments.length}</span>
              <span className="db-stat-label">Recent Appointments</span>
            </div>
            <div className="db-stat-card db-stat-red">
              <span className="db-stat-num">{unreadCount}</span>
              <span className="db-stat-label">Unread Notifications</span>
            </div>
            <div className="db-stat-card db-stat-green">
              <span className="db-stat-num">{staffAssignments.length}</span>
              <span className="db-stat-label">My Assignments</span>
            </div>
          </div>
        </div>
      );
    }

    if (profile?.role === "staff") {
  return (
    <div className="db-section">
      <h2 className="db-section-title">Staff Overview</h2>

      <div className="db-stat-grid">
        <div className="db-stat-card db-stat-green">
          <span className="db-stat-num">{appointments.length}</span>
          <span className="db-stat-label">Clinic Appointments</span>
        </div>
        <div className="db-stat-card db-stat-blue">
          <span className="db-stat-num">{staffAssignments.length}</span>
          <span className="db-stat-label">Assignments</span>
        </div>
        <div className="db-stat-card db-stat-red">
          <span className="db-stat-num">{unreadCount}</span>
          <span className="db-stat-label">Unread Notifications</span>
        </div>
      </div>

      {/* Current Facility */}
      {latestAssignment && (
        <div className="db-card" style={{ marginTop: 20 }}>
          <h3>Current Facility</h3>
          <p><strong>Name:</strong>     {latestAssignment.facilities?.name     || "—"}</p>
          <p><strong>District:</strong> {latestAssignment.facilities?.district || "—"}</p>
          <p><strong>Province:</strong> {latestAssignment.facilities?.province || "—"}</p>
          <p><strong>Role:</strong>     {latestAssignment.role                 || "—"}</p>
        </div>
      )}

      {/* Availability Editor */}
      {latestAssignment ? (
        <div className="db-card" style={{ marginTop: 20 }}>
          <h3>My Weekly Availability</h3>
          <p style={{ fontSize: 14, color: "#666", marginBottom: 16 }}>
            Mark the days you are available and set your working hours.
          </p>

          {availabilityStatus.message && (
            <div className={`status ${availabilityStatus.type}`} style={{ marginBottom: 12 }}>
              {availabilityStatus.message}
            </div>
          )}

          <div className="hours-grid">
            {DAYS.map((day) => {
              const entry = availability[day] || { available: false, start: "", end: "" };
              return (
                <div key={day} className="day-row">
                  <div className="day-name">
                    {day.charAt(0).toUpperCase() + day.slice(1)}
                  </div>

                  <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 14 }}>
                    <input
                      type="checkbox"
                      checked={entry.available}
                      onChange={(e) => updateAvailabilityDay(day, "available", e.target.checked)}
                    />
                    Available
                  </label>

                  <input
                    type="time"
                    className="input"
                    value={entry.start}
                    disabled={!entry.available}
                    onChange={(e) => updateAvailabilityDay(day, "start", e.target.value)}
                  />

                  <input
                    type="time"
                    className="input"
                    value={entry.end}
                    disabled={!entry.available}
                    onChange={(e) => updateAvailabilityDay(day, "end", e.target.value)}
                  />
                </div>
              );
            })}
          </div>

          <div style={{ marginTop: 20 }}>
            <button
              className="db-btn db-btn-reschedule"
              onClick={saveAvailability}
              disabled={savingAvailability}
            >
              {savingAvailability ? "Saving..." : "Save Availability"}
            </button>
          </div>
        </div>
      ) : (
        <div className="db-card" style={{ marginTop: 20 }}>
          <p style={{ color: "#666" }}>
            You have not been assigned to a facility yet. Please contact your admin.
          </p>
        </div>
      )}
    </div>
  );
}

    // Patient
    return (
      <div className="db-section">
        <h2 className="db-section-title">Overview</h2>
        <div className="db-stat-grid">
          <div className="db-stat-card db-stat-green">
            <span className="db-stat-num">{upcomingAppts.length}</span>
            <span className="db-stat-label">Upcoming Appointments</span>
          </div>
          <div className="db-stat-card db-stat-orange">
            <span className="db-stat-num">{upcomingAppts.filter((a) => a.queuePosition).length || activeQueue.length}</span>
            <span className="db-stat-label">Active Queue Entries</span>
          </div>
          <div className="db-stat-card db-stat-blue">
            <span className="db-stat-num">{appointments.length}</span>
            <span className="db-stat-label">Total Appointments</span>
          </div>
          <div className="db-stat-card db-stat-red">
            <span className="db-stat-num">{unreadCount}</span>
            <span className="db-stat-label">Unread Notifications</span>
          </div>
        </div>

        <div className="db-overview-appts">
          <h3 className="db-subsection-title">Upcoming Appointments</h3>
          {upcomingAppts.length === 0 ? (
            <p className="db-empty">
              No upcoming appointments.{" "}
              <span className="db-link" onClick={() => navigate("/clinic-search")}>Book one now</span>
            </p>
          ) : (
            <div className="db-appt-list">
              {upcomingAppts.map((appt) => (
                <div key={appt.id} className="db-appt-card">
                  <div className="db-appt-clinic">
                    {appt.appointment_slots?.facilities?.name || appt.facilities?.name || "Clinic"}
                  </div>
                  <div className="db-appt-details">
                    <span><FiCalendar /> {formatDate(appt.appointment_slots?.slot_date)}</span>
                    <span><FiClock /> {formatTime(appt.appointment_slots?.slot_time)}</span>
                    {appt.appointment_slots?.duration_minutes && (
                      <span><FiClock /> {appt.appointment_slots.duration_minutes} min</span>
                    )}
                    {appt.queuePosition && <span><FiHash /> Position #{appt.queuePosition}</span>}
                  </div>
                  <div className="db-appt-reason">{appt.reason}</div>
                  <div className="db-appt-actions">
                    <button className="db-btn db-btn-reschedule" onClick={() => openReschedule(appt)}>Reschedule</button>
                    <button className="db-btn db-btn-cancel"     onClick={() => cancelAppointment(appt)}>Cancel</button>
                  </div>
                  <Badge status={appt.status} />
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  }

  function renderAppointments() {
    return (
      <div className="db-section">
        <h2 className="db-section-title">
          {profile?.role === "patient" ? "My Appointments" : "Clinic Appointments"}
        </h2>
        {appointments.length === 0 ? <p>No appointments found.</p> : (
          <div className="db-list">
            {appointments.map((appt) => (
              <div className="db-card" key={appt.id}>
                <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center" }}>
                  <div>
                    <h3 style={{ marginBottom: 6 }}>
                      {appt.appointment_slots?.facilities?.name || appt.facilities?.name || "Facility"}
                    </h3>
                    <p>{formatDate(appt.appointment_slots?.slot_date)} {formatTime(appt.appointment_slots?.slot_time)}</p>
                    <p>{appt.appointment_slots?.facilities?.district || appt.facilities?.district || "—"}</p>
                  </div>
                  <Badge status={appt.status} />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  function renderPatientQueue() {
    return (
      <div className="db-section">
        <h2 className="db-section-title">My Queue</h2>
        {queue.length === 0 ? <p>No queue entries found.</p> : (
          <div className="db-list">
            {queue.map((entry) => (
              <div className="db-card" key={entry.id}>
                <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center" }}>
                  <div>
                    <h3 style={{ marginBottom: 6 }}>{entry.facilities?.name || "Facility"}</h3>
                    <p>Joined: {formatDateTime(entry.joined_at)}</p>
                    <p>Position: {entry.position ?? "—"}</p>
                  </div>
                  <Badge status={entry.status} />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  function renderNotifications() {
    return (
      <div className="db-section">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12 }}>
          <h2 className="db-section-title">Notifications</h2>
          <button className="db-sidebar-logout" onClick={markAllRead}>Mark all as read</button>
        </div>
        {notifications.length === 0 ? <p>No notifications found.</p> : (
          <div className="db-list">
            {notifications.map((item) => (
              <div className="db-card" key={item.id}>
                <h3 style={{ marginBottom: 6 }}>{item.title || "Notification"}</h3>
                <p>{item.message || "—"}</p>
                <p style={{ marginTop: 8, opacity: 0.75 }}>{formatDateTime(item.sent_at)}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  function renderProfile() {
    return (
      <div className="db-section">
        <h2 className="db-section-title">Profile</h2>
        {!editProfile ? (
          <div className="db-card">
            <p><strong>Name:</strong> {profile?.name || "—"} {profile?.surname || ""}</p>
            <p><strong>Email:</strong> {profile?.email || "—"}</p>
            <p><strong>Phone:</strong> {profile?.phone_number || "—"}</p>
            <p><strong>Date of Birth:</strong> {formatDate(profile?.dob)}</p>
            <p><strong>Role:</strong> {profile?.role || "patient"}</p>
            <button className="db-sidebar-logout" style={{ marginTop: 16 }} onClick={() => setEditProfile(true)}>
              Edit Profile
            </button>
          </div>
        ) : (
          <div className="db-card">
            <div style={{ display: "grid", gap: 12 }}>
              {[
                ["First name",    "name",         "text"],
                ["Surname",       "surname",      "text"],
                ["Phone number",  "phone_number", "tel"],
                ["Date of Birth", "dob",          "date"],
              ].map(([placeholder, key, type]) => (
                <input key={key} className="db-input" placeholder={placeholder} type={type}
                  value={editForm[key] || ""}
                  onChange={(e) => setEditForm((prev) => ({ ...prev, [key]: e.target.value }))} />
              ))}
            </div>
            <div style={{ display: "flex", gap: 10, marginTop: 16 }}>
              <button className="db-sidebar-logout" onClick={() => setEditProfile(false)}>Cancel</button>
              <button className="db-sidebar-logout" onClick={saveProfile}>
                {savingProfile ? "Saving…" : "Save"}
              </button>
            </div>
          </div>
        )}
      </div>
    );
  }

  function renderContent() {
  switch (activeTab) {
    case "overview":
      return renderOverview();

    case "appointments":
    case "staff-appointments":
      return renderAppointments();

    case "queue":
      return profile?.role === "patient"
        ? renderPatientQueue()
        : <div className="db-section"><h2 className="db-section-title">Patient Queue</h2><p>Staff queue management UI goes here.</p></div>;

    case "staff-queue":
    case "patients":
      return (
        <div className="db-section">
          <h2 className="db-section-title">
            {activeTab === "staff-queue" ? "Patient Queue" : "Patients"}
          </h2>
          <div className="db-card" style={{ textAlign: "center", padding: 40 }}>
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
            if (profile?.id === profileId) setProfile((prev) => ({ ...prev, role: newRole }));
          }}
        />
      );

    case "staff":
      return <AdminStaff />;

    case "clinics":
      return <AdminClinics />;

    case "notifications":
      return renderNotifications();

    case "profile":
      return renderProfile();

    case "policy":
      return <div className="db-section"><h2 className="db-section-title">Service Policy</h2><p>Policy content goes here.</p></div>;

    case "settings":
      return <div className="db-section"><h2 className="db-section-title">Settings</h2><p>Patient settings page goes here.</p></div>;

    default:
      return <div className="db-section"><h2>{activeTab}</h2></div>;
  }
}

  // ── Layout ────────────────────────────────────────────────────────────────
  return (
    <div className="db-root">
      <aside className={`db-sidebar ${sidebarOpen ? "open" : ""}`}>
        <div className="db-sidebar-brand"><FaStethoscope style={{ color: "white" }} /> QueueCare</div>
        <nav className="db-nav">
          {NAV_ITEMS.map((item) => (
            <button key={item.id}
              className={`db-nav-item ${activeTab === item.id ? "db-nav-active" : ""}`}
              onClick={() => goTo(item.id)}>
              {item.icon} {item.label}
            </button>
          ))}
        </nav>
        <button className="db-sidebar-logout" onClick={handleLogout}><FiLogOut /> Logout</button>
      </aside>

      <div className="db-main">
        <header className="db-topbar">
          <div>{NAV_ITEMS.find((n) => n.id === activeTab)?.label || "Dashboard"}</div>
          <div>Hi, {profile?.name || "User"}{profile?.role ? ` (${profile.role})` : ""}</div>
        </header>
        <main className="db-content">{renderContent()}</main>
      </div>

      {/* Reschedule modal */}
      {rescheduleAppt && (
        <div className="db-modal-overlay" onClick={() => setRescheduleAppt(null)}>
          <div className="db-modal" onClick={(e) => e.stopPropagation()}>
            <h3>Reschedule Appointment</h3>
            <p>Current: {formatDate(rescheduleAppt.appointment_slots?.slot_date)} at {formatTime(rescheduleAppt.appointment_slots?.slot_time)}</p>

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
                    <div key={slot.id}
                      className={`db-reschedule-slot ${isSelected ? "db-reschedule-selected" : ""}`}
                      onClick={() => setRescheduleSlotId(slot.id)}>
                      <span><FiCalendar /> {formatDate(slot.slot_date)}</span>
                      <span><FiClock /> {formatTime(slot.slot_time)}</span>
                      <span>{slot.duration_minutes} min</span>
                      <span>{spotsLeft} spot{spotsLeft !== 1 ? "s" : ""} left</span>
                      {isSelected && <span className="db-check">✔</span>}
                    </div>
                  );
                })}
              </div>
            )}

            <div className="db-modal-actions">
              <button className="db-btn db-btn-reschedule"
                disabled={!rescheduleSlotId || rescheduleLoading} onClick={confirmReschedule}>
                {rescheduleLoading ? "Saving…" : "Confirm Reschedule"}
              </button>
              <button className="db-btn db-btn-secondary" onClick={() => setRescheduleAppt(null)}>Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}