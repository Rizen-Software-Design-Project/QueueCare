import {render, screen, waitFor} from "@testing-library/react";
import {describe, it, expect, vi } from "vitest";
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
      getUser: vi.fn(() =>
        Promise.resolve({
          data: { user: { id: "12345678", email: "test@rizen.com" } },
        })
      ),
    },
    from: vi.fn(() => mockQuery),
  }),
}));


//Sign in, Welcome, Google, Facebook
describe("Continue with buttons visible", () => {
  it("Renders the Continue with Google button", async() => {
    render(<Signin/>);
    const googleButton = screen.getByText("Continue with Google");
    expect(googleButton).toBeInTheDocument();
  });

  it("Renders the Continue with Facebook button", async() => {
    render(<Signin/>);
    const facebookButton = screen.getByText("Continue with Facebook");
    expect(facebookButton).toBeInTheDocument();
  });

  it("Renders the Continue with Email button", async() => {
    render(<Signin/>);
    const emailButton = screen.getByText("Continue with Email");
    expect(emailButton).toBeInTheDocument();
  });

  it("Renders the Continue with Phone button", async() => {
    render(<Signin/>);
    const phoneButton = screen.getByText("Continue with Phone");
    expect(phoneButton).toBeInTheDocument();
  });
});


describe("Continue with Google button clicked", () => {
  it("Triggers Firebase when Continue with Google clicked", async() => {
    const user = userEvent.setup();
    render(<Signin/>);

    const googleButton = screen.getByText("Continue with Google");
    await user.click(googleButton);

    await waitFor(() => {
      expect(signInWithPopup).toHaveBeenCalled();
    });
  });
});

describe("Continue with Facebook button clicked", () => {
  it("Triggers Firebase when Continue with Facebook clicked", async() => {
    const user = userEvent.setup();
    render(<Signin/>);

    const facebookButton = screen.getByText("Continue with Facebook");
    await user.click(facebookButton);

    await waitFor(() => {
      expect(signInWithPopup).toHaveBeenCalled();
    });
  });
});


//Sign in, Email
//To do - back button

describe("Continue with Email button clicked, changes to email sign in page", () => {
  it("Renders the back button", async() => {
    const user = userEvent.setup();
    render(<Signin/>);

    const emailButton = screen.getByText("Continue with Email");
    await user.click(emailButton);

    const backButton = screen.getByRole("button", {name: "Back"});
    expect(backButton).toBeInTheDocument();
  });

  it("Renders email input field", async() => {
    const user = userEvent.setup();
    render(<Signin/>);

    const emailButton = screen.getByText("Continue with Email");
    await user.click(emailButton);

    const emailField = screen.getByPlaceholderText("jane@example.com");
    expect(emailField).toHaveAttribute("type", "email");
  });

  it("Renders password input field", async() => {
    const user = userEvent.setup();
    render(<Signin/>);

    const emailButton = screen.getByText("Continue with Email");
    await user.click(emailButton);

    const passwordField = screen.getByPlaceholderText("Enter your password");
    expect(passwordField).toBeVisible();
  });

  it("Renders Sign in button", async() => {
    const user = userEvent.setup();
    render(<Signin/>);

    const emailButton = screen.getByText("Continue with Email");
    await user.click(emailButton);

    const signInButton = screen.getByRole("button", {name: "Sign in"});
    expect(signInButton).toBeInTheDocument();
  });

  it("Renders Don't have an account button", async() => {
    const user = userEvent.setup();
    render(<Signin/>);

    const emailButton = screen.getByText("Continue with Email");
    await user.click(emailButton);
    
    const dontHaveAnAccountButton = screen.getByRole("button", {name: "Don't have an account? Create one"});
    expect(dontHaveAnAccountButton).toBeInTheDocument();
  });
});


describe("Back button Clicked on sign in page, changes to sign in welcome page", () => {
  beforeEach(async() => {
    const user = userEvent.setup();
    render(<Signin/>);
    
    const emailButton = screen.getByText("Continue with Email");
    await user.click(emailButton);
  });

  it("Renders the Continue with Google button", async() => {
    const user = userEvent.setup();

    const backButton = screen.getByRole("button", {name: "Back"});
    await user.click(backButton);

    const googleButton = screen.getByText("Continue with Google");
    expect(googleButton).toBeInTheDocument();
  });

  it("Renders the Continue with Facebook button", async() => {
    const user = userEvent.setup();

    const backButton = screen.getByRole("button", {name: "Back"});
    await user.click(backButton);

    const facebookButton = screen.getByText("Continue with Facebook");
    expect(facebookButton).toBeInTheDocument();
  });

  it("Renders the Continue with Email button", async() => {
    const user = userEvent.setup();

    const backButton = screen.getByRole("button", {name: "Back"});
    await user.click(backButton);

    const emailButton = screen.getByText("Continue with Email");
    expect(emailButton).toBeInTheDocument();
  });

  it("Renders the Continue with Phone button", async() => {
    const user = userEvent.setup();

    const backButton = screen.getByRole("button", {name: "Back"});
    await user.click(backButton);

    const phoneButton = screen.getByText("Continue with Phone");
    expect(phoneButton).toBeInTheDocument();
  });
})


