import { loadSave, writeSave, unlockStamp } from "./storage.js";
import * as audio from "./audio.js";
import { startGame as startL01 } from "./games/l01-waterbus.js";
import { startGame as startL02 } from "./games/l02-asakusa.js";
import { startGame as startL03 } from "./games/l03-enoden.js";
import { startGame as startL04 } from "./games/l04-yokohama.js";
import { startGame as startL05 } from "./games/l05-nikko.js";
import { mountQuiz } from "./quiz/quiz-ui.js";
import { mountChinaQuiz } from "./quiz-china/china-quiz.js";
import { mountSpend } from "./spend/spend-ui.js";

const LEVELS = [
  {
    id: "L01",
    name: "隅田川水上巴士",
    spot: "东京 · 水上巴士",
    img: "assets/images/l01-waterbus.png",
    hint: "← → 或 A D 移动；触屏滑动。收集「印」，避开浮标。",
    start: startL01,
  },
  {
    id: "L02",
    name: "浅草参道",
    spot: "东京 · 雷门意象",
    img: "assets/images/l02-asakusa.png",
    hint: "← → 移动；空格合掌，靠近行人时加分。",
    start: startL02,
  },
  {
    id: "L03",
    name: "江之电车窗",
    spot: "神奈川 · 湘南沿线",
    img: "assets/images/l03-enoden.png",
    hint: "红线进入绿色区域时按空格或点击快门。",
    start: startL03,
  },
  {
    id: "L04",
    name: "横滨港湾",
    spot: "神奈川 · 港湾夜景",
    img: "assets/images/l04-yokohama.png",
    hint: "点击漂浮的灯火收集，时间宽裕。",
    start: startL04,
  },
  {
    id: "L05",
    name: "日光林道",
    spot: "栃木 · 林间步道意象",
    img: "assets/images/l05-nikko.png",
    hint: "按顺序点击路径上的休息点，读一句短句。",
    start: startL05,
  },
];

const screens = {
  hub: document.getElementById("screen-hub"),
  game: document.getElementById("screen-game"),
  gallery: document.getElementById("screen-gallery"),
  settings: document.getElementById("screen-settings"),
  quiz: document.getElementById("screen-quiz"),
  spend: document.getElementById("screen-spend"),
};

const el = {
  cards: document.getElementById("level-cards"),
  gameRoot: document.getElementById("game-root"),
  gameTitle: document.getElementById("game-title"),
  gameHud: document.getElementById("game-hud"),
  gameHint: document.getElementById("game-hint"),
  btnHome: document.getElementById("btn-home"),
  btnGallery: document.getElementById("btn-gallery"),
  btnSettings: document.getElementById("btn-settings"),
  brand: document.getElementById("brand-title"),
  modal: document.getElementById("modal-result"),
  resultTitle: document.getElementById("result-title"),
  resultBody: document.getElementById("result-body"),
  resultAgain: document.getElementById("result-again"),
  resultHub: document.getElementById("result-hub"),
  stampList: document.getElementById("stamp-list"),
  setSound: document.getElementById("set-sound"),
  heroImg: document.getElementById("hero-img"),
};

let save = loadSave();
let destroyGame = null;
let currentLevelId = null;
let pendingAgain = null;
/** @type {null | (() => void)} */
let quizDestroy = null;
/** @type {null | (() => void)} */
let spendDestroy = null;

function teardownQuiz() {
  if (quizDestroy) {
    quizDestroy();
    quizDestroy = null;
  }
  const qr = document.getElementById("quiz-root");
  if (qr) qr.innerHTML = "";
}

function teardownSpend() {
  if (spendDestroy) {
    spendDestroy();
    spendDestroy = null;
  }
  const sr = document.getElementById("spend-root");
  if (sr) sr.innerHTML = "";
}

