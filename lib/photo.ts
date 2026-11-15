/** Shrink a photo in the browser to a 4:5 portrait of at most 720px wide. */
export async function toPortrait(file: File): Promise<string> {
  const bmp = await createImageBitmap(file, { imageOrientation: "from-image" } as ImageBitmapOptions);
  const ratio = 4 / 5;
  let sw = bmp.width;
  let sh = bmp.height;
  if (sw / sh > ratio) sw = sh * ratio;
  else sh = sw / ratio;
  const w = Math.min(720, Math.round(sw));
  const h = Math.round(w / ratio);
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  // Keep the crop slightly above centre, where faces usually are.
  const sx = (bmp.width - sw) / 2;
  const sy = (bmp.height - sh) * 0.35;
  c.getContext("2d")!.drawImage(bmp, sx, sy, sw, sh, 0, 0, w, h);
  return c.toDataURL("image/jpeg", 0.84);
}

/**
 * Shrink a photo for a message: the long side at most 1280px, as a JPEG that
 * stays under `maxBytes`. Quality is lowered first, then the size, until it fits.
 */
export async function toMessagePhoto(file: Blob, maxBytes = 300 * 1024): Promise<Blob> {
  const bmp = await createImageBitmap(file, { imageOrientation: "from-image" } as ImageBitmapOptions);
  const c = document.createElement("canvas");
  let side = 1280;
  let quality = 0.8;
  for (;;) {
    const scale = Math.min(1, side / Math.max(bmp.width, bmp.height));
    c.width = Math.max(1, Math.round(bmp.width * scale));
    c.height = Math.max(1, Math.round(bmp.height * scale));
    const ctx = c.getContext("2d")!;
    ctx.fillStyle = "#fff";
    ctx.fillRect(0, 0, c.width, c.height);
    ctx.drawImage(bmp, 0, 0, c.width, c.height);
    const blob = await new Promise<Blob | null>((done) => c.toBlob(done, "image/jpeg", quality));
    if (!blob) throw new Error("photo");
    if (blob.size <= maxBytes || side <= 480) return blob;
    if (quality > 0.6) quality -= 0.1;
    else side = Math.round(side * 0.8);
  }
}
