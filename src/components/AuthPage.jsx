/**
 * AuthPage.jsx – redesigned modern authentication flow
 * All original logic preserved, UI/UX completely overhauled.
 */
import { useState, useEffect, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "#lib/supabase";
import "./AuthPage.css";

import {
  signInWithPopup,
  RecaptchaVerifier,
  signInWithPhoneNumber,
  FacebookAuthProvider,
  GoogleAuthProvider,
} from "firebase/auth";
import { auth } from "../firebase";

const facebookProvider = new FacebookAuthProvider();
facebookProvider.addScope("email");
const googleAuthProvider = new GoogleAuthProvider();
googleAuthProvider.addScope("email");
googleAuthProvider.addScope("profile");

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

// ── Routing helpers ───────────────────────────────────────────────────────────
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

// ── Reusable UI Components ────────────────────────────────────────────────────
const Logo = () => (
  <div className="auth-logo">
    <div className="auth-logo-mark">
      <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="white" strokeWidth="1.8">
        <path d="M12 2L2 7l10 5 10-5-10-5z"/>
        <path d="M2 17l10 5 10-5"/>
        <path d="M2 12l10 5 10-5"/>
      </svg>
    </div>
    <div>
      <h1 className="auth-logo-name">MediAccess</h1>
      <p className="auth-logo-sub">Integrated Healthcare Management</p>
    </div>
  </div>
);

const LoadingSpinner = () => (
  <div className="auth-spinner">
    <div className="auth-spinner-circle" />
  </div>
);

const StrengthMeter = ({ score }) => {
  if (!score && score !== 0) return null;
  const levels = ["Very weak", "Weak", "Fair", "Good", "Strong"];
  const colors = ["#E24B4A", "#EF9F27", "#F4C542", "#1D9E75", "#0F6E56"];
  return (
    <div className="auth-strength-container">
      <div className="auth-strength-bar-container">
        {[0, 1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className="auth-strength-segment"
            style={{ backgroundColor: i < score ? colors[score - 1] : "#E5E7EB" }}
          />
        ))}
      </div>
      {score > 0 && <span className="auth-strength-label">{levels[score - 1]}</span>}
    </div>
  );
};

const OtpInput = ({ value, onChange }) => {
  const inputsRef = useRef([]);

  const handleChange = (index, e) => {
    const digit = e.target.value.replace(/\D/g, "").slice(-1);
    const newOtp = [...value];
    newOtp[index] = digit;
    onChange(newOtp);
    if (digit && index < 5) inputsRef.current[index + 1]?.focus();
  };

  const handleKeyDown = (index, e) => {
    if (e.key === "Backspace" && !value[index] && index > 0) {
      inputsRef.current[index - 1]?.focus();
    }
  };

  const handlePaste = (e) => {
    e.preventDefault();
    const paste = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
    const newOtp = paste.split("");
    while (newOtp.length < 6) newOtp.push("");
    onChange(newOtp);
    inputsRef.current[Math.min(5, paste.length - 1)]?.focus();
  };

  return (
    <div className="auth-otp-container">
      {value.map((digit, idx) => (
        <input
          key={idx}
          ref={(el) => (inputsRef.current[idx] = el)}
          type="text"
          inputMode="numeric"
          maxLength={1}
          value={digit}
          onChange={(e) => handleChange(idx, e)}
          onKeyDown={(e) => handleKeyDown(idx, e)}
          onPaste={idx === 0 ? handlePaste : undefined}
          className="auth-otp-box"
          aria-label={`OTP digit ${idx + 1}`}
        />
      ))}
    </div>
  );
};

const SocialButton = ({ icon, label, onClick, disabled }) => (
  <button type="button" className="auth-btn-social" onClick={onClick} disabled={disabled}>
    {icon}
    <span>{label}</span>
  </button>
);

const BackButton = ({ onClick }) => (
  <button type="button" className="auth-btn-back" onClick={onClick}>
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
      <polyline points="15 18 9 12 15 6" />
    </svg>
    Back
  </button>
);

