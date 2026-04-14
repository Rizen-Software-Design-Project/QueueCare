import { BrowserRouter, Routes, Route } from "react-router-dom";
import Validate from "./components/id_validation";
import Otp from "./components/otp";
import Login from "./components/login";
import Welcome from "./components/Welcome.jsx";
import Signin from "./components/Signin.jsx";
import Dashboard from "./components/Dashboard.jsx";
import ClinicSearch from "./components/Clinic_search.jsx";
import "./App.css";

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Welcome />} />
        <Route path="/signin" element={<Login />} />
        <Route path="/login" element={<Login />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/clinic-search" element={<ClinicSearch />} />
        <Route path="/id_validation" element={<Validate />} />
        <Route path="/otp" element={<Otp />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
