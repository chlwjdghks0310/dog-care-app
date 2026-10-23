import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { calculateAge, formatAge } from "../utils/age";
import { formatKoreanDate, toDateKey, todayKey, addDays } from "../utils/date";
import { addWeightRecord, getLatestWeightRecord } from "../services/weightLog";
import { isDark, setDark, PALETTES, getPalette, setPalette } from "../services/themeSettings";
import { getPermission, isNotificationSupported, requestPermission, syncPushAlarms } from "../services/notifications";
import { resizeImageFile } from "../utils/image";
import { getDogs, saveDog } from "../services/dogRepository";
import { getMeds, getDosesForDate, isEnded } from "../services/medications";
import { getOccurrences } from "../services/calendarEvents";
import { TYPES, getRecords, getVitalEntries, vitalDaily, filterTimeline, summarize, md } from "../services/records";
import { readJSON, writeJSON } from "../services/storage";
import { VITALS, DEFAULT_PINS, fmtValue, outOfRange } from "../data/vitals";
import AccountCard from "../components/AccountCard";
import { AIConsentCard } from "../components/AIConsent";
import FamilyShare, { FamilyBadge } from "../components/FamilyShare";
import { useSwipeClose } from "../components/SwipeBack";
import Ico from "../components/Ico";
import Help from "./Help";
import Contact from "./Contact";
import DogRegister from "./DogRegister";
import { getSyncStatus } from "../services/sync";
import { leavePet, myRole } from "../services/sync/family";

const GENDER_LABEL = { male: "남자 ♂", female: "여자 ♀" }; // 등록 화면과 같은 말·순서

function Row({ label, value }) {
  if (!value) return null;
  return (
    <div style={{ display: "flex", justifyContent: "space-between", padding: "8px 0", borderBottom: "1px solid var(--border)" }}>
      <span className="subtle">{label}</span>
      <span>{value}</span>
    </div>
  );
}

// 로그인 중이면 삭제가 서버 백업(과 다른 폰)에도 반영된다는 걸 미리 알린다
const backupNote = () => (getSyncStatus().user ? "\n\n로그인 중이라 백업된 기록과 다른 폰(같은 계정·가족 공유 중인 가족)에서도 사라져요." : "");
// 로그인 중이면 강아지마다 내 역할을 확인한다 — 가족으로 들어온 강아지는 "삭제" 대신 "나가기"(다른 가족의 기록은 그대로)
const roleOf = (id) => (getSyncStatus().user ? myRole(id).catch(() => null) : null);

