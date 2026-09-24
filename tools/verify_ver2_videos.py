"""ver2 WORK 영상이 '실제로 틀어지는지' 검증한다.

설치된 Chrome 을 헤드리스로 띄운다 (Playwright 기본 Chromium 은 H.264 를 못 튼다).
WORK 목록을 ↓ 키로 한 칸씩 넘기며 틀 안 <video> 의 currentTime 이 흐르는지 재고, 틀을 캡처한다.
이어서 작업 상세마다 오른쪽 패널의 영상도 같은 방식으로 잰다.

python tools/verify_ver2_videos.py [base_url]
"""
import sys, json, time
from pathlib import Path
from playwright.sync_api import sync_playwright

BASE = sys.argv[1] if len(sys.argv) > 1 else "http://127.0.0.1:5178/ver2/"
OUT = Path(__file__).resolve().parent / "verify_out"
OUT.mkdir(exist_ok=True)

MEASURE = """async (sel) => {
  const v = document.querySelector(sel); if (!v) return {err: 'no video'};
  // 재생 중이면 timeupdate 가 계속 온다 — 짧은 영상이 한 바퀴 돌아 시간이 줄어드는 것도 재생으로 친다
  let ticks = 0; const on = () => ticks++; v.addEventListener('timeupdate', on);
  const t0 = v.currentTime; await new Promise(r => setTimeout(r, 1500)); v.removeEventListener('timeupdate', on);
  return {ticks,src: v.currentSrc.split('/').pop(), ready: v.readyState, size: v.videoWidth + 'x' + v.videoHeight,
          paused: v.paused, t0: +t0.toFixed(2), t1: +v.currentTime.toFixed(2), err: v.error && v.error.code};
}"""

def main():
    rows, ok = [], True
    with sync_playwright() as p:
        b = p.chromium.launch(channel="chrome", headless=True, args=["--autoplay-policy=no-user-gesture-required"])
        pg = b.new_page(viewport={"width": 1600, "height": 900})
        errors = []
        pg.on("pageerror", lambda e: errors.append(str(e)))
        pg.goto(BASE + "#/work"); pg.wait_for_timeout(2500)
        n = pg.eval_on_selector_all(".work-item", "els => els.length")
        ids = pg.evaluate("() => import('./js/data.js').then(m => m.WORKS.map(w => w.id))")
        for i in range(n):
            pg.wait_for_timeout(2600)                      # 입자 응결 → 영상 재생
            r = pg.evaluate(MEASURE, ".work-frame video")
            r["title"] = pg.inner_text(".work-meta .t"); r["where"] = "WORK 틀"
            r["status"] = pg.inner_text(".work-desc .st")
            r["playing"] = (not r.get("paused")) and r.get("ticks", 0) >= 3 and r.get("t1") != r.get("t0")
            pg.locator(".work-frame").screenshot(path=str(OUT / f"work_{i:02d}.png"))
            rows.append(r); ok &= r["playing"]
            pg.keyboard.press("ArrowDown")
        for wid in ids:
            pg.goto(BASE + f"#/work/{wid}"); pg.wait_for_timeout(1800)
            r = pg.evaluate(MEASURE, ".proj-panel video")
            r["title"] = wid; r["where"] = "상세 패널"
            r["playing"] = (not r.get("paused")) and r.get("ticks", 0) >= 3 and r.get("t1") != r.get("t0")
            rows.append(r); ok &= r["playing"]
        pg.screenshot(path=str(OUT / "detail_last.png"))
        b.close()
    for r in rows:
        print(f"{'OK ' if r['playing'] else 'NG '} {r['where']:<6} {r['title']:<16} {r.get('src',''):<22} {r.get('size','')}  {r.get('t0')}s → {r.get('t1')}s  timeupdate×{r.get('ticks')}")
    if errors: print("PAGE ERRORS:", errors)
    print("ALL PLAYING" if ok else "SOME NOT PLAYING")
    (OUT / "result.json").write_text(json.dumps(rows, ensure_ascii=False, indent=1), encoding="utf-8")

if __name__ == "__main__":
    main()
