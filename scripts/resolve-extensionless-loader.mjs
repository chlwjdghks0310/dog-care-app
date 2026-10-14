// src/ 안의 import들은 전부 확장자 없이 쓰여 있다(Vite는 이걸 알아서 처리한다).
// 이 로더는 Node로 직접 테스트를 돌릴 때만, 확장자 없는 상대경로 import에 ".js"를 붙여
// 찾아주는 역할만 한다 — 그 외엔 아무것도 건드리지 않는다.
export async function resolve(specifier, context, nextResolve) {
  try {
    return await nextResolve(specifier, context);
  } catch (err) {
    if (specifier.startsWith(".") && !/\.[a-z]+$/.test(specifier)) {
      return nextResolve(`${specifier}.js`, context);
    }
    throw err;
  }
}
