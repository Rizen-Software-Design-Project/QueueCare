import { useEffect, useState } from "react";
import { createClient } from "@supabase/supabase-js";
import { useNavigate } from "react-router-dom";
import "./Dashboard.css";

const supabase = createClient(
  "https://vktjtxljwzyakobkkhol.supabase.co",
  "YOUR_ANON_KEY"
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
    // MOCK DATA
    const mockProfile = {
      id: "12345",
      name: "John",
      surname: "Doe",
      email: "john@example.com",
      phone_number: "0812345678",
      dob: "2000-05-15",
      sex: "Male",
      role: "patient",
    };

    const mockAppointments = [
      {
        id: 1,
        status: "booked",
        appointment_type: "General Checkup",
        reason: "Routine visit",
        appointment_slots: { slot_date: "2026-04-20", slot_time: "09:30" },
        facilities: { name: "City Clinic", district: "Johannesburg", province: "Gauteng" },
      },
      {
        id: 2,
        status: "completed",
        appointment_type: "Dental",
        appointment_slots: { slot_date: "2026-03-10", slot_time: "11:00" },
        facilities: { name: "Smile Dental", district: "Sandton", province: "Gauteng" },
      },
    ];

    const mockQueue = [
      {
        id: 1,
        queue_position: 3,
        status: "waiting",
        entry_type: "Walk-in",
        joined_at: new Date(),
        facilities: { name: "City Clinic", district: "Johannesburg" },
      },
    ];

    const mockNotifications = [
      {
        id: 1,
        message: "Your appointment is confirmed.",
        sent_at: new Date(),
        channel: "email",
        is_read: false,
      },
      {
        id: 2,
        message: "You are next in queue.",
        sent_at: new Date(),
        channel: "sms",
        is_read: false,
      },
    ];

    setProfile(mockProfile);
    setEditForm({
      name: mockProfile.name,
      surname: mockProfile.surname,
      phone_number: mockProfile.phone_number,
      dob: mockProfile.dob,
    });

    setAppointments(mockAppointments);
    setQueue(mockQueue);
    setNotifications(mockNotifications);
    setUnreadCount(mockNotifications.filter(n => !n.is_read).length);

    setLoading(false);
  }, []);

  async function handleLogout() {
    console.log("Logout disabled in preview mode");
  }

  async function markAllRead() {
    setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
    setUnreadCount(0);
  }

  async function saveProfile() {
    setSavingProfile(true);
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
  const activeQueue = queue.filter(q => q.status === "waiting" || q.status === "called");

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