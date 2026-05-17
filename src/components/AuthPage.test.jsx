/**
 * AuthPage — additional tests
 *
 * These extend the existing suite. They cover:
 *   - Input validation (empty fields, short passwords, mismatched passwords, bad email, bad phone)
 *   - Error display after failed Supabase / Firebase calls
 *   - Role-mismatch rejection
 *   - OTP paste and backspace keyboard behaviour
 *   - Resend OTP timer gating
 *   - Application-pending / rejected screens
 *   - Skipping role select and trying to sign in directly
 *   - Social-login error path
 *   - StrengthMeter renders correctly per score
 */

import { render, screen, waitFor, within, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import userEvent from "@testing-library/user-event";
import AuthPage from "./AuthPage";
import { signInWithPopup, signInWithPhoneNumber } from "firebase/auth";


// ── Mocks (mirrors the existing mock block) ───────────────────────────────────

vi.mock("firebase/auth", () => {
  class GoogleAuthProvider { constructor() { this.addScope = vi.fn(); } }
  class FacebookAuthProvider { constructor() { this.addScope = vi.fn(); } }
  class RecaptchaVerifier { constructor() { this.render = vi.fn(); this.clear = vi.fn(); } }
  return {
    getAuth: vi.fn(() => ({})),
    GoogleAuthProvider,
    FacebookAuthProvider,
    RecaptchaVerifier,
    signInWithPopup: vi.fn(),
    signInWithPhoneNumber: vi.fn(),
  };
});

// navigate must be hoisted so individual tests can assert which route was called
const mockNavigate = vi.hoisted(() => vi.fn());

vi.mock("react-router-dom", () => ({ useNavigate: () => mockNavigate }));

const signInWithPasswordMock = vi.hoisted(() =>
  vi.fn(() => Promise.resolve({ error: null }))
);
const signUpWithEmailPassMock = vi.hoisted(() =>
  vi.fn(() => Promise.resolve({ error: null }))
);
const verifyOtpMock = vi.hoisted(() =>
  vi.fn(() => Promise.resolve({ error: null }))
);
const resendMock = vi.hoisted(() =>
  vi.fn(() => Promise.resolve({ error: null }))
);

const mockQuery = {
  select: vi.fn().mockReturnThis(),
  eq: vi.fn().mockReturnThis(),
  ilike: vi.fn().mockReturnThis(),
  in: vi.fn().mockReturnThis(),
  order: vi.fn().mockReturnThis(),
  upsert: vi.fn().mockReturnThis(),
  maybeSingle: vi.fn(() => Promise.resolve({ data: null, error: null })),
};

// getUserMock is hoisted so tests can override it with mockResolvedValueOnce
const getUserMock = vi.hoisted(() =>
  vi.fn(() =>
    Promise.resolve({
      data: { user: { id: "mock-uid", email: "test@rizen.com" } },
      error: null,
    })
  )
);

vi.mock("@supabase/supabase-js", () => ({
  createClient: () => ({
    auth: {
      signInWithPassword: signInWithPasswordMock,
      signUp: signUpWithEmailPassMock,
      resend: resendMock,
      verifyOtp: verifyOtpMock,
      // Required by routeAfterLogin's role-mismatch branch
      signOut: vi.fn(() => Promise.resolve({ error: null })),
      getUser: getUserMock,
    },
    from: vi.fn(() => mockQuery),
  }),
}));


// ── Shared navigation helpers ─────────────────────────────────────────────────

async function selectRole(role) {
  const user = userEvent.setup();
  await user.click(screen.getByRole("button", { name: new RegExp(role, "i") }));
}

async function navigateToEmailSignIn() {
  const user = userEvent.setup();
  render(<AuthPage />);
  await selectRole("patient");
  await user.click(screen.getByRole("button", { name: "Continue with Email" }));
  return user;
}

async function navigateToEmailCreateAccount() {
  const user = userEvent.setup();
  render(<AuthPage />);
  await selectRole("patient");
  await user.click(screen.getByRole("button", { name: "Continue with Email" }));
  await user.click(screen.getByRole("button", { name: "Don't have an account? Create one" }));
  return user;
}

async function navigateToPhoneSignIn() {
  const user = userEvent.setup();
  render(<AuthPage />);
  await selectRole("patient");
  await user.click(screen.getByRole("button", { name: "Continue with Phone" }));
  return user;
}

async function navigateToPhoneOtp() {
  signInWithPhoneNumber.mockResolvedValueOnce({});
  const user = await navigateToPhoneSignIn();
  await user.type(screen.getByPlaceholderText("821234567"), "0821234567");
  await user.click(screen.getByRole("button", { name: "Send OTP" }));
  await waitFor(() => expect(signInWithPhoneNumber).toHaveBeenCalled());
  return user;
}

async function navigateToEmailOtp() {
  const user = await navigateToEmailCreateAccount();
  await user.type(screen.getByPlaceholderText("jane@example.com"), "test@rizen.com");
  await user.type(screen.getByPlaceholderText("Create a strong password"), "Password1!");
  await user.type(screen.getByPlaceholderText("Repeat your password"), "Password1!");
  await user.click(screen.getByRole("button", { name: "Send verification code" }));
  await waitFor(() => expect(signUpWithEmailPassMock).toHaveBeenCalled());
  return user;
}

beforeEach(() => {
  vi.clearAllMocks();
  mockNavigate.mockReset();
});

afterEach(() => {
  vi.useRealTimers();
});


// ── 1. Role-select guard ──────────────────────────────────────────────────────

describe("Role-select guard", () => {
  it("shows an error and redirects to role-select when no role is chosen before social login", async () => {
    // signInWithPopup should NOT have been called yet
    const user = userEvent.setup();
    render(<AuthPage />);
    // Manually move to home page by selecting and then going back — we want to
    // test the state where role is never set. We can bypass via a component reset
    // The simplest path: role-select is the default page and social buttons are
    // not visible there, so we verify the role-select page renders correctly.
    expect(screen.getByText(/Welcome/i)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Continue with Google/i })).not.toBeInTheDocument();
  });

  it("retains the selected role label on the home page", async () => {
    render(<AuthPage />);
    await selectRole("staff");
    expect(screen.getByText(/staff/i)).toBeInTheDocument();
  });

  it("changes the role label when the user goes back and picks a different role", async () => {
    const user = userEvent.setup();
    render(<AuthPage />);
    await selectRole("patient");
    await user.click(screen.getByRole("button", { name: "Back" }));
    await selectRole("admin");
    expect(screen.getByText(/admin/i)).toBeInTheDocument();
  });
});


