import {render, screen, waitFor} from "@testing-library/react";
import {describe, it, expect, vi, beforeEach } from "vitest";
import Signin from "./Signin";
import {signInWithEmailAndPassword, signInWithPopup} from "firebase/auth";
import userEvent from "@testing-library/user-event";

vi.mock("firebase/auth", () => {
  class GoogleAuthProvider {
    constructor() {
      this.addScope = vi.fn();
    }
  }

  class FacebookAuthProvider {
    constructor() {
      this.addScope = vi.fn();
    }
  }

  class RecaptchaVerifier {
    constructor() {
      this.render = vi.fn();
      this.clear = vi.fn();
    }
  }

  return {
    getAuth: vi.fn(() => ({})),

    GoogleAuthProvider,
    FacebookAuthProvider,
    RecaptchaVerifier,

    signInWithPopup: vi.fn(() =>
      Promise.resolve({
        user: {
          uid: "123",
          email: "test@example.com",
        },
      })
    ),

    signInWithPhoneNumber: vi.fn(),
  };
});

vi.mock("react-router-dom", () => ({
  useNavigate: () => vi.fn(),
}));

const signInWithPasswordMock = vi.hoisted(() =>
  vi.fn(() => Promise.resolve({ error: null }))
);

const signUpWithEmailPassMock = vi.hoisted(() =>
  vi.fn(() => Promise.resolve({ error: null }))
);

const resendMock = vi.hoisted(() =>
  vi.fn(() => Promise.resolve({ error: null }))
);


const mockQuery = {
  select: vi.fn().mockReturnThis(),
  eq: vi.fn().mockReturnThis(),
  maybeSingle: vi.fn(() =>
    Promise.resolve({ data: null, error: null })
  ),
};

vi.mock("@supabase/supabase-js", () => ({
  createClient: () => ({
    auth: {
      signInWithPassword: signInWithPasswordMock,
      signUp: signUpWithEmailPassMock,
      resend: resendMock,
      getUser: vi.fn(() =>
        Promise.resolve({
          data: { user: { id: "12345678", email: "test@rizen.com" } },
        })
      ),
    },
    from: vi.fn(() => mockQuery),
  }),
}));


//Sign in -> Continue with Google, Continue with Facebook... PAGE
describe("Sign in PAGE", () => {
  beforeEach(async() => {
    render(<Signin/>);
  });

  it("Google button rendered", async() => {
    const googleButton = screen.getByRole("button" , {name:"Continue with Google"});
    expect(googleButton).toBeVisible();
  });

  it("Facebook button rendered", async() => {
    const facebookButton = screen.getByRole("button", {name:"Continue with Facebook"});
    expect(facebookButton).toBeVisible();
  });

  it("Email button rendered", async() => {
    const emailButton = screen.getByRole("button", {name:"Continue with Email"});
    expect(emailButton).toBeVisible();
  });

  it("Phone button rendered", async() => {
    const phoneButton = screen.getByRole("button", {name:"Continue with Phone"});
    expect(phoneButton).toBeVisible();
  });
});

describe("Continue with Google button clicked", () => {
  it("Triggers Firebase", async() => {
    const user = userEvent.setup();
    render(<Signin/>);

    const googleButton = screen.getByRole("button" , {name:"Continue with Google"});
    await user.click(googleButton);

    await waitFor(() => {
      expect(signInWithPopup).toHaveBeenCalled();
    });
  });
});

describe("Continue with Facebook button clicked", () => {
  it("Triggers Firebase", async() => {
    const user = userEvent.setup();
    render(<Signin/>);

    const facebookButton = screen.getByRole("button" , {name:"Continue with Facebook"});
    await user.click(facebookButton);

    await waitFor(() => {
      expect(signInWithPopup).toHaveBeenCalled();
    });
  });
});

describe("Continue with Email button clicked", () => {
  beforeEach(async() => {
    const user = userEvent.setup();
    render(<Signin/>);

    const emailButton = screen.getByRole("button" , {name:"Continue with Email"});
    await user.click(emailButton);
  });

  it("Renders the back button", async() => {
    const backButton = screen.getByRole("button", {name: "Back"});
    expect(backButton).toBeVisible();
  });

  it("Renders email input field", async() => {
    const emailField = screen.getByPlaceholderText("jane@example.com");
    expect(emailField).toHaveAttribute("type", "email");
    expect(emailField).toBeVisible();
  });

  it("Renders password input field", async() => {
    const passwordField = screen.getByPlaceholderText("Enter your password");
    expect(passwordField).toHaveAttribute("type", "password");
    expect(passwordField).toBeVisible();
  });

  it("Renders Sign in button", async() => {
    const signInButton = screen.getByRole("button", {name: "Sign in"});
    expect(signInButton).toBeVisible();
  });

  it("Renders Don't have an account button", async() => {
    const dontHaveAnAccountButton = screen.getByRole("button", {name: "Don't have an account? Create one"});
    expect(dontHaveAnAccountButton).toBeVisible();
  });
});

