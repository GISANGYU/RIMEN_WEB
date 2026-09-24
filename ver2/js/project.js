/* 작업 상세 — 왼쪽: 흩어진 단어 들판. 설명문의 핵심어(path)만 밝게, 읽는 순서대로 선이 그어진다.
   마우스를 움직이면 들판이 살짝 따라 기울고(시차), 핵심어에 올리면 그 단어가 설명문 안에서 밑줄로 짚어진다.
   오른쪽: 설명 + 이미지·영상 열만 스크롤. */
import { WORKS, FIELD_EXTRA } from "./data.js";

function rand(seed) { let s = seed; return () => (s = (s * 16807) % 2147483647) / 2147483647; }
const esc = s => String(s).replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));

export function mount(root, params, app) {
  const i = Math.max(0, WORKS.findIndex(w => w.id === params[0]));
  const w = WORKS[i], next = WORKS[(i + 1) % WORKS.length];
  let desc = esc(w.desc);
  w.path.forEach((k, n) => { desc = desc.replace(k, `<mark data-k="${n}">${k}</mark>`); });

  const media = [w.video ? `<video src="${w.video}" poster="${w.image}" muted loop playsinline autoplay></video>` : `<img src="${w.image}" alt="${esc(w.title)}">`,
    ...(w.video ? [`<img src="${w.image}" alt="">`] : []), ...(w.extra || []).map(s => `<img src="${s}" alt="" loading="lazy">`)];

  root.className = "page dark";
  root.innerHTML = `<canvas class="fill proj-field"></canvas>
    <aside class="proj-panel">
      <div class="k mono">[ ${w.kind} · ${String(i + 1).padStart(2, "0")} / ${String(WORKS.length).padStart(2, "0")} ]</div>
      <h1>${esc(w.title)}</h1><div class="sub">${esc(w.sub)}</div>
      <p>${desc}</p>
      ${media.map(m => `<figure>${m}</figure>`).join("")}
      <a class="proj-next mono" href="#/work/${next.id}" data-hover>NEXT — ${esc(next.title)} →</a>
    </aside>
    <a class="side l mono" href="#/work" data-hover>&lt; INDEX</a>`;
  const cv = root.querySelector("canvas"), g = cv.getContext("2d"), panel = root.querySelector(".proj-panel");
  const style = document.createElement("style");
  style.textContent = `.proj-panel mark{background:none;color:inherit;border-bottom:1px solid transparent;transition:border-color .3s}.proj-panel mark.on{border-color:#fff}`;
  root.appendChild(style);

  // 오른쪽 열: 보이는 그림부터 떠오른다
  const io = new IntersectionObserver(es => es.forEach(e => e.isIntersecting && e.target.classList.add("in")), { root: panel, threshold: .15 });
  panel.querySelectorAll("figure").forEach(f => io.observe(f));

  // 들판 — 모든 작업의 설명문 단어 + LIMEN 어휘
  const pool = [...new Set(WORKS.flatMap(x => x.desc.replace(/[.,—]/g, " ").split(/\s+/)).concat(FIELD_EXTRA))].filter(s => s && !w.path.includes(s));
  let W, H, words = [], path = [];
  function layout() {
    const dpr = Math.min(devicePixelRatio, 2);
    W = cv.clientWidth; H = cv.clientHeight;
    cv.width = W * dpr; cv.height = H * dpr; g.setTransform(dpr, 0, 0, dpr, 0, 0);
    const r = rand(31 + i * 7);
    // 경로: 왼쪽 아래에서 오른쪽 위로 지그재그
    path = w.path.map((k, n) => {
      const t = n / (w.path.length - 1);
      const zig = (n % 2 ? 1 : -1) * (.06 + r() * .1);
      return { k, x: W * (.12 + t * .72 + (r() - .5) * .05), y: H * (.88 - t * .72 + zig), z: 1 };
    });
    // 경로 칸을 피해서 들판 단어를 뿌린다
    words = [];
    const cols = Math.floor(W / 72), rows = Math.floor(H / 30);
    for (let yy = 0; yy < rows; yy++) for (let xx = 0; xx < cols; xx++) {
      if (r() < .42) continue;
      const x = (xx + .2 + r() * .6) * (W / cols), y = (yy + .3 + r() * .5) * (H / rows);
      if (path.some(p => Math.abs(p.x - x) < 70 && Math.abs(p.y - y) < 22)) continue;
      words.push({ s: pool[(r() * pool.length) | 0], x, y, z: .3 + r() * .9, a: .1 + r() * .25 });
    }
  }
  layout();
  const ro = new ResizeObserver(layout); ro.observe(cv);

  const mouse = { x: .5, y: .5, px: -1e4, py: -1e4 };
  const move = e => { const b = cv.getBoundingClientRect(); mouse.px = e.clientX - b.left; mouse.py = e.clientY - b.top; mouse.x = mouse.px / b.width; mouse.y = mouse.py / b.height; };
  root.addEventListener("pointermove", move);
  const sm = { x: .5, y: .5 };
  let draw = 0, hot = -1;

  function tick(dt) {
    sm.x += (mouse.x - sm.x) * .06; sm.y += (mouse.y - sm.y) * .06;
    const ox = (sm.x - .5) * -26, oy = (sm.y - .5) * -18;
    draw = Math.min(path.length - 1, draw + dt * 3.2);
    g.clearRect(0, 0, W, H);
    g.textBaseline = "middle"; g.textAlign = "left";

    // 흐린 단어 들판 (깊이만큼 시차)
    g.font = `500 11px "Pretendard Variable", sans-serif`;
    for (const q of words) {
      const d = Math.hypot(q.x + ox * q.z - mouse.px, q.y + oy * q.z - mouse.py);
      const lift = d < 120 ? (1 - d / 120) * .35 : 0;
      g.fillStyle = `rgba(255,255,255,${q.a + lift})`;
      g.fillText(q.s, q.x + ox * q.z, q.y + oy * q.z);
    }
    // 경로 선 — 한 칸씩 그어진다
    g.strokeStyle = "rgba(255,255,255,.85)"; g.lineWidth = 1;
    g.beginPath();
    const P = n => ({ x: path[n].x + ox, y: path[n].y + oy });
    g.moveTo(P(0).x, P(0).y);
    for (let n = 1; n <= Math.floor(draw); n++) g.lineTo(P(n).x, P(n).y);
    const f = draw % 1, n0 = Math.floor(draw);
    if (n0 < path.length - 1) { const a = P(n0), b = P(n0 + 1); g.lineTo(a.x + (b.x - a.x) * f, a.y + (b.y - a.y) * f); }
    g.stroke();
    // 핵심어
    let newHot = -1;
    path.forEach((p, n) => {
      if (n > draw + .01) return;
      const q = P(n), on = Math.hypot(q.x - mouse.px, q.y - mouse.py) < 40;
      if (on) newHot = n;
      g.fillStyle = "#fff"; g.beginPath(); g.arc(q.x, q.y, on ? 4.5 : 3, 0, 7); g.fill();
      g.font = `${on ? 700 : 600} ${on ? 15 : 12}px "Pretendard Variable", sans-serif`;
      g.fillText(p.k, q.x + 9, q.y);
    });
    if (newHot !== hot) {
      hot = newHot;
      panel.querySelectorAll("mark").forEach(m => m.classList.toggle("on", +m.dataset.k === hot));
      app.cursor.el.classList.toggle("hover", hot >= 0);
      if (hot >= 0) app.sound.blip(500 + hot * 60, .04, .025);
    }
  }

  return {
    theme: "dark", tick,
    destroy() { ro.disconnect(); io.disconnect(); },
  };
}