export default function Profile({ dog, onOpenVet, onOpenVital, onOpenRecords, onNewRecord, onOpenWeight, onOpenMeds, onOpenCalendar, onUpdateDog, onDeleteCurrent, onDeleteAll, onDogRegistered }) {
  const age = calculateAge(dog.birthDate);
  const [dark, setDarkState] = useState(isDark);
  const [palette, setPaletteState] = useState(getPalette);
  const [notifPermission, setNotifPermission] = useState(getPermission());
  const [editing, setEditing] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  // 설정 위에 겹쳐 여는 화면(도움말·문의하기·강아지 등록) — 닫으면 아래 설정이 그대로 보인다
  const [settingsSub, setSettingsSub] = useState(null); // null | "help" | "contact" | "add-dog"
  const subSwipeClose = useSwipeClose(() => setSettingsSub(null));
  const swipeClose = useSwipeClose(() => setSettingsOpen(false));
  const [editForm, setEditForm] = useState(null);
  const [editError, setEditError] = useState("");
  const [infoOpen, setInfoOpen] = useState(false);

  // 체중 관리의 가장 최근 기록이 프로필 체중과 다르면 프로필을 그 값으로 맞춘다
  useEffect(() => {
    const latest = getLatestWeightRecord(dog.id);
    if (latest && latest.weightKg !== dog.weight) onUpdateDog?.(saveDog({ ...dog, weight: latest.weightKg }));
  }, [dog, onUpdateDog]);

  function startEdit() {
    setEditForm({
      ...Object.fromEntries(EDIT_FIELDS.map(([k]) => [k, dog[k] ?? ""])),
      weight: dog.weight ?? "",
      neutered: Boolean(dog.neutered),
      ageEstimated: Boolean(dog.ageEstimated),
    });
    setEditError("");
    setEditing(true);
    setInfoOpen(true);
    setTimeout(() => document.getElementById("dog-info")?.scrollIntoView({ behavior: "smooth", block: "start" }), 50);
  }

  function handleSaveEdit() {
    const name = editForm.name.trim();
    const today = todayKey();
    let weight = editForm.weight ? Number(editForm.weight) : null;
    const problem = !name
      ? "이름을 적어 주세요."
      : !editForm.birthDate || editForm.birthDate > today
        ? "생년월일을 오늘 이전 날짜로 골라 주세요."
        : editForm.adoptionDate && editForm.adoptionDate > today
          ? "입양일을 오늘 이전 날짜로 골라 주세요."
          : weight != null && !(weight > 0 && weight < 120)
            ? "체중을 0.1~120kg 사이로 적어 주세요."
            : !editForm.breed.trim()
              ? "견종을 적어 주세요."
              : "";
    if (problem) return setEditError(problem);
    // 체중을 바꾸면 체중 관리에도 오늘 날짜·지금 시각으로 기록을 추가한다.
    // 프로필 체중은 항상 체중 관리의 가장 최근 기록과 같게 맞춘다.
    if (weight && weight !== dog.weight) {
      const now = new Date();
      addWeightRecord(dog.id, { weightKg: weight, measuredAt: `${toDateKey(now)}T${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}:00`, note: "프로필에서 변경" });
      weight = getLatestWeightRecord(dog.id)?.weightKg ?? weight;
    }
    const updated = saveDog({
      ...dog,
      ...Object.fromEntries(EDIT_FIELDS.map(([k]) => [k, String(editForm[k] ?? "").trim()])),
      name,
      weight,
      neutered: editForm.neutered,
      ageEstimated: editForm.ageEstimated,
    });
    onUpdateDog?.(updated);
    setEditing(false);
  }

  async function handleEnableNotifications() {
    const result = await requestPermission();
    setNotifPermission(result);
    if (result === "granted") syncPushAlarms(); // 권한을 켜면 앱이 꺼져 있어도 오는 푸시까지 바로 연결
  }

  async function handleDeleteCurrent() {
    if ((await roleOf(dog.id)) === "family") {
      if (!window.confirm(`${dog.name}은(는) 가족이 공유한 강아지예요. 이 폰에서 빼고 가족 공유에서 나갈까요? 다른 가족의 기록은 그대로 남아요.`)) return;
      // 서버에서 먼저 빠진다 → 맞추기가 이 폰의 사본만 지우고, 화면은 dogcare-synced로 바뀐다
      return leavePet(dog.id).catch((err) => window.alert(err.message));
    }
    if (window.confirm(`${dog.name}의 정보를 삭제할까요? 체중 기록·일정 등 이 강아지 데이터가 모두 사라져요.${backupNote()}`)) {
      onDeleteCurrent?.();
    }
  }

  async function handleDeleteAll() {
    if (!window.confirm(`등록된 강아지를 전부 삭제할까요? 모든 강아지의 데이터가 사라지고 등록 화면으로 돌아가요.${backupNote()}\n가족이 공유한 강아지는 삭제하지 않고 가족 공유에서만 나가요.`)) return;
    try {
      for (const d of getDogs()) if ((await roleOf(d.id)) === "family") await leavePet(d.id);
    } catch (err) {
      return window.alert(err.message);
    }
    onDeleteAll?.();
  }

  async function handlePhotoChange(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    const photo = await resizeImageFile(file);
    const updated = saveDog({ ...dog, photo });
    onUpdateDog?.(updated);
  }

  return (
    <div className="screen">
      <div className="settings-bar">
        <button type="button" className="btn-ghost settings-btn" aria-label="설정 열기" onClick={() => setSettingsOpen(true)}>
          <Ico name="menu" size={22} />
        </button>
      </div>
      <div className="card" style={{ marginBottom: 14 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 12 }}>
          <label style={{ position: "relative", cursor: "pointer", flexShrink: 0 }}>
            {dog.photo ? (
              <img
                src={dog.photo}
                alt={`${dog.name} 사진`}
                style={{ width: 84, height: 84, borderRadius: 20, objectFit: "cover" }}
              />
            ) : (
              <div
                style={{
                  width: 84,
                  height: 84,
                  borderRadius: 20,
                  background: "var(--accent-soft)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 40,
                }}
                aria-hidden="true"
              >
                <Ico name="dog" size={44} style={{ color: "var(--accent-strong)" }} />
              </div>
            )}
            <span
              style={{
                position: "absolute",
                bottom: -4,
                right: -4,
                background: "var(--surface)",
                border: "1px solid var(--border)",
                borderRadius: "50%",
                width: 24,
                height: 24,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 12,
              }}
            >
              <Ico name="camera" size={13} />
            </span>
            <input type="file" accept="image/*" onChange={handlePhotoChange} style={{ display: "none" }} />
          </label>

          <div style={{ flex: 1 }}>
            <div className="h1" style={{ marginBottom: 4 }}>{dog.name}</div>
            <span className="chip">{formatAge(age)}</span>
            <span className="faint" style={{ marginLeft: 8 }}>{dog.breed}</span>
            <FamilyBadge dogId={dog.id} />
          </div>

          {isNotificationSupported() && notifPermission !== "granted" && (
            <button className="btn-ghost" style={{ padding: "6px 10px", fontSize: 12 }} onClick={handleEnableNotifications} aria-label="알림 켜기">
              <Ico name="bell" size={18} />
            </button>
          )}
          {isNotificationSupported() && notifPermission === "granted" && (
            <span className="faint" title="정해진 시간에 케어 알림을 보내드려요"><Ico name="bell" size={18} /></span>
          )}
        </div>
        <button type="button" className="btn-ghost" style={{ width: "100%" }} onClick={startEdit}>
          프로필 편집
        </button>
      </div>

      <HealthSummary dog={dog} onEdit={startEdit} />

      <VitalsCard dog={dog} onOpenVital={onOpenVital} onOpenWeight={onOpenWeight} onOpenMeds={onOpenMeds} />

      <HealthServices dog={dog} onOpenRecords={onOpenRecords} onNewRecord={onNewRecord} onOpenMeds={onOpenMeds} onOpenVet={onOpenVet} />

      <UpcomingCard dog={dog} onOpenCalendar={onOpenCalendar} />

      <div id="dog-info" className="card" style={{ marginBottom: 14, scrollMarginTop: 12 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <button type="button" className="info-toggle" aria-expanded={infoOpen || editing} onClick={() => !editing && setInfoOpen((v) => !v)}>
            <span className="h2" style={{ margin: 0 }}>강아지 정보</span>
            {!editing && <span className="subtle">{infoOpen ? "접기 ▴" : "전체 보기 ▾"}</span>}
          </button>
          {editing && (
            <div style={{ display: "flex", gap: 6 }}>
              <button className="btn-ghost" style={{ padding: "4px 10px", fontSize: 12.5 }} onClick={() => setEditing(false)}>
                취소
              </button>
              <button className="btn-primary" style={{ width: "auto", minHeight: 32, padding: "4px 12px", fontSize: 13 }} onClick={handleSaveEdit}>
                저장
              </button>
            </div>
          )}
        </div>

        {editing ? (
          <div style={{ marginTop: 10 }}>
            <div className="field">
              <label>이름</label>
              <input value={editForm.name} onChange={(e) => setEditForm((f) => ({ ...f, name: e.target.value }))} />
            </div>
            <div className="field">
              <label>생년월일</label>
              <input type="date" max={todayKey()} value={editForm.birthDate} onChange={(e) => setEditForm((f) => ({ ...f, birthDate: e.target.value }))} />
              <label className="rec-check" style={{ marginTop: 6 }}>
                <input type="checkbox" checked={editForm.ageEstimated} onChange={(e) => setEditForm((f) => ({ ...f, ageEstimated: e.target.checked }))} />
                정확하지 않은 추정 날짜예요
              </label>
            </div>
            <div className="field">
              <label>성별</label>
              <div style={{ display: "flex", gap: 6 }}>
                {Object.entries(GENDER_LABEL).map(([k, label]) => (
                  <button key={k} type="button" className={`seg${editForm.gender === k ? " on" : ""}`} onClick={() => setEditForm((f) => ({ ...f, gender: k }))}>
                    {label}
                  </button>
                ))}
              </div>
            </div>
            <div className="field">
              <label>체중 (kg)</label>
              <input
                type="number"
                step="0.1"
                inputMode="decimal"
                value={editForm.weight}
                onChange={(e) => setEditForm((f) => ({ ...f, weight: e.target.value }))}
                placeholder="모르면 비워두세요"
              />
            </div>
            <div className="field">
              <label className="rec-check">
                <input type="checkbox" checked={editForm.neutered} onChange={(e) => setEditForm((f) => ({ ...f, neutered: e.target.checked }))} />
                중성화 완료
              </label>
            </div>
            {EDIT_FIELDS.filter(([k]) => !["name", "birthDate", "gender"].includes(k)).map(([k, label, placeholder, multi]) => (
              <div className="field" key={k}>
                <label>{label}</label>
                {k === "adoptionDate" ? (
                  <input type="date" max={todayKey()} value={editForm[k]} onChange={(e) => setEditForm((f) => ({ ...f, [k]: e.target.value }))} />
                ) : multi ? (
                  <textarea rows={2} maxLength={500} value={editForm[k]} placeholder={placeholder} onChange={(e) => setEditForm((f) => ({ ...f, [k]: e.target.value }))} />
                ) : (
                  <input value={editForm[k]} maxLength={100} placeholder={placeholder} onChange={(e) => setEditForm((f) => ({ ...f, [k]: e.target.value }))} />
                )}
              </div>
            ))}
            {editError && <p className="error-text" role="alert">{editError}</p>}
            <button className="btn-primary" onClick={handleSaveEdit}>저장</button>
          </div>
        ) : (
          infoOpen && (
            <div style={{ marginTop: 6 }}>
              <Row label="생년월일" value={dog.birthDate ? `${formatKoreanDate(dog.birthDate)}${dog.ageEstimated ? " (추정)" : ""}` : ""} />
              <Row label="견종" value={dog.breed} />
              <Row label="성별" value={GENDER_LABEL[dog.gender]} />
              <Row label="체중" value={dog.weight ? `${dog.weight}kg` : ""} />
              <Row label="중성화" value={dog.neutered ? "완료" : "미완료"} />
              <Row label="입양일" value={dog.adoptionDate ? formatKoreanDate(dog.adoptionDate) : ""} />
              {EDIT_FIELDS.filter(([k]) => !["name", "birthDate", "gender", "breed", "adoptionDate"].includes(k)).map(([k, label]) => (
                <Row key={k} label={label} value={dog[k]} />
              ))}
            </div>
          )
        )}
      </div>

      {/* 설정(☰): 가족 공유·강아지 등록·다크 모드·백업 로그인·도움말·문의하기·삭제 — 하단 탭 위까지 덮어야 해서 body에 띄운다 */}
      {settingsOpen &&
        createPortal(
          <div className="settings-sheet" role="dialog" aria-label="설정" {...swipeClose}>
            <div className="settings-head">
              <div className="h1" style={{ margin: 0 }}>설정</div>
              <button type="button" className="btn-ghost" onClick={() => setSettingsOpen(false)}>닫기</button>
            </div>
            <FamilyShare dog={dog} />
            <div className="card" style={{ marginBottom: 14 }}>
              <div className="h2">강아지 등록</div>
              <p className="subtle" style={{ margin: "0 0 12px" }}>함께 사는 강아지를 더 등록할 수 있어요. 지금 강아지 기록은 그대로예요.</p>
              <button type="button" className="btn-ghost" onClick={() => setSettingsSub("add-dog")}>
                + 새 강아지 등록하기
              </button>
            </div>
            <div className="card" style={{ marginBottom: 14 }}>
              <label style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, cursor: "pointer" }}>
                <span>
                  <span className="h2" style={{ display: "flex", alignItems: "center", gap: 6, margin: 0 }}>
                    <Ico name="moon" size={18} /> 다크 모드
                  </span>
                  <span className="faint" style={{ display: "block", marginTop: 4 }}>어두운 화면으로 눈이 덜 부셔요</span>
                </span>
                <input type="checkbox" role="switch" className="switch" checked={dark} onChange={(e) => (setDark(e.target.checked), setDarkState(e.target.checked))} aria-label="다크 모드" />
              </label>
            </div>
            <div className="card" style={{ marginBottom: 14 }}>
              <div className="h2" style={{ marginBottom: 2 }}>색 조합</div>
              <p className="faint" style={{ margin: "0 0 10px" }}>대표색 소프트블루는 그대로, 아이콘에 들어가는 보조색만 바뀌어요</p>
              <div role="radiogroup" aria-label="색 조합" style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {PALETTES.map((pl) => (
                  <button
                    key={pl.id}
                    type="button"
                    role="radio"
                    aria-checked={palette === pl.id}
                    onClick={() => (setPalette(pl.id), setPaletteState(pl.id))}
                    style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 12px", borderRadius: 14, textAlign: "left", background: palette === pl.id ? "var(--accent-soft)" : "var(--surface)", border: palette === pl.id ? "2px solid var(--accent)" : "1px solid var(--border)", color: "var(--text)" }}
                  >
                    <span style={{ display: "flex", gap: 4 }} aria-hidden="true">
                      {["var(--accent)", ...pl.swatches].map((c, i) => (
                        <span key={i} style={{ width: 18, height: 18, borderRadius: "50%", background: c }} />
                      ))}
                    </span>
                    <span style={{ flex: 1, minWidth: 0 }}>
                      <span style={{ display: "block", fontWeight: 700 }}>{pl.name}</span>
                      <span className="faint" style={{ display: "block", fontSize: 12.5 }}>{pl.desc}</span>
                    </span>
                    {palette === pl.id && <Ico name="check" size={18} style={{ color: "var(--accent-strong)" }} />}
                  </button>
                ))}
              </div>
            </div>
            <AccountCard />
            <AIConsentCard />

            <div className="card" style={{ marginTop: 14 }}>
              <button
                onClick={() => setSettingsSub("help")}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  width: "100%",
                  background: "none",
                  border: "none",
                  padding: 0,
                }}
              >
                <span className="h2" style={{ margin: 0 }}>도움말</span>
                <span className="subtle">›</span>
              </button>
              <button
                onClick={() => setSettingsSub("contact")}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  width: "100%",
                  background: "none",
                  border: "none",
                  borderTop: "1px solid var(--border)",
                  padding: 0,
                  marginTop: 14,
                  paddingTop: 14,
                }}
              >
                <span className="h2" style={{ margin: 0 }}>문의하기</span>
                <span className="subtle">›</span>
              </button>
            </div>

            <button className="btn-ghost" style={{ width: "100%", marginTop: 14, color: "var(--danger)" }} onClick={handleDeleteCurrent}>
              이 강아지 삭제
            </button>
            <button className="btn-ghost" style={{ width: "100%", marginTop: 8, color: "var(--danger)" }} onClick={handleDeleteAll}>
              전체 삭제 (모든 강아지, 다시 등록하기)
            </button>
          </div>,
          document.body
        )}
      {settingsOpen &&
        settingsSub &&
        createPortal(
          <div className="settings-sheet" role="dialog" aria-label={{ help: "도움말", contact: "문의하기", "add-dog": "강아지 등록" }[settingsSub]} style={{ zIndex: 110, padding: 0, display: "flex", flexDirection: "column" }} {...subSwipeClose}>
            {settingsSub === "help" && <Help onBack={() => setSettingsSub(null)} />}
            {settingsSub === "contact" && <Contact onBack={() => setSettingsSub(null)} />}
            {settingsSub === "add-dog" && (
              <DogRegister
                onCancel={() => setSettingsSub(null)}
                onRegistered={(newDog) => {
                  setSettingsSub(null);
                  setSettingsOpen(false); // 등록을 마치면 새 강아지 프로필로
                  onDogRegistered(newDog);
                }}
              />
            )}
          </div>,
          document.body
        )}
    </div>
  );
}