describe("Continue with Phone button clicked", () => {
  beforeEach(async() => {
    const user = userEvent.setup();
    render(<Signin/>);

    const continueWithPhoneButton = screen.getByRole("button", {name: "Continue with Phone"});
    await user.click(continueWithPhoneButton);
  });

  it("Renders the back button", async() => {
    const backButton = screen.getByRole("button", {name: "Back"});
    expect(backButton).toBeVisible();
  });

  it("Renders the phone input field", async() => {
    const phoneField = screen.getByRole("textbox");
    expect(phoneField).toHaveAttribute("type", "tel");
    expect(phoneField).toBeVisible();
  });

  it("Renders the Send OTP button", async() => {
    const sendOTPButton = screen.getByRole("button", {name:"Send OTP"});
    expect(sendOTPButton).toBeVisible();
  });
});


//Sign in - using Email address PAGE
describe("Back button Clicked(Sign in - Email address page)", () => {
  beforeEach(async() => {
    const user = userEvent.setup();
    render(<Signin/>);
    
    const emailButton = screen.getByRole("button", {name:"Continue with Email"});
    await user.click(emailButton);

    const backButton = screen.getByRole("button", {name: "Back"});
    await user.click(backButton);
  });

  it("Renders the Continue with Google button", async() => {
    const googleButton = screen.getByRole("button", {name:"Continue with Google"});
    expect(googleButton).toBeVisible();
  });

  it("Renders the Continue with Facebook button", async() => {
    const facebookButton = screen.getByRole("button", {name:"Continue with Facebook"});
    expect(facebookButton).toBeVisible();
  });

  it("Renders the Continue with Email button", async() => {
    const emailButton = screen.getByRole("button", {name:"Continue with Email"});
    expect(emailButton).toBeVisible();
  });

  it("Renders the Continue with Phone button", async() => {
    const phoneButton = screen.getByRole("button", {name:"Continue with Phone"});
    expect(phoneButton).toBeVisible();
  });
});

describe("Sign in button Clicked", () => {
  it("Triggers Supabase", async () => {
    const user = userEvent.setup();
    render(<Signin/>);
    
    const emailButton = screen.getByRole("button", {name:"Continue with Email"});
    await user.click(emailButton);

    const emailField = screen.getByPlaceholderText("jane@example.com");
    const passwordField = screen.getByPlaceholderText("Enter your password");

    await user.type(emailField, "test@rizen.com");
    await user.type(passwordField, "12345678");

    const signInButton = screen.getByRole("button", {name: "Sign in"});
    await user.click(signInButton);

    await waitFor(() => {
      expect(signInWithPasswordMock).toHaveBeenCalled();
    });
  });
});

describe("Don't have an account ? Create one - Clicked", () => {
  beforeEach(async() => {
    const user = userEvent.setup();
    render(<Signin/>);
    
    const emailButton = screen.getByRole("button", {name:"Continue with Email"});
    await user.click(emailButton);

    const toggleButton = screen.getByRole("button", {name:"Don't have an account? Create one"});
    await user.click(toggleButton);
  });

  it("Renders the back button", async() => {
    const backButton = screen.getByRole("button", {name: "Back"});
    expect(backButton).toBeVisible();
  });

  it("Renders email input field", async() => {
    const emailField = screen.getByPlaceholderText("jane@example.com");
    expect(emailField).toHaveAttribute("type", "email");
    expect(emailField).toBeVisible();
  });

  it("Renders new password input field", async() => {
    const passwordField = screen.getByPlaceholderText("Create a strong password");
    expect(passwordField).toHaveAttribute("type", "password");
    expect(passwordField).toBeVisible();
  });

  it("Renders confirm password input field", async() => {
    const confirmField = screen.getByPlaceholderText("Repeat your password");
    expect(confirmField).toHaveAttribute("type", "password");
    expect(confirmField).toBeVisible();
  });

  it("Renders Send verification code button", async() => {
    const sendVerificationCodeButton = screen.getByRole("button", {name: "Send verification code"});
    expect(sendVerificationCodeButton).toBeVisible();
  });

  it("Renders Already have an account button", async() => {
    const alreadyHaveAnAccountButton = screen.getByRole("button", {name: "Already have an account? Sign in"});
    expect(alreadyHaveAnAccountButton).toBeVisible();
  });
});

