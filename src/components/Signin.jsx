import { useState, useEffect, useRef, useCallback } from "react";
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
const SUPABASE_URL = "https://vktjtxljwzyakobkkhol.supabase.co";
const SUPABASE_ANON =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZrdGp0eGxqd3p5YWtvYmtraG9sIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzU1ODE1ODYsImV4cCI6MjA5MTE1NzU4Nn0.LVNelw--Xp1t_weGNwhPGMrzqg0iS7J5TAXw9ZM6aUA";
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON);

const facebookAuthProvider = new FacebookAuthProvider();
facebookAuthProvider.addScope("email");

// ── Utilities ───────────────────────────────────────────────────────────────
async function sha256Hex(value) {
  const buf = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(value)
  );
  return [...new Uint8Array(buf)]
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

function dobFromSAId(id) {
  if (!id || id.length < 6) return null;
  const yy = parseInt(id.slice(0, 2), 10);
  const yyyy =
    yy <= 25
      ? `20${String(yy).padStart(2, "0")}`
      : `19${String(yy).padStart(2, "0")}`;
  return `${yyyy}-${id.slice(2, 4)}-${id.slice(4, 6)}`;
}

function strengthScore(pw) {
  let s = 0;
  if (pw.length >= 8) s++;
  if (/[A-Z]/.test(pw)) s++;
  if (/[0-9]/.test(pw)) s++;
  if (/[^A-Za-z0-9]/.test(pw)) s++;
  return s;
}

function normaliseSAPhone(raw) {
  const clean = raw.replace(/\s/g, "");
  if (clean.length === 10 && clean[0] === "0") return "+27" + clean.slice(1);
  if (clean.length === 9) return "+27" + clean;
  if (clean.startsWith("+")) return clean;
  return null;
}

// ── Shared UI ───────────────────────────────────────────────────────────────
function Err({ msg }) {
  if (!msg) return null;
  return <p style={styles.err}>{msg}</p>;
}

function PwInput({ placeholder, value, onChange }) {
  const [show, setShow] = useState(false);
  return (
    <div style={styles.pwWrap}>
      <input
        style={styles.input}
        type={show ? "text" : "password"}
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
      <button
        type="button"
        style={styles.eyeBtn}
        onClick={() => setShow((s) => !s)}
      >
        <svg
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
        >
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
        <div
          key={i}
          style={{
            flex: 1,
            height: 3,
            borderRadius: 2,
            background: i < score ? colors[score - 1] : "#e2e2e2",
          }}
        />
      ))}
    </div>
  );
}

function OtpBoxes({ value, onChange }) {
  const refs = useRef([]);
  const onInput = (i, e) => {
    const ch = e.target.value.replace(/\D/g, "").slice(-1);
    const next = [...value];
    next[i] = ch;
    onChange(next);
    if (ch && refs.current[i + 1]) refs.current[i + 1].focus();
  };
  const onKey = (i, e) => {
    if (e.key === "Backspace" && !value[i] && refs.current[i - 1]) {
      refs.current[i - 1].focus();
    }
  };
  return (
    <div
      style={{
        display: "flex",
        gap: 8,
        justifyContent: "center",
        margin: "20px 0",
      }}
    >
      {Array.from({ length: 6 }, (_, i) => (
        <input
          key={i}
          data-testid={`otp-input-${i}`} // To help with testing
          ref={(el) => (refs.current[i] = el)}
          style={styles.otpBox}
          type="text"
          inputMode="numeric"
          maxLength={1}
          value={value[i] || ""}
          onChange={(e) => onInput(i, e)}
          onKeyDown={(e) => onKey(i, e)}
        />
      ))}
    </div>
  );
}

function SocialBtn({ icon, label, onClick, disabled }) {
  return (
    <button
      type="button"
      style={styles.socialBtn}
      onClick={onClick}
      disabled={disabled}
    >
      {icon}
      <span style={{ fontSize: 14, fontWeight: 500 }}>{label}</span>
    </button>
  );
}

function Divider({ text = "or" }) {
  return (
    <div style={styles.divider}>
      <div style={styles.divLine} />
      <span style={styles.divText}>{text}</span>
      <div style={styles.divLine} />
    </div>
  );
}