// 프로필 편집 칸: [키, 이름, 예시, 여러 줄]. 이름·생년월일·견종·성별 말고는 모두 선택 — 나중에 채워도 된다.
const EDIT_FIELDS = [
  ["name", "이름"],
  ["birthDate", "생년월일"],
  ["gender", "성별"],
  ["breed", "견종", "예: 말티즈"],
  ["adoptionDate", "입양일"],
  ["food", "사료", "예: 로얄캐닌 미니 퍼피"],
  ["allergies", "알레르기", "예: 닭고기"],
  ["illnesses", "과거 질환·수술", "예: 2024년 슬개골 탈구 수술", true],
  ["vaccines", "예방접종·주요 건강 정보", "예: 종합백신 5차 완료, 심장사상충 매달", true],
  ["hospital", "다니는 동물병원", "예: 행복동물병원"],
  ["notes", "보호자 메모", "예: 낯선 사람을 무서워해요", true],
];

const VISIT_WORDS = /병원|진료|검진|검사|접종|백신|수술|재진|예방|심장사상충/;

function HealthSummary({ dog, onEdit }) {
  const meds = getMeds(dog.id).filter((m) => !isEnded(m));
  const lines = [
    ["알레르기", dog.allergies],
    ["질환·수술", dog.illnesses],
    ["접종·건강", dog.vaccines],
    ["다니는 병원", dog.hospital],
    ["먹는 약", [...new Set(meds.map((m) => m.name))].join(", ")],
  ].filter(([, v]) => v);
  return (
    <div className="card" style={{ marginBottom: 14 }}>
      <div className="h2">건강 요약</div>
      {lines.length === 0 ? (
        <div className="subtle">
          아직 기록이 없습니다. 알레르기·질환·다니는 병원을 적어 두면 여기에 모여요.{" "}
          <button type="button" className="link-btn" onClick={onEdit}>정보 추가</button>
        </div>
      ) : (
        lines.map(([k, v]) => (
          <div key={k} className="vet-line"><span className="faint">{k}</span> {v}</div>
        ))
      )}
    </div>
  );
}



