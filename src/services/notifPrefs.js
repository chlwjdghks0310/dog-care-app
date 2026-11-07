// 알림 종류별 켜고 끄기 + 조용한 시간. 웹 푸시엔 안드로이드 같은 채널이 없어서 앱이 직접 거른다.
// 근거: ../자료용/자료/2026-11-07-1단계-남은것-조사.md ③(Apple HIG: 같은 알림을 자주 보내면 앱 알림 전체를 끔)
import { readJSON, writeJSON } from "./storage";

const KEY = "dogcare-notif-prefs-v1";
export const CATS = [
  { id: "med", label: "약 먹일 시간", quietOk: true }, // 조용한 시간에도 울림(약은 시간이 중요)
  { id: "custom", label: "내가 만든 알람·일정 알림", quietOk: true }, // 직접 정한 시각이라 그대로
  { id: "care", label: "오늘 할 일(양치·산책 등 추천)" },
  { id: "meal", label: "밥 시간(사료 불리기)", quietOk: true }, // 보호자가 정한 급여 시각 기준
  { id: "food", label: "사료 떨어짐 예고" },
  { id: "report", label: "주간 리포트(일요일 밤)" },
];
const DEFAULT = { quiet: { on: true, from: "22:00", to: "08:00" } };
export const getNotifPrefs = () => ({ ...DEFAULT, ...readJSON(KEY, {}) });
export const saveNotifPrefs = (p) => writeJSON(KEY, p);

const mins = (t) => Number(t.slice(0, 2)) * 60 + Number(t.slice(3, 5));
// from~to(자정을 넘을 수 있음) 안이면 true
export function inQuiet(time, quiet) {
  if (!quiet?.on) return false;
  const t = mins(time), f = mins(quiet.from), e = mins(quiet.to);
  return f <= e ? t >= f && t < e : t >= f || t < e;
}
// 종류가 꺼졌거나, 조용한 시간에 걸리는(약·직접 만든 알람 제외) 알림을 뺀다. 하루 체크(check)는 자기 설정을 따로 쓴다.
export function allowed(cat, time, prefs = getNotifPrefs()) {
  if (prefs[cat] === false) return false;
  const c = CATS.find((x) => x.id === cat);
  return Boolean(c?.quietOk) || !inQuiet(time, prefs.quiet);
}