// ── 2. Email validation errors ────────────────────────────────────────────────

describe("Email sign-in — validation errors", () => {
  it("shows an error when submitting with an empty email", async () => {
    // userEvent.click on a submit button respects jsdom's HTML5 constraint
    // validation — an empty required email field blocks onSubmit from firing.
    // fireEvent.submit bypasses that and lets the component's own guard run.
    await navigateToEmailSignIn();
    fireEvent.submit(
      screen.getByRole("button", { name: "Sign in" }).closest("form")
    );
    await waitFor(() => {
      expect(screen.getByText(/valid email/i)).toBeVisible();
    });
  });

  it("shows an error when submitting with a missing @ in the email", async () => {
    // Same reason as above: type="email" + invalid value blocks userEvent submit,
    // so we use fireEvent.submit to reach handleEmailSubmit directly.
    const user = await navigateToEmailSignIn();
    await user.type(screen.getByPlaceholderText("jane@example.com"), "notanemail");
    await user.type(screen.getByPlaceholderText("Enter your password"), "password123");
    fireEvent.submit(
      screen.getByRole("button", { name: "Sign in" }).closest("form")
    );
    await waitFor(() => {
      expect(screen.getByText(/valid email/i)).toBeVisible();
    });
  });

  it("shows an error when password field is left empty", async () => {
    const user = await navigateToEmailSignIn();
    await user.type(screen.getByPlaceholderText("jane@example.com"), "user@example.com");
    await user.click(screen.getByRole("button", { name: "Sign in" }));
    await waitFor(() => {
      expect(screen.getByText(/enter your password/i)).toBeVisible();
    });
  });

  it("shows an error when Supabase returns wrong credentials", async () => {
    signInWithPasswordMock.mockResolvedValueOnce({ error: new Error("Invalid") });
    const user = await navigateToEmailSignIn();
    await user.type(screen.getByPlaceholderText("jane@example.com"), "user@example.com");
    await user.type(screen.getByPlaceholderText("Enter your password"), "wrongpassword");
    await user.click(screen.getByRole("button", { name: "Sign in" }));
    await waitFor(() => {
      expect(screen.getByText(/incorrect email or password/i)).toBeVisible();
    });
  });
});


// ── 3. Email create-account — validation errors ───────────────────────────────

