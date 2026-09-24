"""C안 — SIGNAL · 관측 로그 (흑백 + 사이트 블루, 그리드 HUD, 추적, 글리치)"""
from kit import *

BLUE = np.array((0.10, 0.18, 0.98), np.float32)   # #1a2ffb
INK = np.array((0.015, 0.016, 0.03), np.float32)
AI_GEN = (852, 0, 426, 380); AI_SIL = (426, 0, 426, 380)

PAD, GAP = 80, 32
COLW = (W - PAD * 2 - GAP * 11) / 12
XS = [PAD + k * (COLW + GAP) for k in range(12)] + [W - PAD]
Y0, YM, Y1 = 162, 450, 738                       # 세이프존 위·가운데·아래
CW, CH = 708, 268                                # 2×2 칸
CELLS = [(80, 170), (80 + CW + 24, 170), (80, 170 + CH + 24), (80 + CW + 24, 170 + CH + 24)]

print("loading…", flush=True)
cam_grid = Still("grid_a", w=CW, h=CH, margin=1.4)
cam_sensor = Still("sensor", w=CW, h=CH, margin=1.3, cx=.45)
sil = read_video("ai", 20, 4.8, w=CW, h=CH, crop=AI_SIL, fit_mode="contain")
wide = Seq(WIDE)
floor = Still("floor", margin=1.25)
gen = read_video("ai", 60, 2.6, crop=AI_GEN)

# 바닥 사진 속 사람 (원본 비율 좌표) — 인터렉션테스트.jpg
PERSON = (0.448, 0.555); PBOX = (0.07, 0.43)
def floor_to_screen(ix, iy, zoom, px, py):
    """Still.frame 과 같은 계산으로 원본 좌표 → 화면 좌표"""
    bw, bh = floor.base.size
    im = _pil_floor
    s = max(bw / im.width, bh / im.height)
    nw = math.ceil(im.width * s); nh = math.ceil(im.height * s)
    bx = ix * nw - (nw - bw) * 0.5; by = iy * nh - (nh - bh) * 0.5
    cw, ch = bw / zoom, bh / zoom
    x0 = bw / 2 - cw / 2 + px * (bw - cw) / 2; y0 = bh / 2 - ch / 2 + py * (bh - ch) / 2
    return (bx - x0) / cw * W, (by - y0) / ch * H
from kit import _pil
_pil_floor = _pil(str(SRC["floor"]))

# 흔적: 오른쪽 아래에서 사람 발밑까지 굽은 길 (이번 관객) + 옛 관객의 흐린 길
def path_pts(n, a, b, bend, seed):
    r = np.random.default_rng(seed)
    t = np.linspace(0, 1, n)
    x = a[0] + (b[0] - a[0]) * t + np.sin(t * math.pi) * bend[0]
    y = a[1] + (b[1] - a[1]) * t + np.sin(t * math.pi) * bend[1]
    return np.stack([x + r.normal(0, .004, n), y + r.normal(0, .004, n)], 1)
TRACE = path_pts(46, (0.86, 0.97), (PERSON[0] + .005, PERSON[1] + .185), (-.05, -.12), 1)
OLD = [path_pts(38, (0.05, 0.95), (0.7, 0.72), (.1, -.15), 2), path_pts(30, (0.95, 0.75), (0.2, 0.8), (0, .1), 3)]

def mono(a, c=1.4): return contrast(desat(a, 1), c, .42)

def cell_img(k, t, u):
    if k == 0: a = mono(cam_grid.frame(1.0 + .25 * u, px=mix(-.6, .6, u)))
    elif k == 1:
        f = sil[min(len(sil) - 1, int(u * (len(sil) - 1)))].astype(np.float32) / 255
        a = duotone(f, INK, BLUE * 0.5 + 0.5)
    elif k == 2: a = mono(cam_sensor.frame(1.05 + .2 * u, py=mix(.4, -.3, u)))
    else: a = mono(resize(wide.at(u * 80), CW, CH), 1.2)
    return a

LABELS = ["CAM 01 · MAPPING GRID", "CAM 02 · SILHOUETTE", "CAM 03 · SENSOR", "CAM 04 · BLOOM RENDER"]

def typed(s, t, t0, dur):
    n = int(fit(t, t0, t0 + dur, 0, len(s)))
    return s[:n] + ("_" if 0 < n < len(s) and int(t * 8) % 2 == 0 else "")

