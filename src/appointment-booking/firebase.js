

import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
import { getAuth, GoogleAuthProvider } from "firebase/auth";

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
export { auth, googleAuthProvider };