describe("Sign in button Clicked", () => {
  beforeEach(async() => {
    const user = userEvent.setup();
    render(<Signin/>);
    
    const emailButton = screen.getByText("Continue with Email");
    await user.click(emailButton);
  });

  it("Triggers Supabase when Sign in clicked", async () => {
    const user = userEvent.setup();

    const emailField = screen.getByPlaceholderText("jane@example.com");
    const passwordField = screen.getByPlaceholderText("Enter your password");

    await user.type(emailField, "test@rizen.com");
    await user.type(passwordField, "12345678");

    const signInButton = screen.getByRole("button", { name: "Sign in" });
    await user.click(signInButton);

    await waitFor(() => {
      expect(signInWithPasswordMock).toHaveBeenCalled();
    });
  });
});


describe("Don't have an account ? Create one Clicked. Leads to Create account page", () => {
  beforeEach(async() => {
    const user = userEvent.setup();
    render(<Signin/>);
    
    const emailButton = screen.getByText("Continue with Email");
    await user.click(emailButton);
  });

  it("Renders the back button", async() => {
    const user = userEvent.setup();

    const toggleButton = screen.getByText("Don't have an account? Create one");
    await user.click(toggleButton);

    const backButton = screen.getByRole("button", {name: "Back"});
    expect(backButton).toBeInTheDocument();
  });

  it("Renders email input field", async() => {
    const user = userEvent.setup();

    const toggleButton = screen.getByText("Don't have an account? Create one");
    await user.click(toggleButton);
    
    const emailField = screen.getByPlaceholderText("jane@example.com");
    expect(emailField).toHaveAttribute("type", "email");
  });

  it("Renders new password input field", async() => {
    const user = userEvent.setup();

    const toggleButton = screen.getByText("Don't have an account? Create one");
    await user.click(toggleButton);
    
    const passwordField = screen.getByPlaceholderText("Create a strong password");
    expect(passwordField).toBeVisible();
  });

  it("Renders confirm password input field", async() => {
    const user = userEvent.setup();
    const toggleButton = screen.getByText("Don't have an account? Create one");
    await user.click(toggleButton);
    
    const confirmField = screen.getByPlaceholderText("Repeat your password");
    expect(confirmField).toBeVisible();
  });

  it("Renders send verification code button", async() => {
    const user = userEvent.setup();

    const toggleButton = screen.getByText("Don't have an account? Create one");
    await user.click(toggleButton);
    
    const sendVerificationCodeButton = screen.getByRole("button", {name: "Send verification code"});
    expect(sendVerificationCodeButton).toBeVisible();
  })

  it("Renders Already have an account button", async() => {
    const user = userEvent.setup();

    const toggleButton = screen.getByText("Don't have an account? Create one");
    await user.click(toggleButton);

    const alreadyHaveAnAccountButton = screen.getByRole("button", {name: "Already have an account? Sign in"});
    expect(alreadyHaveAnAccountButton).toBeVisible();
  })
});


describe("Back button Clicked on create account page, changes to sign in welcome page", () => {
  beforeEach(async() => {
    const user = userEvent.setup();
    render(<Signin/>);
    
    const emailButton = screen.getByText("Continue with Email");
    await user.click(emailButton);

    const dontHaveAnAccountButton = screen.getByRole("button", {name: "Don't have an account? Create one"});
    await user.click(dontHaveAnAccountButton);
  });

  it("Renders the Continue with Google button", async() => {
    const user = userEvent.setup();

    const backButton = screen.getByRole("button", {name: "Back"});
    await user.click(backButton);

    const googleButton = screen.getByText("Continue with Google");
    expect(googleButton).toBeInTheDocument();
  });

  it("Renders the Continue with Facebook button", async() => {
    const user = userEvent.setup();

    const backButton = screen.getByRole("button", {name: "Back"});
    await user.click(backButton);

    const facebookButton = screen.getByText("Continue with Facebook");
    expect(facebookButton).toBeInTheDocument();
  });

  it("Renders the Continue with Email button", async() => {
    const user = userEvent.setup();

    const backButton = screen.getByRole("button", {name: "Back"});
    await user.click(backButton);

    const emailButton = screen.getByText("Continue with Email");
    expect(emailButton).toBeInTheDocument();
  });

  it("Renders the Continue with Phone button", async() => {
    const user = userEvent.setup();

    const backButton = screen.getByRole("button", {name: "Back"});
    await user.click(backButton);

    const phoneButton = screen.getByText("Continue with Phone");
    expect(phoneButton).toBeInTheDocument();
  });
})

//To do - Send verification code

