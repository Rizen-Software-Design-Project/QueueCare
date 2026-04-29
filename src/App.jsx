import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import Welcome          from "./components/Welcome.jsx";
import Dashboard        from "./components/Dashboard.jsx";
import ClinicSearch     from "./components/Clinic_search.jsx";
import Applications     from "./components/Applications.jsx";
import BookAppointment  from "./components/BookAppointment";
import AuthPage         from "./components/AuthPage.jsx";
import ProfileSetupPage from "./components/ProfileSetupPage.jsx";
import StaffDashboard from "./components/StaffDashboard";
import Walkin from "./components/Walkin.jsx";
import "./App.css";


function App() {
  return (
    <BrowserRouter>  {/* remove basename if you want to deploy to azure */}
      <Routes>
        <Route path="/"              element={<Welcome />} />
        <Route path="/signin"        element={<AuthPage />} />
        <Route path="/profile-setup" element={<ProfileSetupPage />} />
        <Route path="/dashboard"     element={<Dashboard />} />
        <Route path="/clinic-search" element={<ClinicSearch />} />
        <Route path="/applications"  element={<Applications />} />
        <Route path="/clinic"        element={<BookAppointment />} />
        <Route path="*"              element={<Navigate to="/" replace />} />
        <Route path="/staff-dashboard" element={<StaffDashboard />} />
        <Route path="/walk-in"        element={<WalkIn />} />



      </Routes>
    </BrowserRouter>
  );
}

export default App;
