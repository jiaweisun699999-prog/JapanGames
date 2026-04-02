export function fitCanvas(canvas, parent, ratio = 9 / 16) {
  const w = parent.clientWidth;
  const h = Math.max(320, Math.min(window.innerHeight * 0.55, w / ratio));
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  canvas.width = Math.floor(w * dpr);
  canvas.height = Math.floor(h * dpr);
  canvas.style.width = `${w}px`;
  canvas.style.height = `${h}px`;
  const ctx = canvas.getContext("2d");
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  return { ctx, w, h, dpr };
}

export function clamp(v, a, b) {
  return Math.max(a, Math.min(b, v));
}

/** 类似 object-fit: cover，铺满 w×h */
export function drawImageCover(ctx, img, w, h) {
  if (!img?.naturalWidth) return;
  const iw = img.naturalWidth;
  const ih = img.naturalHeight;
  const ir = iw / ih;
  const wr = w / h;
  let dw;
  let dh;
  let ox;
  let oy;
  if (ir > wr) {
    dh = h;
    dw = h * ir;
    ox = (w - dw) / 2;
    oy = 0;
  } else {
    dw = w;
    dh = w / ir;
    ox = 0;
    oy = (h - dh) / 2;
  }
  ctx.drawImage(img, ox, oy, dw, dh);
}
