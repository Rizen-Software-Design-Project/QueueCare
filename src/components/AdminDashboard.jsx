// AdminDashboard.jsx

import { useState, useEffect } from "react";
import { signOut } from "firebase/auth";
import { auth } from "../firebase";
import { supabase } from "#lib/supabase";
import { useNavigate } from "react-router-dom";
import { FiLogOut } from "react-icons/fi";
import { FaStethoscope } from "react-icons/fa";

import { ADMIN_NAV } from "./DashboardHelpers";
import { NotificationsPanel, ProfilePanel } from "./DashboardPanels";
import Applications from "./Applications.jsx";
import AdminClinics from "./AdminClinics";
import AdminStaff   from "./AdminStaff.jsx";
import AnalyticsAdmin from "./AnalyticsDashboardAdmin";
import "./Dashboard.css";

export default function AdminDashboard({ profile: initialProfile }) {
  const navigate = useNavigate();

  const [profile,       setProfile]       = useState(initialProfile);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount,   setUnreadCount]   = useState(0);
  const [activeTab,     setActiveTab]     = useState("overview");
  const [sidebarOpen,   setSidebarOpen]   = useState(false);

  const [editProfile,   setEditProfile]   = useState(false);
  const [editForm,      setEditForm]      = useState({
    name:         profile.name         || "",
    surname:      profile.surname      || "",
    phone_number: profile.phone_number || "",
    dob:          profile.dob          || "",
  });
  const [savingProfile, setSavingProfile] = useState(false);

  // ── Load notifications ────────────────────────────────────────────────────
  useEffect(() => {
    supabase
      .from("notifications")
      .select("*")
      .eq("profile_id", profile.id)
      .eq("channel", "in_app")
      .order("sent_at", { ascending: false })
      .limit(30)
      .then(({ data }) => {
        setNotifications(data || []);
        setUnreadCount((data || []).filter((n) => !n.is_read).length);
      });
  }, [profile.id]);

  // ── Actions ───────────────────────────────────────────────────────────────
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

  async function saveProfile() {
    setSavingProfile(true);
    const { error } = await supabase.from("profiles").update(editForm).eq("id", profile.id);
    if (!error) { setProfile((prev) => ({ ...prev, ...editForm })); setEditProfile(false); }
    setSavingProfile(false);
  }

  // ── Content ───────────────────────────────────────────────────────────────
  function renderContent() {
    switch (activeTab) {
      case "overview":
        return (
          <div className="db-section">
            <h2 className="db-section-title">Admin Overview</h2>
            <div className="db-stat-grid">
              <div className="db-stat-card db-stat-red">
                <span className="db-stat-num">{unreadCount}</span>
                <span className="db-stat-label">Unread Notifications</span>
              </div>
            </div>
            <div className="db-card" style={{ marginTop: 20 }}>
              <p style={{ color: "#6b7280", marginBottom: 16 }}>
                Manage staff, clinics, and role applications from the sidebar.
              </p>
              <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                    <button className="db-btn db-btn-reschedule" onClick={() => setActiveTab("applications")}>
                        View Applications
                    </button>
                    <button className="db-btn db-btn-reschedule" onClick={() => setActiveTab("staff")}>
                        Manage Staff
                    </button>
                    <button className="db-btn db-btn-reschedule" onClick={() => setActiveTab("clinics")}>
                        Manage Clinics
                    </button>
                    <button className="db-btn db-btn-reschedule" onClick={() => setActiveTab("analytics")}>
                        View Analytics
                    </button>
                    </div>
              </div>
            </div>
          </div>
        );

      case "applications":
        return (
          <Applications
            profile={profile}
            onRoleUpdated={(profileId, newRole) => {
              if (profile.id === profileId) setProfile((prev) => ({ ...prev, role: newRole }));
            }}
          />
        );

      case "staff":   return <AdminStaff />;
      case "clinics": return <AdminClinics />;
      case "analytics": return <AnalyticsAdmin />;
        
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
            onFormChange={(k, v) => setEditForm((p) => ({ ...p, [k]: v }))}
          />
        );

      default:
        return <div className="db-section"><h2>{activeTab}</h2></div>;
    }
  }

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="db-root">
      <aside className={`db-sidebar ${sidebarOpen ? "open" : ""}`}>
        <div className="db-sidebar-brand"><FaStethoscope style={{ color: "white" }} /> QueueCare</div>
        <nav className="db-nav">
          {ADMIN_NAV.map((item) => (
            <button
              key={item.id}
              className={`db-nav-item ${activeTab === item.id ? "db-nav-active" : ""}`}
              onClick={() => { setSidebarOpen(false); setActiveTab(item.id); }}
            >
              {item.icon} {item.label}
            </button>
          ))}
        </nav>
        <button className="db-sidebar-logout" onClick={handleLogout}><FiLogOut /> Logout</button>
      </aside>

      <div className="db-main">
        <header className="db-topbar">
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <button className="db-hamburger" onClick={() => setSidebarOpen((v) => !v)}>☰</button>
            <span>{ADMIN_NAV.find((n) => n.id === activeTab)?.label || "Admin Dashboard"}</span>
          </div>
          <div>Hi, {profile.name || "Admin"} (admin)</div>
        </header>

        <main className="db-content">{renderContent()}</main>
      </div>
    </div>
  );
}