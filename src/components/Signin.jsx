import { useState, useRef, useCallback } from "react";
import { createClient } from "@supabase/supabase-js";
import { useNavigate } from "react-router-dom";
import "./Signin.css";

// ── Supabase client ───────────────────────────────────────────
const supabase = createClient(
  "https://vktjtxljwzyakobkkhol.supabase.co",
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZrdGp0eGxqd3p5YWtvYmtraG9sIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzU1ODE1ODYsImV4cCI6MjA5MTE1NzU4Nn0.LVNelw--Xp1t_weGNwhPGMrzqg0iS7J5TAXw9ZM6aUA"
);

// ── Utilities ─────────────────────────────────────────────────
function dobFromSAId(idNum) {
  if (!idNum || idNum.length < 6) return null;
  const yy = parseInt(idNum.slice(0, 2), 10);
  const mm = idNum.slice(2, 4);
  const dd = idNum.slice(4, 6);
  const yyyy = yy <= 25 ? `20${String(yy).padStart(2, "0")}` : `19${String(yy).padStart(2, "0")}`;
  return `${yyyy}-${mm}-${dd}`;
}

function strengthScore(val) {
  let s = 0;
  if (val.length >= 8) s++;
  if (/[A-Z]/.test(val)) s++;
  if (/[0-9]/.test(val)) s++;
  if (/[^A-Za-z0-9]/.test(val)) s++;
  return s;
}

const STRENGTH_COLORS = ["#E24B4A", "#EF9F27", "#1D9E75", "#0F6E56"];

// ── Sub-components ────────────────────────────────────────────

function OtpRow({ value, onChange }) {
  const refs = useRef([]);

  const handleInput = (i, e) => {
    const char = e.target.value.replace(/\D/g, "").slice(-1);
    const next = [...value];
    next[i] = char;
    onChange(next);
    if (char && refs.current[i + 1]) refs.current[i + 1].focus();
  };

  const handleKeyDown = (i, e) => {
    if (e.key === "Backspace" && !value[i] && refs.current[i - 1]) {
      refs.current[i - 1].focus();
    }
  };

  return (
    <div className="otp-row">
      {Array.from({ length: 6 }, (_, i) => (
        <input
          key={i}
          ref={(el) => (refs.current[i] = el)}
          className="otp-box"
          type="text"
          inputMode="numeric"
          maxLength={1}
          value={value[i] || ""}
          onChange={(e) => handleInput(i, e)}
          onKeyDown={(e) => handleKeyDown(i, e)}
        />
      ))}
    </div>
  );
}

function PwField({ id, placeholder, value, onChange }) {
  const [show, setShow] = useState(false);
  return (
    <div className="pw-wrap">
      <input
        id={id}
        type={show ? "text" : "password"}
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
      <button className="pw-toggle" type="button" onClick={() => setShow((s) => !s)}>
        <svg viewBox="0 0 24 24">
          <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
          <circle cx="12" cy="12" r="3" />
        </svg>
      </button>
    </div>
  );
}

function StrengthBars({ score }) {
  return (
    <div className="strength">
      {[0, 1, 2, 3].map((i) => (
        <div
          key={i}
          className="s-bar"
          style={{ background: i < score ? STRENGTH_COLORS[score - 1] : "var(--border)" }}
        />
      ))}
    </div>
  );
}

function FormError({ message }) {
  if (!message) return null;
  return <p className="form-error">{message}</p>;
}

function BackBtn({ onClick }) {
  return (
    <button className="back-btn" type="button" onClick={onClick}>
      <svg viewBox="0 0 24 24"><polyline points="15 18 9 12 15 6" /></svg>
      Back
    </button>
  );
}

function StepDots({ step }) {
  return (
    <div className="step-dots">
      {[1, 2, 3].map((i) => (
        <div
          key={i}
          className={`dot ${i < step ? "done" : i === step ? "active" : ""}`}
        />
      ))}
    </div>
  );
}


