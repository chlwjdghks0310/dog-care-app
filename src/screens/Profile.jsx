import { calculateAge, formatAge } from "../utils/age";
import { formatKoreanDate } from "../utils/date";

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

export default function Profile({ dog }) {
  const age = calculateAge(dog.birthDate);

  return (
    <div className="screen">
      <div className="h1">{dog.name}</div>
      <p className="subtle" style={{ marginBottom: 16 }}>{formatAge(age)} · {dog.breed}</p>

      <div className="card">
        <Row label="생년월일" value={formatKoreanDate(dog.birthDate.replaceAll("-", "-"))} />
        <Row label="견종" value={dog.breed} />
        <Row label="성별" value={GENDER_LABEL[dog.gender]} />
        <Row label="체중" value={dog.weight ? `${dog.weight}kg` : ""} />
        <Row label="중성화" value={dog.neutered ? "완료" : "미완료"} />
        <Row label="입양일" value={dog.adoptionDate ? formatKoreanDate(dog.adoptionDate) : ""} />
        <Row label="사료" value={dog.food} />
        <Row label="알레르기" value={dog.allergies} />
        <Row label="특이사항" value={dog.notes} />
      </div>
    </div>
  );
}
