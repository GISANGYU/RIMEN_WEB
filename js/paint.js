/* 마우스 효과 — 원본 ScreenPaint + ScreenPaintDistortion 포팅 (ANALYSIS.md §2)

   1) 페인트 버퍼(화면 ¼ 해상도): xy = 속도(0.5 중심), zw = 무게. 마우스가 그은 선분이 붓 자국이 된다.
   2) 후처리: 무게가 있는 곳의 화면을 속도 방향으로 9번 끌어 번지게 하고, 가장자리에 무지개빛을 얹는다. */
import * as THREE from "./vendor/three.module.min.js";
import { math, scroll } from "./scroll.js";

const quadVert = /* glsl */`
varying vec2 v_uv;
void main(){ v_uv = uv; gl_Position = vec4(position.xy, 0., 1.); }`;

const paintFrag = /* glsl */`
uniform sampler2D u_lowPaintTexture;
uniform sampler2D u_prevPaintTexture;
uniform vec2 u_paintTexelSize;
uniform vec2 u_scrollOffset;
uniform vec4 u_drawFrom;
uniform vec4 u_drawTo;
uniform float u_pushStrength;
uniform vec3 u_dissipations;
uniform vec2 u_vel;
varying vec2 v_uv;
vec2 sdSegment(in vec2 p, in vec2 a, in vec2 b){
  vec2 pa = p - a, ba = b - a;
  float bb = dot(ba, ba);
  float h = bb > 1e-6 ? clamp(dot(pa, ba) / bb, 0.0, 1.0) : 0.0;
  return vec2(length(pa - ba * h), h);
}
void main(){
  vec2 res = sdSegment(gl_FragCoord.xy, u_drawFrom.xy, u_drawTo.xy);
  vec2 radiusWeight = mix(u_drawFrom.zw, u_drawTo.zw, res.y);
  float d = 1.0 - smoothstep(-0.01, radiusWeight.x, res.x);
  vec4 lowData = texture2D(u_lowPaintTexture, v_uv - u_scrollOffset);
  vec2 velInv = (0.5 - lowData.xy) * u_pushStrength;
  vec4 data = texture2D(u_prevPaintTexture, v_uv - u_scrollOffset + velInv * u_paintTexelSize);
  data.xy -= 0.5;
  vec4 delta = (u_dissipations.xxyz - 1.0) * data;
  vec2 newVel = u_vel * d;
  delta += vec4(newVel, radiusWeight.yy * d);
  delta.zw = sign(delta.zw) * max(vec2(0.004), abs(delta.zw));
  data += delta;
  data.xy += 0.5;
  gl_FragColor = clamp(data, vec4(0.0), vec4(1.0));
}`;

const blurFrag = /* glsl */`
uniform sampler2D u_texture;
uniform vec2 u_delta;
varying vec2 v_uv;
void main(){
  vec4 c = texture2D(u_texture, v_uv) * 0.2270270270;
  c += texture2D(u_texture, v_uv + u_delta * 1.3846153846) * 0.3162162162;
  c += texture2D(u_texture, v_uv - u_delta * 1.3846153846) * 0.3162162162;
  c += texture2D(u_texture, v_uv + u_delta * 3.2307692308) * 0.0702702703;
  c += texture2D(u_texture, v_uv - u_delta * 3.2307692308) * 0.0702702703;
  gl_FragColor = c;
}`;

const copyFrag = /* glsl */`
uniform sampler2D u_texture; varying vec2 v_uv;
void main(){ gl_FragColor = texture2D(u_texture, v_uv); }`;

