/* ver2 셸 — 해시 라우터 · CRT 붕괴 전환 · 커서 · 그레인 · 사운드
   페이지 모듈은 mount(root, params, app) → { destroy(), theme } 를 돌려준다. */
import { runIntro } from "./intro.js";

const $ = s => document.querySelector(s);
const view = $("#view");
const touch = matchMedia("(pointer: coarse)").matches;
const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
document.body.classList.toggle("touch", touch);

/* ── 사운드: 파일 없이 WebAudio 로 짧은 틱 ── */
const sound = {
  on: false, ctx: null,
  toggle() {
    this.on = !this.on;
    if (this.on && !this.ctx) this.ctx = new (window.AudioContext || window.webkitAudioContext)();
    $("#sound").textContent = `SOUND — ${this.on ? "ON" : "OFF"}`;
    if (this.on) this.blip(660, .06);
  },
  blip(freq = 880, dur = .04, gain = .04, type = "sine") {
    if (!this.on || !this.ctx) return;
    const t = this.ctx.currentTime, o = this.ctx.createOscillator(), g = this.ctx.createGain();
    o.type = type; o.frequency.setValueAtTime(freq, t); o.frequency.exponentialRampToValueAtTime(freq * .6, t + dur);
    g.gain.setValueAtTime(gain, t); g.gain.exponentialRampToValueAtTime(.0001, t + dur);
    o.connect(g).connect(this.ctx.destination); o.start(t); o.stop(t + dur + .02);
  },
  sweep(up = false) {  // 전환음: CRT 가 꺼지는 소리
    if (!this.on || !this.ctx) return;
    const t = this.ctx.currentTime, o = this.ctx.createOscillator(), g = this.ctx.createGain();
    o.type = "sawtooth"; o.frequency.setValueAtTime(up ? 60 : 900, t); o.frequency.exponentialRampToValueAtTime(up ? 900 : 40, t + .35);
    g.gain.setValueAtTime(.025, t); g.gain.exponentialRampToValueAtTime(.0001, t + .4);
    o.connect(g).connect(this.ctx.destination); o.start(t); o.stop(t + .45);
  },
};
$("#sound").addEventListener("click", () => sound.toggle());

/* ── 커서 ── */
const cursor = { x: innerWidth / 2, y: innerHeight / 2, cx: innerWidth / 2, cy: innerHeight / 2, el: $("#cur") };
addEventListener("pointermove", e => { cursor.x = e.clientX; cursor.y = e.clientY; }, { passive: true });
document.addEventListener("pointerover", e => {
  const h = e.target.closest && e.target.closest("[data-hover], a, button");
  cursor.el.classList.toggle("hover", !!h);
  if (h && !h._blipped) { sound.blip(1200, .025, .02); h._blipped = true; setTimeout(() => (h._blipped = false), 120); }
});
function tickCursor() {
  cursor.cx += (cursor.x - cursor.cx) * .18; cursor.cy += (cursor.y - cursor.cy) * .18;
  cursor.el.querySelector(".dot").style.transform = `translate3d(${cursor.x}px, ${cursor.y}px, 0)`;
  cursor.el.querySelector(".cross").style.transform = `translate3d(${cursor.cx}px, ${cursor.cy}px, 0)`;
}
export function setCursorHover(on) { cursor.el.classList.toggle("hover", on); }

/* ── 그레인: 한 번 만든 노이즈 타일을 매 프레임 조금씩 옮긴다 ── */
(function makeGrain() {
  const c = document.createElement("canvas"); c.width = c.height = 256;
  const g = c.getContext("2d"), img = g.createImageData(256, 256);
  for (let i = 0; i < img.data.length; i += 4) { const v = Math.random() * 255; img.data[i] = img.data[i + 1] = img.data[i + 2] = v; img.data[i + 3] = 255; }
  g.putImageData(img, 0, 0);
  $("#grain").style.backgroundImage = `url(${c.toDataURL()})`;
})();
let grainT = 0;
function tickGrain(dt) {
  grainT += dt;
  if (grainT > .07) { grainT = 0; $("#grain").style.transform = `translate(${(Math.random() * 20 - 10) | 0}%, ${(Math.random() * 20 - 10) | 0}%)`; }
}

