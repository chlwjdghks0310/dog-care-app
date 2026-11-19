// 공용 토스트(11/19, 계획표 3번): 저장·삭제·토글처럼 눌러도 아무 반응이 없던 조작에 아래쪽 알약 한 줄.
// 쓰는 법: toast("저장했어요") · toast("지웠어요", { action: "되돌리기", onAction }) · toast("찾는 중…", { ico: "search", ms: 2500 })
// 화면엔 components/Toaster.jsx(App에 하나)가 그린다. 한 번에 하나만(새 것이 오면 바꿔 끼움).
export function toast(text, { ico = "check", action, onAction, ms } = {}) {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent("dogcare-toast", { detail: { text, ico, action, onAction, ms: ms || (action ? 4500 : 1800) } }));
}
// 입력칸처럼 연달아 저장될 때: 마지막 저장 뒤 한 번만
let debounceTimer = null;
export function toastLater(text, opts = {}, wait = 700) {
  clearTimeout(debounceTimer);
  debounceTimer = setTimeout(() => toast(text, opts), wait);
}