/* 원본 frag$1 — 블루노이즈 대신 해시 노이즈 */
const distortionFrag = /* glsl */`
uniform sampler2D u_texture;
uniform sampler2D u_screenPaintTexture;
uniform vec2 u_screenPaintTexelSize;
uniform float u_amount;
uniform float u_rgbShift;
uniform float u_multiplier;
uniform float u_colorMultiplier;
uniform float u_shade;
varying vec2 v_uv;
vec3 hash32(vec2 p){ vec3 p3 = fract(vec3(p.xyx) * vec3(.1031, .1030, .0973)); p3 += dot(p3, p3.yxz + 33.33); return fract((p3.xxy + p3.yzz) * p3.zyx); }
void main(){
  vec3 bnoise = hash32(gl_FragCoord.xy + vec2(17., 29.));
  vec4 data = texture2D(u_screenPaintTexture, v_uv);
  float weight = (data.z + data.w) * 0.5;
  vec2 vel = (0.5 - data.xy - 0.001) * 2. * weight;
  vec4 color = vec4(0.0);
  vec2 velocity = vel * u_amount / 4.0 * u_screenPaintTexelSize * u_multiplier;
  vec2 uv = v_uv + bnoise.xy * velocity;
  for (int i = 0; i < 9; i++) { color += texture2D(u_texture, uv); uv += velocity; }
  color /= 9.;
  color.rgb += sin(vec3(vel.x + vel.y) * 40.0 + vec3(0.0, 2.0, 4.0) * u_rgbShift)
             * smoothstep(0.4, -0.9, weight) * u_shade * max(abs(vel.x), abs(vel.y)) * u_colorMultiplier;
  gl_FragColor = vec4(color.rgb, 1.0);
}`;

export class ScreenPaint {
  // 원본 기본값
  minRadius = 0; maxRadius = 100; radiusDistanceRange = 100; pushStrength = 25;
  accelerationDissipation = .8; velocityDissipation = .985; weight1Dissipation = .985; weight2Dissipation = .5;

  mouse = new THREE.Vector2(-1e4, -1e4);
  prevMouse = new THREE.Vector2(-1e4, -1e4);
  hadMoved = false;
  from = new THREE.Vector4();
  to = new THREE.Vector4();
  vel = new THREE.Vector2();

