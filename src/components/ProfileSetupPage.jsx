/**
 * ProfileSetupPage.jsx – redesigned with #1B5E20 primary color
 * All original logic preserved, UI/UX completely overhauled.
 */

import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { supabase } from "#lib/supabase";
import "./ProfileSetupPage.css";

import Applications from "./Applications";


// ── Utilities ─────────────────────────────────────────────────────────────────
async function sha256Hex(value) {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

function dobFromSAId(id) {
  if (!/^\d{13}$/.test(id)) return null;
  const yy   = parseInt(id.slice(0, 2), 10);
  const mm   = parseInt(id.slice(2, 4), 10);
  const dd   = parseInt(id.slice(4, 6), 10);
  const yyyy = yy <= 25 ? 2000 + yy : 1900 + yy;
  const date = new Date(yyyy, mm - 1, dd);
  const isValid =
    date.getFullYear() === yyyy &&
    date.getMonth()    === mm - 1 &&
    date.getDate()     === dd;
  if (!isValid) return null;
  return `${yyyy}-${String(mm).padStart(2, "0")}-${String(dd).padStart(2, "0")}`;
}

// ── Shared micro-components ───────────────────────────────────────────────────
function Err({ msg }) {
  if (!msg) return null;
  return (
    <div className="psp-error">
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <circle cx="12" cy="12" r="10" />
        <line x1="12" y1="8"  x2="12"    y2="12" />
        <line x1="12" y1="16" x2="12.01" y2="16" />
      </svg>
      <span>{msg}</span>
    </div>
  );
}

function BackBtn({ onClick }) {
  return (
    <button type="button" className="psp-btn-back" onClick={onClick}>
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
        <polyline points="15 18 9 12 15 6" />
      </svg>
      Back
    </button>
  );
}

function Dots({ step, total = 2 }) {
  const colors  = ["#E24B4A", "#EF9F27", "#F4C542", "#1D9E75", "#0F6E56"];
  return (
    <div className="psp-dots">
      {Array.from({ length: total }, (_, i) => (
        <div
          key={i}
          className="psp-dot"
          style={{
            width:           i + 1 === step ? 28 : 8,
            backgroundColor: i + 1 <= step ? "#1B5E20" : "#E2E8F0",
            boxShadow:       i + 1 === step ? "0 0 0 3px rgba(27,94,32,0.15)" : "none",
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
    <div className="psp-strength-bar">
      {[0, 1, 2, 3].map((i) => (
        <div
          key={i}
          className="psp-strength-segment"
          style={{ backgroundColor: i < score ? colors[score - 1] : "#E2E8F0" }}
        />
      ))}
    </div>
  );
}

function LoadingSpinner() {
  return (
    <div className="psp-spinner">
      <div className="psp-spinner-circle" />
    </div>
  );
}

// ── ProfileStep ───────────────────────────────────────────────────────────────
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

    if (!firstName || !surname)     { setError("Please enter your full name.");            return; }
    if (!sex)                       { setError("Please select a gender.");                 return; }
    if (!/^\d{13}$/.test(idNumber)) { setError("Enter a valid 13-digit SA ID number.");   return; }

    setLoading(true);

    const hashed = await sha256Hex(idNumber).catch(() => null);
    if (!hashed) { setError("Could not hash ID. Please try again."); setLoading(false); return; }

    // Duplicate ID check
    const { data: existingId } = await supabase
      .from("profiles").select("id, auth_provider, provider_user_id")
      .eq("id_number", hashed).maybeSingle();

    if (
      existingId &&
      !(existingId.auth_provider    === identity.auth_provider &&
        existingId.provider_user_id === identity.provider_user_id)
    ) {
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
        !(existingPhone.auth_provider    === identity.auth_provider &&
          existingPhone.provider_user_id === identity.provider_user_id)
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
    <div className="psp-section">
      <Dots step={2} total={totalDots} />
      <h2 className="psp-title">Complete your profile</h2>
      <p className="psp-sub">We need a few more details to get you started.</p>

      <form onSubmit={handleSubmit}>
        <div className="psp-two-col">
          <div>
            <label className="psp-label">First name</label>
            <input
              className="psp-input"
              value={firstName}
              placeholder="Jane"
              onChange={(e) => setFirstName(e.target.value)}
              required
            />
          </div>
          <div>
            <label className="psp-label">Surname</label>
            <input
              className="psp-input"
              value={surname}
              placeholder="Dlamini"
              onChange={(e) => setSurname(e.target.value)}
              required
            />
          </div>
        </div>

        <label className="psp-label">Gender</label>
        <div className="psp-pill-group">
          {["male", "female", "other"].map((g) => (
            <button
              key={g}
              type="button"
              className={`psp-pill${sex === g ? " psp-pill--active" : ""}`}
              onClick={() => setSex(g)}
            >
              {g.charAt(0).toUpperCase() + g.slice(1)}
            </button>
          ))}
        </div>

        <label className="psp-label">SA ID Number</label>
        <input
          className="psp-input"
          value={idNumber}
          maxLength={13}
          placeholder="13 digits"
          onChange={(e) => setIdNumber(e.target.value.replace(/\D/g, ""))}
          required
        />
        <p className="psp-hint">Date of birth will be extracted automatically.</p>

        {!identity?.email && (
          <>
            <label className="psp-label">Email (optional)</label>
            <input
              className="psp-input"
              type="email"
              value={email}
              placeholder="jane@example.com"
              onChange={(e) => setEmail(e.target.value)}
            />
          </>
        )}

        {!identity?.phone && (
          <>
            <label className="psp-label">Phone (optional)</label>
            <input
              className="psp-input"
              type="tel"
              value={phone}
              placeholder="0821234567"
              onChange={(e) => setPhone(e.target.value)}
            />
          </>
        )}

        <Err msg={error} />
        <button className="psp-btn-primary" type="submit" disabled={loading}>
          {loading ? <LoadingSpinner /> : "Save & continue"}
        </button>
      </form>
    </div>
  );
}

// ── AdminOnboardingStep ───────────────────────────────────────────────────────
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
    if (!cvUrl.trim())          { setError("Please provide your CV link.");             return; }

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
    <div className="psp-section">
      <BackBtn onClick={onBack} />
      <Dots step={3} total={3} />
      <h2 className="psp-title">Admin verification</h2>
      <p className="psp-sub">Provide your credentials to request admin access.</p>

      <form onSubmit={handleSubmit}>
        <label className="psp-label">Employee / Admin ID</label>
        <input
          className="psp-input"
          value={professionalId}
          onChange={(e) => setProfessionalId(e.target.value)}
          placeholder="Enter your employee ID"
          required
        />

        <label className="psp-label">License Number (optional)</label>
        <input
          className="psp-input"
          value={licenseNumber}
          onChange={(e) => setLicenseNumber(e.target.value)}
          placeholder="Professional or license number"
        />

        <label className="psp-label">Clinic / Department (optional)</label>
        <input
          className="psp-input"
          value={clinicName}
          onChange={(e) => setClinicName(e.target.value)}
          placeholder="Clinic or department name"
        />

        <label className="psp-label">CV Link</label>
        <input
          className="psp-input"
          value={cvUrl}
          onChange={(e) => setCvUrl(e.target.value)}
          placeholder="Paste a link to your CV"
        />

        <label className="psp-label">Motivation</label>
        <textarea
          className="psp-textarea"
          rows={4}
          value={motivation}
          onChange={(e) => setMotivation(e.target.value)}
          placeholder="Explain why admin access is needed"
          required
        />

        <Err msg={error} />
        <button className="psp-btn-primary" type="submit" disabled={loading}>
          {loading ? <LoadingSpinner /> : "Submit admin application"}
        </button>
      </form>
    </div>
  );
}

// ── ProfileSetupPage ──────────────────────────────────────────────────────────
export default function ProfileSetupPage() {
  const navigate = useNavigate();
  const location = useLocation();

  const { identity, selectedRole } = location.state || {};

  const [step,         setStep]         = useState(
    selectedRole === "staff" ? "staff-application" : "profile"
  );
  const [adminProfile, setAdminProfile] = useState(null);

  useEffect(() => {
    if (!identity || !selectedRole) {
      navigate("/signin", { replace: true });
    }
  }, [identity, selectedRole, navigate]);

  if (!identity || !selectedRole) return null;

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
    <div className="psp-root">
      <div className="psp-bg-gradient" />
      <div className="psp-bg-blob" />

      {/* Logo */}
      <div className="psp-logo">
        <div className="psp-logo-mark">
          <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="white" strokeWidth="1.8">
            <path d="M12 2L2 7l10 5 10-5-10-5z"/>
            <path d="M2 17l10 5 10-5"/>
            <path d="M2 12l10 5 10-5"/>
          </svg>
        </div>
        <div>
          <h1 className="psp-logo-name">MediAccess</h1>
          <p className="psp-logo-sub">Integrated Healthcare Management</p>
        </div>
      </div>

      <div className="psp-card">
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
          <div className="psp-section">
            <div className="psp-success-icon">✓</div>
            <h2 className="psp-title">Application submitted</h2>
            <p className="psp-sub">
              Your staff application has been sent to the admin for approval.
              You'll receive a notification once it's reviewed.
            </p>
            <button className="psp-btn-primary" onClick={() => navigate("/signin")}>
              Back to sign in
            </button>
          </div>
        )}

        {step === "admin-pending" && (
          <div className="psp-section">
            <div className="psp-success-icon">✓</div>
            <h2 className="psp-title">Admin application submitted</h2>
            <p className="psp-sub">
              Your request is pending approval. You'll be able to access the
              admin dashboard once an existing admin has reviewed it.
            </p>
            <button className="psp-btn-primary" onClick={() => navigate("/signin")}>
              Back to sign in
            </button>
          </div>
        )}
      </div>
    </div>
  );
}