// ══════════════════════════════════════════════════════════════
//  MAIN COMPONENT
// Pages: login | login-success | info | otp | done
// ══════════════════════════════════════════════════════════════
export default function Signin() {
  const [page, setPage]       = useState("login");
  const [error, setError]     = useState("");
  const [loading, setLoading] = useState(false);

  const navigate = useNavigate();

  // Login
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPw, setLoginPw]       = useState("");

  // Registration
  const [firstName, setFirstName] = useState("");
  const [surname, setSurname]     = useState("");
  const [sex, setSex]             = useState(null);
  const [idNumber, setIdNumber]   = useState("");
  const [email, setEmail]         = useState("");
  const [password, setPassword]   = useState("");
  const [confirmPw, setConfirmPw] = useState("");
  const [regOtp, setRegOtp]       = useState(Array(6).fill(""));

  const go = useCallback((p) => { setError(""); setPage(p); }, []);

  // ── LOGIN ──────────────────────────────────────────────────
  async function handleLogin() {
    setError(""); setLoading(true);
    if (!loginEmail || !loginPw) {
      setError("Please enter your email and password.");
      setLoading(false); return;
    }
    const { error: err } = await supabase.auth.signInWithPassword({
      email: loginEmail,
      password: loginPw,
    });
    setLoading(false);
    if (err) { setError("Incorrect email or password."); return; }
    navigate("/dashboard");
  }

  // ── REGISTRATION step 1: validate + sign up → sends email OTP ──
  async function handleSendOtp() {
    setError(""); setLoading(true);

    if (!firstName || !surname) {
      setError("Please enter your first name and surname."); setLoading(false); return;
    }
    if (!sex) {
      setError("Please select a gender."); setLoading(false); return;
    }
    if (!/^\d{13}$/.test(idNumber)) {
      setError("Please enter a valid 13-digit SA ID number."); setLoading(false); return;
    }
    if (!email || !email.includes("@")) {
      setError("Please enter a valid email address."); setLoading(false); return;
    }
    if (!password || password.length < 8) {
      setError("Password must be at least 8 characters."); setLoading(false); return;
    }
    if (password !== confirmPw) {
      setError("Passwords do not match."); setLoading(false); return;
    }

    // Check SA ID uniqueness upfront
    const { data: existing } = await supabase
      .from("profiles")
      .select("id")
      .eq("id", idNumber)
      .maybeSingle();

    if (existing) {
      setError("An account with this ID number already exists.");
      setLoading(false); return;
    }

    // Create auth user — Supabase sends a 6-digit OTP to the email
    const { error: signUpErr } = await supabase.auth.signUp({ email, password });
    setLoading(false);
    if (signUpErr) { setError(signUpErr.message || "Could not register. Try again."); return; }

    go("otp");
  }

  // ── REGISTRATION step 2: verify OTP → insert profile ──────
  async function handleVerifyOtp() {
    setError(""); setLoading(true);

    const token = regOtp.join("");
    if (token.length !== 6) {
      setError("Please enter all 6 digits."); setLoading(false); return;
    }

    const { error: verifyErr } = await supabase.auth.verifyOtp({
      email,
      token,
      type: "signup",
    });

    if (verifyErr) {
      setError("Invalid or expired code. Please try again.");
      setLoading(false); return;
    }

    const { error: profileErr } = await supabase.from("profiles").insert({
      id:      idNumber,
      name:    firstName,
      surname: surname,
      email:   email,
      sex:     sex,
      role:    "patient"
    });

    setLoading(false);
    if (profileErr) {
      setError(
        profileErr.code === "23505"
          ? "An account with this ID number already exists."
          : profileErr.message
      );
      return;
    }

    go("done");
  }

  async function handleResendOtp() {
    await supabase.auth.resend({ type: "signup", email });
  }

  // ── RENDER ─────────────────────────────────────────────────
  return (
    <div className="sign-root">

      <div className="logo">
        <div className="logo-mark">
          <svg viewBox="0 0 24 24">
            <path d="M12 2L2 7l10 5 10-5-10-5z" />
            <path d="M2 17l10 5 10-5" />
            <path d="M2 12l10 5 10-5" />
          </svg>
        </div>
        <h1>MediAccess</h1>
        <p>Integrated Healthcare Management</p>
      </div>

      <div className="card">

        {/* ── LOGIN ── */}
        {page === "login" && (
          <div className="page-section">
            <p className="card-title">Welcome back</p>
            <p className="card-sub">Sign in to your account to continue</p>

            <div className="field">
              <label>Email</label>
              <input
                type="email"
                placeholder="jane@example.com"
                value={loginEmail}
                onChange={(e) => setLoginEmail(e.target.value)}
              />
            </div>
            <div className="field">
              <label>Password</label>
              <PwField
                id="login-pw"
                placeholder="Enter your password"
                value={loginPw}
                onChange={setLoginPw}
              />
            </div>

            <FormError message={error} />
            <button className="btn btn-primary" disabled={loading} onClick={handleLogin}>
              {loading ? "Signing in…" : "Sign in"}
            </button>
            <div className="divider">
              <div className="divider-line" />
              <span className="divider-text">or</span>
              <div className="divider-line" />
            </div>
            <button className="btn btn-ghost" onClick={() => go("info")}>
              Create new account
            </button>
            <p className="switch-text" style={{ marginTop: ".9rem" }}>
              <a>Forgot password?</a>
            </p>
          </div>
        )}

        {/* ── LOGIN SUCCESS ── */}
        {page === "login-success" && (
          <div className="page-section">
            <div className="success-icon">
              <div className="success-circle">
                <svg viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12" /></svg>
              </div>
            </div>
            <p className="card-title" style={{ textAlign: "center" }}>Signed in!</p>
            <p className="card-sub" style={{ textAlign: "center", marginBottom: "1.5rem" }}>
              You've been successfully authenticated.
            </p>
            <button className="btn btn-primary" onClick={() => window.location.href = "/dashboard"}>
              Go to Dashboard
            </button>
            <p className="switch-text">
              <a onClick={() => go("login")}>Sign in with a different account</a>
            </p>
          </div>
        )}

        {/* ── STEP 1: DETAILS + CREDENTIALS ── */}
        {page === "info" && (
          <div className="page-section">
            <StepDots step={1} />
            <BackBtn onClick={() => go("login")} />
            <p className="card-title">Create your account</p>
            <p className="card-sub">Fill in your details to get started</p>

            <div className="field-row">
              <div className="field">
                <label>First name</label>
                <input
                  type="text"
                  placeholder="Jane"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                />
              </div>
              <div className="field">
                <label>Surname</label>
                <input
                  type="text"
                  placeholder="Dlamini"
                  value={surname}
                  onChange={(e) => setSurname(e.target.value)}
                />
              </div>
            </div>

            <div className="field">
              <label>Gender</label>
              <div className="gender-row">
                {["male", "female", "other"].map((g) => (
                  <div
                    key={g}
                    className={`gender-pill ${sex === g ? "selected" : ""}`}
                    onClick={() => setSex(g)}
                  >
                    {g.charAt(0).toUpperCase() + g.slice(1)}
                  </div>
                ))}
              </div>
            </div>

            <div className="field">
              <label>ID Number</label>
              <input
                type="text"
                maxLength={13}
                value={idNumber}
                onChange={(e) => setIdNumber(e.target.value.replace(/\D/g, ""))}
              />
              <p className="hint">South African 13-digit ID number</p>
            </div>

            <div className="field">
              <label>Email address</label>
              <input
                type="email"
                placeholder="jane@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
              <p className="hint">A 6-digit verification code will be sent here</p>
            </div>

            <div className="field">
              <label>Password</label>
              <PwField
                id="new-pw"
                placeholder="Create a strong password"
                value={password}
                onChange={setPassword}
              />
              <StrengthBars score={strengthScore(password)} />
            </div>

            <div className="field">
              <label>Confirm password</label>
              <PwField
                id="confirm-pw"
                placeholder="Repeat your password"
                value={confirmPw}
                onChange={setConfirmPw}
              />
            </div>

            <FormError message={error} />
            <button className="btn btn-primary" disabled={loading} onClick={handleSendOtp}>
              {loading ? "Sending code…" : "Send verification code"}
            </button>
            <p className="switch-text">
              <a onClick={() => go("login")}>Already have an account? Sign in</a>
            </p>
          </div>
        )}

        {/* ── STEP 2: EMAIL OTP ── */}
        {page === "otp" && (
          <div className="page-section">
            <StepDots step={2} />
            <BackBtn onClick={() => go("info")} />
            <p className="card-title">Check your email</p>
            <p className="card-sub">
              We sent a 6-digit code to <strong>{email}</strong>
            </p>
            <OtpRow value={regOtp} onChange={setRegOtp} />
            <p className="resend">
              Didn't receive it? <a onClick={handleResendOtp}>Resend code</a>
            </p>
            <FormError message={error} />
            <button className="btn btn-primary" disabled={loading} onClick={handleVerifyOtp}>
              {loading ? "Verifying…" : "Verify & create account"}
            </button>
          </div>
        )}

        {/* ── DONE ── */}
        {page === "done" && (
          <div className="page-section">
            <StepDots step={3} />
            <div className="success-icon">
              <div className="success-circle">
                <svg viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12" /></svg>
              </div>
            </div>
            <p className="card-title" style={{ textAlign: "center" }}>Account created!</p>
            <p className="card-sub" style={{ textAlign: "center", marginBottom: ".5rem" }}>
              Your <span className="tag-pill tag-patient">Patient</span> account is ready.
            </p>
            <p style={{ textAlign: "center", fontSize: ".8rem", color: "var(--text-muted)", marginBottom: "1.5rem", fontWeight: 300 }}>
              You're verified and can now access the platform.
            </p>
            <button className="btn btn-primary" onClick={() => navigate("/QueueCare/dashboard")}>
              Go to Dashboard
            </button>
            <p className="switch-text"><a onClick={() => go("login")}>Back to login</a></p>
          </div>
        )}

      </div>
    </div>
  );
}