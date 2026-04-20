/* eslint-disable react-refresh/only-export-components */
import { FiGrid, FiCalendar, FiHash, FiBell, FiUser, FiSettings, FiFileText } from "react-icons/fi";
import { FaHospital } from "react-icons/fa";

// ── Navigation configs ────────────────────────────────────────────────────────
// eslint-disable-next-line react-refresh/only-export-components
export const PATIENT_NAV = [
  { id: "overview",      icon: <FiGrid />,      label: "Overview" },
  { id: "appointments",  icon: <FiCalendar />,  label: "Appointments" },
  { id: "queue",         icon: <FiHash />,      label: "My Queue" },
  { id: "notifications", icon: <FiBell />,      label: "Notifications" },
  { id: "profile",       icon: <FiUser />,      label: "Profile" },
  { id: "find-clinic",   icon: <FaHospital />,  label: "Find a Clinic" },
  { id: "policy",        icon: <FiFileText />,  label: "Service Policy" },
  { id: "settings",      icon: <FiSettings />,  label: "Settings" },
];

export const STAFF_NAV = [
  { id: "overview",           icon: <FiGrid />,     label: "Overview" },
  { id: "staff-appointments", icon: <FiCalendar />, label: "Clinic Appointments" },
  { id: "staff-queue",        icon: <FiHash />,     label: "Patient Queue" },
  { id: "patients",           icon: <FiUser />,     label: "Patients" },
  { id: "notifications",      icon: <FiBell />,     label: "Notifications" },
  { id: "profile",            icon: <FiUser />,     label: "Profile" },
];

export const ADMIN_NAV = [
  { id: "overview",      icon: <FiGrid />,     label: "Overview" },
  { id: "applications",  icon: <FiFileText />, label: "Applications" },
  { id: "staff",         icon: <FiUser />,     label: "Staff Management" },
  { id: "clinics",       icon: <FaHospital />, label: "Clinics" },
  { id: "notifications", icon: <FiBell />,     label: "Notifications" },
  { id: "profile",       icon: <FiUser />,     label: "Profile" },
];

export const DAYS = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"];

// ── Status badge ──────────────────────────────────────────────────────────────
const STATUS_COLOR = {
  booked:    { bg: "#e8f5e9", color: "#2E7D32", label: "Booked" },
  cancelled: { bg: "#fdecea", color: "#c62828", label: "Cancelled" },
  complete: { bg: "#e3f2fd", color: "#1565c0", label: "Completed" },
  waiting:   { bg: "#fff8e1", color: "#e65100", label: "Waiting" },
  called:    { bg: "#f3e5f5", color: "#6a1b9a", label: "Called" },
};

export function Badge({ status }) {
  const s = STATUS_COLOR[status] || { bg: "#f0f0f0", color: "#555", label: status || "Unknown" };
  return <span style={{ background: s.bg, color: s.color }} className="db-badge">{s.label}</span>;
}

// ── Formatters ────────────────────────────────────────────────────────────────
export function formatDate(val) {
  if (!val) return "—";
  return new Date(val).toLocaleDateString("en-ZA", { day: "numeric", month: "short", year: "numeric" });
}

export function formatTime(val) {
  return val ? String(val).slice(0, 5) : "";
}

export function formatDateTime(val) {
  if (!val) return "—";
  return new Date(val).toLocaleString("en-ZA", {
    day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit",
  });
}

// ── Availability ──────────────────────────────────────────────────────────────
export function normalizeAvailability(availability) {
  const normalized = {};
  DAYS.forEach((day) => {
    normalized[day] = {
      available: availability?.[day]?.available ?? false,
      start:     availability?.[day]?.start     ?? "",
      end:       availability?.[day]?.end       ?? "",
    };
  });
  return normalized;
}

// ── Reminder sound (Web Audio API — no audio file needed) ─────────────────────
export function playReminderSound(urgent = false) {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();

    function beep(frequency, startTime, duration) {
      const oscillator = ctx.createOscillator();
      const gainNode   = ctx.createGain();
      oscillator.connect(gainNode);
      gainNode.connect(ctx.destination);
      oscillator.type = "sine";
      oscillator.frequency.setValueAtTime(frequency, startTime);
      gainNode.gain.setValueAtTime(0, startTime);
      gainNode.gain.linearRampToValueAtTime(0.4, startTime + 0.02);
      gainNode.gain.linearRampToValueAtTime(0,   startTime + duration);
      oscillator.start(startTime);
      oscillator.stop(startTime + duration);
    }

    if (urgent) {
      beep(880, ctx.currentTime,        0.18);
      beep(880, ctx.currentTime + 0.25, 0.18);
      beep(880, ctx.currentTime + 0.50, 0.18);
    } else {
      beep(660, ctx.currentTime,        0.22);
      beep(660, ctx.currentTime + 0.35, 0.22);
    }
  } catch {
    // AudioContext unavailable — fail silently
  }
}

import { useState, useEffect } from "react";

export function CountdownTimer({ slotDate, slotTime }) {
  const [timeLeft, setTimeLeft] = useState("");

  useEffect(() => {
    const appointmentDate = new Date(`${slotDate}T${slotTime}`);

    function tick() {
      const diff = appointmentDate - new Date();
      if (diff <= 0) {
        setTimeLeft("Now");
        return;
      }
      const hours   = Math.floor(diff / 3600000);
      const minutes = Math.floor((diff % 3600000) / 60000);
      const seconds = Math.floor((diff % 60000) / 1000);
      setTimeLeft(
        hours > 0
          ? `${hours}h ${minutes}m ${seconds}s`
          : `${minutes}m ${seconds}s`
      );
    }

    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [slotDate, slotTime]);

  return (
    <div style={{
      background: "#f0fdf4",
      borderRadius: 10,
      padding: "10px 14px",
      display: "flex",
      alignItems: "center",
      gap: 8,
      marginTop: 12,
    }}>
      <span style={{ fontSize: 18 }}>⏳</span>
      <div>
        <p style={{ margin: 0, fontSize: 12, color: "#16a34a", fontWeight: 600 }}>
          Time until your appointment
        </p>
        <p style={{ margin: 0, fontSize: 22, fontWeight: 700, color: "#14532d", letterSpacing: "-0.5px" }}>
          {timeLeft}
        </p>
      </div>
    </div>
  );
}