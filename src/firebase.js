// MUST BE FIRST
self.FIREBASE_APPCHECK_DEBUG_TOKEN = true; 

import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
// ADD THESE TWO IMPORTS
import { initializeAppCheck, ReCaptchaEnterpriseProvider } from "firebase/app-check";

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
const analytics = getAnalytics(app);
const auth = getAuth(app);
const googleAuthProvider = new GoogleAuthProvider();

// INITIALIZE APP CHECK HERE
// Use your SITE KEY (starts with 6L...)
if (typeof window !== "undefined") {
  initializeAppCheck(app, {
    provider: new ReCaptchaEnterpriseProvider('6LevZK0sAAAAAFp8P8cD3czJhKuMESnrwoomhnKr'), 
    isTokenAutoRefreshEnabled: true
  });
}

export { auth, googleAuthProvider };