import { useState } from "react";
import { calculateAge, formatAge } from "../utils/age";
import { formatKoreanDate } from "../utils/date";
import { THEMES, getTheme, setTheme } from "../services/themeSettings";
import { getPermission, isNotificationSupported, requestPermission } from "../services/notifications";
import { resizeImageFile } from "../utils/image";
import { saveDog } from "../services/dogRepository";

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

export default function Profile({ dog, onOpenContact, onOpenHelp, onUpdateDog, onDeleteCurrent, onDeleteAll, onAddDog }) {
  const age = calculateAge(dog.birthDate);
  const [theme, setThemeState] = useState(getTheme());
  const [pickerOpen, setPickerOpen] = useState(false);
  const currentTheme = THEMES.find((t) => t.id === theme) || THEMES[0];
  const [category, setCategory] = useState(currentTheme.category);
  const [notifPermission, setNotifPermission] = useState(getPermission());
  const [editing, setEditing] = useState(false);
  const [editForm, setEditForm] = useState(null);

  function startEdit() {
    setEditForm({ name: dog.name, weight: dog.weight ?? "", food: dog.food || "", neutered: dog.neutered });
    setEditing(true);
  }

  function handleSaveEdit() {
    const name = editForm.name.trim();
    if (!name) return;
    const updated = saveDog({
      ...dog,
      name,
      weight: editForm.weight ? Number(editForm.weight) : null,
      food: editForm.food.trim(),
      neutered: editForm.neutered,
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
      </div>

      <div className="card" style={{ marginBottom: 14 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
          <div className="h2" style={{ margin: 0 }}>강아지 정보</div>
          {!editing ? (
            <button className="btn-ghost" style={{ padding: "4px 10px", fontSize: 12.5 }} onClick={startEdit}>
              수정
            </button>
          ) : (
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

        <Row label="생년월일" value={formatKoreanDate(dog.birthDate.replaceAll("-", "-"))} />
        <Row label="견종" value={dog.breed} />
        <Row label="성별" value={GENDER_LABEL[dog.gender]} />

        {editing ? (
          <>
            <div className="field" style={{ marginTop: 10 }}>
              <label>이름</label>
              <input value={editForm.name} onChange={(e) => setEditForm((f) => ({ ...f, name: e.target.value }))} />
            </div>
            <div className="field">
              <label>체중 (kg)</label>
              <input
                type="number"
                step="0.1"
                value={editForm.weight}
                onChange={(e) => setEditForm((f) => ({ ...f, weight: e.target.value }))}
                placeholder="모르면 비워두세요"
              />
            </div>
            <div className="field">
              <label style={{ flexDirection: "row", display: "flex", alignItems: "center", gap: 8 }}>
                <input
                  type="checkbox"
                  checked={editForm.neutered}
                  onChange={(e) => setEditForm((f) => ({ ...f, neutered: e.target.checked }))}
                  style={{ width: 18, height: 18 }}
                />
                중성화 완료
              </label>
            </div>
            <div className="field">
              <label>사료</label>
              <input
                value={editForm.food}
                onChange={(e) => setEditForm((f) => ({ ...f, food: e.target.value }))}
                placeholder="예: 로얄캐닌 미니 퍼피"
              />
            </div>
          </>
        ) : (
          <>
            <Row label="체중" value={dog.weight ? `${dog.weight}kg` : ""} />
            <Row label="중성화" value={dog.neutered ? "완료" : "미완료"} />
            <Row label="사료" value={dog.food} />
          </>
        )}

        <Row label="입양일" value={dog.adoptionDate ? formatKoreanDate(dog.adoptionDate) : ""} />
        <Row label="알레르기" value={dog.allergies} />
        <Row label="특이사항" value={dog.notes} />
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
          onClick={onOpenHelp}
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
          onClick={onOpenContact}
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
    </div>
  );
}
