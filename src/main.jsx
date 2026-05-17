import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import QueueCarePolicy from './ServicePolicy.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <QueueCarePolicy />
  </StrictMode>,
)
