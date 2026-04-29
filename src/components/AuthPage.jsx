/**
 * AuthPage.jsx – redesigned modern authentication flow
 * All original logic preserved, UI/UX completely overhauled.
 */
import { useState, useEffect, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabase";
import {
  signInWithPopup,
  RecaptchaVerifier,
  signInWithPhoneNumber,
  FacebookAuthProvider,
  GoogleAuthProvider,   // ← add this
} from "firebase/auth";
import { auth } from "../firebase";

// ── Supabase ────────────────────────────────────────────────────────────────


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

// ── Routing helpers (unchanged) ────────────────────────────────────────────────
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

// ── Reusable UI Components ──────────────────────────────────────────────────
const Logo = () => (
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
);

const LoadingSpinner = () => (
  <div style={styles.spinner}>
    <div style={styles.spinnerCircle} />
  </div>
);

const StrengthMeter = ({ score }) => {
  if (!score && score !== 0) return null;
  const levels = ["Very weak", "Weak", "Fair", "Good", "Strong"];
  const colors = ["#E24B4A", "#EF9F27", "#F4C542", "#1D9E75", "#0F6E56"];
  return (
    <div style={styles.strengthContainer}>
      <div style={styles.strengthBarContainer}>
        {[0, 1, 2, 3, 4].map((i) => (
          <div
            key={i}
            style={{
              ...styles.strengthSegment,
              backgroundColor: i < score ? colors[score - 1] : "#E5E7EB",
            }}
          />
        ))}
      </div>
      {score > 0 && <span style={styles.strengthLabel}>{levels[score - 1]}</span>}
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
    <div style={styles.otpContainer}>
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
          style={styles.otpBox}
          aria-label={`OTP digit ${idx + 1}`}
        />
      ))}
    </div>
  );
};

const SocialButton = ({ icon, label, onClick, disabled }) => (
  <button type="button" style={styles.socialBtn} onClick={onClick} disabled={disabled}>
    {icon}
    <span>{label}</span>
  </button>
);

const BackButton = ({ onClick }) => (
  <button type="button" style={styles.backBtn} onClick={onClick}>
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
      <polyline points="15 18 9 12 15 6" />
    </svg>
    Back
  </button>
);

const Divider = () => (
  <div style={styles.divider}>
    <div style={styles.divLine} />
    <span style={styles.divText}>or</span>
    <div style={styles.divLine} />
  </div>
);

const ErrorMessage = ({ msg }) =>
  msg ? <div style={styles.errorContainer}>⚠️ {msg}</div> : null;

