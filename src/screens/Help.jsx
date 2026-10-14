import { useState } from "react";

const KEY_POINTS = [
  "AI 답변과 사진/영상 분석은 참고용 소견이에요. 진단이나 처방이 아니니, 이상하다 싶으면 꼭 병원에 문의하세요.",
  "알림·알람은 이 앱(브라우저 탭)이 켜져 있을 때만 울려요. 완전히 끈 상태에선 동작하지 않아요.",
  "모든 데이터(강아지 정보, 체크리스트, 알람 등)는 이 기기의 브라우저에만 저장돼요. 다른 기기·브라우저에서는 보이지 않아요.",
];

const SECTIONS = [
  {
    category: "🐶 메인 화면 (AI 챗봇)",
    items: [
      {
        q: "메인 화면에서 뭘 할 수 있나요?",
        a: "강아지 캐릭터에게 자유롭게 질문할 수 있어요. 사료, 행동, 훈련, 건강 등 무엇이든 물어보면 우리 강아지 정보(월령·견종 등)에 맞춰 답해줘요.",
      },
      {
        q: "사진이나 영상도 보낼 수 있나요?",
        a: "입력창 왼쪽 📷 버튼으로 사진이나 영상을 올리면 AI가 함께 분석해서 답해줘요. 건강 체크 탭의 변 상태·활동 상태 확인과 같은 AI를 사용해요.",
      },
      {
        q: "답변이 이상하거나 서버 연결 실패가 떠요.",
        a: "\"AI 서버 연결 안 됨\"이 보이면 서버가 꺼져 있거나 네트워크 문제예요. 잠시 후 다시 물어보거나, 반복되면 문의하기로 알려주세요.",
        caution: "AI 답변은 참고용이에요. 응급 상황이면 바로 병원에 연락하세요.",
      },
    ],
  },
  {
    category: "✅ 체크리스트",
    items: [
      {
        q: "체크리스트는 어떻게 만들어지나요?",
        a: "강아지의 월령·견종에 맞춰 수의학 가이드 기반으로 \"오늘 해야 할 일\"이 자동으로 채워져요. 항목을 누르면 체크 표시가 되고, 하루가 지나면 다시 초기화돼요.",
      },
      {
        q: "이번 주 핵심 / 다가오는 일정은 뭔가요?",
        a: "이번 주에 특히 챙기면 좋은 항목과, 앞으로 몇 주 뒤부터 중요해질 항목을 미리 보여줘요. \"더보기\"를 누르면 이번 주 탭에서 전체를 볼 수 있어요.",
      },
      {
        q: "강아지 사진은 어디서 바꾸나요?",
        a: "체크리스트 탭 맨 위 강아지 사진을 눌러서 새 사진으로 바꿀 수 있어요.",
      },
    ],
  },
  {
    category: "🩺 건강 체크",
    items: [
      {
        q: "변 상태 확인은 어떻게 하나요?",
        a: "대변 사진을 찍어 올리면 퓨리나 대변 점수표 기준으로 굳기와 색상을 참고로 알려줘요.",
      },
      {
        q: "활동 상태 확인은 어떻게 하나요?",
        a: "짧은 영상을 올리면 걸음걸이, 자세, 스트레스 신호 등을 참고로 짚어줘요. 영상은 몇 초 분량이면 충분해요.",
        caution: "둘 다 참고 소견이에요. 진단을 대신하지 않으니 증상이 지속되면 병원에 가주세요.",
      },
    ],
  },
  {
    category: "🍚 사료 계산기",
    items: [
      {
        q: "하루 사료량은 어떻게 계산되나요?",
        a: "AAHA/WSAVA 대사에너지요구량(DER) 공식과 반려동물 영양학 자료를 기반으로, 강아지의 월령과 체중에 맞춰 하루 권장 급여량(g, kcal)을 계산해요.",
      },
      {
        q: "사료 열량(kcal/100g)을 꼭 입력해야 하나요?",
        a: "아니요. 입력하지 않으면 일반적인 평균치로 계산해요. 더 정확히 알고 싶으면 사료 봉투에 적힌 kcal/100g을 입력하세요.",
      },
      {
        q: "급여 시각을 설정하면 뭐가 달라지나요?",
        a: "설정한 급여 시각 30분 전에 \"사료 불리기\" 알림을 보내드려요. 사료를 불려야 하는 시기인지도 함께 알려줘요.",
      },
    ],
  },
  {
    category: "⏰ 알림 / 알람",
    items: [
      {
        q: "알림이 안 와요.",
        a: "두 가지를 확인해주세요. (1) 알림 권한을 켰는지 — 🔔 켜기 버튼으로 허용해야 해요. (2) 이 앱 탭이 켜져 있는지 — 브라우저를 완전히 종료하면 알림도 멈춰요.",
      },
      {
        q: "커스텀 알람은 어떻게 추가하나요?",
        a: "알림·알람 탭에서 제목, 시각, 알람 소리를 정해 추가하면 그 시각에 소리와 함께 알려드려요. 소리는 추가 전에 미리 들어볼 수 있어요.",
      },
      {
        q: "알람을 끄거나 지우고 싶어요.",
        a: "등록된 알람 목록에서 체크박스로 켜고 끌 수 있고, 삭제 버튼으로 완전히 지울 수 있어요.",
      },
    ],
  },
  {
    category: "📖 강아지 정보",
    items: [
      {
        q: "\"지금 중요해요\" 표시는 뭔가요?",
        a: "지금 우리 강아지의 월령·견종에 해당하는 항목에 붙는 표시예요. 항목을 누르면 왜 중요한지, 어떻게 하면 되는지, 주의할 점과 출처까지 자세히 볼 수 있어요.",
      },
    ],
  },
  {
    category: "🐾 프로필",
    items: [
      {
        q: "배경 테마는 어떻게 바꾸나요?",
        a: "프로필 탭 \"배경 테마\"를 눌러 원하는 색상을 고르면 앱 전체 배경이 바로 바뀌어요.",
      },
      {
        q: "강아지 정보(생년월일, 견종 등)를 고칠 수 있나요?",
        a: "현재는 사진만 체크리스트 탭에서 바꿀 수 있어요. 다른 정보 수정이 필요하면 문의하기로 알려주세요.",
      },
      {
        q: "문의는 어떻게 하나요?",
        a: "프로필 탭의 \"문의하기\"에서 내용을 적고 보내면, 메일 앱으로 바로 연결돼서 전달할 수 있어요.",
      },
    ],
  },
];

