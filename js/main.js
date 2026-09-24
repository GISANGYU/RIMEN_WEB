import { scroll, math, ease } from "./scroll.js";
import { gl, DomPlane } from "./gl.js";
import { initReel } from "./reel.js";
import { WORKS, SURFACES, HERO_IMAGE } from "./content.js";

const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const esc = s => String(s).replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
const arrowSvg = '<svg viewBox="0 0 16 16" fill="none"><path stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.343 8h11.314m0 0L8.673 3.016M13.657 8l-4.984 4.984"/></svg>';

/* ── 글자 굴림 — 같은 글자 4벌을 세로로 쌓는다 (원본 project-item-line-2) ── */
function rollChars(text) {
  return [...text].map((ch, i) => {
    const c = ch === " " ? " " : esc(ch);
    return `<span class="roll"><span style="transition-delay:${(i * 0.025).toFixed(3)}s">${`<span>${c}</span>`.repeat(4)}</span></span>`;
  }).join("");
}

/* ── ③ 테스트 로그 카드 ─────────────────────── */
function buildWorks() {
  $("#home-featured-items").innerHTML = WORKS.map((w, i) => `
    <a class="project-item" href="#" data-i="${i}">
      <div class="project-item-main">
        <div class="project-item-image"><img class="gl-fallback" src="${w.image}" alt="${esc(w.title)}" loading="lazy"></div>
        <span class="project-item-kind">${w.kind === "rnd" ? "R&amp;D" : "TEST LOG"}${w.video ? " ▶" : ""}</span>
      </div>
      <div class="project-item-footer">
        <div class="project-item-line-1 reveal-up"><b>${w.meta.map(esc).join(" · ")}</b> &nbsp;—&nbsp; ${w.tags.map(esc).join(" • ")}</div>
        <div class="project-item-line-2">
          <span class="project-item-line-2-icon">${arrowSvg}</span>
          <div class="project-item-line-2-inner">${rollChars(w.title)}</div>
        </div>
      </div>
    </a>`).join("");

  $$(".project-item").forEach(el => {
    el.addEventListener("pointerenter", () => el.classList.add("rolling"));
    el.addEventListener("pointerleave", () => el.classList.remove("rolling"));
    el.addEventListener("click", e => { e.preventDefault(); openLightbox(WORKS[+el.dataset.i]); });
  });
}

function buildSurfaces() {
  $("#home-goal-surfaces").innerHTML = SURFACES.map(s => `
    <article class="surface">
      <div class="surface-image"><img class="gl-fallback" src="${s.image}" alt="" loading="lazy"></div>
      <div class="surface-head"><span class="surface-no">${s.no}</span><h3 class="surface-title">${esc(s.title)}</h3></div>
      <p class="surface-sub">${esc(s.sub)}</p>
      <p class="surface-body">${esc(s.body)}</p>
    </article>`).join("");
}

/* ── 줄 단위 분할 (원본 SplitType lines) ────── */
const splitSources = new Map();
function splitLines(el) {
  if (!splitSources.has(el)) splitSources.set(el, el.innerHTML);
  const src = splitSources.get(el);
  const forced = src.split(/<br\s*\/?>/i);
  el.innerHTML = forced.map(seg => seg.trim().split(/\s+/).map(w => `<span class="w">${w}</span>`).join(" ")).join("<br>");
  const lines = []; let top = null, cur = [];
  for (const node of el.childNodes) {
    if (node.nodeName === "BR") { lines.push(cur); cur = []; top = null; continue; }
    if (node.nodeType !== 1) continue;
    const t = node.offsetTop;
    if (top !== null && Math.abs(t - top) > 2) { lines.push(cur); cur = []; }
    top = t; cur.push(node.innerHTML);
  }
  if (cur.length) lines.push(cur);
  el.innerHTML = lines.map((ws, i) => `<span class="split-line"><span style="transition-delay:${(i * 0.07).toFixed(2)}s">${ws.join(" ")}</span></span>`).join("");
}
function splitChars(el) {
  el.innerHTML = [...el.textContent].map((ch, i) =>
    ch === " " ? " " : `<span class="split-char" style="transition-delay:${(i / 30).toFixed(3)}s">${esc(ch)}</span>`).join("");
}
function splitAll() {
  $$(".split-lines").forEach(splitLines);
  $$(".split").forEach(el => { if (!el.querySelector(".split-line")) { el.innerHTML = `<span class="split-line"><span>${el.innerHTML}</span></span>`; } });
}

