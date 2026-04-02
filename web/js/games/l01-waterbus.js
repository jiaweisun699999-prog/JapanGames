import { fitCanvas, clamp, drawImageCover } from "./util.js";
import { loadPngMap } from "../ai-load.js";
import { drawImgCentered, drawHudPanel } from "../sprites.js";

const MAP = {
  bg: "assets/ai/bg-l01.png",
  boat: "assets/ai/spr-boat.png",
  buoy: "assets/ai/spr-buoy.png",
  stamp: "assets/ai/spr-stamp.png",
};

export function startGame(root, { sightseeing, onFinish, playSfx }) {
  const canvas = document.createElement("canvas");
  root.appendChild(canvas);
  let running = true;
  let raf = 0;

  const duration = (sightseeing ? 120 : 75) * 1000;
  const t0 = performance.now();

  let boatX = 0;
  const keys = new Set();
  const onKey = (e) => {
    if (e.code === "ArrowLeft" || e.code === "KeyA") keys.add("L");
    if (e.code === "ArrowRight" || e.code === "KeyD") keys.add("R");
  };
  const offKey = (e) => {
    if (e.code === "ArrowLeft" || e.code === "KeyA") keys.delete("L");
    if (e.code === "ArrowRight" || e.code === "KeyD") keys.delete("R");
  };
  window.addEventListener("keydown", onKey);
  window.addEventListener("keyup", offKey);

  let touchStartX = null;
  const onTouchStart = (e) => {
    touchStartX = e.touches[0].clientX;
  };
  const onTouchMove = (e) => {
    if (touchStartX == null) return;
    const dx = e.touches[0].clientX - touchStartX;
    boatX += dx * 0.35;
    touchStartX = e.touches[0].clientX;
  };
  const onTouchEnd = () => {
    touchStartX = null;
  };
  canvas.addEventListener("touchstart", onTouchStart, { passive: true });
  canvas.addEventListener("touchmove", onTouchMove, { passive: true });
  canvas.addEventListener("touchend", onTouchEnd);

  const buoys = [];
  const seals = [];
  let spawnT = 0;
  let comfort = 100;
  let score = 0;

  /** @type {Record<string, HTMLImageElement | null> | null} */
  let img = null;
  loadPngMap(MAP).then((m) => {
    img = m;
  });

  function spawn(now) {
    const { w, h } = fitCanvas(canvas, root, 16 / 9);
    boatX = boatX || w * 0.5;
    if (now - spawnT < (sightseeing ? 900 : 650)) return;
    spawnT = now;
    if (Math.random() < 0.42) {
      seals.push({
        x: Math.random() * (w - 80) + 40,
        y: -40,
        vy: 1.1 + Math.random() * 0.5,
        r: 16,
        got: false,
      });
    } else {
      buoys.push({
        x: Math.random() * (w - 100) + 50,
        y: -50,
        vy: 1.4 + Math.random() * 0.6,
        r: 18,
      });
    }
  }

  function loop(now) {
    if (!running) return;
    const { ctx, w, h } = fitCanvas(canvas, root, 16 / 9);
    const elapsed = now - t0;
    if (elapsed > duration) {
      finish();
      return;
    }

    if (keys.has("L")) boatX -= sightseeing ? 4.2 : 5.8;
    if (keys.has("R")) boatX += sightseeing ? 4.2 : 5.8;
    boatX = clamp(boatX, 56, w - 56);

    spawn(now);

    if (img?.bg) {
      drawImageCover(ctx, img.bg, w, h);
      ctx.fillStyle = "rgba(26,28,36,0.18)";
      ctx.fillRect(0, 0, w, h);
    } else {
      const water = ctx.createLinearGradient(0, 0, 0, h);
      water.addColorStop(0, "#9bb8d6");
      water.addColorStop(1, "#6d8eb8");
      ctx.fillStyle = water;
      ctx.fillRect(0, 0, w, h);
    }
    ctx.strokeStyle = "rgba(255,255,255,0.12)";
    ctx.lineWidth = 1.2;
    for (let i = 0; i < 8; i++) {
      const y = ((now * 0.035 + i * 72) % (h + 40)) - 20;
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(w, y + 8);
      ctx.stroke();
    }

    const boatY = h - 72;
    for (const b of buoys) {
      b.y += b.vy;
      if (img?.buoy) {
        drawImgCentered(ctx, img.buoy, b.x, b.y, 44, 56);
      } else {
        ctx.fillStyle = "#ff9a3c";
        ctx.beginPath();
        ctx.arc(b.x, b.y, b.r, 0, Math.PI * 2);
        ctx.fill();
      }
      const dx = b.x - boatX;
      const dy = b.y - boatY;
      if (dx * dx + dy * dy < (b.r + 28) ** 2) {
        comfort = Math.max(0, comfort - (sightseeing ? 4 : 10));
        b.y = h + 99;
        playSfx?.();
      }
    }
    for (const s of seals) {
      s.y += s.vy;
      if (!s.got) {
        if (img?.stamp) {
          drawImgCentered(ctx, img.stamp, s.x, s.y, 46, 46);
        } else {
          ctx.fillStyle = "#3d4f73";
          ctx.beginPath();
          ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
          ctx.fill();
        }
        const dx = s.x - boatX;
        const dy = s.y - boatY;
        if (dx * dx + dy * dy < (s.r + 32) ** 2) {
          s.got = true;
          score += 1;
          comfort = Math.min(100, comfort + (sightseeing ? 6 : 3));
          playSfx?.();
        }
      }
    }

    if (img?.boat) {
      drawImgCentered(ctx, img.boat, boatX, boatY, 124, 70);
    } else {
      ctx.fillStyle = "#1a1c24";
      ctx.beginPath();
      ctx.ellipse(boatX, boatY, 52, 18, 0, 0, Math.PI * 2);
      ctx.fill();
    }

    drawHudPanel(ctx, 8, 8, w - 16, 36, 0.93);
    ctx.save();
    ctx.fillStyle = "#2a3142";
    ctx.font = "600 14px Zen Kaku Gothic New, sans-serif";
    ctx.textAlign = "left";
    ctx.textBaseline = "middle";
    ctx.fillText(`印章 ${score}　舒适 ${comfort}`, 20, 26);
    const sec = Math.max(0, Math.ceil((duration - elapsed) / 1000));
    ctx.textAlign = "right";
    ctx.fillText(`${sec}s`, w - 20, 26);
    ctx.restore();

    buoys.splice(0, buoys.length, ...buoys.filter((b) => b.y < h + 60));
    seals.splice(0, seals.length, ...seals.filter((s) => s.y < h + 60));

    raf = requestAnimationFrame(loop);
  }

  function finish() {
    if (!running) return;
    running = false;
    cancelAnimationFrame(raf);
    window.removeEventListener("keydown", onKey);
    window.removeEventListener("keyup", offKey);
    canvas.remove();
    onFinish({
      levelId: "L01",
      title: "隅田川水上巴士",
      score,
      comfort,
      text: `收集印章 ${score} 枚，舒适指数 ${comfort}。`,
    });
  }

  raf = requestAnimationFrame(loop);

  return () => {
    running = false;
    cancelAnimationFrame(raf);
    window.removeEventListener("keydown", onKey);
    window.removeEventListener("keyup", offKey);
    canvas.remove();
  };
}
