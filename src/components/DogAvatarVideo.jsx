import { useEffect, useRef, useState } from "react";

// AI(Kling/Runway/Pika/DomoAI 등)로 만든 짧은 반복 영상을 상태에 따라 바꿔 재생한다.
// 영상 배경이 순수 그린스크린은 아니지만 밝은 회색/흰색 배경이라, "밝고 채도 낮은 픽셀을
// 투명하게" 만드는 방식으로 크로마키와 비슷한 효과를 낸다. 캐릭터가 어두운/채도 있는 색이라
// 배경과 잘 구분된다 — 다른 영상(밝은 색 캐릭터 등)을 쓰면 이 로직을 다시 조정해야 할 수 있다.
const VIDEO_SRC = {
  idle: "/avatar/idle.mp4",
  thinking: "/avatar/thinking.mp4",
  talking: "/avatar/idle.mp4", // talking.mp4 준비되면 이 줄만 바꾸면 됨
};

// 채팅 모드(견종)별 영상은 public/avatar/<breed>/idle.mp4, thinking.mp4 에 둔다.
// 파일이 없으면(재생 오류) 기본 영상(public/avatar/*.mp4)으로 대신 보여준다.
function breedSrc(breed, state, ext = "mp4") {
  const file = state === "thinking" ? "thinking" : "idle";
  return breed ? `/avatar/${breed}/${file}.${ext}` : null;
}

// 사파리/iOS(모든 iOS 브라우저는 WebKit)는 투명 배경 HEVC(.mov)를 그대로 투명하게 재생한다 → 색으로 배경을
// 지울 필요가 없어 기기별 색 차이·압축 번짐과 무관하게 깨끗하다. 크롬 등은 알파를 무시하므로 초록 .mp4 + 캔버스 키잉.
const UA = typeof navigator === "undefined" ? "" : navigator.userAgent;
const PLAYS_ALPHA_VIDEO =
  /iPad|iPhone|iPod/.test(UA) ||
  (UA.includes("Macintosh") && typeof navigator !== "undefined" && navigator.maxTouchPoints > 1) ||
  /^((?!chrome|chromium|android|crios|fxios|edg).)*safari/i.test(UA);

const PROCESS_SIZE = 360; // 처리 해상도 (화질/성능 타협 — 폰 성능 고려해 낮춤)

// 캐릭터 발끝이 화면 거의 맨 아래까지 닿아 있어서, 확대/크롭으로 워터마크를 밀어내면
// 캐릭터까지 같이 잘린다. 대신 전체 프레임은 그대로 두고, 워터마크가 찍힌 우측 하단
// 자리만 배경색으로 덮어쓴 다음(아래 keyOutLightBackground가 그 부분도 투명 처리한다)
// 캐릭터는 전혀 안 잘리게 한다. 생성 도구가 바뀌어 워터마크 위치가 달라지면 이 비율도 조정해야 한다.
const WATERMARK_RECT = { x: 0.8, y: 0.93, w: 0.2, h: 0.08 };

// 밝기(brightness)가 높고 채도(saturation)가 낮은 픽셀(흰색/회색 계열)을 배경으로 간주해
// 투명하게 만든다. 경계는 부드럽게(서서히 투명해지게) 처리해 가장자리가 딱 잘린 티가 덜 나게 한다.
// min: 이보다 어두우면 무조건 캐릭터 / full: 이보다 밝으면 완전히 투명 / 채도가 SATURATION_MAX보다 높으면 캐릭터.
// 견종 영상마다 배경 회색의 밝기가 달라 따로 맞춘다(실측: 기본 배경 밝기 217~225, 리트리버 201~216).
const KEY_DEFAULT = { min: 150, full: 210 };
const KEY_BY_BREED = {
  retriever: { min: 160, full: 188 },
  // 보더콜리는 흰 털이 배경 회색과 거의 같은 색이라 scripts/avatar/bakealpha.swift로 미리 투명 처리한 영상을 쓴다:
  // 사파리는 .mov(투명 배경) 직접 재생, 그 외는 .mp4(초록 배경)를 캔버스에서 키잉. 워터마크도 이미 지워짐.
  bordercollie: { green: true, alphaMov: true },
};
const SATURATION_MAX = 0.15; // 리트리버의 가장 옅은 크림색 털도 채도 0.2 이상이라 안전