/* ── 들어오면 .in ───────────────────────────── */
let revealTargets = [];
function collectReveals() {
  revealTargets = [
    ...$$(".split-lines, .split, .split-chars, .reveal-up"),
    $("#home-featured-disclaimer"), $("#home-reel-cta"), $("#end-section-title"), ...$$(".surface"),
  ].filter(Boolean);
}
function updateReveals() {
  for (const el of revealTargets) {
    if (el.classList.contains("in")) continue;
    const r = scroll.range(el);
    if (r.screenRatio > -0.88) el.classList.add("in");
  }
}

/* ── ④ 터널 문장 — 먼 곳에서 다가와 지나간다 ── */
function updateTunnel() {
  const box = $("#home-goal-tunnel"), sticky = $("#home-goal-tunnel-sticky");
  const r = scroll.range(box), vh = scroll.vh;
  const pin = math.clamp(scroll.cur - r.top, 0, r.height - vh);
  sticky.style.transform = `translate3d(0, ${pin}px, 0)`;
  if (!r.isActive) return;
  const prog = math.saturate((scroll.cur - r.top) / (r.height - vh));
  const lines = $$(".tunnel-line", sticky), N = lines.length;
  lines.forEach((el, i) => {
    let x = prog * (N + 0.6) - i - 0.5;
    if (i === N - 1) x = Math.min(x, 0);                         // 마지막 문장은 남는다
    const scale = Math.pow(2.4, x * 2.6);
    const op = x < 0 ? math.fit(x, -1, -.25, 0, 1) : 1 - math.fit(x, .2, .55, 0, 1);
    el.style.transform = `translate(-50%, -50%) scale(${scale.toFixed(4)})`;
    el.style.opacity = op.toFixed(3);
    el.style.filter = x > .15 ? `blur(${((x - .15) * 16).toFixed(1)}px)` : "";
  });
}

/* ── 오버레이 ───────────────────────────────── */
function openVideo() {
  const ov = $("#video-overlay"), v = $("#video-overlay-video");
  ov.hidden = false; v.currentTime = 0; v.play().catch(() => {});
}
function closeVideo() { const v = $("#video-overlay-video"); v.pause(); $("#video-overlay").hidden = true; }

function openLightbox(w) {
  const box = $("#lightbox");
  $("#lightbox-media").innerHTML = w.video
    ? `<video src="${w.video}" poster="${w.image}" autoplay muted loop playsinline controls></video>`
    : `<img src="${w.image}" alt="${esc(w.title)}">`;
  $("#lightbox-text").innerHTML = `
    <p class="meta">${w.kind === "rnd" ? "R&amp;D" : "TEST LOG"} · ${w.meta.map(esc).join(" · ")}</p>
    <h3>${esc(w.title)}</h3>
    <p>${esc(w.memo || "")}</p>
    <p class="meta" style="margin-top:1.5em">${w.tags.map(esc).join(" • ")}</p>`;
  box.hidden = false;
}
function closeLightbox() { $("#lightbox").hidden = true; $("#lightbox-media").innerHTML = ""; }

function bindUI() {
  $$("[data-scroll-to]").forEach(a => a.addEventListener("click", e => {
    const id = a.getAttribute("href");
    const t = id && id.startsWith("#") && $(id);
    if (!t) return;
    e.preventDefault(); $("#menu").hidden = true; $("#menu-btn").setAttribute("aria-expanded", "false");
    scroll.to(t);
  }));
  $("#menu-btn").addEventListener("click", () => {
    const m = $("#menu"); m.hidden = !m.hidden;
    $("#menu-btn").setAttribute("aria-expanded", String(!m.hidden));
  });
  $("#video-overlay-close").addEventListener("click", closeVideo);
  $("#lightbox-close").addEventListener("click", closeLightbox);
  $("#lightbox").addEventListener("click", e => { if (e.target.id === "lightbox") closeLightbox(); });
  addEventListener("keydown", e => { if (e.key === "Escape") { closeVideo(); closeLightbox(); $("#menu").hidden = true; } });

  // 마지막 큰 문장도 호버하면 굴러간다
  const end = $("#end-section-title");
  end.innerHTML = rollChars(end.textContent);
  end.addEventListener("pointerenter", () => end.classList.add("rolling"));
  end.addEventListener("pointerleave", () => end.classList.remove("rolling"));

  // 히어로 제목은 줄 단위로 올라온다
  $$("#home-hero-title .line").forEach((l, i) => { l.classList.add("split-line"); l.innerHTML = `<span style="transition-delay:${0.15 + i * 0.1}s">${l.innerHTML}</span>`; });
}

