import { useEffect, useState } from "react";
import { createClient } from "@supabase/supabase-js";
import { useNavigate } from "react-router-dom";
import "./Dashboard.css";

const supabase = createClient(
  "https://vktjtxljwzyakobkkhol.supabase.co",
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZrdGp0eGxqd3p5YWtvYmtraG9sIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzU1ODE1ODYsImV4cCI6MjA5MTE1NzU4Nn0.LVNelw--Xp1t_weGNwhPGMrzqg0iS7J5TAXw9ZM6aUA"
);

export default function Dashboard() {
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  return (
    <div className="dashboard">

      <div className="dash-header">
        <h1>Welcome 👋</h1>
      </div>

      <div className="dash-card">
        <h2>Your Profile</h2>
        <p><strong>Name:</strong> {profile?.name} {profile?.surname}</p>
        <p><strong>Email:</strong> {profile?.email}</p>
        <p><strong>Role:</strong> {profile?.role}</p>
        <p><strong>ID Number:</strong> {profile?.id}</p>
      </div>

      <div className="dash-grid">
        <div className="dash-card clickable">
          <h3>📅 Book Appointment</h3>
          <p>Schedule a visit with a healthcare provider</p>
        </div>

        <div className="dash-card clickable">
          <h3>📋 My Appointments</h3>
          <p>View your upcoming and past bookings</p>
        </div>

        <div className="dash-card clickable">
          <h3>💊 Medical Records</h3>
          <p>Access your health information</p>
        </div>

        <div className="dash-card clickable">
          <h3>⚙️ Settings</h3>
          <p>Update your profile and preferences</p>
        </div>
      </div>
    </div>
  );
}