export default function Help({ onBack }) {
  const [openIds, setOpenIds] = useState(new Set());

  function toggle(id) {
    setOpenIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  return (
    <div className="screen">
      <button className="btn-ghost" style={{ marginBottom: 12 }} onClick={onBack}>
        ← 프로필로
      </button>
      <div className="h1">도움말</div>
      <p className="subtle" style={{ marginBottom: 16 }}>
        멍케어를 더 잘 쓰는 법을 모아봤어요. 궁금한 항목을 눌러서 펼쳐보세요.
      </p>

      <div
        className="card"
        style={{ marginBottom: 16, background: "var(--accent-soft)", border: "1px solid var(--accent-soft)" }}
      >
        <div className="h2">꼭 알아두세요</div>
        {KEY_POINTS.map((point, i) => (
          <p key={i} className="subtle" style={{ marginTop: i === 0 ? 4 : 8 }}>
            • {point}
          </p>
        ))}
      </div>

      {SECTIONS.map((section) => (
        <div key={section.category} className="card" style={{ marginBottom: 12 }}>
          <div className="h2">{section.category}</div>
          {section.items.map((item, i) => {
            const id = `${section.category}-${i}`;
            const isOpen = openIds.has(id);
            return (
              <div key={id} style={{ borderTop: "1px solid var(--border)", paddingTop: 10, marginTop: 10 }}>
                <button
                  onClick={() => toggle(id)}
                  style={{ background: "none", border: "none", padding: 0, width: "100%", textAlign: "left" }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8 }}>
                    <span style={{ fontWeight: 600 }}>{item.q}</span>
                    <span className="faint" aria-hidden="true">{isOpen ? "▾" : "▸"}</span>
                  </div>
                </button>
                {isOpen && (
                  <div style={{ marginTop: 6 }}>
                    <p className="subtle">{item.a}</p>
                    {item.caution && <p className="error-text">주의: {item.caution}</p>}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      ))}
    </div>
  );
}
