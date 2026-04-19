/**
 * ProfileSetupPage.jsx
 *
 * Responsibility: Profile completion after auth.
 * This is a STANDALONE PAGE (registered in your router as /profile-setup).
 *
 * It receives { identity, selectedRole } via React Router location.state,
 * which AuthPage.jsx sets before navigating here.
 *
 * Flow:
 *  Patient  →  ProfileStep  →  /dashboard
 *  Staff    →  Applications (apply mode)  →  "pending" screen
 *  Admin    →  ProfileStep  →  AdminOnboardingStep  →  "pending" screen
 *
 * Nothing in this file talks directly to Firebase auth; it uses the identity
 * object (auth_provider + provider_user_id) that AuthPage already resolved.
 */

import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { createClient } from "@supabase/supabase-js";
import Applications from "./Applications";

// ── Supabase ────────────────────────────────────────────────────────────────
const SUPABASE_URL  = "https://vktjtxljwzyakobkkhol.supabase.co";
const SUPABASE_ANON = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZrdGp0eGxqd3p5YWtvYmtraG9sIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzU1ODE1ODYsImV4cCI6MjA5MTE1NzU4Nn0.LVNelw--Xp1t_weGNwhPGMrzqg0iS7J5TAXw9ZM6aUA";
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON);

// ── Utilities ────────────────────────────────────────────────────────────────
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
  const isValid =
    date.getFullYear() === yyyy &&
    date.getMonth() === mm - 1 &&
    date.getDate() === dd;

  if (!isValid) return null;

  return `${yyyy}-${String(mm).padStart(2, "0")}-${String(dd).padStart(2, "0")}`;
}



// ── Shared micro-components ──────────────────────────────────────────────────
function Err({ msg }) {
  if (!msg) return null;
  return <p style={s.err}>{msg}</p>;
}

function BackBtn({ onClick }) {
  return (
    <button type="button" style={s.backBtn} onClick={onClick}>
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
        stroke="currentColor" strokeWidth="2.5">
        <polyline points="15 18 9 12 15 6" />
      </svg>
      Back
    </button>
  );
}

function Dots({ step, total = 2 }) {
  return (
    <div style={{ display: "flex", gap: 6, justifyContent: "center", marginBottom: 20 }}>
      {Array.from({ length: total }, (_, i) => (
        <div key={i} style={{
          width: i + 1 === step ? 20 : 8, height: 8, borderRadius: 4,
          background: i + 1 < step ? "#1D9E75" : i + 1 === step ? "#0A0A0A" : "#ddd",
          transition: "all .25s",
        }} />
      ))}
    </div>
  );
}

function StrengthBar({ score }) {
  const colors = ["#E24B4A", "#EF9F27", "#1D9E75", "#0F6E56"];
  if (!score) return null;
  return (
    <div style={{ display: "flex", gap: 4, marginTop: 6 }}>
      {[0, 1, 2, 3].map((i) => (
        <div key={i} style={{
          flex: 1, height: 3, borderRadius: 2,
          background: i < score ? colors[score - 1] : "#e2e2e2",
        }} />
      ))}
    </div>
  );
}

// ── ProfileStep ──────────────────────────────────────────────────────────────
/**
 * Collects name, gender, SA ID, optional contact details.
 * Writes to `profiles` (patient) or kicks off admin onboarding.
 * Staff users never reach this component — they go straight to Applications.
 *
 * onComplete(result):
 *   { status: "approved", role: "patient" }        → navigate /dashboard
 *   { status: "admin-onboarding", adminProfile }    → show AdminOnboardingStep
 */
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

    // --- Duplicate-ID check ---
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

    // --- Duplicate-email check ---
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

    // ── Patient: write profile, done ────────────────────────────────────────
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

    // ── Admin: pass profile data to AdminOnboardingStep ─────────────────────
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
    <div style={s.section}>
      <Dots step={2} total={totalDots} />
      <p style={s.title}>Complete your profile</p>
      <p style={s.sub}>We need a few more details to get you started.</p>

      <form onSubmit={handleSubmit}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 14 }}>
          <div>
            <label style={s.label}>First name</label>
            <input style={s.input} value={firstName} placeholder="Jane"
              onChange={(e) => setFirstName(e.target.value)} required />
          </div>
          <div>
            <label style={s.label}>Surname</label>
            <input style={s.input} value={surname} placeholder="Dlamini"
              onChange={(e) => setSurname(e.target.value)} required />
          </div>
        </div>

        <label style={s.label}>Gender</label>
        <div style={{ display: "flex", gap: 8, marginBottom: 14 }}>
          {["male", "female", "other"].map((g) => (
            <button key={g} type="button"
              style={{ ...s.pill, ...(sex === g ? s.pillActive : {}) }}
              onClick={() => setSex(g)}>
              {g.charAt(0).toUpperCase() + g.slice(1)}
            </button>
          ))}
        </div>

        <label style={s.label}>SA ID Number</label>
        <input style={s.input} value={idNumber} maxLength={13} placeholder="13 digits"
          onChange={(e) => setIdNumber(e.target.value.replace(/\D/g, ""))} required />
        <p style={s.hint}>Date of birth will be extracted automatically.</p>

        {!identity?.email && (
          <>
            <label style={s.label}>Email (optional)</label>
            <input style={s.input} type="email" value={email} placeholder="jane@example.com"
              onChange={(e) => setEmail(e.target.value)} />
          </>
        )}

        {!identity?.phone && (
          <>
            <label style={s.label}>Phone (optional)</label>
            <input style={s.input} type="tel" value={phone} placeholder="0821234567"
              onChange={(e) => setPhone(e.target.value)} />
          </>
        )}

        <Err msg={error} />
        <button style={s.primaryBtn} type="submit" disabled={loading}>
          {loading ? "Saving…" : "Save & continue"}
        </button>
      </form>
    </div>
  );
}

