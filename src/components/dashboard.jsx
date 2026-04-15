import { useEffect, useMemo, useState } from "react";
import { onAuthStateChanged, signOut } from "firebase/auth";
import { auth } from "../firebase";
import { createClient } from "@supabase/supabase-js";
import { useNavigate } from "react-router-dom";
import Applications from "./Applications.jsx";
import "./Dashboard.css";

const supabase = createClient(
  "https://vktjtxljwzyakobkkhol.supabase.co",
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZrdGp0eGxqd3p5YWtvYmtraG9sIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzU1ODE1ODYsImV4cCI6MjA5MTE1NzU4Nn0.LVNelw--Xp1t_weGNwhPGMrzqg0iS7J5TAXw9ZM6aUA"
);

const PATIENT_NAV = [
  { id: "overview", icon: "⊞", label: "Overview" },
  { id: "appointments", icon: "📅", label: "Appointments" },
  { id: "queue", icon: "🔢", label: "My Queue" },
  { id: "notifications", icon: "🔔", label: "Notifications" },
  { id: "profile", icon: "👤", label: "Profile" },
  { id: "find-clinic", icon: "🏥", label: "Find a Clinic" },
  { id: "policy", icon: "📄", label: "Service Policy" },
  { id: "settings", icon: "⚙️", label: "Settings" },
];

const STAFF_NAV = [
  { id: "overview", icon: "⊞", label: "Overview" },
  { id: "staff-appointments", icon: "📅", label: "Clinic Appointments" },
  { id: "staff-queue", icon: "📋", label: "Patient Queue" },
  { id: "patients", icon: "🧑‍⚕️", label: "Patients" },
  { id: "notifications", icon: "🔔", label: "Notifications" },
  { id: "profile", icon: "👤", label: "Profile" },
];

const ADMIN_NAV = [
  { id: "overview", icon: "⊞", label: "Overview" },
  { id: "applications", icon: "📑", label: "Applications" },
  { id: "staff", icon: "🧑‍⚕️", label: "Staff Management" },
  { id: "clinics", icon: "🏥", label: "Clinics" },
  { id: "notifications", icon: "🔔", label: "Notifications" },
  { id: "profile", icon: "👤", label: "Profile" },
];

const STATUS_COLOR = {
  booked: { bg: "#e8f5e9", color: "#2E7D32", label: "Booked" },
  cancelled: { bg: "#fdecea", color: "#c62828", label: "Cancelled" },
  completed: { bg: "#e3f2fd", color: "#1565c0", label: "Completed" },
  waiting: { bg: "#fff8e1", color: "#e65100", label: "Waiting" },
  called: { bg: "#f3e5f5", color: "#6a1b9a", label: "Called" },
};

function Badge({ status }) {
  const s = STATUS_COLOR[status] || {
    bg: "#f0f0f0",
    color: "#555",
    label: status || "Unknown",
  };

  return (
    <span style={{ background: s.bg, color: s.color }} className="db-badge">
      {s.label}
    </span>
  );
}

