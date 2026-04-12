import { signInWithPopup } from "firebase/auth";
import { auth, googleAuthProvider } from "../firebase";
import { useState, useEffect } from "react";
import { getAuth, RecaptchaVerifier, signInWithPhoneNumber } from "firebase/auth";
import { useNavigate } from "react-router-dom";
export default function Login(){


<<<<<<< HEAD
   /////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
=======
    useEffect(() => {
      getRedirectResult(auth)
        .then((result) => {
          if (result?.user) {
            localStorage.setItem('identity', result.user.email);
            navigate('/id_validation');
          }
        })
        .catch((error) => {
          console.error("Redirect error:", error);
        });
    }, []);
>>>>>>> 1571fdf (commit)

    let navigate= useNavigate();
    const[phonenumber, set_phone_number]=useState("");
    const[otp,set_otp]=useState("");
    const[otp_sent,set_otp_sent]=useState(false);
    const [at_otp, set_at_otp]=useState(false);


<<<<<<< HEAD

=======
    // ✅ fully converted to async/await
    async function react(e) {
      e.preventDefault();
      try {
        const result = await window.confirmationResult.confirm(otp);
        const user = result.user;
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
        const res = await fetch(`http://localhost:3000/isnewuser?identity=${result.user.email}`);
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
>>>>>>> 1571fdf (commit)


     /////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

 
const handle_resend = (e) => {
  e.preventDefault()
  window.confirmationResult = null; 
   phone_login(e);             
  
};






 /////////////////////////////////////////////////////////////////////////////////////////////////////////////////////




function react(e){
  e.preventDefault();
  
    window.confirmationResult.confirm(otp)
      
    
  .then((result) => {
    const user = result.user;

    /// from here we need to enter the results in database


alert("Girl, you did it");

    ///
    console.log("Logged in:", user);
  })
  .catch((error) => {
    alert("Wrong code");
    
  });


 }







 /////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
    

useEffect(() => {
  // Check if auth exists to stop the crash
  if (auth) {
    window.recaptchaVerifier = new RecaptchaVerifier(auth, 'recaptcha-container', {
      'size': 'invisible', 
      'callback': (response) => {
        console.log("reCAPTCHA solved");
      }
    });
  } else {
    console.error("Auth object is undefined. Check your imports!");
  }
}, []);



 /////////////////////////////////////////////////////////////////////////////////////////////////////////////////////



async function signIn() {
  try {
    const result = await signInWithPopup(auth, googleAuthProvider);
    console.log(result.user);
  } catch (error) {
    console.error(error);
  }
}



 /////////////////////////////////////////////////////////////////////////////////////////////////////////////////////


async function phone_login(e){
    e.preventDefault();
    
    //get the phonenumber
let cellnumber;

    if(phonenumber.includes(" ")){
      set_phone_number(phonenumber.replace(/\s/g, ""));
    }
    if(phonenumber.length==10 &&  phonenumber[0]==0){
       cellnumber="+27"+phonenumber.slice(1,phonenumber.length);
      

    }else if(phonenumber.length==9){
         cellnumber="+27"+phonenumber;
    }
    else{
      alert("Enter valid phone number");
      set_phone_number("");
      return;
    }
     
console.log("im here");
    set_at_otp(true);
    console.log("im here");
    // do recaptcha first
   
// this sends otp using the number given by the user

const appVerifier = window.recaptchaVerifier;



  try {
    console.log("i touched here2");
    await appVerifier.render();
    console.log(appVerifier);
    const confirmationResult= await signInWithPhoneNumber(auth, cellnumber, appVerifier);
    if(confirmationResult){
      console.log("I have the conres");
    }
    console.log("i touched here3");
    window.confirmationResult=confirmationResult;
    console.log("i touched here");
    set_otp_sent(true);
    console.log("im also here");
    
  } catch (error) {
    console.log("This part has been bugging me ",error);
  }



// once the user submits this then it will verifu
 
 
 
  
   
}

 /////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//HTML syntax

return (
  <section>
    {/* 1. Loading State */}
    {!otp_sent && at_otp && (
      <h1>Loading...</h1>
    )}

    {/* 2. OTP Input State */}
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

    {/* 3. Initial Phone Login State */}
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


