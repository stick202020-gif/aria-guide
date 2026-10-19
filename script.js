(function () {
  const D = window.GUIDE_DATA;
  const screen = document.getElementById("screen");
  const toastEl = document.getElementById("toast");
  const state = { step: 0, answers: {} }; // step 0: 문자, 1~3: 질문, 4: 결과

  const el = (html) => { const t = document.createElement("div"); t.innerHTML = html.trim(); return t.firstChild; };
  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));

  function toast(msg) {
    toastEl.textContent = msg;
    toastEl.classList.add("show");
    clearTimeout(toast._t);
    toast._t = setTimeout(() => toastEl.classList.remove("show"), 2200);
  }

  function mount(node) {
    screen.innerHTML = "";
    screen.appendChild(node);
    screen.scrollTop = 0;
  }

  /* 0. 문자 수신 */
  function renderSms() {
    const s = D.sms;
    const node = el(`
      <div class="view sms">
        <div class="sms-head"><strong>${esc(s.sender)}</strong>문자 메시지</div>
        <div class="sms-time">${esc(s.time)}</div>
        <div class="bubble">${esc(s.body)}</div>
        <button class="link-card" id="openLink" type="button">
          <span class="t">${esc(s.linkLabel)}</span>
          <span class="u">${esc(s.linkUrl)}</span>
        </button>
        <div class="tap-hint">링크를 눌러 시작해 보세요</div>
      </div>`);
    node.querySelector("#openLink").onclick = () => go(1);
    mount(node);
  }

  /* 1~3. 질문 */
  function renderQuestion(i) {
    const q = D.questions[i - 1];
    const dots = D.questions.map((_, k) => `<i class="${k < i ? "on" : ""}"></i>`).join("");
    const node = el(`
      <div class="view q">
        <div class="q-top">
          <button class="back" type="button" id="back" ${i === 1 ? "hidden" : ""}>← 이전</button>
          <div class="progress"><div class="dots">${dots}</div><span>${i}/${D.questions.length}</span></div>
        </div>
        <div class="q-brand">ARIA · WESTIN JOSUN SEOUL</div>
        <h1>${esc(q.title)}</h1>
        <p class="sub">${esc(q.sub)}</p>
        <div class="options">
          ${q.options.map((o) => `
            <button class="opt" type="button" data-v="${esc(o.value)}">
              <span class="l">${esc(o.label)}</span>
              ${o.desc ? `<span class="d">${esc(o.desc)}</span>` : ""}
            </button>`).join("")}
        </div>
        <div class="skip"><button type="button" id="skip">건너뛰고 전체 보기</button></div>
      </div>`);
    node.querySelectorAll(".opt").forEach((b) => {
      b.onclick = () => { state.answers[q.id] = b.dataset.v; go(i + 1); };
    });
    const back = node.querySelector("#back");
    if (i > 1) back.onclick = () => go(i - 1);
    node.querySelector("#skip").onclick = () => { state.answers = { skipped: true }; go(4); };
    mount(node);
  }

  /* 4. 맞춤 결과 */
  function label(id, value) {
    const q = D.questions.find((x) => x.id === id);
    const o = q && q.options.find((x) => x.value === value);
    return o ? o.label : "";
  }

  function buildCover(a) {
    const name = D.persona.name;
    if (a.skipped) {
      return { eyebrow: "ARIA GUIDE", title: "아리아 예약 전<br>꼭 알아둘 정보", text: "목적을 고르지 않으셔도 한눈에 볼 수 있게 정리했어요.", chips: ["전체 보기"] };
    }
    const chips = [label("purpose", a.purpose), label("who", a.who), label("when", a.when)].filter(Boolean);
    let title = "아리아 맞춤 예약 가이드";
    let text = `${name} 님 상황에 맞춰 필요한 정보부터 보여드려요.`;
    if (a.purpose === "anniv" && a.who === "couple") {
      title = "소중한 사람과의<br>기념일을 위한 아리아 가이드";
      text = `${name} 님, 실패 없는 특별한 저녁을 위해 꼭 필요한 것만 모았어요.`;
    } else if (a.purpose === "anniv") {
      title = "기념일을 위한<br>아리아 가이드";
    } else if (a.purpose === "family") {
      title = "가족 모임을 위한<br>아리아 가이드";
    } else if (a.purpose === "biz") {
      title = "중요한 식사를 위한<br>아리아 가이드";
    }
    return { eyebrow: "ARIA · 맞춤 가이드", title, text, chips };
  }

  function buildOrder(a) {
    const base = ["booking", "cost", "timing", "visit"];
    if (a.skipped) return ["anniversary", "booking", "cost", "kids", "timing", "visit"];
    const order = [];
    if (a.purpose === "anniv") order.push("anniversary");
    const withKids = a.who === "family" || a.purpose === "family";
    if (withKids) order.push("kids");
    base.forEach((k) => order.push(k));
    // 이준혁(기념일+배우자): 대기 걱정이 큰 시나리오에서는 비용 다음에 시간대
    return order;
  }

  function sectionHtml(key, hl, a) {
    const s = D.sections[key];
    let body = "";
    if (s.rows) {
      body = `<div class="table">${s.rows.map((r) => `<div><span>${esc(r[0])}</span><span>${esc(r[1])}</span></div>`).join("")}</div>`;
    } else {
      body = `<ul>${s.items.map((t) => `<li>${esc(t)}</li>`).join("")}</ul>`;
    }
    let extra = "";
    if (key === "booking" && a.when && D.whenTips[a.when]) {
      extra = `<div class="tip">${esc(D.whenTips[a.when])}</div>`;
    }
    return `
      <section class="card ${hl ? "hl" : ""}" id="sec-${key}">
        ${hl ? '<span class="tag">나에게 맞춘 안내</span>' : ""}
        <h3>${esc(s.title)}<span class="badge">예시 데이터</span></h3>
        <p class="lead">${esc(s.lead)}</p>
        ${body}${extra}
      </section>`;
  }

  function renderResult() {
    const a = state.answers;
    const cover = buildCover(a);
    const order = buildOrder(a);
    const hlKeys = new Set();
    if (!a.skipped) {
      if (a.purpose === "anniv") hlKeys.add("anniversary");
      if (a.who === "family" || a.purpose === "family") hlKeys.add("kids");
    }
    const node = el(`
      <div class="view">
        <header class="cover">
          <div class="eyebrow">${esc(cover.eyebrow)}</div>
          <h2>${cover.title}</h2>
          <p>${esc(cover.text)}</p>
          <div class="chips">${cover.chips.map((c) => `<span class="chip">${esc(c)}</span>`).join("")}</div>
        </header>
        <nav class="toc">${order.map((k) => `<button type="button" data-k="${k}">${esc(D.sections[k].title)}</button>`).join("")}</nav>
        <div class="cards">
          ${order.map((k) => sectionHtml(k, hlKeys.has(k), a)).join("")}
          <div class="again"><button type="button" id="redo">다른 상황으로 다시 보기</button></div>
        </div>
        <div class="cta-bar"><button class="cta" type="button" id="cta">예약하러 가기</button></div>
      </div>`);
    node.querySelectorAll(".toc button").forEach((b) => {
      b.onclick = () => {
        const t = node.querySelector("#sec-" + b.dataset.k);
        if (t) t.scrollIntoView({ behavior: "smooth", block: "start" });
      };
    });
    node.querySelector("#cta").onclick = () => toast("기존 예약 채널로 이동합니다 (시연용)");
    node.querySelector("#redo").onclick = () => { state.answers = {}; go(1); };
    mount(node);
  }

  function go(step) {
    state.step = step;
    if (step === 0) renderSms();
    else if (step >= 1 && step <= D.questions.length) renderQuestion(step);
    else renderResult();
  }

  document.getElementById("restart").onclick = () => { state.answers = {}; go(0); };
  go(0);
})();
