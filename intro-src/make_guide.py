# 멍케어 사용 설명서 만들기: python3 intro-src/make_guide.py → public/intro/guide/index.html
# 내용은 guide_content.py. 화면 모양은 public/intro/guide.css, 움직임은 public/intro/guide.js
import os, sys
sys.path.insert(0, os.path.dirname(__file__))
from guide_content import SECTIONS, DOGS

ROOT = os.path.join(os.path.dirname(__file__), "..", "public", "intro", "guide")
icon = lambda name, cls="ic": f'<svg class="{cls}" aria-hidden="true"><use href="/intro/sprite.svg#i-{name}"/></svg>'

def block(b):
    kind = b[0]
    if kind == "p": return f'<p>{b[1]}</p>'
    if kind == "steps": return '<ol class="g-steps">' + "".join(f'<li>{x}</li>' for x in b[1]) + '</ol>'
    if kind == "ex": return '<div class="g-ex"><p class="g-ex-label">이렇게 물어보세요</p>' + "".join(f'<span>“{x}”</span>' for x in b[1]) + '</div>'
    if kind == "tip": return f'<p class="g-tip">{icon("sparkles")}<span><b>알아 두면 좋아요</b> {b[1]}</span></p>'
    if kind == "note": return f'<p class="g-note">{icon("lock")}<span>{b[1]}</span></p>'
    if kind == "table": return '<dl class="g-table">' + "".join(f'<div><dt>{a}</dt><dd>{c}</dd></div>' for a, c in b[1]) + '</dl>'
    if kind == "img": return f'<figure class="g-shot"><img src="/intro/img/{b[1]}" alt="{b[2]}" width="300" height="649" loading="lazy" /><figcaption>{b[2]}</figcaption></figure>'
    if kind == "dogs":
        return '<div class="g-dogs">' + "".join(
            f'<div class="g-dog"><img src="/intro/img/dog-{f}.png" alt="{breed} {name}" width="120" height="120" loading="lazy" /><p class="g-dog-name">{name} <span>{breed}</span></p><p class="g-dog-role">{role}</p><p>{desc}</p></div>'
            for f, name, breed, role, desc in DOGS) + '</div>'
    raise ValueError(kind)

cards = "".join(
    f'<a class="g-card" href="#{s["id"]}">{icon(s["icon"], "ic g-card-ic")}<b>{s["title"]}</b><span>{s["short"]}</span>{icon("chev", "ic g-card-go")}</a>'
    for s in SECTIONS)
side = "".join(
    f'<li><a class="g-side-sec" href="#{s["id"]}">{icon(s["icon"])}{s["title"]}</a><ul>' + "".join(f'<li><a href="#{qid}">{q}</a></li>' for qid, q, _ in s["qs"]) + '</ul></li>'
    for s in SECTIONS)
chips = "".join(f'<a href="#{s["id"]}">{s["title"]}</a>' for s in SECTIONS)

secs = ""
for n, s in enumerate(SECTIONS):
    qlist = "".join(f'<a href="#{qid}">{q}{icon("chev")}</a>' for qid, q, _ in s["qs"])
    body = "".join(
        f'<article class="g-q" id="{qid}"><h3>{q}</h3>{"".join(block(b) for b in blocks)}</article>'
        for qid, q, blocks in s["qs"])
    hero_img = f'<figure class="g-sec-shot"><img src="/intro/img/{s["img"][0]}" alt="{s["img"][1]}" width="300" height="649" loading="lazy" /><figcaption>예시 화면</figcaption></figure>' if s.get("img") else ""
    nxt = SECTIONS[n + 1] if n + 1 < len(SECTIONS) else None
    nav = (f'<a class="g-next" href="#{nxt["id"]}"><span>다음</span><b>{nxt["title"]}</b>{icon("chev")}</a>' if nxt
           else '<a class="g-next" href="/"><span>다 읽었어요!</span><b>멍케어 시작하기</b>' + icon("chev") + '</a>')
    secs += f'''
      <section class="g-sec" id="{s["id"]}" aria-labelledby="{s["id"]}-t">
        <header class="g-sec-head">
          <div>
            <p class="g-sec-num">{n + 1:02d}</p>
            <h2 id="{s["id"]}-t">{icon(s["icon"])}{s["title"]}</h2>
            <p class="g-sum">{s["summary"]}</p>
            <nav class="g-qlist" aria-label="{s["title"]}에서 궁금한 것">{qlist}</nav>
          </div>
          {hero_img}
        </header>
        {body}
        {nav}
      </section>'''

