import { BrowserRouter, Routes, Route } from "react-router-dom";
import Welcome from "./components/Welcome.jsx";
import Signup from "./components/Signup.jsx";
import Login from "./components/Login.jsx";
import "./App.css";
<BrowserRouter basename="/QueueCare"></BrowserRouter>

function App() {
  return (
    <BrowserRouter basename="/QueueCare">
      <Routes>
        <Route path="/" element={<Welcome />} />
        <Route path="/signup" element={<Signup />} />
        <Route path="/login" element={<Login />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;