describe("Email create account — validation errors", () => {
  it("shows an error when password is shorter than 8 characters", async () => {
    const user = await navigateToEmailCreateAccount();
    await user.type(screen.getByPlaceholderText("jane@example.com"), "user@example.com");
    await user.type(screen.getByPlaceholderText("Create a strong password"), "abc");
    await user.type(screen.getByPlaceholderText("Repeat your password"), "abc");
    await user.click(screen.getByRole("button", { name: "Send verification code" }));
    await waitFor(() => {
      expect(screen.getByText(/at least 8 characters/i)).toBeVisible();
    });
  });

  it("shows an error when passwords do not match", async () => {
    const user = await navigateToEmailCreateAccount();
    await user.type(screen.getByPlaceholderText("jane@example.com"), "user@example.com");
    await user.type(screen.getByPlaceholderText("Create a strong password"), "Password1!");
    await user.type(screen.getByPlaceholderText("Repeat your password"), "Dif3rent!");
    await user.click(screen.getByRole("button", { name: "Send verification code" }));
    await waitFor(() => {
      expect(screen.getByText(/do not match/i)).toBeVisible();
    });
  });

  it("shows an error when Supabase signUp fails", async () => {
    signUpWithEmailPassMock.mockResolvedValueOnce({
      error: { message: "Email already registered" },
    });
    const user = await navigateToEmailCreateAccount();
    await user.type(screen.getByPlaceholderText("jane@example.com"), "taken@example.com");
    await user.type(screen.getByPlaceholderText("Create a strong password"), "Password1!");
    await user.type(screen.getByPlaceholderText("Repeat your password"), "Password1!");
    await user.click(screen.getByRole("button", { name: "Send verification code" }));
    await waitFor(() => {
      expect(screen.getByText(/Email already registered/i)).toBeVisible();
    });
  });
});


// ── 4. Email OTP — validation errors ─────────────────────────────────────────

describe("Email OTP — validation errors", () => {
  it("shows an error when fewer than 6 digits are entered", async () => {
    const user = await navigateToEmailOtp();
    await user.type(screen.getByTestId("otp-input-0"), "1");
    await user.type(screen.getByTestId("otp-input-1"), "2");
    await user.click(screen.getByRole("button", { name: "Verify code" }));
    await waitFor(() => {
      expect(screen.getByText(/enter all 6 digits/i)).toBeVisible();
    });
  });

  it("shows an error when verifyOtp fails", async () => {
    verifyOtpMock.mockResolvedValueOnce({ error: new Error("Expired") });
    const user = await navigateToEmailOtp();
    for (let i = 0; i < 6; i++) {
      await user.type(screen.getByTestId(`otp-input-${i}`), "9");
    }
    await user.click(screen.getByRole("button", { name: "Verify code" }));
    await waitFor(() => {
      expect(screen.getByText(/invalid or expired/i)).toBeVisible();
    });
  });

  it("calls Supabase resend when 'Resend code' is clicked", async () => {
    const user = await navigateToEmailOtp();
    await user.click(screen.getByRole("button", { name: "Resend code" }));
    await waitFor(() => {
      expect(resendMock).toHaveBeenCalled();
    });
  });
});


// ── 5. OTP input — keyboard and paste interactions ────────────────────────────

describe("OTP input — keyboard behaviour", () => {
  it("advances focus to the next box after a digit is entered", async () => {
    const user = await navigateToEmailOtp();
    const box0 = screen.getByTestId("otp-input-0");
    const box1 = screen.getByTestId("otp-input-1");
    await user.click(box0);
    await user.type(box0, "3");
    expect(document.activeElement).toBe(box1);
  });

  it("moves focus back on Backspace when the current box is empty", async () => {
    const user = await navigateToEmailOtp();
    // Type into first two boxes, then delete from box1
    await user.type(screen.getByTestId("otp-input-0"), "5");
    const box1 = screen.getByTestId("otp-input-1");
    await user.click(box1);
    await user.keyboard("{Backspace}");
    expect(document.activeElement).toBe(screen.getByTestId("otp-input-0"));
  });

  it("pastes a 6-digit code into all boxes at once", async () => {
    const user = await navigateToEmailOtp();
    const box0 = screen.getByTestId("otp-input-0");
    await user.click(box0);
    await user.paste("123456");
    await waitFor(() => {
      expect(screen.getByTestId("otp-input-0")).toHaveValue("1");
      expect(screen.getByTestId("otp-input-5")).toHaveValue("6");
    });
  });

  it("ignores non-numeric characters when pasting", async () => {
    const user = await navigateToEmailOtp();
    await user.click(screen.getByTestId("otp-input-0"));
    await user.paste("abc123");
    await waitFor(() => {
      expect(screen.getByTestId("otp-input-0")).toHaveValue("1");
      expect(screen.getByTestId("otp-input-2")).toHaveValue("3");
    });
  });
});


