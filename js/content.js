/* RIMEN_WEB 콘텐츠 — 글과 자료는 여기만 고치면 된다.

   media/ 의 파일은 tools/prep_media.py 가 원본(4주차·르스페이스·Blender·다운로드 영상)에서 만든 웹용 사본이다.
   새 사진을 넣으려면 prep_media.py 의 IMAGES 에 한 줄 추가 → 실행 → 아래 WORKS 에 한 줄 추가. */

export const REEL = {
  video: "media/reel.mp4",
  poster: "media/reel_poster.jpg",
  aspect: 16 / 9,
};

/* 릴 후보 비교 — 주소 뒤에 ?reel=A (B, C) 를 붙이면 reel_lab/out 의 후보로 바꿔 끼운다 */
const REEL_CANDIDATES = { A: "reel_A_wake", B: "reel_B_bloom", C: "reel_C_signal" };
const pick = new URLSearchParams(location.search).get("reel");
if (pick && REEL_CANDIDATES[pick.toUpperCase()]) {
  const name = REEL_CANDIDATES[pick.toUpperCase()];
  REEL.video = `reel_lab/out/${name}.mp4`;
  REEL.poster = `reel_lab/out/${name}_poster.jpg`;
}

export const HERO_IMAGE = "media/limen_bg.webp";

/* 테스트 로그 · R&D — 원본 Featured Work 자리.
   kind: "test" = 직접 돌려 본 장면, "rnd" = 리서치·렌더 */
export const WORKS = [
  {
    kind: "test", title: "4면 매핑 그리드",
    meta: ["2026.09.17", "호라이즌 스튜디오"], tags: ["MAPPING", "MADMAPPER", "BLENDING"],
    image: "media/studio_grid_a.webp",
    memo: "벽 3면과 바닥 1면에 셀 번호 그리드를 띄워 프로젝터 겹침과 블렌딩 경계를 확인했다.",
  },
  {
    kind: "rnd", title: "Night Bloom",
    meta: ["R&D", "Blender"], tags: ["3D", "FLOWER", "RENDER"],
    image: "media/night_bloom.webp", video: "media/night_bloom.mp4",
    memo: "바닥에 남는 '흔적'을 꽃으로 표현하기 위한 개화 애니메이션. 봉오리에서 만개까지 120프레임.",
  },
  {
    kind: "test", title: "바닥 인터랙션",
    meta: ["2026.09.17", "호라이즌 스튜디오"], tags: ["INTERACTION", "FLOOR", "TOP-VIEW"],
    image: "media/floor_flowers.webp",
    memo: "관객이 선 자리를 탑뷰로 잡아 바닥에 꽃이 피게 했다. 지나간 자리는 다음 관객에게 흔적으로 남는다.",
  },
  {
    kind: "test", title: "워핑 보정",
    meta: ["2026.09.17", "호라이즌 스튜디오"], tags: ["WARPING", "CALIBRATION"],
    image: "media/studio_tablet.webp",
    memo: "태블릿으로 모서리 점을 옮겨 가며 벽과 바닥이 만나는 선을 맞췄다.",
  },
  {
    kind: "rnd", title: "Crystal Bloom",
    meta: ["R&D", "Blender"], tags: ["3D", "GLASS", "PARTICLE"],
    image: "media/crystal_bloom.webp", video: "media/crystal_bloom.mp4",
    memo: "유리 재질과 궤도 입자를 더한 변주. 3면의 '반응하지 않는 세계' 톤을 시험했다.",
  },
  {
    kind: "test", title: "센서 뷰 확인",
    meta: ["2026.09.17", "호라이즌 스튜디오"], tags: ["SENSOR", "TRACKING"],
    image: "media/studio_sensor.webp",
    memo: "스튜디오 안에서 사람 위치가 어떻게 잡히는지 모니터로 확인했다.",
  },
  {
    kind: "rnd", title: "AI 실루엣 디퓨전",
    meta: ["R&D", "TouchDesigner"], tags: ["STREAMDIFFUSION", "SILHOUETTE"],
    image: "media/ai_diffusion_poster.jpg", video: "media/ai_diffusion.mp4",
    memo: "카메라 → 실루엣 → 실시간 디퓨전. 사람의 형태가 빛의 결로 다시 그려진다.",
  },
  {
    kind: "rnd", title: "Bloom v1",
    meta: ["R&D", "Blender"], tags: ["3D", "LOOP"],
    image: "media/flower.webp", video: "media/bloom_v1.mp4",
    memo: "첫 번째 꽃 렌더. 이후 모든 꽃 변주의 기준이 된 모양.",
  },
  {
    kind: "test", title: "르스페이스 답사",
    meta: ["2026.08.28", "르스페이스"], tags: ["REFERENCE", "IMMERSIVE"],
    image: "media/lespace_a.webp",
    memo: "몰입형 전시장의 천장·바닥 투사 방식과 관객 동선을 관찰했다.",
  },
  {
    kind: "test", title: "블렌딩 경계",
    meta: ["2026.09.17", "호라이즌 스튜디오"], tags: ["MAPPING", "EDGE"],
    image: "media/studio_grid_c.webp",
    memo: "모서리에서 두 프로젝터가 겹치는 영역의 밝기 차이를 기록했다.",
  },
];

/* 4면 구조 — 원본 Goal 섹션 자리 */
export const SURFACES = [
  {
    no: "01", title: "세 벽", sub: "내가 보고 영향을 받는 세계",
    body: "관객이 들어오기 전부터 흐르고 있고, 관객에게 반응하지 않는다. 환경·정보·타인의 선택·사회의 기준.",
    image: "media/studio_grid_c.webp",
  },
  {
    no: "02", title: "바닥", sub: "그 영향을 받은 내가 실제로 선택하는 자리",
    body: "여기만 반응한다. 내가 지나간 자리는 흔적으로 남아 다음 사람의 선택 환경이 된다.",
    image: "media/floor_flowers.webp",
  },
];
