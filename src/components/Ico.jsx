import { useEffect, useRef } from "react";
// 앱 전체 아이콘(하단 탭과 같은 animateicons Lucide 선 아이콘). 저작권 표시는 public/licenses.txt.
// 데이터 파일(records·vitals·calendarEvents 등)에는 아이콘 이름(글자)만 두고 여기서 그린다 — 노드 테스트에서도 데이터를 그대로 불러올 수 있게.
import {
  AlarmClockIcon, ArrowDownIcon, ArrowRightIcon, BellIcon, BellOffIcon, BookOpenIcon, Building2Icon, CalendarDaysIcon, CameraIcon,
  ChartColumnIcon, ImageIcon, ImagePlusIcon, ChartLineIcon, CircleCheckIcon, CircleStopIcon, ClipboardListIcon, DogIcon, DropletIcon, DropletsIcon,
  EyeIcon, GiftIcon, HandIcon, HeartPulseIcon, HouseIcon, LightbulbIcon, ListChecksIcon, LockIcon, MenuIcon,
  MicIcon, MoonIcon, XIcon, MailIcon, ZapIcon, MessageCircleHeartIcon, PuzzleIcon, SprayCanIcon, CarIcon, GraduationCapIcon, UmbrellaIcon, ShoppingBagIcon, BoxIcon, MousePointerClickIcon, NotebookPenIcon, PaperclipIcon, PartyPopperIcon, PawPrintIcon, PencilIcon,
  PillIcon, PinIcon, PipetteIcon, PrinterIcon, RepeatIcon, RulerIcon, ScissorsIcon, SearchIcon, SettingsIcon, SirenIcon,
  SparklesIcon, StethoscopeIcon, TargetIcon, ThermometerIcon, TimerIcon, Trash2Icon, TriangleAlertIcon, UsersIcon,   VideoIcon, Volume2Icon, WalletIcon, WindIcon,
} from "@animateicons/react/lucide";
// 강아지 앱다운 그림(저울·뼈다귀·사료 그릇·주사기 등)은 Phosphor 두 톤 아이콘(MIT). 움직이지는 않는다.
import {
  Bandaids, Bathtub, Bed, Bone, BowlFood, Cake, FirstAidKit, HandHeart, Heart, PersonSimpleWalk, Scales, Scan, Smiley, Star, Sun,
  Syringe, Toilet, Tooth,
} from "@phosphor-icons/react";

const ICONS = {
  alarm: AlarmClockIcon, arrowDown: ArrowDownIcon, arrowRight: ArrowRightIcon, bell: BellIcon, bellOff: BellOffIcon, book: BookOpenIcon,
  building: Building2Icon, calendar: CalendarDaysIcon, camera: CameraIcon, image: ImageIcon, imagePlus: ImagePlusIcon, chart: ChartColumnIcon, chartLine: ChartLineIcon,
  check: CircleCheckIcon, stop: CircleStopIcon, clipboard: ClipboardListIcon, dog: DogIcon, droplet: DropletIcon,
  droplets: DropletsIcon, eye: EyeIcon, gift: GiftIcon, hand: HandIcon, heart: HeartPulseIcon,
  house: HouseIcon, idea: LightbulbIcon, checklist: ListChecksIcon, lock: LockIcon, menu: MenuIcon, mic: MicIcon, moon: MoonIcon,
  tap: MousePointerClickIcon, note: NotebookPenIcon, clip: PaperclipIcon, party: PartyPopperIcon, paw: PawPrintIcon,
  pencil: PencilIcon, pill: PillIcon, pin: PinIcon, pipette: PipetteIcon, printer: PrinterIcon, repeat: RepeatIcon, ruler: RulerIcon,
  scissors: ScissorsIcon, search: SearchIcon, settings: SettingsIcon, siren: SirenIcon, sparkles: SparklesIcon,
  stethoscope: StethoscopeIcon, target: TargetIcon, thermometer: ThermometerIcon, timer: TimerIcon, trash: Trash2Icon,
  alert: TriangleAlertIcon, users: UsersIcon, video: VideoIcon, speaker: Volume2Icon, wallet: WalletIcon, wind: WindIcon,
  x: XIcon, mail: MailIcon, zap: ZapIcon, chatHeart: MessageCircleHeartIcon,
  puzzle: PuzzleIcon, sprayCan: SprayCanIcon, car: CarIcon, graduation: GraduationCapIcon, umbrella: UmbrellaIcon, shoppingBag: ShoppingBagIcon, box: BoxIcon,
};

// 뜻 하나에 아이콘 하나 — 같은 그림을 다른 뜻에 쓰지 않는다(scripts/icons.test.mjs가 이름만 확인, 뜻 겹침은 사람이 확인)
const PHOSPHOR = {
  scales: Scales, bone: Bone, bowl: BowlFood, walk: PersonSimpleWalk, syringe: Syringe, toilet: Toilet, bath: Bathtub, tooth: Tooth,
  bandaid: Bandaids, smiley: Smiley, bed: Bed, scan: Scan, firstAid: FirstAidKit, cake: Cake, handHeart: HandHeart, star: Star,
  heartPlain: Heart, sun: Sun,
};