function BackBtn({ onClick }) {
  return (
    <button type="button" style={styles.backBtn} onClick={onClick}>
      <svg
        width="16"
        height="16"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.5"
      >
        <polyline points="15 18 9 12 15 6" />
      </svg>
      Back
    </button>
  );
}

function Dots({ step, total = 3 }) {
  return (
    <div
      style={{ display: "flex", gap: 6, justifyContent: "center", marginBottom: 20 }}
    >
      {Array.from({ length: total }, (_, i) => (
        <div
          key={i}
          style={{
            width: i + 1 === step ? 20 : 8,
            height: 8,
            borderRadius: 4,
            background:
              i + 1 < step
                ? "#1D9E75"
                : i + 1 === step
                ? "#0A0A0A"
                : "#ddd",
            transition: "all .25s",
          }}
        />
      ))}
    </div>
  );
}

// ── Icons ────────────────────────────────────────────────────────────────────
const GoogleIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24">
    <path
      fill="#4285F4"
      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
    />
    <path
      fill="#34A853"
      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
    />
    <path
      fill="#FBBC05"
      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"
    />
    <path
      fill="#EA4335"
      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
    />
  </svg>
);

const FacebookIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24">
    <path
      fill="#1877F2"
      d="M24 12.073C24 5.405 18.627 0 12 0S0 5.405 0 12.073C0 18.1 4.388 23.094 10.125 24v-8.437H7.078v-3.49h3.047V9.41c0-3.025 1.791-4.697 4.533-4.697 1.312 0 2.686.236 2.686.236v2.97h-1.513c-1.491 0-1.956.93-1.956 1.886v2.267h3.328l-.532 3.49h-2.796V24C19.612 23.094 24 18.1 24 12.073z"
    />
  </svg>
);

