/* About 상세 — 매달린 전등 하나. 빛(= 자각)이 닿는 곳의 글만 읽힌다.
   전등은 마우스가 있는 곳을 비춘다. 목표 각도 = 전등 고정점에서 마우스를 향한 각도.
   진자 물리(θ'' = -(g/L)·sinθ + k·(목표-θ) - c·θ')를 그대로 둬서, 빠르게 움직이면 살짝 흔들리며 따라온다.
   빛 = 전구에서 줄 방향으로 퍼지는 원뿔. 본문 레이어에 원뿔 모양 clip-path 를 매 프레임 준다. */
import { NODES } from "./data.js";

export function mount(root, params, app) {
  let idx = Math.max(0, NODES.findIndex(n => n.id === params[0]));
  root.className = "page dark";
  const content = () => {
    const n = NODES[idx];
    return `<div class="lit-inner">
      <div class="sec-title">${n.title}</div>
      <p class="sec-body">${n.body}</p>
      <nav class="sec-tabs mono">${NODES.map((m, i) => `<a href="#/about/${m.id}" data-i="${i}" class="${i === idx ? "on" : ""}" data-hover>${i === idx ? "&gt; " : ""}${m.label}</a>`).join("")}</nav>
      <div class="sec-big">${n.big}</div></div>`;
  };
  root.innerHTML = `<div class="dim">${content()}</div><div class="lit">${content()}</div>
    <svg class="lamp-svg"><line class="cord" stroke="#9a9a9a" stroke-width="1"/><g class="head"><polygon points="-30,26 30,26 12,0 -12,0" fill="#cfcfcf"/><rect x="-3" y="-8" width="6" height="8" fill="#888"/><circle class="bulb" cx="0" cy="30" r="7" fill="#fff"/></g><line class="pull" stroke="#777" stroke-width="1"/><circle class="knob" r="3.5" fill="#666"/></svg>
    <a class="go-back mono" href="#/about" data-hover>&lt; GO BACK</a>
    <div class="hint mono">마우스가 가는 곳을 전등이 비춥니다</div>`;
  const lit = root.querySelector(".lit"), dim = root.querySelector(".dim");
  const svg = root.querySelector(".lamp-svg"), cord = svg.querySelector(".cord"), head = svg.querySelector(".head");
  const pull = svg.querySelector(".pull"), knob = svg.querySelector(".knob"), back = root.querySelector(".go-back");

  // 탭: 전환 없이 내용만 바꾸고, 전등이 한 번 깜빡인다
  root.addEventListener("click", e => {
    const a = e.target.closest(".sec-tabs a"); if (!a) return;
    e.preventDefault(); e.stopPropagation();
    idx = +a.dataset.i; lit.innerHTML = content(); dim.innerHTML = content();
    app.replace(`#/about/${NODES[idx].id}`); flicker = .35; om += .9; app.sound.blip(700, .04, .03);
  }, true);

  // 진자 상태 — 마우스를 따라간다
  const L = 140;                     // 줄 길이 px
  let th = .55, om = 0, flicker = .6, aim = 0, hasMouse = false;
  const pivot = () => ({ x: root.clientWidth / 2, y: -40 });
  const move = e => {
    const p = pivot(), b = root.getBoundingClientRect();
    const mx = e.clientX - b.left, my = e.clientY - b.top;
    // 전구에서 마우스까지의 방향 = 빛의 방향
    aim = Math.max(-1.15, Math.min(1.15, Math.atan2(-(mx - p.x), Math.max(60, my - p.y))));
    hasMouse = true;
  };
  addEventListener("pointermove", move);

  function tick(dt) {
    const steps = 4, h = Math.min(dt, .033) / steps;
    for (let i = 0; i < steps; i++) {
      // 마우스가 없으면 천천히 좌우로 훑는다
      const target = hasMouse ? aim : Math.sin(performance.now() / 1600) * .45;
      const acc = -(9.8 * 60 / L) * Math.sin(th) * .15 + (target - th) * 38 - 5.2 * om;
      om += acc * h; th += om * h;
    }
    th = Math.max(-1.2, Math.min(1.2, th));
    const p = pivot();
    const bx = p.x - Math.sin(th) * L, by = p.y + Math.cos(th) * L;   // 전등 머리 위치
    cord.setAttribute("x1", p.x); cord.setAttribute("y1", p.y); cord.setAttribute("x2", bx); cord.setAttribute("y2", by);
    head.setAttribute("transform", `translate(${bx},${by}) rotate(${-th * 57.3})`);
    // 당김 줄 — 전등 옆에 늘어진 작은 추
    const kx = bx + 22 * Math.cos(th) - Math.sin(th * 1.6) * 40, ky = by + 60 + 22 * Math.sin(th);
    pull.setAttribute("x1", bx + 18 * Math.cos(th)); pull.setAttribute("y1", by + 18 * Math.sin(th)); pull.setAttribute("x2", kx); pull.setAttribute("y2", ky);
    knob.setAttribute("cx", kx); knob.setAttribute("cy", ky);
    back.style.left = (bx + 60) + "px"; back.style.top = (by + 4) + "px";

    // 빛의 원뿔: 전구에서 줄 방향(θ)으로 반각 27°
    const ox = bx - Math.sin(th) * 30, oy = by + Math.cos(th) * 30;
    const half = 27 * Math.PI / 180, far = 3200;
    const a1 = th + half, a2 = th - half;
    const x1 = ox - Math.sin(a1) * far, y1 = oy + Math.cos(a1) * far, x2 = ox - Math.sin(a2) * far, y2 = oy + Math.cos(a2) * far;
    lit.style.clipPath = `polygon(${ox}px ${oy}px, ${x1}px ${y1}px, ${x2}px ${y2}px)`;
    // 빛의 세기: 전구에서 멀수록 어둡게, 깜빡임
    flicker = Math.max(0, flicker - dt);
    const on = flicker > 0 && Math.sin(flicker * 60) > 0 ? .25 : 1;
    lit.style.background = `radial-gradient(circle at ${ox}px ${oy}px, rgba(245,245,245,${on}) 0, rgba(220,220,220,${.92 * on}) 28%, rgba(120,120,120,${.9 * on}) 75%, rgba(40,40,40,${on}) 110%)`;
    lit.style.opacity = on < 1 ? .5 : 1;
    head.querySelector(".bulb").setAttribute("opacity", on);
  }

  return {
    theme: "dark", tick,
    destroy() { removeEventListener("pointermove", move); },
  };
}