const Divider = () => (
  <div className="auth-divider">
    <div className="auth-div-line" />
    <span className="auth-div-text">or</span>
    <div className="auth-div-line" />
  </div>
);

const ErrorMessage = ({ msg }) =>
  msg ? <div className="auth-error">⚠️ {msg}</div> : null;

// ── Main Component ────────────────────────────────────────────────────────────
export default function AuthPage() {
  const navigate = useNavigate();

  const [selectedRole, setSelectedRole] = useState(null);
  const [page, setPage]                 = useState("role-select");
  const [error, setError]               = useState("");
  const [loading, setLoading]           = useState(false);

  // Email state
  const [loginEmail, setLoginEmail]   = useState("");
  const [loginPw, setLoginPw]         = useState("");
  const [isNewEmail, setIsNewEmail]   = useState(false);
  const [newPw, setNewPw]             = useState("");
  const [confirmPw, setConfirmPw]     = useState("");
  const [emailOtp, setEmailOtp]       = useState(Array(6).fill(""));

  // Phone state
  const [phone, setPhone]             = useState("");
  const [phoneOtp, setPhoneOtp]       = useState(Array(6).fill(""));
  const [resendTimer, setResendTimer] = useState(0);

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

  // Resend OTP timer
  useEffect(() => {
    if (resendTimer <= 0) return;
    const interval = setInterval(() => setResendTimer((t) => t - 1), 1000);
    return () => clearInterval(interval);
  }, [resendTimer]);

  // ── Central routing decision ───────────────────────────────────────────────
  async function routeAfterLogin(identity) {
    localStorage.setItem("userIdentity", JSON.stringify(identity));
    const [profile, application] = await Promise.all([
      fetchProfile(identity),
      fetchLatestApplication(identity),
    ]);

    if (profile && isProfileComplete(profile)) {
      navigate("/dashboard");
      return;
    }

    if (application?.status === "pending") {
      go(application.requested_role === "admin" ? "admin-pending" : "application-pending");
      return;
    }

    if (application?.status === "rejected") {
      setError(`Your ${application.requested_role} application was rejected.`);
      go("home");
      return;
    }

    navigate("/profile-setup", {
      state: {
        identity: {
          ...identity,
          name:    profile?.name    || identity.name    || "",
          surname: profile?.surname || identity.surname || "",
          sex:     profile?.sex     || "",
        },
        selectedRole,
      },
    });
  }

  // ── Email / password ──────────────────────────────────────────────────────
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
      await routeAfterLogin({
        auth_provider: "supabase", provider_user_id: user.id,
        email: user.email || loginEmail, phone: user.phone || "",
      });
      return;
    }

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
    await routeAfterLogin({
      auth_provider: "supabase", provider_user_id: user.id,
      email: user.email || loginEmail, phone: user.phone || "",
    });
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
      setResendTimer(30);
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
        email:   firebaseUser.email || "",
        phone:   normalised || firebaseUser.phoneNumber || "",
        name:    firebaseUser.displayName?.split(" ")[0]          || "",
        surname: firebaseUser.displayName?.split(" ").slice(1).join(" ") || "",
      });
    } catch {
      setLoading(false);
      setError("Wrong code. Try again.");
    }
  }

  async function resendOtp() {
    if (resendTimer > 0) return;
    setError(""); setLoading(true);
    try {
      await window.recaptchaVerifier.render();
      window.confirmationResult = await signInWithPhoneNumber(
        auth, normaliseSAPhone(phone), window.recaptchaVerifier
      );
      setResendTimer(30);
      setLoading(false);
    } catch {
      setLoading(false);
      setError("Could not resend OTP. Try again.");
    }
  }

  // ── Social login ──────────────────────────────────────────────────────────
  async function handleSocialLogin(provider) {
    setError("");
    if (!selectedRole) { setError("Choose an account type first."); go("role-select"); return; }
    setLoading(true);
    try {
      const result   = await signInWithPopup(auth, provider);
      const u        = result.user;
      const [first, ...rest] = (u.displayName || "").split(" ");
      setLoading(false);
      await routeAfterLogin({
        auth_provider:    "firebase",
        provider_user_id: u.uid,
        email:   u.email       || "",
        phone:   u.phoneNumber || "",
        name:    first         || "",
        surname: rest.join(" ") || "",
      });
    } catch (err) {
      setLoading(false);
      setError(err.message || "Social login failed.");
    }
  }

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="auth-root">
      <Logo />

      <div className="auth-card">
        {/* Role select */}
        {page === "role-select" && (
          <div className="auth-section">
            <h2 className="auth-title">Welcome to MediAccess</h2>
            <p className="auth-sub">Select how you'd like to continue</p>
            <button className="auth-btn-primary" onClick={() => chooseRole("patient")}>
              Continue as Patient
            </button>
            <button className="auth-btn-outline" onClick={() => chooseRole("staff")}>
              Continue as Staff
            </button>
            <button className="auth-btn-outline" onClick={() => chooseRole("admin")}>
              Continue as Admin
            </button>
          </div>
        )}

        {/* Login method picker */}
        {page === "home" && (
          <div className="auth-section">
            <BackButton onClick={() => go("role-select")} />
            <h2 className="auth-title">Sign in to MediAccess</h2>
            <p className="auth-sub">Continue as <strong>{selectedRole}</strong></p>

            <SocialButton
              icon={<GoogleIcon />}
              label="Continue with Google"
              onClick={() => handleSocialLogin(googleAuthProvider)}
              disabled={loading}
            />
            <SocialButton
              icon={<FacebookIcon />}
              label="Continue with Facebook"
              onClick={() => handleSocialLogin(facebookProvider)}
              disabled={loading}
            />

            <Divider />

            <button className="auth-btn-outline" onClick={() => go("email")}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
                <polyline points="22,6 12,13 2,6"/>
              </svg>
              Continue with Email
            </button>

            <button className="auth-btn-outline" onClick={() => go("phone")}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="5" y="2" width="14" height="20" rx="2" ry="2"/>
                <line x1="12" y1="18" x2="12.01" y2="18"/>
              </svg>
              Continue with Phone
            </button>

            <ErrorMessage msg={error} />
          </div>
        )}

        {/* Email sign-in / sign-up */}
        {page === "email" && (
          <div className="auth-section">
            <BackButton onClick={() => go("home")} />
            <h2 className="auth-title">{isNewEmail ? "Create account" : "Sign in"}</h2>
            <p className="auth-sub">Use your email address</p>

            <form onSubmit={handleEmailSubmit}>
              <label className="auth-label">Email address</label>
              <input
                className="auth-input"
                type="email"
                placeholder="jane@example.com"
                value={loginEmail}
                onChange={(e) => setLoginEmail(e.target.value)}
                required
              />

              {!isNewEmail && (
                <>
                  <label className="auth-label">Password</label>
                  <input
                    className="auth-input"
                    type="password"
                    placeholder="Enter your password"
                    value={loginPw}
                    onChange={(e) => setLoginPw(e.target.value)}
                  />
                </>
              )}

              {isNewEmail && (
                <>
                  <label className="auth-label">New password</label>
                  <input
                    className="auth-input"
                    type="password"
                    placeholder="Create a strong password"
                    value={newPw}
                    onChange={(e) => setNewPw(e.target.value)}
                  />
                  <StrengthMeter score={strengthScore(newPw)} />
                  <label className="auth-label">Confirm password</label>
                  <input
                    className="auth-input"
                    type="password"
                    placeholder="Repeat your password"
                    value={confirmPw}
                    onChange={(e) => setConfirmPw(e.target.value)}
                  />
                </>
              )}

              <ErrorMessage msg={error} />
              <button className="auth-btn-primary" type="submit" disabled={loading}>
                {loading ? <LoadingSpinner /> : (isNewEmail ? "Send verification code" : "Sign in")}
              </button>
            </form>

            <button
              className="auth-btn-link"
              onClick={() => { setIsNewEmail(!isNewEmail); setError(""); }}
            >
              {isNewEmail ? "Already have an account? Sign in" : "Don't have an account? Create one"}
            </button>
          </div>
        )}

        {/* Email OTP */}
        {page === "email-otp" && (
          <div className="auth-section">
            <BackButton onClick={() => go("email")} />
            <h2 className="auth-title">Check your email</h2>
            <p className="auth-sub">We sent a 6‑digit code to <strong>{loginEmail}</strong></p>
            <OtpInput value={emailOtp} onChange={setEmailOtp} />
            <ErrorMessage msg={error} />
            <button className="auth-btn-primary" onClick={handleEmailOtp} disabled={loading}>
              {loading ? <LoadingSpinner /> : "Verify code"}
            </button>
            <button
              className="auth-btn-link"
              onClick={() => supabase.auth.resend({ type: "signup", email: loginEmail })}
            >
              Resend code
            </button>
          </div>
        )}

        {/* Phone number entry */}
        {page === "phone" && (
          <div className="auth-section">
            <BackButton onClick={() => go("home")} />
            <h2 className="auth-title">Enter your number</h2>
            <p className="auth-sub">We'll send a one‑time code via SMS</p>

            <form onSubmit={handlePhoneSubmit}>
              <label className="auth-label">Phone number</label>
              <div className="auth-phone-wrap">
                <span className="auth-phone-code">+27</span>
                <input
                  className="auth-input auth-input--phone"
                  type="tel"
                  placeholder="821234567"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  required
                />
              </div>
              <p className="auth-hint">South African numbers only</p>
              <ErrorMessage msg={error} />
              <button className="auth-btn-primary auth-btn-primary--mt" type="submit" disabled={loading}>
                {loading ? <LoadingSpinner /> : "Send OTP"}
              </button>
            </form>
          </div>
        )}

        {/* Phone OTP */}
        {page === "phone-otp" && (
          <div className="auth-section">
            <BackButton onClick={() => go("phone")} />
            <h2 className="auth-title">Enter OTP</h2>
            <p className="auth-sub">Code sent to <strong>+27 {phone}</strong></p>
            <OtpInput value={phoneOtp} onChange={setPhoneOtp} />
            <ErrorMessage msg={error} />
            <button className="auth-btn-primary" onClick={handlePhoneOtp} disabled={loading}>
              {loading ? <LoadingSpinner /> : "Verify"}
            </button>
            <button
              className="auth-btn-link"
              style={{ opacity: resendTimer > 0 ? 0.5 : 1 }}
              onClick={resendOtp}
              disabled={resendTimer > 0 || loading}
            >
              {resendTimer > 0 ? `Resend in ${resendTimer}s` : "Resend OTP"}
            </button>
          </div>
        )}

        {/* Pending screens */}
        {page === "application-pending" && (
          <div className="auth-section">
            <h2 className="auth-title">Application submitted</h2>
            <p className="auth-sub">
              Your staff application has been sent to the admin for approval.
              You'll receive a notification once it's reviewed.
            </p>
            <button className="auth-btn-primary" onClick={() => go("home")}>Back to sign in</button>
          </div>
        )}

        {page === "admin-pending" && (
          <div className="auth-section">
            <h2 className="auth-title">Admin application submitted</h2>
            <p className="auth-sub">
              Your admin request is pending approval. You'll be able to access
              the admin dashboard once approved.
            </p>
            <button className="auth-btn-primary" onClick={() => go("home")}>Back to sign in</button>
          </div>
        )}
      </div>

      <div id="recaptcha-container" />
    </div>
  );
}

// ── Icons ─────────────────────────────────────────────────────────────────────
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