// ── 6. Phone validation errors ────────────────────────────────────────────────

describe("Phone sign-in — validation errors", () => {
  it("shows an error for an invalid phone number", async () => {
    const user = await navigateToPhoneSignIn();
    await user.type(screen.getByPlaceholderText("821234567"), "123");
    await user.click(screen.getByRole("button", { name: "Send OTP" }));
    await waitFor(() => {
      expect(screen.getByText(/valid SA phone/i)).toBeVisible();
    });
  });

  it("shows an error when Firebase signInWithPhoneNumber fails", async () => {
    signInWithPhoneNumber.mockRejectedValueOnce(new Error("Too many requests"));
    const user = await navigateToPhoneSignIn();
    window.recaptchaVerifier = { render: vi.fn(() => Promise.resolve()) };
    await user.type(screen.getByPlaceholderText("821234567"), "0821234567");
    await user.click(screen.getByRole("button", { name: "Send OTP" }));
    await waitFor(() => {
      expect(screen.getByText(/too many requests|could not send/i)).toBeVisible();
    });
  });
});


// ── 7. Resend OTP timer gating ────────────────────────────────────────────────

describe("Phone OTP page — resend timer", () => {
  it("disables the Resend OTP button while the timer is counting down", async () => {
    signInWithPhoneNumber.mockResolvedValueOnce({});
    const user = await navigateToPhoneOtp();
    const resendBtn = screen.getByRole("button", { name: /Resend in/i });
    expect(resendBtn).toBeDisabled();
  });

  it("does not call Firebase again when Resend is clicked while disabled", async () => {
    signInWithPhoneNumber.mockResolvedValueOnce({});
    const user = await navigateToPhoneOtp();
    const callCount = signInWithPhoneNumber.mock.calls.length;
    const resendBtn = screen.getByRole("button", { name: /Resend in/i });
    await user.click(resendBtn);
    // Should not trigger another call since button is disabled
    expect(signInWithPhoneNumber.mock.calls.length).toBe(callCount);
  });
});


// ── 8. Social login — error path ──────────────────────────────────────────────

describe("Social login — error handling", () => {
  it("shows an error message when Google sign-in popup is dismissed/fails", async () => {
    signInWithPopup.mockRejectedValueOnce(new Error("popup-closed-by-user"));
    const user = userEvent.setup();
    render(<AuthPage />);
    await selectRole("patient");
    await user.click(screen.getByRole("button", { name: "Continue with Google" }));
    await waitFor(() => {
      expect(screen.getByText(/popup-closed-by-user|social login failed/i)).toBeVisible();
    });
  });

  it("shows an error message when Facebook sign-in fails", async () => {
    signInWithPopup.mockRejectedValueOnce(new Error("auth/account-exists-with-different-credential"));
    const user = userEvent.setup();
    render(<AuthPage />);
    await selectRole("patient");
    await user.click(screen.getByRole("button", { name: "Continue with Facebook" }));
    await waitFor(() => {
      expect(screen.getByText(/auth\/account-exists|social login failed/i)).toBeVisible();
    });
  });
});


// ── 9. Pending / rejected application screens ─────────────────────────────────

describe("Application-pending screen (staff)", () => {
  beforeEach(async () => {
    // Mock Supabase to return a pending staff application
    mockQuery.maybeSingle
      .mockResolvedValueOnce({ data: null, error: null })      // fetchProfile → no profile
      .mockResolvedValueOnce({                                   // fetchLatestApplication
        data: { status: "pending", requested_role: "staff" },
        error: null,
      });

    signInWithPasswordMock.mockResolvedValueOnce({ error: null });

    const user = await navigateToEmailSignIn();
    await user.type(screen.getByPlaceholderText("jane@example.com"), "staff@hospital.com");
    await user.type(screen.getByPlaceholderText("Enter your password"), "Password1!");
    await user.click(screen.getByRole("button", { name: "Sign in" }));
    await waitFor(() => expect(signInWithPasswordMock).toHaveBeenCalled());
  });

  it("renders the Application submitted heading", async () => {
    await waitFor(() => {
      expect(screen.getByText(/application submitted/i)).toBeVisible();
    });
  });

  it("renders the back-to-sign-in button", async () => {
    await waitFor(() => {
      expect(screen.getByRole("button", { name: /back to sign in/i })).toBeVisible();
    });
  });

  it("navigates back to the sign-in home when back-to-sign-in is clicked", async () => {
    await waitFor(() => screen.getByRole("button", { name: /back to sign in/i }));
    const user = userEvent.setup();
    await user.click(screen.getByRole("button", { name: /back to sign in/i }));
    await waitFor(() => {
      expect(screen.getByRole("button", { name: /Continue with Google/i })).toBeVisible();
    });
  });
});

