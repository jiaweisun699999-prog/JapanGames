import { fitCanvas, clamp, drawImageCover } from "./util.js";
import { loadPngMap } from "../ai-load.js";
import { drawImgCentered, drawHudPanel } from "../sprites.js";

const MAP = {
  bg: "assets/ai/l06-bg-dive.png",
  diver: "assets/ai/l06-spr-diver.png",
  fish1: "assets/ai/l06-spr-fish1.png",
  fish2: "assets/ai/l06-spr-fish2.png",
  fish3: "assets/ai/l06-spr-fish3.png",
};

const SPECIES = [
  { key: "fish1", name: "鲑", base: 110 },
  { key: "fish2", name: "鲔", base: 220 },
  { key: "fish3", name: "蝶鱼", base: 380 },
];

function upgradeCost(level) {
  return Math.floor(90 * Math.pow(1.52, level));
}

function formatYen(n) {
  return `¥${Math.floor(n).toLocaleString("zh-CN")}`;
}

/**
 * @param {HTMLElement} root
 * @param {{ sightseeing: boolean, onFinish: (r: object) => void, playSfx?: () => void }} opts
 */
export function startGame(root, { sightseeing, onFinish, playSfx }) {
  let running = true;
  let raf = 0;

  const wrap = document.createElement("div");
  wrap.className = "l06-root";

  const divePanel = document.createElement("div");
  divePanel.className = "l06-dive-panel";
  const canvas = document.createElement("canvas");
  divePanel.appendChild(canvas);

  const diveHud = document.createElement("div");
  diveHud.className = "l06-dive-hud";
  diveHud.innerHTML = `
    <img class="l06-dive-deco" src="assets/ai/l06-ui-mode-buttons.png" alt="" width="200" height="120" loading="lazy" />
    <div class="l06-o2-wrap" aria-hidden="true">
      <span class="l06-o2-label">氧气</span>
      <div class="l06-o2-bar"><div class="l06-o2-fill" id="l06-o2-fill"></div></div>
    </div>
    <button type="button" class="l06-btn-surface btn-primary" id="l06-surface">上浮回店</button>
  `;
  divePanel.appendChild(diveHud);

  const shopPanel = document.createElement("div");
  shopPanel.className = "l06-shop-panel";
  shopPanel.hidden = true;
  shopPanel.innerHTML = `
    <div class="l06-shop-inner">
      <img class="l06-shop-deco" src="assets/ai/l06-ui-upgrade-strip.png" alt="" width="360" height="80" loading="lazy" />
      <h3 class="l06-shop-title">外带寿司柜台</h3>
      <p class="l06-shop-money" id="l06-money"></p>
      <div class="l06-catch" id="l06-catch"></div>
      <div class="l06-shop-actions">
        <button type="button" class="btn-primary" id="l06-sell">出售渔获</button>
        <button type="button" class="btn-ghost" id="l06-dive-again">再潜一次</button>
        <button type="button" class="btn-ghost" id="l06-end-shift">本日收工</button>
      </div>
      <div class="l06-upgrades" id="l06-upgrades"></div>
    </div>
  `;

  wrap.appendChild(divePanel);
  wrap.appendChild(shopPanel);
  root.appendChild(wrap);

  const state = {
    money: 0,
    totalSold: 0,
    dives: 0,
    upO2: 0,
    upCargo: 0,
    upSwim: 0,
    /** @type {number[]} species indices */
    lastCatch: [],
    phase: "dive",
  };

  let px = 0;
  let py = 0;
  let o2 = 1;
  let o2max = 1;
  /** @type {{ x: number, y: number, vx: number, vy: number, t: number, r: number }[]} */
  let fish = [];
  let spawnAcc = 0;
  /** 本轮潜水中的渔获（物种索引），上岸后写入 state.lastCatch */
  let tripCatch = [];
  const keys = new Set();
  let touchStartX = null;

  const onKeyDown = (e) => {
    if (e.code === "ArrowLeft" || e.code === "KeyA") keys.add("L");
    if (e.code === "ArrowRight" || e.code === "KeyD") keys.add("R");
  };
  const onKeyUp = (e) => {
    if (e.code === "ArrowLeft" || e.code === "KeyA") keys.delete("L");
    if (e.code === "ArrowRight" || e.code === "KeyD") keys.delete("R");
  };
  window.addEventListener("keydown", onKeyDown);
  window.addEventListener("keyup", onKeyUp);

  const onTouchStart = (e) => {
    touchStartX = e.touches[0].clientX;
  };
  const onTouchMove = (e) => {
    if (touchStartX == null) return;
    const dx = e.touches[0].clientX - touchStartX;
    px += dx * 0.45;
    touchStartX = e.touches[0].clientX;
  };
  const onTouchEnd = () => {
    touchStartX = null;
  };
  canvas.addEventListener("touchstart", onTouchStart, { passive: true });
  canvas.addEventListener("touchmove", onTouchMove, { passive: true });
  canvas.addEventListener("touchend", onTouchEnd);

  /** @type {Record<string, HTMLImageElement | null> | null} */
  let img = null;
  loadPngMap(MAP, { chromaExcept: ["bg"] }).then((m) => {
    img = m;
  });

  const $surface = diveHud.querySelector("#l06-surface");
  const o2Fill = diveHud.querySelector("#l06-o2-fill");

  function maxOxygenSec() {
    const base = sightseeing ? 52 : 38;
    return base + state.upO2 * 6;
  }

  function maxCargo() {
    return 5 + state.upCargo * 2;
  }

  function swimMult() {
    return 1 + state.upSwim * 0.09;
  }

  function beginDive() {
    cancelAnimationFrame(raf);
    state.phase = "dive";
    divePanel.hidden = false;
    shopPanel.hidden = true;
    const { w, h } = fitCanvas(canvas, root, 16 / 9);
    px = w * 0.5;
    py = h * 0.58;
    o2max = maxOxygenSec();
    o2 = o2max;
    fish = [];
    spawnAcc = 0;
    tripCatch = [];
    loop.prevT = undefined;
    loop();
  }

  function endDiveToShop() {
    cancelAnimationFrame(raf);
    state.phase = "shop";
    state.dives += 1;
    state.lastCatch = tripCatch.slice();
    divePanel.hidden = true;
    shopPanel.hidden = false;
    renderShop();
  }

  function pickSpeciesIndex() {
    const r = Math.random();
    if (r < 0.42) return 0;
    if (r < 0.72) return 1;
    return 2;
  }

  function spawnFish(w, h) {
    const t = pickSpeciesIndex();
    const fromLeft = Math.random() < 0.5;
    const x = fromLeft ? -40 : w + 40;
    const y = h * (0.28 + Math.random() * 0.42);
    const base = (sightseeing ? 0.85 : 1.05) * swimMult();
    const vx = (fromLeft ? 1 : -1) * (1.2 + Math.random() * 0.9) * base;
    const vy = (Math.random() - 0.5) * 0.35;
    fish.push({ x, y, vx, vy, t, r: 22 });
  }

  function loop(now = performance.now()) {
    if (!running || state.phase !== "dive") return;
    let last = loop.prevT ?? now;
    loop.prevT = now;
    const dt = clamp((now - last) / 16.67, 0.5, 3.5);

    const { ctx, w, h } = fitCanvas(canvas, root, 16 / 9);
    if (!px) px = w * 0.5;
    py = h * 0.58;

    const spd = (sightseeing ? 4.2 : 5.4) * swimMult();
    if (keys.has("L")) px -= spd * dt;
    if (keys.has("R")) px += spd * dt;
    px = clamp(px, 40, w - 40);

    o2 -= (1 / 60) * dt;
    if (o2 <= 0) {
      o2 = 0;
      if (o2Fill) o2Fill.style.width = "0%";
      playSfx?.();
      endDiveToShop();
      return;
    }
    if (o2Fill) o2Fill.style.width = `${clamp((o2 / o2max) * 100, 0, 100)}%`;

    spawnAcc += dt;
    const interval = sightseeing ? 52 : 38;
    if (spawnAcc >= interval) {
      spawnAcc = 0;
      if (tripCatch.length < maxCargo()) spawnFish(w, h);
    }

    if (img?.bg) {
      drawImageCover(ctx, img.bg, w, h);
      ctx.fillStyle = "rgba(10,40,72,0.22)";
      ctx.fillRect(0, 0, w, h);
    } else {
      const g = ctx.createLinearGradient(0, 0, 0, h);
      g.addColorStop(0, "#4a90c8");
      g.addColorStop(1, "#1a3a5c");
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, w, h);
    }

    const catchLimit = maxCargo();
    for (const f of fish) {
      f.x += f.vx * dt;
      f.y += f.vy * dt;
      const sp = SPECIES[f.t];
      const fim = img?.[sp.key];
      if (fim) {
        drawImgCentered(ctx, fim, f.x, f.y, 52, 40, f.vx < 0 ? 0 : Math.PI);
      } else {
        ctx.fillStyle = ["#e8a078", "#5b8fc9", "#f0d060"][f.t];
        ctx.beginPath();
        ctx.arc(f.x, f.y, f.r, 0, Math.PI * 2);
        ctx.fill();
      }

      const dx = f.x - px;
      const dy = f.y - py;
      if (dx * dx + dy * dy < (f.r + 30) ** 2 && tripCatch.length < catchLimit) {
        tripCatch.push(f.t);
        f.x = -9999;
        playSfx?.();
      }
    }
    fish = fish.filter((f) => f.x > -120 && f.x < w + 120 && f.y > -40 && f.y < h + 60);

    const dim = img?.diver;
    if (dim) {
      drawImgCentered(ctx, dim, px, py, 72, 80);
    } else {
      ctx.fillStyle = "#2a3142";
      ctx.fillRect(px - 24, py - 32, 48, 64);
    }

    drawHudPanel(ctx, 8, 8, w - 16, 34, 0.92);
    ctx.fillStyle = "#2a3142";
    ctx.font = "600 13px Zen Kaku Gothic New, sans-serif";
    ctx.textBaseline = "middle";
    ctx.textAlign = "left";
    ctx.fillText(`渔获 ${tripCatch.length}/${catchLimit}　${formatYen(state.money)}`, 16, 25);

    raf = requestAnimationFrame(loop);
  }
  loop.prevT = undefined;

  $surface?.addEventListener("click", () => {
    if (state.phase !== "dive") return;
    playSfx?.();
    endDiveToShop();
  });

  function renderCatchSummary() {
    const el = shopPanel.querySelector("#l06-catch");
    if (!el) return;
    const counts = [0, 0, 0];
    for (const t of state.lastCatch) counts[t]++;
    const parts = SPECIES.map((s, i) => (counts[i] ? `${s.name}×${counts[i]}` : null)).filter(Boolean);
    el.innerHTML =
      parts.length === 0
        ? `<p class="l06-muted">本轮没有渔获。</p>`
        : `<p>${parts.join(" · ")}</p><p class="l06-fine">出售后可升级装备再下水。</p>`;
  }

  function sellValue() {
    const mult = sightseeing ? 0.88 : 1;
    let v = 0;
    for (const t of state.lastCatch) v += SPECIES[t].base * mult;
    return Math.floor(v);
  }

  function renderShop() {
    const moneyEl = shopPanel.querySelector("#l06-money");
    if (moneyEl) moneyEl.textContent = `店内资金 ${formatYen(state.money)} · 累计卖出 ${formatYen(state.totalSold)}`;
    renderCatchSummary();

    const upEl = shopPanel.querySelector("#l06-upgrades");
    if (!upEl) return;
    const maxLv = 6;
    const rows = [
      { id: "o2", label: "氧气瓶", lv: state.upO2, desc: "每级 +6s 潜水时间" },
      { id: "cargo", label: "鱼篓", lv: state.upCargo, desc: "每级 +2 条上限" },
      { id: "swim", label: "脚蹼", lv: state.upSwim, desc: "每级游速 +9%" },
    ];
    upEl.innerHTML = rows
      .map((r) => {
        const cost = upgradeCost(r.lv);
        const disabled = r.lv >= maxLv || state.money < cost;
        return `<div class="l06-up-row" data-up="${r.id}">
          <div><strong>${r.label}</strong> Lv.${r.lv}/${maxLv}<br/><span class="l06-fine">${r.desc}</span></div>
          <button type="button" class="btn-ghost l06-buy" data-up="${r.id}" ${disabled ? "disabled" : ""}>${r.lv >= maxLv ? "已满" : formatYen(cost)}</button>
        </div>`;
      })
      .join("");

    if (sellBtn) {
      sellBtn.disabled = state.lastCatch.length === 0;
    }
    if (diveAgainBtn) {
      diveAgainBtn.disabled = state.lastCatch.length > 0;
      diveAgainBtn.title = state.lastCatch.length > 0 ? "请先出售本轮渔获" : "";
    }
  }

  const sellBtn = shopPanel.querySelector("#l06-sell");
  const diveAgainBtn = shopPanel.querySelector("#l06-dive-again");
  const endBtn = shopPanel.querySelector("#l06-end-shift");
  const upgradesRoot = shopPanel.querySelector("#l06-upgrades");

  upgradesRoot?.addEventListener("click", (e) => {
    const btn = e.target.closest(".l06-buy");
    if (!btn || btn.disabled) return;
    const id = btn.getAttribute("data-up");
    const maxLv = 6;
    let lv = 0;
    if (id === "o2") lv = state.upO2;
    else if (id === "cargo") lv = state.upCargo;
    else if (id === "swim") lv = state.upSwim;
    else return;
    if (lv >= maxLv) return;
    const cost = upgradeCost(lv);
    if (state.money < cost) return;
    state.money -= cost;
    if (id === "o2") state.upO2++;
    if (id === "cargo") state.upCargo++;
    if (id === "swim") state.upSwim++;
    playSfx?.();
    renderShop();
  });

  sellBtn?.addEventListener("click", () => {
    if (state.lastCatch.length === 0) return;
    const v = sellValue();
    state.money += v;
    state.totalSold += v;
    state.lastCatch = [];
    playSfx?.();
    renderShop();
  });

  diveAgainBtn?.addEventListener("click", () => {
    beginDive();
  });

  endBtn?.addEventListener("click", () => {
    if (!running) return;
    running = false;
    cancelAnimationFrame(raf);
    cleanupListeners();
    wrap.remove();
    onFinish({
      levelId: "L06",
      title: "蓝洞外带寿司",
      text: `潜水 ${state.dives} 次，累计营业额 ${formatYen(state.totalSold)}，手头资金 ${formatYen(state.money)}。`,
    });
  });

  function cleanupListeners() {
    window.removeEventListener("keydown", onKeyDown);
    window.removeEventListener("keyup", onKeyUp);
    canvas.removeEventListener("touchstart", onTouchStart);
    canvas.removeEventListener("touchmove", onTouchMove);
    canvas.removeEventListener("touchend", onTouchEnd);
  }

  beginDive();

  return () => {
    running = false;
    cancelAnimationFrame(raf);
    cleanupListeners();
    wrap.remove();
  };
}
