import { useId, useState } from "react";

// 흐린 설명 글 대신: 설명할 제목·버튼 바로 옆 작은 ? 동그라미 → 누르면 그 줄 밑에 "무엇에 대한 설명인지" 제목과 함께 펼치고, 다시 누르면 접는다(사용자 요청 11/9)
// 쓰는 법: const [tip, panel] = useHelpTip("조용한 시간", "…설명"); → 제목 글자 바로 뒤에 {tip}, 그 줄 밑에 {panel}
// 남기는 것(? 로 숨기지 않음): 진단 아님·응급 같은 안전 문구, 저장됨·오류 같은 상태, 빈 화면 안내
export function useHelpTip(about, text) {
  const [on, setOn] = useState(false);
  const id = useId();
  const tip = (
    <button type="button" className={`help-tip${on ? " on" : ""}`} aria-expanded={on} aria-controls={id} aria-label={`${about} 설명 ${on ? "접기" : "보기"}`} onClick={(e) => (e.preventDefault(), e.stopPropagation(), setOn((v) => !v))}>
      <span aria-hidden="true">?</span>
    </button>
  );
  const panel = on ? (
    <div className="help-tip-text" id={id}>
      <b>{about}</b>
      <span>{text}</span>
    </div>
  ) : null;
  return [tip, panel];
}
