/* 부드러운 스크롤 + 원본(lusion)의 스크롤 수식.

   네이티브 스크롤바는 그대로 두고(body 높이만 맞춤), 화면에 보이는 콘텐츠(#smooth)는
   보간된 값 cur 로 옮긴다. DOM 과 WebGL 이 같은 cur 를 쓰니 절대 어긋나지 않는다. */

export const math = {
  clamp: (v, a, b) => Math.max(a, Math.min(b, v)),
  saturate: v => Math.max(0, Math.min(1, v)),
  mix: (a, b, t) => a + (b - a) * t,
  unMix: (a, b, v) => (v - a) / (b - a),
  cUnMix: (a, b, v) => Math.max(0, Math.min(1, (v - a) / (b - a))),
  // 원본 math.fit(v, from0, from1, to0, to1, ease)
  fit(v, a, b, c, d, ease) { let t = this.cUnMix(a, b, v); if (ease) t = ease(t); return c + t * (d - c); },
  unClampedFit(v, a, b, c, d) { return c + this.unMix(a, b, v) * (d - c); },
  // 1차원 베지어 (셰이더의 cubicBezier 와 같은 식)
  cubicBezier(p0, p1, p2, p3, t) {
    const c = (p1 - p0) * 3, b = (p2 - p1) * 3 - c, a = p3 - p0 - c - b;
    return a * t * t * t + b * t * t + c * t + p0;
  },
};

/* CSS cubic-bezier(x1,y1,x2,y2) 풀이 — ease.lusion = (.35, 0, 0, 1) */
function cssBezier(x1, y1, x2, y2) {
  const bx = t => 3 * x1 * t * (1 - t) ** 2 + 3 * x2 * t * t * (1 - t) + t ** 3;
  const by = t => 3 * y1 * t * (1 - t) ** 2 + 3 * y2 * t * t * (1 - t) + t ** 3;
  return x => {
    if (x <= 0) return 0; if (x >= 1) return 1;
    let lo = 0, hi = 1, t = x;
    for (let i = 0; i < 24; i++) { t = (lo + hi) / 2; bx(t) < x ? (lo = t) : (hi = t); }
    return by(t);
  };
}
export const ease = {
  lusion: cssBezier(.35, 0, 0, 1),
  backOut: t => { const s = 1.70158; t -= 1; return t * t * ((s + 1) * t + s) + 1; },
  cubicInOut: t => t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2,
};

const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
const coarse = matchMedia("(pointer: coarse)").matches;

export const scroll = {
  cur: 0, target: 0, prev: 0, delta: 0, vel: 0,
  vw: innerWidth, vh: innerHeight,
  content: null,
  ranges: new Map(),

  init(content) {
    this.content = content;
    this.target = this.cur = this.prev = window.scrollY;
    addEventListener("scroll", () => { this.target = window.scrollY; }, { passive: true });
    new ResizeObserver(() => this.resize()).observe(content);
    this.resize();
  },

  resize() {
    this.vw = innerWidth; this.vh = innerHeight;
    document.body.style.height = this.content.scrollHeight + "px";
    this.ranges.forEach(r => (r.dirty = true));
  },

  update(dt) {
    this.target = window.scrollY;
    const k = reduced || coarse ? 1 : 1 - Math.exp(-dt * 9);
    this.cur += (this.target - this.cur) * k;
    if (Math.abs(this.target - this.cur) < 0.05) this.cur = this.target;
    this.delta = this.cur - this.prev;
    this.vel = dt > 0 ? this.delta / dt : 0;
    this.prev = this.cur;
    this.content.style.transform = `translate3d(0, ${-this.cur}px, 0)`;
  },

  to(el) {
    const r = this.range(el, true);
    window.scrollTo({ top: r.top, behavior: "instant" in window ? "instant" : "auto" });
  },

  /* 원본 ScrollDomRange 와 같은 값을 돌려준다. 위치는 문서 기준으로 한 번 재 두고 재사용. */
  range(el, force = false) {
    let r = this.ranges.get(el);
    if (!r) this.ranges.set(el, (r = { dirty: true }));
    if (r.dirty || force) {
      const b = el.getBoundingClientRect();
      r.left = b.left; r.width = b.width; r.height = b.height;
      r.top = b.top + this.cur;          // #smooth 가 -cur 만큼 밀려 있으니 되돌린다
      r.dirty = false;
    }
    const vh = this.vh, a = r.top - this.cur, l = r.height;
    r.screenY = a;
    r.ratio = Math.min(0, math.unClampedFit(a, vh, vh - l, -1, 0)) + Math.max(0, math.unClampedFit(a, 0, -l, 0, 1));
    r.screenRatio = math.fit(a, vh, -l, -1, 1);
    r.showScreenOffset = -(a - vh) / vh;
    r.hideScreenOffset = -(a + l) / vh;
    r.isActive = r.ratio >= -1 && r.ratio <= 1;
    return r;
  },

  /* 원본 scrollManager.getEaseInOutOffset — 끈적하게 따라붙었다(ease-in) 머물고(1) 떨어지는(ease-out) 오프셋 */
  getEaseInOutOffset(e, t, r = 0, n = 0.5) {
    const a = 1.5 + n, l = (a - 1) * 2 + r, c = 0, u = a, f = u + r, p = f + a;
    const g = t * p / l, v = e + g * 0.5 - t * 0.5, _ = Math.min(1, v / g);
    if (_ > 0) {
      const M = _ * p;
      let T = M;
      if (M > c && M <= u) T = math.cubicBezier(c, (u - c) / 3 + c, 1, 1, (M - c) / (u - c));
      else if (M > u && M <= f) T = 1;
      else if (M > f && M <= p) T = math.cubicBezier(1, 1, -(p - f) / 3 + 2, 2, (M - f) / (p - f));
      else if (M > p) T = M - l;
      return (M - T) / l * t;
    }
    return 0;
  },
};
