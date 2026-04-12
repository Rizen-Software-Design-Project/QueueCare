import { signInWithPopup } from "firebase/auth";
import { auth, googleAuthProvider } from "../firebase";
import { useState, useEffect } from "react";
import { RecaptchaVerifier, signInWithPhoneNumber } from "firebase/auth";
import { useNavigate } from "react-router-dom";
import googleLogo from "../assets/google.svg"
import "./login.css";

export default function Login(){

    let navigate = useNavigate();
    const [phonenumber, set_phone_number] = useState("");
    const [otp, set_otp] = useState("");
    const [otp_sent, set_otp_sent] = useState(false);
    const [at_otp, set_at_otp] = useState(false);

    useEffect(() => {
      if (auth) {
        window.recaptchaVerifier = new RecaptchaVerifier(auth, 'recaptcha-container', {
          'size': 'invisible',
          'callback': (response) => {
            console.log("reCAPTCHA solved");
          }
        });
      }
    }, []);

    const handle_resend = (e) => {
      e.preventDefault();
      window.confirmationResult = null;
      phone_login(e);
    };

    async function react(e) {
      e.preventDefault();
      try {
        const result = await window.confirmationResult.confirm(otp);
        localStorage.setItem('identity', phonenumber);
        const res = await fetch(`https://api-treupobaqq-uc.a.run.app/isnewuser?identity=${phonenumber}`);
        const data = await res.json();
        if (data.exists) {
          navigate('/dashboard');
        } else {
          navigate('/id_validation');
        }
      } catch (error) {
        alert("Wrong code",error);
      }
    }

    async function signIn() {
      try {
        const result = await signInWithPopup(auth, googleAuthProvider);
        localStorage.setItem('identity', result.user.email);
        const res = await fetch(`https://api-treupobaqq-uc.a.run.app/isnewuser?identity=${result.user.email}`);
        const data = await res.json();
        if (data.exists) {
          navigate('/dashboard');
        } else {
          navigate('/id_validation');
        }
      } catch (error) {
        console.error(error);
      }
    }

    async function phone_login(e) {
      e.preventDefault();

      let cellnumber;

      if (phonenumber.includes(" ")) {
        set_phone_number(phonenumber.replace(/\s/g, ""));
      }
      if (phonenumber.length == 10 && phonenumber[0] == 0) {
        cellnumber = "+27" + phonenumber.slice(1, phonenumber.length);
      } else if (phonenumber.length == 9) {
        cellnumber = "+27" + phonenumber;
      } else {
        alert("Enter valid phone number");
        set_phone_number("");
        return;
      }

      set_at_otp(true);

      const appVerifier = window.recaptchaVerifier;

      try {
        await appVerifier.render();
        const confirmationResult = await signInWithPhoneNumber(auth, cellnumber, appVerifier);
        window.confirmationResult = confirmationResult;
        set_otp_sent(true);
      } catch (error) {
        console.log("This part has been bugging me ", error);
      }
    }

    



    return (
      <section className="sign-root">

        {!otp_sent && at_otp && (
          <h1 className="card-title">Loading...</h1>
        )}

        {otp_sent && at_otp && (
          <>
            <header className="logo">
              <figure className="logo-mark">
                <svg viewBox="0 0 24 24">
                  <path d="M12 2L2 7l10 5 10-5-10-5z" />
                  <path d="M2 17l10 5 10-5" />
                  <path d="M2 12l10 5 10-5" />
                </svg>
              </figure>

              <h1>MediAccess</h1>
              <p>Integrated Healthcare Management</p>
            </header>

            <main className="card">
              <h2 className="card-title">Verify it's you</h2>
              <p className="card-sub">
                    We sent a 6-digit OTP to your registered phone number
                  </p>
                <form onSubmit={react}>
                  <fieldset className="field">
                    <input 
                      type="text" 
                      value={otp} 
                      onChange={e => set_otp(e.target.value)} 
                    />
                  </fieldset>

                  <button className="btn btn-primary" type="submit">
                        Enter
                      </button>
              </form>

              <p className="question-before-link">
                Didn't receive it ?
                <button
                  type="button"
                  className="signup-resendOTP-link"
                  onClick={handle_resend}>
                    Resend OTP
                </button>
              </p>

              <section id="recaptcha-container"></section>
            </main>
          </>
        )}

        {!at_otp && (
          <>
            <header className="logo">
              <figure className="logo-mark">
                <svg viewBox="0 0 24 24">
                  <path d="M12 2L2 7l10 5 10-5-10-5z" />
                  <path d="M2 17l10 5 10-5" />
                  <path d="M2 12l10 5 10-5" />
                </svg>
              </figure>

              <h1>MediAccess</h1>
              <p>Integrated Healthcare Management</p>
            </header>


            <main className="card">
              <header>
                <h2 className="card-title">Welcome back</h2>
                <p className="card-sub">Sign in to your account to continue</p>
              </header>

              <form onSubmit={phone_login}>
                <fieldset className="field">

                  <label htmlFor="phone">Use Phone number</label>
                  <section className="phone-input-wrapper">
                    <span className="phone-code">+27</span>
                    <input
                      id="phone"
                      type="tel"
                      placeholder="72 000 0000"
                      value={phonenumber}
                      onChange={(e) => set_phone_number(e.target.value)}
                      required
                    />
                  </section>
                </fieldset>

                <button className="btn btn-primary" type="submit">
                  Continue
                </button>
              </form>

              <p className="question-before-link">
                Don't have an account?
                <button
                  type="button"
                  className="signup-resendOTP-link"
                  onClick={() => navigate('/signup')}>
                    Sign Up
                </button>
              </p>

              <hr className="divider" />

              <button onClick={signIn} className="continue-with-google-button">
                <img
                  src={googleLogo}
                  alt=""
                  width="20"
                  height="20"
                />
                Continue with Google
              </button>

              <section id="recaptcha-container"></section>

            </main>
          </>
        )}

      </section>
    );
}