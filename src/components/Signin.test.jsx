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

const verifyOtpMock = vi.hoisted(() =>
  vi.fn(() => Promise.resolve({ error: null }))
);

const mockQuery = {
  select: vi.fn().mockReturnThis(),
  eq: vi.fn().mockReturnThis(),
  ilike: vi.fn().mockReturnThis(),
  upsert: vi.fn(() => Promise.resolve({ error: null })),
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
      verifyOtp: verifyOtpMock,
      getUser: vi.fn(() =>
        Promise.resolve({
          data: { user: { id: "12345678", email: "test@rizen.com" } },
          error: null,
        })
      ),
    },
    from: vi.fn(() => mockQuery),
  }),
}));






//functions
//opening Sign In - Welcome PAGE
function openSignInWelcomePage(){
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
}

//opening Email Sign In PAGE
function openEmailSignInPage(){
    it("Renders the Back button", async() => {
    const backButton = screen.getByRole("button", {name: "Back"});
    expect(backButton).toBeVisible();
  });

  it("Renders Email input field", async() => {
    const emailField = screen.getByPlaceholderText("jane@example.com");
    expect(emailField).toHaveAttribute("type", "email");
    expect(emailField).toBeVisible();
  });

  it("Renders Password input field", async() => {
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
}

//opening Phone Sign In PAGE
function openPhoneSignInPage(){
    it("Renders the Back button", async() => {
    const backButton = screen.getByRole("button", {name: "Back"});
    expect(backButton).toBeVisible();
  });

  it("Renders the Phone input field", async() => {
    const phoneField = screen.getByRole("textbox");
    expect(phoneField).toHaveAttribute("type", "tel");
    expect(phoneField).toBeVisible();
  });

  it("Renders the Send OTP button", async() => {
    const sendOTPButton = screen.getByRole("button", {name:"Send OTP"});
    expect(sendOTPButton).toBeVisible();
  });
}

//opening Email Create Account PAGE
function openEmailCreateAccountPage(){
  it("Renders the Back button", async() => {
    const backButton = screen.getByRole("button", {name: "Back"});
    expect(backButton).toBeVisible();
  });

  it("Renders Email input field", async() => {
    const emailField = screen.getByPlaceholderText("jane@example.com");
    expect(emailField).toHaveAttribute("type", "email");
    expect(emailField).toBeVisible();
  });

  it("Renders New password input field", async() => {
    const passwordField = screen.getByPlaceholderText("Create a strong password");
    expect(passwordField).toHaveAttribute("type", "password");
    expect(passwordField).toBeVisible();
  });

  it("Renders Confirm password input field", async() => {
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
}

//opening Email-OTP PAGE
function openEmailOtpPage(){
  it("Renders the Back button", async() => {
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
}

//opening Complete your profile PAGE
function openCompleteProfile(){
  it("Renders Name field", async() => {
    const nameField = screen.getByPlaceholderText("Jane");
    expect(nameField).toHaveRole("textbox");
    expect(nameField).toBeVisible();
  });

  it("Renders Surname field", async() => {
    const surnameField = screen.getByPlaceholderText("Dlamini");
    expect(surnameField).toHaveRole("textbox");
    expect(surnameField).toBeVisible();
  });

  it("Renders gender buttons", async() => {
    const genders = ["male", "female", "other"];

    genders.forEach((gender) => {
      const genderButton = screen.getByRole("button", {name:gender});
      expect(genderButton).toBeVisible();
    });
  });

  it("Renders ID field", async() => {
    const IdField = screen.getByPlaceholderText("13 digits");
    expect(IdField).toHaveRole("textbox");
    expect(IdField).toBeVisible();
  });

  //email or phone
}

//opening Done PAGE
function openDonePage(){
  it("Render Go to dashboard button", async() => {
    const goToDashboardButton = screen.getByRole("button", {name:"Go to Dashboard"});
    expect(goToDashboardButton).toBeVisible();
  });
  
  it("Renders Back to login button", async() => {
    const backToLoginButton = screen.getByRole("button", {name:"Back to login"});
    expect(backToLoginButton).toBeVisible();
  });
}






//Sign in -> Continue with Google, Continue with Facebook... PAGE
describe("Sign in - Welcome PAGE", () => {
  beforeEach(async() => {
    render(<Signin/>);
  });

  openSignInWelcomePage();
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

    //opens dashboard OR complete profile
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

    //opens dashboard OR complete profile
  });
});

describe("Continue with Email button clicked", () => {
  beforeEach(async() => {
    const user = userEvent.setup();
    render(<Signin/>);

    const emailButton = screen.getByRole("button" , {name:"Continue with Email"});
    await user.click(emailButton);
  });

  openEmailSignInPage();
});

describe("Continue with Phone button clicked", () => {
  beforeEach(async() => {
    const user = userEvent.setup();
    render(<Signin/>);

    const continueWithPhoneButton = screen.getByRole("button", {name: "Continue with Phone"});
    await user.click(continueWithPhoneButton);
  });

  openPhoneSignInPage();
});


//Sign in - using Email address PAGE
describe("Back button clicked from Email Sign In page)", () => {
  beforeEach(async() => {
    const user = userEvent.setup();
    render(<Signin/>);
    
    const emailButton = screen.getByRole("button", {name:"Continue with Email"});
    await user.click(emailButton);

    const backButton = screen.getByRole("button", {name: "Back"});
    await user.click(backButton);
  });

  openSignInWelcomePage();
});

describe("Email Sign in button clicked", () => {
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

  //opens dashboard OR complete profile
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

  openEmailCreateAccountPage();
});

//Create account PAGE
describe("Back button clicked from Email Create account page)", () => {
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

  openSignInWelcomePage();
});


describe("Send verification code clicked", () => {
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

  openEmailOtpPage();
});

describe("Already have an account clicked", () => {
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

  openEmailSignInPage();  
});

//Email OTP PAGE
describe("Back button clicked from Email OTP page", () => {
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

  openEmailCreateAccountPage(); 
});

describe("Verify code clicked", () => {
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

    const boxes = [
      screen.getByTestId("otp-input-0"),
      screen.getByTestId("otp-input-1"),
      screen.getByTestId("otp-input-2"),
      screen.getByTestId("otp-input-3"),
      screen.getByTestId("otp-input-4"),
      screen.getByTestId("otp-input-5"),
    ];

    for (let i = 0; i < boxes.length; i++) {
      await user.type(boxes[i], "1");
    }

    const verifyCodeButton = screen.getByRole("button", {name:"Verify code"});
    await user.click(verifyCodeButton);
  });

  it("Triggers Supabase", async() => {
    await waitFor(() => {
      expect(verifyOtpMock).toHaveBeenCalled();
    });
  });

  //opens dashboard OR complete profile
});

describe("Resend button clicked", () => {
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
    await user.click(resendCodeButton);

    await waitFor(() => {
      expect(resendMock).toHaveBeenCalled();
    });
  });
});

