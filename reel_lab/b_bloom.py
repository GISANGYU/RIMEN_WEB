"""B안 — BLOOM · 자각몽 롱테이크 (컷 없음, 물결 디졸브, 발광 입자)"""
from kit import *
from kit import _xx, _yy

TEAL, LILAC = (0.36, 0.56, 0.78), (1.0, 0.9, 1.06)

print("loading…", flush=True)
key = Still("keyvis", margin=1.3)
floor = Still("floor", margin=1.3, cy=0.55)
wide = Seq(WIDE)
motes = Particles(1100, seed=3)
dust = Particles(500, seed=9)
line = text_mask("you are dreaming.", "georgiai.ttf", 38, W / 2, 712, tracking=3)

def leak(t, i):
    """화면을 가로지르는 보랏빛·금빛 빛 번짐 (주기 16초)"""
    p = (t / 16.0) % 1.0
    cx = mix(-0.3, 1.3, p) * W; cy = H * (0.35 + 0.15 * math.sin(p * 6.28))
    d = np.sqrt(((_xx - cx) / (W * 0.45)) ** 2 + ((_yy - cy) / (H * 0.6)) ** 2)
    g = np.exp(-d * d * 2.2)[..., None]
    return g * np.array((0.55, 0.32, 0.75), np.float32) * 0.35

def bloom_at(t):
    # 3.5초부터 12초까지 150프레임 → 0.59배속 슬로모션 (두 프레임 블렌딩)
    return wide.at(fit(t, 3.5, 12.4, 0, len(wide) - 1))

def frame(t, i):
    # 층 1: 키비주얼 (느린 푸시인)
    if t < 5.2 or t >= 14.0:
        tk = t if t < 5.2 else t - 16.0                       # 루프 끝에서는 음수 시간 → 시작 위치로 돌아옴
        k = key.frame(1.0 + 0.09 * smooth(fit(tk, -2, 5.2)), px=0.15 * fit(tk, -2, 5.2), py=-0.1)
    # 층 2: 개화
    if 3.4 <= t < 13.4:
        b = bloom_at(t)
    # 층 3: 바닥 인터랙션
    if t >= 12.0:
        fl = floor.frame(1.02 + 0.12 * fit(t, 12, 15.5), px=-0.2 * fit(t, 12, 15.5), py=0.1)
        fl = contrast(fl * 0.62, 1.15, .3)            # 밝은 스튜디오 사진을 밤 톤으로 내린다

    if t < 3.5:
        a = k
    elif t < 5.2:                                            # 물결 디졸브 → 봉오리
        u = smooth(fit(t, 3.5, 5.2))
        amp = math.sin(u * math.pi) * 22
        a = mix(ripple(k, amp, 0.02, t * 5), ripple(b, amp, 0.02, t * 5), u)
    elif t < 12.0:
        a = b
    elif t < 13.4:                                           # 물결 디졸브 → 바닥 꽃
        u = smooth(fit(t, 12.0, 13.4))
        amp = math.sin(u * math.pi) * 22
        a = mix(ripple(b, amp, 0.02, t * 5), ripple(fl, amp, 0.02, t * 5), u)
    elif t < 14.0:
        a = fl
    else:                                                    # 흰 빛으로 번지며 키비주얼로
        u = smooth(fit(t, 14.0, 15.6))
        a = mix(fl, k, u)
        a = a + (math.sin(u * math.pi) ** 2) * 0.28

    # 빛: 맥동하는 블룸
    pulse = 0.38 + 0.16 * math.sin(t * 6.2832 / 4)
    a = glow(a * 0.92, 46, pulse, 0.66)
    a = grade(a, TEAL, LILAC, 0.55)

    # 입자: 평소엔 떠오르고, 개화 동안엔 꽃 둘레를 돈다
    orbit = fit(t, 5.0, 7.5) * (1 - fit(t, 11.0, 13.0))
    a = a + motes.render(t, (1.0, 0.92, 0.85), 1.0, 0.9, orbit=(0.5, 0.5, orbit * 0.65))
    a = a + dust.render(t, (0.6, 0.7, 1.0), 0.6, 0.5)
    a = screen(a, leak(t, i))

    # 한 줄: 개화가 절정일 때만
    la = fit(t, 7.0, 8.5) * (1 - fit(t, 11.0, 12.0))
    if la > 0: a = over(a, np.ones_like(a) * 0.95, line * la * 0.8)

    a = chroma(a, 2)
    a = vignette(a, .55)
    return grain(a, .022, i)

if __name__ == "__main__":
    render("reel_B_bloom", frame, loop_tail=14)
