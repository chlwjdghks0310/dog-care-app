// 업로드한 강아지 사진에서 평균 색상을 뽑아 3D 아바타 색에 살짝 반영한다.
// 진짜 사진 기반 3D 복원이 아니라, "그나마 우리 강아지 색과 비슷하게" 맞추는 가벼운 절충이다.
export function getAverageColorFromDataUrl(dataUrl) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const size = 24;
      const canvas = document.createElement("canvas");
      canvas.width = size;
      canvas.height = size;
      const ctx = canvas.getContext("2d");
      ctx.drawImage(img, 0, 0, size, size);
      const { data } = ctx.getImageData(0, 0, size, size);
      let r = 0, g = 0, b = 0, count = 0;
      for (let i = 0; i < data.length; i += 4) {
        r += data[i];
        g += data[i + 1];
        b += data[i + 2];
        count++;
      }
      r = Math.round(r / count);
      g = Math.round(g / count);
      b = Math.round(b / count);
      resolve((r << 16) | (g << 8) | b);
    };
    img.onerror = reject;
    img.src = dataUrl;
  });
}
