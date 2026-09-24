/* ★ 릴 워핑 — 원본 HomeReelSection 포팅 (ANALYSIS.md §1)

   #home-reel-thumb (쿼터 사이즈, 출발)  ──스크롤──▶  #home-reel-container-inner (거의 풀스크린, 도착)

   33×33 정점 평면 하나가 두 사각형 사이를 오간다. 정점마다 출발 시각이 달라서
   오른쪽 위 모서리가 먼저 빨려 들어가고 왼쪽 아래가 가장 늦게 따라온다 → 면이 곡선으로 휘며 파도친다. */
import { THREE, gl } from "./gl.js";
import { scroll, math } from "./scroll.js";
import { REEL } from "./content.js";

/* 원본 videoVert — 수식은 한 글자도 바꾸지 않았다 */
const reelVert = /* glsl */`
uniform vec2 u_domXYFrom;
uniform vec2 u_domWHFrom;
uniform vec2 u_domXY;
uniform vec2 u_domWH;
uniform vec2 u_domPivot;
uniform float u_showRatio;
varying vec2 v_uv;
varying vec2 v_domWH;
varying float v_showRatio;
vec3 qrotate(vec4 q, vec3 v){ return v + 2. * cross(q.xyz, cross(q.xyz, v) + q.w * v); }
void main(){
  // 오른쪽 위 = 0 (먼저 출발), 왼쪽 아래 = 1 (가장 늦게)
  float placementWeight = 1. - (pow(position.x * position.x, 0.75) + pow(1. - position.y, 1.5)) / 2.;
  v_showRatio = smoothstep(placementWeight * 0.3, 0.7 + placementWeight * 0.3, u_showRatio);

  vec2 domXY = mix(u_domXYFrom, u_domXY, v_showRatio);
  vec2 domWH = mix(u_domWHFrom, u_domWH, v_showRatio);
  // ① 가로 출렁임: 중간에서 폭의 10% 만큼 부풀었다 돌아온다
  domXY.x += mix(domWH.x, 0., cos(v_showRatio * 3.1415926 * 2.) * 0.5 + 0.5) * 0.1;

  vec3 basePos = vec3(position.xy * domWH - u_domPivot, position.z);
  // ② 비틀림: smoothstep 과 선형의 차이만큼 z 회전
  float rot = (smoothstep(0., 1., v_showRatio) - v_showRatio) * -0.5;
  vec3 rotBasePos = qrotate(vec4(0., 0., sin(rot), cos(rot)), basePos);
  vec3 screenPos = (rotBasePos + vec3(u_domPivot, 0.) + vec3(domXY, 0.)) * vec3(1., -1., 1.);

  gl_Position = projectionMatrix * modelViewMatrix * vec4(screenPos, 1.0);
  v_uv = vec2(uv.x, 1. - uv.y);
  v_domWH = domWH;
}`;

/* 원본 videoFrag — 썸네일일 땐 흑백+블루 틴트, 펼쳐질수록 원색 */
const reelFrag = /* glsl */`
uniform sampler2D u_texture;
uniform vec3 u_color;
uniform float u_aspectScale;
uniform float u_globalRadius;
varying vec2 v_uv;
varying vec2 v_domWH;
varying float v_showRatio;
float sdRoundedBox(in vec2 p, in vec2 b, in float r){ vec2 q = abs(p) - b + r; return min(max(q.x, q.y), 0.0) + length(max(q, 0.0)) - r; }
void main(){
  float d = sdRoundedBox((v_uv - .5) * v_domWH, v_domWH * .5, u_globalRadius);
  float imageAlpha = smoothstep(0., 0. - fwidth(d), d);
  vec2 baseUv = v_uv;
  baseUv.y = (baseUv.y - .5) * mix(1., u_aspectScale, v_showRatio) + 0.5;
  vec3 color = texture2D(u_texture, baseUv).rgb;
  vec3 tintedColor = max(u_color, vec3(dot(color, vec3(0.299, 0.587, 0.114))));
  gl_FragColor = vec4(mix(tintedColor, color, v_showRatio), imageAlpha);
}`;