//Create account PAGE
describe("Back button Clicked(Create account page)", () => {
  beforeEach(async() => {
    const user = userEvent.setup();
    render(<Signin/>);
    
    const emailButton = screen.getByRole("button", {name:"Continue with Email"});
    await user.click(emailButton);

    const dontHaveAnAccountButton = screen.getByRole("button", {name: "Don't have an account? Create one"});
    await user.click(dontHaveAnAccountButton);

    const backButton = screen.getByRole("button", {name: "Back"});
    await user.click(backButton);
  });

  it("Renders the Continue with Google button", async() => {
    const googleButton = screen.getByRole("button", {name:"Continue with Google"});
    expect(googleButton).toBeVisible();
  });

  it("Renders the Continue with Facebook button", async() => {
    const facebookButton = screen.getByRole("button", {name:"Continue with Facebook"});
    expect(facebookButton).toBeVisible();
  });

  it("Renders the Continue with Email button", async() => {
    const emailButton = screen.getByRole("button", {name:"Continue with Email"});
    expect(emailButton).toBeVisible();
  });

  it("Renders the Continue with Phone button", async() => {
    const phoneButton = screen.getByRole("button", {name:"Continue with Phone"});
    expect(phoneButton).toBeVisible();
  });
})

describe("Send verification code Clicked", () => {
  beforeEach(async() => {
    const user = userEvent.setup();
    render(<Signin/>);

    const emailButton = screen.getByRole("button", {name:"Continue with Email"});
    await user.click(emailButton);

    const dontHaveAnAccountButton = screen.getByRole("button", {name:"Don't have an account? Create one"});
    await user.click(dontHaveAnAccountButton);

    const emailField = screen.getByPlaceholderText("jane@example.com");
    const passwordField = screen.getByPlaceholderText("Create a strong password");
    const confirmField = screen.getByPlaceholderText("Repeat your password");

    await user.type(emailField, "test@rizen.com");
    await user.type(passwordField, "12345678");
    await user.type(confirmField, "12345678");

    const sendVerificationCodeButton = screen.getByRole("button", {name:"Send verification code"});
    await user.click(sendVerificationCodeButton);
  });

  it("Triggers Supabase", async() => {
    await waitFor(() => {
      expect(signUpWithEmailPassMock).toHaveBeenCalled();
    });
  });

  it("Renders back button", async() => {
    const backButton = screen.getByRole("button", {name:"Back"});
    expect(backButton).toBeVisible();
  });

  it("Renders OTP input boxes", async() => {
    const otpBoxes = screen.getAllByRole("textbox");
    expect(otpBoxes).toHaveLength(6);

    otpBoxes.forEach((otpBox) => {
      expect(otpBox).toBeVisible();
    });
  });

  it("Renders Verify code button", async() => {
    const verifyCodeButton = screen.getByRole("button", {name:"Verify code"});
    expect(verifyCodeButton).toBeVisible();
  });

  it("Renders Resend code button", async() => {
    const resendCodeButton = screen.getByRole("button", {name:"Resend code"});
    expect(resendCodeButton).toBeVisible();
  });
});

describe("Already have an account Clicked", () => {
  beforeEach(async() => {
    const user = userEvent.setup();
    render(<Signin/>);
    
    const emailButton = screen.getByRole("button", {name:"Continue with Email"});
    await user.click(emailButton);

    const dontHaveAnAccountButton = screen.getByRole("button", {name: "Don't have an account? Create one"});
    await user.click(dontHaveAnAccountButton);

    const alreadyHaveAnAccountButton = screen.getByRole("button", {name: "Already have an account? Sign in"});
    await user.click(alreadyHaveAnAccountButton);
  });

  it("Renders the back button", async() => {
    const backButton = screen.getByRole("button", {name: "Back"});
    expect(backButton).toBeVisible();
  });

  it("Renders email input field", async() => {
    const emailField = screen.getByPlaceholderText("jane@example.com");
    expect(emailField).toHaveAttribute("type", "email");
    expect(emailField).toBeVisible();
  });

  it("Renders password input field", async() => {
    const passwordField = screen.getByPlaceholderText("Enter your password");
    expect(passwordField).toHaveAttribute("type", "password");
    expect(passwordField).toBeVisible();
  });

  it("Renders Sign in button", async() => {
    const signInButton = screen.getByRole("button", {name: "Sign in"});
    expect(signInButton).toBeVisible();
  });

  it("Renders Don't have an account button", async() => { 
    const dontHaveAnAccountButton = screen.getByRole("button", {name: "Don't have an account? Create one"});
    expect(dontHaveAnAccountButton).toBeVisible();
  });  
});

