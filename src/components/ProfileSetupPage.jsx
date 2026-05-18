/**
 * ProfileSetupPage.jsx – redesigned with #1B5E20 primary color
 * All original logic preserved, UI/UX completely overhauled.
 */

import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { supabase } from "#lib/supabase";
import "./ProfileSetupPage.css";

import Applications from "./Applications";

const API_BASE = import.meta.env.VITE_API_BASE || "https://queuecare-gubjeae9fqdzekfv.southafricanorth-01.azurewebsites.net";


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
function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function isValidSAPhone(phone) {
  return /^0[6-8][0-9]{8}$/.test(phone);
}


function isValidName(value) {
  return /^[a-zA-Z\s'-]+$/.test(value);
}

function getAgeFromDob(dob) {
  const today = new Date();
  const birthDate = new Date(dob);

  let age = today.getFullYear() - birthDate.getFullYear();
  const birthdayPassed =
    today.getMonth() > birthDate.getMonth() ||
    (today.getMonth() === birthDate.getMonth() && today.getDate() >= birthDate.getDate());

  if (!birthdayPassed) age--;
  return age;
}
// ── Shared micro-components ───────────────────────────────────────────────────
function Err({ msg }) {
  if (!msg) return null;
  return (
    <p className="psp-error">
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <circle cx="12" cy="12" r="10" />
        <line x1="12" y1="8"  x2="12"    y2="12" />
        <line x1="12" y1="16" x2="12.01" y2="16" />
      </svg>
      <em>{msg}</em>
    </p>
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
    <ol className="psp-dots">
      {Array.from({ length: total }, (_, i) => (
        <li
          key={i}
          className="psp-dot"
          style={{
            width:           i + 1 === step ? 28 : 8,
            backgroundColor: i + 1 <= step ? "#1B5E20" : "#E2E8F0",
            boxShadow:       i + 1 === step ? "0 0 0 3px rgba(27,94,32,0.15)" : "none",
          }}
        />
      ))}
    </ol>
  );
}

function StrengthBar({ score }) {
  const colors = ["#DC2626", "#F59E0B", "#1B5E20", "#0F3B1A"];
  if (!score) return null;
  return (
    <ul className="psp-strength-bar">
      {[0, 1, 2, 3].map((i) => (
        <li
          key={i}
          className="psp-strength-segment"
          style={{ backgroundColor: i < score ? colors[score - 1] : "#E2E8F0" }}
        />
      ))}
    </ul>
  );
}

function LoadingSpinner() {
  return (
    <figure className="psp-spinner">
      <i className="psp-spinner-circle" />
    </figure>
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

    const cleanFirstName = firstName.trim();
const cleanSurname = surname.trim();
const cleanEmail = (email || identity.email || "").trim().toLowerCase();
const cleanPhone = (phone || identity.phone || "").trim();
const cleanIdNumber = idNumber.trim();

if (!cleanFirstName || cleanFirstName.length < 2) {
  setError("First name must be at least 2 characters.");
  return;
}

if (!isValidName(cleanFirstName)) {
  setError("First name contains invalid characters.");
  return;
}

if (!cleanSurname || cleanSurname.length < 2) {
  setError("Surname must be at least 2 characters.");
  return;
}

if (!isValidName(cleanSurname)) {
  setError("Surname contains invalid characters.");
  return;
}

if (!sex) {
  setError("Please select a gender.");
  return;
}

if (!/^\d{13}$/.test(cleanIdNumber)) {
  setError("SA ID number must be exactly 13 digits.");
  return;
}

if (cleanEmail && !isValidEmail(cleanEmail)) {
  setError("Enter a valid email address.");
  return;
}

if (cleanPhone && !isValidSAPhone(cleanPhone)) {
  setError("Enter a valid South African phone number, e.g. 0821234567.");
  return;
}

const dob = dobFromSAId(cleanIdNumber);

if (!dob) {
  setError("The SA ID number does not contain a valid date of birth.");
  return;
}

if (new Date(dob) > new Date()) {
  setError("Date of birth cannot be in the future.");
  return;
}

if (getAgeFromDob(dob) < 13) {
  setError("You must be at least 13 years old to create a profile.");
  return;
}
    setLoading(true);

    const hashed = await sha256Hex(cleanIdNumber).catch(() => null);
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

    const commonProfile = {
      auth_provider: identity.auth_provider,
      provider_user_id: identity.provider_user_id,
      name: cleanFirstName,
      surname: cleanSurname,
      sex,
      id_number: hashed,
      dob,
      email: cleanEmail || null,
      phone_number: cleanPhone || null,
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
    <section className="psp-section">
      <Dots step={2} total={totalDots} />
      <h2 className="psp-title">Complete your profile</h2>
      <p className="psp-sub">We need a few more details to get you started.</p>

      <form onSubmit={handleSubmit}>
        <section className="psp-two-col">
          <section>
            <label className="psp-label">First name</label>
            <input
              className="psp-input"
              value={firstName}
              placeholder="Jane"
              onChange={(e) => setFirstName(e.target.value)}
              required
            />
          </section>
          <section>
            <label className="psp-label">Surname</label>
            <input
              className="psp-input"
              value={surname}
              placeholder="Dlamini"
              onChange={(e) => setSurname(e.target.value)}
              required
            />
          </section>
        </section>

        <label className="psp-label">Gender</label>
        <section className="psp-pill-group">
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
        </section>

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
    </section>
  );
}

// ── AdminOnboardingStep ───────────────────────────────────────────────────────
function AdminOnboardingStep({ adminProfile, onSubmit, onBack }) {
  const [professionalId, setProfessionalId] = useState("");
  const [licenseNumber,  setLicenseNumber]  = useState("");
  const [clinicName,     setClinicName]     = useState("");
  const [motivation,     setMotivation]     = useState("");
  const [cvFile, setCvFile]                 = useState(null);  
  const [error,          setError]          = useState("");
  const [loading,        setLoading]        = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    const cleanProfessionalId = professionalId.trim();
const cleanLicenseNumber = licenseNumber.trim();
const cleanClinicName = clinicName.trim();
const cleanMotivation = motivation.trim();


  if (!adminProfile?.auth_provider || !adminProfile?.provider_user_id) {
    setError("Missing admin profile details.");
    return;
  }

  if (!cleanProfessionalId || cleanProfessionalId.length < 3) {
    setError("Employee/Admin ID must be at least 3 characters.");
    return;
  }

  if (!/^[A-Za-z0-9-]+$/.test(cleanProfessionalId)) {
    setError("Employee/Admin ID contains invalid characters.");
    return;
  }

  if (cleanLicenseNumber && cleanLicenseNumber.length < 3) {
    setError("License number must be at least 3 characters if provided.");
    return;
  }

  if (cleanLicenseNumber && !/^[A-Za-z0-9-]+$/.test(cleanLicenseNumber)) {
    setError("License number contains invalid characters.");
    return;
  }

  if (cleanClinicName && cleanClinicName.length < 2) {
    setError("Clinic or department name must be at least 2 characters if provided.");
    return;
  }

  if (!cleanMotivation || cleanMotivation.length < 20) {
    setError("Motivation must be at least 20 characters.");
    return;
  }
  if (!cvFile) {
  setError("Please upload your CV document.");
  return;
}

const allowedTypes = [
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
];

if (!allowedTypes.includes(cvFile.type)) {
  setError("CV must be a PDF, DOC, or DOCX file.");
  return;
}

if (cvFile.size > 2 * 1024 * 1024) {
  setError("CV file must be smaller than 2MB.");
  return;
}
    setLoading(true);
    const fileExt = cvFile.name.split(".").pop();
const filePath = `admin-applications/${adminProfile.provider_user_id}-${Date.now()}.${fileExt}`;

const { error: uploadError } = await supabase.storage
  .from("application-documents")
  .upload(filePath, cvFile);

if (uploadError) {
  setError(uploadError.message || "Could not upload CV.");
  setLoading(false);
  return;
}

const { data: publicUrlData } = supabase.storage
  .from("application-documents")
  .getPublicUrl(filePath);

const uploadedCvUrl = publicUrlData.publicUrl;
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
        professional_id:  cleanProfessionalId,
        license_number:   cleanLicenseNumber || null,
        clinic_id:        null,
        clinic_name:      cleanClinicName || null,
        motivation:       cleanMotivation,
        cv_url: uploadedCvUrl,
        submitted_at:     new Date().toISOString(),
      },
      { onConflict: "auth_provider,provider_user_id,requested_role" }
    );

    setLoading(false);
    if (err) { setError(err.message || "Could not submit admin application."); return; }
    
     fetch(`${API_BASE}/notify/application/send-email`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            email: adminProfile.email,
            name: adminProfile.name,
            role: 'admin',
            status: 'submitted',
        }),
    }).catch(err => console.warn('Application email failed:', err.message));
    onSubmit();

  }

  return (
    <section className="psp-section">
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

        <label className="psp-label">Upload CV</label>
        <input
          className="psp-input"
          type="file"
          accept=".pdf,.doc,.docx"
          onChange={(e) => setCvFile(e.target.files?.[0] || null)}
        />
        {cvFile && (
            <p className="psp-hint">
              Selected file: {cvFile.name}
            </p>
          )}

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
    </section>
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
    <main className="psp-root">
      <figure className="psp-bg-gradient" />
      <figure className="psp-bg-blob" />

      {/* Logo */}
      <header className="psp-logo">
        <figure className="psp-logo-mark">
          <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="white" strokeWidth="1.8">
            <path d="M12 2L2 7l10 5 10-5-10-5z"/>
            <path d="M2 17l10 5 10-5"/>
            <path d="M2 12l10 5 10-5"/>
          </svg>
        </figure>
        <hgroup>
          <h1 className="psp-logo-name">MediAccess</h1>
          <p className="psp-logo-sub">Integrated Healthcare Management</p>
        </hgroup>
      </header>

      <article className="psp-card">
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
          <section className="psp-section">
            <i className="psp-success-icon">✓</i>
            <h2 className="psp-title">Application submitted</h2>
            <p className="psp-sub">
              Your staff application has been sent to the admin for approval.
              You'll receive a notification once it's reviewed.
            </p>
            <button className="psp-btn-primary" onClick={() => navigate("/signin")}>
              Back to sign in
            </button>
          </section>
        )}

        {step === "admin-pending" && (
          <section className="psp-section">
            <i className="psp-success-icon">✓</i>
            <h2 className="psp-title">Admin application submitted</h2>
            <p className="psp-sub">
              Your request is pending approval. You'll be able to access the
              admin dashboard once an existing admin has reviewed it.
            </p>
            <button className="psp-btn-primary" onClick={() => navigate("/signin")}>
              Back to sign in
            </button>
          </section>
        )}
      </article>
    </main>
  );
}