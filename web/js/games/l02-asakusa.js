import { fitCanvas, clamp, drawImageCover } from "./util.js";
import { loadPngMap } from "../ai-load.js";
import { drawImgCentered, drawHudPanel } from "../sprites.js";

const MAP = {
  bg: "assets/ai/bg-l02.png",
  gate: "assets/ai/spr-gate.png",
  visitor: "assets/ai/spr-visitor.png",
  pedestrian: "assets/ai/spr-pedestrian.png",
};

/** 绘制裁剪尺寸（放大参道上的图案与角色） */
const GATE_W_FRAC = 0.72;
const GATE_W_MAX = 300;
const PED_DW = 58;
const PED_DH = 74;
const VIS_DW = 66;
const VIS_DH = 82;
/** 合掌有效范围（相对角色与路人尺寸） */
const BOW_DX = 62;
const BOW_DY = 70;
/** 与路人擦撞判定 */
const BUMP_DX = 32;
const BUMP_DY = 48;

export function startGame(root, { sightseeing, onFinish, playSfx }) {
  const canvas = document.createElement("canvas");
  root.appendChild(canvas);
  let running = true;
  let raf = 0;
  const duration = (sightseeing ? 95 : 65) * 1000;
  const t0 = performance.now();

  let px = 0;
  const keys = new Set();
  const onKey = (e) => {
    if (e.code === "ArrowLeft" || e.code === "KeyA") keys.add("L");
    if (e.code === "ArrowRight" || e.code === "KeyD") keys.add("R");
    if (e.code === "Space" || e.code === "KeyJ") {
      e.preventDefault();
      tryBow();
    }
  };
  const offKey = (e) => {
    if (e.code === "ArrowLeft" || e.code === "KeyA") keys.delete("L");
    if (e.code === "ArrowRight" || e.code === "KeyD") keys.delete("R");
  };
  window.addEventListener("keydown", onKey);
  window.addEventListener("keyup", offKey);

  const people = [];
  let spawnT = 0;
  let harmony = 0;
  let bowCd = 0;

  /** @type {Record<string, HTMLImageElement | null> | null} */
  let img = null;
  loadPngMap(MAP).then((m) => {
    img = m;
  });

  function tryBow() {
    if (bowCd > 0) return;
    bowCd = sightseeing ? 28 : 40;
    const { w, h } = fitCanvas(canvas, root, 9 / 16);
    const py = h - Math.max(72, VIS_DH * 0.55);
    let hit = false;
    for (const p of people) {
      const dx = p.x - px;
      const dy = p.y - py;
      if (Math.abs(dx) < BOW_DX && Math.abs(dy) < BOW_DY) {
        harmony += sightseeing ? 8 : 5;
        hit = true;
      }
    }
    if (hit) playSfx?.();
  }

  function loop(now) {
    if (!running) return;
    const { ctx, w, h } = fitCanvas(canvas, root, 9 / 16);
    px = px || w * 0.5;
    const elapsed = now - t0;
    if (elapsed > duration) {
      finish();
      return;
    }

    if (keys.has("L")) px -= sightseeing ? 3.8 : 5.2;
    if (keys.has("R")) px += sightseeing ? 3.8 : 5.2;
    const margin = Math.max(44, VIS_DW * 0.42);
    px = clamp(px, margin, w - margin);
    if (bowCd > 0) bowCd -= 1;

    if (now - spawnT > (sightseeing ? 720 : 520)) {
      spawnT = now;
      people.push({
        x: Math.random() * (w - PED_DW - 32) + PED_DW / 2 + 16,
        y: -PED_DH - 8,
        vy: 0.95 + Math.random() * 0.75,
        vx: (Math.random() - 0.5) * 0.95,
        w: 36,
        h: 48,
      });
    }

    for (const p of people) {
      p.y += p.vy;
      p.x += p.vx;
    }

    if (img?.bg) {
      drawImageCover(ctx, img.bg, w, h);
      ctx.fillStyle = "rgba(26,28,36,0.2)";
      ctx.fillRect(0, 0, w, h);
    } else {
      const g = ctx.createLinearGradient(0, 0, w, h);
      g.addColorStop(0, "#efe6d8");
      g.addColorStop(1, "#dccbb8");
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, w, h);
    }

    if (img?.gate) {
      const gw = Math.min(w * GATE_W_FRAC, GATE_W_MAX);
      const gh = gw * 0.55;
      drawImgCentered(ctx, img.gate, w / 2, 36 + gh * 0.38, gw, gh);
    } else {
      ctx.fillStyle = "#c45c4a";
      ctx.fillRect(w * 0.2, 18, w * 0.6, 22);
    }

    const py = h - Math.max(72, VIS_DH * 0.55);
    for (const p of people) {
      const cy = p.y - PED_DH * 0.48;
      if (img?.pedestrian) {
        drawImgCentered(ctx, img.pedestrian, p.x, cy, PED_DW, PED_DH);
      } else {
        ctx.fillStyle = "#3d4f73";
        ctx.fillRect(p.x - p.w / 2, p.y - p.h, p.w, p.h);
      }
      const dx = p.x - px;
      const dy = p.y - py;
      if (Math.abs(dx) < BUMP_DX && Math.abs(dy) < BUMP_DY && p.y > 0) {
        harmony = Math.max(0, harmony - (sightseeing ? 1 : 2));
        p.y = h + 80;
        playSfx?.();
      }
    }

    const vy = py - VIS_DH * 0.46;
    if (img?.visitor) {
      drawImgCentered(ctx, img.visitor, px, vy, VIS_DW, VIS_DH);
    } else {
      ctx.fillStyle = "#1a1c24";
      ctx.beginPath();
      ctx.arc(px, py, 22, 0, Math.PI * 2);
      ctx.fill();
    }
    if (bowCd > 0) {
      ctx.strokeStyle = "rgba(255,230,200,0.75)";
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(px, vy - 6, 44, Math.PI * 1.08, Math.PI * 1.92);
      ctx.stroke();
    }

    drawHudPanel(ctx, 6, 8, w - 12, 34, 0.94);
    ctx.fillStyle = "#2a3142";
    ctx.font = "600 13px Zen Kaku Gothic New, sans-serif";
    ctx.textAlign = "left";
    ctx.textBaseline = "middle";
    ctx.fillText(`和気 ${harmony}　空格合掌`, 16, 25);
    const sec = Math.max(0, Math.ceil((duration - elapsed) / 1000));
    ctx.textAlign = "right";
    ctx.fillText(`${sec}s`, w - 14, 25);

    people.splice(0, people.length, ...people.filter((p) => p.y < h + PED_DH + 60));
  }

  function finish() {
    if (!running) return;
    running = false;
    cancelAnimationFrame(raf);
    window.removeEventListener("keydown", onKey);
    window.removeEventListener("keyup", offKey);
    canvas.remove();
    onFinish({
      levelId: "L02",
      title: "浅草参道",
      score: harmony,
      text: `和気指数 ${harmony}。避开人潮、适时合掌加分。`,
    });
  }

  raf = requestAnimationFrame(function tick(now) {
    if (!running) return;
    loop(now);
    if (running) raf = requestAnimationFrame(tick);
  });

  return () => {
    running = false;
    cancelAnimationFrame(raf);
    window.removeEventListener("keydown", onKey);
    window.removeEventListener("keyup", offKey);
    canvas.remove();
  };
}
