import { BrowserRouter, Routes, Route } from "react-router-dom";
import Welcome from "./components/Welcome.jsx";
import Signup from "./components/Signup.jsx";
import "./App.css";

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Welcome />} />
        <Route path="/signup" element={<Signup />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;