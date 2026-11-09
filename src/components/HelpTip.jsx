import { useState } from "react";

// 흐린 설명 글 대신: 작은 ? 동그라미를 누르면 그 밑에 설명이 펼쳐지고, 다시 누르면 접힌다(사용자 요청 11/9, 달력 범례부터 시험)
// 쓰는 법: const [tip, open] = useHelpTip("…설명"); → 제목 줄 끝에 {tip}, 그 밑에 {open}
export function useHelpTip(text, label = "설명 보기") {
  const [on, setOn] = useState(false);
  const tip = (
    <button type="button" className={`help-tip${on ? " on" : ""}`} aria-expanded={on} aria-label={on ? "설명 접기" : label} onClick={() => setOn((v) => !v)}>
      <span aria-hidden="true">?</span>
    </button>
  );
  return [tip, on ? <p className="help-tip-text">{text}</p> : null];
}
