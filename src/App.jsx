import { BrowserRouter, Routes, Route } from "react-router-dom";
import Welcome from "./components/Welcome.jsx";
import Signin from "./components/Signin.jsx";
import Dashboard from "./components/Dashboard.jsx";
import ClinicSearch from "./components/Clinic_search.jsx";
import Applications from "./components/Applications.jsx";
import "./App.css";

function App() {
  return (
    <BrowserRouter basename="/QueueCare">  {/* remove basename if you want to deploy to azure */}
      <Routes>
        <Route path="/" element={<Welcome />} />
        <Route path="/signin" element={<Signin />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/clinic-search" element={<ClinicSearch />} />
        <Route path="/applications" element={<Applications />} />


      </Routes>
    </BrowserRouter>
  );
}

export default App;