// ── AdminOnboardingStep ──────────────────────────────────────────────────────
/**
 * Collects admin-specific fields and writes a role_application row with
 * requested_role = "admin" and status = "pending".
 */
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
    <div style={s.section}>
      <BackBtn onClick={onBack} />
      <Dots step={3} total={3} />
      <p style={s.title}>Admin verification</p>
      <p style={s.sub}>Provide your credentials to request admin access.</p>

      <form onSubmit={handleSubmit}>
        <label style={s.label}>Employee / Admin ID</label>
        <input style={s.input} value={professionalId}
          onChange={(e) => setProfessionalId(e.target.value)}
          placeholder="Enter your employee ID" required />

        <label style={s.label}>License Number (optional)</label>
        <input style={s.input} value={licenseNumber}
          onChange={(e) => setLicenseNumber(e.target.value)}
          placeholder="Professional or license number" />

        <label style={s.label}>Clinic / Department (optional)</label>
        <input style={s.input} value={clinicName}
          onChange={(e) => setClinicName(e.target.value)}
          placeholder="Clinic or department name" />

        <label style={s.label}>CV Link </label>
        <input style={s.input} value={cvUrl}
          onChange={(e) => setCvUrl(e.target.value)}
          placeholder="Paste a link to your CV" />

        <label style={s.label}>Motivation</label>
        <textarea style={s.textarea} rows={4} value={motivation}
          onChange={(e) => setMotivation(e.target.value)}
          placeholder="Explain why admin access is needed" required />

        <Err msg={error} />
        <button style={s.primaryBtn} type="submit" disabled={loading}>
          {loading ? "Submitting…" : "Submit admin application"}
        </button>
      </form>
    </div>
  );
}

