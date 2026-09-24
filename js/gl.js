/* WebGL 무대 — 원본 UfxMesh 방식.
   DOM 에는 빈 자리만 두고, 그 자리의 getBoundingClientRect 를 따라 같은 크기의 평면을 캔버스에 그린다.
   카메라는 픽셀 단위 직교 카메라: DOM 1px = WebGL 1px. */
import * as THREE from "./vendor/three.module.min.js";
import { scroll, math } from "./scroll.js";
import { ScreenPaint } from "./paint.js";

export { THREE };

// 셰이더가 전부 직접 쓴 것이라 색 공간 변환을 끈다 — 텍스처 값 그대로 화면에 나간다
THREE.ColorManagement.enabled = false;

export const gl = {
  renderer: null, scene: null, camera: null, sceneRT: null, paint: null,
  planes: [], loader: null, pending: 0, loaded: 0, onProgress: null,
  mouse: new THREE.Vector2(-1e4, -1e4), time: 0,

  init(canvas) {
    let renderer;
    try {
      renderer = new THREE.WebGLRenderer({ canvas, antialias: false, alpha: false, powerPreference: "high-performance" });
    } catch (e) { return false; }
    this.renderer = renderer;
    renderer.outputColorSpace = THREE.LinearSRGBColorSpace;
    renderer.setClearColor(new THREE.Color("#f0f1fa"), 1);
    renderer.autoClear = true;
    this.scene = new THREE.Scene();
    this.camera = new THREE.OrthographicCamera(0, 1, 0, -1, -1000, 1000);
    this.sceneRT = new THREE.WebGLRenderTarget(1, 1, { depthBuffer: false, samples: 4 });
    this.paint = new ScreenPaint(renderer);
    this.loader = new THREE.TextureLoader();
    addEventListener("pointermove", e => this.mouse.set(e.clientX, e.clientY), { passive: true });
    return true;
  },

  resize() {
    const w = innerWidth, h = innerHeight, dpr = Math.min(devicePixelRatio, 2);
    this.renderer.setPixelRatio(dpr);
    this.renderer.setSize(w, h, false);
    this.camera.right = w; this.camera.bottom = -h; this.camera.updateProjectionMatrix();
    this.sceneRT.setSize(Math.floor(w * dpr), Math.floor(h * dpr));
    this.paint.resize(w, h);
  },

  /* 텍스처 로딩 진행률 → 프리로더 */
  _track(p) { this.pending++; p.then(() => { this.loaded++; this.onProgress?.(this.loaded / this.pending); }, () => { this.loaded++; this.onProgress?.(this.loaded / this.pending); }); },

  texture(url) {
    const size = new THREE.Vector2(1, 1);
    const tex = this.loader.load(url);
    tex.minFilter = THREE.LinearFilter; tex.generateMipmaps = false;
    this._track(new Promise((res, rej) => {
      const img = new Image(); img.onload = () => { size.set(img.naturalWidth, img.naturalHeight); res(); }; img.onerror = rej; img.src = url;
    }));
    return { tex, size };
  },

  /* 영상은 첫 프레임이 실제로 나오기 전까지 포스터 이미지를 보여 준다 (검은 사각형 방지).
     media.tex 가 도중에 바뀌므로 쓰는 쪽은 매 프레임 media.tex 를 다시 읽는다. */
  video(url, poster) {
    const v = document.createElement("video");
    Object.assign(v, { src: url, muted: true, loop: true, playsInline: true, preload: "auto" });
    v.setAttribute("playsinline", ""); v.setAttribute("muted", "");
    const first = poster ? this.texture(poster) : { tex: null, size: new THREE.Vector2(16, 9) };
    const media = { tex: first.tex, size: first.size, el: v };
    const videoTex = new THREE.VideoTexture(v);
    const swap = () => {
      if (v.readyState < 2 || !v.videoWidth) return;
      media.size.set(v.videoWidth, v.videoHeight);
      media.tex = videoTex;
    };
    v.addEventListener("playing", swap);
    v.addEventListener("timeupdate", swap);
    if (!poster) {
      media.tex = videoTex;
      this._track(new Promise(res => {
        v.addEventListener("loadeddata", () => { media.size.set(v.videoWidth || 16, v.videoHeight || 9); res(); }, { once: true });
        v.addEventListener("error", res, { once: true });
        setTimeout(res, 5000);
      }));
    }
    v.load();
    return media;
  },

  add(plane) { this.planes.push(plane); this.scene.add(plane.mesh); return plane; },

  render(dt) {
    this.time += dt;
    for (const p of this.planes) p.update(dt);
    this.paint.update(dt);
    this.renderer.setRenderTarget(this.sceneRT);
    this.renderer.render(this.scene, this.camera);
    this.paint.renderDistortion(this.sceneRT.texture);
  },
};