function UpcomingCard({ dog, onOpenCalendar }) {
  const today = todayKey();
  const until = toDateKey(addDays(new Date(), 60));
  const seen = new Set(); // 반복 일정은 가장 가까운 회차만
  const items = getOccurrences(dog.id, today, until)
    .filter((o) => o.isStart && (o.event.kind === "vet" || o.event.kind === "vaccine" || VISIT_WORDS.test(o.event.title)) && !seen.has(o.event.id) && seen.add(o.event.id))
    .map((o) => ({ date: o.date, title: `${o.event.title}${o.event.time ? ` ${o.event.time}` : ""}` }))
    .slice(0, 3);
  const dday = (date) => Math.round((new Date(`${date}T00:00:00`) - new Date(`${today}T00:00:00`)) / 86400000);
  return (
    <div className="card" style={{ marginBottom: 14 }}>
      <div className="rec-head">
        <div className="h2" style={{ margin: 0 }}>다가오는 병원·접종</div>
        <button type="button" className="link-btn" style={{ margin: 0 }} onClick={onOpenCalendar}>일정표 ›</button>
      </div>
      {items.length === 0 ? (
        <p className="subtle" style={{ margin: 0 }}>앞으로 60일 안에 병원·접종 일정이 없습니다. 병원 기록에 다음 진료일을 적으면 여기에 나와요.</p>
      ) : (
        items.map((e, i) => (
          <div key={i} className="vet-line">
            <b>{md(e.date)}</b> <span className="faint">{dday(e.date) === 0 ? "오늘" : `${dday(e.date)}일 뒤`}</span> {e.title}
          </div>
        ))
      )}
    </div>
  );
}

