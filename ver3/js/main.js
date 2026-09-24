/* ver3 — 스크롤 = 카메라의 여정 (ANALYSIS.md)
   밤바다 위의 꿈의 섬, 그 앞 수면에 떠 있는 LIMEN 의 방(벽 3 + 바닥 1).
   스크롤 진행도 p(0→1)가 카메라 경로 · 하늘 색 · 챕터 소품 · 제목을 한꺼번에 움직인다. */
import * as THREE from "three";
import { Reflector } from "../../js/vendor/jsm/Reflector.js";
import { CHAPTERS, KEYS } from "./story.js";
import { Drone } from "./drone.js";

const $ = s => document.querySelector(s);
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const sat = v => clamp(v, 0, 1);
const smooth = t => t * t * (3 - 2 * t);
const smoother = t => t * t * t * (t * (t * 6 - 15) + 10);
const lerp = (a, b, t) => a + (b - a) * t;
const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;

document.body.classList.add("locked");

/* ── 렌더러 · 장면 ─────────────────────────────── */
const renderer = new THREE.WebGLRenderer({ canvas: $("#scene"), antialias: true, powerPreference: "high-performance" });
renderer.setPixelRatio(Math.min(devicePixelRatio, 1.75));
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.05;
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(40, 1, .1, 2000);

/* ── 하늘: 안쪽을 보는 큰 구 + 세로 그라디언트 ───────── */
const skyU = { uTop: { value: new THREE.Color() }, uHor: { value: new THREE.Color() }, uGlow: { value: 0 } };
const sky = new THREE.Mesh(new THREE.SphereGeometry(900, 32, 16), new THREE.ShaderMaterial({
  side: THREE.BackSide, depthWrite: false, uniforms: skyU,
  vertexShader: `varying vec3 vP; void main(){ vP = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.); }`,
  fragmentShader: `uniform vec3 uTop; uniform vec3 uHor; uniform float uGlow; varying vec3 vP;
    void main(){ float h = clamp(vP.y, -1., 1.);
      vec3 c = mix(uHor, uTop, smoothstep(0., .55, h));
      c += uHor * uGlow * exp(-abs(h) * 9.);                 // 지평선의 빛 띠
      c = mix(c, uHor * .25, smoothstep(0., -.3, h));       // 수면 아래
      gl_FragColor = vec4(c, 1.); }`,
}));
scene.add(sky);

/* 별 */
const starGeo = new THREE.BufferGeometry();
{
  const n = 2600, p = new Float32Array(n * 3), s = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    const u = Math.random() * .95 + .05, th = Math.random() * Math.PI * 2, r = 800;
    const y = Math.pow(u, .7);
    p.set([Math.cos(th) * Math.sqrt(1 - y * y) * r, y * r, Math.sin(th) * Math.sqrt(1 - y * y) * r], i * 3);
    s[i] = Math.random() < .04 ? 3.2 : .8 + Math.random() * 1.4;
  }
  starGeo.setAttribute("position", new THREE.BufferAttribute(p, 3));
  starGeo.setAttribute("size", new THREE.BufferAttribute(s, 1));
}
const starU = { uOpacity: { value: 1 }, uTime: { value: 0 }, uPR: { value: renderer.getPixelRatio() } };
scene.add(new THREE.Points(starGeo, new THREE.ShaderMaterial({
  transparent: true, depthWrite: false, uniforms: starU,
  vertexShader: `attribute float size; uniform float uTime; uniform float uPR; varying float vT;
    void main(){ vT = .6 + .4 * sin(uTime * 1.7 + position.x * .13 + position.z * .07);
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.); gl_PointSize = size * uPR; }`,
  fragmentShader: `uniform float uOpacity; varying float vT; void main(){ float d = length(gl_PointCoord - .5); if (d > .5) discard;
      gl_FragColor = vec4(vec3(1.), (1. - d * 2.) * uOpacity * vT); }`,
})));

/* ── 수면: 반사 ───────────────────────────────── */
const water = new Reflector(new THREE.PlaneGeometry(3000, 3000), {
  clipBias: .003, textureWidth: innerWidth * .6, textureHeight: innerHeight * .6, color: 0x6f7780,
});
water.rotation.x = -Math.PI / 2;
scene.add(water);