//Email OTP PAGE
describe("Back button Clicked(Email OTP PAGE)", () => {
  beforeEach(async() => {
    const user = userEvent.setup();
    render(<Signin/>);

    const emailButton = screen.getByRole("button", {name:"Continue with Email"});
    await user.click(emailButton);

    const dontHaveAnAccountButton = screen.getByRole("button", {name:"Don't have an account? Create one"});
    await user.click(dontHaveAnAccountButton);

    const emailField = screen.getByPlaceholderText("jane@example.com");
    const passwordField = screen.getByPlaceholderText("Create a strong password");
    const confirmField = screen.getByPlaceholderText("Repeat your password");

    await user.type(emailField, "test@rizen.com");
    await user.type(passwordField, "12345678");
    await user.type(confirmField, "12345678");

    const sendVerificationCodeButton = screen.getByRole("button", {name:"Send verification code"});
    await user.click(sendVerificationCodeButton);

    const backButton = screen.getByRole("button", {name:"Back"});
    await user.click(backButton);
  });

  it("Renders the back button", async() => {
    const backButton = screen.getByRole("button", {name: "Back"});
    expect(backButton).toBeVisible();
  });

  it("Renders email input field", async() => {
    const emailField = screen.getByPlaceholderText("jane@example.com");
    expect(emailField).toHaveAttribute("type", "email");
    expect(emailField).toBeVisible();
  });

  it("Renders new password input field", async() => {
    const passwordField = screen.getByPlaceholderText("Create a strong password");
    expect(passwordField).toHaveAttribute("type", "password");
    expect(passwordField).toBeVisible();
  });

  it("Renders confirm password input field", async() => {
    const confirmField = screen.getByPlaceholderText("Repeat your password");
    expect(confirmField).toHaveAttribute("type", "password");
    expect(confirmField).toBeVisible();
  });

  it("Renders Send verification code button", async() => {
    const sendVerificationCodeButton = screen.getByRole("button", {name: "Send verification code"});
    expect(sendVerificationCodeButton).toBeVisible();
  });

  it("Renders Already have an account button", async() => {
    const alreadyHaveAnAccountButton = screen.getByRole("button", {name: "Already have an account? Sign in"});
    expect(alreadyHaveAnAccountButton).toBeVisible();
  });  
});

//verify code

describe("Resend button Clicked", () => {
  it("Triggers Supabase", async() => {
    const user = userEvent.setup();
    render(<Signin/>);

    const emailButton = screen.getByRole("button", {name:"Continue with Email"});
    await user.click(emailButton);

    const dontHaveAnAccountButton = screen.getByRole("button", {name:"Don't have an account? Create one"});
    await user.click(dontHaveAnAccountButton);

    const emailField = screen.getByPlaceholderText("jane@example.com");
    const passwordField = screen.getByPlaceholderText("Create a strong password");
    const confirmField = screen.getByPlaceholderText("Repeat your password");

    await user.type(emailField, "test@rizen.com");
    await user.type(passwordField, "12345678");
    await user.type(confirmField, "12345678");

    const sendVerificationCodeButton = screen.getByRole("button", {name:"Send verification code"});
    await user.click(sendVerificationCodeButton);

    const resendCodeButton = screen.getByRole("button", {name:"Resend code"});
    await waitFor(() => {
      expect(resendMock).toHaveBeenCalled();
    });
  });
});


//Sign in - using Phone PAGE
describe("Back button Clicked on Continue with Phone page, changes to sign in welcome ppage", () => {
  beforeEach(async() => {
    const user = userEvent.setup();
    render(<Signin/>);
    
    const phoneButton = screen.getByRole("button", {name:"Continue with Phone"});
    await user.click(phoneButton);

    const backButton = screen.getByRole("button", {name: "Back"});
    await user.click(backButton);
  });

  it("Renders the Continue with Google button", async() => {
    const googleButton = screen.getByRole("button", {name:"Continue with Google"});
    expect(googleButton).toBeVisible();
  });

  it("Renders the Continue with Facebook button", async() => {
    const facebookButton = screen.getByRole("button", {name:"Continue with Facebook"});
    expect(facebookButton).toBeVisible();
  });

  it("Renders the Continue with Email button", async() => {
    const emailButton = screen.getByRole("button", {name:"Continue with Email"});
    expect(emailButton).toBeVisible();
  });

  it("Renders the Continue with Phone button", async() => {
    const phoneButton = screen.getByRole("button", {name:"Continue with Phone"});
    expect(phoneButton).toBeVisible();
  });
})

//To do - Send OTP button