/* ── CRT 붕괴 전환 ── */
const line = $("#crt i");
const wait = ms => new Promise(r => setTimeout(r, ms));
/* 애니메이션이 끝나기를 기다리되, 탭이 가려져 멈추면 시간 초과로 넘어간다 (전환이 영영 안 끝나는 것 방지) */
const done = (anim, ms) => Promise.race([anim.finished.catch(() => {}), wait(ms + 150)]);
async function crtOut() {
  sound.sweep(false);
  if (reduced) { view.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 200, fill: "forwards" }); await wait(200); return; }
  await done(view.animate([
    { transform: "scale(1, 1)", filter: "brightness(1)" },
    { transform: "scale(1, .004)", filter: "brightness(4)" },
  ], { duration: 340, easing: "cubic-bezier(.7,0,.84,0)", fill: "forwards" }), 340);
  view.style.opacity = 0;
  line.animate([{ transform: "scaleX(1)", opacity: 1 }, { transform: "scaleX(0)", opacity: 1 }, { transform: "scaleX(0)", opacity: 0 }],
    { duration: 260, easing: "cubic-bezier(.6,0,.2,1)", fill: "forwards" });
  await wait(300);
}
async function crtIn() {
  sound.sweep(true);
  view.getAnimations().forEach(a => a.cancel());
  if (reduced) { view.style.opacity = 1; return; }
  await done(line.animate([{ transform: "scaleX(0)", opacity: 1 }, { transform: "scaleX(1)", opacity: 1 }], { duration: 170, easing: "cubic-bezier(.2,.8,.2,1)", fill: "forwards" }), 170);
  view.style.opacity = 1;
  line.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 120, fill: "forwards" });
  const inAnim = view.animate([
    { transform: "scale(1, .004)", filter: "brightness(4)" },
    { transform: "scale(1, 1.02)", filter: "brightness(1.3)", offset: .75 },
    { transform: "scale(1, 1)", filter: "brightness(1)" },
  ], { duration: 460, easing: "cubic-bezier(.16,1,.3,1)" });
  await done(inAnim, 460);
  inAnim.cancel();
}

/* ── 라우터 ── */
const ROUTES = [
  [/^\/?$/, () => import("./home.js")],
  [/^\/about\/([\w-]+)$/, () => import("./spotlight.js")],
  [/^\/about$/, () => import("./about.js")],
  [/^\/work\/([\w-]+)$/, () => import("./project.js")],
  [/^\/work$/, () => import("./work.js")],
  [/^\/visit$/, () => import("./visit.js")],
];
let current = null, busy = false, pending = null;
const path = () => location.hash.replace(/^#/, "") || "/";

function match(p) {
  for (const [re, load] of ROUTES) { const m = p.match(re); if (m) return { load, params: m.slice(1) }; }
  return { load: ROUTES[0][1], params: [] };
}

async function show(p, how = "crt") {
  if (busy) { pending = [p, how]; return; }
  busy = true;
  const r = match(p);
  const modP = r.load();
  if (current) {
    if (how === "crt") await crtOut();
    else if (how === "fade") { view.style.opacity = 0; }
    current.destroy?.(); current = null;
  }
  view.innerHTML = "";
  const mod = await modP;
  const root = document.createElement("div");
  view.appendChild(root);
  current = await mod.mount(root, r.params, app);
  const theme = current.theme || "dark";
  document.body.classList.toggle("theme-light", theme === "light");
  document.body.classList.toggle("theme-dark", theme !== "light");
  document.querySelectorAll("#hdr [data-nav]").forEach(a => a.classList.toggle("on", p.startsWith("/" + a.dataset.nav)));
  if (how === "crt") await crtIn(); else { view.style.opacity = 1; view.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 500 }); }
  busy = false;
  if (pending) { const [pp, hh] = pending; pending = null; if (pp !== path()) { location.hash = pp; } else show(pp, hh); }
}

let nextHow = "crt";
export const app = {
  sound, cursor, touch, reduced,
  go(hash, how = "crt") {
    nextHow = how;
    if (location.hash === hash) show(path(), how); else location.hash = hash;
  },
  /* 같은 페이지 안에서 주소만 바꿀 때 (About 상세의 탭) */
  replace(hash) { history.replaceState(null, "", hash); },
};
addEventListener("hashchange", () => { const h = nextHow; nextHow = "crt"; show(path(), h); });

/* 링크는 전부 CRT 전환을 탄다 */
document.addEventListener("click", e => {
  const a = e.target.closest && e.target.closest('a[href^="#/"]');
  if (!a || e.metaKey || e.ctrlKey) return;
  e.preventDefault(); sound.blip(520, .05, .04, "triangle");
  app.go(a.getAttribute("href"), a.dataset.how || "crt");
});

/* ── 루프 ── */
let last = performance.now();
function frame(now) {
  const dt = Math.min(.05, (now - last) / 1000); last = now;
  tickCursor(); tickGrain(dt);
  current?.tick?.(dt, now / 1000);
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);

/* 검증용 — 탭이 가려져 rAF 가 멈춘 브라우저에서 프레임을 손으로 돌린다 */
window.__limen = { step(n = 1, dt = 1 / 60) { for (let i = 0; i < n; i++) { tickCursor(); current?.tick?.(dt, performance.now() / 1000 + i * dt); } } };

/* ── 시작: 세션 첫 방문이면 인트로 ── */
(async () => {
  let seen = false;
  try { seen = sessionStorage.getItem("limen:intro") === "1"; } catch (e) {}
  if (!seen && path() === "/" && !reduced) {
    try { sessionStorage.setItem("limen:intro", "1"); } catch (e) {}
    busy = true;
    await runIntro(view, app);
    busy = false;
    show(path(), "fade");
  } else {
    show(path(), "fade");
  }
})();
