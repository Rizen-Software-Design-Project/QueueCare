import { useEffect, useState } from "react";
import { createClient } from "@supabase/supabase-js";
import { useNavigate } from "react-router-dom";
import "./Dashboard.css";

const supabase = createClient(
  "https://vktjtxljwzyakobkkhol.supabase.co",
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZrdGp0eGxqd3p5YWtvYmtraG9sIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzU1ODE1ODYsImV4cCI6MjA5MTE1NzU4Nn0.LVNelw--Xp1t_weGNwhPGMrzqg0iS7J5TAXw9ZM6aUA"
);

const NAV_ITEMS = [
  { id: "overview", icon: "⊞", label: "Overview" },
  { id: "appointments", icon: "📅", label: "Appointments" },
  { id: "queue", icon: "🔢", label: "My Queue" },
  { id: "notifications", icon: "🔔", label: "Notifications" },
  { id: "profile", icon: "👤", label: "Profile" },
  { id: "find-clinic", icon: "🏥", label: "Find a Clinic" },
  { id: "policy", icon: "📄", label: "Service Policy" },
  { id: "settings", icon: "⚙️", label: "Settings" },
];

const STATUS_COLOR = {
  booked: { bg: "#e8f5e9", color: "#2E7D32", label: "Booked" },
  cancelled: { bg: "#fdecea", color: "#c62828", label: "Cancelled" },
  completed: { bg: "#e3f2fd", color: "#1565c0", label: "Completed" },
  waiting: { bg: "#fff8e1", color: "#e65100", label: "Waiting" },
  called: { bg: "#f3e5f5", color: "#6a1b9a", label: "Called" },
};

function Badge({ status }) {
  const s = STATUS_COLOR[status] || { bg: "#f0f0f0", color: "#555", label: status };
  return <span style={{ background: s.bg, color: s.color }} className="db-badge">{s.label}</span>;
}

