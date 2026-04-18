import { BrowserRouter, Routes, Route } from "react-router-dom";
import Welcome from "./components/Welcome.jsx";
import Signin from "./components/Signin.jsx";
import Dashboard from "./components/Dashboard.jsx";
import ClinicSearch from "./components/Clinic_search.jsx";
import Applications from "./components/Applications.jsx";
import BookAppointment from "./components/BookAppointment";
import StaffDashboard from "./components/StaffDashboard";
import "./App.css";


function App() {
  return (
    <BrowserRouter>  {/* remove basename if you want to deploy to azure */}
      <Routes>
        <Route path="/" element={<Welcome />} />
        <Route path="/signin" element={<Signin />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/clinic-search" element={<ClinicSearch />} />
        <Route path="/applications" element={<Applications />} />
        <Route path="/clinic" element={<BookAppointment />} />
        <Route path="/staff-dashboard" element={<StaffDashboard />} />


      </Routes>
    </BrowserRouter>
  );
}

export default App;