// ── ProfileStep ─────────────────────────────────────────────────────────────
function ProfileStep({ identity, onComplete }) {
  const [firstName, setFirstName] = useState(identity?.name || "");
  const [surname, setSurname] = useState(identity?.surname || "");
  const [sex, setSex] = useState(identity?.sex || "");
  const [idNumber, setIdNumber] = useState("");
  const [email, setEmail] = useState(identity?.email || "");
  const [phone, setPhone] = useState(identity?.phone || "");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setLoading(true);

    if (!firstName || !surname) {
      setError("Please enter your full name.");
      setLoading(false);
      return;
    }

    if (!sex) {
      setError("Please select a gender.");
      setLoading(false);
      return;
    }

    if (!/^\d{13}$/.test(idNumber)) {
      setError("Enter a valid 13-digit SA ID number.");
      setLoading(false);
      return;
    }

    const hashed = await sha256Hex(idNumber).catch(() => null);
    if (!hashed) {
      setError("Could not hash ID. Please try again.");
      setLoading(false);
      return;
    }

    let authenticatedIdentity = null;

    if (identity?.auth_provider === "supabase") {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        setError("You must finish email verification before saving your profile.");
        setLoading(false);
        return;
      }

      authenticatedIdentity = {
        auth_provider: "supabase",
        provider_user_id: user.id,
        email: user.email || identity?.email || "",
        phone: user.phone || identity?.phone || "",
      };
    } else if (identity?.auth_provider === "firebase") {
      const firebaseUser = auth.currentUser;

      if (!firebaseUser) {
        setError("You must finish phone/social authentication before saving your profile.");
        setLoading(false);
        return;
      }

      authenticatedIdentity = {
        auth_provider: "firebase",
        provider_user_id: firebaseUser.uid,
        email: firebaseUser.email || identity?.email || "",
        phone: firebaseUser.phoneNumber || identity?.phone || "",
      };
    } else {
      setError("Missing authenticated user identity.");
      setLoading(false);
      return;
    }

    const { data: existingIdRow, error: existingIdErr } = await supabase
      .from("profiles")
      .select("id, auth_provider, provider_user_id")
      .eq("id_number", hashed)
      .maybeSingle();

    if (existingIdErr) {
      setError(existingIdErr.message || "Could not validate ID number.");
      setLoading(false);
      return;
    }

    if (
      existingIdRow &&
      !(
        existingIdRow.auth_provider === authenticatedIdentity.auth_provider &&
        existingIdRow.provider_user_id === authenticatedIdentity.provider_user_id
      )
    ) {
      setError("An account with this ID number already exists.");
      setLoading(false);
      return;
    }
        const normalizedEmail = (email || authenticatedIdentity.email || "")
      .trim()
      .toLowerCase();

    if (normalizedEmail) {
      const { data: existingEmailRow, error: existingEmailErr } = await supabase
        .from("profiles")
        .select("id, auth_provider, provider_user_id, email")
        .ilike("email", normalizedEmail)
        .maybeSingle();

      if (existingEmailErr) {
        setError(existingEmailErr.message || "Could not validate email address.");
        setLoading(false);
        return;
      }

      if (
        existingEmailRow &&
        !(
          existingEmailRow.auth_provider === authenticatedIdentity.auth_provider &&
          existingEmailRow.provider_user_id === authenticatedIdentity.provider_user_id
        )
      ) {
        setError("An account with this email already exists.");
        setLoading(false);
        return;
      }
    }
    const { error: err } = await supabase.from("profiles").upsert(
      {
        auth_provider: authenticatedIdentity.auth_provider,
        provider_user_id: authenticatedIdentity.provider_user_id,
        name: firstName,
        surname,
        sex,
        id_number: hashed,
        dob: dobFromSAId(idNumber),
        email: normalizedEmail || null,
        phone_number: phone || authenticatedIdentity.phone || null,
      },
      { onConflict: "auth_provider,provider_user_id" }
    );

    setLoading(false);

    if (err) {
      setError(err.message || "Could not save profile. Try again.");
      return;
    }

    onComplete();
  }

  return (
    <div style={styles.section}>
      <Dots step={2} total={2} />
      <p style={styles.title}>Complete your profile</p>
      <p style={styles.sub}>We need a few more details to get you started.</p>

      <form onSubmit={handleSubmit}>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: 10,
            marginBottom: 14,
          }}
        >
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
        <div style={{ display: "flex", gap: 8, marginBottom: 14 }}>
          {["male", "female", "other"].map((g) => (
            <button
              key={g}
              type="button"
              style={{ ...styles.pill, ...(sex === g ? styles.pillActive : {}) }}
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
          {loading ? "Saving…" : "Save & continue"}
        </button>
      </form>
    </div>
  );
}

// ── MAIN ─────────────────────────────────────────────────────────────────────
export default function AuthPage() {
  const navigate = useNavigate();

  const [page, setPage] = useState("home");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const [loginEmail, setLoginEmail] = useState("");
  const [loginPw, setLoginPw] = useState("");
  const [isNewEmail, setIsNewEmail] = useState(false);
  const [newPw, setNewPw] = useState("");
  const [confirmPw, setConfirmPw] = useState("");
  const [emailOtp, setEmailOtp] = useState(Array(6).fill(""));

  const [phone, setPhone] = useState("");
  const [phoneOtp, setPhoneOtp] = useState(Array(6).fill(""));

  const [socialIdentity, setSocialIdentity] = useState(null);

  const go = useCallback((p) => {
    setError("");
    setPage(p);
  }, []);

  useEffect(() => {
    if (!auth) return;

    window.recaptchaVerifier = new RecaptchaVerifier(auth, "recaptcha-container", {
      size: "invisible",
      callback: () => {},
    });

    return () => {
      window.recaptchaVerifier = null;
    };
  }, []);

  async function getCurrentSupabaseUser() {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    return user || null;
  }

  function isProfileComplete(profile) {
    return !!(
      profile &&
      profile.name &&
      profile.surname &&
      profile.sex &&
      profile.id_number
    );
  }

  async function getProfileByIdentity(identity) {
    if (!identity?.auth_provider || !identity?.provider_user_id) return null;

    const { data, error } = await supabase
      .from("profiles")
      .select("*")
      .eq("auth_provider", identity.auth_provider)
      .eq("provider_user_id", identity.provider_user_id)
      .maybeSingle();

    if (error) return null;
    return data;
  }

  async function routeAfterLogin(identity) {
    const profile = await getProfileByIdentity(identity);

    if (isProfileComplete(profile)) {
      afterLogin();
      return;
    }

    setSocialIdentity({
      auth_provider: identity.auth_provider,
      provider_user_id: identity.provider_user_id,
      email: identity.email || "",
      phone: identity.phone || "",
      name: profile?.name || identity.name || "",
      surname: profile?.surname || identity.surname || "",
      sex: profile?.sex || identity.sex || "",
    });

    go("profile");
  }

  function afterLogin() {
    navigate("/dashboard");
  }

  async function handleEmailSubmit(e) {
    e.preventDefault();
    setError("");
    setLoading(true);

    if (!loginEmail || !loginEmail.includes("@")) {
      setError("Enter a valid email address.");
      setLoading(false);
      return;
    }

    if (!isNewEmail) {
      if (!loginPw) {
        setError("Enter your password.");
        setLoading(false);
        return;
      }

      const { error: signInErr } = await supabase.auth.signInWithPassword({
        email: loginEmail,
        password: loginPw,
      });

      if (signInErr) {
        setLoading(false);
        setError("Incorrect email or password.");
        return;
      }

      const user = await getCurrentSupabaseUser();
      setLoading(false);

      if (!user) {
        setError("Could not load your account.");
        return;
      }

      await routeAfterLogin({
        auth_provider: "supabase",
        provider_user_id: user.id,
        email: user.email || loginEmail,
        phone: user.phone || "",
      });
      return;
    }

    if (newPw.length < 8) {
      setError("Password must be at least 8 characters.");
      setLoading(false);
      return;
    }

    if (newPw !== confirmPw) {
      setError("Passwords do not match.");
      setLoading(false);
      return;
    }

    const { error: signUpErr } = await supabase.auth.signUp({
      email: loginEmail,
      password: newPw,
      options: { data: { email: loginEmail } },
    });

    setLoading(false);

    if (signUpErr) {
      setError(signUpErr.message || "Registration failed.");
      return;
    }

    go("email-otp");
  }

  async function handleEmailOtp() {
    setError("");
    setLoading(true);

    const token = emailOtp.join("");
    if (token.length !== 6) {
      setError("Enter all 6 digits.");
      setLoading(false);
      return;
    }

    const { error: verifyErr } = await supabase.auth.verifyOtp({
      email: loginEmail,
      token,
      type: "signup",
    });

    if (verifyErr) {
      setLoading(false);
      setError("Invalid or expired code.");
      return;
    }

    const user = await getCurrentSupabaseUser();
    setLoading(false);

    if (!user) {
      setError("Your email was verified, but the user session could not be loaded.");
      return;
    }

    await routeAfterLogin({
      auth_provider: "supabase",
      provider_user_id: user.id,
      email: user.email || loginEmail,
      phone: user.phone || "",
    });
  }

  async function handlePhoneSubmit(e) {
    e.preventDefault();
    setError("");
    setLoading(true);

    const normalised = normaliseSAPhone(phone);
    if (!normalised) {
      setError("Enter a valid SA phone number (9 or 10 digits).");
      setLoading(false);
      return;
    }

    try {
      const verifier = window.recaptchaVerifier;
      await verifier.render();
      const result = await signInWithPhoneNumber(auth, normalised, verifier);
      window.confirmationResult = result;
      setLoading(false);
      go("phone-otp");
    } catch (err) {
      setLoading(false);
      setError(err.message || "Could not send OTP.");
    }
  }

  async function handlePhoneOtp() {
    setError("");
    setLoading(true);

    const code = phoneOtp.join("");
    if (code.length !== 6) {
      setError("Enter all 6 digits.");
      setLoading(false);
      return;
    }

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
        name: firebaseUser.displayName
          ? firebaseUser.displayName.split(" ")[0]
          : "",
        surname: firebaseUser.displayName
          ? firebaseUser.displayName.split(" ").slice(1).join(" ")
          : "",
      });
    } catch {
      setLoading(false);
      setError("Wrong code. Try again.");
    }
  }

  async function resendPhoneOtp(e) {
    e.preventDefault();
    window.confirmationResult = null;
    await handlePhoneSubmit(e);
  }

  async function handleSocialLogin(provider) {
    setError("");
    setLoading(true);

    try {
      const result = await signInWithPopup(auth, provider);
      const u = result.user;
      const [givenName, ...rest] = (u.displayName || "").split(" ");

      setLoading(false);

      await routeAfterLogin({
        auth_provider: "firebase",
        provider_user_id: u.uid,
        email: u.email || "",
        phone: u.phoneNumber || "",
        name: givenName || "",
        surname: rest.join(" ") || "",
      });
    } catch (err) {
      setLoading(false);
      setError(err.message || "Social login failed.");
    }
  }

  function handleProfileComplete() {
    go("done");
  }

  return (
    <div style={styles.root}>
      <div style={styles.logo}>
        <div style={styles.logoMark}>
          <svg
            viewBox="0 0 24 24"
            width="22"
            height="22"
            fill="none"
            stroke="white"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M12 2L2 7l10 5 10-5-10-5z" />
            <path d="M2 17l10 5 10-5" />
            <path d="M2 12l10 5 10-5" />
          </svg>
        </div>
        <div>
          <p style={styles.logoName}>MediAccess</p>
          <p style={styles.logoSub}>Integrated Healthcare Management</p>
        </div>
      </div>

      <div style={styles.card}>
        {page === "home" && (
          <div style={styles.section}>
            <p style={styles.title}>Welcome</p>
            <p style={styles.sub}>Sign in or create an account to continue.</p>

            <SocialBtn
              icon={<GoogleIcon />}
              label="Continue with Google"
              disabled={loading}
              onClick={() => handleSocialLogin(googleAuthProvider)}
            />
            <SocialBtn
              icon={<FacebookIcon />}
              label="Continue with Facebook"
              disabled={loading}
              onClick={() => handleSocialLogin(facebookAuthProvider)}
            />

            <Divider />

            <button style={styles.outlineBtn} onClick={() => go("email")}>
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
              >
                <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
                <polyline points="22,6 12,13 2,6" />
              </svg>
              Continue with Email
            </button>

            <button style={styles.outlineBtn} onClick={() => go("phone")}>
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
              >
                <rect x="5" y="2" width="14" height="20" rx="2" ry="2" />
                <line x1="12" y1="18" x2="12.01" y2="18" />
              </svg>
              Continue with Phone
            </button>

            <Err msg={error} />
          </div>
        )}

        {page === "email" && (
          <div style={styles.section}>
            <BackBtn onClick={() => go("home")} />
            <p style={styles.title}>{isNewEmail ? "Create account" : "Sign in"}</p>
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
                  <PwInput
                    placeholder="Enter your password"
                    value={loginPw}
                    onChange={setLoginPw}
                  />
                </>
              )}

              {isNewEmail && (
                <>
                  <label style={styles.label}>New password</label>
                  <PwInput
                    placeholder="Create a strong password"
                    value={newPw}
                    onChange={setNewPw}
                  />
                  <StrengthBar score={strengthScore(newPw)} />
                  <label style={styles.label}>Confirm password</label>
                  <PwInput
                    placeholder="Repeat your password"
                    value={confirmPw}
                    onChange={setConfirmPw}
                  />
                </>
              )}

              <Err msg={error} />
              <button style={styles.primaryBtn} type="submit" disabled={loading}>
                {loading ? "Please wait…" : isNewEmail ? "Send verification code" : "Sign in"}
              </button>
            </form>

            <button
              style={styles.linkBtn}
              onClick={() => {
                setIsNewEmail((v) => !v);
                setError("");
              }}
            >
              {isNewEmail
                ? "Already have an account? Sign in"
                : "Don't have an account? Create one"}
            </button>
          </div>
        )}

        {page === "email-otp" && (
          <div style={styles.section}>
            <BackBtn onClick={() => go("email")} />
            <p style={styles.title}>Check your email</p>
            <p style={styles.sub}>
              We sent a 6-digit code to <strong>{loginEmail}</strong>
            </p>
            <OtpBoxes value={emailOtp} onChange={setEmailOtp} />
            <Err msg={error} />
            <button
              style={styles.primaryBtn}
              onClick={handleEmailOtp}
              disabled={loading}
            >
              {loading ? "Verifying…" : "Verify code"}
            </button>
            <button
              style={styles.linkBtn}
              onClick={() => supabase.auth.resend({ type: "signup", email: loginEmail })}
            >
              Resend code
            </button>
          </div>
        )}

        {page === "phone" && (
          <div style={styles.section}>
            <BackBtn onClick={() => go("home")} />
            <p style={styles.title}>Enter your number</p>
            <p style={styles.sub}>We'll send a one-time code via SMS</p>

            <form onSubmit={handlePhoneSubmit}>
              <label style={styles.label}>Phone number</label>
              <div style={styles.phoneWrap}>
                <span style={styles.phoneCode}>+27</span>
                <input
                  style={{
                    ...styles.input,
                    borderRadius: "0 8px 8px 0",
                    marginBottom: 0,
                  }}
                  type="tel"
                  placeholder="821234567"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  required
                />
              </div>
              <p style={styles.hint}>South African numbers only</p>
              <Err msg={error} />
              <button
                style={{ ...styles.primaryBtn, marginTop: 8 }}
                type="submit"
                disabled={loading}
              >
                {loading ? "Sending…" : "Send OTP"}
              </button>
            </form>
          </div>
        )}

        {page === "phone-otp" && (
          <div style={styles.section}>
            <BackBtn onClick={() => go("phone")} />
            <p style={styles.title}>Enter OTP</p>
            <p style={styles.sub}>
              Code sent to <strong>+27 {phone}</strong>
            </p>
            <OtpBoxes value={phoneOtp} onChange={setPhoneOtp} />
            <Err msg={error} />
            <button
              style={styles.primaryBtn}
              onClick={handlePhoneOtp}
              disabled={loading}
            >
              {loading ? "Verifying…" : "Verify"}
            </button>
            <button style={styles.linkBtn} onClick={resendPhoneOtp}>
              Resend OTP
            </button>
          </div>
        )}

        {page === "profile" && (
          <ProfileStep identity={socialIdentity} onComplete={handleProfileComplete} />
        )}

        {page === "done" && (
          <div style={{ ...styles.section, textAlign: "center" }}>
            <div style={styles.successCircle}>
              <svg
                width="28"
                height="28"
                viewBox="0 0 24 24"
                fill="none"
                stroke="white"
                strokeWidth="2.5"
              >
                <polyline points="20 6 9 17 4 12" />
              </svg>
            </div>
            <p style={styles.title}>You're all set!</p>
            <p style={styles.sub}>Your account has been created and verified.</p>
            <button style={styles.primaryBtn} onClick={afterLogin}>
              Go to Dashboard
            </button>
            <button style={styles.linkBtn} onClick={() => go("home")}>
              Back to login
            </button>
          </div>
        )}
      </div>

      <section id="recaptcha-container" />
    </div>
  );
}

