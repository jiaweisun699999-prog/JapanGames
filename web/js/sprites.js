const cache = new Map();

/**
 * @param {string} name 不含路径与扩展名，对应 assets/sprites/{name}.svg
 * @returns {Promise<HTMLImageElement | null>}
 */
export function loadSprite(name) {
  if (!cache.has(name)) {
    const im = new Image();
    const p = new Promise((resolve) => {
      im.onload = () => resolve(im);
      im.onerror = () => resolve(null);
      im.src = `assets/sprites/${name}.svg`;
    });
    cache.set(name, p);
  }
  return cache.get(name);
}

export function loadSprites(names) {
  return Promise.all(names.map((n) => loadSprite(n))).then((imgs) => {
    const o = {};
    names.forEach((n, i) => {
      o[n] = imgs[i];
    });
    return o;
  });
}

export function drawImgCentered(ctx, img, x, y, dw, dh, rotation = 0) {
  if (!img || !img.complete || !img.naturalWidth) return;
  ctx.save();
  ctx.translate(x, y);
  if (rotation) ctx.rotate(rotation);
  ctx.drawImage(img, -dw / 2, -dh / 2, dw, dh);
  ctx.restore();
}

function pathRoundRect(ctx, x, y, w, h, r) {
  const rr = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + rr, y);
  ctx.arcTo(x + w, y, x + w, y + h, rr);
  ctx.arcTo(x + w, y + h, x, y + h, rr);
  ctx.arcTo(x, y + h, x, y, rr);
  ctx.arcTo(x, y, x + w, y, rr);
  ctx.closePath();
}

/** 圆角 HUD 条 */
export function drawHudPanel(ctx, x, y, w, h, alpha = 0.88) {
  ctx.save();
  ctx.fillStyle = `rgba(246,240,230,${alpha})`;
  ctx.strokeStyle = "rgba(26,28,36,0.12)";
  ctx.lineWidth = 1;
  pathRoundRect(ctx, x, y, w, h, 10);
  ctx.fill();
  ctx.stroke();
  ctx.restore();
}