/* ── 꿈의 섬: 노이즈로 깎은 산 ─────────────────────── */
function hash(x, y) { const s = Math.sin(x * 127.1 + y * 311.7) * 43758.5453; return s - Math.floor(s); }
function vnoise(x, y) {
  const xi = Math.floor(x), yi = Math.floor(y), xf = x - xi, yf = y - yi;
  const u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf);
  const a = hash(xi, yi), b = hash(xi + 1, yi), c = hash(xi, yi + 1), d = hash(xi + 1, yi + 1);
  return lerp(lerp(a, b, u), lerp(c, d, u), v);
}
function ridged(x, y) { let s = 0, a = .5, f = 1; for (let i = 0; i < 6; i++) { s += a * (1 - Math.abs(vnoise(x * f, y * f) * 2 - 1)); a *= .5; f *= 2.03; } return s; }
const ISLAND = new THREE.Vector3(0, 0, -150);
const islandGeo = new THREE.PlaneGeometry(320, 240, 240, 180);
islandGeo.rotateX(-Math.PI / 2);
{
  const pos = islandGeo.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i), z = pos.getZ(i);
    const rx = x / 120, rz = z / 70;
    const r = Math.sqrt(rx * rx + rz * rz);
    const mass = Math.max(0, 1 - r) ** 1.6;
    const peak = Math.exp(-((x - 18) ** 2 / 900 + (z + 6) ** 2 / 500)) * 62;       // 한쪽으로 치우친 뾰족한 봉우리
    const h = mass * (22 + ridged(x * .028, z * .028) * 40) + peak * ridged(x * .05 + 3, z * .05) - 4;
    pos.setY(i, Math.max(-6, h));
  }
  islandGeo.computeVertexNormals();
}
const islandMat = new THREE.MeshStandardMaterial({ color: 0x2b302b, roughness: .95, metalness: 0, flatShading: true });
const island = new THREE.Mesh(islandGeo, islandMat);
island.position.copy(ISLAND);
scene.add(island);
// 발견 챕터: 섬 전체를 덮는 와이어프레임
const islandWireMat = new THREE.MeshBasicMaterial({ color: 0xaec0ff, wireframe: true, transparent: true, opacity: 0, depthWrite: false });
const islandWire = new THREE.Mesh(islandGeo, islandWireMat);
islandWire.position.copy(ISLAND); islandWire.position.y += .05;
scene.add(islandWire);

/* 빛 */
const hemi = new THREE.HemisphereLight(0x8899bb, 0x111111, .7); scene.add(hemi);
const moon = new THREE.DirectionalLight(0xdfe6ff, 1.6); moon.position.set(-120, 160, 80); scene.add(moon);
const rim = new THREE.DirectionalLight(0xffc98a, 0); rim.position.set(160, 40, -300); scene.add(rim);

/* ── LIMEN 의 방: 벽 3 + 바닥 1 ─────────────────── */
const RW = 12, RD = 10, RH = 6;
const room = new THREE.Group(); scene.add(room);
function videoTex(src) {
  const v = document.createElement("video");
  Object.assign(v, { src, muted: true, loop: true, playsInline: true, preload: "auto", crossOrigin: "anonymous" });
  v.setAttribute("playsinline", "");
  const t = new THREE.VideoTexture(v); t.colorSpace = THREE.SRGBColorSpace;
  return { v, t };
}
const vids = [videoTex("../media/reel.mp4"), videoTex("../media/reel_bloom.mp4"), videoTex("../media/night_bloom_wide.mp4")];
const wallDefs = [
  { w: RW, pos: [0, RH / 2, -RD / 2], rot: [0, 0, 0], v: vids[0] },
  { w: RD, pos: [-RW / 2, RH / 2, 0], rot: [0, Math.PI / 2, 0], v: vids[1] },
  { w: RD, pos: [RW / 2, RH / 2, 0], rot: [0, -Math.PI / 2, 0], v: vids[2] },
];
const wallMats = wallDefs.map(d => {
  const m = new THREE.MeshBasicMaterial({ map: d.v.t, color: 0x000000, side: THREE.DoubleSide, transparent: true });
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(d.w, RH), m);
  mesh.position.set(...d.pos); mesh.rotation.set(...d.rot); room.add(mesh);
  return m;
});
// 바닥: 캔버스에 관객의 발걸음과 꽃을 그린다
const floorCv = document.createElement("canvas"); floorCv.width = 720; floorCv.height = 600;
const fg = floorCv.getContext("2d");
const floorTex = new THREE.CanvasTexture(floorCv); floorTex.colorSpace = THREE.SRGBColorSpace;
const floorMat = new THREE.MeshBasicMaterial({ map: floorTex, transparent: true });
const floor = new THREE.Mesh(new THREE.PlaneGeometry(RW, RD), floorMat);
floor.rotation.x = -Math.PI / 2; floor.position.y = .04; room.add(floor);
// 윤곽선 — 멀리서도 방이 빛나 보이게
const edgeMat = new THREE.LineBasicMaterial({ color: 0xf4efe2, transparent: true, opacity: .8 });
const edges = new THREE.Group(); room.add(edges);
[...wallDefs.map(d => ({ w: d.w, h: RH, pos: d.pos, rot: d.rot })), { w: RW, h: RD, pos: [0, .05, 0], rot: [-Math.PI / 2, 0, 0] }].forEach(d => {
  const e = new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.PlaneGeometry(d.w, d.h)), edgeMat);
  e.position.set(...d.pos); e.rotation.set(...d.rot); edges.add(e);
});
const roomGlow = new THREE.PointLight(0xfff1d8, 0, 60, 1.6); roomGlow.position.set(0, 4, 2); room.add(roomGlow);

