// 견종별 대략적인 외형 특징 + 건강 특이사항 플래그.
// 외형은 3D 아바타 생성에, sizeCategory/brachycephalic 플래그는 견종별 케어 규칙 매칭에도 재사용한다.
// 실제 3D 스캔 데이터가 아니라 절차적으로 캐릭터를 생성하기 위한 근사치 프리셋이며,
// 키워드가 일치하지 않으면 DEFAULT를 사용한다.
const PRESETS = [
  { keys: ["포메라니안"], color: 0xe0a24a, size: 0.75, earStyle: "pointy", fluffy: true, curlyTail: true, snoutLength: 0.5, sizeCategory: "small", brachycephalic: false },
  { keys: ["말티즈"], color: 0xf5f2ea, size: 0.7, earStyle: "floppy", fluffy: true, curlyTail: false, snoutLength: 0.55, sizeCategory: "small", brachycephalic: false },
  { keys: ["푸들"], color: 0xd9b98a, size: 0.85, earStyle: "floppy", fluffy: true, curlyTail: false, snoutLength: 0.6, sizeCategory: "medium", brachycephalic: false },
  { keys: ["시츄"], color: 0xb98a5c, size: 0.7, earStyle: "floppy", fluffy: true, curlyTail: false, snoutLength: 0.25, sizeCategory: "small", brachycephalic: true },
  { keys: ["비숑"], color: 0xf7f4ec, size: 0.75, earStyle: "floppy", fluffy: true, curlyTail: false, snoutLength: 0.5, sizeCategory: "small", brachycephalic: false },
  { keys: ["진돗개", "진도"], color: 0xd8b676, size: 1.05, earStyle: "pointy", fluffy: false, curlyTail: true, snoutLength: 0.75, sizeCategory: "medium", brachycephalic: false },
  { keys: ["시바", "시베"], color: 0xc9722c, size: 0.9, earStyle: "pointy", fluffy: false, curlyTail: true, snoutLength: 0.65, sizeCategory: "medium", brachycephalic: false },
  { keys: ["웰시코기", "코기"], color: 0xd9a24a, size: 0.8, earStyle: "pointy", fluffy: false, curlyTail: false, snoutLength: 0.6, shortLegs: true, sizeCategory: "medium", brachycephalic: false },
  { keys: ["골든", "리트리버"], color: 0xdcb15c, size: 1.2, earStyle: "floppy", fluffy: false, curlyTail: false, snoutLength: 0.8, sizeCategory: "large", brachycephalic: false },
  { keys: ["래브라도"], color: 0xdac9a0, size: 1.2, earStyle: "floppy", fluffy: false, curlyTail: false, snoutLength: 0.8, sizeCategory: "large", brachycephalic: false },
  { keys: ["치와와"], color: 0xc79a5c, size: 0.55, earStyle: "pointy", fluffy: false, curlyTail: false, snoutLength: 0.35, sizeCategory: "small", brachycephalic: false },
  { keys: ["닥스훈트", "닥스"], color: 0x8a4a2c, size: 0.7, earStyle: "floppy", fluffy: false, curlyTail: false, snoutLength: 0.6, longBody: true, shortLegs: true, sizeCategory: "small", brachycephalic: false },
  { keys: ["보더콜리"], color: 0x2b2320, size: 1.0, earStyle: "floppy", fluffy: false, curlyTail: false, snoutLength: 0.7, patchColor: 0xffffff, sizeCategory: "medium", brachycephalic: false },
  { keys: ["요크셔테리어", "요크셔"], color: 0x5a4536, size: 0.55, earStyle: "pointy", fluffy: true, curlyTail: false, snoutLength: 0.4, sizeCategory: "small", brachycephalic: false },
  { keys: ["비글"], color: 0xc9995c, size: 0.85, earStyle: "floppy", fluffy: false, curlyTail: false, snoutLength: 0.7, patchColor: 0xffffff, sizeCategory: "medium", brachycephalic: false },
  { keys: ["슈나우저"], color: 0x8f8778, size: 0.8, earStyle: "pointy", fluffy: true, curlyTail: false, snoutLength: 0.55, sizeCategory: "medium", brachycephalic: false },
  { keys: ["프렌치불독", "프렌치 불독"], color: 0xd9c19a, size: 0.75, earStyle: "pointy", fluffy: false, curlyTail: false, snoutLength: 0.15, sizeCategory: "medium", brachycephalic: true },
  { keys: ["불독", "불도그"], color: 0xc9a25c, size: 0.9, earStyle: "floppy", fluffy: false, curlyTail: false, snoutLength: 0.15, sizeCategory: "medium", brachycephalic: true },
  { keys: ["퍼그"], color: 0xc9a86a, size: 0.6, earStyle: "floppy", fluffy: false, curlyTail: true, snoutLength: 0.1, sizeCategory: "small", brachycephalic: true },
  { keys: ["페키니즈"], color: 0xc9985c, size: 0.6, earStyle: "floppy", fluffy: true, curlyTail: false, snoutLength: 0.15, sizeCategory: "small", brachycephalic: true },
  { keys: ["사모예드"], color: 0xfaf8f2, size: 1.1, earStyle: "pointy", fluffy: true, curlyTail: true, snoutLength: 0.7, sizeCategory: "large", brachycephalic: false },
  { keys: ["허스키", "시베리안"], color: 0xb8bfc4, size: 1.1, earStyle: "pointy", fluffy: true, curlyTail: false, snoutLength: 0.75, sizeCategory: "large", brachycephalic: false },
  { keys: ["말라뮤트"], color: 0xb0895c, size: 1.3, earStyle: "pointy", fluffy: true, curlyTail: false, snoutLength: 0.8, sizeCategory: "large", brachycephalic: false },
  { keys: ["잭러셀"], color: 0xf2ede0, size: 0.6, earStyle: "floppy", fluffy: false, curlyTail: false, snoutLength: 0.5, sizeCategory: "small", brachycephalic: false },
  { keys: ["도베르만"], color: 0x2b2320, size: 1.15, earStyle: "pointy", fluffy: false, curlyTail: false, snoutLength: 0.8, sizeCategory: "large", brachycephalic: false },
  { keys: ["로트와일러"], color: 0x2b2320, size: 1.2, earStyle: "floppy", fluffy: false, curlyTail: false, snoutLength: 0.7, patchColor: 0xa5662c, sizeCategory: "large", brachycephalic: false },
  { keys: ["그레이하운드", "그레이 하운드"], color: 0xaab0b6, size: 1.1, earStyle: "floppy", fluffy: false, curlyTail: false, snoutLength: 0.85, sizeCategory: "large", brachycephalic: false },
];

const DEFAULT_APPEARANCE = {
  color: 0xcaa06a,
  size: 0.9,
  earStyle: "floppy",
  fluffy: false,
  curlyTail: false,
  snoutLength: 0.6,
  shortLegs: false,
  longBody: false,
  patchColor: null,
  sizeCategory: "medium",
  brachycephalic: false,
};

export function getBreedAppearance(breed) {
  const name = (breed || "").trim();
  const preset = PRESETS.find((p) => p.keys.some((k) => name.includes(k)));
  return { ...DEFAULT_APPEARANCE, ...(preset || {}) };
}