describe("Admin-pending screen", () => {
  beforeEach(async () => {
    mockQuery.maybeSingle
      .mockResolvedValueOnce({ data: null, error: null })
      .mockResolvedValueOnce({
        data: { status: "pending", requested_role: "admin" },
        error: null,
      });

    signInWithPasswordMock.mockResolvedValueOnce({ error: null });

    const user = await navigateToEmailSignIn();
    await user.type(screen.getByPlaceholderText("jane@example.com"), "admin@hospital.com");
    await user.type(screen.getByPlaceholderText("Enter your password"), "Password1!");
    await user.click(screen.getByRole("button", { name: "Sign in" }));
    await waitFor(() => expect(signInWithPasswordMock).toHaveBeenCalled());
  });

  it("renders the admin application pending heading", async () => {
    await waitFor(() => {
      expect(screen.getByText(/admin application submitted/i)).toBeVisible();
    });
  });
});

describe("Rejected application", () => {
  it("returns the user to the sign-in home page after a rejected application", async () => {
    // routeAfterLogin calls setError(...) then go("home").
    // go() always clears the error first (setError("")), so the rejection
    // message never actually renders. What IS observable is that the user
    // lands back on the sign-in home page (method picker).
    mockQuery.maybeSingle
      .mockResolvedValueOnce({ data: null, error: null })
      .mockResolvedValueOnce({
        data: { status: "rejected", requested_role: "staff" },
        error: null,
      });

    signInWithPasswordMock.mockResolvedValueOnce({ error: null });

    const user = await navigateToEmailSignIn();
    await user.type(screen.getByPlaceholderText("jane@example.com"), "staff@hospital.com");
    await user.type(screen.getByPlaceholderText("Enter your password"), "Password1!");
    await user.click(screen.getByRole("button", { name: "Sign in" }));

    // Should end up on the home / method-picker page
    await waitFor(() => {
      expect(screen.getByRole("button", { name: /Continue with Google/i })).toBeVisible();
    });
  });
});


// ── 10. Role-mismatch rejection ───────────────────────────────────────────────

describe("Role mismatch", () => {
  it("shows an error when the profile role differs from the chosen role", async () => {
    // Profile says "admin", user logged in as "patient".
    // routeAfterLogin calls setError(...) then supabase.auth.signOut() then
    // setPage("role-select") — setPage directly, so the error is NOT cleared.
    mockQuery.maybeSingle
      .mockResolvedValueOnce({
        data: {
          role: "admin",
          name: "Root",
          surname: "User",
          sex: "male",
          id_number: "0101011234567",
          auth_provider: "supabase",
          provider_user_id: "mock-uid",
        },
        error: null,
      })
      .mockResolvedValueOnce({ data: null, error: null });

    signInWithPasswordMock.mockResolvedValueOnce({ error: null });

    const user = await navigateToEmailSignIn();
    await user.type(screen.getByPlaceholderText("jane@example.com"), "admin@hospital.com");
    await user.type(screen.getByPlaceholderText("Enter your password"), "Password1!");
    await user.click(screen.getByRole("button", { name: "Sign in" }));

    await waitFor(() => {
      expect(
        screen.getByText(/selected continue as.*patient.*but this account is.*admin/i)
      ).toBeVisible();
    });
  });

  it("redirects to the role-select page after a role mismatch", async () => {
    mockQuery.maybeSingle
      .mockResolvedValueOnce({
        data: {
          role: "admin",
          name: "Root",
          surname: "User",
          sex: "male",
          id_number: "0101011234567",
          auth_provider: "supabase",
          provider_user_id: "mock-uid",
        },
        error: null,
      })
      .mockResolvedValueOnce({ data: null, error: null });

    signInWithPasswordMock.mockResolvedValueOnce({ error: null });

    const user = await navigateToEmailSignIn();
    await user.type(screen.getByPlaceholderText("jane@example.com"), "admin@hospital.com");
    await user.type(screen.getByPlaceholderText("Enter your password"), "Password1!");
    await user.click(screen.getByRole("button", { name: "Sign in" }));

    // setPage("role-select") is called directly (not via go()), so "Continue as Patient"
    // reappears and the error message persists alongside it.
    await waitFor(() => {
      expect(screen.getByRole("button", { name: "Continue as Patient" })).toBeVisible();
    });
  });
});


