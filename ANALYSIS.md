# lusion.co 인터랙션 분석 — RIMEN_WEB 구현 기준서

2026-09-24 · 대상 `https://lusion.co/` (번들 `_astro/hoisted.CUO_IjfL.js`, 스타일 `_astro/about.CNa9RfUh.css`)

원본 번들을 직접 열어 셰이더·스크롤 수식을 읽고 정리했다. "느낌"이 아니라 **수식 단위로** 무엇이 일어나는지 적는다.
RIMEN_WEB 은 이 문서의 수식을 그대로 옮겨 구현했다(`js/reel.js`, `js/paint.js`, `js/scroll.js`).

---

## 0. 전체 구조 — "DOM 은 자리만, 그림은 WebGL 이"

```
<canvas id="canvas">  position:fixed, 화면 전체 (three.js)
<div id="ui">          실제 글자·버튼 (DOM)
```

- 이미지·영상이 들어갈 자리에는 **빈 div** 만 있다. 예: `<div id="home-reel-thumb"></div>` — 내용이 비어 있다.
- `UfxMesh` 라는 클래스가 그 div 의 `getBoundingClientRect()` 를 읽어서, **같은 위치·크기의 평면 메쉬**를 캔버스에 그린다.
  카메라는 픽셀 단위 직교 카메라 → DOM 1px = WebGL 1px.
- 그래서 사각형이 **휘어질 수 있다.** DOM 요소는 CSS 로 곡면이 안 되지만, 32×32 로 쪼갠 메쉬는 정점마다 다르게 움직일 수 있다.
- 스크롤도 가상 스크롤이다(`body` 높이 = 화면 높이 945px, 콘텐츠를 transform 으로 민다). DOM 과 WebGL 이 **같은 스크롤 값**을 쓰므로 어긋나지 않는다.

## 1. 핵심 — `#home-reel-thumb` → 풀스크린 워핑

### 1-1. 관련 DOM

| 요소 | 역할 | CSS |
|---|---|---|
| `#home-reel-thumb` | **출발** 사각형 (쿼터 사이즈) | 12컬럼 중 1~5, `padding-top:56.25%` (16:9) |
| `#home-reel-container` | 스크롤 구간 | `grid-column:1/13; padding-bottom:100vh` ← 100vh 만큼 "붙잡힌 채" 스크롤 |
| `#home-reel-container-inner` | **도착** 사각형 (거의 풀스크린) | 폭 100%, 높이 = min(헤더 아래 남은 높이, 폭/2) |
| `#home-reel-video-container` | 도착 사각형 위 DOM (PLAY REEL 버튼, ✕ 장식) | `translate3d(0, c px, 0)` 로 메쉬와 같이 움직임 |

### 1-2. 진행도 `showRatio` (0 → 1)

```js
p = thumb.top      - (vh - thumb.height) * 0.5   // 썸네일이 화면 세로 중앙에 올 때의 스크롤
g = container.top  - (vh - container.height) * 0.5 // 컨테이너가 중앙에 올 때의 스크롤
showRatio = fit(scroll, p, g, 0, 1)             // 그 사이를 0→1 로 (clamp)
```

- **출발 사각형은 화면 중앙에 도달하면 멈춰 선다(pin).**
  `thumbOffset = max(0, scroll - p)` 를 썸네일 메쉬 위치에 더한다 → 썸네일이 중앙에서 더 올라가지 않음.
- **도착 사각형은 "쫄깃하게" 붙는다.** `getEaseInOutOffset()` 이 컨테이너에 추가 오프셋 `c` 를 준다.
  들어올 때 `cubicBezier(0, 1/3·u, 1, 1)` 로 감속하며 따라붙고, 머무는 구간은 1, 나갈 때 다시 가속.
  → 스크롤하는 손은 일정한데 화면 속 사각형은 **끈적하게 달라붙었다가 떨어진다.**

### 1-3. 정점 셰이더 — "오른쪽 위부터 빨려든다"의 정체 (원본 그대로)

```glsl
// position.xy ∈ [0,1],  x: 왼→오,  y: 위(0)→아래(1)
float placementWeight = 1. - (pow(position.x*position.x, 0.75) + pow(1.-position.y, 1.5)) / 2.;
v_showRatio = smoothstep(placementWeight*0.3, 0.7 + placementWeight*0.3, u_showRatio);
```

| 정점 | placementWeight | 움직이기 시작하는 showRatio | 도착하는 showRatio |
|---|---|---|---|
| **오른쪽 위** | 0 | 0.00 | 0.70 |
| 왼쪽 위 / 오른쪽 아래 | 0.5 | 0.15 | 0.85 |
| **왼쪽 아래** | 1 | 0.30 | 1.00 |

- **정점마다 출발 시간이 다르다.** 오른쪽 위 모서리가 먼저 끌려가고 왼쪽 아래가 가장 늦다.
- 가중치가 `x^1.5`, `y^1.5` 곡선이라 중간 정점들은 **직선이 아니라 곡선**으로 늘어난다 → 포토샵 워프 같은 "흐물흐물".
- 각 정점은 자기 `v_showRatio` 로 출발 rect ↔ 도착 rect 를 보간한다:

```glsl
vec2 domXY = mix(u_domXYFrom, u_domXY, v_showRatio);
vec2 domWH = mix(u_domWHFrom, u_domWH, v_showRatio);
```

### 1-4. 웨이브 두 가지

