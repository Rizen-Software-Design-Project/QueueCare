import { BrowserRouter, Routes, Route } from "react-router-dom";
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
        <Route path="/signin" element={<Signin />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/clinic-search" element={<ClinicSearch />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
