"""릴 영상 합성 도구 — numpy 로 프레임을 만들고 ffmpeg 로 굽는다.

프레임은 float32 (H, W, 3), 0~1. 마지막에 uint8 로 바꿔 ffmpeg 에 흘린다.
"""
import subprocess, math, os, glob
from functools import lru_cache
from pathlib import Path
import numpy as np
from PIL import Image, ImageOps, ImageFilter, ImageDraw, ImageFont
import imageio_ffmpeg

W, H, FPS = 1600, 900, 30
FF = imageio_ffmpeg.get_ffmpeg_exe()
LAB = Path(__file__).resolve().parent
CAP = LAB.parents[1]                     # 캡스톤/
OUT = LAB / "out"; OUT.mkdir(exist_ok=True)
FONTS = "C:/Windows/Fonts/"

# ── 소재 경로 (전부 우리 작업) ─────────────────────────
SRC = {
    "grid_a": CAP / "4주차/KakaoTalk_20260921_014830995.jpg",
    "grid_b": CAP / "4주차/KakaoTalk_20260921_014830995_01.jpg",
    "sensor": CAP / "4주차/KakaoTalk_20260921_014830995_02.png",
    "grid_c": CAP / "4주차/KakaoTalk_20260921_014830995_03.jpg",
    "tablet": CAP / "4주차/KakaoTalk_20260921_014830995_04.jpg",
    "floor":  CAP / "4주차/인터렉션테스트.jpg",
    "flower": CAP / "Blender/render/flower.png",
    "flower3": CAP / "Blender/render/flower3.png",
    "night_open": CAP / "Blender/preview/night_bloom_open.png",
    "night_mid": CAP / "Blender/preview/night_bloom_mid.png",
    "night_bud": CAP / "Blender/preview/night_bloom_bud.png",
    "crystal": CAP / "Blender/preview/crystal_bloom_open.png",
    "keyvis": CAP / "lucid-vivarium-hero/assets/bg/bg.png",
    "v1": CAP / "Blender/render/v1_60fps.mp4",
    "ai": CAP / "녹화/lucid_ai_demo.mp4",
}
WIDE = sorted(glob.glob(str(CAP / "Blender/preview/wide/wide_*.png")))

# ── 기본 수학 ───────────────────────────────────────
def clamp01(x): return min(1.0, max(0.0, x))
def fit(v, a, b, c=0.0, d=1.0, ease=None):
    t = clamp01((v - a) / (b - a)) if b != a else float(v >= b)
    if ease: t = ease(t)
    return c + (d - c) * t
def smooth(t): return t * t * (3 - 2 * t)
def smoother(t): return t * t * t * (t * (t * 6 - 15) + 10)
def expo_out(t): return 1 - 2 ** (-10 * t) if t < 1 else 1.0
def mix(a, b, t): return a + (b - a) * t

# ── 이미지 불러오기 ─────────────────────────────────
@lru_cache(maxsize=64)
def _pil(path, max_side=3200):
    im = ImageOps.exif_transpose(Image.open(path)).convert("RGB")
    if max(im.size) > max_side:
        im.thumbnail((max_side, max_side), Image.LANCZOS)
    return im

def cover(im, w, h, cx=0.5, cy=0.5):
    """PIL 이미지를 w×h 로 꽉 채워 자른다 (cx, cy = 자를 중심)."""
    s = max(w / im.width, h / im.height)
    nw, nh = math.ceil(im.width * s), math.ceil(im.height * s)
    r = im.resize((nw, nh), Image.LANCZOS)
    x = int((nw - w) * cx); y = int((nh - h) * cy)
    return r.crop((x, y, x + w, y + h))

