import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)

// 스플래시(index.html)는 앱이 준비된 뒤에도 1초 더 보여 주고 서서히 사라진다(로딩이 길어도 바로 끊기지 않게)
const splash = document.getElementById('splash')
setTimeout(() => {
  splash?.classList.add('hide')
  setTimeout(() => splash?.remove(), 400)
}, 1000)

// 아이폰은 입력칸에 키보드가 올라오면 문서 전체를 위로 밀었다가 내려가도 그대로 둘 때가 있다 → 키보드가 닫히면 제자리로
document.addEventListener("focusout", () =>
  setTimeout(() => {
    if (!document.activeElement?.matches?.("input, textarea, select")) window.scrollTo(0, 0);
  }, 100)
);
