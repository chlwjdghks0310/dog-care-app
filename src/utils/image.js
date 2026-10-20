// 프로필 사진을 localStorage에 안전하게 저장하기 위해 적당한 크기로 줄여 dataURL로 변환한다.
export function resizeImageFile(file, maxSize = 480, quality = 0.82) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const scale = Math.min(1, maxSize / Math.max(img.width, img.height));
      const canvas = document.createElement("canvas");
      canvas.width = Math.round(img.width * scale);
      canvas.height = Math.round(img.height * scale);
      const ctx = canvas.getContext("2d");
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      URL.revokeObjectURL(img.src);
      resolve(canvas.toDataURL("image/jpeg", quality));
    };
    img.onerror = reject;
    img.src = URL.createObjectURL(file);
  });
}

// AI에 보낼 사진: 긴 변 1280px JPEG로 줄여 { data(base64), mediaType }로. 아이폰 HEIC도 브라우저가 읽을 수 있으면 JPEG가 된다.
export async function imageForAI(file) {
  const dataUrl = await resizeImageFile(file, 1280, 0.82);
  return { data: dataUrl.split(",")[1], mediaType: "image/jpeg" };
}