// ── Main Component ────────────────────────────────────────────────────────────
export default function AuthPage() {
  const navigate = useNavigate();

  const [selectedRole, setSelectedRole] = useState(null);
  const [page, setPage] = useState("role-select");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  // Email state
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPw, setLoginPw] = useState("");
  const [isNewEmail, setIsNewEmail] = useState(false);
  const [newPw, setNewPw] = useState("");
  const [confirmPw, setConfirmPw] = useState("");
  const [emailOtp, setEmailOtp] = useState(Array(6).fill(""));

  // Phone state
  const [phone, setPhone] = useState("");
  const [phoneOtp, setPhoneOtp] = useState(Array(6).fill(""));
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

  // Resend OTP timer effect
  useEffect(() => {
    if (resendTimer <= 0) return;
    const interval = setInterval(() => setResendTimer((t) => t - 1), 1000);
    return () => clearInterval(interval);
  }, [resendTimer]);

  // ── Central routing decision (unchanged) ───────────────────────────────────
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
        identity: { ...identity, name: profile?.name || identity.name || "",
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
      const result = await window.confirmationResult.confirm(code);
      const firebaseUser = result.user;
      const normalised = normaliseSAPhone(phone);
      setLoading(false);
      await routeAfterLogin({
        auth_provider: "firebase",
        provider_user_id: firebaseUser.uid,
        email: firebaseUser.email || "",
        phone: normalised || firebaseUser.phoneNumber || "",
        name: firebaseUser.displayName?.split(" ")[0] || "",
        surname: firebaseUser.displayName?.split(" ").slice(1).join(" ") || "",
      });
    } catch {
      setLoading(false);
      setError("Wrong code. Try again.");
    }
  }

  async function resendOtp() {
    if (resendTimer > 0) return;
    setError("");
    setLoading(true);
    try {
      await window.recaptchaVerifier.render();
      window.confirmationResult = await signInWithPhoneNumber(auth, normaliseSAPhone(phone), window.recaptchaVerifier);
      setResendTimer(30);
      setLoading(false);
    } catch (err) {
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
      const result = await signInWithPopup(auth, provider);
      const u = result.user;
      const [first, ...rest] = (u.displayName || "").split(" ");
      setLoading(false);
      await routeAfterLogin({
        auth_provider: "firebase",
        provider_user_id: u.uid,
        email: u.email || "",
        phone: u.phoneNumber || "",
        name: first || "",
        surname: rest.join(" ") || "",
      });
    } catch (err) {
      setLoading(false);
      setError(err.message || "Social login failed.");
    }
  }

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div style={styles.root}>
      <Logo />

      <div style={styles.card}>
        {/* Role select */}
        {page === "role-select" && (
          <div style={styles.section}>
            <h2 style={styles.title}>Welcome to MediAccess</h2>
            <p style={styles.sub}>Select how you'd like to continue</p>
            <button style={styles.primaryBtn} onClick={() => chooseRole("patient")}>
              Continue as Patient
            </button>
            <button style={styles.outlineBtn} onClick={() => chooseRole("staff")}>
              Continue as Staff
            </button>
            <button style={styles.outlineBtn} onClick={() => chooseRole("admin")}>
              Continue as Admin
            </button>
          </div>
        )}

        {/* Login method picker */}
        {page === "home" && (
          <div style={styles.section}>
            <BackButton onClick={() => go("role-select")} />
            <h2 style={styles.title}>Sign in to MediAccess</h2>
            <p style={styles.sub}>Continue as <strong>{selectedRole}</strong></p>

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

            <button style={styles.outlineBtn} onClick={() => go("email")}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
                <polyline points="22,6 12,13 2,6"/>
              </svg>
              Continue with Email
            </button>

            <button style={styles.outlineBtn} onClick={() => go("phone")}>
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
          <div style={styles.section}>
            <BackButton onClick={() => go("home")} />
            <h2 style={styles.title}>{isNewEmail ? "Create account" : "Sign in"}</h2>
            <p style={styles.sub}>Use your email address</p>

            <form onSubmit={handleEmailSubmit}>
              <label style={styles.label}>Email address</label>
              <input
                style={styles.input}
                type="email"
                placeholder="jane@example.com"
                value={loginEmail}
                onChange={(e) => setLoginEmail(e.target.value)}
                required
              />

              {!isNewEmail && (
                <>
                  <label style={styles.label}>Password</label>
                  <input
                    style={styles.input}
                    type="password"
                    placeholder="Enter your password"
                    value={loginPw}
                    onChange={(e) => setLoginPw(e.target.value)}
                  />
                </>
              )}

              {isNewEmail && (
                <>
                  <label style={styles.label}>New password</label>
                  <input
                    style={styles.input}
                    type="password"
                    placeholder="Create a strong password"
                    value={newPw}
                    onChange={(e) => setNewPw(e.target.value)}
                  />
                  <StrengthMeter score={strengthScore(newPw)} />
                  <label style={styles.label}>Confirm password</label>
                  <input
                    style={styles.input}
                    type="password"
                    placeholder="Repeat your password"
                    value={confirmPw}
                    onChange={(e) => setConfirmPw(e.target.value)}
                  />
                </>
              )}

              <ErrorMessage msg={error} />
              <button style={styles.primaryBtn} type="submit" disabled={loading}>
                {loading ? <LoadingSpinner /> : (isNewEmail ? "Send verification code" : "Sign in")}
              </button>
            </form>

            <button style={styles.linkBtn} onClick={() => { setIsNewEmail(!isNewEmail); setError(""); }}>
              {isNewEmail ? "Already have an account? Sign in" : "Don't have an account? Create one"}
            </button>
          </div>
        )}

        {/* Email OTP */}
        {page === "email-otp" && (
          <div style={styles.section}>
            <BackButton onClick={() => go("email")} />
            <h2 style={styles.title}>Check your email</h2>
            <p style={styles.sub}>We sent a 6‑digit code to <strong>{loginEmail}</strong></p>
            <OtpInput value={emailOtp} onChange={setEmailOtp} />
            <ErrorMessage msg={error} />
            <button style={styles.primaryBtn} onClick={handleEmailOtp} disabled={loading}>
              {loading ? <LoadingSpinner /> : "Verify code"}
            </button>
            <button style={styles.linkBtn} onClick={() => supabase.auth.resend({ type: "signup", email: loginEmail })}>
              Resend code
            </button>
          </div>
        )}

        {/* Phone number entry */}
        {page === "phone" && (
          <div style={styles.section}>
            <BackButton onClick={() => go("home")} />
            <h2 style={styles.title}>Enter your number</h2>
            <p style={styles.sub}>We'll send a one‑time code via SMS</p>

            <form onSubmit={handlePhoneSubmit}>
              <label style={styles.label}>Phone number</label>
              <div style={styles.phoneWrap}>
                <span style={styles.phoneCode}>+27</span>
                <input
                  style={{ ...styles.input, borderRadius: "0 12px 12px 0", marginBottom: 0 }}
                  type="tel"
                  placeholder="821234567"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  required
                />
              </div>
              <p style={styles.hint}>South African numbers only</p>
              <ErrorMessage msg={error} />
              <button style={{ ...styles.primaryBtn, marginTop: 8 }} type="submit" disabled={loading}>
                {loading ? <LoadingSpinner /> : "Send OTP"}
              </button>
            </form>
          </div>
        )}

        {/* Phone OTP */}
        {page === "phone-otp" && (
          <div style={styles.section}>
            <BackButton onClick={() => go("phone")} />
            <h2 style={styles.title}>Enter OTP</h2>
            <p style={styles.sub}>Code sent to <strong>+27 {phone}</strong></p>
            <OtpInput value={phoneOtp} onChange={setPhoneOtp} />
            <ErrorMessage msg={error} />
            <button style={styles.primaryBtn} onClick={handlePhoneOtp} disabled={loading}>
              {loading ? <LoadingSpinner /> : "Verify"}
            </button>
            <button
              style={{ ...styles.linkBtn, opacity: resendTimer > 0 ? 0.5 : 1 }}
              onClick={resendOtp}
              disabled={resendTimer > 0 || loading}
            >
              {resendTimer > 0 ? `Resend in ${resendTimer}s` : "Resend OTP"}
            </button>
          </div>
        )}

        {/* Pending screens (unchanged) */}
        {page === "application-pending" && (
          <div style={styles.section}>
            <h2 style={styles.title}>Application submitted</h2>
            <p style={styles.sub}>
              Your staff application has been sent to the admin for approval.
              You'll receive a notification once it's reviewed.
            </p>
            <button style={styles.primaryBtn} onClick={() => go("home")}>Back to sign in</button>
          </div>
        )}

        {page === "admin-pending" && (
          <div style={styles.section}>
            <h2 style={styles.title}>Admin application submitted</h2>
            <p style={styles.sub}>
              Your admin request is pending approval. You'll be able to access
              the admin dashboard once approved.
            </p>
            <button style={styles.primaryBtn} onClick={() => go("home")}>Back to sign in</button>
          </div>
        )}
      </div>

      <div id="recaptcha-container" />
    </div>
  );
}

