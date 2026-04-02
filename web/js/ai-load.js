const cache = new Map();

/**
 * @param {string} src 以站点根为基准，如 assets/ai/bg-l01.png
 * @returns {Promise<HTMLImageElement | null>}
 */
export function loadPng(src) {
  if (!cache.has(src)) {
    const im = new Image();
    const p = new Promise((resolve) => {
      im.onload = () => resolve(im);
      im.onerror = () => resolve(null);
      im.src = src;
    });
    cache.set(src, p);
  }
  return cache.get(src);
}

/**
 * 去除 AI 精灵图常见的浅色纯色底（提示词里的 #f4efe6 及相近色），保留主体透明 PNG。
 * 背景大图请勿调用此函数。
 * @param {HTMLImageElement} img
 */
export function chromaKeySprite(img) {
  if (!img?.naturalWidth) return Promise.resolve(null);
  const w = img.naturalWidth;
  const h = img.naturalHeight;
  const maxSide = 512;
  let rw = w;
  let rh = h;
  if (w > maxSide || h > maxSide) {
    const s = maxSide / Math.max(w, h);
    rw = Math.floor(w * s);
    rh = Math.floor(h * s);
  }

  const c = document.createElement("canvas");
  c.width = rw;
  c.height = rh;
  const ctx = c.getContext("2d", { willReadFrequently: true });
  if (!ctx) return Promise.resolve(img);

  ctx.drawImage(img, 0, 0, rw, rh);
  let d;
  try {
    d = ctx.getImageData(0, 0, rw, rh);
  } catch {
    return Promise.resolve(img);
  }

  const data = d.data;
  const kr = 244;
  const kg = 239;
  const kb = 230;
  const inner = 32;
  const outer = 56;

  for (let i = 0; i < data.length; i += 4) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    const lum = 0.299 * r + 0.587 * g + 0.114 * b;
    const maxc = Math.max(r, g, b) / 255;
    const minc = Math.min(r, g, b) / 255;
    const sat = maxc < 0.001 ? 0 : (maxc - minc) / maxc;

    const dist = Math.hypot(r - kr, g - kg, b - kb);
    let a = 255;

    if (lum > 245 && sat < 0.06) {
      a = 0;
    } else if (dist < inner) {
      a = 0;
    } else if (dist < outer) {
      a = Math.round((255 * (dist - inner)) / (outer - inner));
    } else if (lum > 238 && sat < 0.1 && dist < outer + 20) {
      a = Math.min(a, Math.round(255 * ((dist - inner) / (outer - inner + 8))));
    }

    data[i + 3] = a;
  }

  ctx.putImageData(d, 0, 0);

  return new Promise((resolve) => {
    const out = new Image();
    out.onload = () => resolve(out);
    out.onerror = () => resolve(img);
    out.src = c.toDataURL("image/png");
  });
}

function loadPngChroma(src) {
  const key = `${src}#chroma`;
  if (!cache.has(key)) {
    const p = loadPng(src).then((raw) => {
      if (!raw) return null;
      return chromaKeySprite(raw);
    });
    cache.set(key, p);
  }
  return cache.get(key);
}

/**
 * @param {Record<string, string>} map key -> src
 * @param {{ chromaKeys?: string[] }} [opts] 需要做去底的 key；默认除 `bg` 外全部去底
 */
export function loadPngMap(map, opts = {}) {
  const except = new Set(opts.chromaExcept ?? ["bg"]);
  const keys = Object.keys(map);
  return Promise.all(
    keys.map((k) => {
      if (except.has(k)) return loadPng(map[k]);
      return loadPngChroma(map[k]);
    })
  ).then((arr) => {
    const o = {};
    keys.forEach((k, i) => {
      o[k] = arr[i];
    });
    return o;
  });
}
