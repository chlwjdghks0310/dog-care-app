import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)

// 스플래시(index.html)는 앱이 뜬 뒤 최소 1.2초 보여 주고 서서히 사라진다
const splash = document.getElementById('splash')
setTimeout(() => {
  splash?.classList.add('hide')
  setTimeout(() => splash?.remove(), 400)
}, Math.max(0, 1200 - performance.now()))