// 배경을 미리 초록과 섞어 둔 영상(scripts/avatar/bakegreen.swift로 처리)용. 영상 픽셀 = a·캐릭터 + (1-a)·초록 이므로
// 초록이 섞인 정도로 투명도 a를 되살리고, 초록을 빼서 원래 색을 복원한다(꼬리 모션블러 같은 반투명 유지).
// 흰 털과 초록은 확연히 달라 기기별 색 차이에도 안전하다. 디코딩된 초록 배경 실측: (0, 249, 0).
const GREEN_FULL = 249;
function keyOutGreen(imageData) {
  const data = imageData.data;
  for (let i = 0; i < data.length; i += 4) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    const greenness = g - Math.max(r, b);
    if (greenness <= 6) continue;
    const a = greenness >= 215 ? 0 : 1 - greenness / GREEN_FULL;
    if (a <= 0.02) {
      data[i + 3] = 0;
      continue;
    }
    data[i] = Math.min(255, r / a);
    data[i + 1] = Math.min(255, Math.max(0, (g - (1 - a) * 255) / a));
    data[i + 2] = Math.min(255, b / a);
    data[i + 3] = Math.round(a * data[i + 3]);
  }
  return imageData;
}

function keyOutLightBackground(imageData, { min: BRIGHTNESS_MIN, full: BRIGHTNESS_FULL_TRANSPARENT }) {
  const data = imageData.data;
  for (let i = 0; i < data.length; i += 4) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    const brightness = (r + g + b) / 3;
    const maxC = Math.max(r, g, b);
    const minC = Math.min(r, g, b);
    const saturation = maxC === 0 ? 0 : (maxC - minC) / maxC;

    if (brightness > BRIGHTNESS_MIN && saturation < SATURATION_MAX) {
      const range = BRIGHTNESS_FULL_TRANSPARENT - BRIGHTNESS_MIN;
      const alpha = Math.max(0, 1 - (brightness - BRIGHTNESS_MIN) / range);
      data[i + 3] = Math.min(data[i + 3], Math.round(alpha * 255));
    }
  }
  return imageData;
}