function formatDate(val) {
  if (!val) return "—";
  return new Date(val).toLocaleDateString("en-ZA", { day: "numeric", month: "short", year: "numeric" });
}
function formatTime(val) {
  if (!val) return "";
  return val.slice(0, 5);
}
function formatDateTime(val) {
  if (!val) return "—";
  return new Date(val).toLocaleString("en-ZA", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

export default function Dashboard() {
  const [profile, setProfile] = useState(null);
  const [appointments, setAppointments] = useState([]);
  const [queue, setQueue] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("overview");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [editProfile, setEditProfile] = useState(false);
  const [editForm, setEditForm] = useState({});
  const [savingProfile, setSavingProfile] = useState(false);
  const navigate = useNavigate();

 useEffect(() => {
    async function loadAll() {
      const { data: authData, error: authErr } = await supabase.auth.getUser();
      if (authErr || !authData.user) {
        navigate("/signin", { replace: true });
        return;
      }

      const { data: prof } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", authData.user.id)
        .maybeSingle();

      let resolvedProfile = prof;
      if (!resolvedProfile) {
        // If trigger-created profile is delayed/missing, keep user in dashboard using auth metadata.
        resolvedProfile = {
          id: authData.user.id,
          email: authData.user.email || "",
          name: authData.user.user_metadata?.name || "",
          surname: authData.user.user_metadata?.surname || "",
          phone_number: authData.user.phone || "",
          dob: authData.user.user_metadata?.dob || null,
          sex: authData.user.user_metadata?.sex || "",
          role: authData.user.user_metadata?.role || "patient",
        };
      }

      setProfile(resolvedProfile);
      setEditForm({
        name: resolvedProfile.name || "",
        surname: resolvedProfile.surname || "",
        phone_number: resolvedProfile.phone_number || "",
        dob: resolvedProfile.dob || "",
      });

      const [apptRes, queueRes, notifRes] = await Promise.all([
        supabase.from("appointments")
          .select("*, appointment_slots(slot_date, slot_time, duration_minutes, facility_id, facilities(name, district, province))")
          .eq("patient_id", resolvedProfile.id).order("booked_at", { ascending: false }).limit(20),
        supabase.from("queue_entries")
          .select("*, facilities(name, district)")
          .eq("patient_id", resolvedProfile.id).order("joined_at", { ascending: false }).limit(10),
        supabase.from("notifications")
          .select("*").eq("profile_id", resolvedProfile.id).order("sent_at", { ascending: false }).limit(30),
      ]);

      const appts = apptRes.data || [];

      // For each booked appointment, compute queue position (order among bookings for that slot)
      const bookedAppts = appts.filter(a => a.status === "booked");
      if (bookedAppts.length > 0) {
        const slotIds = [...new Set(bookedAppts.map(a => a.slot_id))];
        const { data: allSlotBookings } = await supabase
          .from("appointments")
          .select("id, slot_id, booked_at")
          .in("slot_id", slotIds)
          .eq("status", "booked")
          .order("booked_at", { ascending: true });

        if (allSlotBookings) {
          const positionMap = {};
          const slotGroups = {};
          for (const b of allSlotBookings) {
            if (!slotGroups[b.slot_id]) {
              slotGroups[b.slot_id] = [];
            }
            slotGroups[b.slot_id].push(b.id);
          }
          for (const [slotId, ids] of Object.entries(slotGroups)) {
            for (let i = 0; i < ids.length; i++) {
              positionMap[ids[i]] = i + 1;
            }
          }
          for (const appt of appts) {
            appt.queuePosition = positionMap[appt.id] || null;
          }
        }
      }

      setAppointments(appts);
      setQueue(queueRes.data || []);
      setNotifications(notifRes.data || []);
      setUnreadCount((notifRes.data || []).filter(n => !n.is_read).length);
      setLoading(false);
    }
    loadAll();
  }, [navigate]);
// <-- FIXED dependency array placement

  async function handleLogout() {
    await supabase.auth.signOut();
    navigate("/signin");
  }

  async function markAllRead() {
    if (!profile) return;
    await supabase.from("notifications").update({ is_read: true }).eq("profile_id", profile.id);
    setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
    setUnreadCount(0);
  }

  async function saveProfile() {
    setSavingProfile(true);
    await supabase.from("profiles").update(editForm).eq("id", profile.id);
    setProfile(prev => ({ ...prev, ...editForm }));
    setEditProfile(false);
    setSavingProfile(false);
  }

  function goTo(id) {
    if (id === "find-clinic") {
      navigate("/clinic-search");
      return;
    }
    setActiveTab(id);
    setSidebarOpen(false);
  }

  if (loading) {
    return (
      <div className="db-splash">
        <div className="db-spinner" />
        <p>Loading your dashboard…</p>
      </div>
    );
  }

  const upcomingAppts = appointments.filter(a => a.status === "booked");
  const queuedAppts = upcomingAppts.filter(a => a.queuePosition);

  function renderContent() {
    switch (activeTab) {
      case "overview":
        return (
          <div className="db-section">
            <h2 className="db-section-title">Overview</h2>

            <div className="db-stat-grid">
              <div className="db-stat-card db-stat-green">
                <span className="db-stat-num">{upcomingAppts.length}</span>
                <span className="db-stat-label">Upcoming Appointments</span>
              </div>
              <div className="db-stat-card db-stat-orange">
                <span className="db-stat-num">{queuedAppts.length}</span>
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

            {/* Upcoming Appointments */}
            {upcomingAppts.length > 0 && (
              <div className="db-overview-appts">
                <h3 className="db-subsection-title">Upcoming Appointments</h3>
                <div className="db-appt-list">
                  {upcomingAppts.map(appt => (
                    <div key={appt.id} className="db-appt-card">
                      <div className="db-appt-clinic">{appt.appointment_slots?.facilities?.name || "Clinic"}</div>
                      <div className="db-appt-details">
                        <span>📅 {formatDate(appt.appointment_slots?.slot_date)}</span>
                        <span>🕐 {formatTime(appt.appointment_slots?.slot_time)}</span>
                        {appt.appointment_slots?.duration_minutes && (
                          <span>⏱ {appt.appointment_slots.duration_minutes} min</span>
                        )}
                        {appt.queuePosition && (
                          <span>🔢 Position #{appt.queuePosition}</span>
                        )}
                      </div>
                      <div className="db-appt-reason">{appt.reason}</div>
                      <Badge status={appt.status} />
                    </div>
                  ))}
                </div>
              </div>
            )}
            {upcomingAppts.length === 0 && (
              <div className="db-overview-appts">
                <h3 className="db-subsection-title">Upcoming Appointments</h3>
                <p className="db-empty">No upcoming appointments. <span className="db-link" onClick={() => navigate("/clinic-search")}>Book one now</span></p>
              </div>
            )}
          </div>
        );

      default:
        return <div className="db-section"><h2>{activeTab}</h2></div>;
    }
  }

  return (
    <div className="db-root">
      <aside className="db-sidebar">
        <div className="db-sidebar-brand">🩺 QueueCare</div>

        <nav className="db-nav">
          {NAV_ITEMS.map(item => (
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
          🚪 Logout
        </button>
      </aside>

      <div className="db-main">
        <header className="db-topbar">
          <div>{NAV_ITEMS.find(n => n.id === activeTab)?.label}</div>
          <div>Hi, {profile?.name}</div>
        </header>

        <main className="db-content">{renderContent()}</main>
      </div>
    </div>
  );
}