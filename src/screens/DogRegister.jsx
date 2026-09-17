import { useState } from "react";
import { createDog } from "../models/dog";
import { saveDog } from "../services/dogRepository";

const DEV_TEST_DOG = {
  name: "여름",
  birthDate: "2026-07-08",
  breed: "포메라니안",
  gender: "female",
  weight: "1.8",
  notes: "색상: 블랙탄",
};

export default function DogRegister({ onRegistered }) {
  const [form, setForm] = useState({
    name: "",
    birthDate: "",
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
    if (!form.name.trim() || !form.birthDate || !form.breed.trim() || !form.gender || !form.weight) {
      setError("이름, 생년월일, 견종, 성별, 체중은 필수 항목이에요.");
      return;
    }
    if (Number(form.weight) <= 0) {
      setError("체중은 0보다 큰 값으로 입력해 주세요.");
      return;
    }
    const dog = createDog(form);
    saveDog(dog);
    onRegistered(dog);
  }

  return (
    <div className="screen">
      <div className="h1">강아지 등록</div>
      <p className="subtle" style={{ marginBottom: 18 }}>
        기본 정보를 입력하면 지금 우리 강아지에게 필요한 케어를 알려드려요.
      </p>

      <form onSubmit={handleSubmit}>
        <div className="field">
          <label>이름 *</label>
          <input value={form.name} onChange={(e) => update("name", e.target.value)} placeholder="예: 여름" />
        </div>

        <div className="field">
          <label>생년월일 *</label>
          <input
            type="date"
            value={form.birthDate}
            max={new Date().toISOString().slice(0, 10)}
            onChange={(e) => update("birthDate", e.target.value)}
          />
        </div>

        <div className="field">
          <label>견종 *</label>
          <input value={form.breed} onChange={(e) => update("breed", e.target.value)} placeholder="예: 포메라니안" />
        </div>

        <div className="field">
          <label>성별 *</label>
          <select value={form.gender} onChange={(e) => update("gender", e.target.value)}>
            <option value="female">암컷</option>
            <option value="male">수컷</option>
          </select>
        </div>

        <div className="field">
          <label>체중 (kg) *</label>
          <input
            type="number"
            step="0.1"
            value={form.weight}
            onChange={(e) => update("weight", e.target.value)}
            placeholder="예: 1.8"
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
          <label>특이사항</label>
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
