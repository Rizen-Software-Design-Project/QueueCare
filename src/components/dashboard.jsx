import { useEffect, useState } from "react";
import { createClient } from "@supabase/supabase-js";
import { useNavigate } from "react-router-dom";
import "./Dashboard.css";

const supabase = createClient(
  "https://vktjtxljwzyakobkkhol.supabase.co",
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZrdGp0eGxqd3p5YWtvYmtraG9sIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzU1ODE1ODYsImV4cCI6MjA5MTE1NzU4Nn0.LVNelw--Xp1t_weGNwhPGMrzqg0iS7J5TAXw9ZM6aUA"
);

const NAV_ITEMS = [
  { id: "overview",      icon: "⊞",  label: "Overview" },
  { id: "appointments",  icon: "📅", label: "Appointments" },
  { id: "queue",         icon: "🔢", label: "My Queue" },
  { id: "notifications", icon: "🔔", label: "Notifications" },
  { id: "profile",       icon: "👤", label: "Profile" },
  { id: "find-clinic",   icon: "🏥", label: "Find a Clinic" },
  { id: "policy",        icon: "📄", label: "Service Policy" },
  { id: "settings",      icon: "⚙️", label: "Settings" },
];

const STATUS_COLOR = {
  booked:    { bg: "#e8f5e9", color: "#2E7D32", label: "Booked" },
  cancelled: { bg: "#fdecea", color: "#c62828", label: "Cancelled" },
  completed: { bg: "#e3f2fd", color: "#1565c0", label: "Completed" },
  waiting:   { bg: "#fff8e1", color: "#e65100", label: "Waiting" },
  called:    { bg: "#f3e5f5", color: "#6a1b9a", label: "Called" },
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
  const [profile, setProfile]             = useState(null);
  const [appointments, setAppointments]   = useState([]);
  const [queue, setQueue]                 = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading]             = useState(true);
  const [activeTab, setActiveTab]         = useState("overview");
  const [sidebarOpen, setSidebarOpen]     = useState(false);
  const [unreadCount, setUnreadCount]     = useState(0);
  const [editProfile, setEditProfile]     = useState(false);
  const [editForm, setEditForm]           = useState({});
  const [savingProfile, setSavingProfile] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    async function loadAll() {
      const { data: authData } = await supabase.auth.getUser();
      if (!authData.user) { navigate("/signin"); return; }

      const { data: prof } = await supabase
        .from("profiles").select("*").eq("email", authData.user.email).single();
      if (!prof) { navigate("/signin"); return; }

      setProfile(prof);
      setEditForm({ name: prof.name || "", surname: prof.surname || "", phone_number: prof.phone_number || "", dob: prof.dob || "" });

      const [apptRes, queueRes, notifRes] = await Promise.all([
        supabase.from("appointments")
          .select("*, appointment_slots(slot_date, slot_time, duration_minutes), facilities(name, district, province)")
          .eq("patient_id", prof.id).order("booked_at", { ascending: false }).limit(20),
        supabase.from("queue_entries")
          .select("*, facilities(name, district)")
          .eq("patient_id", prof.id).order("joined_at", { ascending: false }).limit(10),
        supabase.from("notifications")
          .select("*").eq("profile_id", prof.id).order("sent_at", { ascending: false }).limit(30),
      ]);

      setAppointments(apptRes.data || []);
      setQueue(queueRes.data || []);
      setNotifications(notifRes.data || []);
      setUnreadCount((notifRes.data || []).filter(n => !n.is_read).length);
      setLoading(false);
    }
    loadAll();
  }, [navigate]);

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
    if (id === "find-clinic") { navigate("/clinic-search"); return; }
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
  const activeQueue   = queue.filter(q => q.status === "waiting" || q.status === "called");

  function renderContent() {
    switch (activeTab) {

      case "overview": return (
        <div className="db-section">
          <h2 className="db-section-title">Overview</h2>

          <div className="db-stat-grid">
            <div className="db-stat-card db-stat-green">
              <span className="db-stat-num">{upcomingAppts.length}</span>
              <span className="db-stat-label">Upcoming Appointments</span>
            </div>
            <div className="db-stat-card db-stat-orange">
              <span className="db-stat-num">{activeQueue.length}</span>
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

          <div className="db-two-col">
            <div className="db-card">
              <div className="db-card-header">
                <h3>Recent Appointments</h3>
                <button className="db-link-btn" onClick={() => setActiveTab("appointments")}>View all →</button>
              </div>
              {appointments.length === 0
                ? <p className="db-empty">No appointments yet.</p>
                : appointments.slice(0, 4).map(a => (
                  <div key={a.id} className="db-list-row">
                    <div>
                      <p className="db-list-primary">{a.facilities?.name || "—"}</p>
                      <p className="db-list-sub">{formatDate(a.appointment_slots?.slot_date)} {formatTime(a.appointment_slots?.slot_time)}</p>
                    </div>
                    <Badge status={a.status} />
                  </div>
                ))
              }
            </div>

            <div className="db-card">
              <div className="db-card-header">
                <h3>Notifications</h3>
                <button className="db-link-btn" onClick={() => setActiveTab("notifications")}>View all →</button>
              </div>
              {notifications.length === 0
                ? <p className="db-empty">No notifications.</p>
                : notifications.slice(0, 4).map(n => (
                  <div key={n.id} className={`db-list-row ${!n.is_read ? "db-unread-row" : ""}`}>
                    <div style={{ flex: 1 }}>
                      <p className="db-list-primary">{n.message}</p>
                      <p className="db-list-sub">{formatDateTime(n.sent_at)} · {n.channel}</p>
                    </div>
                    {!n.is_read && <span className="db-dot" />}
                  </div>
                ))
              }
            </div>
          </div>

          <div className="db-card">
            <h3 className="db-card-solo-title">Quick Actions</h3>
            <div className="db-quick-grid">
              <button className="db-quick-btn" onClick={() => navigate("/clinic-search")}><span>🏥</span><span>Find a Clinic</span></button>
              <button className="db-quick-btn" onClick={() => setActiveTab("appointments")}><span>📅</span><span>Appointments</span></button>
              <button className="db-quick-btn" onClick={() => setActiveTab("queue")}><span>🔢</span><span>Queue Status</span></button>
              <button className="db-quick-btn" onClick={() => setActiveTab("profile")}><span>👤</span><span>Edit Profile</span></button>
            </div>
          </div>
        </div>
      );

      case "appointments": return (
        <div className="db-section">
          <h2 className="db-section-title">My Appointments</h2>
          <div className="db-card">
            {appointments.length === 0
              ? <p className="db-empty">You have no appointments on record.</p>
              : appointments.map(a => (
                <div key={a.id} className="db-appt-row">
                  <div className="db-appt-date-col">
                    <span className="db-appt-date">{formatDate(a.appointment_slots?.slot_date)}</span>
                    <span className="db-appt-time">{formatTime(a.appointment_slots?.slot_time)}</span>
                  </div>
                  <div className="db-appt-info">
                    <p className="db-list-primary">{a.facilities?.name || "Unknown Facility"}</p>
                    <p className="db-list-sub">{a.facilities?.district}{a.facilities?.province ? `, ${a.facilities.province}` : ""}</p>
                    {a.reason && <p className="db-list-sub">Reason: {a.reason}</p>}
                  </div>
                  <div className="db-appt-right">
                    <Badge status={a.status} />
                    <span className="db-list-sub" style={{ marginTop: 4 }}>{a.appointment_type}</span>
                  </div>
                </div>
              ))
            }
          </div>
        </div>
      );

      case "queue": return (
        <div className="db-section">
          <h2 className="db-section-title">My Queue</h2>
          <div className="db-card">
            {queue.length === 0
              ? <p className="db-empty">You are not in any queues.</p>
              : queue.map(q => (
                <div key={q.id} className="db-appt-row">
                  <div className="db-appt-date-col">
                    <span className="db-appt-date" style={{ fontSize: "1.8rem", fontWeight: 800, color: "#2E7D32" }}>#{q.queue_position ?? "—"}</span>
                    <span className="db-appt-time">Position</span>
                  </div>
                  <div className="db-appt-info">
                    <p className="db-list-primary">{q.facilities?.name || "Unknown Facility"}</p>
                    <p className="db-list-sub">{q.facilities?.district}</p>
                    <p className="db-list-sub">Joined: {formatDateTime(q.joined_at)}</p>
                    {q.wait_minutes_actual != null && <p className="db-list-sub">Wait time: {q.wait_minutes_actual} min</p>}
                  </div>
                  <div className="db-appt-right">
                    <Badge status={q.status} />
                    <span className="db-list-sub" style={{ marginTop: 4 }}>{q.entry_type}</span>
                  </div>
                </div>
              ))
            }
          </div>
        </div>
      );

      case "notifications": return (
        <div className="db-section">
          <div className="db-section-header-row">
            <h2 className="db-section-title" style={{ margin: 0 }}>Notifications</h2>
            {unreadCount > 0 && <button className="db-action-btn" onClick={markAllRead}>Mark all as read</button>}
          </div>
          <div className="db-card" style={{ marginTop: 16 }}>
            {notifications.length === 0
              ? <p className="db-empty">No notifications.</p>
              : notifications.map(n => (
                <div key={n.id} className={`db-notif-row ${!n.is_read ? "db-unread-row" : ""}`}>
                  <div className="db-notif-icon">
                    {n.channel === "sms" ? "💬" : n.channel === "email" ? "📧" : n.channel === "push" ? "📲" : "🔔"}
                  </div>
                  <div className="db-notif-body">
                    <p className="db-list-primary">{n.message}</p>
                    <p className="db-list-sub">{formatDateTime(n.sent_at)} · via {n.channel}</p>
                  </div>
                  {!n.is_read && <span className="db-dot" />}
                </div>
              ))
            }
          </div>
        </div>
      );

      case "profile": return (
        <div className="db-section">
          <h2 className="db-section-title">Profile</h2>
          <div className="db-card">
            <div className="db-profile-avatar">
              {(profile?.name?.[0] || "?").toUpperCase()}{(profile?.surname?.[0] || "").toUpperCase()}
            </div>
            {!editProfile ? (
              <>
                <div className="db-profile-grid">
                  {[
                    ["First Name",    profile?.name],
                    ["Surname",       profile?.surname],
                    ["Email",         profile?.email],
                    ["Phone",         profile?.phone_number || "—"],
                    ["Date of Birth", formatDate(profile?.dob)],
                    ["Sex",           profile?.sex || "—"],
                    ["Role",          profile?.role],
                    ["Patient ID",    profile?.id],
                  ].map(([label, val]) => (
                    <div key={label} className="db-profile-field">
                      <span className="db-field-label">{label}</span>
                      <span className={`db-field-value ${label === "Patient ID" ? "db-mono" : ""}`}>{val || "—"}</span>
                    </div>
                  ))}
                </div>
                <button className="db-action-btn" style={{ marginTop: 24 }} onClick={() => setEditProfile(true)}>✏️ Edit Profile</button>
              </>
            ) : (
              <div className="db-edit-form">
                {[
                  ["First Name",    "name",         "text"],
                  ["Surname",       "surname",       "text"],
                  ["Phone",         "phone_number",  "text"],
                  ["Date of Birth", "dob",           "date"],
                ].map(([label, field, type]) => (
                  <div key={field} className="db-form-group">
                    <label>{label}</label>
                    <input type={type} value={editForm[field] || ""} onChange={e => setEditForm(prev => ({ ...prev, [field]: e.target.value }))} />
                  </div>
                ))}
                <div className="db-form-actions">
                  <button className="db-action-btn" onClick={saveProfile} disabled={savingProfile}>{savingProfile ? "Saving…" : "💾 Save Changes"}</button>
                  <button className="db-ghost-btn" onClick={() => setEditProfile(false)}>Cancel</button>
                </div>
              </div>
            )}
          </div>
        </div>
      );

      case "policy": return (
        <div className="db-section">
          <h2 className="db-section-title">Service Policy</h2>
          <div className="db-card db-policy">
            {[
              ["📋 Appointment Booking", "Appointments can be booked up to 30 days in advance. Walk-in patients are accommodated based on queue availability. Each appointment slot is 15 minutes by default. Missed appointments without prior cancellation may affect your booking privileges."],
              ["🔢 Queue System", "Upon arrival, present your booking confirmation to reception. You will be assigned a queue number and notified via SMS or in-app when it is your turn. Queue positions are assigned in order of scheduled appointment time."],
              ["❌ Cancellation Policy", "Please cancel at least 24 hours before your scheduled appointment. Repeated no-shows (3 or more) may result in temporary suspension of online booking access."],
              ["🔒 Privacy & Data", "Your health information is stored securely and is only accessible to authorised healthcare staff. QueueCare complies with POPIA. You may request deletion of your data at any time by contacting support."],
              ["🆘 Emergencies", "QueueCare is not an emergency service. If you are experiencing a medical emergency, call 10177 (ambulance) or go directly to your nearest emergency department."],
              ["📞 Support", "For technical support or queries, contact us at support@queuecare.co.za or call 0800 000 000 (toll-free, Mon–Fri 08:00–17:00)."],
            ].map(([title, body]) => (
              <div key={title} className="db-policy-section">
                <h3>{title}</h3>
                <p>{body}</p>
              </div>
            ))}
          </div>
        </div>
      );

      case "settings": return (
        <div className="db-section">
          <h2 className="db-section-title">Settings</h2>
          <div className="db-card">
            <h3 className="db-card-solo-title">Notification Preferences</h3>
            {["SMS notifications", "Email notifications", "In-app notifications", "Push notifications"].map(pref => (
              <div key={pref} className="db-setting-row">
                <span>{pref}</span>
                <label className="db-toggle">
                  <input type="checkbox" defaultChecked />
                  <span className="db-toggle-slider" />
                </label>
              </div>
            ))}
          </div>
          <div className="db-card">
            <h3 className="db-card-solo-title">Account</h3>
            <div className="db-setting-row"><span>Linked email</span><span className="db-list-sub">{profile?.email}</span></div>
            <div className="db-setting-row"><span>Account role</span><span className="db-list-sub" style={{ textTransform: "capitalize" }}>{profile?.role}</span></div>
            <div style={{ marginTop: 20, display: "flex", gap: 12, flexWrap: "wrap" }}>
              <button className="db-action-btn" onClick={() => setActiveTab("profile")}>✏️ Edit Profile</button>
              <button className="db-danger-btn" onClick={handleLogout}>🚪 Sign Out</button>
            </div>
          </div>
          <div className="db-card">
            <h3 className="db-card-solo-title">Danger Zone</h3>
            <p className="db-list-sub" style={{ marginBottom: 16 }}>Permanently delete your account and all associated data. This action cannot be undone.</p>
            <button className="db-danger-btn">🗑️ Delete My Account</button>
          </div>
        </div>
      );

      default: return null;
    }
  }

  return (
    <div className="db-root">
      {sidebarOpen && <div className="db-overlay" onClick={() => setSidebarOpen(false)} />}

      <aside className={`db-sidebar ${sidebarOpen ? "db-sidebar-open" : ""}`}>
        <div className="db-sidebar-brand">
          <span className="db-brand-icon">🩺</span>
          <span className="db-brand-name">QueueCare</span>
        </div>

        <div className="db-sidebar-profile">
          <div className="db-avatar-sm">{(profile?.name?.[0] || "?").toUpperCase()}</div>
          <div>
            <p className="db-sidebar-name">{profile?.name} {profile?.surname}</p>
            <p className="db-sidebar-role">{profile?.role}</p>
          </div>
        </div>

        <nav className="db-nav">
          {NAV_ITEMS.map(item => (
            <button
              key={item.id}
              className={`db-nav-item ${activeTab === item.id ? "db-nav-active" : ""}`}
              onClick={() => goTo(item.id)}
            >
              <span className="db-nav-icon">{item.icon}</span>
              <span>{item.label}</span>
              {item.id === "notifications" && unreadCount > 0 && (
                <span className="db-nav-badge">{unreadCount}</span>
              )}
            </button>
          ))}
        </nav>

        <button className="db-sidebar-logout" onClick={handleLogout}>
          <span>🚪</span><span>Logout</span>
        </button>
      </aside>

      <div className="db-main">
        <header className="db-topbar">
          <button className="db-hamburger" onClick={() => setSidebarOpen(o => !o)}>☰</button>
          <div className="db-topbar-title">
            {NAV_ITEMS.find(n => n.id === activeTab)?.label || "Dashboard"}
          </div>
          <div className="db-topbar-right">
            <button className="db-topbar-notif" onClick={() => setActiveTab("notifications")} title="Notifications">
              🔔{unreadCount > 0 && <span className="db-topbar-badge">{unreadCount}</span>}
            </button>
            <div className="db-topbar-greeting">Hi, <strong>{profile?.name || "User"}</strong></div>
          </div>
        </header>

        <main className="db-content">
          {renderContent()}
        </main>
      </div>
    </div>
  );
}