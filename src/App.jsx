import { BrowserRouter, Routes, Route } from "react-router-dom";
import Validate from './components/id_validation'
import Otp from './components/otp';
import Login from './components/login'
import Welcome from "./components/Welcome.jsx";
import Signin from "./components/Signin.jsx";
import Dashboard from "./components/Dashboard.jsx";
import ClinicSearch from "./components/Clinic_search";
import "./App.css";
<BrowserRouter basename="/QueueCare"></BrowserRouter>

function App() {
  return (
    <BrowserRouter basename="/QueueCare">
      <Routes>
        <Route path="/" element={<Welcome />} />
        <Route path="/signin" element={<login />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/clinic-search" element={<ClinicSearch />} />
        <Route path="/id_validation" element={<Validate/>}/>
        <Route path="/otp" element={<Otp/>}/>
        <Route path="/dashboard" element={<Dashboard/>}/>
      </Routes>
    </BrowserRouter>
  );
}

export default App;