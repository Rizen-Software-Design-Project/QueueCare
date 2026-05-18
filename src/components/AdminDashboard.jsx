import { useState, useEffect } from "react";
import { signOut } from "firebase/auth";
import { auth } from "../firebase";
import { supabase } from "#lib/supabase";
import { useNavigate } from "react-router-dom";
import { FiLogOut } from "react-icons/fi";
import { FaStethoscope } from "react-icons/fa";
import AIAssistant from "./AIAssistant";

import { ADMIN_NAV } from "./DashboardHelpers";
import { NotificationsPanel, ProfilePanel } from "./DashboardPanels";
import Applications from "./Applications.jsx";
import AdminClinics from "./AdminClinics";
import AdminStaff   from "./AdminStaff.jsx";
import AnalyticsAdmin from "./AnalyticsDashboardAdmin";
import ProfilePage from "./ProfilePage.jsx";
import ServicePolicy from "./ServicePolicy.jsx";
import "./Dashboard.css";

export default function AdminDashboard({ profile: initialProfile }) {
  const navigate = useNavigate();

  const [profile,       setProfile]       = useState(initialProfile);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount,   setUnreadCount]   = useState(0);
  const [activeTab,     setActiveTab]     = useState("overview");
  const [sidebarOpen,   setSidebarOpen]   = useState(false);



 /*=========== Notifications Fetching & Actions ==========*/
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

  // Actions
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


   /*=========== Content ==========*/
  function renderContent() {
    const navState = {
    admin: profile,
    authProvider:  profile.auth_provider,
    providerUserId: profile.provider_user_id,
  };

    switch (activeTab) {
  case "overview":
    return (
      <section className="db-section">
        <h2 className="db-section-title">Admin Overview</h2>

        <section className="db-stat-grid">
          <article className="db-stat-card db-stat-red">
            <strong className="db-stat-num">
              {unreadCount}
            </strong>

            <p className="db-stat-label">
              Unread Notifications
            </p>
          </article>
        </section>

        <section
          className="db-card"
          style={{ marginTop: 20 }}
        >
          <p
            style={{
              color: "#6b7280",
              marginBottom: 16,
            }}
          >
            Manage staff, clinics, and role applications
            from the sidebar.
          </p>

          <nav
            style={{
              display: "flex",
              gap: 10,
              flexWrap: "wrap",
            }}
          >
            <section
              style={{
                display: "flex",
                gap: 10,
                flexWrap: "wrap",
              }}
            >
              <button
                className="db-btn db-btn-reschedule"
                onClick={() =>
                  setActiveTab("applications")
                }
              >
                View Applications
              </button>

              <button
                className="db-btn db-btn-reschedule"
                onClick={() => setActiveTab("staff")}
              >
                Manage Staff
              </button>

              <button
                className="db-btn db-btn-reschedule"
                onClick={() =>
                  setActiveTab("clinics")
                }
              >
                Manage Clinics
              </button>

              <button
                className="db-btn db-btn-reschedule"
                onClick={() =>
                  setActiveTab("analytics")
                }
              >
                View Analytics
              </button>
            </section>
          </nav>
        </section>
      </section>
    );

  case "applications":
    return (
      <Applications
        profile={profile}
        onRoleUpdated={(profileId, newRole) => {
          if (profile.id === profileId)
            setProfile((prev) => ({
              ...prev,
              role: newRole,
            }));
        }}
      />
    );

  case "staff":
    return <AdminStaff />;

  case "clinics":
    return <AdminClinics />;

  case "analytics":
    return <AnalyticsAdmin />;

  case "policy":
     return(<ServicePolicy />);
    

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
    
  
  case "profile":
      return <ProfilePage profile={profile} />;

  default:
    return (
      <section className="db-section">
        <h2>{activeTab}</h2>
      </section>
    );
}
}

  /*=========== Render the content ==========*/
  return (
  <main className="db-root">
    <aside
      className={`db-sidebar ${
        sidebarOpen ? "open" : ""
      }`}
    >
      <header className="db-sidebar-brand">
        <FaStethoscope style={{ color: "white" }} />
        <strong>QueueCare</strong>
      </header>

      <nav className="db-nav">
        {ADMIN_NAV.map((item) => (
          <button
            key={item.id}
            className={`db-nav-item ${
              activeTab === item.id
                ? "db-nav-active"
                : ""
            }`}
            onClick={() => {
              setSidebarOpen(false);
              setActiveTab(item.id);}}
          >
            {item.icon} {item.label}
          </button>
        ))}
      </nav>

      <footer>
        <button
          className="db-sidebar-logout"
          onClick={handleLogout}
        >
          <FiLogOut /> Logout
        </button>
      </footer>
    </aside>

    <section className="db-main">
      <header className="db-topbar">
        <section
          style={{
            display: "flex",
            alignItems: "center",
            gap: 12,
          }}
        >
          <button
            className="db-hamburger"
            onClick={() =>
              setSidebarOpen((v) => !v)
            }
          >
            ☰
          </button>

          <strong>
            {ADMIN_NAV.find(
              (n) => n.id === activeTab
            )?.label || "Admin Dashboard"}
          </strong>
        </section>

        <p>
          Hi, {profile.name || "Admin"} (admin)
        </p>
      </header>

      <main className="db-content">
        {renderContent()}
      </main>
    </section>

    <AIAssistant
      context={{
        role: "admin",
        profile,
        pageContext: activeTab,
      }}
    />
  </main>
);
}