// 건강 수치 칸(집사일기 '주요 수치' 참고) — 자주 쓰는 수치만 기본으로 보이고, 최근 30일 기록이 있거나 [편집]에서 켠 수치가 더해진다.
const PINS_KEY = "dogcare-vital-pins-v1";
function VitalsCard({ dog, onOpenVital, onOpenWeight, onOpenMeds }) {
  const [editingPins, setEditingPins] = useState(false);
  // 투약 칸("meds")도 같은 목록으로 켜고 끈다. 처음엔 켜져 있다
  const [pins, setPins] = useState(() => readJSON(PINS_KEY, {})[dog.id] || [...DEFAULT_PINS, "meds"]);
  const today = todayKey();
  const since = toDateKey(addDays(new Date(), -29));
  const tiles = VITALS.map((v) => {
    const entries = getVitalEntries(dog.id, v.id);
    const daily = vitalDaily(entries, v.kind);
    const recent = entries.some((e) => e.at.slice(0, 10) >= since);
    const todayRow = daily.find((d) => d.date === today);
    const last = entries.at(-1);
    return { v, recent, todayRow, last };
  });
  const shown = editingPins ? tiles : tiles.filter((t) => pins.includes(t.v.id) || t.recent);
  function togglePin(id) {
    const next = pins.includes(id) ? pins.filter((x) => x !== id) : [...pins, id];
    setPins(next);
    writeJSON(PINS_KEY, { ...readJSON(PINS_KEY, {}), [dog.id]: next });
  }
  return (
    <div className="card" style={{ marginBottom: 14 }}>
      <div className="rec-head">
        <div className="h2" style={{ margin: 0 }}>건강 수치</div>
        <button type="button" className="link-btn" style={{ margin: 0 }} onClick={() => setEditingPins((e) => !e)}>{editingPins ? "완료" : "편집"}</button>
      </div>
      {editingPins && <p className="faint" style={{ marginTop: -6 }}>프로필에 늘 보일 수치를 고르세요. 꺼도 최근 30일 기록이 있으면 보여요(투약은 끄면 숨겨져요).</p>}
      <div className="vt-grid">
        {shown.map(({ v, todayRow, last }) => {
          const value = v.kind === "sum" ? todayRow?.value : last?.value;
          const sub = v.kind === "sum" ? (todayRow ? "오늘" : last ? `마지막 ${md(last.at.slice(0, 10))}` : "기록 없음") : last ? (last.at.slice(0, 10) === today ? `오늘 ${last.at.slice(11)}` : md(last.at.slice(0, 10))) : "기록 없음";
          const flag = v.kind === "point" && last && outOfRange(v.id, last.value);
          const on = pins.includes(v.id);
          return (
            <button
              key={v.id}
              type="button"
              className={`vt-tile${editingPins ? (on ? " pinned" : " unpinned") : ""}`}
              aria-pressed={editingPins ? on : undefined}
              aria-label={`${v.label} ${value != null ? `${fmtValue(v.id, value)}${v.unit}` : "기록 없음"}`}
              onClick={() => (editingPins ? togglePin(v.id) : v.external ? onOpenWeight() : onOpenVital(v.id))}
            >
              <span className="vt-top">
                <Ico name={v.ico} size={16} className={`tone-${v.tone}`} />
                <span className="vt-label">{v.label}</span>
                {editingPins && <span className="vt-check" aria-hidden="true">{on ? "✓" : ""}</span>}
              </span>
              {value != null ? (
                <span className="vt-value">
                  {fmtValue(v.id, value)}
                  <span className="vt-unit">{v.unit}</span>
                </span>
              ) : (
                <span className="vt-empty">＋ 적기</span>
              )}
              {(value != null || sub !== "기록 없음") && <span className={`vt-sub${flag ? " warn" : ""}`}>{flag ? "참고 범위 밖" : sub}</span>}
            </button>
          );
        })}
        {(editingPins || pins.includes("meds")) && (
          <MedsTile dog={dog} today={today} onOpen={onOpenMeds} editing={editingPins} on={pins.includes("meds")} onToggle={() => togglePin("meds")} />
        )}
      </div>
    </div>
  );
}