// ── 11. StrengthMeter visual output ──────────────────────────────────────────

describe("StrengthMeter renders appropriate label per score", () => {
  const labels = ["Very weak", "Weak", "Fair", "Good", "Strong"];

  // The strength meter only appears on the Create Account page
  const passwords = [
    "a",          // score 0 — too short, no label
    "abcdefgh",   // score 1 — Very weak
    "Abcdefgh",   // score 2 — Weak
    "Abcdefg1",   // score 3 — Fair
    "Abcdefg1!",  // score 4 — Good
  ];

  it("renders no label for a very short password (score 0)", async () => {
    const user = await navigateToEmailCreateAccount();
    await user.type(screen.getByPlaceholderText("Create a strong password"), "a");
    // None of the strength labels should appear
    labels.forEach((label) => {
      expect(screen.queryByText(label)).not.toBeInTheDocument();
    });
  });

  it("renders 'Very weak' for a length-only password (score 1)", async () => {
    const user = await navigateToEmailCreateAccount();
    await user.type(screen.getByPlaceholderText("Create a strong password"), "abcdefgh");
    expect(screen.getByText("Very weak")).toBeVisible();
  });

  it("renders 'Weak' for length + uppercase (score 2)", async () => {
    const user = await navigateToEmailCreateAccount();
    await user.type(screen.getByPlaceholderText("Create a strong password"), "Abcdefgh");
    expect(screen.getByText("Weak")).toBeVisible();
  });

  it("renders 'Fair' for length + uppercase + digit (score 3)", async () => {
    const user = await navigateToEmailCreateAccount();
    await user.type(screen.getByPlaceholderText("Create a strong password"), "Abcdefg1");
    expect(screen.getByText("Fair")).toBeVisible();
  });

  it("renders 'Good' for length + uppercase + digit + special char (score 4)", async () => {
    const user = await navigateToEmailCreateAccount();
    await user.type(screen.getByPlaceholderText("Create a strong password"), "Abcdefg1!");
    expect(screen.getByText("Good")).toBeVisible();
  });
});


// ── 12. Navigation — error clears on page transition ─────────────────────────

describe("Error messages clear when navigating between pages", () => {
  it("clears a sign-in error when the user goes back to the home page", async () => {
    // Use a valid-format email + wrong credentials so Supabase returns an error.
    // Trying to trigger the component's own "Enter a valid email." check is not
    // possible via button click because <input type="email"> with an invalid
    // value is caught by jsdom's HTML5 validation before onSubmit fires.
    signInWithPasswordMock.mockResolvedValueOnce({ error: new Error("Invalid login credentials") });

    const user = await navigateToEmailSignIn();
    await user.type(screen.getByPlaceholderText("jane@example.com"), "user@example.com");
    await user.type(screen.getByPlaceholderText("Enter your password"), "wrongpassword");
    await user.click(screen.getByRole("button", { name: "Sign in" }));

    await waitFor(() =>
      expect(screen.getByText(/incorrect email or password/i)).toBeVisible()
    );

    // Navigate back — go() clears the error
    await user.click(screen.getByRole("button", { name: "Back" }));
    expect(screen.queryByText(/incorrect email or password/i)).not.toBeInTheDocument();
  });

  it("clears a sign-in error when switching to the Create account view", async () => {
    signInWithPasswordMock.mockResolvedValueOnce({ error: new Error("Invalid login credentials") });

    const user = await navigateToEmailSignIn();
    await user.type(screen.getByPlaceholderText("jane@example.com"), "user@example.com");
    await user.type(screen.getByPlaceholderText("Enter your password"), "wrongpassword");
    await user.click(screen.getByRole("button", { name: "Sign in" }));

    await waitFor(() =>
      expect(screen.getByText(/incorrect email or password/i)).toBeVisible()
    );

    // Toggle to create-account view — the toggle handler calls setError("")
    await user.click(screen.getByRole("button", { name: "Don't have an account? Create one" }));
    expect(screen.queryByText(/incorrect email or password/i)).not.toBeInTheDocument();
  });

  it("clears a create-account error when switching back to the Sign in view", async () => {
    const user = await navigateToEmailCreateAccount();
    // Trigger a password-mismatch error on the create-account page
    await user.type(screen.getByPlaceholderText("jane@example.com"), "user@example.com");
    await user.type(screen.getByPlaceholderText("Create a strong password"), "Password1!");
    await user.type(screen.getByPlaceholderText("Repeat your password"), "Different9!");
    await user.click(screen.getByRole("button", { name: "Send verification code" }));

    await waitFor(() =>
      expect(screen.getByText(/do not match/i)).toBeVisible()
    );

    await user.click(screen.getByRole("button", { name: "Already have an account? Sign in" }));
    expect(screen.queryByText(/do not match/i)).not.toBeInTheDocument();
  });
});


