import { useState } from "react";
import { STOOL_COLORS, STOOL_SIGNS, CHECK_ITEMS, CHECK_LEVELS, stoolFromScore } from "../services/records";

// 변 체크·컨디션 체크 — 보호자가 직접 고르는 칸(기록 고치기·변 체크·컨디션 체크 화면이 같이 쓴다).
// 고른 값은 onChange(바뀐 칸만)로 올려 보내고, 병원 안내 문구(flags)는 부모가 healthRules로 계산해 내려 준다.

// 모양 1~7: 그림은 직접 그린 단순한 모양(점·통나무·덩어리·물웅덩이)
const SHAPES = [
  { n: 1, label: "아주 딱딱한 알갱이", desc: "하나씩 떨어진 딱딱한 알갱이", art: <><circle cx="8" cy="15" r="4" /><circle cx="19" cy="10" r="4" /><circle cx="30" cy="15" r="4" /><circle cx="19" cy="19" r="3.5" /></> },
  { n: 2, label: "단단하고 마디 있음", desc: "마디가 보이고 집어도 모양 그대로", art: <><ellipse cx="10" cy="13" rx="7" ry="6" /><ellipse cx="20" cy="12" rx="7" ry="6" /><ellipse cx="30" cy="13" rx="7" ry="6" /></> },
  { n: 3, label: "촉촉한 통나무 모양", desc: "겉이 촉촉하고 금이 조금, 집으면 자국이 남음", art: <><rect x="2" y="6" width="36" height="12" rx="6" /><path d="M13 6v4M21 18v-4M28 6v3" stroke="var(--surface)" strokeWidth="1.6" /></> },
  { n: 4, label: "아주 촉촉한 통나무", desc: "모양은 있지만 집으면 바닥에 묻어남", art: <rect x="2" y="7" width="36" height="10" rx="5" /> },
  { n: 5, label: "무른 덩어리", desc: "모양이 있는 무른 덩어리, 집으면 흩어짐", art: <><ellipse cx="9" cy="14" rx="7" ry="5" /><ellipse cx="22" cy="12" rx="6" ry="5" /><ellipse cx="33" cy="15" rx="5" ry="4" /></> },
  { n: 6, label: "형태가 거의 없음", desc: "쌓인 모양은 있지만 형태가 없음", art: <><ellipse cx="20" cy="17" rx="17" ry="5" /><ellipse cx="18" cy="12" rx="9" ry="5" opacity=".8" /></> },
  { n: 7, label: "물 같음", desc: "덩어리 없이 물처럼 흐름", art: <><ellipse cx="20" cy="18" rx="18" ry="4" opacity=".6" /><path d="M12 4c2 3 3 5 0 6.5C9 9 10 7 12 4ZM27 6c2 3 3 5 0 6.5C24 11 25 9 27 6Z" /></> },
];

function Chips({ options, on, onTap, label }) {
  return (
    <div className="chip-wrap" role="group" aria-label={label}>
      {options.map((o) => (
        <button key={o} type="button" className={`seg${on(o) ? " on" : ""}`} aria-pressed={on(o)} onClick={() => onTap(o)}>
          {o}
        </button>
      ))}
    </div>
  );
}

export function FlagBox({ flags }) {
  return (
    <div aria-live="polite">
      {flags.length > 0 && (
        <div className="pc-flags" style={{ marginBottom: 14 }}>
          <b>병원에 연락해 보면 좋은 신호</b>
          {flags.map((f) => <div key={f}>• {f}</div>)}
          <div className="faint" style={{ marginTop: 4 }}>고른 내용으로만 알려 드리는 안내예요. 진단이 아니에요.</div>
        </div>
      )}
    </div>
  );
}

