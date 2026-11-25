// 스토어 앱(Capacitor)으로 열렸는지. 웹·홈 화면 앱에서는 false
export const isNative = () => !!globalThis.Capacitor?.isNativePlatform?.();
