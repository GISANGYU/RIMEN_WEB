/* VISIT — 전시장 자체가 오브젝트. 벽 3면 + 바닥 1면의 방(호라이즌 스튜디오)을 3D 로 띄운다.
   모드: 선(벽의 윤곽과 투사 격자) · 면(벽에 흐르는 세계, 바닥의 흔적) · 점(방을 이루는 입자와 걷는 관객).
   방 위에 올리면 입자로 흩어지며 전시 정보가 드러난다. 드래그 = 회전, 휠 = 거리. */
import * as THREE from "../../js/vendor/three.module.min.js";
import { VISIT, M } from "./data.js";

THREE.ColorManagement.enabled = false;
const RW = 12, RD = 10, RH = 6;        // 방 폭 · 깊이 · 높이

export function mount(root, params, app) {
  root.className = "page dark";
  root.innerHTML = `<canvas class="fill"></canvas>
    <div class="visit-q mono">벽 3 + 바닥 1 — 당신이 서게 될 방</div>
    <div class="visit-info">${VISIT.lines.map(([k, v]) => `<div><small>${k}</small><b>${v}</b></div>`).join("")}
      <div><small>TEAM SPACE</small><b><a href="${VISIT.link}" target="_blank" rel="noopener" data-hover>작업 공간 ↗</a></b></div></div>
    <div class="visit-modes"><button data-m="line" class="on" data-hover>선</button><button data-m="plane" data-hover>면</button><button data-m="dot" data-hover>점</button></div>
    <a class="side l mono" href="#/work" data-hover>&lt; WORK</a>
    <a class="side r mono" href="#/" data-hover>MAIN &gt;</a>
    <div class="hint mono">DRAG · SCROLL · HOVER</div>`;
  const cv = root.querySelector("canvas"), info = root.querySelector(".visit-info"), qEl = root.querySelector(".visit-q");

  const renderer = new THREE.WebGLRenderer({ canvas: cv, antialias: true });
  renderer.setClearColor(0x0a0a0a, 1);
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(42, 1, .1, 200);
  const room = new THREE.Group(); scene.add(room);

  // 네 면: [가로, 세로, 위치, 회전]
  const faces = [
    { w: RW, h: RH, pos: [0, RH / 2, -RD / 2], rot: [0, 0, 0], tex: M("reel_poster.jpg") },               // 정면 벽
    { w: RD, h: RH, pos: [-RW / 2, RH / 2, 0], rot: [0, Math.PI / 2, 0], tex: M("night_bloom.webp") },    // 왼쪽 벽
    { w: RD, h: RH, pos: [RW / 2, RH / 2, 0], rot: [0, -Math.PI / 2, 0], tex: M("crystal_bloom.webp") },  // 오른쪽 벽
    { w: RW, h: RD, pos: [0, 0, 0], rot: [-Math.PI / 2, 0, 0], tex: null },                                // 바닥
  ];

  // ── 선: 윤곽 + 투사 격자 ──
  const lineGroup = new THREE.Group(); room.add(lineGroup);
  const lineMat = new THREE.LineBasicMaterial({ color: 0xffffff, transparent: true, opacity: .75 });
  const gridMat = new THREE.LineBasicMaterial({ color: 0xffffff, transparent: true, opacity: .16 });
  faces.forEach(f => {
    const geo = new THREE.PlaneGeometry(f.w, f.h, Math.round(f.w), Math.round(f.h));
    const e = new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.PlaneGeometry(f.w, f.h)), lineMat);
    const wire = new THREE.LineSegments(new THREE.WireframeGeometry(geo), gridMat);
    [e, wire].forEach(o => { o.position.set(...f.pos); o.rotation.set(...f.rot); lineGroup.add(o); });
  });

  // ── 면: 벽에 흐르는 세계, 바닥에는 흔적 ──
  const planeGroup = new THREE.Group(); room.add(planeGroup);
  const loader = new THREE.TextureLoader();
  const floorCv = document.createElement("canvas"); floorCv.width = 600; floorCv.height = 500;
  const fg = floorCv.getContext("2d"); const floorTex = new THREE.CanvasTexture(floorCv);
  const planeMats = faces.map(f => {
    const mat = new THREE.MeshBasicMaterial({ map: f.tex ? loader.load(f.tex) : floorTex, transparent: true, opacity: 0, side: THREE.DoubleSide, depthWrite: false });
    const m = new THREE.Mesh(new THREE.PlaneGeometry(f.w, f.h), mat);
    m.position.set(...f.pos); m.rotation.set(...f.rot); planeGroup.add(m);
    return mat;
  });

  // ── 점: 네 면을 입자로 + 바닥을 걷는 관객 ──
  const NP = 7000, ppos = new Float32Array(NP * 3), home = new Float32Array(NP * 3), vel = new Float32Array(NP * 3);
  const tmp = new THREE.Vector3(), e = new THREE.Euler();
  for (let i = 0; i < NP; i++) {
    const f = faces[i % 4 === 3 ? 3 : i % 3];
    tmp.set((Math.random() - .5) * f.w, (Math.random() - .5) * f.h, 0).applyEuler(e.set(...f.rot)).add(new THREE.Vector3(...f.pos));
    home.set([tmp.x, tmp.y, tmp.z], i * 3); ppos.set([tmp.x, tmp.y, tmp.z], i * 3);
  }
  const pGeo = new THREE.BufferGeometry(); pGeo.setAttribute("position", new THREE.BufferAttribute(ppos, 3));
  const pMat = new THREE.PointsMaterial({ color: 0xffffff, size: .045, transparent: true, opacity: 0, depthWrite: false });
  const points = new THREE.Points(pGeo, pMat); room.add(points);

  // 관객 셋 — 바닥을 걷고, 지나간 자리에 흔적
  const walkers = [0, 1, 2].map(k => ({ a: k * 2.1, sp: .25 + k * .07, r: 2 + k * 1.2 }));
  const wGeo = new THREE.BufferGeometry(); wGeo.setAttribute("position", new THREE.BufferAttribute(new Float32Array(9), 3));
  const walkerDots = new THREE.Points(wGeo, new THREE.PointsMaterial({ color: 0x8f9bff, size: .28, transparent: true }));
  room.add(walkerDots);
  const trail = [];
  function drawFloor() {
    fg.fillStyle = "rgba(10,10,14,.05)"; fg.fillRect(0, 0, 600, 500);       // 흔적은 천천히 사라진다
    for (const t of trail.splice(0)) {
      const x = (t[0] / RW + .5) * 600, y = (t[1] / RD + .5) * 500;
      const gr = fg.createRadialGradient(x, y, 0, x, y, 26);
      gr.addColorStop(0, "rgba(220,225,255,.55)"); gr.addColorStop(1, "rgba(220,225,255,0)");
      fg.fillStyle = gr; fg.beginPath(); fg.arc(x, y, 26, 0, 7); fg.fill();
    }
    floorTex.needsUpdate = true;
  }
  fg.fillStyle = "#0a0a0e"; fg.fillRect(0, 0, 600, 500);

  // ── 모드 ──
  let mode = "line";
  const target = { line: 1, plane: 0, dot: 0 }, level = { line: 1, plane: 0, dot: 0 };
  root.querySelector(".visit-modes").addEventListener("click", ev => {
    const b = ev.target.closest("button"); if (!b) return;
    mode = b.dataset.m; root.querySelectorAll(".visit-modes button").forEach(x => x.classList.toggle("on", x === b));
    for (const k in target) target[k] = k === mode ? 1 : 0;
    burst(.6); app.sound.blip(mode === "line" ? 440 : mode === "plane" ? 550 : 660, .08, .04, "triangle");
  });

  // ── 입력 ──
  const rot = { x: .42, y: -.6, vx: 0, vy: 0 }; let drag = null, dist = 24, distT = 24;
  const down = ev => { if (ev.target.closest("button, a")) return; drag = { x: ev.clientX, y: ev.clientY }; };
  const mv = ev => {
    const b = root.getBoundingClientRect();
    ptr.set((ev.clientX - b.left) / b.width * 2 - 1, -((ev.clientY - b.top) / b.height) * 2 + 1);
    if (!drag) return;
    rot.vy = (ev.clientX - drag.x) * .004; rot.vx = (ev.clientY - drag.y) * .003; drag = { x: ev.clientX, y: ev.clientY };
  };
  const up = () => (drag = null);
  const wheel = ev => (distT = Math.max(15, Math.min(40, distT + ev.deltaY * .02)));
  root.addEventListener("pointerdown", down); addEventListener("pointermove", mv); addEventListener("pointerup", up);
  root.addEventListener("wheel", wheel, { passive: true });
  const ptr = new THREE.Vector2(9, 9), ray = new THREE.Raycaster();
  const hitBox = new THREE.Mesh(new THREE.BoxGeometry(RW, RH, RD), new THREE.MeshBasicMaterial({ visible: false }));
  hitBox.position.y = RH / 2; room.add(hitBox);

  // 흩어짐: 입자에 바깥쪽 속도
  function burst(s) {
    for (let i = 0; i < NP; i++) {
      vel[i * 3] += (home[i * 3]) * .02 * s * Math.random(); vel[i * 3 + 1] += (Math.random() - .3) * .12 * s; vel[i * 3 + 2] += (home[i * 3 + 2]) * .02 * s * Math.random();
    }
  }
  let hover = 0, wasHover = false;

  function resize() {
    const w = root.clientWidth, h = root.clientHeight;
    renderer.setPixelRatio(Math.min(devicePixelRatio, 2)); renderer.setSize(w, h, false);
    camera.aspect = w / h; camera.updateProjectionMatrix();
  }
  resize();
  const ro = new ResizeObserver(resize); ro.observe(root);

  function tick(dt, t) {
    if (!drag) { rot.vy += (.0012 - rot.vy) * .02; rot.vx *= .92; }
    rot.y += rot.vy; rot.x = Math.max(.1, Math.min(1.1, rot.x + rot.vx));
    dist += (distT - dist) * .08;
    camera.position.set(Math.sin(rot.y) * Math.cos(rot.x) * dist, Math.sin(rot.x) * dist + RH * .35, Math.cos(rot.y) * Math.cos(rot.x) * dist);
    camera.lookAt(0, RH * .35, 0);

    // 방 위에 올렸는가
    ray.setFromCamera(ptr, camera);
    const isHover = ray.intersectObject(hitBox).length > 0 && !drag;
    if (isHover && !wasHover) { burst(1); app.sound.blip(300, .3, .04, "sine"); }
    wasHover = isHover;
    hover += ((isHover ? 1 : 0) - hover) * .08;
    info.style.opacity = hover; qEl.style.opacity = 1 - hover;

    // 모드 섞기 — 호버 중에는 점으로
    for (const k in level) level[k] += (target[k] - level[k]) * .08;
    const dotL = Math.max(level.dot, hover), keep = 1 - hover;
    lineMat.opacity = .75 * level.line * keep; gridMat.opacity = .16 * level.line * keep;
    planeMats.forEach((m, i) => (m.opacity = (i === 3 ? .95 : .85) * level.plane * keep));
    pMat.opacity = .85 * dotL;

    // 입자: 스프링으로 제자리 (호버 중엔 약하게 → 흩어진 채 떠 있음)
    const k = hover > .5 ? .004 : .03;
    for (let i = 0; i < NP * 3; i++) { vel[i] = (vel[i] + (home[i] - ppos[i]) * k) * .93; ppos[i] += vel[i]; }
    pGeo.attributes.position.needsUpdate = true;

    // 관객
    const wp = wGeo.attributes.position.array;
    walkers.forEach((w, n) => {
      w.a += dt * w.sp;
      const x = Math.sin(w.a * 1.3 + n) * w.r * 1.3, z = Math.cos(w.a * .9) * w.r * .9;
      wp.set([x, .06, z], n * 3); trail.push([x, z]);
    });
    wGeo.attributes.position.needsUpdate = true;
    walkerDots.material.opacity = Math.max(level.plane, level.dot, .25) * keep;
    drawFloor();
    renderer.render(scene, camera);
  }

  return {
    theme: "dark", tick,
    destroy() { ro.disconnect(); removeEventListener("pointermove", mv); removeEventListener("pointerup", up); renderer.dispose(); },
  };
}