function openQuiz() {
  teardownSpend();
  teardownQuiz();
  if (destroyGame) {
    destroyGame();
    destroyGame = null;
  }
  currentLevelId = null;
  el.gameRoot.innerHTML = "";
  const root = document.getElementById("quiz-root");
  if (!root) return;
  quizDestroy = mountQuiz(root, {
    onBack: () => {
      teardownQuiz();
      showScreen("hub");
    },
  });
  showScreen("quiz");
}

function openChinaQuiz() {
  teardownSpend();
  teardownQuiz();
  if (destroyGame) {
    destroyGame();
    destroyGame = null;
  }
  currentLevelId = null;
  el.gameRoot.innerHTML = "";
  const root = document.getElementById("quiz-root");
  if (!root) return;
  quizDestroy = mountChinaQuiz(root, {
    onBack: () => {
      teardownQuiz();
      showScreen("hub");
    },
  });
  showScreen("quiz");
}

function openSpend() {
  teardownSpend();
  teardownQuiz();
  if (destroyGame) {
    destroyGame();
    destroyGame = null;
  }
  currentLevelId = null;
  el.gameRoot.innerHTML = "";
  const root = document.getElementById("spend-root");
  if (!root) return;
  spendDestroy = mountSpend(root, {
    onBack: () => {
      teardownSpend();
      showScreen("hub");
    },
  });
  showScreen("spend");
}

function isSightseeing() {
  return document.querySelector('input[name="difficulty"]:checked')?.value === "sightseeing";
}

function soundOn() {
  return save.soundOn !== false;
}

function playSfx() {
  if (soundOn()) audio.sfxBlip();
}

function showScreen(name) {
  Object.values(screens).forEach((s) => s.classList.remove("active"));
  screens[name].classList.add("active");
  el.btnHome.hidden = name === "hub";
  const amb = name === "game" && currentLevelId ? currentLevelId : "hub";
  audio.playAmbience(amb, soundOn()).catch(() => {});
}

function buildCards() {
  el.cards.innerHTML = "";
  const spendBtn = document.createElement("button");
  spendBtn.type = "button";
  spendBtn.className = "level-card quiz-entry-card";
  spendBtn.innerHTML = `
    <div class="quiz-entry-visual" aria-hidden="true">¥</div>
    <div class="meta">
      <p class="name">花光 1 个亿</p>
      <p class="spot">50 张角色卡 · +/- 天数叠加 · 实时剩余预算 · 点击 + 弹中文感谢气泡</p>
    </div>`;
  spendBtn.addEventListener("click", openSpend);
  el.cards.appendChild(spendBtn);

  const quizBtn = document.createElement("button");
  quizBtn.type = "button";
  quizBtn.className = "level-card quiz-entry-card";
  quizBtn.innerHTML = `
    <div class="quiz-entry-visual" aria-hidden="true">問</div>
    <div class="meta">
      <p class="name">日本知识问答</p>
      <p class="spot">30 道文化选择题 · 左右切换题目 · 交卷后等级与错题解析</p>
    </div>`;
  quizBtn.addEventListener("click", openQuiz);
  el.cards.appendChild(quizBtn);

  const chinaBtn = document.createElement("button");
  chinaBtn.type = "button";
  chinaBtn.className = "level-card quiz-entry-card china-entry-card";
  chinaBtn.innerHTML = `
    <div class="quiz-entry-visual china-entry-visual" aria-hidden="true">华</div>
    <div class="meta">
      <p class="name">中国文化知识问答</p>
      <p class="spot">30 道文化选择题 · 与日本卷相同操作 · 独立题库与评语</p>
    </div>`;
  chinaBtn.addEventListener("click", openChinaQuiz);
  el.cards.appendChild(chinaBtn);

  for (const lv of LEVELS) {
    const b = document.createElement("button");
    b.type = "button";
    b.className = "level-card";
    b.dataset.id = lv.id;
    b.innerHTML = `
      <img src="${lv.img}" alt="" width="400" height="300" loading="lazy" />
      <div class="meta">
        <p class="name">${lv.name}</p>
        <p class="spot">${lv.spot}</p>
      </div>`;
    b.addEventListener("click", () => startLevel(lv.id));
    el.cards.appendChild(b);
  }
}

