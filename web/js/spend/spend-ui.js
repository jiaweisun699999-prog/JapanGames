import { SPEND_BUDGET, SPEND_PEOPLE } from "./spend-data.js";

function formatCny(n) {
  return n.toLocaleString("zh-CN");
}

const THANKS = [
  "谢谢你！今天也很开心。",
  "感谢支持，辛苦啦～",
  "谢谢你选择我！",
  "承蒙关照！",
  "谢谢你的时间与心意。",
  "谢谢你，明天也一起加油。",
];

function makeBubble(text) {
  const b = document.createElement("div");
  b.className = "bubble";
  b.textContent = text;
  return b;
}

function clamp(v, a, b) {
  return Math.max(a, Math.min(b, v));
}

/**
 * @param {HTMLElement} container
 * @param {{ onBack: () => void }} opts
 */
export function mountSpend(container, { onBack }) {
  const el = document.createElement("div");
  el.className = "spend-app";
  el.innerHTML = `
    <div class="spend-head">
      <div>
        <h2 class="spend-title">花光 1 个亿（消费模拟）</h2>
        <p class="spend-sub">点击每张卡的 <strong>+</strong>/<strong>-</strong> 调整「天数」，直到预算正好用完。</p>
      </div>
      <div class="spend-stats">
        <div class="stat">
          <div class="k">总预算</div>
          <div class="v">¥ <span id="spend-budget"></span></div>
        </div>
        <div class="stat">
          <div class="k">已花费</div>
          <div class="v">¥ <span id="spend-spent"></span></div>
        </div>
        <div class="stat stat-remaining">
          <div class="k">剩余</div>
          <div class="v">¥ <span id="spend-remaining"></span></div>
        </div>
      </div>
    </div>

    <div class="spend-toolbar">
      <button type="button" class="btn-ghost" id="spend-reset">清空天数</button>
      <button type="button" class="btn-ghost" id="spend-back">回主站</button>
    </div>

    <div class="spend-grid" id="spend-grid"></div>

    <div class="spend-finish" id="spend-finish" hidden>
      <div class="spend-finish-card">
        <h3>恭喜：刚好花完 1 个亿</h3>
        <p>你可以继续微调天数，或清空后再挑战一次。</p>
      </div>
    </div>
  `;
  container.appendChild(el);

  const $ = (id) => el.querySelector(`#${id}`);

  const state = {
    days: Object.fromEntries(SPEND_PEOPLE.map((p) => [p.id, 0])),
    spent: 0,
    remaining: SPEND_BUDGET,
  };

  $("spend-budget").textContent = formatCny(SPEND_BUDGET);

  function recalc() {
    let spent = 0;
    for (const p of SPEND_PEOPLE) {
      spent += state.days[p.id] * p.pricePerDay;
    }
    state.spent = spent;
    state.remaining = SPEND_BUDGET - spent;
    $("spend-spent").textContent = formatCny(spent);
    $("spend-remaining").textContent = formatCny(Math.max(0, state.remaining));
    $("spend-finish").hidden = state.remaining !== 0;
  }

  function canAdd(p) {
    return state.remaining - p.pricePerDay >= 0;
  }

  function updateCard(cardEl, p) {
    const d = state.days[p.id];
    cardEl.querySelector(".spend-days").value = String(d);
    const minus = cardEl.querySelector(".spend-minus");
    const plus = cardEl.querySelector(".spend-plus");
    minus.disabled = d <= 0;
    plus.disabled = !canAdd(p);
    cardEl.querySelector(".spend-card-cost").textContent = `¥${formatCny(p.pricePerDay)}/天`;
  }

  function popThanks(cardEl) {
    const text = THANKS[Math.floor(Math.random() * THANKS.length)];
    const bubble = makeBubble(text);
    cardEl.appendChild(bubble);
    requestAnimationFrame(() => bubble.classList.add("show"));
    window.setTimeout(() => {
      bubble.classList.remove("show");
      window.setTimeout(() => bubble.remove(), 180);
    }, 900);
  }

  function build() {
    const grid = $("spend-grid");
    grid.innerHTML = "";
    for (const p of SPEND_PEOPLE) {
      const card = document.createElement("div");
      card.className = "spend-card";
      card.dataset.id = p.id;
      card.innerHTML = `
        <div class="spend-img-wrap">
          <img class="spend-img" src="${p.img}" alt="" loading="lazy" width="420" height="560" />
          <div class="spend-price-badge">¥${formatCny(p.pricePerDay)}/天</div>
        </div>
        <div class="spend-meta">
          <div class="spend-name">${escapeHtml(p.name)}</div>
          <div class="spend-row">
            <button type="button" class="spend-btn spend-minus" aria-label="减少天数">-</button>
            <input class="spend-days" inputmode="numeric" value="0" aria-label="天数" />
            <button type="button" class="spend-btn spend-plus" aria-label="增加天数">+</button>
          </div>
          <div class="spend-card-cost"></div>
        </div>
      `;

      const minus = card.querySelector(".spend-minus");
      const plus = card.querySelector(".spend-plus");
      const daysInput = card.querySelector(".spend-days");
      const imgEl = card.querySelector(".spend-img");

      // 若本地 png 不存在：尝试 jpg -> 最后回退占位图
      if (imgEl) {
        imgEl.addEventListener("error", () => {
          const cur = imgEl.getAttribute("src") || "";
          if (cur.endsWith(".png") && p.localJpg) {
            imgEl.src = p.localJpg;
            return;
          }
          if (!cur.includes("picsum.photos") && p.fallback) {
            imgEl.src = p.fallback;
          }
        });
      }

      minus.addEventListener("click", () => {
        const d = state.days[p.id];
        if (d <= 0) return;
        state.days[p.id] = d - 1;
        recalc();
        updateCard(card, p);
      });

      plus.addEventListener("click", () => {
        if (!canAdd(p)) return;
        state.days[p.id] += 1;
        recalc();
        updateCard(card, p);
        popThanks(card);
      });

      daysInput.addEventListener("change", () => {
        const raw = Number.parseInt(daysInput.value || "0", 10);
        const next = Number.isFinite(raw) ? clamp(raw, 0, 999) : 0;
        const prev = state.days[p.id];
        state.days[p.id] = next;
        // 如果超预算，回退到最大可用
        recalc();
        if (state.remaining < 0) {
          // 计算可加的最大天数
          const otherSpent = state.spent - next * p.pricePerDay;
          const maxDays = Math.floor((SPEND_BUDGET - otherSpent) / p.pricePerDay);
          state.days[p.id] = Math.max(0, maxDays);
          recalc();
        }
        updateCard(card, p);
        if (state.days[p.id] > prev) popThanks(card);
      });

      grid.appendChild(card);
      updateCard(card, p);
    }
    recalc();
  }

  function escapeHtml(s) {
    const d = document.createElement("div");
    d.textContent = s;
    return d.innerHTML;
  }

  $("spend-reset").addEventListener("click", () => {
    for (const p of SPEND_PEOPLE) state.days[p.id] = 0;
    recalc();
    // 更新全部卡片
    for (const card of el.querySelectorAll(".spend-card")) {
      const id = card.dataset.id;
      const p = SPEND_PEOPLE.find((x) => x.id === id);
      if (p) updateCard(card, p);
    }
  });

  $("spend-back").addEventListener("click", onBack);

  build();

  return () => {
    el.remove();
  };
}

