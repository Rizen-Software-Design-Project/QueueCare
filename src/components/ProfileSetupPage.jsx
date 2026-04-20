/**
 * ProfileSetupPage.jsx – redesigned with #1B5E20 primary color
 * All original logic preserved, UI/UX completely overhauled.
 */

import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { createClient } from "@supabase/supabase-js";
import Applications from "./Applications";

// ── Supabase (unchanged) ────────────────────────────────────────────────────
const SUPABASE_URL  = "https://vktjtxljwzyakobkkhol.supabase.co";
const SUPABASE_ANON = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZrdGp0eGxqd3p5YWtvYmtraG9sIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzU1ODE1ODYsImV4cCI6MjA5MTE1NzU4Nn0.LVNelw--Xp1t_weGNwhPGMrzqg0iS7J5TAXw9ZM6aUA";
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON);

// ── Utilities (unchanged) ───────────────────────────────────────────────────
async function sha256Hex(value) {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

function dobFromSAId(id) {
  if (!/^\d{13}$/.test(id)) return null;
  const yy = parseInt(id.slice(0, 2), 10);
  const mm = parseInt(id.slice(2, 4), 10);
  const dd = parseInt(id.slice(4, 6), 10);
  const yyyy = yy <= 25 ? 2000 + yy : 1900 + yy;
  const date = new Date(yyyy, mm - 1, dd);
  const isValid = date.getFullYear() === yyyy && date.getMonth() === mm - 1 && date.getDate() === dd;
  if (!isValid) return null;
  return `${yyyy}-${String(mm).padStart(2, "0")}-${String(dd).padStart(2, "0")}`;
}

// ── Shared micro-components (enhanced) ──────────────────────────────────────
function Err({ msg }) {
  if (!msg) return null;
  return (
    <div style={styles.errorContainer}>
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <circle cx="12" cy="12" r="10" />
        <line x1="12" y1="8" x2="12" y2="12" />
        <line x1="12" y1="16" x2="12.01" y2="16" />
      </svg>
      <span>{msg}</span>
    </div>
  );
}

function BackBtn({ onClick }) {
  return (
    <button type="button" style={styles.backBtn} onClick={onClick}>
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
        <polyline points="15 18 9 12 15 6" />
      </svg>
      Back
    </button>
  );
}

function Dots({ step, total = 2 }) {
  return (
    <div style={styles.dotsContainer}>
      {Array.from({ length: total }, (_, i) => (
        <div
          key={i}
          style={{
            ...styles.dot,
            width: i + 1 === step ? 28 : 8,
            backgroundColor: i + 1 <= step ? "#1B5E20" : "#E2E8F0",
            boxShadow: i + 1 === step ? "0 0 0 3px rgba(27,94,32,0.15)" : "none",
          }}
        />
      ))}
    </div>
  );
}

function StrengthBar({ score }) {
  const colors = ["#DC2626", "#F59E0B", "#1B5E20", "#0F3B1A"];
  if (!score) return null;
  return (
    <div style={styles.strengthContainer}>
      {[0, 1, 2, 3].map((i) => (
        <div
          key={i}
          style={{
            ...styles.strengthSegment,
            backgroundColor: i < score ? colors[score - 1] : "#E2E8F0",
          }}
        />
      ))}
    </div>
  );
}

function LoadingSpinner() {
  return (
    <div style={styles.spinner}>
      <div style={styles.spinnerCircle} />
    </div>
  );
}

// ── ProfileStep (enhanced UI, logic unchanged) ──────────────────────────────
function ProfileStep({ identity, selectedRole, onComplete }) {
  const [firstName, setFirstName] = useState(identity?.name    || "");
  const [surname,   setSurname]   = useState(identity?.surname  || "");
  const [sex,       setSex]       = useState(identity?.sex      || "");
  const [idNumber,  setIdNumber]  = useState("");
  const [email,     setEmail]     = useState(identity?.email    || "");
  const [phone,     setPhone]     = useState(identity?.phone    || "");
  const [error,     setError]     = useState("");
  const [loading,   setLoading]   = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");

    if (!firstName || !surname) { setError("Please enter your full name."); return; }
    if (!sex)                   { setError("Please select a gender.");       return; }
    if (!/^\d{13}$/.test(idNumber)) { setError("Enter a valid 13-digit SA ID number."); return; }

    setLoading(true);

    const hashed = await sha256Hex(idNumber).catch(() => null);
    if (!hashed) { setError("Could not hash ID. Please try again."); setLoading(false); return; }

    // Duplicate ID check
    const { data: existingId } = await supabase
      .from("profiles").select("id, auth_provider, provider_user_id")
      .eq("id_number", hashed).maybeSingle();

    if (existingId &&
        !(existingId.auth_provider === identity.auth_provider &&
          existingId.provider_user_id === identity.provider_user_id)) {
      setError("An account with this ID number already exists.");
      setLoading(false);
      return;
    }

    const normalizedEmail = (email || identity.email || "").trim().toLowerCase();
    const normalizedPhone = (phone || identity.phone || "").trim();

    if (normalizedPhone) {
      const { data: existingPhone } = await supabase
        .from("profiles")
        .select("id, auth_provider, provider_user_id")
        .eq("phone_number", normalizedPhone)
        .maybeSingle();

      if (
        existingPhone &&
        !(
          existingPhone.auth_provider === identity.auth_provider &&
          existingPhone.provider_user_id === identity.provider_user_id
        )
      ) {
        setError("An account with this phone number already exists.");
        setLoading(false);
        return;
      }
    }

    const dob = dobFromSAId(idNumber);
    if (!dob) {
      setError("The SA ID number does not contain a valid date of birth.");
      setLoading(false);
      return;
    }

    const commonProfile = {
      auth_provider:    identity.auth_provider,
      provider_user_id: identity.provider_user_id,
      name:         firstName,
      surname,
      sex,
      id_number:    hashed,
      dob,
      email:        normalizedEmail || null,
      phone_number: normalizedPhone || null,
    };

    if (selectedRole === "patient") {
      const { error: err } = await supabase.from("profiles").upsert(
        { ...commonProfile, role: "patient" },
        { onConflict: "auth_provider,provider_user_id" }
      );
      setLoading(false);
      if (err) {
        console.error("PROFILE INSERT ERROR:", err);
        setError(err.message || "Could not save profile.");
        setLoading(false);
        return;
      }
      onComplete({ status: "approved", role: "patient" });
      return;
    }

    if (selectedRole === "admin") {
      setLoading(false);
      onComplete({ status: "admin-onboarding", adminProfile: commonProfile });
      return;
    }

    setLoading(false);
    setError("Unexpected role in profile step.");
  }

  const totalDots = selectedRole === "admin" ? 3 : 2;

  return (
    <div style={styles.section}>
      <Dots step={2} total={totalDots} />
      <h2 style={styles.title}>Complete your profile</h2>
      <p style={styles.sub}>We need a few more details to get you started.</p>

      <form onSubmit={handleSubmit}>
        <div style={styles.twoColumnGrid}>
          <div>
            <label style={styles.label}>First name</label>
            <input
              style={styles.input}
              value={firstName}
              placeholder="Jane"
              onChange={(e) => setFirstName(e.target.value)}
              required
            />
          </div>
          <div>
            <label style={styles.label}>Surname</label>
            <input
              style={styles.input}
              value={surname}
              placeholder="Dlamini"
              onChange={(e) => setSurname(e.target.value)}
              required
            />
          </div>
        </div>

        <label style={styles.label}>Gender</label>
        <div style={styles.pillGroup}>
          {["male", "female", "other"].map((g) => (
            <button
              key={g}
              type="button"
              style={{
                ...styles.pill,
                ...(sex === g ? styles.pillActive : {}),
              }}
              onClick={() => setSex(g)}
            >
              {g.charAt(0).toUpperCase() + g.slice(1)}
            </button>
          ))}
        </div>

        <label style={styles.label}>SA ID Number</label>
        <input
          style={styles.input}
          value={idNumber}
          maxLength={13}
          placeholder="13 digits"
          onChange={(e) => setIdNumber(e.target.value.replace(/\D/g, ""))}
          required
        />
        <p style={styles.hint}>Date of birth will be extracted automatically.</p>

        {!identity?.email && (
          <>
            <label style={styles.label}>Email (optional)</label>
            <input
              style={styles.input}
              type="email"
              value={email}
              placeholder="jane@example.com"
              onChange={(e) => setEmail(e.target.value)}
            />
          </>
        )}

        {!identity?.phone && (
          <>
            <label style={styles.label}>Phone (optional)</label>
            <input
              style={styles.input}
              type="tel"
              value={phone}
              placeholder="0821234567"
              onChange={(e) => setPhone(e.target.value)}
            />
          </>
        )}

        <Err msg={error} />
        <button style={styles.primaryBtn} type="submit" disabled={loading}>
          {loading ? <LoadingSpinner /> : "Save & continue"}
        </button>
      </form>
    </div>
  );
}