def hud_layers(t, i, grid_in, collapse):
    """흰 선·글자 알파, 파란 요소 알파를 PIL 로 그린다."""
    wl = Image.new("L", (W, H), 0); bl = Image.new("L", (W, H), 0)
    dw, db = ImageDraw.Draw(wl), ImageDraw.Draw(bl)
    fm = font("consolab.ttf", 20); fs = font("consolab.ttf", 16)
    # 세로 그리드 — 위에서 아래로 차례로 그려짐, 끝에서는 가운데로 접힘
    for k, x in enumerate(XS):
        g = fit(grid_in, k * .04, k * .04 + .5)
        if g <= 0: continue
        xx = mix(x, W / 2, collapse)
        dw.line([(xx, 0), (xx, H * g)], fill=int(46 * (1 - collapse * .7)), width=1)
    for y in (Y0, YM, Y1):
        g = fit(grid_in, .3, 1.0)
        if g > 0: dw.line([(W / 2 - W / 2 * g * (1 - collapse), y), (W / 2 + W / 2 * g * (1 - collapse), y)], fill=70, width=1)
    # 십자 마크 (사이트의 ✕ 장식과 같은 자리)
    if grid_in > .6:
        for x in XS[::3]:
            xx = mix(x, W / 2, collapse)
            for y in (Y0, Y1):
                dw.line([(xx - 7, y), (xx + 7, y)], fill=230, width=2); dw.line([(xx, y - 7), (xx, y + 7)], fill=230, width=2)
    # 글자
    dw.text((PAD, Y0 - 34), typed("LIMEN / R&D LOG 017", t, .6, .9), font=fm, fill=235)
    dw.text((W - PAD, Y0 - 34), typed("HORIZON STUDIO · WALL×3 + FLOOR×1", t, 1.0, 1.1), font=fs, fill=180, anchor="ra")
    dw.text((PAD, Y1 + 16), f"T+{t:05.2f}s   FRAME {i:04d}", font=fs, fill=170)
    dw.text((W - PAD, Y1 + 16), "WAKE INSIDE, THE DREAM", font=fs, fill=170, anchor="ra")
    if int(t * 2) % 2 == 0: db.ellipse([(W - PAD - 372, Y0 - 31), (W - PAD - 360, Y0 - 19)], fill=255)
    return np.asarray(wl, np.float32)[..., None] / 255, np.asarray(bl, np.float32)[..., None] / 255, (dw, db, wl, bl)

def brackets(d, x0, y0, x1, y1, L=18, w=3):
    for (x, y, sx, sy) in ((x0, y0, 1, 1), (x1, y0, -1, 1), (x0, y1, 1, -1), (x1, y1, -1, -1)):
        d.line([(x, y), (x + L * sx, y)], fill=255, width=w); d.line([(x, y), (x, y + L * sy)], fill=255, width=w)