describe("Already have an account Clicked, changes to sign in page", () => {
  beforeEach(async() => {
    const user = userEvent.setup();
    render(<Signin/>);
    
    const emailButton = screen.getByText("Continue with Email");
    await user.click(emailButton);

    const dontHaveAnAccountButton = screen.getByRole("button", {name: "Don't have an account? Create one"});
    await user.click(dontHaveAnAccountButton);
  });

  it("Renders the back button", async() => {
    const user = userEvent.setup();

    const alreadyHaveAnAccountButton = screen.getByRole("button", {name: "Already have an account? Sign in"});
    await user.click(alreadyHaveAnAccountButton);

    const backButton = screen.getByRole("button", {name: "Back"});
    expect(backButton).toBeInTheDocument();
  });

  it("Renders email input field", async() => {
    const user = userEvent.setup();

    const alreadyHaveAnAccountButton = screen.getByRole("button", {name: "Already have an account? Sign in"});
    await user.click(alreadyHaveAnAccountButton);

    const emailField = screen.getByPlaceholderText("jane@example.com");
    expect(emailField).toHaveAttribute("type", "email");
  });

  it("Renders password input field", async() => {
    const user = userEvent.setup();

    const alreadyHaveAnAccountButton = screen.getByRole("button", {name: "Already have an account? Sign in"});
    await user.click(alreadyHaveAnAccountButton);

    const passwordField = screen.getByPlaceholderText("Enter your password");
    expect(passwordField).toBeVisible();
  });

  it("Renders Sign in button", async() => {
    const user = userEvent.setup();

    const alreadyHaveAnAccountButton = screen.getByRole("button", {name: "Already have an account? Sign in"});
    await user.click(alreadyHaveAnAccountButton);

    const signInButton = screen.getByRole("button", {name: "Sign in"});
    expect(signInButton).toBeInTheDocument();
  });

  it("Renders Don't have an account button", async() => {
    const user = userEvent.setup();

    const alreadyHaveAnAccountButton = screen.getByRole("button", {name: "Already have an account? Sign in"});
    await user.click(alreadyHaveAnAccountButton);
    
    const dontHaveAnAccountButton = screen.getByRole("button", {name: "Don't have an account? Create one"});
    expect(dontHaveAnAccountButton).toBeInTheDocument();
  });  
})


describe("Continue with Phone button clicked, changes to phone sign in page", () => {
  it("Renders the back button", async() => {
    const user = userEvent.setup();
    render(<Signin/>);

    const continueWithPhoneButton = screen.getByRole("button", {name: "Continue with Phone"});
    await user.click(continueWithPhoneButton);

    const backButton = screen.getByRole("button", {name: "Back"});
    expect(backButton).toBeVisible();
  });

  it("Renders the phone input field", async() => {
    const user = userEvent.setup();
    render(<Signin/>);

    const continueWithPhoneButton = screen.getByRole("button", {name: "Continue with Phone"});
    await user.click(continueWithPhoneButton);

    const phoneField = screen.getByPlaceholderText("821234567");
    expect(phoneField).toHaveAttribute("type", "tel");
    expect(phoneField).toBeVisible();
  });

  it("Renders the Send OTP button", async() => {
    const user = userEvent.setup();
    render(<Signin/>);

    const continueWithPhoneButton = screen.getByRole("button", {name: "Continue with Phone"});
    await user.click(continueWithPhoneButton);

    const sendOTPButton = screen.getByRole("button", {name:"Send OTP"});
    expect(sendOTPButton).toBeVisible();
  });
});

describe("Back button Clicked on Continue with Phone page, changes to sign in welcome ppage", () => {
  beforeEach(async() => {
    const user = userEvent.setup();
    render(<Signin/>);
    
    const phoneButton = screen.getByText("Continue with Phone");
    await user.click(phoneButton);
  });

  it("Renders the Continue with Google button", async() => {
    const user = userEvent.setup();

    const backButton = screen.getByRole("button", {name: "Back"});
    await user.click(backButton);

    const googleButton = screen.getByText("Continue with Google");
    expect(googleButton).toBeInTheDocument();
  });

  it("Renders the Continue with Facebook button", async() => {
    const user = userEvent.setup();

    const backButton = screen.getByRole("button", {name: "Back"});
    await user.click(backButton);

    const facebookButton = screen.getByText("Continue with Facebook");
    expect(facebookButton).toBeInTheDocument();
  });

  it("Renders the Continue with Email button", async() => {
    const user = userEvent.setup();

    const backButton = screen.getByRole("button", {name: "Back"});
    await user.click(backButton);

    const emailButton = screen.getByText("Continue with Email");
    expect(emailButton).toBeInTheDocument();
  });

  it("Renders the Continue with Phone button", async() => {
    const user = userEvent.setup();

    const backButton = screen.getByRole("button", {name: "Back"});
    await user.click(backButton);

    const phoneButton = screen.getByText("Continue with Phone");
    expect(phoneButton).toBeInTheDocument();
  });
})

//To do - Send OTP button