//Sign in - using Phone PAGE
describe("Back button clicked from Phone Sign In page", () => {
  beforeEach(async() => {
    const user = userEvent.setup();
    render(<Signin/>);
    
    const phoneButton = screen.getByRole("button", {name:"Continue with Phone"});
    await user.click(phoneButton);

    const backButton = screen.getByRole("button", {name: "Back"});
    await user.click(backButton);
  });

  openSignInWelcomePage();
});



//To do - Send OTP button


//Commplete profile PAGE
describe("Save & continue clicked", () => {
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

    await waitFor(() => {
      expect(signUpWithEmailPassMock).toHaveBeenCalled();
    });

    const boxes = [
      screen.getByTestId("otp-input-0"),
      screen.getByTestId("otp-input-1"),
      screen.getByTestId("otp-input-2"),
      screen.getByTestId("otp-input-3"),
      screen.getByTestId("otp-input-4"),
      screen.getByTestId("otp-input-5"),
    ];

    for (let i = 0; i < boxes.length; i++) {
      await user.type(boxes[i], "1");
    }

    const verifyCodeButton = screen.getByRole("button", {name:"Verify code"});
    await user.click(verifyCodeButton);

    await waitFor(() => {
      expect(verifyOtpMock).toHaveBeenCalled();
    });

    const nameField = screen.getByPlaceholderText("Jane");
    const surnameField = screen.getByPlaceholderText("Dlamini");
    const genderButton = screen.getByRole("button", {name:"Male"});
    const IdField = screen.getByPlaceholderText("13 digits");

    await user.type(nameField, "abc");
    await user.type(surnameField, "xyz");
    await user.click(genderButton);
    await user.type(IdField, "0101011234567");

    const saveContinueButton = screen.getByRole("button", {name:"Save & continue"});
    await user.click(saveContinueButton);
    });

    openDonePage();
});


//Done page
describe("Back to login clicked from Done page", () => {
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

    const boxes = [
      screen.getByTestId("otp-input-0"),
      screen.getByTestId("otp-input-1"),
      screen.getByTestId("otp-input-2"),
      screen.getByTestId("otp-input-3"),
      screen.getByTestId("otp-input-4"),
      screen.getByTestId("otp-input-5"),
    ];

    for (let i = 0; i < boxes.length; i++) {
      await user.type(boxes[i], "1");
    }

    const verifyCodeButton = screen.getByRole("button", {name:"Verify code"});
    await user.click(verifyCodeButton);

    await waitFor(() => {
      expect(verifyOtpMock).toHaveBeenCalled();
    });

    const nameField = screen.getByPlaceholderText("Jane");
    const surnameField = screen.getByPlaceholderText("Dlamini");
    const genderButton = screen.getByRole("button", {name:"Male"});
    const IdField = screen.getByPlaceholderText("13 digits");

    await user.type(nameField, "abc");
    await user.type(surnameField, "xyz");
    await user.click(genderButton);
    await user.type(IdField, "0101011234567");

    const saveContinueButton = screen.getByRole("button", {name:"Save & continue"});
    await user.click(saveContinueButton);

    const backToLoginButton = screen.getByRole("button", {name:"Back to login"});
    await user.click(backToLoginButton);
  });

  openSignInWelcomePage();
});

describe("Go to dashboard clicked", () => {
  //open dashboard
});
