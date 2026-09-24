/* 환경음 — 파일 없이 WebAudio 로 합성하는 낮은 드론 + 바람.
   챕터가 바뀔 때마다 화음이 한 칸씩 올라가 "깨어나는" 방향으로 간다. */
const ROOTS = [55, 55, 61.74, 65.41, 73.42, 82.41];   // A1 → E2

export class Drone {
  constructor() { this.on = false; this.ctx = null; this.chapter = 0; }

  init() {
    const ctx = this.ctx = new (window.AudioContext || window.webkitAudioContext)();
    this.master = ctx.createGain(); this.master.gain.value = 0; this.master.connect(ctx.destination);
    this.filter = ctx.createBiquadFilter(); this.filter.type = "lowpass"; this.filter.frequency.value = 420; this.filter.Q.value = .7;
    this.filter.connect(this.master);
    // 느린 필터 흔들림
    const lfo = ctx.createOscillator(), lfoG = ctx.createGain(); lfo.frequency.value = .07; lfoG.gain.value = 160;
    lfo.connect(lfoG).connect(this.filter.frequency); lfo.start();
    // 세 겹 톱니파 (근음 · 5도 · 옥타브, 살짝 어긋나게)
    this.oscs = [1, 1.5, 2].map((m, i) => {
      const o = ctx.createOscillator(), g = ctx.createGain();
      o.type = "sawtooth"; o.frequency.value = ROOTS[0] * m; o.detune.value = (i - 1) * 7;
      g.gain.value = [.3, .16, .1][i]; o.connect(g).connect(this.filter); o.start();
      return { o, m };
    });
    // 바람: 걸러낸 잡음
    const len = ctx.sampleRate * 2, buf = ctx.createBuffer(1, len, ctx.sampleRate), d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    const n = ctx.createBufferSource(); n.buffer = buf; n.loop = true;
    const bp = ctx.createBiquadFilter(); bp.type = "bandpass"; bp.frequency.value = 700; bp.Q.value = .5;
    const ng = ctx.createGain(); ng.gain.value = .05;
    n.connect(bp).connect(ng).connect(this.master); n.start();
  }

  toggle() {
    if (!this.ctx) this.init();
    this.on = !this.on;
    this.ctx.resume();
    this.master.gain.setTargetAtTime(this.on ? .07 : 0, this.ctx.currentTime, .6);
    return this.on;
  }

  setChapter(i) {
    this.chapter = i;
    if (!this.ctx) return;
    const f = ROOTS[Math.min(i, ROOTS.length - 1)];
    this.oscs.forEach(({ o, m }) => o.frequency.setTargetAtTime(f * m, this.ctx.currentTime, 1.2));
    this.filter.frequency.setTargetAtTime(380 + i * 90, this.ctx.currentTime, 1.5);
  }
}
