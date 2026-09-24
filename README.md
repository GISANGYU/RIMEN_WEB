# RIMEN_WEB — LIMEN 전시 웹사이트

lusion.co 의 인터랙션(릴 워핑 · 마우스 페인트 왜곡)을 원본 셰이더 수식 그대로 옮기고,
우리 테스트 로그·R&D 자료로 콘텐츠를 채운 정적 사이트. 빌드 도구 없음.

## 실행

```
cd RIMEN_WEB
python -m http.server 5178
```
→ http://127.0.0.1:5178  (모바일 미리보기: `/tools/preview-mobile.html`)
`file://` 로 직접 열면 모듈·텍스처가 막히니 꼭 서버로 연다.

## 파일

| 파일 | 내용 |
|---|---|
| `ANALYSIS.md` | 원본 분석 — 무엇이 왜 휘는지 수식 단위로 |
| `js/content.js` | **글·사진·영상 목록. 콘텐츠 수정은 여기만** |
| `js/reel.js` | ★ 썸네일 → 풀스크린 워핑 (원본 videoVert/videoFrag) |
| `js/paint.js` | 마우스 페인트 + 화면 번짐 후처리 (원본 ScreenPaint) |
| `js/scroll.js` | 부드러운 스크롤, 원본 getEaseInOutOffset · ScrollDomRange |
| `js/gl.js` | DOM 자리를 따라다니는 WebGL 평면 (원본 UfxMesh) |
| `js/main.js` | 카드 생성, 텍스트 등장, 터널 문장, 프리로더, 라이트박스 |
| `tools/prep_media.py` | 원본 자료 → `media/` 웹용 사본 (webp, H.264) |

## 자료 추가

1. `tools/prep_media.py` 의 `IMAGES` / `VIDEOS` 에 원본 경로 한 줄
2. `python tools/prep_media.py` (이미 있는 파일은 건너뜀. ffmpeg 은 `pip install imageio-ffmpeg`)
3. `js/content.js` 의 `WORKS` 에 카드 한 줄

## 워핑 조절 손잡이 (`js/reel.js`)

- 출발 순서: `placementWeight` 식 — 지금은 오른쪽 위가 먼저
- 늘어지는 정도: `smoothstep(w*0.3, 0.7 + w*0.3, …)` 의 0.3 을 키우면 모서리 간 시차가 커져 더 흐물흐물
- 출렁임 폭: `* 0.1` (폭의 10%) / 비틀림: `* -0.5`
- 썸네일 틴트 색: `u_color` (#1a2ffb)

## 알아 둘 것

- 영상은 첫 프레임이 나오기 전까지 포스터 이미지를 보여 준다.
- `window.__rimen.step(n)` — 탭이 가려져 rAF 가 멈춘 브라우저에서 프레임을 손으로 돌리는 검증용 훅.
