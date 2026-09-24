"""A안 — WAKE · 리듬 몽타주 (120BPM, 0.5초 비트 컷)"""
from kit import *

BEAT = 0.5
AI_GEN = (852, 0, 426, 380)     # 디퓨전 녹화의 세 번째 패널 (생성 결과), 라벨 줄 위까지
AI_SIL = (426, 0, 426, 380)     # 두 번째 패널 (실루엣 마스크)

def still(key, z0=1.0, z1=1.08, px=(0, 0), py=(0, 0), cx=0.5, cy=0.5, mono=False, label=""):
    s = Still(key, cx=cx, cy=cy)
    return dict(kind="still", s=s, z=(z0, z1), px=px, py=py, mono=mono, label=label)

def clip(frames, mono=False, label=""):
    return dict(kind="clip", f=frames, mono=mono, label=label)

print("loading…", flush=True)
v1 = read_video("v1", 0.6, 0.9, speed=0.6)
gen = read_video("ai", 40, 1.2, crop=AI_GEN)
sil = read_video("ai", 20, 1.0, crop=AI_SIL, fit_mode="contain")
gen2 = read_video("ai", 118, 1.0, crop=AI_GEN)
wide = Seq(WIDE)

SHOTS = [
    still("grid_a", 1.0, 1.10, px=(-.4, .3), label="HORIZON STUDIO · MAPPING GRID"),
    still("night_bud", 1.15, 1.0, mono=True, label="NIGHT BLOOM · BUD"),
    still("sensor", 1.0, 1.12, px=(.2, -.2), label="SENSOR VIEW"),
    clip(gen, label="AI DIFFUSION · GENERATED"),
    still("tablet", 1.1, 1.0, py=(.2, -.1), label="WARPING · CALIBRATION"),
    clip(v1, label="BLOOM V1"),
    still("grid_c", 1.0, 1.1, px=(.5, -.2), mono=True, label="BLENDING EDGE"),
    clip(sil, mono=True, label="SILHOUETTE INPUT"),
    still("floor", 1.05, 1.18, label="FLOOR INTERACTION"),
    still("crystal", 1.2, 1.0, label="CRYSTAL BLOOM"),
    still("grid_b", 1.0, 1.1, px=(-.3, .3), mono=True, label="CEILING RIG"),
    still("flower3", 1.0, 1.12, label="FLOWER STUDY"),
    still("keyvis", 1.1, 1.0, px=(.2, -.2), label="LIMEN · KEY VISUAL"),
    clip(gen2, label="AI DIFFUSION · GENERATED"),
    still("night_open", 1.0, 1.1, mono=True, label="NIGHT BLOOM · OPEN"),
    still("flower", 1.12, 1.0, label="BLOOM"),
]
WORDS = ["WAKE", "INSIDE", "THE", "DREAM"]

def shot_frame(sh, u, local_i):
    """u: 샷 안 진행도 0..1"""
    if sh["kind"] == "still":
        z = mix(*sh["z"], smooth(u)); px = mix(*sh["px"], u); py = mix(*sh["py"], u)
        a = sh["s"].frame(z, px, py)
    else:
        f = sh["f"]; a = f[min(len(f) - 1, local_i)].astype(np.float32) / 255
    if sh["mono"]:
        a = contrast(desat(a, 1.0), 1.45, 0.42)
    else:
        a = contrast(a, 1.12)
    return a

def hud(a, label, t, alpha=1.0):
    """세이프존(세로 가운데 64%) 안의 작은 라벨들"""
    m = cached_text(label, "consolab.ttf", 22, 110, 690, "ls", 2)
    tc = f"{int(t // 1):02d}:{int((t % 1) * 30):02d}"
    m2 = text_mask(tc, "consolab.ttf", 22, 1490, 690, "rs")
    m3 = cached_text("LIMEN", "seguibl.ttf", 26, 110, 212, "ls", 6)
    m4 = cached_text("WAKE INSIDE, THE DREAM", "consolab.ttf", 20, 1490, 212, "rs", 2)
    lab = np.clip(m + m2 + m3 + m4, 0, 1) * alpha
    return over(a, np.ones_like(a), lab)