class Still:
    """켄 번스용 스틸. zoom(≥1) 과 pan(-1..1) 로 프레임을 뽑는다."""
    def __init__(self, key_or_path, margin=1.35, cx=0.5, cy=0.5, w=W, h=H):
        path = SRC.get(key_or_path, key_or_path)
        self.w, self.h = w, h
        self.base = cover(_pil(str(path)), int(w * margin), int(h * margin), cx, cy)
        self.m = margin
    def frame(self, zoom=1.0, px=0.0, py=0.0, rot=0.0):
        bw, bh = self.base.size
        cw, ch = bw / zoom, bh / zoom
        cw, ch = max(cw, self.w * 0.3), max(ch, self.h * 0.3)
        mx, my = (bw - cw) / 2, (bh - ch) / 2
        x0 = bw / 2 - cw / 2 + px * mx; y0 = bh / 2 - ch / 2 + py * my
        im = self.base
        if rot:
            im = im.rotate(rot, resample=Image.BICUBIC, center=(bw / 2, bh / 2))
        im = im.resize((self.w, self.h), Image.BILINEAR, box=(x0, y0, x0 + cw, y0 + ch))
        return np.asarray(im, np.float32) / 255.0

def arr(im): return np.asarray(im, np.float32) / 255.0

# ── 영상 읽기 ──────────────────────────────────────
def read_video(path, start=0.0, dur=None, w=W, h=H, fps=FPS, crop=None, speed=1.0, fit_mode="cover"):
    """구간을 w×h float 프레임 리스트로. crop=(x,y,cw,ch) 는 원본 픽셀 기준 먼저 자르기."""
    vf = []
    if crop: vf.append("crop=%d:%d:%d:%d" % (crop[2], crop[3], crop[0], crop[1]))
    if speed != 1.0: vf.append("setpts=PTS/%f" % speed)
    vf.append("fps=%d" % fps)
    if fit_mode == "cover":
        vf.append(f"scale={w}:{h}:force_original_aspect_ratio=increase:flags=lanczos,crop={w}:{h}")
    else:
        vf.append(f"scale={w}:{h}:force_original_aspect_ratio=decrease:flags=lanczos,pad={w}:{h}:(ow-iw)/2:(oh-ih)/2")
    cmd = [FF, "-v", "error", "-ss", str(start), "-i", str(SRC.get(path, path))]
    if dur: cmd += ["-t", str(dur / speed if speed else dur)]
    cmd += ["-vf", ",".join(vf), "-f", "rawvideo", "-pix_fmt", "rgb24", "-"]
    raw = subprocess.run(cmd, capture_output=True, check=True).stdout
    n = len(raw) // (w * h * 3)
    return [np.frombuffer(raw, np.uint8, w * h * 3, i * w * h * 3).reshape(h, w, 3) for i in range(n)]

class Seq:
    """PNG 시퀀스 (와이드 개화 렌더). 소수 인덱스는 두 프레임을 섞어 슬로모션."""
    def __init__(self, files, w=W, h=H):
        self.files, self.w, self.h = files, w, h
        self.cache = {}
    def _get(self, i):
        i = max(0, min(len(self.files) - 1, i))
        if i not in self.cache:
            if len(self.cache) > 12: self.cache.pop(next(iter(self.cache)))
            im = Image.open(self.files[i]).convert("RGB")
            if im.size != (self.w, self.h): im = cover(im, self.w, self.h)
            self.cache[i] = arr(im)
        return self.cache[i]
    def __len__(self): return len(self.files)
    def at(self, f):
        i = int(math.floor(f)); t = f - i
        a = self._get(i)
        return a if t < 1e-3 else a * (1 - t) + self._get(i + 1) * t