export function StoolCheck({ data, onChange, flags }) {
  const signs = data.stoolSigns || [];
  function pickScore(n) {
    if (data.stoolScore === n) return onChange({ stoolScore: undefined });
    // 점수를 고르면 대변 칸도 맞춰 둔다(피 섞임은 그대로 두기). 대변 칸은 보호자가 다시 바꿀 수 있다.
    onChange({ stoolScore: n, ...(data.stool === "피 섞임" ? {} : { stool: stoolFromScore(n) }) });
  }
  return (
    <>
      <div className="field">
        <label id="sc-shape">변 모양 (1 딱딱함 ~ 7 물 같음 · 2가 가장 좋아요)</label>
        <StoolPhotos />
        <div className="sc-list" role="group" aria-labelledby="sc-shape">
          {SHAPES.map((s) => (
            <button key={s.n} type="button" className={`sc-row${data.stoolScore === s.n ? " on" : ""}`} aria-pressed={data.stoolScore === s.n} onClick={() => pickScore(s.n)}>
              <svg className="sc-art" viewBox="0 0 40 24" aria-hidden="true" fill="currentColor">{s.art}</svg>
              <span className="sc-num">{s.n}</span>
              <span className="sc-text">
                <b>{s.label}</b>
                <span>{s.desc}</span>
              </span>
            </button>
          ))}
        </div>
      </div>
      <div className="field">
        <label>색</label>
        <Chips label="변 색" options={STOOL_COLORS} on={(o) => data.stoolColor === o} onTap={(o) => onChange({ stoolColor: data.stoolColor === o ? undefined : o })} />
      </div>
      <div className="field">
        <label>보이는 것 (있으면 눌러 주세요)</label>
        <Chips label="변에 보이는 것" options={STOOL_SIGNS} on={(o) => signs.includes(o)} onTap={(o) => onChange({ stoolSigns: signs.includes(o) ? signs.filter((x) => x !== o) : [...signs, o] })} />
      </div>
      <FlagBox flags={flags} />
    </>
  );
}

export function ConditionCheck({ check = {}, onChange, flags }) {
  return (
    <>
      {CHECK_ITEMS.map((it) => (
        <div key={it.key} className="field">
          <label id={`ck-${it.key}`}>{it.label}</label>
          <div className="ck-row" role="group" aria-labelledby={`ck-${it.key}`}>
            {CHECK_LEVELS.map((lv, i) => {
              const on = check[it.key] === lv;
              return (
                <button key={lv} type="button" className={`seg ck-seg${on ? ` on lv${i}` : ""}`} aria-pressed={on} onClick={() => {
                    const next = { ...check, [it.key]: lv };
                    if (on) delete next[it.key]; // 한 번 더 누르면 해제
                    onChange(next);
                  }}>
                  {lv}
                </button>
              );
            })}
          </div>
        </div>
      ))}
      <FlagBox flags={flags} />
    </>
  );
}

// 실제 사진 1~5점(위키미디어, 자료용 11/7 — 단계는 자료용이 사진을 보고 매김, 수의사 검수 없음). 6·7점(설사·물 변)은 쓸 수 있는 사진이 없어 그림만.
// 사람용 브리스톨 척도는 기준이 달라 안 씀. 크기만 줄이고(자르기·보정 없음) 메타데이터를 지웠다.
// 처음엔 접어 둔다(보기 싫은 사람 배려). 출처는 public/licenses.txt에도
const PHOTOS = [
  { src: "/img/stool/score-1-photo-b.jpg", n: 1, credit: "사진: Geoprofi Lars / Wikimedia Commons, CC BY-SA 4.0" },
  { src: "/img/stool/score-2-photo-a.jpg", n: 2, credit: "사진: Kulmalukko / Wikimedia Commons (퍼블릭 도메인)" },
  { src: "/img/stool/score-3-photo.jpg", n: 3, credit: "사진: BrokenSphere / Wikimedia Commons, CC BY 3.0" },
  { src: "/img/stool/score-4-photo-a.jpg", n: 4, credit: "사진: Geoprofi Lars / Wikimedia Commons, CC BY-SA 4.0" },
  { src: "/img/stool/score-5-photo-a.jpg", n: 5, credit: "사진: Atamari / Wikimedia Commons, CC BY-SA 3.0" },
];
function StoolPhotos() {
  const [open, setOpen] = useState(false);
  return (
    <div className="sc-photos">
      <button type="button" className="link-btn" style={{ margin: "0 0 6px" }} aria-expanded={open} onClick={() => setOpen((v) => !v)}>
        실제 사진으로 보기(1~5) {open ? "▴" : "▾"}
      </button>
      {open && (
        <div className="sc-photo-row">
          {PHOTOS.map((ph) => (
            <figure key={ph.src}>
              <img src={ph.src} alt={`${ph.n}점 예시: ${SHAPES[ph.n - 1].label}`} width="240" height="180" loading="lazy" />
              <figcaption><b>{ph.n}점</b> {SHAPES[ph.n - 1].label}<small>{ph.credit}</small></figcaption>
            </figure>
          ))}
          <p className="faint" style={{ gridColumn: "1 / -1", margin: 0, fontSize: 12 }}>6·7(설사·물 같은 변)은 아래 그림으로 봐 주세요. 길에서 찍은 사진이라 마르거나 젖었을 수 있어요.</p>
        </div>
      )}
    </div>
  );
}
