// 스토어 앱(Capacitor)으로 열렸는지. 웹·홈 화면 앱에서는 false
export const isNative = () => !!globalThis.Capacitor?.isNativePlatform?.();
// 웹(홈 화면 앱)에만 해당하는 안내 문장: 스토어 앱에서는 빈 글자
export const webOnly = (text) => (isNative() ? "" : text);
// 스토어 앱에서만 짧은 진동(저장·도장 같은 "됐다" 순간). 웹에서는 아무 일도 없다
export function haptic(style = "Light") {
  if (!isNative()) return;
  import("@capacitor/haptics").then(({ Haptics, ImpactStyle }) => Haptics.impact({ style: ImpactStyle[style] })).catch(() => {});
}