def word_frame(word, u):
    """검정 위 한 단어 — 비트에 맞춰 1.18 → 1 로 떨어지며 색수차가 잦아든다"""
    s = mix(1.18, 1.0, expo_out(min(1, u * 2.2)))
    m = text_mask(word, "seguibl.ttf", int(250 * s), tracking=int(-6 * s))
    a = np.repeat(m, 3, axis=2)
    a = chroma(a, 14 * (1 - min(1, u * 3)))
    return a

def frame(t, i):
    # ── 0–2초: 단어 네 개 ────────────────────────
    if t < 2.0:
        k = int(t / BEAT); u = (t - k * BEAT) / BEAT
        a = word_frame(WORDS[k], u)
        # 다음 컷이 아주 옅게 비친다
        ghost = shot_frame(SHOTS[k * 3 % len(SHOTS)], u, 0) * 0.07
        a = screen(a, ghost)
        if u < 0.07: a = np.ones_like(a) * 0.85 + a * 0.15     # 첫 프레임 플래시
        return grain(vignette(a, .3), .03, i)

    # ── 2–10초: 16컷 몽타주 ──────────────────────
    if t < 10.0:
        k = int((t - 2.0) / BEAT); u = (t - 2.0 - k * BEAT) / BEAT
        li = int(u * BEAT * FPS)
        sh = SHOTS[k]
        a = shot_frame(sh, u, li)
        a = zoom(a, 1 + 0.09 * (1 - expo_out(min(1, u * 1.6))))         # 비트 줌 펀치
        # 4컷마다 휩팬: 컷 앞뒤 3프레임을 가로로 끈다
        if k % 4 == 3 and u > 0.8: a = motion_blur(a, 600 * fit(u, .8, 1), n=10)
        if k % 4 == 0 and k > 0 and u < 0.2: a = motion_blur(a, 600 * (1 - fit(u, 0, .2)), n=10)
        if k in (7, 15) and u > .88: a = np.ones_like(a)                # 스트로브
        a = chroma(a, 6 * (1 - min(1, u * 4)))
        a = hud(a, sh["label"], t)
        return grain(vignette(a, .35), .035, i)

    # ── 10–13초: 슬로모션 히어로 + 거대한 LIMEN ────
    if t < 13.0:
        u = (t - 10.0) / 3.0
        a = wide.at(55 + u * 94)
        a = glow(contrast(a, 1.1), 40, .7, .6)
        # 앞 45%: 글자 안에서만 보이다가 → 글자가 커지며 화면이 열린다
        s = 1.0 if u < .42 else 1 + (fit(u, .42, .8, ease=lambda x: x ** 3)) * 14
        m = text_mask("LIMEN", "seguibl.ttf", int(330 * s), tracking=int(10 * s))
        open_ = fit(u, .42, .72)
        mask = np.clip(m + open_, 0, 1)
        a = a * mask + (1 - mask) * 0.0
        outline = np.clip(m - blur(m, 3) * 0.9, 0, 1) * (1 - open_) * .6
        a = screen(a, np.repeat(outline, 3, axis=2))
        return grain(vignette(a, .3), .03, i)

    # ── 13–16초: 가속 스트로브 → 검정 ──────────────
    u = (t - 13.0)
    if u < 2.2:
        k = int(u / 0.25); v = (u - k * 0.25) / 0.25
        sh = SHOTS[(k * 5 + 2) % len(SHOTS)]
        a = shot_frame(sh, v, int(v * 7))
        a = zoom(a, 1.06 - .06 * v)
        if v > .8: a = np.ones_like(a) if k % 2 == 0 else a * 0.1
        a = chroma(a, 10)
        return grain(vignette(a, .35), .04, i)
    return grain(np.zeros((H, W, 3), np.float32), .03, i)

if __name__ == "__main__":
    render("reel_A_wake", frame, loop_tail=6)
