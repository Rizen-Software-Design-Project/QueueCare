import { useState } from 'react'
import reactLogo from './assets/react.svg'
import viteLogo from './assets/vite.svg'
import heroImg from './assets/hero.png'
import Login from './components/login'
import { BrowserRouter,Routes,Route } from 'react-router-dom'
import './App.css'

function App() {
  

  return (
    <BrowserRouter>
    <Routes>

      <Route path="/" element={<Login/>}/>
    </Routes>
      
        
      
    </BrowserRouter>
  )
}

export default App
