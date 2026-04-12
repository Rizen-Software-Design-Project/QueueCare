import Login from './components/login'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import Validate from './components/id_validation'
import Dashboard from './components/dashboard'
import Otp from './components/otp'
import './App.css'

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Login/>}/>
        <Route path="/id_validation" element={<Validate/>}/>
        <Route path="/otp" element={<Otp/>}/>
        <Route path="/dashboard" element={<Dashboard/>}/>
      </Routes>
    </BrowserRouter>
  )
}

export default App;