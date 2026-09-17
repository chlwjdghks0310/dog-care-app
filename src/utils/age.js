// 생년월일 기준으로 오늘 시점의 나이를 계산한다.
// 일/주 단위는 정확한 경과일로, 개월 단위는 달력 월 기준으로 계산한다.
export function calculateAge(birthDate, atDate = new Date()) {
  const birth = new Date(birthDate);
  const at = new Date(atDate);

  const ageInDays = Math.max(0, Math.floor((at - birth) / (1000 * 60 * 60 * 24)));
  const ageInWeeks = Math.floor(ageInDays / 7);

  let months = (at.getFullYear() - birth.getFullYear()) * 12 + (at.getMonth() - birth.getMonth());
  if (at.getDate() < birth.getDate()) months -= 1;
  const ageInMonths = Math.max(0, months);

  return { ageInDays, ageInWeeks, ageInMonths };
}

export function formatAge({ ageInWeeks, ageInMonths }) {
  if (ageInWeeks < 8) return `생후 ${ageInWeeks}주`;
  if (ageInMonths < 1) return `생후 ${ageInWeeks}주`;
  if (ageInMonths < 24) return `${ageInMonths}개월령`;
  return `${Math.floor(ageInMonths / 12)}세`;
}