// ── AdminOnboardingStep (enhanced UI) ───────────────────────────────────────
function AdminOnboardingStep({ adminProfile, onSubmit, onBack }) {
  const [professionalId, setProfessionalId] = useState("");
  const [licenseNumber,  setLicenseNumber]  = useState("");
  const [clinicName,     setClinicName]     = useState("");
  const [motivation,     setMotivation]     = useState("");
  const [cvUrl,          setCvUrl]          = useState("");
  const [error,          setError]          = useState("");
  const [loading,        setLoading]        = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");

    if (!adminProfile?.auth_provider || !adminProfile?.provider_user_id) {
      setError("Missing admin profile details."); return;
    }
    if (!professionalId.trim()) { setError("Please enter your employee or admin ID."); return; }
    if (!motivation.trim())     { setError("Please provide a short motivation.");       return; }
    if (!cvUrl.trim()) {
      setError("Please provide your CV link.");
      return;
    }

    setLoading(true);

    const { error: err } = await supabase.from("role_applications").upsert(
      {
        auth_provider:    adminProfile.auth_provider,
        provider_user_id: adminProfile.provider_user_id,
        requested_role:   "admin",
        status:           "pending",
        name:             adminProfile.name,
        surname:          adminProfile.surname,
        email:            adminProfile.email,
        phone_number:     adminProfile.phone_number,
        sex:              adminProfile.sex,
        id_number:        adminProfile.id_number,
        dob:              adminProfile.dob,
        professional_id:  professionalId.trim(),
        license_number:   licenseNumber.trim() || null,
        clinic_id:        null,
        clinic_name:      clinicName.trim()     || null,
        motivation:       motivation.trim(),
        cv_url:           cvUrl.trim(),
        submitted_at:     new Date().toISOString(),
      },
      { onConflict: "auth_provider,provider_user_id,requested_role" }
    );

    setLoading(false);
    if (err) { setError(err.message || "Could not submit admin application."); return; }
    onSubmit();
  }

  return (
    <div style={styles.section}>
      <BackBtn onClick={onBack} />
      <Dots step={3} total={3} />
      <h2 style={styles.title}>Admin verification</h2>
      <p style={styles.sub}>Provide your credentials to request admin access.</p>

      <form onSubmit={handleSubmit}>
        <label style={styles.label}>Employee / Admin ID</label>
        <input
          style={styles.input}
          value={professionalId}
          onChange={(e) => setProfessionalId(e.target.value)}
          placeholder="Enter your employee ID"
          required
        />

        <label style={styles.label}>License Number (optional)</label>
        <input
          style={styles.input}
          value={licenseNumber}
          onChange={(e) => setLicenseNumber(e.target.value)}
          placeholder="Professional or license number"
        />

        <label style={styles.label}>Clinic / Department (optional)</label>
        <input
          style={styles.input}
          value={clinicName}
          onChange={(e) => setClinicName(e.target.value)}
          placeholder="Clinic or department name"
        />

        <label style={styles.label}>CV Link</label>
        <input
          style={styles.input}
          value={cvUrl}
          onChange={(e) => setCvUrl(e.target.value)}
          placeholder="Paste a link to your CV"
        />

        <label style={styles.label}>Motivation</label>
        <textarea
          style={styles.textarea}
          rows={4}
          value={motivation}
          onChange={(e) => setMotivation(e.target.value)}
          placeholder="Explain why admin access is needed"
          required
        />

        <Err msg={error} />
        <button style={styles.primaryBtn} type="submit" disabled={loading}>
          {loading ? <LoadingSpinner /> : "Submit admin application"}
        </button>
      </form>
    </div>
  );
}

