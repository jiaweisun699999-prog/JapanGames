import { fitCanvas, drawImageCover } from "./util.js";
import { loadPngMap } from "../ai-load.js";
import { drawImgCentered, drawHudPanel } from "../sprites.js";

const MAP = {
  bg: "assets/ai/bg-l04.png",
  lantern: "assets/ai/spr-lantern.png",
};

function pointerToLogical(canvas, clientX, clientY, w, h) {
  const rect = canvas.getBoundingClientRect();
  return {
    x: ((clientX - rect.left) / rect.width) * w,
    y: ((clientY - rect.top) / rect.height) * h,
  };
}

export function startGame(root, { sightseeing, onFinish, playSfx }) {
  const canvas = document.createElement("canvas");
  root.appendChild(canvas);
  let running = true;
  let raf = 0;
  const duration = (sightseeing ? 100 : 55) * 1000;
  const t0 = performance.now();

  const items = [];
  let collected = 0;
  let spawnAcc = 0;

  /** @type {Record<string, HTMLImageElement | null> | null} */
  let img = null;
  loadPngMap(MAP).then((m) => {
    img = m;
  });

  function tryHit(clientX, clientY) {
    const { w, h } = fitCanvas(canvas, root, 16 / 9);
    const p = pointerToLogical(canvas, clientX, clientY, w, h);
    for (const it of items) {
      if (it.gone) continue;
      const dx = it.x - p.x;
      const dy = it.y + Math.sin(it.phase) * 4 - p.y;
      if (dx * dx + dy * dy < (it.r * 2.2) ** 2) {
        it.gone = true;
        collected += 1;
        playSfx?.();
        break;
      }
    }
  }

  const onClick = (e) => tryHit(e.clientX, e.clientY);
  const onTouch = (e) => {
    e.preventDefault();
    const t = e.changedTouches[0];
    tryHit(t.clientX, t.clientY);
  };
  canvas.addEventListener("click", onClick);
  canvas.addEventListener("touchend", onTouch, { passive: false });

  let last = performance.now();
  function loop(now) {
    if (!running) return;
    const { ctx, w, h } = fitCanvas(canvas, root, 16 / 9);
    const elapsed = now - t0;
    if (elapsed > duration) {
      finish();
      return;
    }
    const dt = now - last;
    last = now;

    if (img?.bg) {
      drawImageCover(ctx, img.bg, w, h);
      ctx.fillStyle = "rgba(10,12,22,0.22)";
      ctx.fillRect(0, 0, w, h);
    } else {
      const g = ctx.createLinearGradient(0, 0, 0, h);
      g.addColorStop(0, "#2a3358");
      g.addColorStop(1, "#0a0c14");
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, w, h);
    }

    ctx.fillStyle = "rgba(255,200,180,0.06)";
    for (let i = 0; i < 6; i++) {
      const x = ((now * 0.01 + i * 110) % (w + 80)) - 40;
      ctx.fillRect(x, h * 0.28, 20, h * 0.42);
    }

    spawnAcc += dt;
    if (spawnAcc > (sightseeing ? 1400 : 900)) {
      spawnAcc = 0;
      items.push({
        x: Math.random() * (w - 48) + 24,
        y: Math.random() * (h * 0.5) + 36,
        r: 12 + Math.random() * 5,
        phase: Math.random() * Math.PI * 2,
        gone: false,
      });
    }

    for (const it of items) {
      if (it.gone) continue;
      it.phase += dt * 0.002;
      const bob = Math.sin(it.phase) * 5;
      if (img?.lantern) {
        drawImgCentered(ctx, img.lantern, it.x, it.y + bob, it.r * 3.4, it.r * 4);
      } else {
        ctx.fillStyle = "#ffd88a";
        ctx.beginPath();
        ctx.arc(it.x, it.y + bob, it.r, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    drawHudPanel(ctx, 8, 8, w - 16, 38, 0.93);
    ctx.fillStyle = "#2a3142";
    ctx.font = "600 14px Zen Kaku Gothic New, sans-serif";
    ctx.textAlign = "left";
    ctx.textBaseline = "middle";
    ctx.fillText(`港湾灯火 ${collected}　点击收集`, 18, 27);
    const sec = Math.max(0, Math.ceil((duration - elapsed) / 1000));
    ctx.textAlign = "right";
    ctx.fillText(`${sec}s`, w - 18, 27);

    raf = requestAnimationFrame(loop);
  }

  function finish() {
    if (!running) return;
    running = false;
    cancelAnimationFrame(raf);
    canvas.removeEventListener("click", onClick);
    canvas.removeEventListener("touchend", onTouch);
    canvas.remove();
    onFinish({
      levelId: "L04",
      title: "横滨港湾",
      score: collected,
      text: `收集灯火 ${collected} 盏。夜色愈深，愈要慢慢找。`,
    });
  }

  raf = requestAnimationFrame(loop);

  return () => {
    running = false;
    cancelAnimationFrame(raf);
    canvas.removeEventListener("click", onClick);
    canvas.removeEventListener("touchend", onTouch);
    canvas.remove();
  };
}
