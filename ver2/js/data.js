/* ver2 콘텐츠 — 전부 LIMEN · SNOOZE 자료. 미디어는 루트 media/ 를 같이 쓴다. */
export const M = p => `../media/${p}`;

/* ── 인트로 선언문 ── */
export const MANIFESTO = ["SLEEP.", "FOLLOW,", "NOTICE,", "WAKE."];

/* ── 메인 그래프 ──
   가운데 = 나. 굵은 선 = LIMEN 의 개념어(클릭하면 About 상세로), 흐린 선 = 나를 잡아당기는 타인의 기준. */
export const MAJOR = [
  { word: "문턱",   to: "limen" },
  { word: "자각",   to: "concept" },
  { word: "세 벽",  to: "walls" },
  { word: "바닥",   to: "floor" },
  { word: "흔적",   to: "trace" },
  { word: "자각몽", to: "journey" },
  { word: "관계",   to: "concept" },
  { word: "선택",   to: "floor" },
];
export const MINOR = [
  "별점 4.8", "추천순", "조회수", "좋아요", "유행", "후기", "평균",
  "정답", "남들처럼", "인기 급상승", "베스트셀러", "모두가", "알고리즘", "실시간",
];

/* ── About: 8개 별 (노드) ── */
export const NODES = [
  {
    id: "limen", label: "LIMEN", ko: "문턱", big: "LIMEN",
    title: "라틴어로, 문턱",
    body: "LIMEN 은 벽 세 면과 바닥 한 면으로 이루어진 방입니다. 관객은 들어오기 전부터 흐르고 있던 세계 안에 서고, 그 안에서 걷고, 멈추고, 방향을 고릅니다. 그 선택이 정말 내 것이었는지 — 알아차리는 순간이 문턱입니다.",
  },
  {
    id: "concept", label: "CONCEPT", ko: "세인", big: "AWARE",
    title: "타인의 기준이 내 선택에 들어와 있다",
    body: "하이데거는 '세인(das Man)' 속에 흩어진 나를 비본래적이라 불렀습니다. 별점과 추천과 유행은 선택을 쉽게 만들지만, 누구의 기준으로 고르고 있는지는 가립니다. LIMEN 의 자각은 그 기준을 끊는 것이 아니라, 그것이 거기 있음을 보는 것 — 통제가 아니라 관계입니다.",
  },
  {
    id: "walls", label: "WALLS", ko: "세 벽", big: "WORLD",
    title: "반응하지 않는 세계",
    body: "세 벽은 관객에게 반응하지 않습니다. 환경, 정보, 타인의 선택, 사회의 기준 — 내가 보고 영향을 받는 세계는 내가 들어오기 전부터 흘러가고 있었고, 내가 떠난 뒤에도 흘러갑니다. 모든 면이 반응하면 '내가 세계를 통제한다'로 읽히기 때문입니다.",
  },
  {
    id: "floor", label: "FLOOR", ko: "바닥", big: "CHOICE",
    title: "내가 실제로 선택하는 자리",
    body: "오직 바닥만 반응합니다. 천장의 센서가 관객의 위치를 위에서 읽고, 선 자리와 지나간 길에 빛이 피어납니다. 무엇을 할지 알려주지 않습니다. 걸음이 곧 선택이고, 선택은 발밑에 남습니다.",
  },
  {
    id: "trace", label: "TRACE", ko: "흔적", big: "TRACE",
    title: "내 흔적도 누군가의 기준이 된다",
    body: "앞사람이 지나간 자리는 한동안 바닥에 남습니다. 다음 관객은 그 흔적을 보고 걷습니다 — 리뷰와 별점이 다음 사람의 선택 환경이 되는 것처럼. 흔적을 따라 걷던 나는, 어느 순간 내 흔적이 또 다른 사람의 길이 되고 있음을 봅니다.",
  },
  {
    id: "journey", label: "JOURNEY", ko: "자각몽", big: "LUCID",
    title: "여섯 걸음의 자각몽",
    body: "진입 — 이미 존재하는 세계. 관찰 — 흐르는 벽. 선택 — 바닥 위의 움직임. 발견 — 행동의 이유를 인식. 관계 — 내 흔적도 정보가 됨. 자각 — 꿈인 줄 알면서 머무는 순간. 공간은 나뉘지 않습니다. 같은 방 안에서 바뀌는 것은 오직 인식입니다.",
  },
  {
    id: "process", label: "PROCESS", ko: "과정", big: "BUILD",
    title: "센서, 빛, 꽃",
    body: "천장의 Kinect v2 가 바닥을 내려다보며 사람을 뎁스 블롭으로 찾고, 네 점 보정으로 바닥 좌표에 맞춥니다. 세 벽은 프리렌더 영상, 바닥은 실시간 — Unity 와 TouchDesigner, MadMapper 블렌딩, Blender 로 만든 꽃, 실루엣을 빛의 결로 다시 그리는 실시간 디퓨전까지 시험했습니다.",
  },
  {
    id: "snooze", label: "SNOOZE", ko: "팀", big: "SNOOZE",
    title: "알람을 한 번 더 미루는 사람들",
    body: "SNOOZE 는 3D 맵핑 디자이너 셋과 개발자 하나로 이루어진 팀입니다. 계원예술대학교 캡스톤디자인으로 시작해 COSS 호라이즌 스튜디오에서 사업으로 이어가고 있습니다. 졸업전시 2026년 11월 20일부터 22일까지.",
  },
];