```glsl
// ① 가로 출렁임 — 중간(0.5)에서 폭의 10% 만큼 오른쪽으로 부풀었다 돌아옴
domXY.x += mix(domWH.x, 0., cos(v_showRatio * PI * 2.) * .5 + .5) * 0.1;

// ② 비틀림 — smoothstep 과 선형의 차이만큼 Z 회전 (최대 ≈ 0.05rad ≈ 3°)
float rot = (smoothstep(0., 1., v_showRatio) - v_showRatio) * -0.5;
```

정점마다 `v_showRatio` 가 다르므로 ①②도 정점마다 다르게 걸린다 → 면 전체가 **파도치듯** 접힌다.

### 1-5. 조각 셰이더 — 색이 깨어난다

```glsl
vec3 tinted = max(u_color, vec3(luma(color)));   // u_color = #1a2ffb (블루)
gl_FragColor = vec4(mix(tinted, color, v_showRatio), roundedMask);
```

- 썸네일일 때는 **흑백 + 파란 틴트**(어두운 부분이 파랗게), 풀스크린이 될수록 원색.
- 모서리는 `--global-border-radius: 20px` SDF 라운드 마스크.
- 세로 비율 보정: `uv.y = (uv.y-.5) * mix(1, aspectScale, v_showRatio) + .5` — 16:9 영상을 2:1 창에 cover.

### 1-6. 메쉬 해상도

- 도착 메쉬 `segX:32, segY:32` (33×33 정점). 썸네일 메쉬는 1×1 (위치만 제공, 그리지 않음).

## 2. 마우스 효과 — ScreenPaint + ScreenPaintDistortion

### 2-1. 페인트 버퍼 (화면 ¼ 해상도, 핑퐁 FBO)

- 채널: `xy` = 속도(0.5 중심), `z,w` = 무게(두 가지 감쇠).
- 매 프레임 이전 마우스→현재 마우스 **선분 SDF** 로 붓 자국. 반지름은 마우스 속도에 비례 (`fit(dist, 0, 100, 0, 100px)`).
- 감쇠: `velocity 0.985 · weight1 0.985 · weight2 0.5`, 가속도 감쇠 0.8, push 25.
- 1/8 해상도로 복사해 블러한 버퍼(lowPaint)로 **자기 속도에 밀려 번진다** (유체 흉내, 진짜 유체 솔버 아님).

### 2-2. 화면 왜곡 후처리 (원본 그대로)

```glsl
float weight = (data.z + data.w) * .5;
vec2 vel = (.5 - data.xy - .001) * 2. * weight;
vec2 velocity = vel * u_amount/4. * texel * u_multiplier;  // amount 20, multiplier 1.25
for (int i=0;i<9;i++){ color += texture2D(scene, uv); uv += velocity; }  // 속도 방향 9탭 번짐
color /= 9.;
color.rgb += sin(vec3(vel.x+vel.y)*40. + vec3(0,2,4)*rgbShift) * smoothstep(.4,-.9,weight) * shade * max(|vel|) ;
```

- 마우스가 지나간 자리의 **WebGL 화면 전체**가 움직인 방향으로 끌려 번지고, 가장자리에 **무지개빛(RGB 위상차 sin)** 이 돈다.
- DOM 글자는 캔버스 위에 있으므로 번지지 않는다. 이미지·영상·배경만 번진다.

## 3. 그 밖의 섹션 동작

| 섹션 | 원본 동작 | RIMEN_WEB 반영 |
|---|---|---|
| Hero | 3D 유리 풍선(물리) + 마우스 페인트 | LIMEN 키비주얼을 WebGL 평면으로 + 마우스 시차 + 페인트 |
| Reel 제목 | 두 줄, 1행 들여쓰기, 13.8vw | 동일 |
| Reel 설명/CTA | 줄 단위로 `translateY(100%→0)` 등장, ease `cubic-bezier(.35,0,0,1)` | 동일 |
| Featured 제목 | 글자별 `translateY(1em) rotate(10deg)` → 0, 20글자당 1초 간격 | 동일 |
| 프로젝트 카드 | 2컬럼, 3번째부터 10em 아래로, 이미지 라운드 15px, 제목은 **같은 글자 4벌 세로로 쌓아두고 굴림(rollup)** | 동일 (호버 시 굴림) |
| CTA 버튼 | 검은 점이 32배로 커지며 파랑으로 채움, 화살표가 오른쪽에서 들어옴 | 동일 |
| Goal | 긴 3D 터널 + 큰 문장 | 큰 문장 스크롤 연출(가벼운 버전) |
| End / Footer | "Let's work together!" 글자 굴림 | 동일 |

## 4. 디자인 토큰 (원본 CSS)

```
--color-off-white #f0f1fa   --color-blue #1a2ffb   --color-black #000
--grid-gap 2vw (모바일 4vw)   12컬럼   --base-padding-x max(5vw, 40px)
--global-border-radius 20px (모바일 15px)   ease.lusion = cubic-bezier(.35, 0, 0, 1)
```

## 5. 원본과 다르게 간 곳 (의도적)

- **3D 풍선·3D 터널은 옮기지 않았다.** 사용자 요청의 핵심(릴 워핑 + 마우스 효과)과 무관하고, 우리 자료가 사진·영상이다.
- 폰트: Aeonik(유료) 대신 라틴 `Inter Tight` + 한글 `Pretendard`.
- 가상 스크롤 대신 **네이티브 스크롤 + 보간(lerp) 레이어**. 스크롤바·키보드·트랙패드가 그대로 동작하면서 원본과 같은 관성감.