  constructor(renderer) {
    this.renderer = renderer;
    const type = renderer.capabilities.isWebGL2 ? THREE.HalfFloatType : THREE.UnsignedByteType;
    const rt = () => new THREE.WebGLRenderTarget(1, 1, { type, depthBuffer: false, minFilter: THREE.LinearFilter, magFilter: THREE.LinearFilter });
    this.curr = rt(); this.prev = rt(); this.low = rt(); this.lowTmp = rt();

    this.cam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
    this.quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2));
    this.quad.frustumCulled = false;
    this.scene = new THREE.Scene(); this.scene.add(this.quad);

    this.texel = new THREE.Vector2();
    this.paintMat = new THREE.ShaderMaterial({
      vertexShader: quadVert, fragmentShader: paintFrag, depthTest: false, depthWrite: false,
      uniforms: {
        u_lowPaintTexture: { value: this.low.texture }, u_prevPaintTexture: { value: null },
        u_paintTexelSize: { value: this.texel }, u_scrollOffset: { value: new THREE.Vector2() },
        u_drawFrom: { value: this.from }, u_drawTo: { value: this.to },
        u_pushStrength: { value: this.pushStrength },
        u_dissipations: { value: new THREE.Vector3(this.velocityDissipation, this.weight1Dissipation, this.weight2Dissipation) },
        u_vel: { value: this.vel },
      },
    });
    this.fillMat = new THREE.ShaderMaterial({ vertexShader: quadVert, fragmentShader: "void main(){ gl_FragColor = vec4(.5, .5, 0., 0.); }", depthTest: false });
    this.copyMat = new THREE.ShaderMaterial({ vertexShader: quadVert, fragmentShader: copyFrag, uniforms: { u_texture: { value: null } }, depthTest: false });
    this.blurMat = new THREE.ShaderMaterial({ vertexShader: quadVert, fragmentShader: blurFrag, uniforms: { u_texture: { value: null }, u_delta: { value: new THREE.Vector2() } }, depthTest: false });
    this.distortMat = new THREE.ShaderMaterial({
      vertexShader: quadVert, fragmentShader: distortionFrag, depthTest: false, depthWrite: false,
      uniforms: {
        u_texture: { value: null }, u_screenPaintTexture: { value: this.curr.texture }, u_screenPaintTexelSize: { value: this.texel },
        u_amount: { value: 20 }, u_rgbShift: { value: 1 }, u_multiplier: { value: 1.25 }, u_colorMultiplier: { value: 1 }, u_shade: { value: 1.25 },
      },
    });

    const onMove = (x, y) => {
      if (this.mouse.x < -1e3) this.prevMouse.set(x, y);
      this.mouse.set(x, y); this.hadMoved = true;
    };
    addEventListener("pointermove", e => onMove(e.clientX, e.clientY), { passive: true });
  }

  pass(mat, target) {
    this.quad.material = mat;
    this.renderer.setRenderTarget(target);
    this.renderer.render(this.scene, this.cam);
  }

  /* 버퍼를 정확히 (0.5, 0.5, 0, 0) 으로 채운다 — 클리어 색은 색 변환을 타서 0.48 같은 값이 들어가고,
     그 치우침이 pushStrength(25)에 곱해져 화면 전체가 흘러가 버린다 */
  clear() {
    for (const t of [this.curr, this.prev, this.low, this.lowTmp]) this.pass(this.fillMat, t);
    this.renderer.setRenderTarget(null);
    this.vel.set(0, 0);
  }

  resize(w, h) {
    const rw = Math.max(1, w >> 2), rh = Math.max(1, h >> 2);
    if (rw === this.curr.width && rh === this.curr.height) return;
    this.curr.setSize(rw, rh); this.prev.setSize(rw, rh);
    this.low.setSize(Math.max(1, w >> 3), Math.max(1, h >> 3)); this.lowTmp.setSize(this.low.width, this.low.height);
    this.texel.set(1 / rw, 1 / rh);
    this.clear();
  }

  update(dt) {
    [this.prev, this.curr] = [this.curr, this.prev];
    this.paintMat.uniforms.u_prevPaintTexture.value = this.prev.texture;
    this.distortMat.uniforms.u_screenPaintTexture.value = this.curr.texture;

    const W = this.curr.width, H = this.curr.height, vh = scroll.vh;
    const scrollDelta = scroll.delta;                       // px, 아래로 스크롤하면 +
    // 스크롤하면 콘텐츠가 위로 가니 페인트도 같이 올라간다 (uv 는 위가 +)
    this.paintMat.uniforms.u_scrollOffset.value.set(0, -scrollDelta / vh);

    // 붓 반지름 — 마우스가 움직인 거리 (+ 스크롤도 붓질로 친다: 원본은 스크롤 오프셋을 마우스에 더한다)
    const dist = this.mouse.distanceTo(this.prevMouse) + Math.abs(scrollDelta) * 0.6;
    let radius = math.fit(dist, 0, this.radiusDistanceRange, this.minRadius, this.maxRadius);
    if (!this.hadMoved && Math.abs(scrollDelta) < 0.01) radius = 0;
    radius = radius / vh * H;

    this.from.copy(this.to);
    const tx = this.mouse.x / scroll.vw * W, ty = (1 - this.mouse.y / vh) * H;
    this.to.set(tx, ty, radius, 1);
    if (this.from.w === 0) this.from.copy(this.to);

    const dx = (this.to.x - this.from.x) * dt * .8;
    const dy = (this.to.y - this.from.y + scrollDelta / vh * H * .5) * dt * .8;
    this.vel.multiplyScalar(this.accelerationDissipation).add({ x: dx, y: dy });

    this.pass(this.paintMat, this.curr);
    // lowPaint = curr 를 ⅛ 로 줄여 흐린 것 (자기 속도에 밀려 번지게 하는 재료)
    this.copyMat.uniforms.u_texture.value = this.curr.texture; this.pass(this.copyMat, this.low);
    this.blurMat.uniforms.u_texture.value = this.low.texture; this.blurMat.uniforms.u_delta.value.set(1 / this.low.width, 0); this.pass(this.blurMat, this.lowTmp);
    this.blurMat.uniforms.u_texture.value = this.lowTmp.texture; this.blurMat.uniforms.u_delta.value.set(0, 1 / this.low.height); this.pass(this.blurMat, this.low);

    this.prevMouse.copy(this.mouse);
    this.hadMoved = false;
  }

  /* 장면 텍스처를 받아 화면에 왜곡해 그린다 */
  renderDistortion(sceneTexture) {
    this.distortMat.uniforms.u_texture.value = sceneTexture;
    this.pass(this.distortMat, null);
  }
}