/* 선택 챕터: 바닥 위의 관객과 꽃 */
const walkers = [0, 1, 2].map(k => ({ a: k * 2.1, sp: .35 + k * .08, r: 2 + k }));
const blooms = [];
function drawFloor(dt, t, choose, relate) {
  fg.globalCompositeOperation = "source-over";
  fg.fillStyle = `rgba(8,8,12,${.12 + (1 - choose) * .5})`; fg.fillRect(0, 0, 720, 600);
  if (choose <= 0.01 && relate <= .01) { floorTex.needsUpdate = true; return; }
  fg.globalCompositeOperation = "lighter";
  const toPx = (x, z) => [(x / RW + .5) * 720, (z / RD + .5) * 600];
  walkers.forEach((w, n) => {
    w.a += dt * w.sp;
    const x = Math.sin(w.a * 1.3 + n) * w.r * 1.2, z = Math.cos(w.a * .9 + n) * w.r * .8;
    const [px, py] = toPx(x, z);
    const g = fg.createRadialGradient(px, py, 0, px, py, 40);
    g.addColorStop(0, `rgba(255,240,215,${.55 * choose})`); g.addColorStop(1, "rgba(255,240,215,0)");
    fg.fillStyle = g; fg.beginPath(); fg.arc(px, py, 40, 0, 7); fg.fill();
    if (Math.random() < dt * 5 * choose) blooms.push({ x: px + (Math.random() - .5) * 30, y: py + (Math.random() - .5) * 30, age: 0, s: 6 + Math.random() * 9, r: Math.random() * 6 });
  });
  // 꽃: 여섯 잎이 벌어진다 — 지나간 자리에 남는다
  for (const b of blooms) {
    b.age += dt;
    const open = sat(b.age / 1.4), fade = 1 - sat((b.age - 7) / 5);
    if (fade <= 0) continue;
    for (let k = 0; k < 6; k++) {
      const a = b.r + k / 6 * Math.PI * 2;
      fg.fillStyle = `rgba(235,228,255,${.22 * fade * open})`;
      fg.beginPath(); fg.ellipse(b.x + Math.cos(a) * b.s * open * .6, b.y + Math.sin(a) * b.s * open * .6, b.s * open * .55, b.s * open * .22, a, 0, 7); fg.fill();
    }
  }
  while (blooms.length > 260) blooms.shift();
  floorTex.needsUpdate = true;
}