def frame(t, i):
    a = np.zeros((H, W, 3), np.float32) + INK
    grid_in = fit(t, 0, 2.2)
    collapse = smooth(fit(t, 14.2, 15.7))
    extra_w = Image.new("L", (W, H), 0); extra_b = Image.new("L", (W, H), 0)
    ew, eb = ImageDraw.Draw(extra_w), ImageDraw.Draw(extra_b)
    fs = font("consolab.ttf", 16); fm = font("consolab.ttf", 20)

    # ── 2.5–7.0 멀티캠 ───────────────────────────
    if 2.5 <= t < 7.0:
        for k, (cx, cy) in enumerate(CELLS):
            t0 = 2.5 + k * .3
            if t < t0: continue
            u = fit(t, 2.5, 7.0)
            c = cell_img(k, t, u)
            if t - t0 < .13: c = block_glitch(np.pad(c, ((0, H - CH), (0, W - CW), (0, 0))), .6, i)[:CH, :CW] + .35
            a = place(a, c, cx, cy)
            ew.text((cx + 12, cy + 10), LABELS[k], font=fs, fill=235)
            eb.rectangle([(cx, cy), (cx + CW - 1, cy + CH - 1)], outline=255 if k == 1 else 0, width=2)
        # 스캔 바
        sx = PAD + ((t - 2.5) / 1.5 % 1) * (W - 2 * PAD)
        band = np.exp(-((_xx_ - sx) / 26) ** 2)[..., None]
        a = a + band * 0.18 * (luma(a) > .06)
        eb.line([(sx, 170), (sx, 730)], fill=200, width=2)
        if t > 6.8: a = block_glitch(a, fit(t, 6.8, 7.0), i)

    # ── 7.0–11.5 바닥: 디더 + 추적 + 흔적 ───────────
    elif 7.0 <= t < 11.8:
        u = fit(t, 7.0, 11.8)
        z = 1.0 + .22 * smooth(u); px, py = -.25 * smooth(u), .15 * smooth(u)
        f = floor.frame(z, px, py)
        d = dither(f, 2, 2)
        m = mono(f, 1.3)
        a = duotone(mix(m, d, .55), INK, (0.86, 0.88, 1.0))
        # 옛 관객의 흐린 흔적
        for path in OLD:
            for (ix, iy) in path:
                x, y = floor_to_screen(ix, iy, z, px, py)
                ew.ellipse([(x - 3, y - 3), (x + 3, y + 3)], fill=110)
        # 이번 관객의 흔적 — 시간이 흐르며 한 점씩 쌓인다
        n = int(fit(u, .05, .8, 0, len(TRACE)))
        for j, (ix, iy) in enumerate(TRACE[:n]):
            x, y = floor_to_screen(ix, iy, z, px, py)
            r = 5 if j < n - 1 else 9
            eb.ellipse([(x - r, y - r), (x + r, y + r)], fill=255)
        # 추적 박스
        jx, jy = math.sin(t * 13) * .003, math.cos(t * 11) * .003
        x0, y0 = floor_to_screen(PERSON[0] - PBOX[0] / 2 + jx, PERSON[1] - PBOX[1] / 2 + jy, z, px, py)
        x1, y1 = floor_to_screen(PERSON[0] + PBOX[0] / 2 + jx, PERSON[1] + PBOX[1] / 2 + jy, z, px, py)
        if u > .08:
            brackets(eb, x0, y0, x1, y1)
            eb.text((x1 + 12, y0), "VISITOR 03", font=fm, fill=255)
            ew.text((x1 + 12, y0 + 28), f"X {PERSON[0] + jx * 7:.3f}", font=fs, fill=235)
            ew.text((x1 + 12, y0 + 48), f"Y {PERSON[1] + jy * 7:.3f}", font=fs, fill=235)
            ew.text((x1 + 12, y0 + 68), f"TRACE {n:02d} PT · KEEP 12:00", font=fs, fill=200)
        ew.text((PAD, Y0 + 14), "TOP-VIEW POSITION · FLOOR 01", font=fs, fill=235)
        if t > 11.5: a = block_glitch(chroma(a, 24 * fit(t, 11.5, 11.8)), fit(t, 11.5, 11.8) * 1.2, i)

    # ── 11.8–14.2 생성된 실 가닥 (블루 듀오톤) ──────
    elif 11.8 <= t < 14.4:
        u = fit(t, 11.8, 14.4)
        f = gen[min(len(gen) - 1, int(u * (len(gen) - 1)))].astype(np.float32) / 255
        f = zoom(f, 1.05 + .08 * u)
        a = duotone(contrast(f, 1.5, .3), INK, (0.62, 0.7, 1.0))
        a = glow(a, 24, .8, .55)
        if t < 12.0: a = block_glitch(chroma(a, 20), .9, i)
        a = a * (1 - fit(t, 14.0, 14.4))
        ew.text((PAD, Y0 + 14), "GENERATED · DAYDREAM CLOUD", font=fs, fill=235)

    # HUD 합성
    wl, bl, _ = hud_layers(t, i, grid_in, collapse)
    xw = np.asarray(extra_w, np.float32)[..., None] / 255; xb = np.asarray(extra_b, np.float32)[..., None] / 255
    a = over(a, np.ones_like(a), np.clip(wl + xw, 0, 1))
    a = over(a, np.broadcast_to(BLUE, a.shape), np.clip(bl + xb, 0, 1))
    # 접힐 때 가운데 파란 선 하나 남김
    if collapse > 0:
        cl = np.exp(-((_xx_ - W / 2) / 3) ** 2)[..., None] * collapse * (1 - fit(t, 15.6, 16))
        a = over(a, np.broadcast_to(BLUE, a.shape), cl)
    a = scanlines(a, .10, 3)
    return grain(a, .025, i)

from kit import _xx as _xx_
if __name__ == "__main__":
    render("reel_C_signal", frame, loop_tail=8)
