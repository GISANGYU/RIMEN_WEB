/* WORK — 도면 격자(자 눈금 · 점선) 위의 세로 작업 목록.
   휠 한 번 = 한 칸. 가운데 틀에 들어온 작업은 흩어진 입자가 이미지의 밝은 부분으로 모여 응결한 뒤, 실제 이미지로 바뀐다.
   틀 클릭 = CRT 전환으로 상세. */
import { WORKS } from "./data.js";

const imgCache = new Map();
function loadImg(src) {
  if (!imgCache.has(src)) imgCache.set(src, new Promise(res => { const i = new Image(); i.onload = () => res(i); i.onerror = () => res(null); i.src = src; }));
  return imgCache.get(src);
}
/* 이미지를 작게 줄여 밝은 픽셀 위치를 입자 목표로 */
async function targetsFor(src, w, h, n = 1500) {
  const img = await loadImg(src); if (!img) return [];
  const sw = 120, sh = Math.round(120 * h / w);
  const c = document.createElement("canvas"); c.width = sw; c.height = sh;
  const g = c.getContext("2d");
  const s = Math.max(sw / img.width, sh / img.height);
  g.drawImage(img, (sw - img.width * s) / 2, (sh - img.height * s) / 2, img.width * s, img.height * s);
  const d = g.getImageData(0, 0, sw, sh).data, cand = [];
  for (let y = 0; y < sh; y++) for (let x = 0; x < sw; x++) {
    const i = (y * sw + x) * 4, l = (d[i] * .3 + d[i + 1] * .59 + d[i + 2] * .11) / 255;
    if (Math.random() < l * l * 1.3) cand.push([x / sw * w, y / sh * h, l]);
  }
  for (let i = cand.length - 1; i > 0; i--) { const j = (Math.random() * (i + 1)) | 0; [cand[i], cand[j]] = [cand[j], cand[i]]; }
  return cand.slice(0, n);
}

