import { useEffect, useRef, useState } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { acceptPoint, simplify, pace, fmtKm, fmtTime, MAX_ACCURACY_M } from "../utils/geo";
import { getWalks, saveWalk, deleteWalk, newWalkId } from "../services/walks";
import { localNow, md, STOOL, URINE } from "../services/records";
import { readJSON, writeJSON } from "../services/storage";
import { toDateKey, addDays } from "../utils/date";
import { josa } from "../utils/text";

// 산책(나이키 런 클럽 흐름 참고): 대기(시작 버튼·GPS 상태·이번 주 기록) → 진행 중(큰 거리·시간·페이스, 지도, 💩/💧 표시)
// → 일시정지(지금까지 코스) → 종료 요약(코스 지도·기록, 배변 상태) → 저장하면 건강 수치 "산책(분)"·배변 기록에도 남는다.
// ponytail: 아이폰 웹앱은 화면이 꺼지거나 앱을 내리면 GPS가 멈춘다 → 화면 켜 두기(Wake Lock)로 막고, 돌아오면 그 사이는 직선으로 잇는다(너무 빠르면 버림)
const ACTIVE_KEY = "dogcare-walk-active-v1"; // 진행 중인 산책(앱이 꺼져도 이어서). 서버에 안 올림
const PREP = ["목줄·인식표", "배변봉투", "물·물그릇"];

