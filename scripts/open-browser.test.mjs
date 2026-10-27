// 앱 안 브라우저에서 다른 브라우저로 열기 버튼 확인: npm test
import assert from "node:assert/strict";
const { browserTargets, openLabel } = await import("../src/utils/openBrowser.js");
const URL = "https://dog-care-app-1.onrender.com";
const kakaoIOS = "Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 KAKAOTALK 10.8.0";
const insta = "Mozilla/5.0 (Linux; Android 14; SM-S918N) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0 Mobile Safari/537.36 Instagram 350.0";

const ios = browserTargets(URL, kakaoIOS);
assert.deepEqual(ios.map((t) => t.id), ["default", "safari", "chrome", "naver", "google"]);
assert.equal(ios[0].href, `kakaotalk://web/openExternal?url=${encodeURIComponent(URL)}`, "카카오톡 주소는 인코딩");
assert.equal(ios[1].href, "x-safari-https://dog-care-app-1.onrender.com");
assert.equal(ios[2].href, "googlechromes://dog-care-app-1.onrender.com", "크롬 공식 형식(https → googlechromes)");

const and = browserTargets(URL, insta);
assert.deepEqual(and.map((t) => t.id), ["chrome", "samsung", "naver", "google"], "인스타는 앱 공식 열기가 없어 브라우저만");
assert.equal(and[0].href, `intent://dog-care-app-1.onrender.com#Intent;scheme=https;package=com.android.chrome;S.browser_fallback_url=${encodeURIComponent(URL)};end`);
assert.deepEqual(browserTargets(URL, "Mozilla/5.0 (Windows NT 10.0)"), [], "컴퓨터는 버튼 없음");

assert.equal(openLabel("크롬"), "크롬으로 열기");
assert.equal(openLabel("사파리"), "사파리로 열기");
assert.equal(openLabel("삼성 인터넷"), "삼성 인터넷으로 열기");
assert.equal(openLabel("기본 브라우저"), "기본 브라우저로 열기");
console.log("open-browser ok");
