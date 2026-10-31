import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import PrivacyPolicy from './components/PrivacyPolicy.jsx'
import Contact from './screens/Contact.jsx'
import Terms from './components/Terms.jsx'

const page = new URLSearchParams(location.search)

createRoot(document.getElementById('root')).render(
  <StrictMode>
    {/* 스토어 제출용 공개 주소: ?privacy(개인정보 처리방침), ?terms(이용약관), ?support(문의) — 설치 안 한 사람도 브라우저로 본다 */}
    {page.has('privacy') ? <PrivacyPolicy /> : page.has('terms') ? <Terms /> : page.has('support') ? <Contact /> : <App />}
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
