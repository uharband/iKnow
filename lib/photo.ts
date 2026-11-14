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