/* 관계 챕터: 수면 위에 겹겹이 남은 이전 관객들의 궤적 */
const traceGeo = new THREE.BufferGeometry();
{
  const trails = 26, per = 90, n = trails * per;
  const p = new Float32Array(n * 3), ord = new Float32Array(n);
  for (let t = 0; t < trails; t++) {
    let a = Math.random() * Math.PI * 2, r = 7 + Math.random() * 3, x, z;
    const turn = (Math.random() - .5) * .05;
    for (let i = 0; i < per; i++) {
      a += turn + Math.sin(i * .15 + t) * .03; r += .55 + Math.random() * .25;
      x = Math.cos(a) * r; z = Math.sin(a) * r * .7 + 4;
      p.set([x, .08, z], (t * per + i) * 3); ord[t * per + i] = (i / per) * .7 + (t / trails) * .3;
    }
  }
  traceGeo.setAttribute("position", new THREE.BufferAttribute(p, 3));
  traceGeo.setAttribute("ord", new THREE.BufferAttribute(ord, 1));
}
const traceU = { uReveal: { value: 0 }, uTime: { value: 0 }, uPR: { value: renderer.getPixelRatio() } };
scene.add(new THREE.Points(traceGeo, new THREE.ShaderMaterial({
  transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, uniforms: traceU,
  vertexShader: `attribute float ord; uniform float uReveal; uniform float uTime; uniform float uPR; varying float vA;
    void main(){ // 드러난 정도: 순서(ord)가 uReveal 보다 앞선 점부터 켜진다 (smoothstep 경계는 반드시 작은 값 → 큰 값)
      vA = smoothstep(ord - .05, ord, uReveal * 1.05 - .02) * (.55 + .45 * sin(uTime * 2. + ord * 40.));
      vec4 mv = modelViewMatrix * vec4(position,1.); gl_Position = projectionMatrix * mv; gl_PointSize = uPR * 190. / -mv.z; }`,
  fragmentShader: `varying float vA; void main(){ float d = length(gl_PointCoord - .5); if (d > .5) discard;
      float core = smoothstep(.5, .0, d); gl_FragColor = vec4(vec3(1., .82, .55) * (.6 + core), core * core * vA * 1.4); }`,
})));

/* 자각 챕터: 방이 입자로 풀려 하늘로 */
const riseGeo = new THREE.BufferGeometry();
{
  const n = 7000, p = new Float32Array(n * 3), rnd = new Float32Array(n);
  const tmp = new THREE.Vector3(), e = new THREE.Euler();
  const faces = [...wallDefs.map(d => ({ w: d.w, h: RH, pos: d.pos, rot: d.rot })), { w: RW, h: RD, pos: [0, .05, 0], rot: [-Math.PI / 2, 0, 0] }];
  for (let i = 0; i < n; i++) {
    const f = faces[i % 4];
    tmp.set((Math.random() - .5) * f.w, (Math.random() - .5) * f.h, 0).applyEuler(e.set(...f.rot)).add(new THREE.Vector3(...f.pos));
    p.set([tmp.x, tmp.y, tmp.z], i * 3); rnd[i] = Math.random();
  }
  riseGeo.setAttribute("position", new THREE.BufferAttribute(p, 3));
  riseGeo.setAttribute("rnd", new THREE.BufferAttribute(rnd, 1));
}
const riseU = { uRise: { value: 0 }, uTime: { value: 0 }, uPR: { value: renderer.getPixelRatio() } };
scene.add(new THREE.Points(riseGeo, new THREE.ShaderMaterial({
  transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, uniforms: riseU,
  vertexShader: `attribute float rnd; uniform float uRise; uniform float uTime; uniform float uPR; varying float vA;
    void main(){ vec3 p = position;
      float k = smoothstep(rnd * .6, rnd * .6 + .4, uRise) * uRise;
      p.y += k * (18. + rnd * 70.);
      p.x += sin(uTime * .6 + rnd * 20.) * k * 6.; p.z += cos(uTime * .5 + rnd * 14.) * k * 6.;
      vA = smoothstep(0., .05, uRise) * (1. - k * .35);
      vec4 mv = modelViewMatrix * vec4(p,1.); gl_Position = projectionMatrix * mv; gl_PointSize = uPR * (110. + rnd * 150.) / -mv.z; }`,
  fragmentShader: `varying float vA; void main(){ float d = length(gl_PointCoord - .5); if (d > .5) discard;
      gl_FragColor = vec4(vec3(1., .96, .9), (1. - d * 2.) * vA); }`,
})));

/* 반딧불 — 언제나 조금 */
const fly = new THREE.Points(new THREE.BufferGeometry().setFromPoints(Array.from({ length: 160 }, () =>
  new THREE.Vector3((Math.random() - .5) * 90, 1 + Math.random() * 16, (Math.random() - .5) * 70 - 10))),
  new THREE.PointsMaterial({ color: 0xffe9c2, size: .22, transparent: true, opacity: .7, depthWrite: false, blending: THREE.AdditiveBlending }));
