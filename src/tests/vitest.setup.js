import "@testing-library/jest-dom";
import { connectAuthEmulator } from "firebase/auth";
import { auth } from "../firebase";

connectAuthEmulator(auth, "http://127.0.0.1:9099", { disableWarnings: true });