# ── 효과 ───────────────────────────────────────────
def blur(a, r):
    if r <= 0: return a
    if a.ndim == 3 and a.shape[2] == 1:
        return blur(a[..., 0], r)[..., None]
    small_w, small_h = max(8, a.shape[1] // 4), max(8, a.shape[0] // 4)
    im = Image.fromarray((np.clip(a, 0, 1) * 255).astype(np.uint8)).resize((small_w, small_h), Image.BILINEAR)
    im = im.filter(ImageFilter.GaussianBlur(r / 4)).resize((a.shape[1], a.shape[0]), Image.BILINEAR)
    return np.asarray(im, np.float32) / 255.0

def glow(a, r=30, strength=0.8, thr=0.55):
    hi = np.clip((a - thr) / (1 - thr), 0, 1)
    g = blur(hi, r) * strength
    return 1 - (1 - a) * (1 - np.clip(g, 0, 1))          # screen

def chroma(a, k):
    k = int(round(k))
    if k == 0: return a
    out = a.copy()
    out[..., 0] = np.roll(a[..., 0], k, axis=1)
    out[..., 2] = np.roll(a[..., 2], -k, axis=1)
    return out

_rng = np.random.default_rng(7)
_GRAIN = [_rng.standard_normal((H, W, 1)).astype(np.float32) for _ in range(6)]
def grain(a, amt, i):
    # 그레인은 압축을 크게 방해한다 (16초 9MB → 절반으로 줄여 4MB 대)
    return a + _GRAIN[i % len(_GRAIN)] * amt * 0.45

_yy, _xx = np.mgrid[0:H, 0:W].astype(np.float32)
_R = np.sqrt(((_xx - W / 2) / (W / 2)) ** 2 + ((_yy - H / 2) / (H / 2)) ** 2)
def vignette(a, s=0.45):
    return a * (1 - s * np.clip(_R - 0.35, 0, 1) ** 1.5)[..., None]

def luma(a): return (a @ np.array([0.299, 0.587, 0.114], np.float32))[..., None]

def grade(a, shadow, high, amount=1.0):
    """밝기로 두 색 사이를 보간해 곱한다 (split tone)."""
    l = luma(a)
    tint = np.array(shadow, np.float32) * (1 - l) + np.array(high, np.float32) * l
    return mix(a, a * tint * 1.6, amount)

def contrast(a, c=1.2, pivot=0.45): return (a - pivot) * c + pivot
def desat(a, s): return mix(a, np.repeat(luma(a), 3, axis=2), s)

def zoom(a, z, cx=0.5, cy=0.5):
    """중심 확대 (z>1)."""
    if abs(z - 1) < 1e-3: return a
    h, w = a.shape[:2]
    cw, ch = w / z, h / z
    x0, y0 = cx * w - cw / 2, cy * h - ch / 2
    im = Image.fromarray((np.clip(a, 0, 1) * 255).astype(np.uint8))
    return arr(im.resize((w, h), Image.BILINEAR, box=(x0, y0, x0 + cw, y0 + ch)))

def motion_blur(a, dx, dy=0, n=8):
    if abs(dx) + abs(dy) < 1: return a
    acc = np.zeros_like(a)
    for i in range(n):
        t = i / (n - 1) - 0.5
        acc += np.roll(np.roll(a, int(dx * t), axis=1), int(dy * t), axis=0)
    return acc / n

def ripple(a, amp, freq=0.018, phase=0.0, cx=W / 2, cy=H / 2):
    """물결 왜곡 — 중심에서 퍼지는 동심원 변위."""
    if amp < 0.3: return a
    d = np.sqrt((_xx - cx) ** 2 + (_yy - cy) ** 2) + 1e-3
    off = np.sin(d * freq - phase) * amp
    sx = np.clip(_xx + (_xx - cx) / d * off, 0, W - 1).astype(np.int32)
    sy = np.clip(_yy + (_yy - cy) / d * off, 0, H - 1).astype(np.int32)
    return a[sy, sx]

def block_glitch(a, strength, seed):
    """블록을 가로로 밀어 데이터모시 흉내."""
    if strength <= 0: return a
    r = np.random.default_rng(seed)
    out = a.copy()
    for _ in range(int(6 + 18 * strength)):
        y = r.integers(0, H - 20); h = int(r.integers(6, 60 + 120 * strength))
        s = int(r.normal(0, 90 * strength))
        out[y:y + h] = np.roll(out[y:y + h], s, axis=1)
    return out

_BAYER = np.array([[0, 8, 2, 10], [12, 4, 14, 6], [3, 11, 1, 9], [15, 7, 13, 5]], np.float32) / 16
_BAYER_T = np.tile(_BAYER, (H // 4 + 1, W // 4 + 1))[:H, :W][..., None]
def dither(a, levels=2, scale=1):
    l = luma(a)
    if scale > 1:
        l = np.repeat(np.repeat(l[::scale, ::scale], scale, 0), scale, 1)[:H, :W]
    return np.floor(l * (levels - 1) + _BAYER_T) / (levels - 1)

def scanlines(a, strength=0.12, period=3):
    m = (np.arange(H) % period == 0).astype(np.float32)[:, None, None]
    return a * (1 - strength * m)

def duotone(a, dark, light):
    l = np.clip(luma(a), 0, 1)
    return np.array(dark, np.float32) * (1 - l) + np.array(light, np.float32) * l

def over(base, layer, alpha):
    """alpha: 스칼라 또는 (H,W,1)"""
    return base * (1 - alpha) + layer * alpha

def screen(a, b): return 1 - (1 - a) * (1 - b)

def place(canvas, img, x, y):
    """img 를 canvas 의 (x,y) 에 붙인다 (잘림 처리)."""
    h, w = img.shape[:2]
    x0, y0 = max(0, x), max(0, y); x1, y1 = min(W, x + w), min(H, y + h)
    if x1 <= x0 or y1 <= y0: return canvas
    canvas[y0:y1, x0:x1] = img[y0 - y:y1 - y, x0 - x:x1 - x]
    return canvas

def resize(a, w, h):
    return arr(Image.fromarray((np.clip(a, 0, 1) * 255).astype(np.uint8)).resize((w, h), Image.BILINEAR))

# ── 글자 ───────────────────────────────────────────
@lru_cache(maxsize=32)
def font(name, size): return ImageFont.truetype(FONTS + name, size)

def text_mask(txt, fname, size, x=None, y=None, anchor="mm", tracking=0, w=W, h=H):
    """글자 모양 알파 (H,W,1). x,y 없으면 화면 가운데."""
    im = Image.new("L", (w, h), 0)
    d = ImageDraw.Draw(im)
    f = font(fname, size)
    x = w / 2 if x is None else x; y = h / 2 if y is None else y
    if tracking:
        widths = [d.textlength(c, font=f) + tracking for c in txt]
        total = sum(widths) - tracking
        sx = x - total / 2 if anchor[0] == "m" else (x - total if anchor[0] == "r" else x)
        for c, cw in zip(txt, widths):
            d.text((sx, y), c, font=f, fill=255, anchor="l" + anchor[1]); sx += cw
    else:
        d.text((x, y), txt, font=f, fill=255, anchor=anchor)
    return np.asarray(im, np.float32)[..., None] / 255.0

@lru_cache(maxsize=256)
def cached_text(txt, fname, size, x, y, anchor="mm", tracking=0):
    return text_mask(txt, fname, size, x, y, anchor, tracking)

# ── 입자 (루프에 맞춰 주기적으로 움직인다) ───────────────
class Particles:
    def __init__(self, n, seed=1, period=16.0):
        r = np.random.default_rng(seed)
        self.n, self.T = n, period
        self.x0 = r.random(n).astype(np.float32); self.y0 = r.random(n).astype(np.float32)
        self.vy = (0.6 + r.random(n) * 1.4).astype(np.float32)        # 한 주기에 화면을 몇 번 오르나 (정수여야 루프)
        self.vy = np.round(self.vy).astype(np.float32); self.vy[self.vy == 0] = 1
        self.sway = (r.random(n) * 0.02).astype(np.float32); self.ph = (r.random(n) * 6.28).astype(np.float32)
        self.size = (r.random(n) ** 3 * 2.5 + 0.6).astype(np.float32)
        self.bright = (0.3 + r.random(n) * 0.7).astype(np.float32)
        self.tw = r.integers(1, 4, n).astype(np.float32)                  # 반짝임 주기 (정수 → 루프)

    def positions(self, t):
        p = t / self.T
        y = (self.y0 - p * self.vy) % 1.0
        x = (self.x0 + np.sin(p * 6.2832 * 2 + self.ph) * self.sway) % 1.0
        return x, y

    def render(self, t, color=(1, 1, 1), scale=1.0, alpha=1.0, orbit=None):
        """additive 로 찍고 번지게. orbit=(cx,cy,strength) 면 중심을 돈다."""
        x, y = self.positions(t)
        if orbit:
            cx, cy, s = orbit
            ang = (t / self.T) * 6.2832 * self.vy * 0.5 + self.ph
            rad = (0.12 + self.x0 * 0.35)
            ox = cx + np.cos(ang) * rad * (H / W); oy = cy + np.sin(ang) * rad * 0.55
            x = mix(x, ox, s); y = mix(y, oy, s)
        sw, sh = W // 2, H // 2
        buf = np.zeros((sh, sw), np.float32)
        ix = np.clip((x * sw).astype(np.int32), 0, sw - 1); iy = np.clip((y * sh).astype(np.int32), 0, sh - 1)
        tw = 0.55 + 0.45 * np.sin((t / self.T) * 6.2832 * self.tw * 3 + self.ph)
        np.add.at(buf, (iy, ix), self.bright * tw * self.size * scale)
        core = Image.fromarray(np.clip(buf * 255, 0, 255).astype(np.uint8))
        a = np.asarray(core.filter(ImageFilter.GaussianBlur(1.2)).resize((W, H), Image.BILINEAR), np.float32) / 255
        g = np.asarray(core.filter(ImageFilter.GaussianBlur(6)).resize((W, H), Image.BILINEAR), np.float32) / 255
        m = np.clip(a * 3 + g * 5, 0, 1.5)[..., None] * alpha
        return m * np.array(color, np.float32)

# ── 굽기 ───────────────────────────────────────────
class Writer:
    def __init__(self, name, crf=27):
        self.path = OUT / f"{name}.mp4"
        self.p = subprocess.Popen([FF, "-y", "-v", "error", "-f", "rawvideo", "-pix_fmt", "rgb24", "-s", f"{W}x{H}",
                                   "-r", str(FPS), "-i", "-", "-an", "-c:v", "libx264", "-preset", "slow", "-crf", str(crf),
                                   "-pix_fmt", "yuv420p", "-movflags", "+faststart", str(self.path)], stdin=subprocess.PIPE)
        self.name = name
    def write(self, a):
        self.p.stdin.write((np.clip(a, 0, 1) * 255 + 0.5).astype(np.uint8).tobytes())
    def close(self):
        self.p.stdin.close(); self.p.wait()
        subprocess.run([FF, "-y", "-v", "error", "-ss", "8", "-i", str(self.path), "-frames:v", "1", "-q:v", "3",
                        str(OUT / f"{self.name}_poster.jpg")], check=True)
        print("DONE", self.path, self.path.stat().st_size // 1024, "KB")

def render(name, frame_fn, seconds=16.0, loop_tail=12, crf=27):
    """frame_fn(t, i) → float 프레임. 마지막 loop_tail 프레임은 첫 프레임으로 녹아든다."""
    n = int(seconds * FPS)
    wr = Writer(name, crf)
    first = None
    for i in range(n):
        t = i / FPS
        f = frame_fn(t, i)
        if i == 0: first = f.copy()
        k = i - (n - loop_tail)
        if k >= 0 and first is not None:
            f = mix(f, first, smooth((k + 1) / (loop_tail + 1)))
        wr.write(f)
        if i % 60 == 0: print(name, f"{i}/{n}", flush=True)
    wr.close()
