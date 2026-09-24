/* 메인 — "나를 잡아당기는 기준들" 그래프.
   가운데 = 나. 굵은 선 = LIMEN 의 개념어, 흐린 선 = 타인의 기준.
   ★ 커서(= 자각)가 선에 닿으면 그 구간이 점으로 부서져 밀려나고, 스프링으로 천천히 다시 이어진다.
   가운데 노드에 올리면 검은 사각형으로 커지며 "깨어날까요?" → 클릭하면 문턱을 넘는다(About). */
import { MAJOR, MINOR } from "./data.js";

const R_BREAK = 95;          // 커서 반경 — 이 안의 선은 부서진다
const STEP = 7;              // 선을 몇 px 마다 한 점으로 볼지

function rand(seed) { let s = seed; return () => (s = (s * 16807) % 2147483647) / 2147483647; }

export function mount(root, params, app) {
  root.className = "page light";
  root.innerHTML = `<canvas class="fill"></canvas>
    <div class="home-q"><b>깨어날까요?</b><small>CLICK TO CROSS</small></div>
    <div class="home-caption"></div>
    <div class="corner">LIMEN — 졸업작품 · SNOOZE</div>
    <div class="hint mono">커서를 선 위로 · SCROLL TO WAKE ↓</div>`;
  const cv = root.querySelector("canvas"), g = cv.getContext("2d");
  const q = root.querySelector(".home-q"), cap = root.querySelector(".home-caption");
  let W, H, dpr, cx, cy;

  // 노드 = 나, 선들의 한쪽 끝
  const node = { x: 0, y: 0, size: 12, target: 12 };
  const mouse = { x: -1e4, y: -1e4, in: false };
  let lines = [];
  let born = 0;       // 선이 가운데에서 자라 나오는 등장 연출

  function layout() {
    dpr = Math.min(devicePixelRatio, 2);
    W = root.clientWidth; H = root.clientHeight;
    cv.width = W * dpr; cv.height = H * dpr; g.setTransform(dpr, 0, 0, dpr, 0, 0);
    cx = W / 2; cy = H * .5;
    if (!node.x) { node.x = cx; node.y = cy; }
    const r = rand(7);
    const rx = Math.min(W * .40, 640), ry = Math.min(H * .36, 330);
    const items = [];
    // 굵은 개념어 8개는 고르게, 흐린 기준어는 사이사이, 이름 없는 선도 몇 가닥
    MAJOR.forEach((m, i) => items.push({ label: m.word, to: m.to, major: true, a: (i / MAJOR.length) * Math.PI * 2 - Math.PI / 2 + (r() - .5) * .35, d: .78 + r() * .22 }));
    MINOR.forEach((w, i) => items.push({ label: w, major: false, a: (i / MINOR.length) * Math.PI * 2 + .2 + (r() - .5) * .3, d: .42 + r() * .38 }));
    for (let i = 0; i < 12; i++) items.push({ label: "", major: false, a: r() * Math.PI * 2, d: .3 + r() * .5 });
    lines = items.map(it => {
      const ex = cx + Math.cos(it.a) * rx * it.d, ey = cy + Math.sin(it.a) * ry * it.d;
      const len = Math.hypot(ex - cx, ey - cy);
      const n = Math.max(6, Math.round(len / STEP));
      return { ...it, ex, ey, n, // 샘플 점마다 변위·속도·부서짐 정도
        dx: new Float32Array(n + 1), dy: new Float32Array(n + 1), vx: new Float32Array(n + 1), vy: new Float32Array(n + 1), br: new Float32Array(n + 1),
        hover: 0 };
    });
  }
  layout();
  const ro = new ResizeObserver(layout); ro.observe(root);

  const onMove = e => { const b = root.getBoundingClientRect(); mouse.x = e.clientX - b.left; mouse.y = e.clientY - b.top; mouse.in = true; };
  const onLeave = () => { mouse.in = false; mouse.x = mouse.y = -1e4; };
  root.addEventListener("pointermove", onMove); root.addEventListener("pointerleave", onLeave);

  let hoverLine = null, overNode = false;
  const onClick = () => {
    if (overNode) { app.sound.blip(330, .12, .05, "triangle"); app.go("#/about"); return; }
    if (hoverLine && hoverLine.major) app.go(`#/about/${hoverLine.to}`);
  };
  root.addEventListener("click", onClick);

  // 스크롤로도 문턱을 넘는다
  let wheelAcc = 0;
  const onWheel = e => { wheelAcc += Math.max(0, e.deltaY); if (wheelAcc > 420) { wheelAcc = -1e9; app.go("#/about"); } };
  root.addEventListener("wheel", onWheel, { passive: true });

  function tick(dt, t) {
    born = Math.min(1, born + dt * .9);
    // 노드는 커서 쪽으로 조금 끌려간다 — 그래프 전체가 기운다
    const tx = cx + (mouse.in ? (mouse.x - cx) * .07 : 0), ty = cy + (mouse.in ? (mouse.y - cy) * .07 : 0);
    node.x += (tx - node.x) * .08; node.y += (ty - node.y) * .08;
    overNode = mouse.in && Math.abs(mouse.x - node.x) < Math.max(26, node.size / 2) && Math.abs(mouse.y - node.y) < Math.max(26, node.size / 2);
    node.target = overNode ? Math.min(230, W * .28) : 12;
    node.size += (node.target - node.size) * .14;
    app.cursor.el.classList.toggle("hover", overNode || !!(hoverLine && hoverLine.major));

    g.clearRect(0, 0, W, H);
    hoverLine = null;
    let best = 1e9;

    for (const L of lines) {
      const grow = Math.min(1, Math.max(0, born * 1.6 - (L.major ? 0 : .25) - L.d * .3));
      if (grow <= 0) continue;
      // 라벨 호버
      if (L.label) {
        const dl = Math.hypot(mouse.x - L.ex, mouse.y - L.ey);
        if (dl < 42 && dl < best) { best = dl; hoverLine = L; }
      }
      const ex = node.x + (L.ex - node.x) * grow, ey = node.y + (L.ey - node.y) * grow;
      const ux = ex - node.x, uy = ey - node.y, len = Math.hypot(ux, uy) || 1;
      const nx = -uy / len, ny = ux / len;         // 선에 수직인 방향
      const alpha = L.major ? .78 : L.label ? .22 : .12;
      g.fillStyle = g.strokeStyle = `rgba(20,20,20,${alpha})`;
      g.lineWidth = L.major ? 1 : .8;

      // 점마다: 커서 반발 + 스프링 복원
      let drawing = false;
      g.beginPath();
      for (let i = 0; i <= L.n; i++) {
        const s = i / L.n;
        const bx = node.x + ux * s, by = node.y + uy * s;
        let px = bx + L.dx[i], py = by + L.dy[i];
        const d = Math.hypot(px - mouse.x, py - mouse.y);
        if (d < R_BREAK && s > .04) {
          const f = (1 - d / R_BREAK) ** 2;
          const side = Math.sign((px - mouse.x) * nx + (py - mouse.y) * ny) || 1;
          L.vx[i] += (nx * side * 2.6 + (px - mouse.x) / d * .8) * f + (Math.random() - .5) * f;
          L.vy[i] += (ny * side * 2.6 + (py - mouse.y) / d * .8) * f + (Math.random() - .5) * f;
          L.br[i] = Math.min(1, L.br[i] + f * .9);
        }
        // 스프링 (강성 .035, 감쇠 .86) — 천천히 돌아와 다시 선이 된다
        L.vx[i] = (L.vx[i] - L.dx[i] * .035) * .86; L.vy[i] = (L.vy[i] - L.dy[i] * .035) * .86;
        L.dx[i] += L.vx[i]; L.dy[i] += L.vy[i];
        L.br[i] *= .985;
        px = bx + L.dx[i]; py = by + L.dy[i];
        if (L.br[i] < .12) { if (!drawing) { g.moveTo(px, py); drawing = true; } else g.lineTo(px, py); }
        else { drawing = false; g.fillRect(px - .9, py - .9, 1.8, 1.8); }
      }
      g.stroke();

      // 라벨
      if (L.label && grow > .95) {
        const on = hoverLine === L;
        L.hover += ((on ? 1 : 0) - L.hover) * .2;
        const lx = L.ex + Math.cos(L.a) * 14, ly = L.ey + Math.sin(L.a) * 10;
        g.textAlign = Math.cos(L.a) > .25 ? "left" : Math.cos(L.a) < -.25 ? "right" : "center";
        g.textBaseline = "middle";
        g.font = L.major ? `600 ${15 + L.hover * 2}px "Pretendard Variable", sans-serif` : `500 11px "Pretendard Variable", sans-serif`;
        g.fillStyle = L.major ? `rgba(18,18,18,${.92})` : `rgba(40,40,40,${.35 + L.hover * .5})`;
        g.fillText(L.label, lx, ly);
        if (L.hover > .05) {        // 호버 마커: 작은 네모 + 가운데 점
          const m = 12 * L.hover, mx = lx + (g.textAlign === "right" ? 16 : g.textAlign === "left" ? -16 : 0), my = ly - (g.textAlign === "center" ? 20 : 0);
          g.strokeStyle = "rgba(20,20,20,.8)"; g.lineWidth = 1; g.strokeRect(mx - m / 2, my - m / 2, m, m);
          g.fillStyle = "#141414"; g.fillRect(mx - 1, my - 1, 2, 2);
        }
      }
    }

    // 가운데 노드 = 나
    const s = node.size;
    g.fillStyle = "#262626"; g.fillRect(node.x - s / 2, node.y - s / 2, s, s);
    const big = Math.max(0, (s - 60) / 170);
    q.style.left = node.x + "px"; q.style.top = node.y + "px"; q.style.opacity = big > .6 ? (big - .6) / .4 : 0;

    cap.textContent = hoverLine ? (hoverLine.major ? `${hoverLine.label} — 눌러서 들어가기` : `${hoverLine.label} — 나를 잡아당기는 타인의 기준`) : "";
    cap.style.opacity = hoverLine ? 1 : 0;
  }

  return {
    theme: "light", tick,
    destroy() { ro.disconnect(); },
  };
}