// 투약 칸: 오늘 먹일 약을 몇 번 먹였는지. 누르면 약 관리(약 등록·복용 체크·기록)로. 체크리스트 대신 여기서 관리한다. [편집]에서 켜고 끌 수 있다
function MedsTile({ dog, today, onOpen, editing, on, onToggle }) {
  const doses = getDosesForDate(dog.id, today);
  const done = doses.filter((d) => d.status === "done").length;
  const toCheck = doses.filter((d) => d.status === "check").length;
  const hasMeds = getMeds(dog.id).some((m) => !isEnded(m, today));
  return (
    <button
      type="button"
      className={`vt-tile${editing ? (on ? " pinned" : " unpinned") : ""}`}
      aria-pressed={editing ? on : undefined}
      onClick={editing ? onToggle : onOpen}
      aria-label={doses.length ? `투약 오늘 ${done}/${doses.length}회` : "투약"}
    >
      <span className="vt-top">
        <Ico name="pill" size={16} className="tone-teal" />
        <span className="vt-label">투약</span>
        {editing && <span className="vt-check" aria-hidden="true">{on ? "✓" : ""}</span>}
      </span>
      {doses.length ? (
        <span className="vt-value">
          {done}/{doses.length}
          <span className="vt-unit">회</span>
        </span>
      ) : (
        <span className="vt-empty">{hasMeds ? "오늘은 없음" : "＋ 약 등록"}</span>
      )}
      {doses.length > 0 && <span className={`vt-sub${toCheck ? " warn" : ""}`}>{toCheck ? `확인 필요 ${toCheck}` : "오늘"}</span>}
    </button>
  );
}