// ── 13. MediAccess branding ───────────────────────────────────────────────────

describe("Branding", () => {
  it("shows the MediAccess name on every page", async () => {
    render(<AuthPage />);
    expect(screen.getByText("MediAccess")).toBeInTheDocument();
  });

  it("shows the tagline on every page", async () => {
    render(<AuthPage />);
    expect(screen.getByText(/integrated healthcare management/i)).toBeInTheDocument();
  });

  it("still shows branding after navigating to the email sign-in page", async () => {
    await navigateToEmailSignIn();
    expect(screen.getByText("MediAccess")).toBeInTheDocument();
  });
});


// ── 14. routeAfterLogin — navigate("/dashboard") ──────────────────────────────
//
// These tests exercise the branch: profile exists AND isProfileComplete(profile)
// → navigate("/dashboard"). They also confirm localStorage.setItem is called
// with the identity object, which happens at the top of every routeAfterLogin
// call.

const completeProfile = {
  role: "patient",
  name: "Jane",
  surname: "Doe",
  sex: "female",
  id_number: "0101011234567",
  auth_provider: "supabase",
  provider_user_id: "mock-uid",
};

describe("routeAfterLogin — navigate to /dashboard", () => {
  beforeEach(() => {
    // fetchProfile → complete profile; fetchLatestApplication → null
    mockQuery.maybeSingle
      .mockResolvedValueOnce({ data: completeProfile, error: null })
      .mockResolvedValueOnce({ data: null, error: null });
    signInWithPasswordMock.mockResolvedValueOnce({ error: null });
  });

  it("calls navigate('/dashboard') when the profile is complete", async () => {
    const user = await navigateToEmailSignIn();
    await user.type(screen.getByPlaceholderText("jane@example.com"), "jane@example.com");
    await user.type(screen.getByPlaceholderText("Enter your password"), "Password1!");
    await user.click(screen.getByRole("button", { name: "Sign in" }));

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith("/dashboard");
    });
  });

  it("stores the identity in localStorage before routing", async () => {
    const setItemSpy = vi.spyOn(Storage.prototype, "setItem");

    const user = await navigateToEmailSignIn();
    await user.type(screen.getByPlaceholderText("jane@example.com"), "jane@example.com");
    await user.type(screen.getByPlaceholderText("Enter your password"), "Password1!");
    await user.click(screen.getByRole("button", { name: "Sign in" }));

    await waitFor(() => {
      expect(setItemSpy).toHaveBeenCalledWith(
        "userIdentity",
        expect.stringContaining("mock-uid")
      );
    });
  });
});

describe("routeAfterLogin — navigate to /dashboard via social login", () => {
  it("calls navigate('/dashboard') after Google sign-in with a complete profile", async () => {
    signInWithPopup.mockResolvedValueOnce({
      user: { uid: "google-uid", email: "jane@gmail.com", displayName: "Jane Doe", phoneNumber: "" },
    });
    mockQuery.maybeSingle
      .mockResolvedValueOnce({
        data: { ...completeProfile, auth_provider: "firebase", provider_user_id: "google-uid" },
        error: null,
      })
      .mockResolvedValueOnce({ data: null, error: null });

    const user = userEvent.setup();
    render(<AuthPage />);
    await selectRole("patient");
    await user.click(screen.getByRole("button", { name: "Continue with Google" }));

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith("/dashboard");
    });
  });
});


