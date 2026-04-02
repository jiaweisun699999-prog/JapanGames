import { fitCanvas, drawImageCover } from "./util.js";
import { loadPngMap } from "../ai-load.js";
import { drawImgCentered, drawHudPanel } from "../sprites.js";

const MAP = {
  bg: "assets/ai/bg-l03.png",
  train: "assets/ai/spr-train.png",
  camera: "assets/ai/spr-camera.png",
};

export function startGame(root, { sightseeing, onFinish, playSfx }) {
  const canvas = document.createElement("canvas");
  root.appendChild(canvas);
  let running = true;
  let raf = 0;

  const need = sightseeing ? 4 : 6;
  let shots = 0;
  let phaseT = 0;
  const cycle = sightseeing ? 3200 : 2600;
  const greenStart = sightseeing ? 0.4 : 0.36;
  const greenEnd = sightseeing ? 0.65 : 0.54;

  const onKey = (e) => {
    if (e.code === "Space" || e.code === "Enter") {
      e.preventDefault();
      shutter();
    }
  };
  window.addEventListener("keydown", onKey);
  canvas.addEventListener("click", () => shutter(), { passive: true });

  let last = performance.now();
  /** @type {Record<string, HTMLImageElement | null> | null} */
  let img = null;
  loadPngMap(MAP).then((m) => {
    img = m;
  });

  function meterNow() {
    return (phaseT % cycle) / cycle;
  }

  function shutter() {
    if (shots >= need) return;
    const m = meterNow();
    const ok = m >= greenStart && m <= greenEnd;
    if (ok) {
      shots += 1;
      playSfx?.();
    }
  }

  function loop(now) {
    if (!running) return;
    const dt = now - last;
    last = now;
    phaseT += dt;

    const { ctx, w, h } = fitCanvas(canvas, root, 16 / 9);

    if (shots >= need) {
      finish();
      return;
    }

    if (img?.bg) {
      drawImageCover(ctx, img.bg, w, h);
      ctx.fillStyle = "rgba(26,28,36,0.14)";
      ctx.fillRect(0, 0, w, h);
    } else {
      ctx.fillStyle = "#9ec0dc";
      ctx.fillRect(0, 0, w, h * 0.55);
      ctx.fillStyle = "#c4d6b8";
      ctx.fillRect(0, h * 0.55, w, h * 0.45);
    }

    const scroll = (now * 0.02) % (w + 200);
    ctx.strokeStyle = "rgba(255,255,255,0.35)";
    ctx.lineWidth = 2.5;
    for (let i = -2; i < 10; i++) {
      const x = (i * 120 - scroll) % (w + 120);
      ctx.beginPath();
      ctx.moveTo(x, 16);
      ctx.lineTo(x + 72, h * 0.48);
      ctx.stroke();
    }

    const frameX = w * 0.22;
    const frameY = h * 0.14;
    const frameW = w * 0.56;
    const frameH = h * 0.5;
    ctx.strokeStyle = "#f6f0e6";
    ctx.lineWidth = 5;
    ctx.strokeRect(frameX, frameY, frameW, frameH);
    ctx.fillStyle = "rgba(26,28,36,0.12)";
    ctx.fillRect(frameX, frameY, frameW, frameH);
    ctx.strokeStyle = "rgba(196,92,74,0.55)";
    ctx.lineWidth = 2;
    ctx.strokeRect(frameX + 6, frameY + 6, frameW - 12, frameH - 12);

    if (img?.camera) {
      drawImgCentered(ctx, img.camera, frameX + frameW - 30, frameY + 30, 58, 58);
    }

    if (img?.train) {
      const tw = Math.min(w * 0.92, 420);
      const th = (tw * 64) / 120;
      drawImgCentered(ctx, img.train, w / 2, h - th * 0.55, tw, th);
    } else {
      ctx.fillStyle = "#f2c94c";
      ctx.fillRect(w * 0.08, h - 52, w * 0.84, 36);
    }

    const m = meterNow();
    const barW = w - 100;
    const barX = 50;
    const barY = h - 40;
    drawHudPanel(ctx, barX - 12, barY - 14, barW + 24, 40, 0.94);
    ctx.fillStyle = "#d8d2c8";
    ctx.fillRect(barX, barY, barW, 10);
    ctx.fillStyle = "#5a8f5a";
    ctx.fillRect(barX + barW * greenStart, barY - 2, barW * (greenEnd - greenStart), 14);
    ctx.fillStyle = "#c45c4a";
    ctx.fillRect(barX + barW * m - 4, barY - 5, 8, 20);

    drawHudPanel(ctx, 8, 8, w - 16, 36, 0.92);
    ctx.fillStyle = "#2a3142";
    ctx.font = "600 14px Zen Kaku Gothic New, sans-serif";
    ctx.textAlign = "left";
    ctx.textBaseline = "middle";
    ctx.fillText(`取景 ${shots} / ${need}　红线进绿区按空格 / 点击`, 18, 26);

    raf = requestAnimationFrame(loop);
  }

  function finish() {
    if (!running) return;
    running = false;
    cancelAnimationFrame(raf);
    window.removeEventListener("keydown", onKey);
    canvas.remove();
    onFinish({
      levelId: "L03",
      title: "江之电车窗",
      score: shots,
      text: `成功取景 ${shots} 张。绿区更宽的是观光难度。`,
    });
  }

  raf = requestAnimationFrame(loop);

  return () => {
    running = false;
    cancelAnimationFrame(raf);
    window.removeEventListener("keydown", onKey);
    canvas.remove();
  };
}