export default function DogAvatarVideo({ state = "idle", height = 200, breed }) {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const frameIdRef = useRef(null);
  const [missing, setMissing] = useState({});
  const [readySrc, setReadySrc] = useState(null); // 첫 프레임을 그린 영상 — 그 전(강아지 바꾸는 사이)엔 로딩 표시
  const direct = PLAYS_ALPHA_VIDEO && Boolean(KEY_BY_BREED[breed]?.alphaMov); // 투명 .mov를 그대로 보여줌
  const preferred = breedSrc(breed, state, direct ? "mov" : "mp4");
  const src = preferred && !missing[preferred] ? preferred : VIDEO_SRC[state] || VIDEO_SRC.idle;

  useEffect(() => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return;
    // 견종 영상이 없으면(404·HTML 응답 등 재생 오류) 기본 영상으로 바꾼다. 리스너를 달기 전에 이미
    // 오류가 났을 수도 있어 video.error도 바로 확인한다.
    const onVideoError = () => src === preferred && setMissing((m) => ({ ...m, [src]: true }));
    video.addEventListener("error", onVideoError);
    if (video.error) onVideoError();

    if (direct && src === preferred) {
      // 투명 영상은 캔버스 처리 없이 <video>를 그대로 보여준다.
      const onReady = () => setReadySrc(src);
      video.addEventListener("loadeddata", onReady);
      if (video.readyState >= 2) onReady();
      video.play().catch(() => {});
      const watchdog = setInterval(() => {
        if (video.paused && document.visibilityState !== "hidden") video.play().catch(() => {});
      }, 500);
      return () => {
        clearInterval(watchdog);
        video.removeEventListener("error", onVideoError);
        video.removeEventListener("loadeddata", onReady);
      };
    }
    const keySettings = (src === preferred && KEY_BY_BREED[breed]) || KEY_DEFAULT;
    let shown = false;
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    canvas.width = PROCESS_SIZE;
    canvas.height = PROCESS_SIZE;

    video.play().catch(() => {
      // 자동재생이 막히는 환경(일부 모바일 브라우저)에서는 조용히 무시한다. 아래 watchdog이 재시도한다.
    });

    // 탭 전환/화면 꺼짐/자동재생 정책 등 이유를 막론하고 영상이 멈춰 있으면 계속 다시 재생을 시도한다.
    // 캐릭터가 정지 화면으로 보이는 시간을 최대한 짧게 유지하기 위한 안전망.
    const watchdog = setInterval(() => {
      if (video.paused && document.visibilityState !== "hidden") {
        video.play().catch(() => {});
      }
    }, 500);

    function renderFrame() {
      if (video.readyState < 2) return;
      const vw = video.videoWidth;
      const vh = video.videoHeight;
      if (!vw || !vh) return;

      ctx.drawImage(video, 0, 0, vw, vh, 0, 0, PROCESS_SIZE, PROCESS_SIZE);

      // 워터마크 자리를 배경과 비슷한 밝은 색으로 덮는다 — 아래 키잉 단계에서 자연스럽게 투명해진다.
      if (!keySettings.green) {
        ctx.fillStyle = "#eeeeee";
        ctx.fillRect(
          PROCESS_SIZE * WATERMARK_RECT.x,
          PROCESS_SIZE * WATERMARK_RECT.y,
          PROCESS_SIZE * WATERMARK_RECT.w,
          PROCESS_SIZE * WATERMARK_RECT.h
        );
      }

      const frame = ctx.getImageData(0, 0, PROCESS_SIZE, PROCESS_SIZE);
      if (keySettings.green) keyOutGreen(frame);
      else keyOutLightBackground(frame, keySettings);
      ctx.putImageData(frame, 0, 0);
      if (!shown) {
        shown = true;
        setReadySrc(src);
      }
    }

    // 실제로 새 영상 프레임이 디코딩될 때만 처리한다(지원 브라우저) — 영상은 24fps인데
    // requestAnimationFrame은 최대 60번/초 돌아서, 그대로 쓰면 같은 프레임을 불필요하게
    // 다시 처리해 폰 배터리/성능을 낭비하게 된다.
    if (video.requestVideoFrameCallback) {
      let active = true;
      // 다음 프레임 콜백을 먼저 예약한 뒤에 렌더링한다 — renderFrame()에서 예외가 나도
      // (디코딩 타이밍 등 드문 엣지 케이스) 다음 프레임 예약은 이미 끝났으므로 루프가
      // 영구히 멈추지 않는다. 순서를 바꾸면 예외 한 번에 캐릭터가 그대로 정지해버린다.
      const onFrame = () => {
        if (!active) return;
        frameIdRef.current = video.requestVideoFrameCallback(onFrame);
        try {
          renderFrame();
        } catch {
          // 이번 프레임만 건너뛰고 다음 프레임에서 계속 이어간다.
        }
      };
      frameIdRef.current = video.requestVideoFrameCallback(onFrame);
      return () => {
        active = false;
        video.cancelVideoFrameCallback?.(frameIdRef.current);
        clearInterval(watchdog);
        video.removeEventListener("error", onVideoError);
      };
    }

    function loop() {
      frameIdRef.current = requestAnimationFrame(loop);
      try {
        renderFrame();
      } catch {
        // 이번 프레임만 건너뛰고 다음 프레임에서 계속 이어간다.
      }
    }
    loop();
    return () => {
      cancelAnimationFrame(frameIdRef.current);
      clearInterval(watchdog);
      video.removeEventListener("error", onVideoError);
    };
  }, [src, preferred, breed, direct]);

  const showVideo = direct && src === preferred;
  return (
    <div style={{ position: "relative", width: "100%", height, display: "flex", alignItems: "center", justifyContent: "center" }}>
      {readySrc !== src && (
        <span className="avatar-loading" role="img" aria-label="강아지 불러오는 중">
          🐾
        </span>
      )}
      <video
        ref={videoRef}
        src={src}
        muted
        loop
        autoPlay
        playsInline
        style={showVideo ? { height: "100%", width: "auto", maxWidth: "100%" } : { display: "none" }}
      />
      <canvas ref={canvasRef} style={showVideo ? { display: "none" } : { height: "100%", width: "auto", maxWidth: "100%" }} />
    </div>
  );
}
