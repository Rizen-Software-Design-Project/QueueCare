import { useState, useEffect } from "react";
import { signOut } from "firebase/auth";
import { auth } from "../firebase";
import { supabase } from "#lib/supabase";
import { useNavigate } from "react-router-dom";
import { FiLogOut } from "react-icons/fi";
import { FaStethoscope } from "react-icons/fa";
import AIAssistant from "./AIAssistant";

import { STAFF_NAV, normalizeAvailability } from "./DashboardHelpers";
import { OverviewPanel, NotificationsPanel, ProfilePanel } from "./DashboardPanels";
import { StaffHistoryView } from "./AppointmentHistory";
import "./Dashboard.css";

import StaffClinicManagement from "./StaffClinicManagement";
import WalkIn               from "./Walkin";
import Schedule             from "./Schedule";
import ProfilePage          from "./ProfilePage";
import AnalyticsDashboardStaff from "./AnalyticsDashboardStaff";
import ServicePolicy        from "./ServicePolicy";

export default function StaffDashboard({ profile: initialProfile }) {
  const navigate = useNavigate();

  const [profile,           setProfile]           = useState(initialProfile);
  const [staffAssignments,  setStaffAssignments]  = useState([]);
  const [notifications,     setNotifications]     = useState([]);
  const [unreadCount,       setUnreadCount]       = useState(0);
  const [activeTab,         setActiveTab]         = useState("overview");
  const [sidebarOpen,       setSidebarOpen]       = useState(false);

  const [availability,       setAvailability]       = useState(normalizeAvailability(null));
  const [savingAvailability, setSavingAvailability] = useState(false);
  const [availabilityStatus, setAvailabilityStatus] = useState({ type: "", message: "" });

  // ── Load data ─────────────────────────────────────────────────────────────
  useEffect(() => {
    async function load() {
      const [{ data: assignments }, { data: notif }] = await Promise.all([
        supabase
          .from("staff_assignments")
          .select("*, facilities(name, district, province)")
          .eq("profile_id", profile.id),
        supabase
          .from("notifications")
          .select("*")
          .eq("profile_id", profile.id)
          .eq("channel", "in_app")
          .order("sent_at", { ascending: false })
          .limit(30),
      ]);
      localStorage.setItem("staff_id", profile.id);
      localStorage.setItem("facility_id", assignments?.[0]?.facility_id ?? "");
      setStaffAssignments(assignments || []);
      setAvailability(normalizeAvailability(assignments?.[0]?.availability ?? null));
      setNotifications(notif || []);
      setUnreadCount((notif || []).filter((n) => !n.is_read).length);
    }
    load();
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

  async function saveAvailability() {
    const assignment = staffAssignments[0];
    if (!assignment) return;
    setSavingAvailability(true);
    const { error } = await supabase
      .from("staff_assignments")
      .update({ availability })
      .eq("id", assignment.id);
    setSavingAvailability(false);
    setAvailabilityStatus(
      error
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

  const latestAssignment = staffAssignments[0] || null;
  const facilityId   = latestAssignment?.facility_id ?? null;
  const facilityName = latestAssignment?.facilities?.name ?? "";

  function goTo(id) {
    setSidebarOpen(false);
    setActiveTab(id);
  }

  // ── Content ───────────────────────────────────────────────────────────────
  function renderContent() {
    switch (activeTab) {
      case "overview":
        return (
          <>
            <OverviewPanel
              profile={profile}
              appointments={[]}
              upcomingAppts={[]}
              activeQueue={null}
              unreadCount={unreadCount}
              staffAssignments={staffAssignments}
              latestAssignment={latestAssignment}
              queueData={null}
              availability={availability}
              availabilityStatus={availabilityStatus}
              savingAvailability={savingAvailability}
              onSaveAvailability={saveAvailability}
              onUpdateAvailabilityDay={updateAvailabilityDay}
              isAppointmentToday={false}
              slotDate={null}
              slotTime={null}
            />
            <div className="db-card" style={{ marginTop: 20 }}>
              <p style={{ color: "#6b7280", marginBottom: 16 }}>Quick Actions</p>
              <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                <button className="db-btn db-btn-reschedule" onClick={() => goTo("staff-appointments")}>Clinic Appointments</button>
                <button className="db-btn db-btn-reschedule" onClick={() => goTo("staff-queue")}>Patient Queue</button>
                <button className="db-btn db-btn-reschedule" onClick={() => goTo("walk-in")}>Walk-In Patients</button>
                <button className="db-btn db-btn-reschedule" onClick={() => goTo("analytics")}>View Analytics</button>
                <button className="db-btn db-btn-reschedule" onClick={() => goTo("schedule")}>Availability</button>
              </div>
            </div>
          </>
        );

      case "staff-appointments":
      case "patients":
      case "staff-queue":
        return (
          <StaffClinicManagement
            facilityId={facilityId}
            facilityName={facilityName}
            authProvider={profile.auth_provider}
            providerUserId={profile.provider_user_id}
          />
        );

      case "walk-in":
        return (
          <WalkIn
            facilityId={facilityId}
            facilityName={facilityName}
            onBack={() => goTo("overview")}
          />
        );

      case "analytics":
        return <AnalyticsDashboardStaff />;

      case "schedule":
        return (
          <Schedule
            staffId={profile.id}
            facilityId={facilityId}
            onBack={() => goTo("overview")}
          />
        );

      case "appointment-history":
        return <StaffHistoryView facilityId={facilityId} />;

      case "notifications":
        return (
          <NotificationsPanel
            notifications={notifications}
            unreadCount={unreadCount}
            onMarkAllRead={markAllRead}
          />
        );

      case "profile":
        return <ProfilePage profile={profile} onBack={() => goTo("overview")} />;

      case "policy":
        return <ServicePolicy />;

      default:
        return <section className="db-section"><h2>{activeTab}</h2></section>;
    }
  }

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="db-root">
      <aside className={`db-sidebar ${sidebarOpen ? "open" : ""}`}>
        <div className="db-sidebar-brand"><FaStethoscope style={{ color: "white" }} /> QueueCare</div>
        <nav className="db-nav">
          {STAFF_NAV.map((item) => (
            <button
              key={item.id}
              className={`db-nav-item ${activeTab === item.id ? "db-nav-active" : ""}`}
              onClick={() => goTo(item.id)}
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
            <span>{STAFF_NAV.find((n) => n.id === activeTab)?.label || "Staff Dashboard"}</span>
          </div>
          <div>Hi, {profile.name || "Staff"} (staff)</div>
        </header>

        <main className="db-content">{renderContent()}</main>
      </div>

      <AIAssistant
        context={{
          role: "staff",
          profile,
          facilityId,
          facilityName,
          pageContext: activeTab,
        }}
      />
    </div>
  );
}