export function mount(root, params, app) {
  let filter = "ALL";
  let list = WORKS;
  let cur = 0, curF = 0;
  try { const s = sessionStorage.getItem("limen:work"); if (s) cur = curF = Math.min(WORKS.length - 1, +s); } catch (e) {}

  root.className = "page dark";
  root.innerHTML = `<canvas class="fill grid"></canvas>
    <div class="work-list"></div>
    <div class="work-frame" data-hover><div class="edge"></div><img alt=""><video muted loop playsinline></video><canvas></canvas>
      <i class="brk a"></i><i class="brk b"></i><i class="brk c"></i><i class="brk d"></i></div>
    <div class="work-meta"><div class="no mono"></div><div class="t"></div><div class="s"></div></div>
    <div class="work-desc"><p></p><div class="play mono"><span class="st">LOADING</span><i><b></b></i><span class="tc">00:00</span></div></div>
    <div class="work-filter mono"><button data-f="ALL" class="on" data-hover>ALL</button><span>/</span><button data-f="TEST" data-hover>TEST LOG</button><span>/</span><button data-f="R&D" data-hover>R&amp;D</button></div>
    <div class="work-count mono"></div>
    <a class="side l mono" href="#/about" data-hover>&lt; ABOUT</a>
    <a class="side r mono" href="#/visit" data-hover>VISIT &gt;</a>
    <div class="hint mono">SCROLL · CLICK THE FRAME</div>`;
  const gcv = root.querySelector("canvas.grid"), gg = gcv.getContext("2d");
  const listEl = root.querySelector(".work-list"), frame = root.querySelector(".work-frame");
  const img = frame.querySelector("img"), vid = frame.querySelector("video"), pcv = frame.querySelector("canvas"), pg = pcv.getContext("2d");
  const meta = root.querySelector(".work-meta"), count = root.querySelector(".work-count");
  const desc = root.querySelector(".work-desc"), st = desc.querySelector(".st"), bar = desc.querySelector("b"), tc = desc.querySelector(".tc");

  function buildList() {
    list = filter === "ALL" ? WORKS : WORKS.filter(w => w.kind === filter || (filter === "TEST" && w.kind === "MAIN"));
    listEl.innerHTML = list.map((w, i) => `<a class="work-item" href="#/work/${w.id}" data-i="${i}" data-hover>${w.title}</a>`).join("");
    cur = Math.min(cur, list.length - 1); curF = cur;
    count.textContent = `${String(cur + 1).padStart(2, "0")} — ${String(list.length).padStart(2, "0")} ${filter === "ALL" ? "WORKS" : filter}`;
    select(cur, true);
  }
  root.querySelector(".work-filter").addEventListener("click", e => {
    const b = e.target.closest("button"); if (!b) return;
    filter = b.dataset.f; root.querySelectorAll(".work-filter button").forEach(x => x.classList.toggle("on", x === b)); cur = 0; buildList();
  });
  listEl.addEventListener("click", e => {
    const a = e.target.closest(".work-item"); if (!a) return;
    const i = +a.dataset.i; if (i !== cur) { e.preventDefault(); e.stopPropagation(); select(i); }
  }, true);
  frame.addEventListener("click", () => app.go(`#/work/${list[cur].id}`));

  // ── 입자 응결 ──
  // armed = 새 작업의 입자가 배치된 뒤에만 true. (이전 작업의 '다 모인 입자'를 보고 옛 영상을 틀어 버리던 버그 방지)
  let parts = [], condense = 0, frameW = 0, frameH = 0, token = 0, armed = false;
  async function select(i, instant) {
    cur = i; const w = list[cur]; const my = ++token; armed = false;
    try { sessionStorage.setItem("limen:work", WORKS.indexOf(w)); } catch (e) {}
    meta.querySelector(".no").textContent = `[ WORK ${String(WORKS.indexOf(w) + 1).padStart(2, "0")} · ${w.kind} ]`;
    const t = meta.querySelector(".t"); t.textContent = w.title; t.classList.toggle("kr", /[가-힣]/.test(w.title));
    meta.querySelector(".s").textContent = w.sub;
    desc.querySelector("p").textContent = w.desc;
    desc.classList.remove("in"); void desc.offsetWidth; desc.classList.add("in");
    st.textContent = "CONDENSING"; bar.style.width = "0%"; tc.textContent = "00:00";
    count.textContent = `${String(cur + 1).padStart(2, "0")} — ${String(list.length).padStart(2, "0")} ${filter === "ALL" ? "WORKS" : filter}`;
    img.style.opacity = 0; vid.style.opacity = 0; vid.pause();
    // offsetWidth 는 CRT 전환 중(scaleY)에도 실제 크기를 준다 — getBoundingClientRect 는 0 이 된다
    frameW = frame.offsetWidth; frameH = frame.offsetHeight;
    const dpr = Math.min(devicePixelRatio, 2);
    pcv.width = frameW * dpr; pcv.height = frameH * dpr; pg.setTransform(dpr, 0, 0, dpr, 0, 0);
    const tg = await targetsFor(w.still, frameW - 16, frameH - 16);
    if (my !== token) return;
    // 이전 입자에서 이어받아 흩뿌린 뒤 새 목표로
    parts = tg.map((p, k) => {
      const old = parts[k];
      return { x: old ? old.x : Math.random() * frameW, y: old ? old.y : Math.random() * frameH,
        vx: (Math.random() - .5) * 14, vy: (Math.random() - .5) * 14, tx: p[0] + 8, ty: p[1] + 8, l: p[2], delay: Math.random() * .35 };
    });
    condense = 0;
    img.src = w.still;
    vid.src = w.video; vid.load();
    armed = true;
    app.sound.blip(420 + cur * 30, .05, .03);
  }

  // ── 휠 · 키보드 ──
  let lock = 0;
  const wheel = e => {
    if (performance.now() < lock || Math.abs(e.deltaY) < 4) return;
    lock = performance.now() + 380;
    const n = Math.max(0, Math.min(list.length - 1, cur + Math.sign(e.deltaY)));
    if (n !== cur) select(n);
  };
  const key = e => {
    if (e.key === "ArrowDown") { const n = Math.min(list.length - 1, cur + 1); if (n !== cur) select(n); }
    if (e.key === "ArrowUp") { const n = Math.max(0, cur - 1); if (n !== cur) select(n); }
    if (e.key === "Enter") app.go(`#/work/${list[cur].id}`);
  };
  root.addEventListener("wheel", wheel, { passive: true }); addEventListener("keydown", key);
  // 터치: 위아래로 쓸기
  let ty0 = null;
  root.addEventListener("touchstart", e => (ty0 = e.touches[0].clientY), { passive: true });
  root.addEventListener("touchend", e => { if (ty0 === null) return; const d = ty0 - e.changedTouches[0].clientY; if (Math.abs(d) > 40) wheel({ deltaY: d }); ty0 = null; });

  // ── 도면 격자 ──
  let W, H, drawIn = 0;
  function resize() {
    const dpr = Math.min(devicePixelRatio, 2);
    W = root.clientWidth; H = root.clientHeight;
    gcv.width = W * dpr; gcv.height = H * dpr; gg.setTransform(dpr, 0, 0, dpr, 0, 0);
    frameW = frame.offsetWidth; frameH = frame.offsetHeight;
  }
  resize();
  const ro = new ResizeObserver(resize); ro.observe(root);

  function drawGrid(k) {
    gg.clearRect(0, 0, W, H);
    const fx0 = W / 2 - frameW / 2, fx1 = W / 2 + frameW / 2, fy0 = H / 2 - frameH / 2, fy1 = H / 2 + frameH / 2;
    gg.strokeStyle = "rgba(255,255,255,.28)"; gg.lineWidth = 1;
    const vline = (x, a = .28) => { gg.strokeStyle = `rgba(255,255,255,${a})`; gg.beginPath(); gg.moveTo(x + .5, 0); gg.lineTo(x + .5, H * k); gg.stroke(); };
    const hline = (y, a = .28) => { gg.strokeStyle = `rgba(255,255,255,${a})`; gg.beginPath(); gg.moveTo(0, y + .5); gg.lineTo(W * k, y + .5); gg.stroke(); };
    vline(fx0); vline(fx1); hline(fy0, .2); hline(fy1, .2);
    vline((fx0 + fx1) / 2, .07);
    gg.setLineDash([2, 5]); hline(fy0 - (fy1 - fy0), .14); hline(fy1 + (fy1 - fy0) * .35, .14); gg.setLineDash([]);
    // 자 눈금 (위 · 왼쪽)
    gg.fillStyle = "rgba(255,255,255,.45)"; gg.font = "9px 'Space Grotesk'";
    for (let x = 0; x < W * k; x += 10) { const L = x % 120 === 0 ? 8 : x % 60 === 0 ? 5 : 3; gg.fillRect(x, 0, 1, L); if (x % 120 === 0 && x) gg.fillText(x, x + 3, 16); }
    for (let y = 0; y < H * k; y += 10) { const L = y % 120 === 0 ? 8 : y % 60 === 0 ? 5 : 3; gg.fillRect(0, y, L, 1); if (y % 120 === 0 && y) gg.fillText(y, 11, y + 3); }
  }

  function tick(dt) {
    drawIn = Math.min(1, drawIn + dt * 1.4);
    drawGrid(1 - Math.pow(1 - drawIn, 3));

    // 목록: 현재 항목이 틀 가운데로 오도록 부드럽게
    curF += (cur - curF) * .14;
    const rowH = 30, centerY = root.clientHeight / 2;
    listEl.querySelectorAll(".work-item").forEach((el, i) => {
      const d = i - curF;
      const y = centerY + d * rowH + (d > 0 ? frameH / 2 + 14 : d < 0 ? -frameH / 2 - 14 : 0) * Math.min(1, Math.abs(d));
      el.style.transform = `translateY(${y - 8}px)`;
      const ad = Math.abs(d);
      el.style.opacity = ad < .5 ? 0 : Math.max(0, 1 - (ad - .5) * .16);
      el.style.color = ad < 1.5 ? "#fff" : "#9a9a9a";
    });

    // 입자
    pg.clearRect(0, 0, frameW, frameH);
    condense = Math.min(1, condense + dt * .9);
    let settled = 0;
    for (const p of parts) {
      if (condense > p.delay) {
        p.vx += (p.tx - p.x) * .06; p.vy += (p.ty - p.y) * .06;
      }
      p.vx *= .8; p.vy *= .8; p.x += p.vx; p.y += p.vy;
      if (Math.abs(p.tx - p.x) + Math.abs(p.ty - p.y) < 1.5) settled++;
      const a = .35 + p.l * .65;
      pg.fillStyle = `rgba(255,255,255,${a * (1 - Math.max(0, condense - .85) / .15 * .7)})`;
      pg.fillRect(p.x, p.y, 1.3, 1.3);
    }
    // 대부분 모이면 실제 이미지(영상)로
    if (armed && parts.length && settled / parts.length > .8) {
      armed = false;
      img.style.opacity = 1;
      vid.play().then(() => { vid.style.opacity = 1; st.textContent = "▶ PLAYING"; }).catch(() => { st.textContent = "PAUSED"; });
    }
    // 재생 진행 — 영상이 실제로 돌고 있는지 눈으로 보인다
    if (vid.duration && !vid.paused) {
      bar.style.width = (vid.currentTime / vid.duration * 100).toFixed(1) + "%";
      const s = Math.floor(vid.currentTime);
      tc.textContent = `00:${String(s).padStart(2, "0")} / 00:${String(Math.round(vid.duration)).padStart(2, "0")}`;
    }
  }

  buildList();
  return {
    theme: "dark", tick,
    destroy() { ro.disconnect(); removeEventListener("keydown", key); vid.pause(); },
  };
}