export function initReel({ onOpen }) {
  const $ = id => document.getElementById(id);
  const dom = {
    header: $("header"),
    thumb: $("home-reel-thumb"),
    container: $("home-reel-container"),
    inner: $("home-reel-container-inner"),
    video: $("home-reel-video-container"),
    placeholder: $("home-reel-video-placeholder"),
    btn: $("home-reel-video-watch-btn"),
    cursor: $("reel-cursor"),
  };
  const isMobile = () => scroll.vw <= 812;

  let media = null, mat = null, mesh = null;
  if (gl.renderer) {
    media = gl.video(REEL.video, REEL.poster);
    mat = new THREE.ShaderMaterial({
      vertexShader: reelVert, fragmentShader: reelFrag,
      transparent: true, depthTest: false, depthWrite: false, side: THREE.DoubleSide,
      uniforms: {
        u_texture: { value: media.tex },
        u_color: { value: new THREE.Color("#1a2ffb") },
        u_showRatio: { value: 0 }, u_aspectScale: { value: 1 },
        u_globalRadius: { value: 20 },
        u_domXYFrom: { value: new THREE.Vector2() }, u_domWHFrom: { value: new THREE.Vector2(1, 1) },
        u_domXY: { value: new THREE.Vector2() }, u_domWH: { value: new THREE.Vector2(1, 1) },
        u_domPivot: { value: new THREE.Vector2() },
      },
    });
    mesh = new THREE.Mesh(new THREE.PlaneGeometry(1, 1, 32, 32).translate(.5, .5, 0), mat);
    mesh.frustumCulled = false;
    mesh.renderOrder = 1000;
    gl.scene.add(mesh);
  }

  /* 원본 resize — 도착 사각형 높이 = min(헤더 아래 남은 높이, 폭/2), 영상 비율에 맞춰 세로 cover 보정 */
  function resize() {
    const n = dom.video.getBoundingClientRect().width;
    let a, marginTop = 0, aspectScale = 1;
    if (isMobile()) {
      a = n / REEL.aspect;
    } else {
      const hb = dom.header.getBoundingClientRect().bottom;
      // 원본: ✕ 장식 top(-2·cross) 의 1.5배를 위아래 여백으로
      const p = parseFloat(getComputedStyle(dom.video.querySelector(".reel-crosses")).fontSize) * 3;
      let f = scroll.vh - hb - p * 2;
      a = Math.min(f, n / 2);
      marginTop = -scroll.vh * .5 + f * .5 + hb + p;
      aspectScale = a / (n / REEL.aspect);
    }
    dom.video.style.height = a + "px";
    dom.video.style.marginTop = marginTop + "px";
    if (mat) {
      mat.uniforms.u_aspectScale.value = aspectScale;
      mat.uniforms.u_globalRadius.value = parseFloat(getComputedStyle(document.documentElement).getPropertyValue("--radius")) || 20;
    }
  }

  // 커서 — 펼쳐진 영상 위에서만 따라다니는 PLAY 원
  let hover = false, open = false, cursorScale = 0;
  const cur = { x: innerWidth / 2, y: innerHeight / 2 }, tgt = { ...cur };
  dom.placeholder.addEventListener("pointerenter", () => (hover = true));
  dom.placeholder.addEventListener("pointerleave", () => (hover = false));
  addEventListener("pointermove", e => { tgt.x = e.clientX; tgt.y = e.clientY; }, { passive: true });
  const openVideo = () => { if (open || isMobile()) onOpen(); };
  dom.placeholder.addEventListener("click", openVideo);
  dom.btn.addEventListener("click", onOpen);

  let ratio = 0;
  function update(dt) {
    const a = scroll.range(dom.container);
    const l = scroll.range(dom.inner);
    const u = scroll.range(dom.thumb);
    const vh = scroll.vh, mobile = isMobile();

    // c: 도착 사각형이 끈적하게 따라붙는 오프셋
    const c = mobile ? 0 : scroll.getEaseInOutOffset(scroll.cur - a.top + (vh - l.height) * .5, vh, 1, 0);
    const visible = mobile ? l.isActive : (u.showScreenOffset > 0 && l.hideScreenOffset < 1);

    const p = u.top - (vh - u.height) * .5;          // 썸네일이 화면 중앙에 오는 스크롤
    const g = a.top - (vh - a.height) * .5;          // 컨테이너가 중앙에 오는 스크롤
    const v = Math.max(0, u.showScreenOffset * vh - vh * .5 - u.height * .5);   // 중앙에 닿은 썸네일은 거기 멈춘다
    ratio = mobile ? 1 : math.fit(scroll.cur, p, g, 0, 1);

    dom.video.style.transform = `translate3d(0, ${c}px, 0)`;
    open = ratio > .98 && visible;
    dom.video.classList.toggle("is-open", open);

    if (mesh) {
      mesh.visible = visible;
      const U = mat.uniforms;
      U.u_domXYFrom.value.set(u.left, u.top - scroll.cur + v);
      U.u_domWHFrom.value.set(u.width, u.height);
      U.u_domXY.value.set(l.left, l.top - scroll.cur + c);
      U.u_domWH.value.set(l.width, l.height);
      U.u_domPivot.value.set(l.width * .5, l.height * .5);
      U.u_showRatio.value = ratio;
      U.u_texture.value = media.tex;
      const vid = media.el;
      if (visible && vid.paused) vid.play().catch(() => {});
      else if (!visible && !vid.paused) vid.pause();
    }

    // PLAY 커서 (원본: backOut 으로 튀어나오고 마우스 속도만큼 커진다)
    cur.x += (tgt.x - cur.x) * (1 - Math.exp(-dt * 12));
    cur.y += (tgt.y - cur.y) * (1 - Math.exp(-dt * 12));
    const want = hover && open && !mobile ? 1 : 0;
    cursorScale = math.saturate(cursorScale + dt * 4 * (want ? 1 : -1));
    const speed = Math.min(2.5, Math.hypot(tgt.x - cur.x, tgt.y - cur.y) / 60 + 1);
    const s = cursorScale > 0 ? backOut(cursorScale) * (want ? speed : 1) : 0;
    dom.cursor.style.transform = `translate3d(${cur.x}px, ${cur.y}px, 0) scale(${s})`;
  }

  return { resize, update, get ratio() { return ratio; } };
}

function backOut(t) { const s = 1.70158; t -= 1; return t * t * ((s + 1) * t + s) + 1; }
