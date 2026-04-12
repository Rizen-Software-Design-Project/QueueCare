import { signInWithPopup } from "firebase/auth";
import { auth, googleAuthProvider } from "../firebase";
import { useState, useEffect } from "react";
import { RecaptchaVerifier, signInWithPhoneNumber } from "firebase/auth";
import { useNavigate } from "react-router-dom";

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
        const res = await fetch(`http://localhost:3000/isnewuser?identity=${phonenumber}`);
        const data = await res.json();
        if (data.exists) {
          navigate('/dashboard');
        } else {
          navigate('/id_validation');
        }
      } catch (error) {
        alert("Wrong code");
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
      <section>
        {!otp_sent && at_otp && (
          <h1>Loading...</h1>
        )}

        {otp_sent && at_otp && (
          <>
            <h1>Enter OTP:</h1>
            <form onSubmit={react}>
              <input
                type="text"
                value={otp}
                onChange={e => set_otp(e.target.value)}
              />
              <button type="submit">Enter</button>
            </form>
            <a href="#" onClick={handle_resend}>Resend OTP?</a>
          </>
        )}

        {!at_otp && (
          <>
            <button onClick={signIn}>Continue with Google</button>
            <form onSubmit={phone_login}>
              <label>+27</label>
              <input
                type="tel"
                value={phonenumber}
                min={9}
                max={10}
                placeholder="821234567"
                onChange={(e) => set_phone_number(e.target.value)}
                required
              />
              <button type="submit">Continue</button>
            </form>
          </>
        )}

        <section id="recaptcha-container"></section>
      </section>
    );
}