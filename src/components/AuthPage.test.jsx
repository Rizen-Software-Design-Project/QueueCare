import { render, screen, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import AuthPage from "./AuthPage";
import { signInWithPopup, signInWithPhoneNumber } from "firebase/auth";
import userEvent from "@testing-library/user-event";

// *****THE COMMENTS ARE NECESSARY*****
//mocks
//opening pages
//back button clicked
//navigate to page ...
//fill and submit
//tests(describes)





//mocks
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

    signInWithPopup: vi.fn(),

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
  in: vi.fn().mockReturnThis(),
  order: vi.fn().mockReturnThis(),
  upsert: vi.fn().mockReturnThis(),
  maybeSingle: vi.fn(() => Promise.resolve({ data: null, error: null }))
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



async function selectRole(role) {
  const user = userEvent.setup();
  const roleButton = screen.getByRole("button", { name: new RegExp(role, "i") });
  await user.click(roleButton);
}


//opening pages
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


function openPhoneSignInPage(){
    it("Renders the Back button", async() => {
    const backButton = screen.getByRole("button", {name: "Back"});
    expect(backButton).toBeVisible();
  });

  it("Renders the Phone input field", async() => {
    const phoneField = screen.getByPlaceholderText("821234567");
    expect(phoneField).toHaveAttribute("type", "tel");
    expect(phoneField).toBeVisible();
  });

  it("Renders the Send OTP button", async() => {
    const sendOTPButton = screen.getByRole("button", {name:"Send OTP"});
    expect(sendOTPButton).toBeVisible();
  });
}


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


function openPhoneOtpPage(){
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

  it("Renders Verify button", async() => {
    const verifyButton = screen.getByRole("button", {name:"Verify"});
    expect(verifyButton).toBeVisible();
  });

  it("Renders Resend OTP button", async() => {
    const resendCodeButton = screen.getByRole("button", {name:/Resend in/i});
    expect(resendCodeButton).toBeVisible();
  });
}





//back button clicked
async function backButtonClicked(){
  const user = userEvent.setup();

  const backButton = screen.getByRole("button", { name: "Back" });
  await user.click(backButton);
} 





//navigate to page ...
async function navigateToEmailSignIn(){
  const user = userEvent.setup();
  render(<AuthPage/>);
  
  await selectRole("patient");

  const emailButton = screen.getByRole("button", { name: "Continue with Email" });
  await user.click(emailButton);
  
  return user;
}

async function navigateToEmailCreateAccount(){
  const user = userEvent.setup();
  render(<AuthPage/>);
    
  await selectRole("patient");

  const emailButton = screen.getByRole("button", {name:"Continue with Email"});
  await user.click(emailButton);

  const dontHaveAnAccountButton = screen.getByRole("button", {name: "Don't have an account? Create one"});
  await user.click(dontHaveAnAccountButton);

  return user;
}

async function navigateToPhoneSignIn(){
  const user = userEvent.setup();
  render(<AuthPage/>);
  
  await selectRole("patient");

  const phoneButton = screen.getByRole("button", {name:"Continue with Phone"});
  await user.click(phoneButton);

  return user;
}





//fill and submit
async function fillSubmitEmailSignIn(){
  const user = userEvent.setup();

  const emailField = screen.getByPlaceholderText("jane@example.com");
  const passwordField = screen.getByPlaceholderText("Enter your password");

  await user.type(emailField, "test@rizen.com");
  await user.type(passwordField, "12345678");

  const signInButton = screen.getByRole("button", {name: "Sign in"});
  await user.click(signInButton);
}

async function fillSubmitEmailCreateAccount(){
  const user = userEvent.setup();

  const emailField = screen.getByPlaceholderText("jane@example.com");
  const passwordField = screen.getByPlaceholderText("Create a strong password");
  const confirmField = screen.getByPlaceholderText("Repeat your password");

  await user.type(emailField, "test@rizen.com");
  await user.type(passwordField, "12345678");
  await user.type(confirmField, "12345678");

  const sendVerificationCodeButton = screen.getByRole("button", {name:"Send verification code"});
  await user.click(sendVerificationCodeButton);
}

async function fillSubmitEmailOtp(){
  const user = userEvent.setup();

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
}

async function fillSubmitPhoneSignIn(){
  const user = userEvent.setup();

  const phoneField = screen.getByPlaceholderText("821234567");
  await user.type(phoneField, "0820000000")

  const sendOTPButton = screen.getByRole("button", {name:"Send OTP"});
  await user.click(sendOTPButton);
}

async function fillSubmitCompleteProfile() {
  const user = userEvent.setup();

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
}





//tests(describes)
//Sign in -> Continue with Google, Continue with Facebook... PAGE
describe("Sign in - Welcome PAGE", () => {
  beforeEach(async() => {
    render(<AuthPage/>);
    await selectRole("patient");
  });

  openSignInWelcomePage();
});

describe("Continue with Google button clicked", () => {
  it("Triggers Firebase", async() => {
    const user = userEvent.setup();
    render(<AuthPage/>);
    await selectRole("patient");

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
    render(<AuthPage/>);
    await selectRole("patient");

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
    render(<AuthPage/>);
    await selectRole("patient");

    const emailButton = screen.getByRole("button" , {name:"Continue with Email"});
    await user.click(emailButton);
  });

  openEmailSignInPage();
});

describe("Continue with Phone button clicked", () => {
  beforeEach(async() => {
    const user = userEvent.setup();
    render(<AuthPage/>);
    await selectRole("patient");

    const continueWithPhoneButton = screen.getByRole("button", {name: "Continue with Phone"});
    await user.click(continueWithPhoneButton);
  });

  openPhoneSignInPage();
});


//Sign in - using Email address PAGE
describe("Back button clicked from Email Sign In page)", () => {
  beforeEach(async () => {
    const user = await navigateToEmailSignIn();
    
    await backButtonClicked()
  });

  openSignInWelcomePage();
});

describe("Email Sign in button clicked", () => {
  it("Triggers Supabase", async () => {
    const user = await navigateToEmailSignIn();

    await fillSubmitEmailSignIn();

    await waitFor(() => {
      expect(signInWithPasswordMock).toHaveBeenCalled();
    });
  });

  //opens dashboard OR complete profile
});

describe("Don't have an account ? Create one - Clicked", () => {
  beforeEach(async() => {
    const user = await navigateToEmailSignIn();

    const toggleButton = screen.getByRole("button", {name:"Don't have an account? Create one"});
    await user.click(toggleButton);
  });

  openEmailCreateAccountPage();
});

//Create account PAGE
describe("Back button clicked from Email Create account page)", () => {
  beforeEach(async() => {
    const user = await navigateToEmailCreateAccount();

    await backButtonClicked();
  });

  openSignInWelcomePage();
});


describe("Send verification code clicked", () => {
  beforeEach(async() => {
    const user = await navigateToEmailCreateAccount();

    await fillSubmitEmailCreateAccount();
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
    const user = await navigateToEmailCreateAccount();

    const alreadyHaveAnAccountButton = screen.getByRole("button", {name: "Already have an account? Sign in"});
    await user.click(alreadyHaveAnAccountButton);
  });

  openEmailSignInPage();  
});

//Email OTP PAGE
describe("Back button clicked from Email OTP page", () => {
  beforeEach(async() => {
    const user = await navigateToEmailCreateAccount();

    await fillSubmitEmailCreateAccount();

    await backButtonClicked();
  });

  openEmailCreateAccountPage(); 
});

describe("Verify code clicked", () => {
  beforeEach(async() => {
    const user = await navigateToEmailCreateAccount();

    await fillSubmitEmailCreateAccount();

    await fillSubmitEmailOtp();
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
    const user = await navigateToEmailCreateAccount();

    await fillSubmitEmailCreateAccount();

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
    const user = await navigateToPhoneSignIn();

    await backButtonClicked();
  });

  openSignInWelcomePage();
});

describe("Send OTP button clicked", () => {
  beforeEach(async() => {
    const user = await navigateToPhoneSignIn();

    await fillSubmitPhoneSignIn();
  });

  it("Triggers Firebase", async() => {
    await waitFor(() => {
      expect(signInWithPhoneNumber).toHaveBeenCalled();
    });
  });

  openPhoneOtpPage();
});

//Phone OTP PAGE
describe("Back button clicked from Phone OTP page", () => {
  beforeEach(async() => {
    const user = await navigateToPhoneSignIn();

    await fillSubmitPhoneSignIn();

    const backButton = screen.getByRole("button", {name:"Back"});
    await user.click(backButton);
  });

  openPhoneSignInPage();
});

// describe("Verify button clicked", () => {
//   beforeEach(async() => { 
//     const user = userEvent.setup();
//     render(<AuthPage/>);
//     await selectRole("patient");

//     const phoneButton = screen.getByRole("button", {name:"Continue with Phone"});
//     await user.click(phoneButton);

//     const phoneField = screen.getByPlaceholderText("821234567");
//     await user.type(phoneField, "0820000000")

//     const sendOTPButton = screen.getByRole("button", {name:"Send OTP"});
//     await user.click(sendOTPButton);

//     await waitFor(() => {
//       expect(signInWithPhoneNumber).toHaveBeenCalled();
//     });

//     const boxes = [
//       screen.getByTestId("otp-input-0"),
//       screen.getByTestId("otp-input-1"),
//       screen.getByTestId("otp-input-2"),
//       screen.getByTestId("otp-input-3"),
//       screen.getByTestId("otp-input-4"),
//       screen.getByTestId("otp-input-5"),
//     ];

//     for (let i = 0; i < boxes.length; i++) {
//       await user.type(boxes[i], "1");
//     }

//     const verifyButton = screen.getByRole("button", {name:"Verify"});
//     await user.click(verifyButton);
//   });

//   //opening dashboard OR complete profile
// });


describe("Resend OTP clicked", () => {
  it("Triggers Firebase", async() => {
    const user = await navigateToPhoneSignIn();

    await fillSubmitPhoneSignIn();

    const resendOtpButton = screen.getByRole("button", {name:/Resend in/i});
    await user.click(resendOtpButton);

    await waitFor(() => {
      expect(signInWithPhoneNumber).toHaveBeenCalled();
    });
  });
});


// //Commplete profile PAGE
// describe("Save & continue clicked", () => {
//   beforeEach(async() => {
//     const user = await navigateToEmailCreateAccount();

//     await fillSubmitEmailCreateAccount();

//     await fillSubmitEmailOtp();

//     await fillSubmitCompleteProfile();
//   });

//   openDonePage();
// });


//Done page
// describe("Back to login clicked from Done page", () => {
//   beforeEach(async() => {
//     const user = await navigateToEmailCreateAccount();

//     await fillSubmitEmailCreateAccount()

//     await fillSubmitEmailOtp();

//     await fillSubmitCompleteProfile();

//     const backToLoginButton = screen.getByRole("button", {name:"Back to login"});
//     await user.click(backToLoginButton);
//   });

//   openSignInWelcomePage();
// });

// describe("Go to dashboard clicked", () => {
//   //open dashboard
// });