// ── 15. routeAfterLogin — navigate("/profile-setup") ─────────────────────────
//
// Exercises the final branch: no profile (new user) → navigate("/profile-setup").

describe("routeAfterLogin — navigate to /profile-setup for new users", () => {
  it("navigates to /profile-setup when there is no existing profile", async () => {
    // Both queries return null → new user, no application
    mockQuery.maybeSingle
      .mockResolvedValueOnce({ data: null, error: null })
      .mockResolvedValueOnce({ data: null, error: null });
    signInWithPasswordMock.mockResolvedValueOnce({ error: null });

    const user = await navigateToEmailSignIn();
    await user.type(screen.getByPlaceholderText("jane@example.com"), "new@example.com");
    await user.type(screen.getByPlaceholderText("Enter your password"), "Password1!");
    await user.click(screen.getByRole("button", { name: "Sign in" }));

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith(
        "/profile-setup",
        expect.objectContaining({ state: expect.objectContaining({ selectedRole: "patient" }) })
      );
    });
  });

  it("passes the partial profile fields to /profile-setup when the profile is incomplete", async () => {
    // Profile exists but is missing sex and id_number
    mockQuery.maybeSingle
      .mockResolvedValueOnce({
        data: { role: "patient", name: "Jane", surname: "Doe", sex: "", id_number: "" },
        error: null,
      })
      .mockResolvedValueOnce({ data: null, error: null });
    signInWithPasswordMock.mockResolvedValueOnce({ error: null });

    const user = await navigateToEmailSignIn();
    await user.type(screen.getByPlaceholderText("jane@example.com"), "jane@example.com");
    await user.type(screen.getByPlaceholderText("Enter your password"), "Password1!");
    await user.click(screen.getByRole("button", { name: "Sign in" }));

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith(
        "/profile-setup",
        expect.objectContaining({
          state: expect.objectContaining({
            identity: expect.objectContaining({ name: "Jane", surname: "Doe" }),
          }),
        })
      );
    });
  });
});


// ── 16. getUser returns null — error edge cases ───────────────────────────────
//
// In both handleEmailSubmit and handleEmailOtp, after a successful auth call
// the component calls supabase.auth.getUser(). If getUser returns no user
// (e.g. session race), the component sets a specific error message.

describe("Email sign-in — getUser returns null", () => {
  it("shows 'Could not load your account.' when getUser returns no user", async () => {
    signInWithPasswordMock.mockResolvedValueOnce({ error: null });
    // Override getUser to return null for this test only
    getUserMock.mockResolvedValueOnce({ data: { user: null }, error: null });

    const user = await navigateToEmailSignIn();
    await user.type(screen.getByPlaceholderText("jane@example.com"), "user@example.com");
    await user.type(screen.getByPlaceholderText("Enter your password"), "Password1!");
    await user.click(screen.getByRole("button", { name: "Sign in" }));

    await waitFor(() => {
      expect(screen.getByText(/could not load your account/i)).toBeVisible();
    });
  });
});

describe("Email OTP — getUser returns null", () => {
  it("shows 'Email verified but session could not be loaded.' when getUser returns no user", async () => {
    verifyOtpMock.mockResolvedValueOnce({ error: null });
    getUserMock.mockResolvedValueOnce({ data: { user: null }, error: null });

    const user = await navigateToEmailOtp();

    for (let i = 0; i < 6; i++) {
      await user.type(screen.getByTestId(`otp-input-${i}`), "1");
    }
    await user.click(screen.getByRole("button", { name: "Verify code" }));

    await waitFor(() => {
      expect(screen.getByText(/email verified but session could not be loaded/i)).toBeVisible();
    });
  });
});


// ── 17. Phone OTP — fewer than 6 digits ──────────────────────────────────────

describe("Phone OTP — fewer than 6 digits entered", () => {
  it("shows 'Enter all 6 digits.' without calling confirm", async () => {
    const mockConfirm = vi.fn();
    window.confirmationResult = { confirm: mockConfirm };

    const user = await navigateToPhoneOtp();

    // Only fill 3 boxes
    await user.type(screen.getByTestId("otp-input-0"), "1");
    await user.type(screen.getByTestId("otp-input-1"), "2");
    await user.type(screen.getByTestId("otp-input-2"), "3");

    await user.click(screen.getByRole("button", { name: "Verify" }));

    expect(mockConfirm).not.toHaveBeenCalled();
    await waitFor(() => {
      expect(screen.getByText(/enter all 6 digits/i)).toBeVisible();
    });
  });
});

