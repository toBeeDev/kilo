"use client";

/** 업로드 전 리사이즈. API 비용·용량 둘 다 줄임. */
export async function downscale(
  file: File | Blob,
  maxSide = 1280,
  quality = 0.82,
): Promise<{ blob: Blob; dataUrl: string; width: number; height: number }> {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, maxSide / Math.max(bitmap.width, bitmap.height));
  const w = Math.round(bitmap.width * scale);
  const h = Math.round(bitmap.height * scale);
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d")!;
  ctx.drawImage(bitmap, 0, 0, w, h);
  bitmap.close?.();
  const blob: Blob = await new Promise((res, rej) =>
    canvas.toBlob((b) => (b ? res(b) : rej(new Error("toBlob 실패"))), "image/jpeg", quality),
  );
  const dataUrl = canvas.toDataURL("image/jpeg", quality);
  return { blob, dataUrl, width: w, height: h };
}

/** 로컬 저장용 썸네일 (localStorage 용량 보호) */
export async function thumbnail(file: File | Blob) {
  return downscale(file, 720, 0.72);
}