html = f'''<!doctype html>
<html lang="ko">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
  <title>멍케어 사용 설명서</title>
  <meta name="description" content="멍케어를 처음 쓰는 분을 위한 쉬운 사용 설명서. 설치, 비서, 체크리스트, 프로필, 일정표, 가계부를 하나씩 알려 드려요." />
  <meta http-equiv="Content-Security-Policy" content="default-src 'self'; script-src 'self'; style-src 'self' https://cdn.jsdelivr.net; font-src https://cdn.jsdelivr.net; img-src 'self' data:; connect-src 'self'; base-uri 'self'; form-action 'self'" />
  <meta name="referrer" content="strict-origin-when-cross-origin" />
  <meta name="theme-color" content="#ffffff" />
  <meta name="color-scheme" content="light only" />
  <link rel="canonical" href="https://dog-care-app-1.onrender.com/intro/guide/" />
  <meta property="og:title" content="멍케어 사용 설명서" />
  <meta property="og:description" content="처음 쓰는 분도 쉽게 — 설치부터 비서·체크리스트·프로필·일정표·가계부까지." />
  <meta property="og:image" content="https://dog-care-app-1.onrender.com/intro/img/og-2x1.png?v=2" />
  <link rel="icon" href="/favicon.ico?v=6" sizes="any" />
  <link rel="apple-touch-icon" href="/icon-180.png?v=6" />
  <link rel="preconnect" href="https://cdn.jsdelivr.net" crossorigin />
  <link rel="stylesheet" href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/variable/pretendardvariable-dynamic-subset.min.css" />
  <link rel="stylesheet" href="/intro/intro.css?v=6" />
  <link rel="stylesheet" href="/intro/guide.css?v=2" />
</head>
<body class="guide">
  <a class="skip" href="#g-main">본문으로 건너뛰기</a>
  <header class="top">
    <div class="wrap top-in">
      <a class="brand" href="/intro/" aria-label="멍케어 소개로">
        <img src="/icon-192.png?v=6" alt="" width="32" height="32" />
        <span>멍케어 <small>사용 설명서</small></span>
      </a>
      <a class="btn btn-sm btn-ghost g-back" href="/intro/">소개로</a>
      <a class="btn btn-sm" href="/">시작하기</a>
    </div>
    <nav class="g-chips" aria-label="설명서 차례">{chips}</nav>
  </header>

  <main id="g-main">
    <section class="g-hero">
      <div class="wrap">
        <p class="eyebrow">{icon("book")} 처음 쓰는 분을 위한</p>
        <h1 class="g-title">멍케어 <mark>사용 설명서</mark></h1>
        <p class="g-lead">궁금한 걸 눌러 보세요. 하나씩, 쉽게 알려 드릴게요.</p>
        <div class="g-cards">{cards}</div>
      </div>
    </section>

    <div class="wrap g-layout">
      <aside class="g-side" aria-label="설명서 목차"><p class="g-side-title">목차</p><ul>{side}</ul></aside>
      <div class="g-content">{secs}
        <p class="g-more">더 궁금한 건 <a href="/intro/#faq">자주 묻는 질문</a>을 보거나 <a href="mailto:meongcare.app@gmail.com">meongcare.app@gmail.com</a>으로 물어보세요.</p>
      </div>
    </div>
  </main>

  <a class="g-top" href="#g-main" aria-label="맨 위로">{icon("up")}</a>

  <footer class="foot">
    <div class="wrap foot-in">
      <div>
        <p class="brand foot-brand"><img src="/icon-192.png?v=6" alt="" width="24" height="24" loading="lazy" /> 멍케어</p>
        <p>운영: 멍케어(대표 최정환)<br />문의: <a href="mailto:meongcare.app@gmail.com">meongcare.app@gmail.com</a></p>
        <p class="disclaimer">멍케어는 보호자가 기록·일정·정보를 편하게 챙기도록 돕는 비서 서비스예요. 진료(진찰·진단·처방·치료)를 하지 않으며, 수의사의 진료를 대신하지 않아요.</p>
      </div>
      <nav class="foot-links" aria-label="정책·문의"><a href="/intro/">소개</a><a href="/">앱 열기</a><a href="/?support">문의하기</a><a href="/?privacy">개인정보 처리방침</a></nav>
    </div>
  </footer>
  <script src="/intro/guide.js?v=1" defer></script>
</body>
</html>
'''
os.makedirs(ROOT, exist_ok=True)
with open(os.path.join(ROOT, "index.html"), "w", encoding="utf-8") as f:
    f.write(html)
print("ok", sum(len(s["qs"]) for s in SECTIONS), "questions")
