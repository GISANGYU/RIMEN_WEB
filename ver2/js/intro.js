/* 인트로 (세션 첫 방문) — 화면이 칸으로 나뉘어 가로줄·세로줄·도트 패턴이 번쩍이고,
   그 위에 선언문 단어가 하나씩 튄다 → 마지막에 네 줄이 밝은 바탕에 쌓이고 메인으로. */
import { MANIFESTO } from "./data.js";

const PATTERNS = ["h", "v", "dot", "grid", "h2", "dot2"];

function drawPattern(g, kind, x, y, w, h, light) {
  g.save(); g.beginPath(); g.rect(x, y, w, h); g.clip();
  g.fillStyle = light ? "#d9d9d9" : "#0a0a0a"; g.fillRect(x, y, w, h);
  g.fillStyle = g.strokeStyle = light ? "#111" : "#e8e8e8";
  const s = kind.endsWith("2") ? 3 : 4;
  if (kind.startsWith("h")) for (let yy = y; yy < y + h; yy += s) g.fillRect(x, yy, w, 1);
  else if (kind === "v") for (let xx = x; xx < x + w; xx += s) g.fillRect(xx, y, 1, h);
  else if (kind.startsWith("dot")) for (let yy = y; yy < y + h; yy += s) for (let xx = x + ((yy / s) % 2) * s / 2; xx < x + w; xx += s) g.fillRect(xx, yy, 1.4, 1.4);
  else { for (let yy = y; yy < y + h; yy += 5) g.fillRect(x, yy, w, 1); for (let xx = x; xx < x + w; xx += 5) g.fillRect(xx, y, 1, h); }
  g.restore();
}

export function runIntro(view, app) {
  return new Promise(resolve => {
    const root = document.createElement("div");
    root.className = "page dark";
    root.innerHTML = `<canvas class="fill"></canvas><div class="intro-word"></div>
      <div class="intro-stack"><div>${MANIFESTO.map(w => `<span>${w}</span>`).join("")}</div></div>
      <button class="intro-skip mono" data-hover>SKIP →</button>`;
    view.appendChild(root);
    const cv = root.querySelector("canvas"), g = cv.getContext("2d");
    const word = root.querySelector(".intro-word"), stack = root.querySelector(".intro-stack");
    const W = cv.width = innerWidth, H = cv.height = innerHeight;

    let done = false;
    const finish = () => { if (done) return; done = true; clearInterval(timer); root.remove(); resolve(); };
    root.querySelector(".intro-skip").addEventListener("click", finish);

    // 한 박자 = 110ms. 박자마다 화면을 3~5칸으로 나눠 패턴을 새로 깐다.
    let beat = 0;
    const total = MANIFESTO.length * 6;          // 단어마다 6박
    const timer = setInterval(() => {
      if (beat < total) {
        const cols = [0, .18 + Math.random() * .1, .62 + Math.random() * .1, 1];
        const rows = [0, .22 + Math.random() * .08, .72 + Math.random() * .06, 1];
        for (let i = 0; i < 3; i++) for (let j = 0; j < 3; j++) {
          const light = (i === 1 && j === 1) || Math.random() < .25;
          drawPattern(g, PATTERNS[(Math.random() * PATTERNS.length) | 0], cols[i] * W, rows[j] * H, (cols[i + 1] - cols[i]) * W, (rows[j + 1] - rows[j]) * H, light);
        }
        const k = Math.floor(beat / 6);
        word.textContent = beat % 6 < 4 ? MANIFESTO[k] : "";
        word.style.color = Math.random() < .5 ? "#0a0a0a" : "#f0f0f0";
        word.style.mixBlendMode = "difference";
        word.style.color = "#fff";
        if (beat % 6 === 0) app.sound.blip(220 + k * 110, .08, .05, "square");
        beat++;
      } else if (beat === total) {
        word.textContent = "";
        stack.style.opacity = 1;
        requestAnimationFrame(() => stack.classList.add("on"));
        stack.querySelectorAll("span").forEach((s, i) => (s.style.transitionDelay = i * .09 + "s"));
        beat++;
      } else if (beat > total + 16) {
        finish();
      } else beat++;
    }, 110);
  });
}