function renderGallery() {
  const stamps = loadSave().stamps;
  el.stampList.innerHTML = "";
  for (const lv of LEVELS) {
    const li = document.createElement("li");
    const ok = stamps[lv.id];
    if (!ok) li.classList.add("locked");
    li.innerHTML = `
      <div class="id">${lv.id}</div>
      <strong>${lv.name}</strong><br />
      ${ok ? "已解锁" : "完成任意一局解锁"}`;
    el.stampList.appendChild(li);
  }
}

function startLevel(id) {
  const lv = LEVELS.find((x) => x.id === id);
  if (!lv) return;
  teardownSpend();
  teardownQuiz();
  if (destroyGame) {
    destroyGame();
    destroyGame = null;
  }
  currentLevelId = id;
  el.gameRoot.innerHTML = "";
  el.gameTitle.textContent = lv.name;
  el.gameHud.textContent = isSightseeing() ? "观光模式" : "标准模式";
  el.gameHint.textContent = lv.hint;
  showScreen("game");
  audio.playAmbience(id, soundOn()).catch(() => {});

  destroyGame = lv.start(el.gameRoot, {
    sightseeing: isSightseeing(),
    onFinish: onLevelFinish,
    playSfx,
  });
}

function onLevelFinish(result) {
  if (destroyGame) {
    destroyGame();
    destroyGame = null;
  }
  unlockStamp(result.levelId);
  save = loadSave();
  pendingAgain = result.levelId;
  el.resultTitle.textContent = result.title;
  el.resultBody.textContent = result.text;
  el.modal.hidden = false;
  audio.playAmbience("hub", soundOn()).catch(() => {});
}

function closeModal() {
  el.modal.hidden = true;
  pendingAgain = null;
}

el.resultAgain.addEventListener("click", () => {
  const id = pendingAgain;
  closeModal();
  if (id) startLevel(id);
});

el.resultHub.addEventListener("click", () => {
  closeModal();
  el.gameRoot.innerHTML = "";
  currentLevelId = null;
  showScreen("hub");
  audio.playAmbience("hub", soundOn()).catch(() => {});
});

el.btnHome.addEventListener("click", () => {
  teardownSpend();
  teardownQuiz();
  if (destroyGame) {
    destroyGame();
    destroyGame = null;
  }
  el.gameRoot.innerHTML = "";
  currentLevelId = null;
  showScreen("hub");
  audio.playAmbience("hub", soundOn()).catch(() => {});
});

el.btnGallery.addEventListener("click", () => {
  teardownSpend();
  teardownQuiz();
  if (destroyGame) {
    destroyGame();
    destroyGame = null;
  }
  el.gameRoot.innerHTML = "";
  currentLevelId = null;
  renderGallery();
  showScreen("gallery");
  audio.playAmbience("hub", soundOn()).catch(() => {});
});

el.btnSettings.addEventListener("click", () => {
  teardownSpend();
  teardownQuiz();
  if (destroyGame) {
    destroyGame();
    destroyGame = null;
  }
  el.gameRoot.innerHTML = "";
  currentLevelId = null;
  el.setSound.checked = soundOn();
  showScreen("settings");
  audio.playAmbience("hub", soundOn()).catch(() => {});
});

el.setSound.addEventListener("change", () => {
  save = writeSave({ soundOn: el.setSound.checked });
  audio.setEnabled(el.setSound.checked);
});

el.heroImg.addEventListener("error", () => {
  el.heroImg.alt = "关东之旅";
  el.heroImg.src =
    "data:image/svg+xml," +
    encodeURIComponent(
      `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#e8dfd2"/><stop offset="1" stop-color="#3d4f73"/></linearGradient></defs><rect width="1200" height="630" fill="url(#g)"/></svg>`
    );
});

buildCards();
renderGallery();
showScreen("hub");
el.setSound.checked = soundOn();
audio.playAmbience("hub", soundOn()).catch(() => {});
