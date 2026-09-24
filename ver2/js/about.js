/* About — 꿈속 별자리. 8개의 개념 별 + 수천 개의 먼지 별 + 가까운 별끼리 이은 가는 선.
   드래그 = 궤도 회전(관성), 휠 = 앞뒤로, 별 클릭 = 카메라가 그 별 속으로 날아 들어간 뒤 스포트라이트 장면. */
import * as THREE from "../../js/vendor/three.module.min.js";
import { NODES } from "./data.js";

THREE.ColorManagement.enabled = false;

function rand(seed) { let s = seed; return () => (s = (s * 16807) % 2147483647) / 2147483647; }

export function mount(root, params, app) {
  root.className = "page dark";
  root.innerHTML = `<canvas class="fill"></canvas><div class="labels"></div><div class="fade-black"></div>
    <a class="side l mono" href="#/" data-hover>&lt; MAIN</a>
    <a class="side r mono" href="#/work" data-hover>WORK &gt;</a>
    <div class="hint mono">DRAG · SCROLL · 별을 누르면 안으로</div>`;
  const cv = root.querySelector("canvas"), labelsEl = root.querySelector(".labels"), fade = root.querySelector(".fade-black");

  const renderer = new THREE.WebGLRenderer({ canvas: cv, antialias: true });
  renderer.setClearColor(0x070707, 1);
  const scene = new THREE.Scene();
  scene.fog = new THREE.Fog(0x070707, 60, 150);
  const camera = new THREE.PerspectiveCamera(55, 1, .1, 400);
  const world = new THREE.Group(); scene.add(world);
  const r = rand(11);

  // 먼지 별
  const N = 2200, pos = new Float32Array(N * 3), size = new Float32Array(N);
  for (let i = 0; i < N; i++) {
    const u = r() * 2 - 1, th = r() * Math.PI * 2, rad = 18 + Math.pow(r(), .6) * 70;
    const s = Math.sqrt(1 - u * u);
    pos[i * 3] = Math.cos(th) * s * rad; pos[i * 3 + 1] = u * rad * .7; pos[i * 3 + 2] = Math.sin(th) * s * rad;
    size[i] = r() < .06 ? 2.6 : .6 + r() * 1.2;
  }
  const dustGeo = new THREE.BufferGeometry();
  dustGeo.setAttribute("position", new THREE.BufferAttribute(pos, 3));
  dustGeo.setAttribute("size", new THREE.BufferAttribute(size, 1));
  const dustMat = new THREE.ShaderMaterial({
    transparent: true, depthWrite: false,
    uniforms: { uTime: { value: 0 }, uPR: { value: 1 } },
    vertexShader: `attribute float size; uniform float uTime; uniform float uPR; varying float vA;
      void main(){ vec4 mv = modelViewMatrix * vec4(position,1.); gl_Position = projectionMatrix * mv;
        float tw = .6 + .4 * sin(uTime * 1.3 + position.x * 3.1 + position.y);
        gl_PointSize = size * uPR * (60. / -mv.z) * tw; vA = clamp(80. / -mv.z, .15, 1.); }`,
    fragmentShader: `varying float vA; void main(){ vec2 c = gl_PointCoord - .5; float d = length(c); if (d > .5) discard; gl_FragColor = vec4(vec3(1.), (1. - d * 2.) * vA); }`,
  });
  world.add(new THREE.Points(dustGeo, dustMat));

  // 허브 별 90개 — 가까운 셋끼리 선으로
  const hubs = [];
  for (let i = 0; i < 90; i++) {
    const u = r() * 2 - 1, th = r() * Math.PI * 2, rad = 14 + r() * 42, s = Math.sqrt(1 - u * u);
    hubs.push(new THREE.Vector3(Math.cos(th) * s * rad, u * rad * .7, Math.sin(th) * s * rad));
  }
  // 개념 별 8개 — 앞쪽 반구에 고르게
  const stars = NODES.map((n, i) => {
    const a = (i / NODES.length) * Math.PI * 2 + .3, y = Math.sin(i * 2.1) * 14;
    const rad = 26 + (i % 3) * 7;
    const p = new THREE.Vector3(Math.cos(a) * rad, y, Math.sin(a) * rad);
    hubs.push(p);
    return { ...n, p };
  });
  const seg = [];
  hubs.forEach((a, i) => {
    const near = hubs.map((b, j) => [a.distanceTo(b), j]).filter(x => x[1] !== i).sort((x, y) => x[0] - y[0]).slice(0, 3);
    near.forEach(([, j]) => seg.push(a.x, a.y, a.z, hubs[j].x, hubs[j].y, hubs[j].z));
  });
  const lineGeo = new THREE.BufferGeometry(); lineGeo.setAttribute("position", new THREE.Float32BufferAttribute(seg, 3));
  world.add(new THREE.LineSegments(lineGeo, new THREE.LineBasicMaterial({ color: 0xffffff, transparent: true, opacity: .13 })));
  const hubGeo = new THREE.BufferGeometry().setFromPoints(hubs);
  world.add(new THREE.Points(hubGeo, new THREE.PointsMaterial({ color: 0xffffff, size: .45, sizeAttenuation: true })));

  // 라벨 (DOM, 매 프레임 투영)
  stars.forEach(s => {
    const el = document.createElement("a");
    el.className = "star-label"; el.href = `#/about/${s.id}`; el.dataset.hover = "";
    el.innerHTML = `${s.label}<small>${s.ko}</small>`;
    el.addEventListener("click", e => { e.preventDefault(); e.stopPropagation(); flyTo(s); });
    labelsEl.appendChild(el); s.el = el;
  });

  // 입력: 드래그 회전(관성) · 휠 전후
  const rot = { x: .15, y: 0, vx: 0, vy: .0009 };
  let dist = 72, distT = 72, drag = null;
  const down = e => { drag = { x: e.clientX, y: e.clientY }; root.setPointerCapture?.(e.pointerId); };
  const move = e => {
    if (!drag) return;
    rot.vy = (e.clientX - drag.x) * .0022; rot.vx = (e.clientY - drag.y) * .0016;
    drag = { x: e.clientX, y: e.clientY };
  };
  const up = () => { drag = null; };
  const wheel = e => { distT = Math.max(34, Math.min(110, distT + e.deltaY * .04)); };
  root.addEventListener("pointerdown", down); addEventListener("pointermove", move); addEventListener("pointerup", up);
  root.addEventListener("wheel", wheel, { passive: true });

  // 별 속으로 날아가기
  let fly = null;
  function flyTo(s) {
    if (fly) return;
    app.sound.blip(200, .5, .05, "sine");
    const wp = s.p.clone().applyMatrix4(world.matrixWorld);
    fly = { t: 0, from: camera.position.clone(), to: wp, look: new THREE.Vector3(), id: s.id };
  }

  function resize() {
    const w = root.clientWidth, h = root.clientHeight;
    renderer.setPixelRatio(Math.min(devicePixelRatio, 2)); renderer.setSize(w, h, false);
    camera.aspect = w / h; camera.updateProjectionMatrix();
    dustMat.uniforms.uPR.value = renderer.getPixelRatio();
  }
  resize();
  const ro = new ResizeObserver(resize); ro.observe(root);
  const v = new THREE.Vector3();

  function tick(dt, t) {
    dustMat.uniforms.uTime.value = t;
    if (!drag) { rot.vy += (.0009 - rot.vy) * .02; rot.vx *= .94; }
    rot.y += rot.vy; rot.x = Math.max(-.7, Math.min(.7, rot.x + rot.vx));
    world.rotation.set(rot.x, rot.y, 0);
    world.updateMatrixWorld();

    if (fly) {
      fly.t = Math.min(1, fly.t + dt / 1.25);
      const e = fly.t * fly.t * fly.t;                        // 점점 빨라지며 빨려 들어감
      camera.position.lerpVectors(fly.from, fly.to, e * .985);
      camera.lookAt(fly.to);
      fade.style.opacity = Math.max(0, (fly.t - .55) / .45);
      if (fly.t >= 1 && !fly.done) { fly.done = true; app.go(`#/about/${fly.id}`, "fade"); }
    } else {
      dist += (distT - dist) * .08;
      camera.position.set(0, 0, dist); camera.lookAt(0, 0, 0);
    }

    // 라벨 투영 — 앞쪽 별일수록 크고 밝다
    const w = root.clientWidth, h = root.clientHeight;
    for (const s of stars) {
      v.copy(s.p).applyMatrix4(world.matrixWorld);
      const depth = v.distanceTo(camera.position);
      v.project(camera);
      const vis = v.z < 1 && Math.abs(v.x) < 1.1 && Math.abs(v.y) < 1.1;
      s.el.style.display = vis ? "" : "none";
      if (!vis) continue;
      const sc = Math.max(.7, Math.min(2.1, 90 / depth));
      s.el.style.transform = `translate3d(${(v.x * .5 + .5) * w}px, ${(-v.y * .5 + .5) * h}px, 0) translateY(-50%) scale(${sc})`;
      s.el.style.fontSize = "12px";
      s.el.style.opacity = Math.max(.25, Math.min(1, 120 / depth - .4));
    }
    renderer.render(scene, camera);
  }

  return {
    theme: "dark", tick,
    destroy() {
      ro.disconnect(); removeEventListener("pointermove", move); removeEventListener("pointerup", up);
      renderer.dispose(); dustGeo.dispose(); lineGeo.dispose(); hubGeo.dispose();
    },
  };
}