/* ── 일반 이미지·영상 평면 (카드, 히어로, 4면 이미지) ─────────────── */
const planeVert = /* glsl */`
uniform vec2 u_domXY;
uniform vec2 u_domWH;
varying vec2 v_uv;
void main(){
  vec2 xy = u_domXY + position.xy * u_domWH;       // position.y 0 = DOM 위쪽
  gl_Position = projectionMatrix * modelViewMatrix * vec4(xy.x, -xy.y, 0., 1.);
  v_uv = vec2(uv.x, 1. - uv.y);
}`;

const planeFrag = /* glsl */`
uniform sampler2D u_texture;
uniform vec2 u_texSize;
uniform vec2 u_domWH;
uniform float u_radius;
uniform float u_reveal;      // 0 → 1 : 들어올 때 60% 크기에서 풀사이즈로 (원본 project item)
uniform float u_zoom;
uniform vec2 u_parallax;
uniform float u_dim;
varying vec2 v_uv;
float sdRoundedBox(in vec2 p, in vec2 b, in float r){ vec2 q = abs(p) - b + r; return min(max(q.x, q.y), 0.0) + length(max(q, 0.0)) - r; }
void main(){
  float s = mix(0.6, 1., u_reveal);
  float d = sdRoundedBox((v_uv - .5) * u_domWH, u_domWH * .5 * s, u_radius);
  float mask = smoothstep(0., 0. - fwidth(d), d);
  vec2 uv = v_uv - .5;
  float boxA = u_domWH.x / u_domWH.y, texA = u_texSize.x / u_texSize.y;
  if (boxA > texA) uv.y *= texA / boxA; else uv.x *= boxA / texA;   // cover
  uv *= mix(0.6, 1., u_reveal) * u_zoom;
  uv += .5 + u_parallax;
  vec3 color = texture2D(u_texture, uv).rgb * (1. - u_dim);
  gl_FragColor = vec4(color, mask * smoothstep(0., .15, u_reveal));
}`;

export class DomPlane {
  constructor(el, media, opts = {}) {
    this.el = el; this.media = media; this.opts = opts;
    this.reveal = opts.reveal ?? 0; this.revealTarget = this.reveal;
    this.hover = 0; this.hovering = false;
    this.local = new THREE.Vector2(.5, .5);
    this.mat = new THREE.ShaderMaterial({
      vertexShader: planeVert, fragmentShader: planeFrag, transparent: true, depthTest: false, depthWrite: false, side: THREE.DoubleSide,
      uniforms: {
        u_domXY: { value: new THREE.Vector2() }, u_domWH: { value: new THREE.Vector2(1, 1) },
        u_texture: { value: media.tex }, u_texSize: { value: media.size },
        u_radius: { value: opts.radius ?? 15 }, u_reveal: { value: this.reveal }, u_zoom: { value: 1 },
        u_parallax: { value: new THREE.Vector2() }, u_dim: { value: 0 },
      },
    });
    this.mesh = new THREE.Mesh(new THREE.PlaneGeometry(1, 1, 1, 1).translate(.5, .5, 0), this.mat);
    this.mesh.frustumCulled = false;
    if (opts.hover !== false) {
      const host = opts.hoverEl || el;
      host.addEventListener("pointerenter", () => (this.hovering = true));
      host.addEventListener("pointerleave", () => (this.hovering = false));
    }
  }

  update(dt) {
    const r = scroll.range(this.el);
    const u = this.mat.uniforms;
    const visible = r.isActive;
    this.mesh.visible = visible;
    const v = this.media.el;
    if (v) { if (visible && v.paused) v.play().catch(() => {}); else if (!visible && !v.paused) v.pause(); }
    if (!visible) return;

    u.u_texture.value = this.media.tex;
    u.u_texSize.value = this.media.size;
    u.u_domXY.value.set(r.left, r.screenY);
    u.u_domWH.value.set(r.width, r.height);

    // 들어올 때 한 번 펼쳐진다
    if (this.opts.reveal === undefined && r.screenRatio > -0.75) this.revealTarget = 1;
    this.reveal += (this.revealTarget - this.reveal) * (1 - Math.exp(-dt * 2.2));
    u.u_reveal.value = ease_(this.reveal);

    // 호버: 살짝 당겨지고 마우스 쪽으로 시차
    this.hover = math.saturate(this.hover + dt * 3 * (this.hovering ? 1 : -1));
    const h = this.hover * this.hover * (3 - 2 * this.hover);
    const mx = math.saturate((gl.mouse.x - r.left) / r.width) - .5, my = math.saturate((gl.mouse.y - r.screenY) / r.height) - .5;
    this.local.lerp({ x: mx, y: my }, 1 - Math.exp(-dt * 6));
    u.u_zoom.value = 1 - h * .08;
    u.u_parallax.value.set(this.local.x * .03 * h, -this.local.y * .03 * h);
    if (this.opts.onUpdate) this.opts.onUpdate(this, r, dt);
  }
}
const ease_ = t => 1 - Math.pow(1 - math.saturate(t), 3);