export default function Walk({ dog, onBack }) {
  const saved = readJSON(ACTIVE_KEY, null);
  const resume = saved?.dogId === dog.id ? saved : null;
  const [phase, setPhase] = useState(resume ? "paused" : "idle"); // idle | active | paused | summary | view
  const [, setTick] = useState(0);
  const [gps, setGps] = useState(null); // 마지막 위치 {lat,lng,accuracy} | { error }
  const [walks, setWalks] = useState(() => getWalks(dog.id));
  const [viewing, setViewing] = useState(null);
  const [stool, setStool] = useState("정상");
  const [urine, setUrine] = useState("정상");
  const [memo, setMemo] = useState("");
  const tr = useRef(resume ? { ...resume, last: null } : null); // 진행 중 기록
  const watchRef = useRef(null);
  const wakeRef = useRef(null);

  // 화면에 있는 동안 위치를 계속 받는다(대기 중엔 GPS 준비·정확도 표시용)
  useEffect(() => {
    if (!navigator.geolocation) return setGps({ error: "이 기기에서는 위치를 쓸 수 없어요." });
    watchRef.current = navigator.geolocation.watchPosition(
      (pos) => onPosition({ lat: pos.coords.latitude, lng: pos.coords.longitude, accuracy: pos.coords.accuracy, t: pos.timestamp || Date.now() }),
      (err) => setGps({ error: err.code === 1 ? "위치 권한을 허용해 주세요(설정 → 개인정보 보호 → 위치 서비스)." : "GPS 신호를 찾는 중이에요. 밖으로 나가 주세요." }),
      { enableHighAccuracy: true, maximumAge: 0, timeout: 20000 }
    );
    const timer = setInterval(() => setTick((n) => n + 1), 1000);
    return () => {
      navigator.geolocation.clearWatch(watchRef.current);
      clearInterval(timer);
      releaseWake();
    };
  }, []);

  function onPosition(p) {
    setGps(p);
    const t = tr.current;
    if (!t || t.phase !== "active") return;
    const { ok, step } = acceptPoint(t.last, p);
    if (!ok) return;
    t.segments[t.segments.length - 1].push({ lat: p.lat, lng: p.lng });
    t.distance += step;
    t.last = p;
    persist();
  }

  const persist = () => {
    const t = tr.current;
    if (t) writeJSON(ACTIVE_KEY, { dogId: dog.id, startedAt: t.startedAt, segments: t.segments, distance: t.distance, activeMs: t.activeMs, marks: t.marks, phase: "paused" });
  };
  const elapsedSec = () => {
    const t = tr.current;
    if (!t) return 0;
    return (t.activeMs + (t.phase === "active" ? Date.now() - t.segStart : 0)) / 1000;
  };

  async function keepAwake() {
    try {
      wakeRef.current = await navigator.wakeLock?.request("screen");
    } catch {}
  }
  function releaseWake() {
    wakeRef.current?.release?.().catch?.(() => {});
    wakeRef.current = null;
  }
  // 앱으로 돌아오면 화면 켜 두기를 다시 건다(아이폰은 앱을 내리면 풀린다)
  useEffect(() => {
    const on = () => document.visibilityState === "visible" && tr.current?.phase === "active" && keepAwake();
    document.addEventListener("visibilitychange", on);
    return () => document.removeEventListener("visibilitychange", on);
  }, []);

  function start() {
    tr.current = { startedAt: localNow(), segments: [[]], distance: 0, activeMs: 0, marks: [], last: null, phase: "active", segStart: Date.now() };
    setPhase("active");
    keepAwake();
    persist();
  }
  function pause() {
    const t = tr.current;
    t.activeMs += Date.now() - t.segStart;
    t.phase = "paused";
    persist();
    setPhase("paused");
  }
  function resumeWalk() {
    const t = tr.current;
    t.phase = "active";
    t.segStart = Date.now();
    t.last = null; // 쉬는 동안 움직인 건 거리로 치지 않고 새 구간으로
    t.segments.push([]);
    keepAwake();
    setPhase("active");
  }
  function end() {
    const t = tr.current;
    if (t.phase === "active") t.activeMs += Date.now() - t.segStart;
    t.phase = "ended";
    releaseWake();
    setPhase("summary");
  }
  function mark(type) {
    const t = tr.current;
    const p = gps?.lat ? gps : t.last;
    t.marks.push({ type, lat: p?.lat ?? null, lng: p?.lng ?? null, at: localNow() });
    persist();
    setTick((n) => n + 1);
  }
  function finishSave() {
    const t = tr.current;
    const walk = {
      id: newWalkId(),
      startedAt: t.startedAt,
      durationSec: Math.round(t.activeMs / 1000),
      distanceM: Math.round(t.distance),
      route: t.segments.filter((s) => s.length).map((s) => simplify(s)),
      marks: t.marks,
      memo: memo.trim(),
    };
    const has = (type) => t.marks.some((m) => m.type === type);
    saveWalk(dog.id, walk, { stool: has("poop") ? stool : "", urine: has("pee") ? urine : "" });
    clearActive();
    setWalks(getWalks(dog.id));
    setViewing(walk);
    setPhase("view");
  }
  function discard() {
    if (!window.confirm("이번 산책을 저장하지 않을까요? 기록이 사라져요.")) return;
    clearActive();
    setPhase("idle");
  }
  function clearActive() {
    writeJSON(ACTIVE_KEY, null);
    tr.current = null;
    setMemo("");
  }

  const t = tr.current;
  const count = (type) => t?.marks.filter((m) => m.type === type).length || 0;

  // ── 진행 중 / 일시정지 ──
  if (phase === "active" || phase === "paused") {
    const sec = elapsedSec();
    return (
      <div className="screen walk-run">
        <RouteMap segments={t.segments} marks={t.marks} current={gps?.lat ? gps : null} follow={phase === "active"} height={230} />
        {phase === "paused" && <div className="walk-paused">일시정지됨{resume && t === tr.current && !t.segStart ? " · 앱을 다시 열어 이어서 할 수 있어요" : ""}</div>}
        <div className="walk-big">
          {fmtKm(t.distance)}
          <span>km</span>
        </div>
        <div className="walk-stats">
          <div>
            <b>{fmtTime(sec)}</b>
            <span>시간</span>
          </div>
          <div>
            <b>{pace(t.distance, sec)}</b>
            <span>페이스(/km)</span>
          </div>
          <div>
            <b>{gps?.accuracy ? `±${Math.round(gps.accuracy)}m` : "-"}</b>
            <span>GPS</span>
          </div>
        </div>
        <div className="walk-marks">
          <button type="button" onClick={() => mark("poop")}>
            💩 대변 <b>{count("poop")}</b>
          </button>
          <button type="button" onClick={() => mark("pee")}>
            💧 소변 <b>{count("pee")}</b>
          </button>
        </div>
        {gps?.error && <p className="error-text" style={{ textAlign: "center" }}>{gps.error}</p>}
        <div className="walk-controls">
          {phase === "active" ? (
            <button type="button" className="walk-circle pause" onClick={pause} aria-label="일시정지">
              ❚❚
            </button>
          ) : (
            <>
              <button type="button" className="walk-circle stop" onClick={end} aria-label="산책 끝내기">
                ■
              </button>
              <button type="button" className="walk-circle go" onClick={resumeWalk} aria-label="계속하기">
                ▶
              </button>
            </>
          )}
        </div>
        <p className="faint" style={{ textAlign: "center", margin: "6px 0 0" }}>
          {phase === "active" ? "산책 중엔 화면을 켜 두세요 · 앱을 내리면 GPS가 멈출 수 있어요" : "■ 끝내기 · ▶ 계속하기"}
        </p>
      </div>
    );
  }

  // ── 끝낸 직후 요약 ──
  if (phase === "summary") {
    const sec = t.activeMs / 1000;
    return (
      <div className="screen">
        <div className="h1" style={{ marginBottom: 4 }}>산책 끝! 🐾</div>
        <p className="faint" style={{ marginTop: 0 }}>{md(t.startedAt.slice(0, 10))} {t.startedAt.slice(11)} 시작</p>
        <RouteMap segments={t.segments} marks={t.marks} height={240} fit />
        <WalkStats distance={t.distance} sec={sec} poop={count("poop")} pee={count("pee")} />
        {count("poop") > 0 && <Chips label="💩 대변 상태" options={STOOL.filter((x) => x !== "안 봄")} value={stool} onChange={setStool} />}
        {count("pee") > 0 && <Chips label="💧 소변 상태" options={URINE.filter((x) => x !== "안 봄")} value={urine} onChange={setUrine} />}
        <div className="field" style={{ marginTop: 12 }}>
          <label>메모 (선택)</label>
          <input value={memo} maxLength={200} onChange={(e) => setMemo(e.target.value)} placeholder="예: 공원 한 바퀴, 다른 강아지랑 놀았어요" />
        </div>
        <button type="button" className="btn-primary" onClick={finishSave} disabled={t.distance < 1 && sec < 30}>
          저장하기
        </button>
        <button type="button" className="btn-ghost" style={{ width: "100%", marginTop: 8 }} onClick={discard}>
          저장하지 않기
        </button>
        <p className="faint" style={{ marginTop: 8 }}>저장하면 건강 수치의 산책 시간{count("poop") || count("pee") ? "과 배변·배뇨 기록" : ""}에도 함께 남아요.</p>
      </div>
    );
  }

  // ── 지난 산책 보기 ──
  if (phase === "view" && viewing) {
    return (
      <div className="screen">
        <button className="btn-ghost" style={{ marginBottom: 12 }} onClick={() => setPhase("idle")}>
          ← 산책
        </button>
        <div className="h1" style={{ marginBottom: 4 }}>{md(viewing.startedAt.slice(0, 10))} 산책</div>
        <p className="faint" style={{ marginTop: 0 }}>{viewing.startedAt.slice(11)} 시작{viewing.memo ? ` · ${viewing.memo}` : ""}</p>
        <RouteMap segments={viewing.route} marks={viewing.marks} height={260} fit />
        <WalkStats distance={viewing.distanceM} sec={viewing.durationSec} poop={viewing.marks.filter((m) => m.type === "poop").length} pee={viewing.marks.filter((m) => m.type === "pee").length} />
        <button
          type="button"
          className="btn-ghost"
          style={{ width: "100%", color: "var(--danger)" }}
          onClick={() => {
            if (!window.confirm("이 산책 기록을 지울까요? 함께 남긴 산책 시간·배변 기록도 지워져요.")) return;
            deleteWalk(dog.id, viewing.id);
            setWalks(getWalks(dog.id));
            setPhase("idle");
          }}
        >
          이 기록 지우기
        </button>
      </div>
    );
  }

  // ── 대기(시작 화면) ──
  const weekFrom = toDateKey(addDays(new Date(), -6));
  const week = walks.filter((w) => w.startedAt.slice(0, 10) >= weekFrom);
  const gpsReady = gps?.lat && gps.accuracy <= MAX_ACCURACY_M;
  return (
    <div className="screen">
      <button className="btn-ghost" style={{ marginBottom: 12 }} onClick={onBack}>
        ← 체크리스트
      </button>
      <div className="h1" style={{ marginBottom: 2 }}>산책</div>
      <p className="faint" style={{ marginTop: 0 }}>{josa(dog.name, "과", "와")} 함께 걸은 코스와 시간을 기록해요</p>

      <div className="walk-start-wrap">
        <button type="button" className="walk-start" onClick={start} aria-label="산책 시작">
          시작
        </button>
        <div className={`walk-gps${gpsReady ? " ok" : ""}`}>{gps?.error ? gps.error : gpsReady ? `GPS 연결됨 · ±${Math.round(gps.accuracy)}m` : "GPS 찾는 중… (밖에서 더 정확해요)"}</div>
      </div>

      <div className="card" style={{ marginBottom: 14 }}>
        <div className="h2">나가기 전에</div>
        <div className="walk-prep">
          {PREP.map((p) => (
            <span key={p}>✓ {p}</span>
          ))}
        </div>
        <p className="faint" style={{ margin: "8px 0 0" }}>더운 날엔 손등을 바닥에 10초쯤 대 보고, 견디기 힘들면 그늘·잔디로 걸어요. (코넬대 수의대)</p>
      </div>

      <div className="card" style={{ marginBottom: 14 }}>
        <div className="h2">최근 7일</div>
        <div className="walk-week">
          <div>
            <b>{week.length}</b>
            <span>번</span>
          </div>
          <div>
            <b>{fmtKm(week.reduce((n, w) => n + w.distanceM, 0))}</b>
            <span>km</span>
          </div>
          <div>
            <b>{Math.round(week.reduce((n, w) => n + w.durationSec, 0) / 60)}</b>
            <span>분</span>
          </div>
        </div>
      </div>

      <div className="card">
        <div className="h2">지난 산책</div>
        {walks.length === 0 ? (
          <p className="subtle" style={{ margin: 0 }}>아직 기록이 없어요. [시작]을 누르고 걸어 보세요.</p>
        ) : (
          walks.slice(0, 10).map((w) => (
            <button key={w.id} type="button" className="walk-item" onClick={() => (setViewing(w), setPhase("view"))}>
              <span>
                <b>{md(w.startedAt.slice(0, 10))}</b> <span className="faint">{w.startedAt.slice(11)}</span>
              </span>
              <span>
                {fmtKm(w.distanceM)}km · {fmtTime(w.durationSec)}
                {w.marks.some((m) => m.type === "poop") ? " · 💩" : ""}
              </span>
            </button>
          ))
        )}
      </div>
    </div>
  );
}