/* ── WORK: 영상 작업만 ──
   still = 입자 응결에 쓰는 한 장면(영상의 1.2초 지점), video = 틀 안에서 재생되는 영상.
   path = 설명문에서 뽑은 핵심어 (읽는 순서대로 상세 화면에서 선으로 이어진다) */
export const WORKS = [
  {
    id: "limen", kind: "MAIN", title: "LIMEN", sub: "졸업작품 — 관측 로그 릴",
    still: M("reel_still.jpg"), video: M("reel.mp4"),
    extra: [M("floor_flowers.webp"), M("studio_sensor.webp")],
    desc: "벽 세 면은 반응하지 않는 세계를 흘려보내고, 바닥 한 면만 관객의 걸음에 답합니다. 앞사람의 흔적이 다음 사람의 길이 되는 방에서, 관객은 자신의 선택이 누구의 기준이었는지 알아차립니다.",
    path: ["세계를", "바닥", "걸음에", "흔적이", "길이", "방에서", "선택이", "기준이었는지", "알아차립니다"],
  },
  {
    id: "mapping", kind: "TEST", title: "4면 매핑 테스트", sub: "2026.09.23 · 호라이즌 스튜디오",
    still: M("mapping_test_still.jpg"), video: M("mapping_test.mp4"),
    extra: [M("studio_grid_a.webp"), M("studio_grid_c.webp"), M("studio_tablet.webp")],
    desc: "벽 세 면과 바닥 한 면에 영상을 올려 프로젝터가 겹치는 영역과 블렌딩 경계를 확인했습니다. 모서리 점을 하나씩 옮겨 꺾인 면 위에서도 이미지가 곧게 이어지도록 맞췄습니다.",
    path: ["벽", "영상을", "프로젝터가", "겹치는", "블렌딩", "경계를", "모서리", "꺾인", "곧게"],
  },
  {
    id: "wide", kind: "R&D", title: "Night Bloom Wide", sub: "Blender · 16:9 궤도 렌더",
    still: M("night_bloom_wide_still.jpg"), video: M("night_bloom_wide.mp4"),
    extra: [M("night_bloom.webp")],
    desc: "봉오리에서 만개까지 피는 동안 카메라가 꽃 둘레를 56도 돌아 들어갑니다. 가로 화면에 맞춰 다시 렌더한 월하미인으로, 벽에 흐를 영상의 톤을 시험했습니다.",
    path: ["봉오리에서", "만개까지", "카메라가", "꽃", "돌아", "가로", "월하미인으로", "벽에", "톤을"],
  },
  {
    id: "night", kind: "R&D", title: "Night Bloom", sub: "Blender · 지오메트리 노드",
    still: M("night_bloom_still.jpg"), video: M("night_bloom.mp4"),
    extra: [M("flower3.webp")],
    desc: "월하미인의 구조를 따라 안쪽 흰 꽃잎부터 바깥 먹색 띠까지 여덟 겹을 하나의 노드로 만들었습니다. 바닥에 남는 흔적이 피어나는 모양입니다.",
    path: ["월하미인의", "흰", "꽃잎부터", "먹색", "여덟", "하나의", "바닥에", "흔적이", "피어나는"],
  },
  {
    id: "crystal", kind: "R&D", title: "Crystal Bloom", sub: "Blender · 유리 재질",
    still: M("crystal_bloom_still.jpg"), video: M("crystal_bloom.mp4"),
    extra: [M("crystal_bloom.webp")],
    desc: "유리 재질과 궤도를 도는 입자를 더한 변주입니다. 반응하지 않는 세 벽의 톤을 시험했습니다.",
    path: ["유리", "궤도를", "입자를", "변주입니다", "반응하지", "세", "벽의", "톤을"],
  },
  {
    id: "bloom", kind: "R&D", title: "Bloom v1", sub: "Blender · 첫 렌더",
    still: M("bloom_v1_still.jpg"), video: M("bloom_v1.mp4"),
    extra: [M("flower.webp")],
    desc: "첫 번째 꽃 렌더입니다. 이후 모든 꽃 변주의 기준이 된 모양으로, 봉오리에서 만개까지 한 번에 핍니다.",
    path: ["첫", "꽃", "렌더입니다", "모든", "변주의", "기준이", "봉오리에서", "만개까지"],
  },
  {
    id: "diffusion", kind: "R&D", title: "AI 실루엣 디퓨전", sub: "TouchDesigner · StreamDiffusion",
    still: M("ai_generated_still.jpg"), video: M("ai_generated.mp4"),
    extra: [M("ai_diffusion_poster.jpg")],
    desc: "카메라가 잡은 사람을 실루엣으로 떼어내고, 그 형태를 실시간 디퓨전으로 빛의 결로 다시 그렸습니다. 사람은 사라지고 움직임만 남습니다.",
    path: ["카메라가", "사람을", "실루엣으로", "형태를", "실시간", "빛의", "결로", "움직임만"],
  },
  {
    id: "wake", kind: "R&D", title: "WAKE", sub: "릴 A안 · 리듬 몽타주",
    still: M("reel_wake_still.jpg"), video: M("reel_wake.mp4"),
    desc: "120BPM 비트마다 컷이 넘어가는 전시 트레일러입니다. 맵핑 테스트, 실루엣, 꽃 렌더가 흑백과 컬러로 번갈아 번쩍이고, 거대한 LIMEN 글자 속에서 꽃이 핍니다.",
    path: ["비트마다", "컷이", "트레일러입니다", "맵핑", "실루엣", "흑백과", "컬러로", "글자", "꽃이"],
  },
  {
    id: "dream", kind: "R&D", title: "BLOOM", sub: "릴 B안 · 자각몽 롱테이크",
    still: M("reel_bloom_still.jpg"), video: M("reel_bloom.mp4"),
    desc: "컷 없이 흐르는 한 장면입니다. 밤의 이끼 위로 입자가 떠오르고, 물결처럼 번지며 꽃이 피었다가, 바닥 위의 사람과 겹쳐 실제 공간으로 돌아옵니다.",
    path: ["컷", "한", "밤의", "입자가", "물결처럼", "꽃이", "바닥", "사람과", "공간으로"],
  },
];

/* 키워드 들판을 채울 단어 — 설명문 전체 + LIMEN 어휘 */
export const FIELD_EXTRA = [
  "문턱", "자각", "세인", "비본래성", "본래성", "관계", "통제", "별점", "후기", "추천", "유행", "평균",
  "꿈", "자각몽", "진입", "관찰", "발견", "흔적", "센서", "뎁스", "블롭", "탑뷰", "프리렌더", "실시간",
  "빛", "꽃", "바닥", "벽", "천장", "선택", "걸음", "방향", "멈춤", "기준", "타인", "나", "우리", "SNOOZE",
];

export const VISIT = {
  lines: [
    ["EXHIBITION", "계원예술대학교 졸업전시"],
    ["DATE", "2026.11.20 — 11.22"],
    ["VENUE", "COSS 호라이즌 스튜디오"],
    ["SPACE", "벽 3면 + 바닥 1면"],
    ["TEAM", "SNOOZE"],
  ],
  link: "https://dmd-snooze.vercel.app/",
};
