import { useState } from "react";
import { createDog } from "../models/dog";
import { saveDog } from "../services/dogRepository";
import { BREEDS } from "../data/breeds";
import { addWeightRecord } from "../services/weightLog";
import { localNow } from "../services/records";
import { todayKey } from "../utils/date";

const DEV_TEST_DOG = {
  name: "여름",
  birthDate: "2026-07-08",
  breed: "포메라니안",
  gender: "female",
  weight: "1.8",
  notes: "색상: 블랙탄",
};

export default function DogRegister({ onRegistered, onCancel }) {
  const [form, setForm] = useState({
    name: "",
    birthDate: "",
    ageEstimated: false,
    breed: "",
    gender: "female",
    weight: "",
    neutered: false,
    adoptionDate: "",
    food: "",
    allergies: "",
    notes: "",
  });
  const [error, setError] = useState("");

  function update(key, value) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  function fillDevTestData() {
    setForm((f) => ({ ...f, ...DEV_TEST_DOG }));
  }

  function handleSubmit(e) {
    e.preventDefault();
    if (!form.name.trim() || !form.birthDate || !form.breed.trim() || !form.gender) {
      setError("이름, 생년월일, 견종, 성별은 필수 항목이에요.");
      return;
    }
    if (form.birthDate > todayKey()) return setError("생년월일을 오늘 이전 날짜로 골라 주세요.");
    if (form.weight && !(Number(form.weight) > 0 && Number(form.weight) < 120)) return setError("체중을 0.1~120kg 사이로 적어 주세요.");
    const dog = createDog(form);
    saveDog(dog);
    // 처음 등록과 같게: 적은 체중은 체중 관리에도 기록(프로필 몸무게 칸·그래프에 바로 보이게)
    if (dog.weight) addWeightRecord(dog.id, { weightKg: dog.weight, measuredAt: `${localNow()}:00`, note: "처음 등록" });
    onRegistered(dog);
  }

  return (
    <div className="screen">
      {onCancel && (
        <button type="button" className="btn-ghost" style={{ marginBottom: 12 }} onClick={onCancel}>
          ← 취소
        </button>
      )}
      <div className="h1">강아지 등록</div>
      <p className="subtle" style={{ marginBottom: 18 }}>
        기본 정보를 입력하면 지금 우리 강아지에게 필요한 케어를 알려드려요.
      </p>

      <form onSubmit={handleSubmit}>
        <div className="field">
          <label>이름 *</label>
          <input value={form.name} maxLength={20} onChange={(e) => update("name", e.target.value)} placeholder="예: 여름" />
        </div>

        <div className="field">
          <label>생년월일 *</label>
          <input
            type="date"
            value={form.birthDate}
            max={todayKey()}
            onChange={(e) => update("birthDate", e.target.value)}
          />
          <label className="rec-check" style={{ marginTop: 6 }}>
            <input type="checkbox" checked={form.ageEstimated} onChange={(e) => update("ageEstimated", e.target.checked)} />
            정확하지 않은 추정 날짜예요
          </label>
        </div>

        <div className="field">
          <label>견종 *</label>
          <select value={form.breed} onChange={(e) => update("breed", e.target.value)}>
            <option value="" disabled>
              선택해주세요
            </option>
            {BREEDS.map((b) => (
              <option key={b} value={b}>
                {b}
              </option>
            ))}
          </select>
        </div>

        <div className="field">
          <label>성별 *</label>
          <select value={form.gender} onChange={(e) => update("gender", e.target.value)}>
            <option value="male">남자 ♂</option>
            <option value="female">여자 ♀</option>
          </select>
        </div>

        <div className="field">
          <label>체중 (kg)</label>
          <input
            type="number"
            step="0.1"
            value={form.weight}
            onChange={(e) => update("weight", e.target.value)}
            placeholder="모르면 나중에 적어도 돼요"
          />
        </div>

        <div className="field">
          <label style={{ flexDirection: "row", display: "flex", alignItems: "center", gap: 8 }}>
            <input
              type="checkbox"
              checked={form.neutered}
              onChange={(e) => update("neutered", e.target.checked)}
              style={{ width: 18, height: 18 }}
            />
            중성화 완료
          </label>
        </div>

        <div className="field">
          <label>입양일</label>
          <input type="date" value={form.adoptionDate} onChange={(e) => update("adoptionDate", e.target.value)} />
        </div>

        <div className="field">
          <label>사료</label>
          <input value={form.food} onChange={(e) => update("food", e.target.value)} placeholder="예: 로얄캐닌 미니 퍼피" />
        </div>

        <div className="field">
          <label>알레르기</label>
          <input value={form.allergies} onChange={(e) => update("allergies", e.target.value)} placeholder="없으면 비워두세요" />
        </div>

        <div className="field">
          <label>보호자 메모</label>
          <textarea rows={3} value={form.notes} onChange={(e) => update("notes", e.target.value)} />
        </div>

        {error && <div className="error-text" style={{ marginBottom: 12 }}>{error}</div>}

        <button type="submit" className="btn-primary" style={{ marginBottom: 10 }}>
          등록하기
        </button>
        {import.meta.env.DEV && (
          <button type="button" className="btn-ghost" style={{ width: "100%" }} onClick={fillDevTestData}>
            테스트 데이터 채우기 (개발용)
          </button>
        )}
      </form>
    </div>
  );
}