function formatDate(val) {
  if (!val) return "—";
  return new Date(val).toLocaleDateString("en-ZA", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function formatTime(val) {
  if (!val) return "";
  return String(val).slice(0, 5);
}

function formatDateTime(val) {
  if (!val) return "—";
  return new Date(val).toLocaleString("en-ZA", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function Dashboard() {
  const [profile, setProfile] = useState(null);
  const [appointments, setAppointments] = useState([]);
  const [queue, setQueue] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [staffAssignments, setStaffAssignments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("overview");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [editProfile, setEditProfile] = useState(false);
  const [editForm, setEditForm] = useState({});
  const [savingProfile, setSavingProfile] = useState(false);

  const navigate = useNavigate();

  const NAV_ITEMS = useMemo(() => {
    if (profile?.role === "admin") return ADMIN_NAV;
    if (profile?.role === "staff") return STAFF_NAV;
    return PATIENT_NAV;
  }, [profile?.role]);

  useEffect(() => {
    let unsub = null;
    let cancelled = false;

    async function loadAll() {
      try {
        const {
          data: { user: supabaseUser },
        } = await supabase.auth.getUser();

        unsub = onAuthStateChanged(auth, async (firebaseUser) => {
          if (cancelled) return;

          const resolvedFirebaseUser = firebaseUser || auth.currentUser || null;

          const authProvider = supabaseUser
            ? "supabase"
            : resolvedFirebaseUser
            ? "firebase"
            : null;

          const providerUserId =
            supabaseUser?.id || resolvedFirebaseUser?.uid || null;

          if (!authProvider || !providerUserId) {
            setLoading(false);
            navigate("/signin", { replace: true });
            return;
          }

          const { data: prof, error: profErr } = await supabase
            .from("profiles")
            .select("*")
            .eq("auth_provider", authProvider)
            .eq("provider_user_id", providerUserId)
            .maybeSingle();

          if (cancelled) return;

          if (profErr) {
            console.error("Profile fetch error:", profErr);
          }

          let resolvedProfile = prof;

          if (!resolvedProfile) {
            resolvedProfile = {
              id: null,
              auth_provider: authProvider,
              provider_user_id: providerUserId,
              email: supabaseUser?.email || resolvedFirebaseUser?.email || "",
              name:
                supabaseUser?.user_metadata?.name ||
                resolvedFirebaseUser?.displayName?.split(" ")[0] ||
                "",
              surname:
                supabaseUser?.user_metadata?.surname ||
                resolvedFirebaseUser?.displayName?.split(" ").slice(1).join(" ") ||
                "",
              phone_number:
                supabaseUser?.phone || resolvedFirebaseUser?.phoneNumber || "",
              dob: supabaseUser?.user_metadata?.dob || null,
              sex: supabaseUser?.user_metadata?.sex || "",
              role: supabaseUser?.user_metadata?.role || "patient",
            };
          }

          setProfile(resolvedProfile);
          setEditForm({
            name: resolvedProfile.name || "",
            surname: resolvedProfile.surname || "",
            phone_number: resolvedProfile.phone_number || "",
            dob: resolvedProfile.dob || "",
          });

          if (!resolvedProfile.id) {
            setAppointments([]);
            setQueue([]);
            setNotifications([]);
            setStaffAssignments([]);
            setUnreadCount(0);
            setLoading(false);
            return;
          }

          const promises = [
            supabase
              .from("notifications")
              .select("*")
              .eq("profile_id", resolvedProfile.id)
              .order("sent_at", { ascending: false })
              .limit(30),
          ];

          if (resolvedProfile.role === "patient") {
            promises.unshift(
              supabase
                .from("appointments")
                .select(
                  "*, appointment_slots(slot_date, slot_time, duration_minutes), facilities(name, district, province)"
                )
                .eq("patient_id", resolvedProfile.id)
                .order("booked_at", { ascending: false })
                .limit(20),
              supabase
                .from("queue_entries")
                .select("*, facilities(name, district)")
                .eq("patient_id", resolvedProfile.id)
                .order("joined_at", { ascending: false })
                .limit(10)
            );
          } else {
            promises.unshift(
              supabase
                .from("staff_assignments")
                .select("*, facilities(name, district, province)")
                .eq("profile_id", resolvedProfile.id)
                .order("created_at", { ascending: false }),
              supabase
                .from("appointments")
                .select(
                  "*, appointment_slots(slot_date, slot_time, duration_minutes), facilities(name, district, province)"
                )
                .order("booked_at", { ascending: false })
                .limit(20)
            );
          }

          const results = await Promise.all(promises);

          if (cancelled) return;

          if (resolvedProfile.role === "patient") {
            const [apptRes, queueRes, notifRes] = results;
            setAppointments(apptRes.data || []);
            setQueue(queueRes.data || []);
            setNotifications(notifRes.data || []);
            setStaffAssignments([]);
            setUnreadCount((notifRes.data || []).filter((n) => !n.is_read).length);
          } else {
            const [assignmentRes, apptRes, notifRes] = results;
            setStaffAssignments(assignmentRes.data || []);
            setAppointments(apptRes.data || []);
            setQueue([]);
            setNotifications(notifRes.data || []);
            setUnreadCount((notifRes.data || []).filter((n) => !n.is_read).length);
          }

          setLoading(false);
        });
      } catch (err) {
        console.error("Dashboard auth load error:", err);
        if (!cancelled) {
          setLoading(false);
          navigate("/signin", { replace: true });
        }
      }
    }

    loadAll();

    return () => {
      cancelled = true;
      if (unsub) unsub();
    };
  }, [navigate]);

  async function handleLogout() {
    await supabase.auth.signOut();
    await signOut(auth);
    navigate("/signin");
  }

  async function markAllRead() {
    if (!profile?.id) return;

    await supabase
      .from("notifications")
      .update({ is_read: true })
      .eq("profile_id", profile.id);

    setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
    setUnreadCount(0);
  }

  async function saveProfile() {
    if (!profile?.id) return;

    setSavingProfile(true);

    const { error } = await supabase
      .from("profiles")
      .update(editForm)
      .eq("id", profile.id);

    if (!error) {
      setProfile((prev) => ({ ...prev, ...editForm }));
      setEditProfile(false);
    }

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

  const upcomingAppts = appointments.filter((a) => a.status === "booked");
  const activeQueue = queue.filter(
    (q) => q.status === "waiting" || q.status === "called"
  );
  const latestAssignment = staffAssignments[0] || null;

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

          {latestAssignment && (
            <div className="db-card" style={{ marginTop: 20 }}>
              <h3>Current Facility</h3>
              <p>
                <strong>Name:</strong> {latestAssignment.facilities?.name || "—"}
              </p>
              <p>
                <strong>District:</strong>{" "}
                {latestAssignment.facilities?.district || "—"}
              </p>
              <p>
                <strong>Province:</strong>{" "}
                {latestAssignment.facilities?.province || "—"}
              </p>
              <p>
                <strong>Assignment Role:</strong> {latestAssignment.role || "—"}
              </p>
            </div>
          )}
        </div>
      );
    }

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
  }

  function renderAppointments() {
    return (
      <div className="db-section">
        <h2 className="db-section-title">
          {profile?.role === "patient" ? "My Appointments" : "Clinic Appointments"}
        </h2>

        {appointments.length === 0 ? (
          <p>No appointments found.</p>
        ) : (
          <div className="db-list">
            {appointments.map((appt) => (
              <div className="db-card" key={appt.id}>
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    gap: 12,
                    alignItems: "center",
                  }}
                >
                  <div>
                    <h3 style={{ marginBottom: 6 }}>
                      {appt.facilities?.name || "Facility"}
                    </h3>
                    <p>
                      {formatDate(appt.appointment_slots?.slot_date)}{" "}
                      {formatTime(appt.appointment_slots?.slot_time)}
                    </p>
                    <p>{appt.facilities?.district || "—"}</p>
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

        {queue.length === 0 ? (
          <p>No queue entries found.</p>
        ) : (
          <div className="db-list">
            {queue.map((entry) => (
              <div className="db-card" key={entry.id}>
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    gap: 12,
                    alignItems: "center",
                  }}
                >
                  <div>
                    <h3 style={{ marginBottom: 6 }}>
                      {entry.facilities?.name || "Facility"}
                    </h3>
                    <p>
                      Joined: {formatDateTime(entry.joined_at)}
                    </p>
                    <p>
                      Position: {entry.position ?? "—"}
                    </p>
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
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            gap: 12,
          }}
        >
          <h2 className="db-section-title">Notifications</h2>
          <button className="db-sidebar-logout" onClick={markAllRead}>
            Mark all as read
          </button>
        </div>

        {notifications.length === 0 ? (
          <p>No notifications found.</p>
        ) : (
          <div className="db-list">
            {notifications.map((item) => (
              <div className="db-card" key={item.id}>
                <h3 style={{ marginBottom: 6 }}>
                  {item.title || "Notification"}
                </h3>
                <p>{item.message || "—"}</p>
                <p style={{ marginTop: 8, opacity: 0.75 }}>
                  {formatDateTime(item.sent_at)}
                </p>
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
            <p>
              <strong>Name:</strong> {profile?.name || "—"} {profile?.surname || ""}
            </p>
            <p>
              <strong>Email:</strong> {profile?.email || "—"}
            </p>
            <p>
              <strong>Phone:</strong> {profile?.phone_number || "—"}
            </p>
            <p>
              <strong>Date of Birth:</strong> {formatDate(profile?.dob)}
            </p>
            <p>
              <strong>Role:</strong> {profile?.role || "patient"}
            </p>

            <button
              className="db-sidebar-logout"
              style={{ marginTop: 16 }}
              onClick={() => setEditProfile(true)}
            >
              Edit Profile
            </button>
          </div>
        ) : (
          <div className="db-card">
            <div style={{ display: "grid", gap: 12 }}>
              <input
                className="db-input"
                placeholder="First name"
                value={editForm.name || ""}
                onChange={(e) =>
                  setEditForm((prev) => ({ ...prev, name: e.target.value }))
                }
              />
              <input
                className="db-input"
                placeholder="Surname"
                value={editForm.surname || ""}
                onChange={(e) =>
                  setEditForm((prev) => ({ ...prev, surname: e.target.value }))
                }
              />
              <input
                className="db-input"
                placeholder="Phone number"
                value={editForm.phone_number || ""}
                onChange={(e) =>
                  setEditForm((prev) => ({
                    ...prev,
                    phone_number: e.target.value,
                  }))
                }
              />
              <input
                className="db-input"
                type="date"
                value={editForm.dob || ""}
                onChange={(e) =>
                  setEditForm((prev) => ({ ...prev, dob: e.target.value }))
                }
              />
            </div>

            <div style={{ display: "flex", gap: 10, marginTop: 16 }}>
              <button className="db-sidebar-logout" onClick={() => setEditProfile(false)}>
                Cancel
              </button>
              <button className="db-sidebar-logout" onClick={saveProfile}>
                {savingProfile ? "Saving..." : "Save"}
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
        return profile?.role === "patient" ? (
          renderPatientQueue()
        ) : (
          <div className="db-section">
            <h2 className="db-section-title">Patient Queue</h2>
            <p>Staff queue management UI goes here.</p>
          </div>
        );

      case "staff-queue":
        return (
          <div className="db-section">
            <h2 className="db-section-title">Patient Queue</h2>
            <p>Staff queue management UI goes here.</p>
          </div>
        );

      case "patients":
        return (
          <div className="db-section">
            <h2 className="db-section-title">Patients</h2>
            <p>Staff patient list UI goes here.</p>
          </div>
        );

      case "applications":
        return (
          <Applications
            profile={profile}
            onRoleUpdated={(profileId, newRole) => {
              if (profile?.id === profileId) {
                setProfile((prev) => ({ ...prev, role: newRole }));
              }
            }}
          />
        );

      case "staff":
        return (
          <div className="db-section">
            <h2 className="db-section-title">Staff Management</h2>
            <p>Admin staff management UI goes here.</p>
          </div>
        );

      case "clinics":
        return (
          <div className="db-section">
            <h2 className="db-section-title">Clinics</h2>
            <p>Admin clinic management UI goes here.</p>
          </div>
        );

      case "notifications":
        return renderNotifications();

      case "profile":
        return renderProfile();

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
        return (
          <div className="db-section">
            <h2>{activeTab}</h2>
          </div>
        );
    }
  }

  return (
    <div className="db-root">
      <aside className={`db-sidebar ${sidebarOpen ? "open" : ""}`}>
        <div className="db-sidebar-brand">🩺 QueueCare</div>

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
          🚪 Logout
        </button>
      </aside>

      <div className="db-main">
        <header className="db-topbar">
          <div>{NAV_ITEMS.find((n) => n.id === activeTab)?.label || "Dashboard"}</div>
          <div>
            Hi, {profile?.name || "User"}
            {profile?.role ? ` (${profile.role})` : ""}
          </div>
        </header>

        <main className="db-content">{renderContent()}</main>
      </div>
    </div>
  );
}