// ── Styles ───────────────────────────────────────────────────────────────────
const styles = {
  root: {
    minHeight: "100vh",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    padding: "32px 16px",
    background: "#F7F6F2",
    fontFamily: "'DM Sans', system-ui, sans-serif",
  },
  logo: {
    display: "flex",
    alignItems: "center",
    gap: 12,
    marginBottom: 24,
  },
  logoMark: {
    width: 42,
    height: 42,
    borderRadius: 12,
    background: "#0A0A0A",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
  logoName: {
    margin: 0,
    fontSize: 18,
    fontWeight: 700,
    color: "#0A0A0A",
    letterSpacing: "-0.4px",
  },
  logoSub: {
    margin: 0,
    fontSize: 11,
    color: "#888",
    letterSpacing: "0.2px",
  },
  card: {
    width: "100%",
    maxWidth: 420,
    background: "#fff",
    borderRadius: 16,
    border: "1px solid #E8E7E3",
    boxShadow: "0 2px 12px rgba(0,0,0,.06)",
    overflow: "hidden",
  },
  section: {
    padding: "28px 28px 24px",
  },
  title: {
    margin: "0 0 4px",
    fontSize: 22,
    fontWeight: 700,
    color: "#0A0A0A",
    letterSpacing: "-0.5px",
  },
  sub: {
    margin: "0 0 20px",
    fontSize: 14,
    color: "#666",
    lineHeight: 1.5,
  },
  label: {
    display: "block",
    fontSize: 12,
    fontWeight: 600,
    color: "#444",
    marginBottom: 5,
    textTransform: "uppercase",
    letterSpacing: "0.6px",
  },
  input: {
    display: "block",
    width: "100%",
    boxSizing: "border-box",
    padding: "10px 12px",
    borderRadius: 8,
    border: "1.5px solid #E2E1DC",
    fontSize: 14,
    color: "#0A0A0A",
    background: "#fff",
    marginBottom: 14,
    outline: "none",
    transition: "border-color .15s",
  },
  pwWrap: {
    position: "relative",
    marginBottom: 14,
  },
  eyeBtn: {
    position: "absolute",
    right: 10,
    top: "50%",
    transform: "translateY(-50%)",
    background: "none",
    border: "none",
    cursor: "pointer",
    color: "#888",
    padding: 4,
    display: "flex",
  },
  phoneWrap: {
    display: "flex",
    marginBottom: 0,
  },
  phoneCode: {
    display: "flex",
    alignItems: "center",
    padding: "0 12px",
    background: "#F3F2EE",
    border: "1.5px solid #E2E1DC",
    borderRight: "none",
    borderRadius: "8px 0 0 8px",
    fontSize: 14,
    color: "#444",
    whiteSpace: "nowrap",
  },
  otpBox: {
    width: 46,
    height: 52,
    textAlign: "center",
    fontSize: 20,
    fontWeight: 600,
    borderRadius: 10,
    border: "1.5px solid #E2E1DC",
    background: "#FAFAF8",
    outline: "none",
    color: "#0A0A0A",
  },
  hint: {
    margin: "-10px 0 14px",
    fontSize: 11,
    color: "#999",
  },
  err: {
    margin: "0 0 12px",
    fontSize: 13,
    color: "#C0392B",
    background: "#FEF2F2",
    border: "1px solid #FECACA",
    borderRadius: 6,
    padding: "8px 10px",
  },
  primaryBtn: {
    display: "block",
    width: "100%",
    padding: "12px",
    background: "#0A0A0A",
    color: "#fff",
    border: "none",
    borderRadius: 10,
    fontSize: 14,
    fontWeight: 600,
    cursor: "pointer",
    marginBottom: 10,
    transition: "opacity .15s",
  },
  outlineBtn: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    width: "100%",
    padding: "11px 16px",
    background: "#fff",
    color: "#0A0A0A",
    border: "1.5px solid #E2E1DC",
    borderRadius: 10,
    fontSize: 14,
    fontWeight: 500,
    cursor: "pointer",
    marginBottom: 8,
    transition: "background .15s",
  },
  socialBtn: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    width: "100%",
    padding: "11px 16px",
    background: "#fff",
    color: "#0A0A0A",
    border: "1.5px solid #E2E1DC",
    borderRadius: 10,
    fontSize: 14,
    fontWeight: 500,
    cursor: "pointer",
    marginBottom: 8,
    transition: "background .15s",
  },
  linkBtn: {
    display: "block",
    width: "100%",
    background: "none",
    border: "none",
    color: "#0A0A0A",
    fontSize: 13,
    textDecoration: "underline",
    cursor: "pointer",
    padding: "6px 0",
    textAlign: "center",
  },
  divider: {
    display: "flex",
    alignItems: "center",
    gap: 10,
    margin: "16px 0",
  },
  divLine: {
    flex: 1,
    height: 1,
    background: "#E8E7E3",
  },
  divText: {
    fontSize: 12,
    color: "#999",
    fontWeight: 500,
  },
  backBtn: {
    display: "flex",
    alignItems: "center",
    gap: 4,
    background: "none",
    border: "none",
    cursor: "pointer",
    color: "#666",
    fontSize: 13,
    padding: "0 0 16px",
    fontWeight: 500,
  },
  pill: {
    padding: "7px 16px",
    borderRadius: 20,
    border: "1.5px solid #E2E1DC",
    background: "#fff",
    fontSize: 13,
    cursor: "pointer",
    fontWeight: 500,
    color: "#444",
  },
  pillActive: {
    background: "#0A0A0A",
    borderColor: "#0A0A0A",
    color: "#fff",
  },
  successCircle: {
    width: 64,
    height: 64,
    borderRadius: "50%",
    background: "#1D9E75",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    margin: "0 auto 20px",
  },
};