// ── Icons (unchanged) ──────────────────────────────────────────────────────
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

// ── Enhanced Styles ─────────────────────────────────────────────────────────
const styles = {
  root: {
    minHeight: "100vh",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    padding: "32px 16px",
    background: "linear-gradient(135deg, #F6F9FC 0%, #EDF2F7 100%)",
    fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, sans-serif",
  },
  logo: {
    display: "flex",
    alignItems: "center",
    gap: 12,
    marginBottom: 28,
  },
  logoMark: {
    width: 48,
    height: 48,
    borderRadius: 16,
    background: "#1B5E20",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    boxShadow: "0 10px 15px -3px rgba(0,0,0,0.1)",
  },
  logoName: {
    margin: 0,
    fontSize: 20,
    fontWeight: 700,
    color: "#1B5E20",
    letterSpacing: "-0.3px",
  },
  logoSub: {
    margin: 0,
    fontSize: 11,
    color: "#5B6E8C",
    letterSpacing: "0.2px",
  },
  card: {
    width: "100%",
    maxWidth: 440,
    background: "#FFFFFF",
    borderRadius: 32,
    boxShadow: "0 25px 50px -12px rgba(0,0,0,0.15)",
    overflow: "hidden",
    transition: "transform 0.2s ease",
  },
  section: {
    padding: "32px 28px 28px",
  },
  title: {
    margin: "0 0 6px",
    fontSize: 26,
    fontWeight: 700,
    color: "#0F2B1D",
    letterSpacing: "-0.5px",
  },
  sub: {
    margin: "0 0 24px",
    fontSize: 14,
    color: "#4A5568",
    lineHeight: 1.5,
  },
  label: {
    display: "block",
    fontSize: 12,
    fontWeight: 600,
    color: "#2D3748",
    marginBottom: 6,
    textTransform: "uppercase",
    letterSpacing: "0.5px",
  },
  input: {
    display: "block",
    width: "100%",
    boxSizing: "border-box",
    padding: "12px 16px",
    borderRadius: 12,
    border: "1.5px solid #E2E8F0",
    fontSize: 14,
    color: "#1A202C",
    background: "#FFFFFF",
    marginBottom: 16,
    outline: "none",
    transition: "all 0.2s",
    ":focus": {
      borderColor: "#1B5E20",
      boxShadow: "0 0 0 3px rgba(27,94,32,0.1)",
    },
  },
  phoneWrap: {
    display: "flex",
    marginBottom: 8,
  },
  phoneCode: {
    display: "flex",
    alignItems: "center",
    padding: "0 16px",
    background: "#F7FAFC",
    border: "1.5px solid #E2E8F0",
    borderRight: "none",
    borderRadius: "12px 0 0 12px",
    fontSize: 14,
    color: "#2D3748",
    whiteSpace: "nowrap",
  },
  otpContainer: {
    display: "flex",
    gap: 10,
    justifyContent: "center",
    margin: "24px 0 20px",
  },
  otpBox: {
    width: 52,
    height: 56,
    textAlign: "center",
    fontSize: 22,
    fontWeight: 600,
    borderRadius: 14,
    border: "1.5px solid #E2E8F0",
    background: "#FFFFFF",
    outline: "none",
    color: "#1A202C",
    transition: "all 0.2s",
    ":focus": {
      borderColor: "#1B5E20",
      boxShadow: "0 0 0 3px rgba(27,94,32,0.1)",
    },
  },
  hint: {
    margin: "-8px 0 16px",
    fontSize: 11,
    color: "#718096",
  },
  errorContainer: {
    margin: "16px 0 12px",
    fontSize: 13,
    color: "#C53030",
    background: "#FFF5F5",
    border: "1px solid #FED7D7",
    borderRadius: 12,
    padding: "10px 14px",
    display: "flex",
    alignItems: "center",
    gap: 8,
  },
  primaryBtn: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    width: "100%",
    padding: "12px 20px",
    background: "#1B5E20",
    color: "#FFFFFF",
    border: "none",
    borderRadius: 14,
    fontSize: 14,
    fontWeight: 600,
    cursor: "pointer",
    transition: "all 0.2s",
    ":hover": {
      background: "#144C18",
      transform: "scale(0.98)",
    },
    ":disabled": {
      opacity: 0.6,
      cursor: "not-allowed",
    },
  },
  outlineBtn: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    width: "100%",
    padding: "11px 16px",
    background: "#FFFFFF",
    color: "#1A202C",
    border: "1.5px solid #E2E8F0",
    borderRadius: 14,
    fontSize: 14,
    fontWeight: 500,
    cursor: "pointer",
    marginBottom: 10,
    transition: "all 0.2s",
    ":hover": {
      background: "#F7FAFC",
      borderColor: "#CBD5E0",
    },
  },
  socialBtn: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
    width: "100%",
    padding: "11px 16px",
    background: "#FFFFFF",
    color: "#1A202C",
    border: "1.5px solid #E2E8F0",
    borderRadius: 14,
    fontSize: 14,
    fontWeight: 500,
    cursor: "pointer",
    marginBottom: 10,
    transition: "all 0.2s",
    ":hover": {
      background: "#F7FAFC",
      transform: "translateY(-1px)",
    },
  },
  linkBtn: {
    display: "block",
    width: "100%",
    background: "none",
    border: "none",
    color: "#1B5E20",
    fontSize: 13,
    fontWeight: 500,
    cursor: "pointer",
    padding: "8px 0",
    textAlign: "center",
    transition: "opacity 0.2s",
    ":hover": {
      textDecoration: "underline",
    },
  },
  divider: {
    display: "flex",
    alignItems: "center",
    gap: 12,
    margin: "20px 0",
  },
  divLine: {
    flex: 1,
    height: 1,
    background: "#E2E8F0",
  },
  divText: {
    fontSize: 12,
    color: "#A0AEC0",
    fontWeight: 500,
  },
  backBtn: {
    display: "flex",
    alignItems: "center",
    gap: 6,
    background: "none",
    border: "none",
    cursor: "pointer",
    color: "#4A5568",
    fontSize: 13,
    fontWeight: 500,
    padding: "0 0 20px",
    transition: "color 0.2s",
    ":hover": {
      color: "#1B5E20",
    },
  },
  strengthContainer: {
    marginTop: -8,
    marginBottom: 16,
  },
  strengthBarContainer: {
    display: "flex",
    gap: 6,
    marginBottom: 6,
  },
  strengthSegment: {
    flex: 1,
    height: 4,
    borderRadius: 4,
    transition: "background-color 0.2s",
  },
  strengthLabel: {
    fontSize: 11,
    color: "#718096",
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
};

// Inject keyframes for spinner animation
const styleSheet = document.createElement("style");
styleSheet.textContent = `
  @keyframes spin { to { transform: rotate(360deg); } }
  button:hover, .social-btn:hover { transform: translateY(-1px); }
`;
document.head.appendChild(styleSheet);