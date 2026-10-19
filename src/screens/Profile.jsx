import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { calculateAge, formatAge } from "../utils/age";
import { formatKoreanDate, toDateKey, todayKey, addDays } from "../utils/date";
import { addWeightRecord, getLatestWeightRecord } from "../services/weightLog";
import { THEMES, getTheme, setTheme } from "../services/themeSettings";
import { getPermission, isNotificationSupported, requestPermission, syncPushAlarms } from "../services/notifications";
import { resizeImageFile } from "../utils/image";
import { saveDog } from "../services/dogRepository";
import { getMeds, getDosesForDate, isEnded } from "../services/medications";
import { getEventsByDog } from "../services/calendarEvents";
import { TYPES, getTimeline, filterTimeline, summarize, md } from "../services/records";

const GENDER_LABEL = { female: "암컷", male: "수컷" };

function Row({ label, value }) {
  if (!value) return null;
  return (
    <div style={{ display: "flex", justifyContent: "space-between", padding: "8px 0", borderBottom: "1px solid var(--border)" }}>
      <span className="subtle">{label}</span>
      <span>{value}</span>
    </div>
  );
}

export default function Profile({ dog, onOpenContact, onOpenHelp, onOpenVet, onOpenRecords, onNewRecord, onOpenWeight, onOpenMeds, onOpenCalendar, onUpdateDog, onDeleteCurrent, onDeleteAll, onAddDog }) {
  const age = calculateAge(dog.birthDate);
  const [theme, setThemeState] = useState(getTheme());
  const [pickerOpen, setPickerOpen] = useState(false);
  const currentTheme = THEMES.find((t) => t.id === theme) || THEMES[0];
  const [category, setCategory] = useState(currentTheme.category);
  const [notifPermission, setNotifPermission] = useState(getPermission());
  const [editing, setEditing] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
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

  function handleSelectTheme(id) {
    setTheme(id);
    setThemeState(id);
    setPickerOpen(false);
  }

  async function handleEnableNotifications() {
    const result = await requestPermission();
    setNotifPermission(result);
    if (result === "granted") syncPushAlarms(); // 권한을 켜면 앱이 꺼져 있어도 오는 푸시까지 바로 연결
  }

  function handleDeleteCurrent() {
    if (window.confirm(`${dog.name}의 정보를 삭제할까요? 체중 기록·일정 등 이 강아지 데이터가 모두 사라져요.`)) {
      onDeleteCurrent?.();
    }
  }

  function handleDeleteAll() {
    if (window.confirm("등록된 강아지를 전부 삭제할까요? 모든 강아지의 데이터가 사라지고 등록 화면으로 돌아가요.")) {
      onDeleteAll?.();
    }
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
          ☰
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
                🐶
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
              📷
            </span>
            <input type="file" accept="image/*" onChange={handlePhotoChange} style={{ display: "none" }} />
          </label>

          <button
            type="button"
            onClick={onAddDog}
            aria-label="강아지 추가"
            title="강아지 추가"
            style={{
              width: 28,
              height: 28,
              borderRadius: "50%",
              border: "1px solid var(--border)",
              background: "var(--surface)",
              boxShadow: "var(--shadow)",
              fontSize: 16,
              lineHeight: 1,
              color: "var(--accent-strong)",
              flexShrink: 0,
            }}
          >
            +
          </button>

          <div style={{ flex: 1 }}>
            <div className="h1" style={{ marginBottom: 4 }}>{dog.name}</div>
            <span className="chip">{formatAge(age)}</span>
            <span className="faint" style={{ marginLeft: 8 }}>{dog.breed}</span>
          </div>

          {isNotificationSupported() && notifPermission !== "granted" && (
            <button className="btn-ghost" style={{ padding: "6px 10px", fontSize: 12 }} onClick={handleEnableNotifications}>
              🔔
            </button>
          )}
          {isNotificationSupported() && notifPermission === "granted" && (
            <span className="faint" title="정해진 시간에 케어 알림을 보내드려요">🔔</span>
          )}
        </div>
        <button type="button" className="btn-ghost" style={{ width: "100%" }} onClick={startEdit}>
          프로필 편집
        </button>
      </div>

      <HealthSummary dog={dog} onEdit={startEdit} />

      <div className="mini-cards">
        <WeightCard dog={dog} onOpen={onOpenWeight} />
        <MedCard dog={dog} onOpen={onOpenMeds} />
      </div>

      <UpcomingCard dog={dog} onOpenCalendar={onOpenCalendar} />

      <div className="card" style={{ marginBottom: 14 }}>
        <div className="rec-head">
          <div className="h2" style={{ margin: 0 }}>최근 기록</div>
          <button type="button" className="link-btn" style={{ margin: 0 }} onClick={onOpenRecords}>전체 기록 보기 ›</button>
        </div>
        <RecentRecords dog={dog} onOpen={onOpenRecords} />
        <button type="button" className="btn-primary" style={{ marginTop: 12 }} onClick={onNewRecord}>
          ＋ 새 기록
        </button>
      </div>

      <button type="button" className="card vet-entry" onClick={onOpenVet}>
        <span className="vet-entry-icon" aria-hidden="true">🏥</span>
        <span style={{ flex: 1, minWidth: 0 }}>
          <span className="h2" style={{ display: "block", margin: 0 }}>병원용 기록</span>
          <span className="subtle">증상·먹는 약·체중을 수의사가 바로 읽게 정리해요</span>
        </span>
        <span className="subtle">›</span>
      </button>

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
              <button className="btn-primary" style={{ width: "auto", padding: "4px 12px", fontSize: 12.5 }} onClick={handleSaveEdit}>
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

      {/* 설정(☰): 배경 테마·도움말·문의하기·삭제 — 하단 탭 위까지 덮어야 해서 body에 띄운다 */}
      {settingsOpen &&
        createPortal(
          <div className="settings-sheet" role="dialog" aria-label="설정">
            <div className="settings-head">
              <div className="h1" style={{ margin: 0 }}>설정</div>
              <button type="button" className="btn-ghost" onClick={() => setSettingsOpen(false)}>닫기</button>
            </div>
            <div className="card">
              <div className="h2">배경 테마</div>
              <button
                onClick={() => setPickerOpen((v) => !v)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  background: "none",
                  border: "none",
                  padding: 0,
                }}
              >
                <span
                  style={{
                    width: 44,
                    height: 44,
                    borderRadius: "50%",
                    background: currentTheme.swatch,
                    border: "2px solid var(--border)",
                    boxShadow: "var(--shadow)",
                    display: "inline-block",
                    flexShrink: 0,
                  }}
                  aria-hidden="true"
                />
                <span className="subtle">{currentTheme.label} · 탭해서 바꾸기</span>
              </button>

              {pickerOpen && (
                <div style={{ display: "flex", gap: 14, marginTop: 16 }}>
                  <button
                    onClick={() => setCategory("plain")}
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
                      gap: 6,
                      background: "none",
                      border: "none",
                      padding: 0,
                    }}
                  >
                    <span
                      style={{
                        width: 48,
                        height: 48,
                        borderRadius: "50%",
                        background: "var(--accent)",
                        border: category === "plain" ? "2px solid var(--accent-strong)" : "2px solid var(--border)",
                        boxShadow: "var(--shadow)",
                        display: "inline-block",
                      }}
                      aria-hidden="true"
                    />
                    <span style={{ fontSize: 12, fontWeight: category === "plain" ? 700 : 400, color: category === "plain" ? "var(--accent-strong)" : "var(--text-soft)" }}>
                      색깔
                    </span>
                  </button>
                  <button
                    onClick={() => setCategory("paw")}
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
                      gap: 6,
                      background: "none",
                      border: "none",
                      padding: 0,
                    }}
                  >
                    <span
                      style={{
                        width: 48,
                        height: 48,
                        borderRadius: "50%",
                        background: "var(--surface)",
                        border: category === "paw" ? "2px solid var(--accent-strong)" : "2px solid var(--border)",
                        boxShadow: "var(--shadow)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontSize: 20,
                      }}
                    >
                      🐾
                    </span>
                    <span style={{ fontSize: 12, fontWeight: category === "paw" ? 700 : 400, color: category === "paw" ? "var(--accent-strong)" : "var(--text-soft)" }}>
                      발자국
                    </span>
                  </button>
                </div>
              )}

              {pickerOpen && (
                <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginTop: 14 }}>
                  {THEMES.filter((t) => t.category === category).map((t) => (
                    <button
                      key={t.id}
                      onClick={() => handleSelectTheme(t.id)}
                      style={{
                        display: "flex",
                        flexDirection: "column",
                        alignItems: "center",
                        gap: 6,
                        padding: "8px 4px",
                        border: theme === t.id ? "2px solid var(--accent)" : "2px solid transparent",
                        borderRadius: 12,
                        background: "none",
                        width: 64,
                      }}
                    >
                      <span
                        style={{
                          width: 32,
                          height: 32,
                          borderRadius: "50%",
                          background: t.swatch,
                          display: "inline-block",
                          border: "1px solid var(--border)",
                          boxShadow: "var(--shadow)",
                        }}
                        aria-hidden="true"
                      />
                      <span style={{ fontSize: 11.5, color: theme === t.id ? "var(--accent-strong)" : "var(--text-soft)", fontWeight: theme === t.id ? 700 : 400 }}>
                        {t.label}
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className="card" style={{ marginTop: 14 }}>
              <button
                onClick={() => { setSettingsOpen(false); onOpenHelp(); }}
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
                onClick={() => { setSettingsOpen(false); onOpenContact(); }}
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

function WeightCard({ dog, onOpen }) {
  const list = getTimeline(dog.id).filter((r) => r.type === "weight").sort((a, b) => a.at.localeCompare(b.at));
  const [prev, latest] = [list.at(-2), list.at(-1)];
  const diff = latest && prev ? Math.round((latest.data.weightKg - prev.data.weightKg) * 100) / 100 : null;
  return (
    <button type="button" className="mini-card" onClick={onOpen}>
      <span className="mini-card-title">⚖️ 체중</span>
      <span className="mini-card-text">
        {!latest ? "아직 기록이 없습니다" : `${latest.data.weightKg}kg (${md(latest.at.slice(0, 10))})${diff == null ? " · 비교할 기록 없음" : ` · 이전 대비 ${diff > 0 ? "+" : ""}${diff}kg`}`}
      </span>
    </button>
  );
}

function MedCard({ dog, onOpen }) {
  const meds = getMeds(dog.id).filter((m) => !isEnded(m));
  const doses = getDosesForDate(dog.id, todayKey());
  const check = doses.filter((d) => d.status === "check").length;
  return (
    <button type="button" className="mini-card" onClick={onOpen}>
      <span className="mini-card-title">💊 복약</span>
      <span className="mini-card-text">
        {meds.length === 0
          ? "먹는 약이 없습니다"
          : doses.length === 0
            ? `약 ${new Set(meds.map((m) => m.seriesId)).size}개 · 오늘은 없음`
            : `오늘 ${doses.filter((d) => d.status === "done").length}/${doses.length} 먹였어요${check ? ` · 확인 필요 ${check}` : ""}`}
      </span>
    </button>
  );
}

function UpcomingCard({ dog, onOpenCalendar }) {
  const today = todayKey();
  const until = toDateKey(addDays(new Date(), 60));
  const items = Object.entries(getEventsByDog(dog.id))
    .filter(([date]) => date >= today && date <= until)
    .flatMap(([date, list]) => list.filter((e) => VISIT_WORDS.test(e.title)).map((e) => ({ date, title: e.title })))
    .sort((a, b) => a.date.localeCompare(b.date))
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

function RecentRecords({ dog, onOpen }) {
  const recent = filterTimeline(getTimeline(dog.id)).slice(0, 3);
  if (recent.length === 0) return <p className="subtle" style={{ margin: 0 }}>아직 기록이 없습니다. 체중·증상·식사 등 첫 기록을 남겨 보세요.</p>;
  return recent.map((r) => (
    <button key={`${r.source}-${r.id}`} type="button" className="rec-mini" onClick={onOpen}>
      <span aria-hidden="true">{TYPES[r.type].icon}</span>
      <span className="faint">{md(r.at.slice(0, 10))}</span>
      <span className="rec-mini-text">{TYPES[r.type].label} · {summarize(r)}</span>
    </button>
  ));
}