// AI 답변 소제목 앞 이모지 → 아이콘(모르는 이모지는 글자 그대로 둔다)
const EMOJI = {
  "👀": "eye", "🔬": "eye", "📊": "chart", "🔍": "search", "🤔": "idea", "💡": "idea", "🩺": "idea", "🏠": "house", "🍚": "bowl",
  "🏥": "stethoscope", "🚨": "siren", "📷": "camera", "💊": "pill", "✅": "checklist", "💧": "droplet", "⚖️": "scales", "🦮": "walk",
  "🗓️": "calendar", "📅": "calendar", "💰": "wallet", "⚠️": "alert", "🐾": "paw", "📝": "note", "🔔": "bell", "⏰": "alarm", "👆": "tap", "🐶": "dog", "🔎": "scan",
};
// "👀 살펴봐 줘" → { name: "eye", text: "살펴봐 줘" } / 모르는 이모지면 null
export function iconFromTitle(title) {
  for (const [emoji, name] of Object.entries(EMOJI)) {
    if (title.startsWith(emoji)) return { name, text: title.slice(emoji.length).trim() };
    const bare = emoji.replace("️", "");
    if (bare !== emoji && title.startsWith(bare)) return { name, text: title.slice(bare.length).trim() };
  }
  return null;
}

// 스티커 아이콘(11/14, Recraft 벡터 40개 → public/sk/stickers.svg 한 장). "내용" 아이콘(기록 종류·수치·일상·병원)만 스티커로,
// 닫기·검색·알림 같은 조작 아이콘은 그대로 선 아이콘. 어디서 스티커로 그릴지는 부르는 쪽이 정한다: sticker 속성, 또는 className에 cat-ico.
// 앱 아이콘 이름 → 스티커 id. 매핑된 이름은 어디서든 스티커(11/14 저녁, 사용자 "그 외 모든 아이콘"), sticker={false}로만 끈다. x·menu·화살표·check·stop·paw는 맵에 없어 선 그대로.
// 색은 index.css의 --sk-* 변수(다크 모드는 외곽선 그대로 두고 채움만 중간 톤 + 접시).
const STICKER = {
  scales: "weight", bandaid: "symptom", bowl: "meal", toilet: "potty", pill: "med", stethoscope: "vet", smiley: "condition", sun: "daily", star: "life", camera: "media", chartLine: "vital",
  droplets: "droplets", bone: "bone", droplet: "droplet", pipette: "pipette", wind: "wind", heart: "heart", thermometer: "thermometer", ruler: "ruler",
  walk: "walk", handHeart: "handHeart", tooth: "tooth", bath: "bath", target: "target", firstAid: "firstAid", syringe: "syringe", bed: "bed", scissors: "scissors", box: "box",
  shoppingBag: "shoppingBag", umbrella: "umbrella", cake: "cake", party: "party", building: "building", dog: "dog", scan: "scan", wallet: "wallet", clipboard: "clipboard", calendar: "calendar",
  // 11/14 저녁 추가 34개(사용자: 하단 탭·순수 조작·발도장 빼고 전부)
  bell: "bell", bellOff: "bellOff", alarm: "alarm", timer: "timer", house: "house", chart: "chart", checklist: "checklist", note: "note", image: "image", imagePlus: "imagePlus",
  users: "users", settings: "settings", search: "search", sparkles: "sparkles", idea: "idea", book: "book", graduation: "graduation", mail: "mail", lock: "lock", printer: "printer",
  video: "video", speaker: "speaker", mic: "mic", pencil: "pencil", trash: "trash", pin: "pin", repeat: "repeat", clip: "clip", heartPlain: "heartPlain", chatHeart: "chatHeart",
  tap: "tap", alert: "alert", siren: "siren", eye: "eye",
  moon: "moon", // 11/14 설정 다크 모드(사용자)
};
const SK_URL = "/sk/stickers.svg?v=3"; // v3: 강아지 얼굴(눈·코·입)·달 추가
export const hasSticker = (name) => Boolean(STICKER[name]);

// 눌러서 쓰는 곳(버튼·링크·라벨) 안에 있으면 누를 때 한 번 움직인다(폰엔 마우스 올리기가 없어서)
export default function Ico({ name, size = 20, className, style, sticker }) {
  const sk = STICKER[name];
  if (sk && sticker !== false) {
    const w = Math.round(size * 1.4); // 선 아이콘보다 통통해서 같은 자리에 조금 크게
    return (
      <span className={`ico ico-sk${className ? ` ${className}` : ""}`} style={style} aria-hidden="true">
        <svg width={w} height={w} viewBox="0 0 1024 1024"><use href={`${SK_URL}#sk-${sk}`} /></svg>
      </span>
    );
  }
  const P = PHOSPHOR[name];
  if (P) {
    return (
      <span className={`ico${className ? ` ${className}` : ""}`} style={style} aria-hidden="true">
        <P size={size} weight="duotone" />
      </span>
    );
  }
  return <AnimIco name={name} size={size} className={className} style={style} />;
}

function AnimIco({ name, size, className, style }) {
  const C = ICONS[name];
  const wrap = useRef(null);
  const handle = useRef(null);
  useEffect(() => {
    const host = wrap.current?.closest("button, a, label, [role=button]");
    if (!host) return;
    const go = () => handle.current?.startAnimation?.();
    host.addEventListener("pointerdown", go);
    return () => host.removeEventListener("pointerdown", go);
  }, []);
  if (!C) return null;
  return (
    <span ref={wrap} className={`ico${className ? ` ${className}` : ""}`} style={style} aria-hidden="true">
      <C ref={handle} size={size} duration={0.6} />
    </span>
  );
}