// 건강 기록 목록 — 종류마다 마지막 기록 한 줄, 누르면 그 종류만 모아 보고 ＋로 바로 적기
const SERVICES = [
  { key: "symptom", label: "이상 증상", ico: "thermometer", tone: "blue", types: ["symptom"] },
  { key: "meds", label: "투약 기록", ico: "pill", tone: "teal" },
  { key: "vet", label: "병원 진료", ico: "stethoscope", tone: "blue", types: ["vet"] },
  { key: "eat", label: "식사·배변", ico: "utensils", tone: "rose", types: ["meal", "potty"], add: "meal" },
  { key: "condition", label: "컨디션", ico: "moon", tone: "violet", types: ["condition"] },
  { key: "daily", label: "산책·일상", ico: "footprints", tone: "violet", types: ["daily"] },
  { key: "memory", label: "사진·추억", ico: "camera", tone: "rose", types: ["media", "life"], add: "media" },
  { key: "report", label: "병원용 기록", ico: "clipboard", tone: "blue" },
];
function HealthServices({ dog, onOpenRecords, onNewRecord, onOpenMeds, onOpenVet }) {
  const recs = getRecords(dog.id);
  const meds = getMeds(dog.id).filter((m) => !isEnded(m));
  const doses = getDosesForDate(dog.id, todayKey());
  const check = doses.filter((d) => d.status === "check").length;
  const subFor = (svc) => {
    if (svc.key === "meds")
      return meds.length === 0 ? "먹는 약이 없어요" : doses.length ? `오늘 ${doses.filter((d) => d.status === "done").length}/${doses.length} 먹였어요${check ? ` · 확인 필요 ${check}` : ""}` : `약 ${new Set(meds.map((m) => m.seriesId)).size}개 · 오늘은 없음`;
    if (svc.key === "report") return "수의사에게 보여 줄 정리본";
    const last = filterTimeline(recs.filter((r) => svc.types.includes(r.type)))[0];
    return last ? `${md(last.at.slice(0, 10))} · ${summarize(last)}` : "아직 기록이 없어요";
  };
  return (
    <div className="card" style={{ marginBottom: 14 }}>
      <div className="rec-head">
        <div className="h2" style={{ margin: 0 }}>건강 기록</div>
        <button type="button" className="link-btn" style={{ margin: 0 }} onClick={() => onOpenRecords()}>전체 보기 ›</button>
      </div>
      {SERVICES.map((svc) => (
        <div key={svc.key} className="sv-row">
          <button type="button" className="sv-main" onClick={() => (svc.key === "meds" ? onOpenMeds() : svc.key === "report" ? onOpenVet() : onOpenRecords(svc.types))}>
            <span className={`sv-icon tone-${svc.tone}`} aria-hidden="true"><Ico name={svc.ico} size={20} /></span>
            <span style={{ flex: 1, minWidth: 0 }}>
              <span className="sv-label">{svc.label}</span>
              <span className={`sv-sub${svc.key === "meds" && check ? " warn" : ""}`}>{subFor(svc)}</span>
            </span>
            <span className="faint" aria-hidden="true">›</span>
          </button>
          {svc.types && (
            <button type="button" className="sv-add" aria-label={`${svc.label} 기록 추가`} onClick={() => onNewRecord(svc.add || svc.types[0])}>＋</button>
          )}
        </div>
      ))}
      <button type="button" className="btn-primary" style={{ marginTop: 12 }} onClick={() => onNewRecord()}>
        ＋ 새 기록
      </button>
    </div>
  );
}
