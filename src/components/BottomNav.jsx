const TABS = [
  { key: "main", label: "메인", icon: "🐶" },
  { key: "home", label: "체크리스트", icon: "✅" },
  { key: "week", label: "이번 주", icon: "📅" },
  { key: "profile", label: "프로필", icon: "🐾" },
];

export default function BottomNav({ active, onChange }) {
  return (
    <nav className="bottom-nav">
      {TABS.map((tab) => (
        <button
          key={tab.key}
          className={`nav-item${active === tab.key ? " active" : ""}`}
          onClick={() => onChange(tab.key)}
        >
          <span aria-hidden="true">{tab.icon}</span>
          <span>{tab.label}</span>
        </button>
      ))}
    </nav>
  );
}
