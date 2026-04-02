import { fitCanvas, drawImageCover } from "./util.js";
import { loadPngMap } from "../ai-load.js";
import { drawImgCentered, drawHudPanel } from "../sprites.js";

const HAIKU = [
  "松风まじり / 石段のぬけみち / 日ざし淡し",
  "杉の香に / 足どめ軽やか / 鳥の声",
  "苔むす灯 / 手水だけひそか / 春の午",
  "山深く / 一すじの道 / 雲の下",
  "息をそろえ / 葉擦れのリズム / 歩幅ゆるく",
];

const MAP = {
  bg: "assets/ai/bg-l05.png",
  stone: "assets/ai/spr-stone.png",
};

export function startGame(root, { sightseeing, onFinish, playSfx }) {
  const wrap = document.createElement("div");
  wrap.className = "nikko-wrap";
  root.appendChild(wrap);

  const canvas = document.createElement("canvas");
  wrap.appendChild(canvas);

  const caption = document.createElement("p");
  caption.className = "nikko-caption";
  caption.textContent = "沿路径点击休息点，收集林间的句。";
  wrap.appendChild(caption);

  const nodes = [];
  let visited = 0;
  const total = HAIKU.length;

  /** @type {Record<string, HTMLImageElement | null> | null} */
  let img = null;
  loadPngMap(MAP).then((m) => {
    img = m;
  });

  function layoutNodes(w, h) {
    nodes.length = 0;
    for (let i = 0; i < total; i++) {
      const t = (i + 1) / (total + 1);
      nodes.push({
        x: w * 0.12 + t * w * 0.76 + Math.sin(t * 4) * 40,
        y: h * 0.22 + t * h * 0.58,
        r: 22,
        done: false,
        idx: i,
      });
    }
  }

  function draw(now) {
    const { ctx, w, h } = fitCanvas(canvas, wrap, 4 / 5);
    if (nodes.length === 0) layoutNodes(w, h);

    if (img?.bg) {
      drawImageCover(ctx, img.bg, w, h);
      ctx.fillStyle = "rgba(26,28,36,0.18)";
      ctx.fillRect(0, 0, w, h);
    } else {
      const g = ctx.createLinearGradient(0, 0, w, h);
      g.addColorStop(0, "#1f3d2e");
      g.addColorStop(1, "#87a878");
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, w, h);
    }

    ctx.strokeStyle = "rgba(246,240,230,0.5)";
    ctx.lineWidth = 3;
    ctx.setLineDash([10, 8]);
    ctx.beginPath();
    ctx.moveTo(nodes[0].x, nodes[0].y);
    for (let i = 1; i < nodes.length; i++) ctx.lineTo(nodes[i].x, nodes[i].y);
    ctx.stroke();
    ctx.setLineDash([]);

    for (const n of nodes) {
      if (img?.stone) {
        const scale = n.done ? 0.9 : 1;
        ctx.save();
        ctx.globalAlpha = n.done ? 0.88 : 1;
        drawImgCentered(ctx, img.stone, n.x, n.y, 56 * scale, 56 * scale);
        ctx.restore();
      } else {
        ctx.fillStyle = n.done ? "#c45c4a" : "rgba(246,240,230,0.95)";
        ctx.beginPath();
        ctx.arc(n.x, n.y, n.r, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.fillStyle = n.done ? "#fff" : "#1a1c24";
      ctx.font = "700 15px Zen Kaku Gothic New, sans-serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.strokeStyle = "rgba(0,0,0,0.35)";
      ctx.lineWidth = 4;
      const label = n.done ? "✓" : `${n.idx + 1}`;
      ctx.strokeText(label, n.x, n.y + 2);
      ctx.fillText(label, n.x, n.y + 2);
    }

    drawHudPanel(ctx, 8, 8, Math.min(w - 16, 280), 34, 0.93);
    ctx.fillStyle = "#2a3142";
    ctx.font = "600 13px Zen Kaku Gothic New, sans-serif";
    ctx.textAlign = "left";
    ctx.textBaseline = "middle";
    ctx.fillText(`休息点 ${visited}/${total}`, 18, 25);
  }

  let raf = 0;
  let running = true;
  function loop(now) {
    if (!running) return;
    draw(now);
    raf = requestAnimationFrame(loop);
  }

  function hit(clientX, clientY) {
    const rect = canvas.getBoundingClientRect();
    const { w, h } = fitCanvas(canvas, wrap, 4 / 5);
    const x = ((clientX - rect.left) / rect.width) * w;
    const y = ((clientY - rect.top) / rect.height) * h;
    for (const n of nodes) {
      if (n.done) continue;
      const dx = n.x - x;
      const dy = n.y - y;
      if (dx * dx + dy * dy < (n.r + 14) ** 2) {
        n.done = true;
        visited += 1;
        caption.innerHTML = HAIKU[n.idx].replace(/\s*\/\s*/g, "　");
        playSfx?.();
        if (visited >= total) {
          setTimeout(finish, sightseeing ? 900 : 500);
        }
        break;
      }
    }
  }

  canvas.addEventListener("click", (e) => hit(e.clientX, e.clientY));
  canvas.addEventListener(
    "touchend",
    (e) => {
      e.preventDefault();
      const t = e.changedTouches[0];
      hit(t.clientX, t.clientY);
    },
    { passive: false }
  );

  function finish() {
    if (!running) return;
    running = false;
    cancelAnimationFrame(raf);
    wrap.remove();
    onFinish({
      levelId: "L05",
      title: "日光林道",
      score: visited,
      text: `休息点 ${visited}/${total}。俳句为原创短句，非古籍引用。`,
    });
  }

  raf = requestAnimationFrame(loop);

  return () => {
    running = false;
    cancelAnimationFrame(raf);
    wrap.remove();
  };
}
