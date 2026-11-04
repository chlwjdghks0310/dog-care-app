import { useMemo } from "react";
import { reactionFor, reactionContext } from "../data/recordReactions";
import { getTimeline } from "../services/records";

import Ico from "./Ico";
export default function DogReaction({ dog, rec, onClose }) {
  // 다시 그려도 문구가 바뀌지 않게 기록마다 한 번만 고른다
  const r = useMemo(() => reactionFor(rec, { ...reactionContext(rec, getTimeline(dog.id)), dogName: dog.name }), [rec]); // eslint-disable-line react-hooks/exhaustive-deps
  // 축하 조각 위치는 한 번만 정한다
  const pieces = useMemo(() => Array.from({ length: 14 }, (_, i) => ({ left: `${(i * 37) % 100}%`, delay: `${(i % 7) * 0.06}s`, hue: i % 4 })), []);
  return (
    <div className={`card dog-react${r.concern ? " concern" : ""}`} role="status">
      {!r.concern && !r.quiet && (
        <div className="confetti" aria-hidden="true">
          {pieces.map((p, i) => (
            <span key={i} className={`c${p.hue}`} style={{ left: p.left, animationDelay: p.delay }} />
          ))}
        </div>
      )}
      <div className="dog-react-row">
        {dog.photo ? <img className="dog-react-face" src={dog.photo} alt="" /> : <span className="dog-react-face emoji" aria-hidden="true"><Ico name="dog" size={26} /></span>}
        <div className="dog-react-bubble">
          <span className="faint">{dog.name}</span>
          <div>{r.line}</div>
        </div>
      </div>
      {r.tip && (
        <div className="dog-react-tip">
          <b>알아 두면 좋아요</b>
          <div>{r.tip}</div>
        </div>
      )}
      <button type="button" className="link-btn" onClick={onClose}>닫기</button>
    </div>
  );
}