// ── ProfileSetupPage (the exported page component) ───────────────────────────
export default function ProfileSetupPage() {
  const navigate  = useNavigate();
  const location  = useLocation();

  // Pull the values AuthPage set before navigating here
  const { identity, selectedRole } = location.state || {};

  const [step,             setStep]             = useState(
    // Staff skip ProfileStep entirely; go straight to the application form
    selectedRole === "staff" ? "staff-application" : "profile"
  );
  const [adminProfile,     setAdminProfile]     = useState(null);
  

  // Guard: if we land here without state (e.g. direct URL hit), go back
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
      // Patient done — straight to dashboard
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
    <div style={s.root}>
      {/* Logo */}
      <div style={s.logo}>
        <div style={s.logoMark}>
          <svg viewBox="0 0 24 24" width="22" height="22" fill="none"
            stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 2L2 7l10 5 10-5-10-5z"/>
            <path d="M2 17l10 5 10-5"/>
            <path d="M2 12l10 5 10-5"/>
          </svg>
        </div>
        <div>
          <p style={s.logoName}>MediAccess</p>
          <p style={s.logoSub}>Integrated Healthcare Management</p>
        </div>
      </div>

      <div style={s.card}>

        {/* ── Patient / Admin: collect profile fields ── */}
        {step === "profile" && (
          <ProfileStep
            identity={identity}
            selectedRole={selectedRole}
            onComplete={handleProfileComplete}
          />
        )}

        {/* ── Admin: second step — credentials + motivation ── */}
        {step === "admin-onboarding" && (
          <AdminOnboardingStep
            adminProfile={adminProfile}
            onSubmit={handleAdminApplicationSubmitted}
            onBack={() => setStep("profile")}
          />
        )}

        {/* ── Staff: full application form from Applications.jsx ── */}
        {step === "staff-application" && (
          <Applications
            mode="apply"
            identity={identity}
            selectedRole="staff"
            onSubmitted={() => setStep("staff-pending")}
            onBack={() => navigate("/signin")}
          />
        )}

        {/* ── Post-submission status screens ── */}
        {step === "staff-pending" && (
          <div style={s.section}>
            <p style={s.title}>Application submitted</p>
            <p style={s.sub}>
              Your staff application has been sent to the admin for approval.
              You'll receive a notification once it's reviewed.
            </p>
            <button style={s.primaryBtn} onClick={() => navigate("/signin")}>
              Back to sign in
            </button>
          </div>
        )}

        {step === "admin-pending" && (
          <div style={s.section}>
            <p style={s.title}>Admin application submitted</p>
            <p style={s.sub}>
              Your request is pending approval. You'll be able to access the
              admin dashboard once an existing admin has reviewed it.
            </p>
            <button style={s.primaryBtn} onClick={() => navigate("/signin")}>
              Back to sign in
            </button>
          </div>
        )}

      </div>
    </div>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────
const s = {
  root: {
    minHeight: "100vh", display: "flex", flexDirection: "column",
    alignItems: "center", justifyContent: "center",
    padding: "32px 16px", background: "#F7F6F2",
    fontFamily: "'DM Sans', system-ui, sans-serif",
  },
  logo:     { display: "flex", alignItems: "center", gap: 12, marginBottom: 24 },
  logoMark: { width: 42, height: 42, borderRadius: 12, background: "#0A0A0A",
               display: "flex", alignItems: "center", justifyContent: "center" },
  logoName: { margin: 0, fontSize: 18, fontWeight: 700, color: "#0A0A0A", letterSpacing: "-0.4px" },
  logoSub:  { margin: 0, fontSize: 11, color: "#888", letterSpacing: "0.2px" },
  card:     { width: "100%", maxWidth: 420, background: "#fff", borderRadius: 16,
               border: "1px solid #E8E7E3", boxShadow: "0 2px 12px rgba(0,0,0,.06)", overflow: "hidden" },
  section:  { padding: "28px 28px 24px" },
  title:    { margin: "0 0 4px", fontSize: 22, fontWeight: 700, color: "#0A0A0A", letterSpacing: "-0.5px" },
  sub:      { margin: "0 0 20px", fontSize: 14, color: "#666", lineHeight: 1.5 },
  label:    { display: "block", fontSize: 12, fontWeight: 600, color: "#444",
               marginBottom: 5, textTransform: "uppercase", letterSpacing: "0.6px" },
  input:    { display: "block", width: "100%", boxSizing: "border-box", padding: "10px 12px",
               borderRadius: 8, border: "1.5px solid #E2E1DC", fontSize: 14, color: "#0A0A0A",
               background: "#fff", marginBottom: 14, outline: "none" },
  textarea: { display: "block", width: "100%", boxSizing: "border-box", padding: "10px 12px",
               borderRadius: 8, border: "1.5px solid #E2E1DC", fontSize: 14, color: "#0A0A0A",
               background: "#fff", marginBottom: 14, outline: "none", resize: "vertical" },
  hint:     { margin: "-10px 0 14px", fontSize: 11, color: "#999" },
  err:      { margin: "0 0 12px", fontSize: 13, color: "#C0392B", background: "#FEF2F2",
               border: "1px solid #FECACA", borderRadius: 6, padding: "8px 10px" },
  primaryBtn: { display: "block", width: "100%", padding: "12px", background: "#0A0A0A",
                 color: "#fff", border: "none", borderRadius: 10, fontSize: 14, fontWeight: 600,
                 cursor: "pointer", marginBottom: 10 },
  backBtn:  { display: "flex", alignItems: "center", gap: 4, background: "none", border: "none",
               cursor: "pointer", color: "#666", fontSize: 13, padding: "0 0 16px", fontWeight: 500 },
  pill:     { padding: "7px 16px", borderRadius: 20, border: "1.5px solid #E2E1DC",
               background: "#fff", fontSize: 13, cursor: "pointer", fontWeight: 500, color: "#444" },
  pillActive: { background: "#0A0A0A", borderColor: "#0A0A0A", color: "#fff" },
};