scene.add(fly);

/* ── 카메라 경로: 챕터마다 머문다 ──────────────────── */
const posCurve = new THREE.CatmullRomCurve3(KEYS.map(k => new THREE.Vector3(...k.pos)), false, "catmullrom", .35);
const lookCurve = new THREE.CatmullRomCurve3(KEYS.map(k => new THREE.Vector3(...k.look)), false, "catmullrom", .35);
function keyAt(p) {
  let k = 0;
  while (k < KEYS.length - 2 && p > KEYS[k + 1].t) k++;
  const u = sat((p - KEYS[k].t) / (KEYS[k + 1].t - KEYS[k].t));
  return { k, u, e: smoother(u) };
}
const cA = new THREE.Color(), cB = new THREE.Color();

/* ── 스크롤 · 마우스 ─────────────────────────────── */
let pT = 0, p = 0;
const mouse = { x: 0, y: 0, sx: 0, sy: 0 };
addEventListener("scroll", () => { pT = scrollY / Math.max(1, document.documentElement.scrollHeight - innerHeight); }, { passive: true });
addEventListener("pointermove", e => { mouse.x = e.clientX / innerWidth - .5; mouse.y = e.clientY / innerHeight - .5; }, { passive: true });
$("#home-sym").addEventListener("click", () => scrollTo({ top: 0, behavior: "smooth" }));
$("#logo").addEventListener("click", e => { e.preventDefault(); scrollTo({ top: 0, behavior: "smooth" }); });

/* ── 사운드 ───────────────────────────────────── */
const drone = new Drone();
$("#sound").addEventListener("click", () => {
  const on = drone.toggle();
  $("#sound").classList.toggle("on", on); $("#sound").setAttribute("aria-label", on ? "소리 끄기" : "소리 켜기");
});

/* ── 크기 ──────────────────────────────────────── */
function resize() {
  renderer.setSize(innerWidth, innerHeight, false);
  camera.aspect = innerWidth / innerHeight;
  camera.fov = innerWidth < 760 ? 58 : 40;
  camera.updateProjectionMatrix();
  water.getRenderTarget().setSize(innerWidth * .6 * renderer.getPixelRatio(), innerHeight * .6 * renderer.getPixelRatio());
}
resize(); addEventListener("resize", resize);

/* ── 챕터 UI ──────────────────────────────────── */
const title = $("#ch-title"), ko = $("#ch-ko"), body = $("#ch-body"), chapterEl = $("#chapter");
let shown = -1;
function uiFor(p) {
  // 첫 화면
  const heroA = 1 - sat(p / .03);
  $("#hero").style.opacity = heroA; $("#scroll-hint").style.opacity = heroA;
  // 챕터 제목: 창 안에서만, 앞 22% 는 떠오르고 뒤 22% 는 가라앉는다
  let active = -1, a = 0;
  CHAPTERS.forEach((c, i) => {
    if (p >= c.from && p <= c.to) {
      const u = (p - c.from) / (c.to - c.from);
      active = i; a = Math.min(sat(u / .22), sat((1 - u) / .22));
    }
  });
  if (active !== shown && active >= 0) {
    const c = CHAPTERS[active]; title.textContent = c.title; ko.textContent = c.ko; body.textContent = c.body; shown = active;
    drone.setChapter(active);
  }
  const e = smooth(a);
  chapterEl.style.opacity = active >= 0 ? e : 0;
  chapterEl.style.filter = `blur(${(1 - e) * 10}px)`;
  chapterEl.style.transform = `translate(-50%, ${(1 - e) * 24}px)`;
  // 전시 카드 · 끝 문장
  const card = Math.min(sat((p - .865) / .025), sat((.955 - p) / .025));
  $("#card").style.opacity = card; $("#card").classList.toggle("on", card > .5);
  $("#card").style.transform = `translate(-50%, ${-46 + (1 - card) * 4}%)`;
  const out = sat((p - .965) / .03);
  $("#outro").style.opacity = out; $("#outro").style.filter = `blur(${(1 - out) * 8}px)`;
  $("#progress i").style.height = (p * 100) + "%";
}

