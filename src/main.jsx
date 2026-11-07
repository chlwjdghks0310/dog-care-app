import { StrictMode, lazy, Suspense } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import PrivacyPolicy from './components/PrivacyPolicy.jsx'
import Contact from './screens/Contact.jsx'
import Terms from './components/Terms.jsx'
import { trackAppStart } from './services/analytics'

const StatsPage = lazy(() => import('./components/StatsDashboard.jsx').then((m) => ({ default: m.StatsPage })))

const page = new URLSearchParams(location.search)
// 이용 통계(첫 실행·오늘 사용) — 처리방침·약관·문의만 보러 온 경우는 세지 않는다. 앱이 기록을 쓰기 전에 불러야 첫 실행을 알아본다
if (!['privacy', 'terms', 'support', 'stats'].some((k) => page.has(k))) trackAppStart()

// 아이폰 키보드가 올라오면 보이는 높이만큼만 창을 그린다(11/7: 게시물 수정 중 위가 잘리던 문제)
const vv = window.visualViewport
if (vv) {
  const fit = () => {
    document.documentElement.style.setProperty('--vvh', `${vv.height}px`)
    document.documentElement.style.setProperty('--vvt', `${vv.offsetTop}px`)
    // 키보드가 내려갔는데 문서가 밀려 있으면(아이폰: 하단 탭이 떠 보이고 밑에 빈 공간) 제자리로(11/7)
    if (vv.height >= innerHeight - 2 && scrollY && !document.activeElement?.matches?.('input, textarea, select')) window.scrollTo(0, 0)
  }
  vv.addEventListener('resize', fit)
  vv.addEventListener('scroll', fit)
  fit()
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    {/* 스토어 제출용 공개 주소: ?privacy(개인정보 처리방침), ?terms(이용약관), ?support(문의) — 설치 안 한 사람도 브라우저로 본다. ?stats는 운영자 이용 통계(로그인 필요) */}
    {page.has('stats') ? <Suspense fallback={null}><StatsPage /></Suspense> : page.has('privacy') ? <PrivacyPolicy /> : page.has('terms') ? <Terms /> : page.has('support') ? <Contact /> : <App />}
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