function WalkStats({ distance, sec, poop, pee }) {
  return (
    <div className="walk-week" style={{ margin: "14px 0" }}>
      <div>
        <b>{fmtKm(distance)}</b>
        <span>km</span>
      </div>
      <div>
        <b>{fmtTime(sec)}</b>
        <span>시간</span>
      </div>
      <div>
        <b>{pace(distance, sec)}</b>
        <span>페이스(/km)</span>
      </div>
      <div>
        <b>
          {poop}/{pee}
        </b>
        <span>💩/💧</span>
      </div>
    </div>
  );
}

function Chips({ label, options, value, onChange }) {
  return (
    <div style={{ marginTop: 10 }}>
      <div style={{ fontWeight: 700, marginBottom: 6 }}>{label}</div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
        {options.map((o) => (
          <button key={o} type="button" className={`seg${value === o ? " on" : ""}`} style={{ flex: "0 0 auto", padding: "6px 12px" }} onClick={() => onChange(o)}>
            {o}
          </button>
        ))}
      </div>
    </div>
  );
}

// 코스 지도(Leaflet + OpenStreetMap). 구간마다 선, 시작(초록)·끝(빨강), 💩/💧 표시, 지금 위치(파란 점)
function RouteMap({ segments, marks = [], current, follow, height, fit }) {
  const el = useRef(null);
  const map = useRef(null);
  const layer = useRef(null);
  useEffect(() => {
    map.current = L.map(el.current, { zoomControl: false, attributionControl: true }).setView([37.5665, 126.978], 16);
    map.current.attributionControl.setPrefix("Leaflet");
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", { maxZoom: 19, attribution: "© OpenStreetMap" }).addTo(map.current);
    layer.current = L.layerGroup().addTo(map.current);
    return () => map.current.remove();
  }, []);
  useEffect(() => {
    const g = layer.current;
    g.clearLayers();
    const pts = segments.flat();
    for (const s of segments) if (s.length > 1) L.polyline(s.map((p) => [p.lat, p.lng]), { color: "#3b6cf6", weight: 6, opacity: 0.9 }).addTo(g);
    if (pts.length) L.circleMarker([pts[0].lat, pts[0].lng], { radius: 7, color: "#fff", weight: 2, fillColor: "#22a06b", fillOpacity: 1 }).addTo(g);
    if (pts.length > 1 && !current) L.circleMarker([pts.at(-1).lat, pts.at(-1).lng], { radius: 7, color: "#fff", weight: 2, fillColor: "#e5484d", fillOpacity: 1 }).addTo(g);
    for (const m of marks) if (m.lat != null) L.marker([m.lat, m.lng], { icon: L.divIcon({ className: "walk-pin", html: m.type === "poop" ? "💩" : "💧", iconSize: [22, 22] }) }).addTo(g);
    if (current) L.circleMarker([current.lat, current.lng], { radius: 8, color: "#fff", weight: 3, fillColor: "#3b6cf6", fillOpacity: 1 }).addTo(g);
    if (fit && pts.length > 1) map.current.fitBounds(L.latLngBounds(pts.map((p) => [p.lat, p.lng])), { padding: [24, 24] });
    else if (current && follow !== false) map.current.setView([current.lat, current.lng], Math.max(map.current.getZoom(), 16), { animate: true });
    else if (pts.length) map.current.setView([pts.at(-1).lat, pts.at(-1).lng], 16);
  });
  return <div ref={el} className="walk-map" style={{ height }} />;
}