// ── ProfileSetupPage (main exported component) ──────────────────────────────
export default function ProfileSetupPage() {
  const navigate  = useNavigate();
  const location  = useLocation();

  const { identity, selectedRole } = location.state || {};

  const [step,             setStep]             = useState(
    selectedRole === "staff" ? "staff-application" : "profile"
  );
  const [adminProfile,     setAdminProfile]     = useState(null);

  useEffect(() => {
    if (!identity || !selectedRole) {
      navigate("/signin", { replace: true });
    }
  }, [identity, selectedRole, navigate]);

  if (!identity || !selectedRole) {
    return null;
  }

  function handleProfileComplete(result) {
    if (result?.status === "approved") {
      navigate("/dashboard");
      return;
    }
    if (result?.status === "admin-onboarding") {
      setAdminProfile(result.adminProfile || null);
      setStep("admin-onboarding");
    }
  }

  function handleAdminApplicationSubmitted() {
    setStep("admin-pending");
  }

  return (
    <div style={styles.root}>
      {/* Animated background gradient */}
      <div style={styles.bgGradient} />
      <div style={styles.bgBlob} />

      {/* Logo */}
      <div style={styles.logo}>
        <div style={styles.logoMark}>
          <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="white" strokeWidth="1.8">
            <path d="M12 2L2 7l10 5 10-5-10-5z"/>
            <path d="M2 17l10 5 10-5"/>
            <path d="M2 12l10 5 10-5"/>
          </svg>
        </div>
        <div>
          <h1 style={styles.logoName}>MediAccess</h1>
          <p style={styles.logoSub}>Integrated Healthcare Management</p>
        </div>
      </div>

      <div style={styles.card}>
        {step === "profile" && (
          <ProfileStep
            identity={identity}
            selectedRole={selectedRole}
            onComplete={handleProfileComplete}
          />
        )}

        {step === "admin-onboarding" && (
          <AdminOnboardingStep
            adminProfile={adminProfile}
            onSubmit={handleAdminApplicationSubmitted}
            onBack={() => setStep("profile")}
          />
        )}

        {step === "staff-application" && (
          <Applications
            mode="apply"
            identity={identity}
            selectedRole="staff"
            onSubmitted={() => setStep("staff-pending")}
            onBack={() => navigate("/signin")}
          />
        )}

        {step === "staff-pending" && (
          <div style={styles.section}>
            <div style={styles.successIcon}>✓</div>
            <h2 style={styles.title}>Application submitted</h2>
            <p style={styles.sub}>
              Your staff application has been sent to the admin for approval.
              You'll receive a notification once it's reviewed.
            </p>
            <button style={styles.primaryBtn} onClick={() => navigate("/signin")}>
              Back to sign in
            </button>
          </div>
        )}

        {step === "admin-pending" && (
          <div style={styles.section}>
            <div style={styles.successIcon}>✓</div>
            <h2 style={styles.title}>Admin application submitted</h2>
            <p style={styles.sub}>
              Your request is pending approval. You'll be able to access the
              admin dashboard once an existing admin has reviewed it.
            </p>
            <button style={styles.primaryBtn} onClick={() => navigate("/signin")}>
              Back to sign in
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Enhanced Styles (primary #1B5E20) ───────────────────────────────────────
const styles = {
  root: {
    minHeight: "100vh",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    padding: "32px 16px",
    background: "#F8FAF8",
    fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
    position: "relative",
    overflow: "hidden",
  },
  bgGradient: {
    position: "absolute",
    top: "-30%",
    right: "-10%",
    width: "500px",
    height: "500px",
    borderRadius: "50%",
    background: "radial-gradient(circle, rgba(27,94,32,0.08) 0%, transparent 70%)",
    pointerEvents: "none",
    zIndex: 0,
  },
  bgBlob: {
    position: "absolute",
    bottom: "-20%",
    left: "-10%",
    width: "400px",
    height: "400px",
    borderRadius: "50%",
    background: "radial-gradient(circle, rgba(27,94,32,0.05) 0%, transparent 70%)",
    pointerEvents: "none",
    zIndex: 0,
  },
  logo: {
    display: "flex",
    alignItems: "center",
    gap: 12,
    marginBottom: 32,
    position: "relative",
    zIndex: 1,
  },
  logoMark: {
    width: 48,
    height: 48,
    borderRadius: 16,
    background: "#1B5E20",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    boxShadow: "0 8px 20px rgba(27,94,32,0.25)",
    transition: "transform 0.2s ease",
  },
  logoName: {
    margin: 0,
    fontSize: 22,
    fontWeight: 700,
    background: "linear-gradient(135deg, #1B5E20, #2E7D32)",
    WebkitBackgroundClip: "text",
    WebkitTextFillColor: "transparent",
    letterSpacing: "-0.5px",
  },
  logoSub: {
    margin: 0,
    fontSize: 12,
    color: "#558B2F",
    fontWeight: 500,
    letterSpacing: "0.3px",
  },
  card: {
    width: "100%",
    maxWidth: 480,
    background: "#FFFFFF",
    borderRadius: 32,
    boxShadow: "0 25px 50px -12px rgba(0,0,0,0.15), 0 0 0 1px rgba(27,94,32,0.05)",
    overflow: "hidden",
    position: "relative",
    zIndex: 1,
    transition: "transform 0.2s ease, box-shadow 0.2s ease",
  },
  section: {
    padding: "40px 36px 36px",
    "@media (max-width: 480px)": {
      padding: "28px 20px 24px",
    },
  },
  title: {
    margin: "0 0 8px",
    fontSize: 28,
    fontWeight: 700,
    color: "#1B5E20",
    letterSpacing: "-0.6px",
  },
  sub: {
    margin: "0 0 28px",
    fontSize: 15,
    color: "#5B6E8C",
    lineHeight: 1.5,
    fontWeight: 400,
  },
  label: {
    display: "block",
    fontSize: 12,
    fontWeight: 600,
    color: "#1B5E20",
    marginBottom: 6,
    textTransform: "uppercase",
    letterSpacing: "0.6px",
  },
  input: {
    display: "block",
    width: "100%",
    boxSizing: "border-box",
    padding: "12px 16px",
    borderRadius: 14,
    border: "1.5px solid #E2E8F0",
    fontSize: 14,
    color: "#1A202C",
    background: "#FFFFFF",
    marginBottom: 16,
    outline: "none",
    transition: "all 0.2s ease",
    fontFamily: "inherit",
    ":focus": {
      borderColor: "#1B5E20",
      boxShadow: "0 0 0 3px rgba(27,94,32,0.1)",
    },
  },
  textarea: {
    display: "block",
    width: "100%",
    boxSizing: "border-box",
    padding: "12px 16px",
    borderRadius: 14,
    border: "1.5px solid #E2E8F0",
    fontSize: 14,
    color: "#1A202C",
    background: "#FFFFFF",
    marginBottom: 16,
    outline: "none",
    resize: "vertical",
    transition: "all 0.2s ease",
    fontFamily: "inherit",
    ":focus": {
      borderColor: "#1B5E20",
      boxShadow: "0 0 0 3px rgba(27,94,32,0.1)",
    },
  },
  hint: {
    margin: "-12px 0 18px",
    fontSize: 12,
    color: "#718096",
    fontWeight: 400,
  },
  twoColumnGrid: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: 14,
    marginBottom: 4,
  },
  pillGroup: {
    display: "flex",
    gap: 12,
    marginBottom: 20,
    flexWrap: "wrap",
  },
  pill: {
    padding: "8px 20px",
    borderRadius: 40,
    border: "1.5px solid #E2E8F0",
    background: "#FFFFFF",
    fontSize: 13,
    fontWeight: 600,
    cursor: "pointer",
    color: "#2D3748",
    transition: "all 0.2s ease",
    fontFamily: "inherit",
    ":hover": {
      borderColor: "#1B5E20",
      background: "#F0FDF4",
    },
  },
  pillActive: {
    background: "#1B5E20",
    borderColor: "#1B5E20",
    color: "#FFFFFF",
    boxShadow: "0 4px 12px rgba(27,94,32,0.25)",
  },
  primaryBtn: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    width: "100%",
    padding: "14px 20px",
    background: "#1B5E20",
    color: "#FFFFFF",
    border: "none",
    borderRadius: 16,
    fontSize: 15,
    fontWeight: 600,
    cursor: "pointer",
    transition: "all 0.2s ease",
    boxShadow: "0 4px 12px rgba(27,94,32,0.3)",
    fontFamily: "inherit",
    ":hover": {
      background: "#144C18",
      transform: "scale(0.98)",
    },
    ":disabled": {
      opacity: 0.6,
      cursor: "not-allowed",
      transform: "none",
    },
  },
  backBtn: {
    display: "flex",
    alignItems: "center",
    gap: 6,
    background: "none",
    border: "none",
    cursor: "pointer",
    color: "#558B2F",
    fontSize: 13,
    fontWeight: 600,
    padding: "0 0 20px",
    transition: "color 0.2s ease",
    fontFamily: "inherit",
    ":hover": {
      color: "#1B5E20",
    },
  },
  errorContainer: {
    margin: "16px 0 20px",
    fontSize: 13,
    color: "#C53030",
    background: "#FFF5F5",
    border: "1px solid #FED7D7",
    borderRadius: 14,
    padding: "10px 14px",
    display: "flex",
    alignItems: "center",
    gap: 8,
    fontWeight: 500,
  },
  dotsContainer: {
    display: "flex",
    gap: 10,
    justifyContent: "center",
    marginBottom: 28,
  },
  dot: {
    height: 8,
    borderRadius: 4,
    transition: "all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)",
  },
  strengthContainer: {
    display: "flex",
    gap: 6,
    marginTop: -8,
    marginBottom: 18,
  },
  strengthSegment: {
    flex: 1,
    height: 4,
    borderRadius: 4,
    transition: "background-color 0.2s ease",
  },
  spinner: {
    display: "inline-block",
    width: 18,
    height: 18,
  },
  spinnerCircle: {
    width: "100%",
    height: "100%",
    border: "2px solid rgba(255,255,255,0.3)",
    borderTopColor: "#FFFFFF",
    borderRadius: "50%",
    animation: "spin 0.8s linear infinite",
  },
  successIcon: {
    fontSize: 52,
    color: "#1B5E20",
    margin: "0 0 20px",
    textAlign: "center",
    fontWeight: 700,
    animation: "pulse 0.6s ease-out",
  },
};

// Inject keyframes for animations
const styleSheet = document.createElement("style");
styleSheet.textContent = `
  @keyframes spin { to { transform: rotate(360deg); } }
  @keyframes pulse { 0% { transform: scale(0.8); opacity: 0; } 100% { transform: scale(1); opacity: 1; } }
  input:focus, textarea:focus, button:focus { outline: none; }
`;
document.head.appendChild(styleSheet);