/* ── 프리로더 — 원본 000→100 ─────────────────── */
const pre = { shown: 0, target: 0, done: false, finished: false, start: performance.now() };
function updatePreloader(dt) {
  if (pre.finished) return;
  if (performance.now() - pre.start > 7000) pre.target = 1;   // 느린 망에서도 7초면 연다
  pre.shown += (pre.target - pre.shown) * (1 - Math.exp(-dt * 5));
  if (pre.target >= 1 && pre.shown > .995) pre.shown = 1;
  const n = Math.round(pre.shown * 100);
  $("#preloader-count").textContent = String(n).padStart(3, "0");
  $("#preloader-bar span").style.width = n + "%";
  if (n >= 100 && !pre.done) {
    pre.done = true;
    setTimeout(() => {
      $("#preloader").classList.add("is-done");
      $("#home-hero-title").classList.add("in");
      pre.finished = true;
    }, 250);
  }
}

/* ── 시작 ───────────────────────────────────── */
buildWorks();
buildSurfaces();

const hasGL = gl.init($("#canvas"));
document.documentElement.classList.toggle("has-gl", hasGL);
scroll.init($("#smooth"));

let hero = null;
if (hasGL) {
  gl.onProgress = p => (pre.target = p);
  // 히어로: 키비주얼 + 마우스 시차 + 스크롤하면 당겨지며 어두워진다
  hero = gl.add(new DomPlane($("#home-hero-plane"), gl.texture(HERO_IMAGE), {
    reveal: 1, radius: 0, hover: false,
    onUpdate(p, r) {
      const u = p.mat.uniforms, prog = math.saturate(-r.screenY / r.height);
      const mx = gl.mouse.x < -1e3 ? 0 : gl.mouse.x / scroll.vw - .5, my = gl.mouse.y < -1e3 ? 0 : gl.mouse.y / scroll.vh - .5;
      p.local.lerp({ x: mx, y: my }, .05);
      u.u_parallax.value.set(p.local.x * .02, -p.local.y * .02 + prog * .06);
      u.u_zoom.value = .96 - prog * .1 + Math.sin(gl.time * .3) * .006;
      u.u_dim.value = prog * .55;
    },
  }));
  $$(".project-item").forEach((el, i) => {
    const w = WORKS[i];
    gl.add(new DomPlane($(".project-item-image", el), w.video ? gl.video(w.video, w.image) : gl.texture(w.image), { radius: 15, hoverEl: el }));
  });
  $$(".surface").forEach((el, i) => gl.add(new DomPlane($(".surface-image", el), gl.texture(SURFACES[i].image), { radius: 20 })));
} else {
  pre.target = 1;
}

const reel = initReel({ onOpen: openVideo });
bindUI();
splitAll();
$$(".split-chars").forEach(splitChars);
collectReveals();

function resize() {
  $$(".split-lines").forEach(splitLines);
  reel.resize();
  scroll.resize();
  if (hasGL) gl.resize();
}
resize();
addEventListener("resize", resize);
document.fonts?.ready.then(resize);

/* 헤더 로고 — 밑에 깔린 섹션이 어두우면 흰색 */
const darkSections = ["#home-hero", "#home-goal-tunnel", "#footer-section"].map(s => $(s));
function updateHeader() {
  const y = 40;
  const dark = darkSections.some(el => { const r = scroll.range(el); return r.screenY < y && r.screenY + r.height > y; });
  document.documentElement.classList.toggle("header-dark", dark);
}

function tick(dt) {
  scroll.update(dt);
  updateHeader();
  reel.update(dt);
  updateTunnel();
  if (pre.finished) updateReveals();
  updatePreloader(dt);
  if (hasGL) gl.render(dt);
}
let last = performance.now();
function frame(now) {
  tick(Math.min(.05, (now - last) / 1000)); last = now;
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);

/* 검증용 — 탭이 가려져 rAF 가 멈춘 브라우저에서도 프레임을 손으로 돌릴 수 있게 */
window.__rimen = {
  step(n = 1, dt = 1 / 60) { for (let i = 0; i < n; i++) tick(dt); last = performance.now(); },
  scroll, pre, gl,
};
