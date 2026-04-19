/**
 * AuthPage.jsx
 *
 * Responsibility: Authentication ONLY.
 * Covers: role selection → social / email / phone login → OTP verification.
 * After any successful auth, calls routeAfterLogin() exactly once, which
 * decides where the user goes next (profile completion, pending screen,
 * or straight to /dashboard).
 *
 * Profile completion and admin-onboarding live in ProfileStep.jsx.
 */

import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { createClient } from "@supabase/supabase-js";
import {
  signInWithPopup,
  RecaptchaVerifier,
  signInWithPhoneNumber,
  FacebookAuthProvider,
} from "firebase/auth";
import { auth, googleAuthProvider } from "../firebase";

// ── Supabase ────────────────────────────────────────────────────────────────
const SUPABASE_URL  = "https://vktjtxljwzyakobkkhol.supabase.co";
const SUPABASE_ANON = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZrdGp0eGxqd3p5YWtvYmtraG9sIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzU1ODE1ODYsImV4cCI6MjA5MTE1NzU4Nn0.LVNelw--Xp1t_weGNwhPGMrzqg0iS7J5TAXw9ZM6aUA";
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON);

const facebookProvider = new FacebookAuthProvider();
facebookProvider.addScope("email");

// ── Utilities ────────────────────────────────────────────────────────────────
function strengthScore(pw) {
  let s = 0;
  if (pw.length >= 8)           s++;
  if (/[A-Z]/.test(pw))         s++;
  if (/[0-9]/.test(pw))         s++;
  if (/[^A-Za-z0-9]/.test(pw))  s++;
  return s;
}

function normaliseSAPhone(raw) {
  const clean = raw.replace(/\s/g, "");
  if (clean.length === 10 && clean[0] === "0") return "+27" + clean.slice(1);
  if (clean.length === 9)                       return "+27" + clean;
  if (clean.startsWith("+"))                    return clean;
  return null;
}

// ── Shared UI ────────────────────────────────────────────────────────────────
function Err({ msg }) {
  if (!msg) return null;
  return <p style={s.err}>{msg}</p>;
}