/* ── 루프 ─────────────────────────────────────── */
let last = performance.now(), time = 0;
function frame(now) {
  const dt = Math.min(.05, (now - last) / 1000); last = now; time += dt;
  p += (pT - p) * (reduced ? 1 : 1 - Math.exp(-dt * 4.5));

  // 카메라
  const { k, e } = keyAt(p);
  const t = (k + e) / (KEYS.length - 1);
  const cp = posCurve.getPoint(t), cl = lookCurve.getPoint(t);
  mouse.sx += (mouse.x - mouse.sx) * .04; mouse.sy += (mouse.y - mouse.sy) * .04;
  const par = new THREE.Vector3(mouse.sx * 3.2, -mouse.sy * 1.6, 0).applyQuaternion(camera.quaternion);
  camera.position.copy(cp).add(par);
  camera.lookAt(cl.x + mouse.sx * 4, cl.y - mouse.sy * 2, cl.z);

  // 하늘 · 빛 — 두 키 사이의 색을 섞는다
  const A = KEYS[k], B = KEYS[k + 1];
  skyU.uTop.value.copy(cA.set(A.sky[0]).lerp(cB.set(B.sky[0]), e));
  skyU.uHor.value.copy(cA.set(A.sky[1]).lerp(cB.set(B.sky[1]), e));
  skyU.uGlow.value = lerp(A.glow ?? .4, B.glow ?? .4, e);
  hemi.color.copy(skyU.uHor.value).multiplyScalar(1.6);
  rim.color.copy(skyU.uHor.value); rim.intensity = lerp(A.rim ?? 0, B.rim ?? 0, e);
  starU.uOpacity.value = lerp(A.stars ?? 0, B.stars ?? 0, e);
  starU.uTime.value = time;

  // 챕터별 진행
  const ch = i => { const c = CHAPTERS[i]; return sat((p - c.from + .03) / (c.to - c.from)); };
  const observe = sat(ch(1) * 1.6), choose = sat(ch(2) * 1.6) * (1 - sat((p - .62) / .08) * .5);
  const discover = Math.min(sat(ch(3) * 1.8), 1 - sat((p - .62) / .05));
  const relate = sat(ch(4) * 1.5), awake = sat((p - .735) / .2);
  // 벽: 관찰부터 영상이 흐른다
  const wallOn = observe * (1 - awake);
  wallMats.forEach(m => { m.color.setScalar(.05 + wallOn * .95); m.opacity = 1 - awake; });
  if (wallOn > .02) vids.forEach(v => v.v.paused && v.v.play().catch(() => {}));
  roomGlow.intensity = (.6 + observe * 6) * (1 - awake);
  edgeMat.opacity = (.8 - discover * .2) * (1 - awake * .9);
  edgeMat.color.set(discover > .5 ? 0xaec0ff : 0xf4efe2);
  floorMat.opacity = 1 - awake;
  drawFloor(dt, time, choose, relate);
  islandWireMat.opacity = discover * .32;
  traceU.uReveal.value = relate * (1 - sat((p - .9) / .08)); traceU.uTime.value = time;
  riseU.uRise.value = awake; riseU.uTime.value = time;
  fly.rotation.y = time * .01;

  uiFor(p);
  renderer.render(scene, camera);
}
function loop(now) { frame(now); requestAnimationFrame(loop); }

/* ── 로딩: 영상이 준비될 때까지 스크롤을 잠근다 ─────────── */
(async () => {
  const t0 = performance.now();
  let done = 0; const total = vids.length + 1;
  const tick = () => { done++; $("#loader-pct").textContent = Math.round(done / total * 100); };
  const waits = vids.map(({ v }) => new Promise(r => {
    const ok = () => { tick(); r(); };
    v.addEventListener("loadeddata", ok, { once: true }); v.addEventListener("error", ok, { once: true });
    setTimeout(r, 8000); v.load();
  }));
  waits.push(document.fonts.ready.then(tick));
  await Promise.all(waits);
  await new Promise(r => setTimeout(r, Math.max(0, 1400 - (performance.now() - t0))));
  scrollTo(0, 0);
  $("#loader").classList.add("done");
  document.body.classList.remove("locked");
  requestAnimationFrame(loop);
})();

/* 검증용 — 탭이 가려져 rAF 가 멈춘 브라우저에서 특정 진행도로 바로 가서 한 프레임 그린다 */
window.__limen3 = { goto(v, frames = 1) { pT = p = v; for (let i = 0; i < frames; i++) { last = performance.now() - 16; frame(performance.now()); } } };
