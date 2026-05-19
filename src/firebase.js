// Firebase handles logins for this app — Google sign-in, phone OTP, etc.
// These are the settings that connect our app to our specific Firebase project.

import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
// ReCaptchaEnterpriseProvider is imported in case we ever turn on App Check (bot protection)
import { ReCaptchaEnterpriseProvider } from "firebase/app-check";

const firebaseConfig = {
  apiKey: "AIzaSyAiCEmBwTJx30M2k6IoaI3SSMgstajNoyc",
  authDomain: "sd-2026-29de1.firebaseapp.com",
  projectId: "sd-2026-29de1",
  storageBucket: "sd-2026-29de1.firebasestorage.app",
  messagingSenderId: "301551112555",
  appId: "1:301551112555:web:cceb3e69d19a4ff9123c2e",
  measurementId: "G-CM2FW3MBY0"
};

  

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const googleAuthProvider = new GoogleAuthProvider();

// App Check is turned off for now — it adds bot protection but needs extra setup.
// To enable it, uncomment the block below and replace the site key with yours.
/**if (typeof window !== "undefined") {
  initializeAppCheck(app, {
    provider: new ReCaptchaEnterpriseProvider('6LevZK0sAAAAAFp8P8cD3czJhKuMESnrwoomhnKr'), 
    isTokenAutoRefreshEnabled: true
  });
}**/

export { auth, googleAuthProvider };