function PwInput({ placeholder, value, onChange }) {
  const [show, setShow] = useState(false);
  return (
    <div style={s.pwWrap}>
      <input
        style={s.input}
        type={show ? "text" : "password"}
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
      <button type="button" style={s.eyeBtn} onClick={() => setShow((v) => !v)}>
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none"
          stroke="currentColor" strokeWidth="2" strokeLinecap="round">
          {show ? (
            <>
              <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94" />
              <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19" />
              <line x1="1" y1="1" x2="23" y2="23" />
            </>
          ) : (
            <>
              <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
              <circle cx="12" cy="12" r="3" />
            </>
          )}
        </svg>
      </button>
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

function OtpBoxes({ value, onChange }) {
  const refs = [];
  const onInput = (i, e) => {
    const ch   = e.target.value.replace(/\D/g, "").slice(-1);
    const next = [...value];
    next[i]    = ch;
    onChange(next);
    if (ch && refs[i + 1]) refs[i + 1].focus();
  };
  const onKey = (i, e) => {
    if (e.key === "Backspace" && !value[i] && refs[i - 1]) refs[i - 1].focus();
  };
  return (
    <div style={{ display: "flex", gap: 8, justifyContent: "center", margin: "20px 0" }}>
      {Array.from({ length: 6 }, (_, i) => (
        <input key={i} ref={(el) => (refs[i] = el)} style={s.otpBox}
          type="text" inputMode="numeric" maxLength={1} value={value[i] || ""}
          onChange={(e) => onInput(i, e)} onKeyDown={(e) => onKey(i, e)} />
      ))}
    </div>
  );
}

function SocialBtn({ icon, label, onClick, disabled }) {
  return (
    <button type="button" style={s.socialBtn} onClick={onClick} disabled={disabled}>
      {icon}
      <span style={{ fontSize: 14, fontWeight: 500 }}>{label}</span>
    </button>
  );
}

function Divider() {
  return (
    <div style={s.divider}>
      <div style={s.divLine} />
      <span style={s.divText}>or</span>
      <div style={s.divLine} />
    </div>
  );
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

const GoogleIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24">
    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"/>
    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
  </svg>
);

const FacebookIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24">
    <path fill="#1877F2" d="M24 12.073C24 5.405 18.627 0 12 0S0 5.405 0 12.073C0 18.1 4.388 23.094 10.125 24v-8.437H7.078v-3.49h3.047V9.41c0-3.025 1.791-4.697 4.533-4.697 1.312 0 2.686.236 2.686.236v2.97h-1.513c-1.491 0-1.956.93-1.956 1.886v2.267h3.328l-.532 3.49h-2.796V24C19.612 23.094 24 18.1 24 12.073z"/>
  </svg>
);

// ── Routing helpers (pure Supabase queries, no UI) ────────────────────────────
async function fetchProfile(identity) {
  const { data } = await supabase
    .from("profiles")
    .select("*")
    .eq("auth_provider",    identity.auth_provider)
    .eq("provider_user_id", identity.provider_user_id)
    .maybeSingle();
  return data || null;
}

async function fetchLatestApplication(identity) {
  const { data } = await supabase
    .from("role_applications")
    .select("*")
    .eq("auth_provider",    identity.auth_provider)
    .eq("provider_user_id", identity.provider_user_id)
    .in("requested_role", ["staff", "admin"])
    .order("submitted_at", { ascending: false })
    .maybeSingle();
  return data || null;
}

function isProfileComplete(profile) {
  return !!(profile?.name && profile?.surname && profile?.sex && profile?.id_number);
}

// ── Main Component ────────────────────────────────────────────────────────────
export default function AuthPage() {
  const navigate = useNavigate();

  const [selectedRole, setSelectedRole] = useState(null);
  const [page,         setPage]         = useState("role-select");
  const [error,        setError]        = useState("");
  const [loading,      setLoading]      = useState(false);

  // Email state
  const [loginEmail,  setLoginEmail]  = useState("");
  const [loginPw,     setLoginPw]     = useState("");
  const [isNewEmail,  setIsNewEmail]  = useState(false);
  const [newPw,       setNewPw]       = useState("");
  const [confirmPw,   setConfirmPw]   = useState("");
  const [emailOtp,    setEmailOtp]    = useState(Array(6).fill(""));

  // Phone state
  const [phone,    setPhone]    = useState("");
  const [phoneOtp, setPhoneOtp] = useState(Array(6).fill(""));

  const go = useCallback((p) => { setError(""); setPage(p); }, []);

  function chooseRole(role) { setSelectedRole(role); setError(""); setPage("home"); }

  // Invisible reCAPTCHA for phone login
  useEffect(() => {
    if (!auth) return;
    window.recaptchaVerifier = new RecaptchaVerifier(auth, "recaptcha-container", {
      size: "invisible",
      callback: () => {},
    });
    return () => { window.recaptchaVerifier = null; };
  }, []);

  // ── Central routing decision after any successful auth ───────────────────
  /**
   * Called once, after any login method succeeds.
   * identity = { auth_provider, provider_user_id, email, phone, name, surname }
   *
   * Decision tree:
   *  1. Profile exists & complete  →  /dashboard
   *  2. Application pending        →  pending screen
   *  3. Application rejected       →  error on home
   *  4. No profile yet             →  /profile-setup (ProfileStep page)
   *     - passes role + identity as route state so ProfileStep can act standalone
   */
  async function routeAfterLogin(identity) {
    localStorage.setItem("userIdentity", JSON.stringify(identity));
    const [profile, application] = await Promise.all([
      fetchProfile(identity),
      fetchLatestApplication(identity),
    ]);

    // Already fully set up
    if (profile && isProfileComplete(profile)) {
      navigate("/dashboard");
      return;
    }

    // Application in progress
    if (application?.status === "pending") {
      go(application.requested_role === "admin" ? "admin-pending" : "application-pending");
      return;
    }

    if (application?.status === "rejected") {
      setError(`Your ${application.requested_role} application was rejected.`);
      go("home");
      return;
    }

    // Needs profile completion — hand off to the dedicated page
    navigate("/profile-setup", {
      state: {
        identity:     { ...identity, name: profile?.name || identity.name || "",
                                     surname: profile?.surname || identity.surname || "",
                                     sex: profile?.sex || "" },
        selectedRole,
      },
    });
  }

  // ── Email/password ────────────────────────────────────────────────────────
  async function handleEmailSubmit(e) {
    e.preventDefault();
    setError("");
    if (!selectedRole) { setError("Choose an account type first."); go("role-select"); return; }
    if (!loginEmail.includes("@")) { setError("Enter a valid email."); return; }

    setLoading(true);

    if (!isNewEmail) {
      if (!loginPw) { setError("Enter your password."); setLoading(false); return; }
      const { error: err } = await supabase.auth.signInWithPassword({ email: loginEmail, password: loginPw });
      if (err) { setError("Incorrect email or password."); setLoading(false); return; }
      const { data: { user } } = await supabase.auth.getUser();
      setLoading(false);
      if (!user) { setError("Could not load your account."); return; }
      await routeAfterLogin({ auth_provider: "supabase", provider_user_id: user.id,
                               email: user.email || loginEmail, phone: user.phone || "" });
      return;
    }

    // Sign-up
    if (newPw.length < 8) { setError("Password must be at least 8 characters."); setLoading(false); return; }
    if (newPw !== confirmPw) { setError("Passwords do not match."); setLoading(false); return; }

    const { error: err } = await supabase.auth.signUp({
      email: loginEmail, password: newPw,
      options: { data: { email: loginEmail, role: selectedRole } },
    });
    setLoading(false);
    if (err) { setError(err.message || "Registration failed."); return; }
    go("email-otp");
  }

  async function handleEmailOtp() {
    setError(""); setLoading(true);
    const token = emailOtp.join("");
    if (token.length !== 6) { setError("Enter all 6 digits."); setLoading(false); return; }

    const { error: err } = await supabase.auth.verifyOtp({ email: loginEmail, token, type: "signup" });
    if (err) { setError("Invalid or expired code."); setLoading(false); return; }
    const { data: { user } } = await supabase.auth.getUser();
    setLoading(false);
    if (!user) { setError("Email verified but session could not be loaded."); return; }
    await routeAfterLogin({ auth_provider: "supabase", provider_user_id: user.id,
                             email: user.email || loginEmail, phone: user.phone || "" });
  }

  // ── Phone / OTP ───────────────────────────────────────────────────────────
  async function handlePhoneSubmit(e) {
    e?.preventDefault();
    setError("");
    if (!selectedRole) { setError("Choose an account type first."); go("role-select"); return; }
    const normalised = normaliseSAPhone(phone);
    if (!normalised) { setError("Enter a valid SA phone number."); return; }
    setLoading(true);
    try {
      await window.recaptchaVerifier.render();
      window.confirmationResult = await signInWithPhoneNumber(auth, normalised, window.recaptchaVerifier);
      setLoading(false);
      go("phone-otp");
    } catch (err) {
      setLoading(false);
      setError(err.message || "Could not send OTP.");
    }
  }

  async function handlePhoneOtp() {
    setError(""); setLoading(true);
    const code = phoneOtp.join("");
    if (code.length !== 6) { setError("Enter all 6 digits."); setLoading(false); return; }
    try {
      const result       = await window.confirmationResult.confirm(code);
      const firebaseUser = result.user;
      const normalised   = normaliseSAPhone(phone);
      setLoading(false);
      await routeAfterLogin({
        auth_provider:    "firebase",
        provider_user_id: firebaseUser.uid,
        email:            firebaseUser.email || "",
        phone:            normalised || firebaseUser.phoneNumber || "",
        name:             firebaseUser.displayName?.split(" ")[0] || "",
        surname:          firebaseUser.displayName?.split(" ").slice(1).join(" ") || "",
      });
    } catch {
      setLoading(false);
      setError("Wrong code. Try again.");
    }
  }

  // ── Social login ──────────────────────────────────────────────────────────
  async function handleSocialLogin(provider) {
    setError("");
    if (!selectedRole) { setError("Choose an account type first."); go("role-select"); return; }
    setLoading(true);
    try {
      const result = await signInWithPopup(auth, provider);
      const u      = result.user;
      const [first, ...rest] = (u.displayName || "").split(" ");
      setLoading(false);
      await routeAfterLogin({
        auth_provider:    "firebase",
        provider_user_id: u.uid,
        email:            u.email || "",
        phone:            u.phoneNumber || "",
        name:             first || "",
        surname:          rest.join(" ") || "",
      });
    } catch (err) {
      setLoading(false);
      setError(err.message || "Social login failed.");
    }
  }

  // ── Render ────────────────────────────────────────────────────────────────
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

        {/* ── Role select ── */}
        {page === "role-select" && (
          <div style={s.section}>
            <p style={s.title}>Choose account type</p>
            <p style={s.sub}>Select how you want to continue.</p>
            <button style={s.primaryBtn} onClick={() => chooseRole("patient")}>Continue as Patient</button>
            <button style={s.outlineBtn} onClick={() => chooseRole("staff")}>Continue as Staff</button>
            <button style={s.outlineBtn} onClick={() => chooseRole("admin")}>Continue as Admin</button>
          </div>
        )}

        {/* ── Home (login method picker) ── */}
        {page === "home" && (
          <div style={s.section}>
            <BackBtn onClick={() => go("role-select")} />
            <p style={s.title}>Welcome</p>
            <p style={s.sub}>Continue as <strong>{selectedRole || "user"}</strong>.</p>

            <SocialBtn icon={<GoogleIcon />}   label="Continue with Google"
              disabled={loading} onClick={() => handleSocialLogin(googleAuthProvider)} />
            <SocialBtn icon={<FacebookIcon />} label="Continue with Facebook"
              disabled={loading} onClick={() => handleSocialLogin(facebookProvider)} />

            <Divider />

            <button style={s.outlineBtn} onClick={() => go("email")}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
                stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
                <polyline points="22,6 12,13 2,6"/>
              </svg>
              Continue with Email
            </button>

            <button style={s.outlineBtn} onClick={() => go("phone")}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
                stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <rect x="5" y="2" width="14" height="20" rx="2" ry="2"/>
                <line x1="12" y1="18" x2="12.01" y2="18"/>
              </svg>
              Continue with Phone
            </button>

            <Err msg={error} />
          </div>
        )}

        {/* ── Email sign-in / sign-up ── */}
        {page === "email" && (
          <div style={s.section}>
            <BackBtn onClick={() => go("home")} />
            <p style={s.title}>{isNewEmail ? "Create account" : "Sign in"}</p>
            <p style={s.sub}>Use your email address</p>

            <form onSubmit={handleEmailSubmit}>
              <label style={s.label}>Email address</label>
              <input style={s.input} type="email" placeholder="jane@example.com"
                value={loginEmail} onChange={(e) => setLoginEmail(e.target.value)} required />

              {!isNewEmail && (
                <>
                  <label style={s.label}>Password</label>
                  <PwInput placeholder="Enter your password" value={loginPw} onChange={setLoginPw} />
                </>
              )}
              {isNewEmail && (
                <>
                  <label style={s.label}>New password</label>
                  <PwInput placeholder="Create a strong password" value={newPw} onChange={setNewPw} />
                  <StrengthBar score={strengthScore(newPw)} />
                  <label style={s.label}>Confirm password</label>
                  <PwInput placeholder="Repeat your password" value={confirmPw} onChange={setConfirmPw} />
                </>
              )}

              <Err msg={error} />
              <button style={s.primaryBtn} type="submit" disabled={loading}>
                {loading ? "Please wait…" : isNewEmail ? "Send verification code" : "Sign in"}
              </button>
            </form>

            <button style={s.linkBtn} onClick={() => { setIsNewEmail((v) => !v); setError(""); }}>
              {isNewEmail ? "Already have an account? Sign in" : "Don't have an account? Create one"}
            </button>
          </div>
        )}

        {/* ── Email OTP ── */}
        {page === "email-otp" && (
          <div style={s.section}>
            <BackBtn onClick={() => go("email")} />
            <p style={s.title}>Check your email</p>
            <p style={s.sub}>We sent a 6-digit code to <strong>{loginEmail}</strong></p>
            <OtpBoxes value={emailOtp} onChange={setEmailOtp} />
            <Err msg={error} />
            <button style={s.primaryBtn} onClick={handleEmailOtp} disabled={loading}>
              {loading ? "Verifying…" : "Verify code"}
            </button>
            <button style={s.linkBtn}
              onClick={() => supabase.auth.resend({ type: "signup", email: loginEmail })}>
              Resend code
            </button>
          </div>
        )}

        {/* ── Phone number entry ── */}
        {page === "phone" && (
          <div style={s.section}>
            <BackBtn onClick={() => go("home")} />
            <p style={s.title}>Enter your number</p>
            <p style={s.sub}>We'll send a one-time code via SMS</p>

            <form onSubmit={handlePhoneSubmit}>
              <label style={s.label}>Phone number</label>
              <div style={s.phoneWrap}>
                <span style={s.phoneCode}>+27</span>
                <input style={{ ...s.input, borderRadius: "0 8px 8px 0", marginBottom: 0 }}
                  type="tel" placeholder="821234567" value={phone}
                  onChange={(e) => setPhone(e.target.value)} required />
              </div>
              <p style={s.hint}>South African numbers only</p>
              <Err msg={error} />
              <button style={{ ...s.primaryBtn, marginTop: 8 }} type="submit" disabled={loading}>
                {loading ? "Sending…" : "Send OTP"}
              </button>
            </form>
          </div>
        )}

        {/* ── Phone OTP ── */}
        {page === "phone-otp" && (
          <div style={s.section}>
            <BackBtn onClick={() => go("phone")} />
            <p style={s.title}>Enter OTP</p>
            <p style={s.sub}>Code sent to <strong>+27 {phone}</strong></p>
            <OtpBoxes value={phoneOtp} onChange={setPhoneOtp} />
            <Err msg={error} />
            <button style={s.primaryBtn} onClick={handlePhoneOtp} disabled={loading}>
              {loading ? "Verifying…" : "Verify"}
            </button>
            <button style={s.linkBtn} onClick={(e) => { window.confirmationResult = null; handlePhoneSubmit(e); }}>
              Resend OTP
            </button>
          </div>
        )}

        {/* ── Post-submission status screens ── */}
        {page === "application-pending" && (
          <div style={s.section}>
            <p style={s.title}>Application submitted</p>
            <p style={s.sub}>Your staff application has been sent to the admin for approval. You'll receive a notification once it's reviewed.</p>
            <button style={s.primaryBtn} onClick={() => go("home")}>Back to sign in</button>
          </div>
        )}

        {page === "admin-pending" && (
          <div style={s.section}>
            <p style={s.title}>Admin application submitted</p>
            <p style={s.sub}>Your admin request is pending approval. You'll be able to access the admin dashboard once approved.</p>
            <button style={s.primaryBtn} onClick={() => go("home")}>Back to sign in</button>
          </div>
        )}

      </div>

      <section id="recaptcha-container" />
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
  pwWrap:   { position: "relative", marginBottom: 14 },
  eyeBtn:   { position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)",
               background: "none", border: "none", cursor: "pointer", color: "#888", padding: 4, display: "flex" },
  phoneWrap: { display: "flex", marginBottom: 0 },
  phoneCode: { display: "flex", alignItems: "center", padding: "0 12px", background: "#F3F2EE",
                border: "1.5px solid #E2E1DC", borderRight: "none", borderRadius: "8px 0 0 8px",
                fontSize: 14, color: "#444", whiteSpace: "nowrap" },
  otpBox:   { width: 46, height: 52, textAlign: "center", fontSize: 20, fontWeight: 600,
               borderRadius: 10, border: "1.5px solid #E2E1DC", background: "#FAFAF8",
               outline: "none", color: "#0A0A0A" },
  hint:     { margin: "-10px 0 14px", fontSize: 11, color: "#999" },
  err:      { margin: "0 0 12px", fontSize: 13, color: "#C0392B", background: "#FEF2F2",
               border: "1px solid #FECACA", borderRadius: 6, padding: "8px 10px" },
  primaryBtn: { display: "block", width: "100%", padding: "12px", background: "#0A0A0A",
                 color: "#fff", border: "none", borderRadius: 10, fontSize: 14, fontWeight: 600,
                 cursor: "pointer", marginBottom: 10 },
  outlineBtn: { display: "flex", alignItems: "center", justifyContent: "center", gap: 10,
                 width: "100%", padding: "11px 16px", background: "#fff", color: "#0A0A0A",
                 border: "1.5px solid #E2E1DC", borderRadius: 10, fontSize: 14, fontWeight: 500,
                 cursor: "pointer", marginBottom: 8 },
  socialBtn: { display: "flex", alignItems: "center", justifyContent: "center", gap: 10,
                width: "100%", padding: "11px 16px", background: "#fff", color: "#0A0A0A",
                border: "1.5px solid #E2E1DC", borderRadius: 10, fontSize: 14, fontWeight: 500,
                cursor: "pointer", marginBottom: 8 },
  linkBtn:  { display: "block", width: "100%", background: "none", border: "none", color: "#0A0A0A",
               fontSize: 13, textDecoration: "underline", cursor: "pointer", padding: "6px 0", textAlign: "center" },
  divider:  { display: "flex", alignItems: "center", gap: 10, margin: "16px 0" },
  divLine:  { flex: 1, height: 1, background: "#E8E7E3" },
  divText:  { fontSize: 12, color: "#999", fontWeight: 500 },
  backBtn:  { display: "flex", alignItems: "center", gap: 4, background: "none", border: "none",
               cursor: "pointer", color: "#666", fontSize: 13, padding: "0 0 16px", fontWeight: 500 },
};