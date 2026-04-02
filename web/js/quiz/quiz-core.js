/**
 * 通用文化问答引擎（左右切题、交卷、等级、错题解析）
 * @param {HTMLElement} container
 * @param {{ questions: Array<{q:string, options:string[], answer:number, cat:string, explain:string}>, gradeFor: (score:number)=>{rank:string,title:string,comment:string}, quizTitle: string, onBack: () => void }} opts
 */
export function mountQuiz(container, { questions, gradeFor, quizTitle, onBack }) {
  const N = questions.length;
  let answers = Array(N).fill(null);
  let index = 0;
  let phase = "quiz";

  const el = document.createElement("div");
  el.className = "quiz-app";
  el.innerHTML = `
    <div class="quiz-panel" id="quiz-panel-quiz">
      <h2 class="quiz-main-title" id="quiz-main-title"></h2>
      <div class="quiz-top">
        <p class="quiz-progress">第 <strong id="quiz-cur">1</strong> / ${N} 题</p>
        <p class="quiz-cat" id="quiz-cat"></p>
      </div>
      <p class="quiz-q" id="quiz-q"></p>
      <div class="quiz-options" id="quiz-options" role="radiogroup"></div>
      <div class="quiz-nav">
        <button type="button" class="btn-quiz-nav" id="quiz-prev" aria-label="上一题">← 上一题</button>
        <div class="quiz-nav-mid">
          <span class="quiz-hint">提示：键盘 ← → 切换题目，按 1–4 选择</span>
        </div>
        <button type="button" class="btn-quiz-nav" id="quiz-next" aria-label="下一题">下一题 →</button>
      </div>
      <div class="quiz-submit-row">
        <button type="button" class="btn-primary btn-quiz-submit" id="quiz-submit">交卷并查看结果</button>
      </div>
    </div>
    <div class="quiz-panel quiz-result-panel" id="quiz-panel-result" hidden>
      <div class="quiz-result-head">
        <p class="quiz-score-line">得分 <strong id="quiz-score-num">0</strong> / ${N}</p>
        <p class="quiz-rank"><span id="quiz-rank-letter"></span> · <span id="quiz-rank-title"></span></p>
        <p class="quiz-comment" id="quiz-comment"></p>
      </div>
      <div class="quiz-wrong-wrap" id="quiz-wrong-wrap" hidden>
        <h3 class="quiz-wrong-h">错题回顾</h3>
        <ul class="quiz-wrong-list" id="quiz-wrong-list"></ul>
      </div>
      <div class="quiz-result-actions">
        <button type="button" class="btn-primary" id="quiz-retry">再测一次</button>
        <button type="button" class="btn-ghost" id="quiz-back">回主站</button>
      </div>
    </div>
  `;
  container.appendChild(el);

  const $ = (id) => el.querySelector(`#${id}`);
  $("quiz-main-title").textContent = quizTitle;

  function renderQuestion() {
    const q = questions[index];
    $("quiz-cur").textContent = String(index + 1);
    $("quiz-cat").textContent = q.cat;
    $("quiz-q").textContent = q.q;
    const opts = $("quiz-options");
    opts.innerHTML = "";
    q.options.forEach((text, i) => {
      const b = document.createElement("button");
      b.type = "button";
      b.className = "quiz-opt" + (answers[index] === i ? " selected" : "");
      b.dataset.idx = String(i);
      b.innerHTML = `<span class="quiz-opt-key">${i + 1}</span><span class="quiz-opt-txt">${text}</span>`;
      b.addEventListener("click", () => {
        answers[index] = i;
        renderQuestion();
      });
      opts.appendChild(b);
    });
    $("quiz-prev").disabled = index === 0;
    const isLast = index === N - 1;
    $("quiz-next").hidden = isLast;
    $("quiz-submit").hidden = !isLast;
  }

  function computeScore() {
    let s = 0;
    for (let i = 0; i < N; i++) {
      if (answers[i] === questions[i].answer) s += 1;
    }
    return s;
  }

  function escapeHtml(s) {
    const d = document.createElement("div");
    d.textContent = s;
    return d.innerHTML;
  }

  function showResult() {
    const unanswered = answers.some((a) => a === null);
    if (unanswered) {
      const ok = window.confirm("尚有题目未选择，确定要交卷吗？");
      if (!ok) return;
    }
    const score = computeScore();
    const g = gradeFor(score);
    phase = "result";
    $("quiz-panel-quiz").hidden = true;
    $("quiz-panel-result").hidden = false;
    $("quiz-score-num").textContent = String(score);
    $("quiz-rank-letter").textContent = g.rank;
    $("quiz-rank-title").textContent = g.title;
    $("quiz-comment").textContent = g.comment;

    const wrong = [];
    for (let i = 0; i < N; i++) {
      if (answers[i] !== questions[i].answer) {
        wrong.push(i);
      }
    }
    const wrap = $("quiz-wrong-wrap");
    const list = $("quiz-wrong-list");
    list.innerHTML = "";
    if (wrong.length === 0) {
      wrap.hidden = true;
    } else {
      wrap.hidden = false;
      for (const i of wrong) {
        const q = questions[i];
        const picked = answers[i];
        const pickedLabel = picked == null ? "（未作答）" : q.options[picked];
        const rightLabel = q.options[q.answer];
        const li = document.createElement("li");
        li.innerHTML = `
          <div class="quiz-wrong-title">第 ${i + 1} 题 · ${escapeHtml(q.cat)}</div>
          <div class="quiz-wrong-q">${escapeHtml(q.q)}</div>
          <div class="quiz-wrong-ans">你的选择：${escapeHtml(pickedLabel)}</div>
          <div class="quiz-wrong-right">正确答案：<strong>${escapeHtml(rightLabel)}</strong></div>
          <div class="quiz-wrong-exp">${escapeHtml(q.explain)}</div>
        `;
        list.appendChild(li);
      }
    }
  }

  function resetQuiz() {
    answers = Array(N).fill(null);
    index = 0;
    phase = "quiz";
    $("quiz-panel-quiz").hidden = false;
    $("quiz-panel-result").hidden = true;
    renderQuestion();
  }

  $("quiz-prev").addEventListener("click", () => {
    if (index > 0) {
      index -= 1;
      renderQuestion();
    }
  });
  $("quiz-next").addEventListener("click", () => {
    if (index < N - 1) {
      index += 1;
      renderQuestion();
    }
  });
  $("quiz-submit").addEventListener("click", showResult);
  $("quiz-retry").addEventListener("click", resetQuiz);
  $("quiz-back").addEventListener("click", () => {
    onBack();
  });

  function onKey(e) {
    if (phase !== "quiz") return;
    if (e.target && (e.target.tagName === "INPUT" || e.target.tagName === "TEXTAREA")) return;
    if (e.code === "ArrowLeft") {
      e.preventDefault();
      if (index > 0) {
        index--;
        renderQuestion();
      }
    } else if (e.code === "ArrowRight") {
      e.preventDefault();
      if (index < N - 1) {
        index++;
        renderQuestion();
      }
    } else if (e.code >= "Digit1" && e.code <= "Digit4") {
      const i = Number(e.code.slice(5)) - 1;
      answers[index] = i;
      renderQuestion();
    } else if (e.code >= "Numpad1" && e.code <= "Numpad4") {
      const i = Number(e.code.slice(6)) - 1;
      answers[index] = i;
      renderQuestion();
    }
  }
  window.addEventListener("keydown", onKey);

  renderQuestion();

  return () => {
    window.removeEventListener("keydown", onKey);
    el.remove();
  };
}
