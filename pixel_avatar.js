// ============================================================================
// [음악왕 v10.17] 레벨·타이틀(20단계) & 480×480+ 고디테일 캐릭터·상점 v12 렌더러
// - 캔버스 최소 480px 고해상도 + 종횡비 정배율 동기화 (모바일/상점/홈 찌그러짐·뭉개짐 제거)
// - 헤어 15종 / 얼굴 19종(열창 표정 삭제·심쿵 윙크 수정·신규 6종) / 모자 20종(신규 6종)
//   의상 15종(신규 6종·전용 소매/신발/디테일) / 배경 12종(신규 4종·전종 풀 일러스트)
//   악기 20종(신규 5종) 전면 고디테일화
// ============================================================================

const EXP_LEVEL_TABLE = [
  { level: 1,  reqExp: 0,      title: "🐣 방구석 리스너" },
  { level: 2,  reqExp: 1000,   title: "🎧 이어폰 유망주" },
  { level: 3,  reqExp: 2500,   title: "🎵 흥얼대는 루키" },
  { level: 4,  reqExp: 4500,   title: "🎤 코인노래방 단골" },
  { level: 5,  reqExp: 7000,   title: "📻 심야 라디오 DJ" },
  { level: 6,  reqExp: 10000,  title: "🎸 홍대 인디 루키" },
  { level: 7,  reqExp: 14000,  title: "🥁 리듬 비트메이커" },
  { level: 8,  reqExp: 19000,  title: "💿 음반 콜렉터" },
  { level: 9,  reqExp: 25000,  title: "🎹 스튜디오 세션맨" },
  { level: 10, reqExp: 32000,  title: "🌟 데뷔 직전 연습생" },
  { level: 11, reqExp: 40500,  title: "📺 음방 1위 후보" },
  { level: 12, reqExp: 50500,  title: "💃 떼창 엔딩요정" },
  { level: 13, reqExp: 62000,  title: "🏆 골든디스크 신인왕" },
  { level: 14, reqExp: 75000,  title: "🔊 음원차트 올킬러" },
  { level: 15, reqExp: 90000,  title: "🎙️ 고척돔 매진 보컬" },
  { level: 16, reqExp: 107000, title: "🎼 천재 히트 작곡가" },
  { level: 17, reqExp: 126500, title: "🌍 빌보드 핫100 스타" },
  { level: 18, reqExp: 148500, title: "⚡ 1초 컷 가요 마스터" },
  { level: 19, reqExp: 173000, title: "💎 살아있는 K-POP 백과" },
  { level: 20, reqExp: 200000, title: "👑 대한민국 전설의 음악왕" }
];

function getLevelInfo(rawExp = 0) {
  const exp = Math.max(0, Math.floor(Number(rawExp) || 0));
  let cur = EXP_LEVEL_TABLE[0];
  for (let i = 0; i < EXP_LEVEL_TABLE.length; i++) {
    if (exp >= EXP_LEVEL_TABLE[i].reqExp) {
      cur = EXP_LEVEL_TABLE[i];
    } else {
      break;
    }
  }
  const next = EXP_LEVEL_TABLE.find(item => item.level === cur.level + 1) || null;
  if (!next) {
    return {
      level: cur.level,
      title: cur.title,
      exp,
      curReq: cur.reqExp,
      nextReq: cur.reqExp,
      inLevelExp: exp - cur.reqExp,
      needInLevel: 0,
      percent: 100,
      isMax: true
    };
  }
  const inLevelExp = exp - cur.reqExp;
  const needInLevel = next.reqExp - cur.reqExp;
  const percent = Math.min(100, Math.max(0, (inLevelExp / needInLevel) * 100));
  return {
    level: cur.level,
    title: cur.title,
    exp,
    curReq: cur.reqExp,
    nextReq: next.reqExp,
    inLevelExp,
    needInLevel,
    percent,
    isMax: false
  };
}

const SHOP_CATALOG_VERSION = 14;

const GAME_ITEMS_CATALOG = [
  {
    id: "item_3sec",
    name: "🎧 3초 듣기",
    price: 200,
    grade: "B",
    scope: "common",
    scopeLabel: "공용",
    maxAdPerDay: 3,
    adRechargeable: true,
    desc: "1초 듣기 포함 모든 모드에서\n해당 곡 하이라이트를 3초간 재생합니다."
  },
  {
    id: "item_chosung",
    name: "🔤 초성힌트",
    price: 200,
    grade: "B",
    scope: "common",
    scopeLabel: "공용",
    maxAdPerDay: 3,
    adRechargeable: true,
    desc: "점수 감점 없이 정답(가수·제목)의\n초성 힌트를 즉시 공개합니다."
  },
  {
    id: "item_hourglass",
    name: "⏳ 모래시계",
    price: 350,
    grade: "A",
    scope: "timeattack",
    scopeLabel: "타임어택용",
    maxAdPerDay: 3,
    adRechargeable: true,
    desc: "타임어택 모드 진행 중 현재 문제의\n제한시간을 +10초 연장합니다."
  },
  {
    id: "item_heart",
    name: "💖 하트요정",
    price: 350,
    grade: "A",
    scope: "infinite",
    scopeLabel: "무한도전용",
    maxAdPerDay: 3,
    adRechargeable: true,
    desc: "무한도전 진행 중 남은 하트(생명)를\n즉시 +1개 추가합니다."
  },
  {
    id: "item_revive",
    name: "🪽 부활날개",
    price: 350,
    grade: "A",
    scope: "infinite",
    scopeLabel: "무한도전용",
    maxAdPerDay: 3,
    adRechargeable: true,
    desc: "무한도전에 사전 장착 시 하트가 0이 되어도\n하트 1개로 부활하여 이어할 수 있습니다."
  },
  {
    id: "item_double",
    name: "⚡ 더블어택",
    price: 19000,
    grade: "S",
    scope: "common",
    scopeLabel: "공용 · 희귀 S",
    maxAdPerDay: 0,
    adRechargeable: false,
    desc: "사용 시 해당 판에서 획득하는\n최종 점수와 CD 보상을 2배로 만듭니다. (광고 충전 불가)"
  }
];

function getGameItemById(id) {
  return GAME_ITEMS_CATALOG.find(item => item.id === id) || null;
}

const BASE_AVATAR_SHOP_ITEMS = {
  bg: [
    { id: "meadow", name: "초원 잔디마당", price: 0, grade: "C", desc: "따사로운 햇살과 꽃밭, 원목 울타리가\n반겨주는 평화로운 초원 뒷마당", colors: ["#5ec8f8", "#aee4ff", "#76d32d", "#4d9e12"] },
    { id: "neon", name: "네온 뮤직뱅크", price: 1200, grade: "B", desc: "화려한 레이저와 생방송 스포트라이트가\n쏟아지는 음악방송 메인 스테이지", colors: ["#1e1b4b", "#3730a3", "#f43f5e", "#1e1b4b"] },
    { id: "sakura", name: "봄날 벚꽃동산", price: 1800, grade: "B", desc: "만개한 벚꽃나무 아래 분홍 꽃잎이\n흩날리는 설레는 봄날 피크닉 동산", colors: ["#fda4af", "#fff1f2", "#86efac", "#22c55e"] },
    { id: "sunset_beach", name: "노을 해변 페스티벌", price: 3200, grade: "A", desc: "붉은 석양 바다와 야자수 실루엣이\n어우러진 여름 밤 락 페스티벌 무대", colors: ["#f43f5e", "#fdba74", "#d97706", "#92400e"] },
    { id: "hangang_night", name: "한강 불꽃 야경", price: 3900, grade: "A", desc: "서울 마천루, 한강 대교 조명과\n불꽃놀이가 수놓은 한강 야외공연장", colors: ["#0f172a", "#312e81", "#1e293b", "#090d16"] },
    { id: "retro_alley", name: "골목", price: 4400, grade: "A", desc: "정겨운 붉은 벽돌과 감성 가로등,\n전봇대와 라이브 벽보가 붙은 레트로 골목", colors: ["#1e293b", "#475569", "#334155", "#0f172a"] },
    { id: "midi_cyber", name: "일렉트로 미디 룸", price: 5100, grade: "A", desc: "사이버 네온 이퀄라이저와 모니터 스피커가\n빛나는 최첨단 전자 미디 녹음실", colors: ["#0f172a", "#1e3a8a", "#0284c7", "#0f172a"] },
    { id: "sunny_beach", name: "해변", price: 5600, grade: "A", desc: "청량한 에메랄드 바다와 하얀 파도,\n비치 파라솔이 펼쳐진 한낮의 여름 해변", colors: ["#0284c7", "#bae6fd", "#fef08a", "#eab308"] },
    { id: "galaxy", name: "스타라이트 우주홀", price: 6500, grade: "S", desc: "고리 달린 토성과 은하수, 별똥별이\n반짝이는 신비로운 우주 음악왕 무대", colors: ["#090d16", "#2e1065", "#4c1d95", "#1e1b4b"] },
    { id: "secret_basement", name: "지하실", price: 7400, grade: "S", desc: "노출 벽돌과 알전구 줄조명, 빈티지 앰프가\n모여있는 비밀 밴드 합주 지하실", colors: ["#1c1917", "#44403c", "#57534e", "#292524"] },
    { id: "sky_clouds", name: "구름", price: 8600, grade: "S", desc: "무지개가 걸린 파스텔 천공 하늘 위,\n폭신한 뭉게구름을 밟고 선 하늘 스테이지", colors: ["#38bdf8", "#e0f2fe", "#f8fafc", "#bae6fd"] },
    { id: "royal", name: "황금 음악왕성", price: 10000, grade: "S", desc: "대리석 기둥과 샹들리에, 레드카펫이 깔린\n순금빛 궁전 로얄 스테이지", colors: ["#fef08a", "#fde047", "#dc2626", "#7f1d1d"] }
  ],
  hair: [
    { id: "default", name: "바가지 머리", price: 0, grade: "C", desc: "깔끔하게 둥글린 옆라인과 윤기 나는\n귀여운 시그니처 기본 바가지 헤어", color: "#27272a", style: "bowl" },
    { id: "blonde", name: "샤이닝 금발", price: 500, grade: "C", desc: "6:4 아이돌 가르마와 부드러운 레이어드\n금발 머릿결이 눈부신 센터 스타일", color: "#facc15", style: "idol_blonde" },
    { id: "bald", name: "반짝 민머리", price: 1100, grade: "B", desc: "햇빛 받으면 눈이 부실 정도로\n매끈반짝 별빛 광택의 시원한 민머리", color: "#fffdf9", style: "bald" },
    { id: "monkey_hood", name: "몽키 모자", price: 1600, grade: "B", desc: "스티치 라인과 큼직한 원숭이 귀,\n꼭대기 털 포인트가 매력적인 후드", color: "#6b3410", style: "monkey" },
    { id: "sprout_hat", name: "초록 새싹모자", price: 2100, grade: "B", desc: "잎맥과 물방울까지 선명한\n머리 위 광합성 초록 새싹 스타일", color: "#4ade80", style: "sprout" },
    { id: "mint_comma", name: "민트 쉼표머리", price: 2700, grade: "B", desc: "이마 위로 둥글게 말려 내려오는\nC자 쉼표 앞머리의 상큼 민트초코 헤어", color: "#2dd4bf", style: "comma" },
    { id: "pink_twin", name: "핑크 양갈래", price: 3100, grade: "A", desc: "하트 가르마 앞머리에 별빛 머리끈으로\n통통 튀게 묶은 과즙미 핑크 양갈래", color: "#f472b6", style: "pink_twin" },
    { id: "pigtails", name: "상큼 양갈래", price: 3500, grade: "A", desc: "부드러운 M자 앞머리와 빨간 리본으로\n풍성하게 내린 다크 브라운 웨이브 양갈래", color: "#451a03", style: "brown_twin" },
    { id: "ponytail", name: "하이 포니테일", price: 3900, grade: "A", desc: "사선 앞머리와 함께 높게 묶어 올려\n경쾌하게 찰랑이는 하이 포니테일", color: "#1e293b", style: "ponytail" },
    { id: "rock_red", name: "불꽃 샤기컷", price: 4200, grade: "A", desc: "타오르는 불꽃처럼 사방으로 뻗친\n거친 스파이크와 레드 투톤 샤기컷", color: "#ef4444", style: "spiky" },
    { id: "octo_hat", name: "문어 모자", price: 4600, grade: "A", desc: "동그란 눈망울과 빨판 달린 다리가\n양옆으로 늘어진 엉뚱발랄 문어 모자", color: "#ea580c", style: "octo" },
    { id: "buns", name: "동글 만두머리", price: 5000, grade: "A", desc: "꽈배기 결이 살아있는 동글 경단 두 개에\n진주 비녀가 꽂힌 앙증맞은 만두머리", color: "#3f2e21", style: "buns" },
    { id: "braids", name: "발랄 삐삐머리", price: 5400, grade: "A", desc: "한올 한올 정교하게 땋아 올린\n개성 만점 발랄한 양쪽 삐삐머리", color: "#92400e", style: "braids" },
    { id: "silver_perm", name: "실버 프로듀서", price: 5800, grade: "A", desc: "풍성한 S컬 웨이브 펌이 몽글몽글\n살아있는 세련된 백금발 프로듀서 헤어", color: "#cbd5e1", style: "perm" },
    { id: "violet_twin", name: "보라빛 요정트윈", price: 8500, grade: "S", desc: "요정 날개 머리핀과 영롱한 퍼플\n그라데이션이 빛나는 몽환적 요정 양갈래", color: "#a855f7", style: "violet_twin" }
  ],
  hat: [
    { id: "none", name: "모자 벗기", price: 0, grade: "C", desc: "아무 모자도 쓰지 않은\n시원하고 깔끔한 기본 상태" },
    { id: "headset", name: "프로 헤드셋", price: 1100, grade: "B", desc: "메탈 밴드와 쿠션 패드가 정밀한\n블루투스 스튜디오 프로 헤드셋", color: "#0ea5e9" },
    { id: "bucket_hat", name: "힙합 버킷햇", price: 1400, grade: "B", desc: "스티치와 레드 포인트 로고 패치가 달린\n90년대 감성 블랙 힙합 버킷햇", color: "#1e293b" },
    { id: "acorn_hat", name: "도토리 모자", price: 1700, grade: "B", desc: "격자 무늬 도토리 갓과 나무 꼭지가\n귀여운 가을 숲속 도토리 베레모", color: "#854d0e" },
    { id: "propeller_cap", name: "프로펠러 모자", price: 2000, grade: "B", desc: "꼭대기 하늘색 프로펠러가 빙글빙글!\n개구쟁이 알록달록 패널 캡", color: "#ef4444" },
    { id: "big_ribbon", name: "왕리본 머리핀", price: 2400, grade: "B", desc: "주름 디테일과 화사한 핑크 광택이\n사랑스러운 초대형 빅 리본 머리핀", color: "#f43f5e" },
    { id: "bunny_band", name: "토끼귀 머리띠", price: 2800, grade: "B", desc: "부드러운 안쪽 속귀까지 정교한\n쫑긋쫑긋 핑크 토끼귀 머리띠", color: "#fb7185" },
    { id: "cat_ear", name: "고양이 헤드폰", price: 3100, grade: "A", desc: "LED 핑크 삼각 귀와 푹신한 이어컵이\n돋보이는 인기 만점 고양이 헤드폰", color: "#f43f5e" },
    { id: "beret_art", name: "빨간 베레모", price: 3400, grade: "A", desc: "사선 주름과 황금 브로치 배지가\n세련된 파리지앵 아티스트 베레모", color: "#dc2626" },
    { id: "cloud_hat", name: "구름모자", price: 3700, grade: "A", desc: "두둥실 하늘에서 따온 듯 몽글몽글하고\n포근한 구름 모양 모자", color: "#f8fafc" },
    { id: "party_hat", name: "파티모자", price: 4000, grade: "A", desc: "알록달록 땡땡이 패턴과 꼭대기\n보송보송 폼폼이 달린 축하 고깔모자", color: "#f43f5e" },
    { id: "angel", name: "천사의 링", price: 4400, grade: "A", desc: "머리 위에서 은은한 아우라로 빛나는\n순백·황금빛 천사의 헤일로", color: "#facc15" },
    { id: "bear_hood", name: "곰돌이 모자", price: 4800, grade: "A", desc: "포근한 속귀와 앙증맞은 주둥이 코,\n스티치까지 사랑스러운 곰돌이 모자", color: "#92400e" },
    { id: "devil_horn", name: "꼬마 악마뿔", price: 5100, grade: "A", desc: "강렬한 곡선 뿔과 마디 음영이 돋보이는\n락 스피릿 붉은 악마 뿔 머리띠", color: "#e11d48" },
    { id: "sun_hat", name: "태양모자", price: 5400, grade: "A", desc: "사방으로 눈부신 황금빛 햇살이\n반짝반짝 빛나는 태양 크라운 모자", color: "#f59e0b" },
    { id: "star_hat", name: "별 모자", price: 5800, grade: "A", desc: "밤하늘 별빛 비니 위에 커다란\n황금 왕별이 반짝이는 스페셜 모자", color: "#eab308" },
    { id: "punk_mohawk", name: "펑키스타일", price: 6600, grade: "S", desc: "뾰족뾰족 강렬한 네온 스파이크와\n스터드 밴드가 솟구친 락 펑키 스타일", color: "#ec4899" },
    { id: "tree_hat", name: "트리 모자", price: 7500, grade: "S", desc: "반짝이는 오너먼트와 꼭대기 황금 별이\n장식된 홀리데이 크리스마스 트리 모자", color: "#16a34a" },
    { id: "royal_crown", name: "보석 왕관", price: 8800, grade: "S", desc: "뾰족한 끝마다 영롱한 사파이어·루비가\n반짝이는 클래식 골드 왕관", color: "#fbbf24" },
    { id: "crown", name: "음악왕 왕관", price: 10000, grade: "S", desc: "가요계 모든 문제를 정복한 절대강자의\n루비·에메랄드 풀세팅 황금 왕관", color: "#f59e0b" }
  ],
  face: [
    { id: "default", name: "기본 미소", price: 0, grade: "C", desc: "초롱초롱한 눈망울과 보는 사람까지\n기분 좋아지는 동글동글 기본 미소" },
    { id: "surprised", name: "오잉? 놀람 (:o)", price: 1000, grade: "B", desc: "깜짝 놀라 올라간 눈썹과 동그래진 눈,\n앙증맞은 오 모양 입의 귀여운 얼굴" },
    { id: "square_glass", name: "뿔테 안경", price: 1300, grade: "B", desc: "음악 지식과 비하인드를 모두 꿰뚫고 있는\n척척박사 네모 뿔테 안경" },
    { id: "wink", name: "심쿵 윙크", price: 1600, grade: "B", desc: "무대 엔딩요정처럼 상큼하게 한쪽 눈을\n찡긋 감고 하트를 날리는 심쿵 얼굴" },
    { id: "big_smile", name: "해맑은 웃음 (:D)", price: 1900, grade: "B", desc: "세상 행복하게 입을 크게 벌리고\n해맑게 웃는 에너자이저 얼굴" },
    { id: "cat_face", name: "고양이 입 (:3)", price: 2300, grade: "B", desc: "분홍 코와 귀여운 수염, 앙증맞은\n고양이 입(:3)이 매력적인 얼굴" },
    { id: "swirl_glass", name: "골뱅이 안경", price: 2700, grade: "B", desc: "빙글뱅글 어지러워~!\n코믹 지수 200% 동글 골뱅이 안경" },
    { id: "xd_laugh", name: "빵터짐 (>▽<)", price: 3100, grade: "A", desc: "너무 웃겨서 눈을 꼭 찡그리고\n눈물 날 만큼 활짝 웃는 빵터짐 얼굴" },
    { id: "wink_kiss", name: "쪽~ 윙크 (;3)", price: 3500, grade: "A", desc: "애교 만점 윙크와 뾰족 쪽~ 입술로\n팬심을 사로잡는 아이돌 페이스" },
    { id: "sunglass", name: "힙합 선글라스", price: 3900, grade: "A", desc: "날렵한 각도와 은은한 사선 반사광이\n매력적인 연예인 블랙 선글라스" },
    { id: "battle_scar", name: "상처", price: 4300, grade: "A", desc: "눈가의 카리스마 X자 흉터와 볼 위\n귀여운 반창고가 포인트인 터프 페이스" },
    { id: "heart_eyes", name: "하트 뿅뿅눈", price: 4700, grade: "A", desc: "최애 가수를 만난 듯 두 눈에\n반짝이는 빨간 하트가 뿅뿅 뜨는 얼굴", color: "#f43f5e" },
    { id: "tough_beard", name: "터프 수염", price: 5200, grade: "A", desc: "짙은 눈썹 아래 멋스럽게 말아 올린\n카리스마 만점 터프 콧수염 & 턱수염" },
    { id: "dragonfly_glass", name: "잠자리안경", price: 5700, grade: "A", desc: "얼굴의 반을 뒤덮을 만큼 엄청나게 큰\n복고 감성 초대형 잠자리 선글라스" },
    { id: "neon_visor", name: "사이버 고글", price: 6400, grade: "S", desc: "미래에서 온 일렉트로닉 뮤지션!\n시안 레이저 네온 바이저 고글", color: "#38bdf8" },
    { id: "star_eyes", name: "슈퍼스타 별눈", price: 7200, grade: "S", desc: "눈동자 속에서 황금별이 반짝이는\n진정한 톱스타의 눈빛", color: "#facc15" },
    { id: "frog_eyes", name: "개구리 눈", price: 8000, grade: "S", desc: "머리 위로 툭 튀어나온 동글동글 왕눈이\n개구리 눈과 개굴개굴 싱긋 미소" },
    { id: "santa_beard", name: "산타 수염", price: 8900, grade: "S", desc: "반짝이는 빨간 코와 얼굴 하단을 포근하게\n감싸는 구름 같은 순백 산타 수염" },
    { id: "phantom_mask", name: "가면", price: 9800, grade: "S", desc: "황금 깃털과 루비 보석이 장식된\n신비로운 오페라 무도회 하프 가면" }
  ],
  outfit: [
    { id: "basic", name: "빨간 망토티", price: 0, grade: "C", desc: "빨간 목 스카프 망토와 흰 포켓이 달린\n귀여운 시그니처 모험가 티셔츠", main: "#ef4444", sub: "#ffffff" },
    { id: "overalls", name: "캔디 멜빵룩", price: 1300, grade: "B", desc: "상큼한 노란 티셔츠 위에 황금 단추가 달린\n90년대 감성 복고 데님 청멜빵", main: "#facc15", sub: "#2563eb" },
    { id: "hoodie_mint", name: "스트릿 후드티", price: 1900, grade: "B", desc: "후드 끈과 캥거루 앞주머니, 소매 시보리가\n살아있는 힙한 민트 오버핏 후드티", main: "#14b8a6", sub: "#f8fafc" },
    { id: "uniform", name: "명문고 교복", price: 2600, grade: "B", desc: "깔끔한 와이셔츠 깃과 빨간 넥타이,\n금장 배지가 달린 하이틴 스쿨 블레이저", main: "#1e293b", sub: "#ef4444" },
    { id: "denim_90s", name: "90s 청청 힙합", price: 3200, grade: "A", desc: "데님 카라, 주머니 스티치, 레트로 체인이\n포인트인 90년대 힙합 청청 자켓", main: "#3b82f6", sub: "#fef08a" },
    { id: "rock_leather", name: "락스타 가죽자켓", price: 3800, grade: "A", desc: "사선 실버 지퍼와 레드 이너티, 메탈 스터드가\n돋보이는 강렬한 락스타 라이더 자켓", main: "#18181b", sub: "#e11d48" },
    { id: "plumber_outfit", name: "배관공", price: 4500, grade: "A", desc: "빨간 긴팔 티셔츠에 두툼한 청멜빵 바지와\n큼직한 황금 단추 두 개를 단 배관공 룩", main: "#ef4444", sub: "#2563eb" },
    { id: "kindergarten_outfit", name: "5살유치원", price: 5100, grade: "A", desc: "강렬한 레드 반팔 티셔츠와 샛노란 반바지!\n어디서나 장난기 폭발하는 유치원 룩", main: "#ef4444", sub: "#facc15" },
    { id: "pajama_outfit", name: "파자마", price: 5700, grade: "A", desc: "부드러운 민트 파스텔 바탕에 동글·세모·네모\n도형 패턴이 가득한 최애 꿀잠 파자마", main: "#a7f3d0", sub: "#ffffff" },
    { id: "idol_suit", name: "아이돌 제복", price: 6300, grade: "S", desc: "어깨 황금 견장과 더블 금단추, 벨트까지\n시상식 대상을 휩쓸 화려한 스카이 제복", main: "#0284c7", sub: "#facc15" },
    { id: "square_suit", name: "노란네모", price: 7100, grade: "S", desc: "단정한 화이트 칼라 셔츠에 빨간 넥타이,\n황금 버클 벨트와 브라운 반바지 슈트", main: "#fef08a", sub: "#78350f" },
    { id: "astronaut", name: "우주비행사 슈트", price: 7900, grade: "S", desc: "가슴 생명유지 계기판과 산소 라인이\n정교한 하이테크 우주비행사 아스트로 슈트", main: "#f1f5f9", sub: "#38bdf8" },
    { id: "bell_cat_outfit", name: "방울고양이", price: 8600, grade: "S", desc: "시원한 하늘색 슈트 위 흰 배 4차원 주머니와\n빨간 목걸이 황금 방울이 반짝이는 의상", main: "#0ea5e9", sub: "#ffffff" },
    { id: "princess_dress", name: "드레스", price: 9300, grade: "S", desc: "퍼프 소매와 허리 빅 리본, 2단 레이스 스커트가\n우아하게 퍼지는 로맨틱 프린세스 드레스", main: "#f472b6", sub: "#fdf2f8" },
    { id: "king_robe", name: "음악왕 망토", price: 10000, grade: "S", desc: "순백 털 카라 장식과 황금 왕관 브로치,\n바람에 휘날리는 임페리얼 로얄 골드 로브", main: "#b45309", sub: "#fde047" }
  ],
  acc: [
    { id: "none", name: "악기 미착용", price: 0, grade: "C", desc: "손에 아무것도 들지 않은\n가벼운 기본 상태" },
    { id: "mic_silver", name: "보컬 마이크", price: 0, grade: "C", desc: "촘촘한 메탈 그릴망과 스위치가 달린\n스튜디오 표준 유선 마이크", color: "#94a3b8" },
    { id: "tambourine", name: "별빛 탬버린", price: 400, grade: "C", desc: "노래방 분위기 메이커!\n흔들면 찰랑거리는 황금 징글 탬버린", color: "#facc15" },
    { id: "lollipop", name: "회오리 왕사탕", price: 1300, grade: "B", desc: "알록달록 달콤한 소용돌이 무늬가\n그려진 커다란 롤리팝 막대사탕", color: "#fb7185" },
    { id: "acoustic_guitar", name: "포크 통기타", price: 2200, grade: "B", desc: "감미로운 어쿠스틱 발라드에\n딱 어울리는 원목 어쿠스틱 통기타", color: "#d97706" },
    { id: "lightstick", name: "하트 응원봉", price: 3100, grade: "A", desc: "투명 돔 안에 하트가 빛나는\n공식 팬클럽 응원봉", color: "#ec4899" },
    { id: "bear_doll", name: "곰돌이 인형", price: 3400, grade: "A", desc: "귀여운 둥근 귀와 앙증맞은 표정의\n포근한 갈색 곰돌이 애착인형", color: "#b45309" },
    { id: "retro_fan", name: "선풍기", price: 3700, grade: "A", desc: "시원한 바람이 솔솔~ 그물망 안전가드와\n민트 회전 날개·조작 버튼까지 재현된 선풍기", color: "#38bdf8" },
    { id: "boombox", name: "마스터 붐박스", price: 4000, grade: "A", desc: "듀얼 우퍼와 카세트 데크가 달린\n스트릿 힙합 대형 라디오", color: "#334155" },
    { id: "smartphone", name: "최신 스마트폰", price: 4400, grade: "A", desc: "음악왕 랭킹과 가사를 확인하는\n블링블링 최신형 스마트폰", color: "#38bdf8" },
    { id: "keytar", name: "숄더 키타", price: 4700, grade: "A", desc: "어깨에 메고 건반을 연주하는\n신스팝 밴드 신디사이저", color: "#0ea5e9" },
    { id: "skull_mic", name: "해골", price: 5000, grade: "A", desc: "강렬한 락스피릿이 살아 숨쉬는\n메탈 스탠드 해골 스태프", color: "#f8fafc" },
    { id: "synth_keyboard", name: "키보드", price: 5400, grade: "A", desc: "흑백 건반과 이펙터 노브, LED 화면과\nX자 스탠드까지 갖춘 전자 키보드", color: "#1e293b" },
    { id: "saxophone", name: "재즈 색소폰", price: 5800, grade: "A", desc: "매혹적인 브라스 사운드!\n곡선이 우아한 황금 색소폰", color: "#f59e0b" },
    { id: "guitar", name: "스트랫 기타", price: 6400, grade: "S", desc: "6현 줄과 픽업까지 정교한\n체리레드 커스텀 일렉기타", color: "#dc2626" },
    { id: "snowboard", name: "스노우보드", price: 7100, grade: "S", desc: "눈꽃 결정 그래픽과 네온 스트라이프,\n바인딩 디테일이 살아있는 스노우보드", color: "#06b6d4" },
    { id: "dj_deck", name: "DJ 턴테이블", price: 7800, grade: "S", desc: "LP 스크래칭이 가능한\n네온 LED 클럽 DJ 믹서", color: "#38bdf8" },
    { id: "mic_gold", name: "황금 마이크", price: 8500, grade: "S", desc: "가왕의 목소리를 담아내는\n눈부신 24K 순금 마이크", color: "#facc15" },
    { id: "xmas_gift", name: "X-Mas 선물", price: 9200, grade: "S", desc: "선명한 레드 선물 상자에 큼직한\n황금 왕리본이 묶인 크리스마스 선물", color: "#dc2626" },
    { id: "trophy", name: "음악왕 트로피", price: 10000, grade: "S", desc: "1위 가수만 거머쥘 수 있는\n영광의 순금 음방 1위 트로피", color: "#fbbf24" }
  ],
  wing: [
    { id: "none", name: "날개 미착용", price: 0, grade: "C", desc: "등에 아무 날개도 달지 않은\n깔끔한 기본 상태" },
    { id: "wing_mosquito", name: "모기날개", price: 4000, grade: "C", desc: "앙증맞고 투명한 작은 모기 날개!\n가볍게 파닥거리는 귀여운 등 장식", color: "#cbd5e1" },
    { id: "wing_fly", name: "파리날개", price: 8000, grade: "B", desc: "무지갯빛 광택이 감도는 반투명 파리 날개!\n톡톡 튀는 개성 만점 날개", color: "#93c5fd" },
    { id: "wing_dragonfly", name: "잠자리날개", price: 12000, grade: "A", desc: "시원한 4장 날개맥이 뻗어있는\n청량한 에메랄드 잠자리 날개", color: "#38bdf8" },
    { id: "wing_fairy", name: "요정날개", price: 0, grade: "S+", purchasable: false, eventOnly: true, desc: "28일차 출석체크 한정판 S+ 날개!\n영롱한 핑크·골드 빛이 감도는 전설의 요정 날개", color: "#f472b6" }
  ],
  fishing_rod: [
    {
      id: "rod_c",
      name: "나무 낚싯대",
      price: 5000,
      grade: "C",
      expMultiplier: 1.05,
      color: "#b45309",
      desc: "소박하지만 튼튼한 입문용 대나무 낚싯대\n[낚시터 버프] 경험치 획득량 +5%"
    },
    {
      id: "rod_b",
      name: "카본 낚싯대",
      price: 10000,
      grade: "B",
      expMultiplier: 1.10,
      color: "#0284c7",
      desc: "가볍고 탄성이 뛰어난 중급 카본 릴 낚싯대\n[낚시터 버프] 경험치 획득량 +10%"
    },
    {
      id: "rod_a",
      name: "루비 낚싯대",
      price: 20000,
      grade: "A",
      expMultiplier: 1.20,
      color: "#e11d48",
      desc: "붉은 보석 가이드가 빛나는 상급 전문가 낚싯대\n[낚시터 버프] 경험치 획득량 +20%"
    },
    {
      id: "rod_s",
      name: "황금 낚싯대",
      price: 30000,
      grade: "S",
      expMultiplier: 1.30,
      color: "#facc15",
      desc: "전설의 낚시왕 전용 24K 황금 스피닝 낚싯대\n[낚시터 버프] 경험치 획득량 +30%"
    }
  ],
  fishing_bait: [
    {
      id: "bait_c",
      name: "지렁이 미끼",
      price: 200,
      grade: "C",
      consumable: true,
      cdMultiplier: 2.0,
      color: "#fb7185",
      desc: "30분당 1개 소모되는 싱싱한 지렁이 미끼\n[낚시터 버프] CD 획득량 +100% (2배)"
    },
    {
      id: "bait_b",
      name: "새우 미끼",
      price: 400,
      grade: "B",
      consumable: true,
      cdMultiplier: 3.0,
      color: "#f97316",
      desc: "30분당 1개 소모되는 특제 바닷새우 미끼\n[낚시터 버프] CD 획득량 +200% (3배)"
    },
    {
      id: "bait_a",
      name: "루어 미끼",
      price: 800,
      grade: "A",
      consumable: true,
      cdMultiplier: 5.0,
      color: "#38bdf8",
      desc: "30분당 1개 소모되는 반짝 루어 미끼\n[낚시터 버프] CD 획득량 +400% (5배)"
    },
    {
      id: "bait_s",
      name: "황금 떡밥",
      price: 1600,
      grade: "S",
      consumable: true,
      cdMultiplier: 9.0,
      color: "#facc15",
      desc: "30분당 1개 소모되는 전설의 황금 떡밥\n[낚시터 버프] CD 획득량 +800% (9배)"
    }
  ],
  special: [
    {
      id: "nickname_ticket",
      name: "✨ 닉네임 변경권",
      price: 20000,
      grade: "S",
      consumable: true,
      desc: "20,000 CD를 사용하여 내 계정의 닉네임을\n원하는 새 이름으로 즉시 변경합니다."
    },
    {
      id: "gender_ticket",
      name: "⚧️ 성별 변경권",
      price: 20000,
      grade: "S",
      consumable: true,
      desc: "20,000 CD를 사용하여 기본 캐릭터 성별을\n(남자 ↔ 여자) 즉시 전환합니다."
    }
  ]
};

let AVATAR_SHOP_ITEMS = JSON.parse(JSON.stringify(BASE_AVATAR_SHOP_ITEMS));

const AVATAR_CONFIG_KEY_BY_CAT = {
  bg: "bg",
  hair: "hair",
  hat: "hat",
  face: "face",
  outfit: "outfit",
  acc: "acc",
  wing: "wing",
  fishing_rod: "fishingRod",
  fishing_bait: "fishingBait"
};

const EQUIPPABLE_SHOP_CATS = ["bg", "hair", "hat", "face", "outfit", "acc", "wing", "fishing_rod", "fishing_bait"];

const DEFAULT_AVATAR_CONFIG = {
  gender: "male",
  bg: "meadow",
  hair: "default",
  hat: "none",
  face: "default",
  outfit: "basic",
  acc: "mic_silver",
  wing: "none",
  fishingRod: "none",
  fishingBait: "none"
};

function sanitizeAvatarConfigShape(config) {
  const cfg = { ...DEFAULT_AVATAR_CONFIG, ...(config || {}) };
  if (cfg.face === "singing") cfg.face = "default";
  ["bg", "hair", "hat", "face", "outfit", "acc", "wing"].forEach(cat => {
    const list = AVATAR_SHOP_ITEMS[cat] || [];
    if (list.length > 0 && !list.some(item => item.id === cfg[cat])) {
      cfg[cat] = DEFAULT_AVATAR_CONFIG[cat] || list[0].id;
    }
  });
  const rodList = AVATAR_SHOP_ITEMS.fishing_rod || [];
  if (cfg.fishingRod !== "none" && !rodList.some(item => item.id === cfg.fishingRod)) {
    cfg.fishingRod = "none";
  }
  const baitList = AVATAR_SHOP_ITEMS.fishing_bait || [];
  if (cfg.fishingBait !== "none" && !baitList.some(item => item.id === cfg.fishingBait)) {
    cfg.fishingBait = "none";
  }
  return cfg;
}

function applyServerShopCatalog(customCatalog, catalogVersion = 0) {
  if (!customCatalog || typeof customCatalog !== "object") return;
  if (Number(catalogVersion) < SHOP_CATALOG_VERSION) {
    return;
  }
  Object.keys(BASE_AVATAR_SHOP_ITEMS).forEach(cat => {
    const baseList = BASE_AVATAR_SHOP_ITEMS[cat] || [];
    const srvList = Array.isArray(customCatalog[cat]) ? customCatalog[cat] : [];
    const mergedMap = new Map(baseList.map(i => [i.id, { ...i }]));
    srvList.forEach(si => {
      if (!si || !si.id) return;
      if (cat === "face" && si.id === "singing") return;
      mergedMap.set(si.id, { ...(mergedMap.get(si.id) || {}), ...si });
    });
    AVATAR_SHOP_ITEMS[cat] = Array.from(mergedMap.values());
  });
}

function getItemById(category, id) {
  if (category === "fishing_rod" && (!id || id === "none")) {
    return { id: "none", name: "미착용", price: 0, grade: "C", expMultiplier: 1.0, desc: "낚싯대가 장착되어 있지 않습니다." };
  }
  if (category === "fishing_bait" && (!id || id === "none")) {
    return { id: "none", name: "미착용", price: 0, grade: "C", cdMultiplier: 1.0, desc: "미끼가 장착되어 있지 않습니다." };
  }
  const list = AVATAR_SHOP_ITEMS[category] || [];
  if (category === "face" && id === "singing") {
    return list.find(item => item.id === "default") || list[0];
  }
  return list.find(item => item.id === id) || list[0] || { id: "none", name: "없음", price: 0, grade: "C", desc: "" };
}

function fillRoundRect(ctx, x, y, w, h, radius, fill, stroke = null, strokeWidth = 7) {
  ctx.beginPath();
  if (typeof ctx.roundRect === "function") {
    ctx.roundRect(x, y, w, h, radius);
  } else {
    const r = Math.min(radius, Math.abs(w) / 2, Math.abs(h) / 2);
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }
  if (fill) {
    ctx.fillStyle = fill;
    ctx.fill();
  }
  if (stroke) {
    ctx.lineWidth = strokeWidth;
    ctx.strokeStyle = stroke;
    ctx.stroke();
  }
}

function drawStar(ctx, cx, cy, outerR, innerR, points = 5, fill = "#facc15", stroke = "#1e1b18", lineW = 4) {
  ctx.beginPath();
  for (let i = 0; i < points * 2; i++) {
    const r = i % 2 === 0 ? outerR : innerR;
    const ang = (i * Math.PI) / points - Math.PI / 2;
    const px = cx + Math.cos(ang) * r;
    const py = cy + Math.sin(ang) * r;
    if (i === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  }
  ctx.closePath();
  if (fill) {
    ctx.fillStyle = fill;
    ctx.fill();
  }
  if (stroke) {
    ctx.lineWidth = lineW;
    ctx.strokeStyle = stroke;
    ctx.lineJoin = "round";
    ctx.stroke();
  }
}

function drawHeart(ctx, cx, cy, size, fill = "#f43f5e", stroke = null, lineW = 3) {
  ctx.beginPath();
  ctx.moveTo(cx, cy + size * 0.55);
  ctx.bezierCurveTo(cx - size * 1.1, cy - size * 0.1, cx - size * 0.9, cy - size * 0.95, cx, cy - size * 0.35);
  ctx.bezierCurveTo(cx + size * 0.9, cy - size * 0.95, cx + size * 1.1, cy - size * 0.1, cx, cy + size * 0.55);
  ctx.closePath();
  if (fill) {
    ctx.fillStyle = fill;
    ctx.fill();
  }
  if (stroke) {
    ctx.lineWidth = lineW;
    ctx.strokeStyle = stroke;
    ctx.stroke();
  }
}

function drawSparkle(ctx, cx, cy, r = 10, fill = "#ffffff") {
  ctx.fillStyle = fill;
  ctx.beginPath();
  ctx.moveTo(cx, cy - r);
  ctx.quadraticCurveTo(cx, cy, cx + r, cy);
  ctx.quadraticCurveTo(cx, cy, cx, cy + r);
  ctx.quadraticCurveTo(cx, cy, cx - r, cy);
  ctx.quadraticCurveTo(cx, cy, cx, cy - r);
  ctx.closePath();
  ctx.fill();
}

// ============================================================================
// 정밀 악기 일러스트 드로잉 함수 (20종 전종 고디테일!)
// ============================================================================
function drawDetailedInstrument(ctx, accItem, cx, cy, scale = 1) {
  if (!accItem || accItem.id === "none") return;
  const outline = "#1e1b18";
  ctx.save();
  ctx.translate(cx, cy);
  ctx.scale(scale, scale);

  if (accItem.id === "mic_silver" || accItem.id === "mic_gold") {
    const isGold = accItem.id === "mic_gold";
    ctx.rotate(-0.22);
    fillRoundRect(ctx, -6, 42, 12, 14, 4, "#0f172a", outline, 3.5);
    ctx.fillStyle = isGold ? "#d97706" : "#334155";
    ctx.strokeStyle = outline;
    ctx.lineWidth = 4.5;
    ctx.beginPath();
    ctx.moveTo(-11, -6); ctx.lineTo(11, -6); ctx.lineTo(8, 44); ctx.lineTo(-8, 44);
    ctx.closePath(); ctx.fill(); ctx.stroke();
    fillRoundRect(ctx, -3, 8, 6, 14, 2, "#0f172a");
    fillRoundRect(ctx, -2, 10, 4, 6, 1, "#ef4444");

    const headGrad = ctx.createRadialGradient(-6, -26, 4, 0, -22, 24);
    headGrad.addColorStop(0, isGold ? "#fef08a" : "#f8fafc");
    headGrad.addColorStop(0.6, isGold ? "#facc15" : "#94a3b8");
    headGrad.addColorStop(1, isGold ? "#b45309" : "#475569");
    ctx.fillStyle = headGrad;
    ctx.beginPath(); ctx.arc(0, -22, 22, 0, Math.PI * 2); ctx.fill(); ctx.stroke();

    ctx.save();
    ctx.beginPath(); ctx.arc(0, -22, 20, 0, Math.PI * 2); ctx.clip();
    ctx.strokeStyle = isGold ? "rgba(146, 64, 14, 0.45)" : "rgba(15, 23, 42, 0.35)";
    ctx.lineWidth = 1.8;
    for (let i = -28; i <= 28; i += 7) {
      ctx.beginPath();
      ctx.moveTo(i, -45); ctx.lineTo(i + 18, 0);
      ctx.moveTo(i, 0); ctx.lineTo(i + 18, -45);
      ctx.stroke();
    }
    ctx.restore();
    fillRoundRect(ctx, -22, -25, 44, 6, 3, isGold ? "#fef08a" : "#e2e8f0", outline, 3.5);
  } else if (accItem.id === "guitar" || accItem.id === "acoustic_guitar") {
    const isAcoustic = accItem.id === "acoustic_guitar";
    ctx.rotate(-0.45);
    fillRoundRect(ctx, -7, -80, 14, 66, 3, isAcoustic ? "#78350f" : "#fde68a", outline, 4);
    ctx.strokeStyle = isAcoustic ? "#fde68a" : "#92400e";
    ctx.lineWidth = 1.6;
    for (let fy = -72; fy < -18; fy += 8) {
      ctx.beginPath(); ctx.moveTo(-6, fy); ctx.lineTo(6, fy); ctx.stroke();
    }
    ctx.fillStyle = isAcoustic ? "#78350f" : "#dc2626";
    ctx.strokeStyle = outline;
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(-8, -79); ctx.lineTo(-14, -104); ctx.lineTo(6, -109); ctx.lineTo(10, -79);
    ctx.closePath(); ctx.fill(); ctx.stroke();

    ctx.fillStyle = "#e2e8f0";
    for (let py = -102; py <= -84; py += 6.5) {
      ctx.beginPath(); ctx.arc(-16, py, 2.8, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    }

    const bodyGrad = ctx.createLinearGradient(-40, -25, 40, 55);
    if (isAcoustic) {
      bodyGrad.addColorStop(0, "#fbbf24");
      bodyGrad.addColorStop(0.5, "#d97706");
      bodyGrad.addColorStop(1, "#92400e");
    } else {
      bodyGrad.addColorStop(0, "#f87171");
      bodyGrad.addColorStop(0.3, "#dc2626");
      bodyGrad.addColorStop(1, "#7f1d1d");
    }
    ctx.fillStyle = bodyGrad;
    ctx.strokeStyle = outline;
    ctx.lineWidth = 4.5;
    ctx.beginPath();
    ctx.moveTo(-12, -20);
    ctx.bezierCurveTo(-34, -34, -40, -4, -26, 12);
    ctx.bezierCurveTo(-44, 26, -40, 62, 0, 64);
    ctx.bezierCurveTo(40, 62, 44, 26, 24, 12);
    ctx.bezierCurveTo(36, -2, 32, -28, 12, -18);
    ctx.closePath(); ctx.fill(); ctx.stroke();

    if (isAcoustic) {
      ctx.fillStyle = "#451a03"; ctx.strokeStyle = "#fef3c7"; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.arc(0, 12, 13, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
      fillRoundRect(ctx, -14, 34, 28, 8, 2, "#451a03", outline, 2);
    } else {
      ctx.fillStyle = "#ffffff"; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.ellipse(2, 20, 20, 28, 0.1, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
      fillRoundRect(ctx, -10, 4, 20, 5, 2, "#1e293b");
      fillRoundRect(ctx, -10, 14, 20, 5, 2, "#1e293b");
      fillRoundRect(ctx, -10, 24, 20, 5, 2, "#1e293b");
      fillRoundRect(ctx, -12, 38, 24, 9, 2, "#94a3b8", outline, 2.5);
    }

    ctx.strokeStyle = "rgba(241, 245, 249, 0.92)";
    ctx.lineWidth = 1.1;
    for (let sx = -4; sx <= 4; sx += 2.6) {
      ctx.beginPath(); ctx.moveTo(sx, -78); ctx.lineTo(sx, 36); ctx.stroke();
    }
  } else if (accItem.id === "lightstick") {
    ctx.rotate(-0.18);
    ctx.strokeStyle = "#f472b6"; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.arc(0, 52, 8, 0, Math.PI * 2); ctx.stroke();
    fillRoundRect(ctx, -9, 0, 18, 48, 8, "#ffffff", outline, 4);
    fillRoundRect(ctx, -12, -6, 24, 9, 4, "#fb7185", outline, 3.5);
    fillRoundRect(ctx, -3, 14, 6, 6, 3, "#ec4899");

    const domeGrad = ctx.createRadialGradient(-8, -32, 4, 0, -28, 30);
    domeGrad.addColorStop(0, "rgba(255, 255, 255, 0.95)");
    domeGrad.addColorStop(0.5, "rgba(251, 207, 232, 0.78)");
    domeGrad.addColorStop(1, "rgba(244, 114, 182, 0.88)");
    ctx.fillStyle = domeGrad; ctx.strokeStyle = outline; ctx.lineWidth = 4.5;
    ctx.beginPath(); ctx.arc(0, -28, 28, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    drawHeart(ctx, 0, -27, 13, "#e11d48", outline, 2);
  } else if (accItem.id === "keytar") {
    ctx.rotate(-0.32);
    fillRoundRect(ctx, -40, -22, 80, 44, 12, "#0284c7", outline, 4.5);
    fillRoundRect(ctx, -64, -10, 26, 20, 6, "#0369a1", outline, 4);
    fillRoundRect(ctx, -32, -15, 26, 8, 3, "#0f172a");
    fillRoundRect(ctx, -30, -13, 14, 4, 1, "#38bdf8");
    fillRoundRect(ctx, -32, -2, 64, 19, 3, "#ffffff", outline, 3);
    ctx.strokeStyle = outline; ctx.lineWidth = 1.5;
    for (let kx = -24; kx < 28; kx += 8) {
      ctx.beginPath(); ctx.moveTo(kx, -2); ctx.lineTo(kx, 17); ctx.stroke();
    }
    for (let bkx = -27; bkx < 22; bkx += 8) {
      if (bkx === -3 || bkx === 13) continue;
      fillRoundRect(ctx, bkx, -2, 5, 10, 1, "#0f172a");
    }
  } else if (accItem.id === "boombox") {
    ctx.strokeStyle = "#64748b"; ctx.lineWidth = 3.5;
    ctx.beginPath(); ctx.moveTo(22, -24); ctx.lineTo(38, -56); ctx.stroke();
    fillRoundRect(ctx, -28, -34, 56, 12, 5, "#94a3b8", outline, 4);
    fillRoundRect(ctx, -46, -24, 92, 58, 10, "#334155", outline, 4.5);
    fillRoundRect(ctx, -40, -18, 80, 12, 4, "#0f172a");
    [-25, 25].forEach(sx => {
      ctx.fillStyle = "#0f172a"; ctx.strokeStyle = "#94a3b8"; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.arc(sx, 11, 15, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
      ctx.fillStyle = "#475569";
      ctx.beginPath(); ctx.arc(sx, 11, 6, 0, Math.PI * 2); ctx.fill();
    });
    fillRoundRect(ctx, -9, 2, 18, 16, 3, "#facc15", outline, 2.5);
  } else if (accItem.id === "tambourine") {
    ctx.rotate(-0.2);
    ctx.strokeStyle = "#d97706"; ctx.lineWidth = 14;
    ctx.beginPath(); ctx.arc(0, 0, 34, 0, Math.PI * 2); ctx.stroke();
    ctx.strokeStyle = outline; ctx.lineWidth = 4;
    ctx.beginPath(); ctx.arc(0, 0, 41, 0, Math.PI * 2); ctx.stroke();
    ctx.beginPath(); ctx.arc(0, 0, 27, 0, Math.PI * 2); ctx.stroke();
    ctx.fillStyle = "#fef08a";
    ctx.beginPath(); ctx.arc(0, 0, 26, 0, Math.PI * 2); ctx.fill();
    drawStar(ctx, 0, 0, 14, 6, 5, "#f59e0b", outline, 2.5);
    for (let a = 0; a < 6; a++) {
      const ang = (a / 6) * Math.PI * 2;
      fillRoundRect(ctx, Math.cos(ang) * 34 - 5, Math.sin(ang) * 34 - 5, 10, 10, 5, "#e2e8f0", outline, 2.5);
    }
  } else if (accItem.id === "saxophone") {
    ctx.rotate(0.15);
    ctx.strokeStyle = outline; ctx.lineWidth = 20; ctx.lineCap = "round";
    ctx.beginPath(); ctx.moveTo(-24, -46); ctx.lineTo(-4, -36); ctx.lineTo(-4, 24);
    ctx.arc(14, 24, 18, Math.PI, 0, true); ctx.lineTo(32, -4); ctx.stroke();
    ctx.strokeStyle = "#facc15"; ctx.lineWidth = 12;
    ctx.beginPath(); ctx.moveTo(-24, -46); ctx.lineTo(-4, -36); ctx.lineTo(-4, 24);
    ctx.arc(14, 24, 18, Math.PI, 0, true); ctx.lineTo(32, -4); ctx.stroke();
    ctx.fillStyle = "#fef08a"; ctx.strokeStyle = outline; ctx.lineWidth = 4;
    ctx.beginPath(); ctx.ellipse(32, -8, 16, 7, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
  } else if (accItem.id === "dj_deck") {
    fillRoundRect(ctx, -46, -28, 92, 56, 8, "#1e293b", outline, 4.5);
    [-23, 23].forEach(lx => {
      ctx.fillStyle = "#090d16"; ctx.strokeStyle = "#38bdf8"; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.arc(lx, 0, 17, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
      ctx.fillStyle = "#f43f5e";
      ctx.beginPath(); ctx.arc(lx, 0, 5, 0, Math.PI * 2); ctx.fill();
    });
    fillRoundRect(ctx, -4, -16, 8, 32, 3, "#475569");
    fillRoundRect(ctx, -6, 2, 12, 6, 2, "#fde047");
  } else if (accItem.id === "trophy") {
    fillRoundRect(ctx, -18, 28, 36, 14, 4, "#78350f", outline, 4);
    fillRoundRect(ctx, -6, 12, 12, 18, 2, "#f59e0b", outline, 3.5);
    ctx.fillStyle = "#facc15"; ctx.strokeStyle = outline; ctx.lineWidth = 4.5;
    ctx.beginPath();
    ctx.moveTo(-24, -34); ctx.lineTo(24, -34); ctx.lineTo(14, 14); ctx.lineTo(-14, 14);
    ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.strokeStyle = "#facc15"; ctx.lineWidth = 5;
    ctx.beginPath(); ctx.arc(-24, -14, 11, Math.PI * 0.5, Math.PI * 1.5); ctx.stroke();
    ctx.beginPath(); ctx.arc(24, -14, 11, -Math.PI * 0.5, Math.PI * 0.5); ctx.stroke();
    ctx.fillStyle = "#ef4444"; ctx.font = "900 18px sans-serif"; ctx.textAlign = "center";
    ctx.fillText("1", 0, -4);
  } else if (accItem.id === "lollipop") {
    ctx.rotate(-0.18);
    fillRoundRect(ctx, -4, 4, 8, 52, 4, "#f8fafc", outline, 3.5);
    ctx.fillStyle = "#fb7185"; ctx.strokeStyle = outline; ctx.lineWidth = 4.5;
    ctx.beginPath(); ctx.arc(0, -20, 28, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    ctx.strokeStyle = "#fff1f2"; ctx.lineWidth = 4.5; ctx.lineCap = "round";
    ctx.beginPath();
    for (let t = 0; t < 3.6 * Math.PI; t += 0.25) {
      const r = t * 2.1;
      const px = Math.cos(t) * r;
      const py = -20 + Math.sin(t) * r;
      if (t === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
    }
    ctx.stroke();
  } else if (accItem.id === "bear_doll") {
    ctx.rotate(0.1);
    ctx.fillStyle = "#b45309"; ctx.strokeStyle = outline; ctx.lineWidth = 4;
    ctx.beginPath(); ctx.arc(-18, -38, 11, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    ctx.beginPath(); ctx.arc(18, -38, 11, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    fillRoundRect(ctx, -20, -2, 40, 38, 18, "#b45309", outline, 4);
    fillRoundRect(ctx, -11, 6, 22, 22, 10, "#fde68a");
    ctx.fillStyle = "#b45309"; ctx.beginPath(); ctx.arc(0, -22, 23, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    fillRoundRect(ctx, -10, -20, 20, 14, 7, "#fde68a");
    ctx.fillStyle = outline;
    ctx.beginPath(); ctx.arc(-8, -28, 3, 0, Math.PI * 2); ctx.arc(8, -28, 3, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(0, -16, 4, 0, Math.PI * 2); ctx.fill();
  } else if (accItem.id === "smartphone") {
    ctx.rotate(-0.12);
    fillRoundRect(ctx, -22, -38, 44, 76, 10, "#1e293b", outline, 4.5);
    fillRoundRect(ctx, -17, -30, 34, 58, 6, "#38bdf8", "#0f172a", 2.5);
    ctx.fillStyle = "#ffffff";
    ctx.beginPath(); ctx.arc(0, -2, 9, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = "#0f172a"; ctx.font = "900 12px sans-serif"; ctx.textAlign = "center";
    ctx.fillText("♪", 0, 2);
    ctx.fillStyle = "#94a3b8";
    ctx.beginPath(); ctx.arc(0, 33, 3, 0, Math.PI * 2); ctx.fill();
  } else if (accItem.id === "retro_fan") {
    // 선풍기: 스탠드 받침 + 버튼 + 원형 그물망 가드 + 회전 날개 3엽
    fillRoundRect(ctx, -24, 34, 48, 15, 7, "#0284c7", outline, 4);
    fillRoundRect(ctx, -12, 37, 8, 6, 2, "#f8fafc", outline, 2);
    fillRoundRect(ctx, 4, 37, 8, 6, 2, "#facc15", outline, 2);
    fillRoundRect(ctx, -6, 10, 12, 26, 4, "#e2e8f0", outline, 4);
    const fanGrad = ctx.createRadialGradient(-8, -22, 4, 0, -18, 34);
    fanGrad.addColorStop(0, "#e0f2fe");
    fanGrad.addColorStop(1, "#bae6fd");
    ctx.fillStyle = fanGrad; ctx.strokeStyle = outline; ctx.lineWidth = 4.5;
    ctx.beginPath(); ctx.arc(0, -18, 33, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    // 회전 날개 3엽
    ctx.fillStyle = "#38bdf8"; ctx.strokeStyle = "#0369a1"; ctx.lineWidth = 2.5;
    for (let i = 0; i < 3; i++) {
      ctx.save();
      ctx.translate(0, -18);
      ctx.rotate((i * Math.PI * 2) / 3 + 0.3);
      ctx.beginPath();
      ctx.ellipse(0, -14, 8, 14, 0, 0, Math.PI * 2);
      ctx.fill(); ctx.stroke();
      ctx.restore();
    }
    // 보호 망창살
    ctx.strokeStyle = "rgba(30, 27, 24, 0.35)"; ctx.lineWidth = 1.6;
    ctx.beginPath(); ctx.arc(0, -18, 22, 0, Math.PI * 2); ctx.stroke();
    for (let a = 0; a < 8; a++) {
      const ang = (a / 8) * Math.PI * 2;
      ctx.beginPath();
      ctx.moveTo(0, -18);
      ctx.lineTo(Math.cos(ang) * 32, -18 + Math.sin(ang) * 32);
      ctx.stroke();
    }
    ctx.fillStyle = "#0284c7"; ctx.strokeStyle = outline; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.arc(0, -18, 7, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
  } else if (accItem.id === "skull_mic") {
    // 해골 스태프/마이크 스탠드
    ctx.rotate(-0.15);
    fillRoundRect(ctx, -5, -4, 10, 56, 4, "#475569", outline, 4);
    fillRoundRect(ctx, -16, 46, 32, 10, 4, "#1e293b", outline, 3.5);
    // 해골 턱뼈
    fillRoundRect(ctx, -14, -10, 28, 16, 6, "#f8fafc", outline, 4);
    ctx.strokeStyle = outline; ctx.lineWidth = 2.5;
    for (let tx = -7; tx <= 7; tx += 7) {
      ctx.beginPath(); ctx.moveTo(tx, -2); ctx.lineTo(tx, 6); ctx.stroke();
    }
    // 해골 두개골
    ctx.fillStyle = "#ffffff"; ctx.strokeStyle = outline; ctx.lineWidth = 4.5;
    ctx.beginPath(); ctx.arc(0, -26, 24, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    // 눈 구멍 + 붉은 록 하이라이트 + 코
    ctx.fillStyle = "#0f172a";
    ctx.beginPath(); ctx.ellipse(-9, -25, 6.5, 8, -0.15, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.ellipse(9, -25, 6.5, 8, 0.15, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = "#f43f5e";
    ctx.beginPath(); ctx.arc(-9, -25, 2.2, 0, Math.PI * 2); ctx.arc(9, -25, 2.2, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = outline;
    ctx.beginPath(); ctx.moveTo(0, -18); ctx.lineTo(-4, -11); ctx.lineTo(4, -11); ctx.closePath(); ctx.fill();
    // 옆 X자 뼈
    ctx.fillStyle = "#e2e8f0"; ctx.strokeStyle = outline; ctx.lineWidth = 3;
    drawStar(ctx, 16, -42, 8, 3.5, 4, "#facc15", outline, 2);
  } else if (accItem.id === "synth_keyboard") {
    // 키보드 (X스탠드 + LED + 건반)
    ctx.strokeStyle = outline; ctx.lineWidth = 7; ctx.lineCap = "round";
    ctx.beginPath(); ctx.moveTo(-28, 10); ctx.lineTo(26, 48); ctx.moveTo(28, 10); ctx.lineTo(-26, 48); ctx.stroke();
    ctx.strokeStyle = "#64748b"; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.moveTo(-28, 10); ctx.lineTo(26, 48); ctx.moveTo(28, 10); ctx.lineTo(-26, 48); ctx.stroke();
    fillRoundRect(ctx, -46, -24, 92, 38, 7, "#1e293b", outline, 4.5);
    fillRoundRect(ctx, -38, -19, 28, 8, 2, "#0f172a");
    fillRoundRect(ctx, -35, -17, 16, 4, 1, "#38bdf8");
    [-2, 10, 22, 34].forEach((kx, i) => {
      ctx.fillStyle = i % 2 === 0 ? "#f43f5e" : "#facc15";
      ctx.beginPath(); ctx.arc(kx, -15, 3, 0, Math.PI * 2); ctx.fill();
    });
    fillRoundRect(ctx, -40, -7, 80, 17, 3, "#ffffff", outline, 2.5);
    ctx.strokeStyle = outline; ctx.lineWidth = 1.4;
    for (let x = -30; x <= 30; x += 10) {
      ctx.beginPath(); ctx.moveTo(x, -7); ctx.lineTo(x, 10); ctx.stroke();
    }
    [-33, -23, -3, 7, 17, 27].forEach(bx => {
      fillRoundRect(ctx, bx, -7, 6, 10, 1, "#0f172a");
    });
  } else if (accItem.id === "snowboard") {
    // 스노우보드 (대각선 그래픽 + 바인딩 2개)
    ctx.rotate(-0.42);
    const sbGrad = ctx.createLinearGradient(-18, -62, 18, 62);
    sbGrad.addColorStop(0, "#0ea5e9");
    sbGrad.addColorStop(0.5, "#6366f1");
    sbGrad.addColorStop(1, "#ec4899");
    fillRoundRect(ctx, -18, -62, 36, 124, 18, sbGrad, outline, 4.5);
    // 스트라이프 & 눈꽃 마크
    ctx.strokeStyle = "#ffffff"; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.moveTo(-14, -40); ctx.lineTo(14, -18); ctx.moveTo(-14, 18); ctx.lineTo(14, 40); ctx.stroke();
    drawStar(ctx, 0, -44, 7, 2.5, 6, "#fef08a", outline, 1.5);
    drawStar(ctx, 0, 44, 7, 2.5, 6, "#fef08a", outline, 1.5);
    // 바인딩
    fillRoundRect(ctx, -15, -24, 30, 14, 4, "#0f172a", "#e2e8f0", 2);
    fillRoundRect(ctx, -15, 10, 30, 14, 4, "#0f172a", "#e2e8f0", 2);
  } else if (accItem.id === "xmas_gift") {
    // X-Mas 선물 (화려한 리본 상자)
    ctx.rotate(0.08);
    // 리본 윙
    ctx.fillStyle = "#facc15"; ctx.strokeStyle = outline; ctx.lineWidth = 4;
    ctx.beginPath(); ctx.ellipse(-15, -34, 14, 9, -0.35, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    ctx.beginPath(); ctx.ellipse(15, -34, 14, 9, 0.35, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    // 상자 본체 & 뚜껑
    fillRoundRect(ctx, -30, -18, 60, 56, 8, "#dc2626", outline, 4.5);
    fillRoundRect(ctx, -34, -28, 68, 16, 5, "#ef4444", outline, 4.5);
    // 황금/그린 교차 리본 띠
    fillRoundRect(ctx, -7, -28, 14, 66, 2, "#facc15", outline, 3);
    fillRoundRect(ctx, -30, 6, 60, 12, 2, "#16a34a", outline, 3);
    fillRoundRect(ctx, -8, -38, 16, 14, 6, "#fde047", outline, 3.5);
    drawSparkle(ctx, 26, -34, 6, "#ffffff");
  }

  ctx.restore();
}

// ============================================================================
// 1. 와이드 파노라마 배경 렌더러 (12종 전종 풀 일러스트 — 홈/상점/아이콘 공용!)
// ============================================================================
function renderApfWideBackground(ctx, W, H, bgItem, opts = {}) {
  const id = (bgItem && bgItem.id) || "meadow";
  const c = (bgItem && bgItem.colors) || ["#5ec8f8", "#aee4ff", "#76d32d", "#4d9e12"];
  const isThumb = !!opts.isThumb;
  const horizonY = H * (isThumb ? 0.60 : 0.58);

  const skyGrad = ctx.createLinearGradient(0, 0, 0, horizonY + 10);
  skyGrad.addColorStop(0, c[0]);
  skyGrad.addColorStop(1, c[1]);
  ctx.fillStyle = skyGrad;
  ctx.fillRect(0, 0, W, H);

  const drawCuteCloud = (cx, cy, s = 1, tint = "#ffffff", outlineCol = null) => {
    ctx.save();
    ctx.translate(cx, cy);
    ctx.scale(s * (W / 480), s * (W / 480));
    ctx.fillStyle = tint;
    ctx.beginPath();
    ctx.arc(-28, 6, 22, 0, Math.PI * 2);
    ctx.arc(0, -6, 28, 0, Math.PI * 2);
    ctx.arc(28, 6, 22, 0, Math.PI * 2);
    ctx.arc(0, 12, 24, 0, Math.PI * 2);
    ctx.fill();
    if (outlineCol) {
      ctx.strokeStyle = outlineCol; ctx.lineWidth = 3; ctx.stroke();
    }
    if (!isThumb) {
      ctx.fillStyle = "#fda4af";
      ctx.beginPath(); ctx.arc(-15, 7, 4.5, 0, Math.PI * 2); ctx.arc(15, 7, 4.5, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = "#475569"; ctx.lineWidth = 2.4; ctx.lineCap = "round";
      ctx.beginPath();
      ctx.moveTo(-11, 1); ctx.lineTo(-7, -2); ctx.lineTo(-3, 1);
      ctx.moveTo(3, 1); ctx.lineTo(7, -2); ctx.lineTo(11, 1);
      ctx.stroke();
    }
    ctx.restore();
  };

  if (id === "neon" || id === "midi_cyber") {
    // 콘서트 트러스 & 레이저 스포트라이트 / 미디 스튜디오 모니터 & EQ 스펙트럼
    ctx.save();
    ctx.fillStyle = "#090d16";
    ctx.fillRect(0, 0, W, H * 0.09);
    const beamColors = id === "neon"
      ? ["rgba(244, 63, 94, 0.28)", "rgba(56, 189, 248, 0.26)", "rgba(250, 204, 21, 0.22)"]
      : ["rgba(56, 189, 248, 0.24)", "rgba(168, 85, 247, 0.22)"];
    ctx.fillStyle = beamColors[0];
    ctx.beginPath(); ctx.moveTo(W * 0.16, 0); ctx.lineTo(W * 0.0, horizonY); ctx.lineTo(W * 0.36, horizonY); ctx.fill();
    ctx.fillStyle = beamColors[1];
    ctx.beginPath(); ctx.moveTo(W * 0.84, 0); ctx.lineTo(W * 0.64, horizonY); ctx.lineTo(W * 1.0, horizonY); ctx.fill();
    if (id === "neon") {
      // 메인 스테이지 트러스 조명
      [0.16, 0.5, 0.84].forEach((lx, i) => {
        ctx.fillStyle = ["#fb7185", "#fde047", "#38bdf8"][i];
        ctx.beginPath(); ctx.arc(W * lx, H * 0.09, W * 0.028, 0, Math.PI * 2); ctx.fill();
      });
    } else {
      // 미디 룸 양쪽 스피커 모니터 + 배경 스펙트럼 바
      [0.05, 0.81].forEach(sx => {
        fillRoundRect(ctx, W * sx, horizonY - H * 0.34, W * 0.14, H * 0.34, 6, "#1e293b", "#090d16", 2.5);
        ctx.fillStyle = "#0f172a"; ctx.strokeStyle = "#38bdf8"; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.arc(W * (sx + 0.07), horizonY - H * 0.22, W * 0.04, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
        ctx.beginPath(); ctx.arc(W * (sx + 0.07), horizonY - H * 0.1, W * 0.025, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
      });
    }
    const barCount = isThumb ? 8 : 14;
    for (let i = 0; i < barCount; i++) {
      const bx = W * (0.22 + (i / barCount) * 0.56);
      const bh = H * (0.08 + ((i * 37) % 10) * 0.018);
      ctx.fillStyle = id === "neon" ? "rgba(244, 63, 94, 0.48)" : "rgba(56, 189, 248, 0.55)";
      ctx.fillRect(bx, horizonY - bh, W * 0.026, bh);
    }
    ctx.restore();
  } else if (id === "hangang_night") {
    // 밤하늘 별 + 서울 빌딩 + N타워 + 한강 대교 아치 + 불꽃놀이
    ctx.fillStyle = "#fef08a";
    [[0.12, 0.14], [0.28, 0.22], [0.46, 0.1], [0.64, 0.18], [0.88, 0.15]].forEach(([rx, ry]) => {
      drawSparkle(ctx, W * rx, H * ry, W * 0.014, "#fef08a");
    });
    // 빌딩 숲 & N타워
    ctx.fillStyle = "#0f172a";
    [[0.04, 0.11, 0.22], [0.16, 0.09, 0.16], [0.27, 0.08, 0.12], [0.68, 0.1, 0.18], [0.80, 0.11, 0.26]].forEach(([bx, bw, bh]) => {
      ctx.fillRect(W * bx, horizonY - H * bh, W * bw, H * bh);
      ctx.fillStyle = "#fef08a";
      for (let wy = horizonY - H * bh + 8; wy < horizonY - 8; wy += 12) {
        ctx.fillRect(W * (bx + 0.02), wy, W * 0.02, 4);
        ctx.fillRect(W * (bx + 0.055), wy, W * 0.02, 4);
      }
      ctx.fillStyle = "#0f172a";
    });
    // 남산 타워 실루엣
    ctx.fillStyle = "#1e293b";
    ctx.fillRect(W * 0.57, horizonY - H * 0.28, W * 0.018, H * 0.28);
    ctx.fillRect(W * 0.555, horizonY - H * 0.24, W * 0.048, H * 0.045);
    ctx.fillRect(W * 0.576, horizonY - H * 0.36, W * 0.006, H * 0.09);
    // 불꽃놀이 2개
    [[0.22, 0.22, "#fb7185", 0.09], [0.78, 0.20, "#facc15", 0.11]].forEach(([fx, fy, col, rad]) => {
      ctx.strokeStyle = col; ctx.lineWidth = Math.max(1.8, W * 0.005);
      for (let a = 0; a < 10; a++) {
        const ang = (a / 10) * Math.PI * 2;
        ctx.beginPath();
        ctx.moveTo(W * fx + Math.cos(ang) * W * rad * 0.25, H * fy + Math.sin(ang) * W * rad * 0.25);
        ctx.lineTo(W * fx + Math.cos(ang) * W * rad, H * fy + Math.sin(ang) * W * rad);
        ctx.stroke();
      }
    });
  } else if (id === "galaxy") {
    // 은하수 & 유성 & 고리 달린 토성 행성 & 초승달
    const nebula = ctx.createRadialGradient(W * 0.5, H * 0.3, 10, W * 0.5, H * 0.3, W * 0.5);
    nebula.addColorStop(0, "rgba(168, 85, 247, 0.38)");
    nebula.addColorStop(1, "rgba(15, 23, 42, 0)");
    ctx.fillStyle = nebula; ctx.fillRect(0, 0, W, horizonY);

    [[0.12, 0.16], [0.22, 0.34], [0.36, 0.12], [0.58, 0.18], [0.72, 0.38], [0.9, 0.12], [0.48, 0.4]].forEach(([rx, ry], idx) => {
      drawSparkle(ctx, W * rx, H * ry, W * (idx % 2 === 0 ? 0.018 : 0.011), idx % 2 === 0 ? "#fef08a" : "#e0f2fe");
    });
    // 유성
    ctx.strokeStyle = "#fde047"; ctx.lineWidth = Math.max(2, W * 0.006);
    ctx.beginPath(); ctx.moveTo(W * 0.15, H * 0.15); ctx.lineTo(W * 0.3, H * 0.25); ctx.stroke();
    // 고리 토성
    ctx.save();
    ctx.translate(W * 0.8, H * 0.24);
    ctx.fillStyle = "#c084fc";
    ctx.beginPath(); ctx.arc(0, 0, W * 0.085, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = "#fde047"; ctx.lineWidth = Math.max(2.5, W * 0.012);
    ctx.beginPath(); ctx.ellipse(0, 2, W * 0.145, W * 0.036, -0.3, 0, Math.PI * 2); ctx.stroke();
    ctx.restore();
  } else if (id === "royal") {
    // 황금 음악왕성: 대리석 기둥 + 아치 궁전 창 + 샹들리에 + 레드카펫
    const wallGrad = ctx.createLinearGradient(0, 0, 0, horizonY);
    wallGrad.addColorStop(0, "#78350f");
    wallGrad.addColorStop(1, "#fef08a");
    ctx.fillStyle = wallGrad; ctx.fillRect(0, 0, W, horizonY);
    // 궁전 아치 창
    [0.28, 0.72].forEach(wx => {
      fillRoundRect(ctx, W * (wx - 0.07), H * 0.14, W * 0.14, horizonY - H * 0.14, W * 0.07, "#fef9c3", "#b45309", 3);
    });
    // 좌우 황금 기둥
    [0.06, 0.86].forEach(px => {
      fillRoundRect(ctx, W * px, 0, W * 0.08, horizonY, 2, "#fde047", "#92400e", 2.5);
      fillRoundRect(ctx, W * (px - 0.015), horizonY - 12, W * 0.11, 12, 3, "#f59e0b", "#78350f", 2);
    });
    // 중앙 샹들리에
    ctx.strokeStyle = "#b45309"; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.moveTo(W * 0.5, 0); ctx.lineTo(W * 0.5, H * 0.13); ctx.stroke();
    ctx.fillStyle = "#fde047"; ctx.strokeStyle = "#92400e"; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(W * 0.5, H * 0.16, W * 0.07, 0, Math.PI); ctx.fill(); ctx.stroke();
    [0.43, 0.5, 0.57].forEach(cx => {
      drawSparkle(ctx, W * cx, H * 0.11, W * 0.016, "#ffffff");
    });
  } else if (id === "retro_alley") {
    // 골목: 감성 붉은 벽돌 담벼락 + 가로등 + 전봇대 + 라이브 포스터
    // 왼쪽 붉은 벽돌 담벼락
    ctx.fillStyle = "#991b1b";
    ctx.fillRect(0, H * 0.12, W * 0.34, horizonY - H * 0.12);
    ctx.strokeStyle = "#7f1d1d"; ctx.lineWidth = 1.5;
    for (let y = H * 0.18; y < horizonY; y += H * 0.065) {
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W * 0.34, y); ctx.stroke();
    }
    fillRoundRect(ctx, 0, H * 0.1, W * 0.35, H * 0.03, 2, "#64748b", "#1e1b18", 2);
    // 벽보 포스터
    fillRoundRect(ctx, W * 0.09, H * 0.24, W * 0.13, H * 0.18, 2, "#fef08a", "#1e1b18", 2);
    fillRoundRect(ctx, W * 0.11, H * 0.27, W * 0.09, H * 0.06, 1, "#ef4444");
    // 오른쪽 전봇대 & 전선 + 노란 가로등 불빛
    ctx.fillStyle = "#334155";
    ctx.fillRect(W * 0.84, H * 0.04, W * 0.045, horizonY - H * 0.04);
    ctx.strokeStyle = "#0f172a"; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.moveTo(0, H * 0.08); ctx.quadraticCurveTo(W * 0.45, H * 0.18, W * 0.86, H * 0.08); ctx.stroke();
    const lampGlow = ctx.createRadialGradient(W * 0.78, H * 0.2, 2, W * 0.78, H * 0.2, W * 0.22);
    lampGlow.addColorStop(0, "rgba(253, 224, 71, 0.85)");
    lampGlow.addColorStop(1, "rgba(253, 224, 71, 0)");
    ctx.fillStyle = lampGlow; ctx.beginPath(); ctx.arc(W * 0.78, H * 0.2, W * 0.22, 0, Math.PI * 2); ctx.fill();
    fillRoundRect(ctx, W * 0.74, H * 0.17, W * 0.12, H * 0.025, 3, "#1e293b");
    ctx.fillStyle = "#fef08a";
    ctx.beginPath(); ctx.arc(W * 0.78, H * 0.20, W * 0.02, 0, Math.PI * 2); ctx.fill();
  } else if (id === "secret_basement") {
    // 지하실: 어두운 노출 벽돌 + 파이프 + 알전구 줄조명 + 빈티지 앰프
    ctx.strokeStyle = "rgba(0, 0, 0, 0.38)"; ctx.lineWidth = 2;
    for (let y = H * 0.08; y < horizonY; y += H * 0.09) {
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke();
    }
    ctx.fillStyle = "#78716c"; ctx.fillRect(0, H * 0.07, W, H * 0.03);
    // 알전구 줄조명
    ctx.strokeStyle = "#1c1917"; ctx.lineWidth = 2.5;
    ctx.beginPath(); ctx.moveTo(0, H * 0.12); ctx.quadraticCurveTo(W * 0.5, H * 0.24, W, H * 0.12); ctx.stroke();
    [0.16, 0.33, 0.5, 0.67, 0.84].forEach(bx => {
      const by = H * (0.12 + 0.06 * Math.sin(bx * Math.PI));
      const g = ctx.createRadialGradient(W * bx, by, 1, W * bx, by, W * 0.065);
      g.addColorStop(0, "#fef08a"); g.addColorStop(1, "rgba(253, 224, 71, 0)");
      ctx.fillStyle = g; ctx.beginPath(); ctx.arc(W * bx, by, W * 0.065, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = "#fef08a"; ctx.beginPath(); ctx.arc(W * bx, by, W * 0.016, 0, Math.PI * 2); ctx.fill();
    });
    // 좌측 빈티지 마샬 앰프 & 계단
    fillRoundRect(ctx, W * 0.06, horizonY - H * 0.24, W * 0.18, H * 0.24, 4, "#292524", "#090d16", 2.5);
    fillRoundRect(ctx, W * 0.08, horizonY - H * 0.19, W * 0.14, H * 0.16, 2, "#57534e");
    fillRoundRect(ctx, W * 0.08, horizonY - H * 0.22, W * 0.14, H * 0.025, 1, "#facc15");
    // 우측 벽 포스터
    fillRoundRect(ctx, W * 0.78, H * 0.26, W * 0.14, H * 0.19, 3, "#e11d48", "#1e1b18", 2.5);
    drawStar(ctx, W * 0.85, H * 0.35, W * 0.04, W * 0.018, 5, "#fef08a", null);
  } else if (id === "sunny_beach") {
    // 맑은 낮 해변: 태양 + 구름 + 파란 에메랄드 바다 + 하얀 파도 + 파라솔 & 야자
    ctx.fillStyle = "#fde047";
    ctx.beginPath(); ctx.arc(W * 0.84, H * 0.16, W * 0.065, 0, Math.PI * 2); ctx.fill();
    drawCuteCloud(W * 0.24, H * 0.18, 0.8);
    // 바다 물결층
    const seaTop = horizonY - H * 0.18;
    ctx.fillStyle = "#0284c7"; ctx.fillRect(0, seaTop, W, H * 0.18);
    ctx.fillStyle = "#38bdf8"; ctx.fillRect(0, seaTop + H * 0.08, W, H * 0.10);
    // 하얀 파도 거품
    ctx.fillStyle = "#ffffff";
    for (let x = 0; x <= W + 24; x += 28) {
      ctx.beginPath(); ctx.arc(x, horizonY, 15, Math.PI, 0); ctx.fill();
    }
    // 좌측 빨강-흰색 비치 파라솔
    ctx.strokeStyle = "#78350f"; ctx.lineWidth = 3.5;
    ctx.beginPath(); ctx.moveTo(W * 0.15, horizonY + 8); ctx.lineTo(W * 0.18, H * 0.30); ctx.stroke();
    ctx.fillStyle = "#ef4444"; ctx.strokeStyle = "#1e1b18"; ctx.lineWidth = 2.5;
    ctx.beginPath(); ctx.arc(W * 0.18, H * 0.34, W * 0.11, Math.PI, 0); ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.fillStyle = "#ffffff";
    ctx.beginPath(); ctx.moveTo(W * 0.18, H * 0.23); ctx.lineTo(W * 0.13, H * 0.34); ctx.lineTo(W * 0.23, H * 0.34); ctx.closePath(); ctx.fill();
  } else if (id === "sky_clouds") {
    // 구름 천국: 파스텔 무지개 아치 + 빛나는 반짝이 + 입체 뭉게구름 계단
    const rainbowCols = ["#fda4af", "#fdba74", "#fef08a", "#86efac", "#93c5fd"];
    rainbowCols.forEach((col, i) => {
      ctx.strokeStyle = col; ctx.lineWidth = Math.max(4, W * 0.025);
      ctx.beginPath();
      ctx.arc(W * 0.5, horizonY + H * 0.08, W * (0.44 - i * 0.024), Math.PI, 0);
      ctx.stroke();
    });
    drawCuteCloud(W * 0.18, H * 0.2, 0.85);
    drawCuteCloud(W * 0.82, H * 0.22, 0.8);
    drawSparkle(ctx, W * 0.35, H * 0.14, W * 0.018, "#ffffff");
    drawSparkle(ctx, W * 0.66, H * 0.12, W * 0.02, "#fef08a");
  } else {
    // 햇살 구름 / 벚꽃 / 노을 해변 / 초원
    drawCuteCloud(W * 0.2, H * 0.22, 0.92);
    drawCuteCloud(W * 0.8, H * 0.18, 0.84);

    if (id === "sakura") {
      // 벚꽃 나무 가지 & 꽃송이 + 흩날리는 꽃잎
      ctx.strokeStyle = "#78350f"; ctx.lineWidth = Math.max(4, W * 0.015); ctx.lineCap = "round";
      ctx.beginPath(); ctx.moveTo(0, H * 0.22); ctx.quadraticCurveTo(W * 0.16, H * 0.18, W * 0.28, H * 0.08); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(W, H * 0.26); ctx.quadraticCurveTo(W * 0.86, H * 0.2, W * 0.74, H * 0.1); ctx.stroke();
      [[0.07, 0.16], [0.16, 0.12], [0.24, 0.09], [0.82, 0.13], [0.92, 0.18]].forEach(([cx, cy], idx) => {
        ctx.fillStyle = idx % 2 === 0 ? "#fbcfe8" : "#f472b6";
        ctx.beginPath(); ctx.arc(W * cx, H * cy, W * 0.055, 0, Math.PI * 2); ctx.fill();
      });
      ctx.fillStyle = "#fce7f3";
      [[0.15, 0.42], [0.36, 0.29], [0.65, 0.35], [0.88, 0.44], [0.52, 0.22]].forEach(([px, py]) => {
        ctx.beginPath(); ctx.ellipse(W * px, H * py, W * 0.014, W * 0.008, 0.6, 0, Math.PI * 2); ctx.fill();
      });
    } else if (id === "sunset_beach") {
      // 석양 태양 + 바다 수면 반사 + 야자수 실루엣
      ctx.fillStyle = "#fde047";
      ctx.beginPath(); ctx.arc(W * 0.5, horizonY - H * 0.12, W * 0.095, Math.PI, 0); ctx.fill();
      ctx.fillStyle = "#0369a1"; ctx.fillRect(0, horizonY - H * 0.12, W, H * 0.12);
      ctx.fillStyle = "rgba(253, 224, 71, 0.65)";
      ctx.fillRect(W * 0.43, horizonY - H * 0.1, W * 0.14, H * 0.02);
      ctx.fillRect(W * 0.46, horizonY - H * 0.06, W * 0.08, H * 0.02);
      // 우측 야자수 실루엣
      ctx.strokeStyle = "#1e1b18"; ctx.lineWidth = Math.max(4, W * 0.016);
      ctx.beginPath(); ctx.moveTo(W * 0.9, horizonY); ctx.quadraticCurveTo(W * 0.94, H * 0.34, W * 0.86, H * 0.2); ctx.stroke();
      ctx.fillStyle = "#1e1b18";
      [-0.6, 0, 0.6].forEach(ang => {
        ctx.beginPath(); ctx.ellipse(W * 0.86 + Math.cos(ang) * W * 0.06, H * 0.2 + Math.sin(ang) * H * 0.04, W * 0.06, W * 0.015, ang, 0, Math.PI * 2); ctx.fill();
      });
    } else if (id === "meadow") {
      ctx.fillStyle = c[3];
      for (let x = 0; x <= W + 40; x += W * 0.11) {
        ctx.beginPath(); ctx.arc(x, horizonY, W * 0.07, 0, Math.PI * 2); ctx.fill();
      }
      fillRoundRect(ctx, 0, horizonY - H * 0.03, W, H * 0.02, 2, "#92400e", "#451a03", 1.5);
      for (let x = 8; x < W; x += W * 0.07) {
        fillRoundRect(ctx, x, horizonY - H * 0.06, W * 0.03, H * 0.07, 3, "#d97706", "#451a03", 1.5);
      }
    }
  }

  // 바닥 영역 렌더링 (배경별 전용 바닥 디테일)
  if (id === "sky_clouds") {
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, horizonY, W, H - horizonY);
    for (let x = 0; x <= W + 40; x += W * 0.14) {
      ctx.beginPath(); ctx.arc(x, horizonY, W * 0.09, 0, Math.PI * 2); ctx.fill();
    }
    ctx.fillStyle = "rgba(186, 230, 253, 0.55)";
    ctx.fillRect(0, H * 0.78, W, H * 0.22);
  } else {
    const lawnGrad = ctx.createLinearGradient(0, horizonY, 0, H);
    lawnGrad.addColorStop(0, c[2]);
    lawnGrad.addColorStop(1, c[3]);
    ctx.fillStyle = lawnGrad;
    ctx.fillRect(0, horizonY, W, H - horizonY);
  }

  if (id === "neon" || id === "midi_cyber") {
    ctx.strokeStyle = id === "neon" ? "rgba(251, 113, 133, 0.35)" : "rgba(56, 189, 248, 0.35)";
    ctx.lineWidth = 2;
    for (let x = 0; x <= W; x += W * 0.1) {
      ctx.beginPath(); ctx.moveTo(x, horizonY); ctx.lineTo(x + (x - W / 2) * 0.65, H); ctx.stroke();
    }
  } else if (id === "royal") {
    ctx.fillStyle = "#dc2626";
    ctx.beginPath();
    ctx.moveTo(W * 0.38, horizonY); ctx.lineTo(W * 0.62, horizonY);
    ctx.lineTo(W * 0.72, H); ctx.lineTo(W * 0.28, H); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = "#fde047"; ctx.lineWidth = 3; ctx.stroke();
  } else if (id === "hangang_night") {
    // 물빛 반사 라인
    ctx.fillStyle = "rgba(253, 224, 71, 0.45)";
    [0.2, 0.55, 0.78].forEach((rx, i) => {
      ctx.fillRect(W * rx, horizonY + H * (0.08 + i * 0.06), W * 0.08, 3);
    });
  } else if (id === "retro_alley") {
    // 아스팔트 중앙선 & 맨홀
    ctx.fillStyle = "#fde047";
    ctx.fillRect(W * 0.46, horizonY + H * 0.18, W * 0.08, 4);
    ctx.fillStyle = "#1e293b"; ctx.strokeStyle = "#64748b"; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.ellipse(W * 0.22, horizonY + H * 0.2, W * 0.06, H * 0.03, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
  } else if (id === "sunny_beach") {
    // 모래사장 위 귀여운 불가사리 & 조개
    drawStar(ctx, W * 0.8, horizonY + H * 0.16, W * 0.025, W * 0.01, 5, "#fb7185", "#1e1b18", 1.5);
  } else if (id === "meadow" || id === "sakura") {
    // 꽃잎 포인트
    const dotCol = id === "sakura" ? "#f9a8d4" : "#fef08a";
    ctx.fillStyle = dotCol;
    [[0.14, 0.72], [0.28, 0.85], [0.76, 0.74], [0.88, 0.84]].forEach(([fx, fy]) => {
      ctx.beginPath(); ctx.arc(W * fx, H * fy, W * 0.012, 0, Math.PI * 2); ctx.fill();
    });
  }

  if (id !== "sky_clouds") {
    ctx.strokeStyle = id === "royal" ? "#facc15" : "#1e1b18";
    ctx.lineWidth = Math.max(2, W * 0.006);
    ctx.beginPath(); ctx.moveTo(0, horizonY); ctx.lineTo(W, horizonY); ctx.stroke();
  }
}

// ============================================================================
// 고디테일 헤어 렌더러 (15종 개별 일러스트 — 뒷머리 / 앞머리 분리!)
// ============================================================================
function drawHairBack(ctx, hairItem) {
  const outline = "#1e1b18";
  const st = hairItem.style || "bowl";
  const hc = hairItem.color || "#27272a";

  if (st === "pink_twin" || st === "brown_twin" || st === "violet_twin") {
    // 양갈래 뒷머리 (각 스타일별 볼륨/리본/요정핀 완전 차별화!)
    ctx.strokeStyle = outline; ctx.lineWidth = 8.5;
    if (st === "pink_twin") {
      // 통통 튀는 구름형 핑크 양갈래 + 노란 별 머리끈
      const gL = ctx.createLinearGradient(50, 140, 110, 310);
      gL.addColorStop(0, "#f472b6"); gL.addColorStop(1, "#db2777");
      ctx.fillStyle = gL;
      [62, 344].forEach((bx, idx) => {
        const dir = idx === 0 ? -1 : 1;
        ctx.beginPath();
        ctx.moveTo(idx === 0 ? 114 : 366, 152);
        ctx.bezierCurveTo(bx + dir * 28, 165, bx + dir * 48, 250, bx + (idx === 0 ? 12 : 62), 305);
        ctx.bezierCurveTo(bx + 20, 320, bx + 55, 295, idx === 0 ? 122 : 358, 220);
        ctx.closePath(); ctx.fill(); ctx.stroke();
        drawStar(ctx, idx === 0 ? 105 : 375, 150, 16, 7, 5, "#fde047", outline, 5);
      });
    } else if (st === "brown_twin") {
      // 길고 풍성한 다크브라운 S컬 양갈래 + 빨간 리본
      ctx.fillStyle = hc;
      [56, 348].forEach((bx, idx) => {
        const cx = idx === 0 ? 84 : 396;
        ctx.beginPath();
        ctx.moveTo(idx === 0 ? 116 : 364, 156);
        ctx.bezierCurveTo(cx - 38, 195, cx + 32, 245, cx - 8, 326);
        ctx.bezierCurveTo(cx + 38, 316, cx + 24, 240, idx === 0 ? 122 : 358, 192);
        ctx.closePath(); ctx.fill(); ctx.stroke();
        fillRoundRect(ctx, idx === 0 ? 92 : 356, 144, 30, 16, 6, "#ef4444", outline, 5);
      });
    } else {
      // 보라빛 요정트윈: 그라데이션 긴 양갈래 + 반투명 요정 날개 핀
      [56, 352].forEach((bx, idx) => {
        const vg = ctx.createLinearGradient(0, 145, 0, 330);
        vg.addColorStop(0, "#9333ea"); vg.addColorStop(0.55, "#c084fc"); vg.addColorStop(1, "#f472b6");
        ctx.fillStyle = vg;
        const cx = idx === 0 ? 82 : 398;
        ctx.beginPath();
        ctx.moveTo(idx === 0 ? 114 : 366, 145);
        ctx.bezierCurveTo(cx - 42, 185, cx - 22, 290, cx + 10, 336);
        ctx.bezierCurveTo(cx + 38, 298, cx + 32, 200, idx === 0 ? 122 : 358, 178);
        ctx.closePath(); ctx.fill(); ctx.stroke();
        // 요정 날개 머리핀
        ctx.fillStyle = "rgba(224, 242, 254, 0.9)"; ctx.strokeStyle = outline; ctx.lineWidth = 4.5;
        ctx.beginPath();
        ctx.ellipse(idx === 0 ? 94 : 386, 134, 22, 11, idx === 0 ? -0.5 : 0.5, 0, Math.PI * 2);
        ctx.fill(); ctx.stroke();
      });
    }
  } else if (st === "braids") {
    // 삐삐머리: 양옆 땋은 3단 마디 + 고무줄 + 끝 붓실 (480px·썸네일 비짤림 정렬)
    [0, 1].forEach(idx => {
      const sign = idx === 0 ? -1 : 1;
      const startX = idx === 0 ? 116 : 364;
      ctx.save();
      ctx.translate(startX, 136);
      ctx.rotate(sign * 0.56);
      for (let seg = 0; seg < 3; seg++) {
        fillRoundRect(ctx, idx === 0 ? -28 - seg * 18 : 4 + seg * 18, -11, 22, 22, 10, hc, outline, 6.5);
      }
      const tieX = idx === 0 ? -74 : 62;
      fillRoundRect(ctx, tieX, -9, 13, 18, 5, "#f43f5e", outline, 4.5);
      ctx.fillStyle = hc; ctx.strokeStyle = outline; ctx.lineWidth = 5.5;
      ctx.beginPath();
      if (idx === 0) {
        ctx.moveTo(tieX, -3); ctx.lineTo(tieX - 18, -12); ctx.lineTo(tieX - 14, 12); ctx.lineTo(tieX, 3);
      } else {
        ctx.moveTo(tieX + 13, -3); ctx.lineTo(tieX + 31, -12); ctx.lineTo(tieX + 27, 12); ctx.lineTo(tieX + 13, 3);
      }
      ctx.closePath(); ctx.fill(); ctx.stroke();
      ctx.restore();
    });
  } else if (st === "ponytail") {
    ctx.fillStyle = hc; ctx.strokeStyle = outline; ctx.lineWidth = 9;
    ctx.beginPath();
    ctx.moveTo(260, 88);
    ctx.bezierCurveTo(352, 34, 412, 92, 376, 198);
    ctx.bezierCurveTo(348, 168, 326, 122, 256, 102);
    ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.strokeStyle = "rgba(255,255,255,0.28)"; ctx.lineWidth = 5; ctx.lineCap = "round";
    ctx.beginPath(); ctx.moveTo(318, 78); ctx.quadraticCurveTo(366, 98, 364, 144); ctx.stroke();
  } else if (st === "spiky") {
    // 뒷머리도 날카롭게 뻗친 샤기 울프컷
    ctx.fillStyle = "#dc2626"; ctx.strokeStyle = outline; ctx.lineWidth = 8.5;
    ctx.beginPath();
    ctx.moveTo(110, 152); ctx.lineTo(68, 130); ctx.lineTo(106, 114);
    ctx.lineTo(76, 78); ctx.lineTo(126, 92); ctx.lineTo(148, 46);
    ctx.lineTo(190, 82); ctx.lineTo(240, 38); ctx.lineTo(286, 82);
    ctx.lineTo(332, 46); ctx.lineTo(354, 92); ctx.lineTo(404, 78);
    ctx.lineTo(374, 114); ctx.lineTo(412, 130); ctx.lineTo(370, 152);
    ctx.closePath(); ctx.fill(); ctx.stroke();
  } else if (st === "perm") {
    // 몽글몽글 실버 프로듀서 S컬 펌 볼륨
    ctx.fillStyle = hc; ctx.strokeStyle = outline; ctx.lineWidth = 8;
    [[118, 138, 34], [148, 96, 36], [202, 78, 38], [278, 78, 38], [332, 96, 36], [362, 138, 34]].forEach(([px, py, pr]) => {
      ctx.beginPath(); ctx.arc(px, py, pr, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    });
  }
}

function drawHairFront(ctx, hairItem) {
  const outline = "#1e1b18";
  const st = hairItem.style || "bowl";
  const hc = hairItem.color || "#27272a";

  if (st === "monkey") {
    ctx.save();
    ctx.beginPath(); ctx.roundRect(112, 92, 256, 190, 92); ctx.clip();
    ctx.fillStyle = "#6b3410"; ctx.fillRect(100, 80, 280, 74);
    ctx.fillStyle = "#fffdf9";
    ctx.beginPath(); ctx.arc(195, 178, 65, 0, Math.PI * 2); ctx.arc(285, 178, 65, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
    fillRoundRect(ctx, 112, 92, 256, 190, 92, null, outline, 10);
    // 후드 스티치 + 머리 털 포인트
    ctx.strokeStyle = outline; ctx.lineWidth = 8; ctx.lineCap = "round";
    ctx.beginPath(); ctx.moveTo(232, 92); ctx.lineTo(220, 64); ctx.moveTo(246, 92); ctx.lineTo(258, 66); ctx.stroke();
    ctx.strokeStyle = "#fde68a"; ctx.lineWidth = 3; ctx.setLineDash([6, 6]);
    ctx.beginPath(); ctx.arc(240, 148, 86, Math.PI * 1.15, Math.PI * 1.85); ctx.stroke();
    ctx.setLineDash([]);
    return;
  }

  if (st === "bald") {
    // 매끈 광택 + 반짝 스파클
    ctx.strokeStyle = "#cbd5e1"; ctx.lineWidth = 6; ctx.lineCap = "round";
    ctx.beginPath(); ctx.moveTo(174, 118); ctx.quadraticCurveTo(205, 102, 238, 107); ctx.stroke();
    drawSparkle(ctx, 302, 108, 13, "#fde047");
    drawSparkle(ctx, 280, 94, 7, "#ffffff");
    return;
  }

  // 앞머리 클립 + 스타일별 개성 앞머리 컷팅!
  ctx.save();
  ctx.beginPath(); ctx.roundRect(112, 92, 256, 190, 92); ctx.clip();
  ctx.fillStyle = hc;
  ctx.strokeStyle = outline;
  ctx.lineWidth = 8.5;
  ctx.lineJoin = "round";

  if (st === "idol_blonde") {
    // 6:4 가르마 커튼 뱅 + 황금빛 하이라이트
    ctx.beginPath();
    ctx.moveTo(100, 76); ctx.lineTo(380, 76); ctx.lineTo(380, 162);
    ctx.quadraticCurveTo(320, 152, 252, 122);
    ctx.lineTo(240, 146);
    ctx.quadraticCurveTo(178, 158, 100, 162);
    ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.strokeStyle = "#fef9c3"; ctx.lineWidth = 5; ctx.lineCap = "round";
    ctx.beginPath(); ctx.moveTo(156, 116); ctx.quadraticCurveTo(192, 104, 224, 114); ctx.stroke();
  } else if (st === "comma") {
    // 시그니처 민트 C자 쉼표 앞머리!
    ctx.beginPath();
    ctx.moveTo(100, 76); ctx.lineTo(380, 76); ctx.lineTo(380, 146);
    ctx.quadraticCurveTo(318, 136, 266, 118);
    // 오른쪽에서 왼쪽 아래로 둥글게 말리는 쉼표 가닥
    ctx.bezierCurveTo(252, 148, 220, 174, 198, 162);
    ctx.bezierCurveTo(208, 145, 222, 130, 214, 122);
    ctx.quadraticCurveTo(154, 142, 100, 148);
    ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.strokeStyle = "#99f6e4"; ctx.lineWidth = 5; ctx.lineCap = "round";
    ctx.beginPath(); ctx.moveTo(278, 108); ctx.quadraticCurveTo(318, 106, 344, 120); ctx.stroke();
  } else if (st === "perm") {
    // 몽글몽글 구름 웨이브 앞머리
    ctx.beginPath();
    ctx.moveTo(100, 76); ctx.lineTo(380, 76); ctx.lineTo(380, 152);
    ctx.arc(328, 144, 34, 0, Math.PI, false);
    ctx.arc(262, 140, 34, 0, Math.PI, false);
    ctx.arc(196, 142, 34, 0, Math.PI, false);
    ctx.arc(136, 146, 32, 0, Math.PI, false);
    ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.strokeStyle = "#f8fafc"; ctx.lineWidth = 5; ctx.lineCap = "round";
    ctx.beginPath(); ctx.moveTo(188, 118); ctx.arc(204, 118, 16, Math.PI, 0); ctx.stroke();
  } else if (st === "spiky") {
    // 날카로운 불꽃 지그재그 샤기 앞머리
    ctx.beginPath();
    ctx.moveTo(100, 76); ctx.lineTo(380, 76); ctx.lineTo(380, 158);
    ctx.lineTo(334, 134); ctx.lineTo(304, 168); ctx.lineTo(266, 130);
    ctx.lineTo(240, 174); ctx.lineTo(210, 128); ctx.lineTo(174, 166);
    ctx.lineTo(142, 134); ctx.lineTo(100, 160);
    ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.strokeStyle = "#fde047"; ctx.lineWidth = 4; ctx.lineCap = "round";
    ctx.beginPath(); ctx.moveTo(200, 108); ctx.lineTo(240, 148); ctx.moveTo(280, 108); ctx.lineTo(298, 142); ctx.stroke();
  } else if (st === "pink_twin" || st === "brown_twin" || st === "violet_twin") {
    // 양갈래용 부드러운 하트/아치 분할 앞머리
    ctx.beginPath();
    ctx.moveTo(100, 76); ctx.lineTo(380, 76); ctx.lineTo(380, 156);
    ctx.quadraticCurveTo(308, 156, 268, 134);
    ctx.lineTo(240, 154);
    ctx.lineTo(212, 134);
    ctx.quadraticCurveTo(172, 156, 100, 156);
    ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.strokeStyle = "rgba(255,255,255,0.45)"; ctx.lineWidth = 5; ctx.lineCap = "round";
    ctx.beginPath(); ctx.moveTo(162, 112); ctx.quadraticCurveTo(200, 100, 224, 110); ctx.stroke();
  } else {
    // 깔끔한 바가지 / 포니테일 / 만두 / 삐삐 등
    ctx.beginPath();
    ctx.moveTo(100, 76); ctx.lineTo(380, 76); ctx.lineTo(380, 150);
    ctx.quadraticCurveTo(310, 146, 240, 148);
    ctx.quadraticCurveTo(170, 146, 100, 150);
    ctx.closePath(); ctx.fill(); ctx.stroke();
    // 머릿결 광택 하이라이트 (엔젤링!)
    ctx.strokeStyle = "rgba(255, 255, 255, 0.34)"; ctx.lineWidth = 5.5; ctx.lineCap = "round";
    ctx.beginPath(); ctx.moveTo(168, 116); ctx.quadraticCurveTo(210, 106, 252, 114); ctx.stroke();
  }
  ctx.restore();
  fillRoundRect(ctx, 112, 92, 256, 190, 92, null, outline, 10);

  // 머리 위 특수 헤어 포인트 (새싹 / 문어 / 포니테일 매듭 / 만두)
  if (st === "sprout") {
    fillRoundRect(ctx, 234, 48, 12, 46, 6, "#16a34a", outline, 6);
    ctx.fillStyle = "#4ade80"; ctx.strokeStyle = outline; ctx.lineWidth = 6;
    ctx.beginPath(); ctx.ellipse(212, 46, 28, 14, -0.35, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    ctx.beginPath(); ctx.ellipse(268, 46, 28, 14, 0.35, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    ctx.fillStyle = "#bae6fd"; ctx.beginPath(); ctx.arc(204, 42, 4.5, 0, Math.PI * 2); ctx.fill();
  } else if (st === "octo") {
    fillRoundRect(ctx, 165, 38, 150, 76, 38, "#ea580c", outline, 8);
    // 문어 눈 + 다리 빨판
    ctx.fillStyle = "#ffffff"; ctx.strokeStyle = outline; ctx.lineWidth = 4;
    ctx.beginPath(); ctx.arc(216, 74, 11, 0, Math.PI * 2); ctx.arc(264, 74, 11, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    ctx.fillStyle = outline; ctx.beginPath(); ctx.arc(218, 75, 5, 0, Math.PI * 2); ctx.arc(262, 75, 5, 0, Math.PI * 2); ctx.fill();
    fillRoundRect(ctx, 224, 92, 32, 20, 10, "#fed7aa", outline, 5);
    [174, 288].forEach(lx => {
      fillRoundRect(ctx, lx, 98, 20, 26, 9, "#ea580c", outline, 5);
    });
  } else if (st === "ponytail") {
    fillRoundRect(ctx, 242, 76, 30, 18, 8, "#f43f5e", outline, 6);
  } else if (st === "buns") {
    ctx.fillStyle = hc; ctx.strokeStyle = outline; ctx.lineWidth = 8.5;
    [146, 334].forEach(bx => {
      ctx.beginPath(); ctx.arc(bx, 84, 36, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
      ctx.strokeStyle = "rgba(255,255,255,0.28)"; ctx.lineWidth = 4.5;
      ctx.beginPath(); ctx.arc(bx, 84, 20, Math.PI * 0.9, Math.PI * 1.9); ctx.stroke();
      ctx.strokeStyle = outline; ctx.lineWidth = 8.5;
      fillRoundRect(ctx, bx - 18, 96, 36, 13, 6, "#f43f5e", outline, 5);
    });
  }
}

// ============================================================================
// 고디테일 의상 렌더러 (15종 전종 — 소매/카라/단추/드레스/멜빵/슈트/신발 공용!)
// ============================================================================
function drawDetailedOutfit(ctx, outfitItem, isFemale = false, opts = {}) {
  const id = (outfitItem && outfitItem.id) || "basic";
  const main = (outfitItem && outfitItem.main) || "#ef4444";
  const sub = (outfitItem && outfitItem.sub) || "#ffffff";
  const outline = "#1e1b18";
  const skin = "#fffdf9";
  const isThumb = !!opts.isThumb;

  // 1) 망토/후면 장식 (해당 의상 전용!)
  if (id === "king_robe") {
    fillRoundRect(ctx, 130, 266, 220, 122, 34, "#dc2626", outline, 8.5);
    fillRoundRect(ctx, 130, 364, 220, 22, 8, "#facc15", outline, 6.5);
  } else if (id === "basic") {
    ctx.fillStyle = "#ef4444"; ctx.strokeStyle = outline; ctx.lineWidth = 7.5;
    ctx.beginPath(); ctx.moveTo(240, 274); ctx.lineTo(318, 294); ctx.lineTo(298, 332); ctx.closePath();
    ctx.fill(); ctx.stroke();
  }

  // 2) 다리 & 신발 (썸네일에서도 하단 살짝 보이게 혹은 캐릭터 전용으로 렌더)
  if (!isThumb) {
    const legCol = id === "kindergarten_outfit" || id === "square_suit" ? skin : outline;
    ctx.strokeStyle = outline; ctx.lineWidth = 15; ctx.lineCap = "round";
    ctx.beginPath(); ctx.moveTo(212, 346); ctx.lineTo(206, 388); ctx.moveTo(268, 346); ctx.lineTo(274, 388); ctx.stroke();
    if (legCol !== outline) {
      ctx.strokeStyle = legCol; ctx.lineWidth = 7;
      ctx.beginPath(); ctx.moveTo(212, 346); ctx.lineTo(206, 386); ctx.moveTo(268, 346); ctx.lineTo(274, 386); ctx.stroke();
    }
    const shoeCol =
      id === "plumber_outfit" ? "#78350f" :
      id === "kindergarten_outfit" ? "#fef08a" :
      id === "princess_dress" ? "#ec4899" :
      id === "astronaut" ? "#e2e8f0" :
      id === "king_robe" ? "#b45309" : "#1e293b";
    fillRoundRect(ctx, 184, 382, 36, 18, 9, shoeCol, outline, 6);
    fillRoundRect(ctx, 260, 382, 36, 18, 9, shoeCol, outline, 6);
  }

  // 3) 팔 & 소매 & 귀여운 손/장갑
  const sleeveCol =
    id === "square_suit" || id === "uniform" ? "#ffffff" :
    id === "plumber_outfit" || id === "kindergarten_outfit" ? "#ef4444" :
    id === "bell_cat_outfit" ? "#0ea5e9" :
    id === "pajama_outfit" ? "#a7f3d0" :
    id === "princess_dress" ? "#f9a8d4" : main;
  const handCol = id === "plumber_outfit" || id === "bell_cat_outfit" || id === "astronaut" ? "#ffffff" : skin;

  ctx.strokeStyle = outline; ctx.lineWidth = 18; ctx.lineCap = "round";
  ctx.beginPath(); ctx.moveTo(184, 286); ctx.lineTo(136, 326); ctx.moveTo(296, 286); ctx.lineTo(344, 326); ctx.stroke();
  ctx.strokeStyle = sleeveCol; ctx.lineWidth = 10;
  ctx.beginPath(); ctx.moveTo(184, 286); ctx.lineTo(148, 316); ctx.moveTo(296, 286); ctx.lineTo(332, 316); ctx.stroke();
  ctx.fillStyle = handCol; ctx.strokeStyle = outline; ctx.lineWidth = 6;
  ctx.beginPath(); ctx.arc(134, 328, 12, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
  ctx.beginPath(); ctx.arc(346, 328, 12, 0, Math.PI * 2); ctx.fill(); ctx.stroke();

  if (id === "princess_dress") {
    // 핑크 퍼프 소매 볼륨
    ctx.fillStyle = "#f472b6"; ctx.strokeStyle = outline; ctx.lineWidth = 7;
    ctx.beginPath(); ctx.arc(174, 284, 18, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    ctx.beginPath(); ctx.arc(306, 284, 18, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
  }

  // 4) 몸통 상의 + 의상별 초정밀 패턴 & 디테일
  if (id === "princess_dress") {
    // 드레스: 퍼지는 레이어드 스커트 + 하트 코르셋 + 허리 빅 리본
    ctx.fillStyle = "#f472b6"; ctx.strokeStyle = outline; ctx.lineWidth = 8.5;
    ctx.beginPath();
    ctx.moveTo(188, 270); ctx.lineTo(292, 270); ctx.lineTo(324, 372);
    ctx.quadraticCurveTo(240, 386, 156, 372); ctx.closePath();
    ctx.fill(); ctx.stroke();
    // 치마 레이스 프릴 & 하이라이트 패널
    ctx.fillStyle = "#fdf2f8"; ctx.strokeStyle = outline; ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.moveTo(212, 318); ctx.lineTo(268, 318); ctx.lineTo(286, 368); ctx.lineTo(194, 368);
    ctx.closePath(); ctx.fill(); ctx.stroke();
    [176, 208, 240, 272, 304].forEach(rx => {
      ctx.fillStyle = "#ffffff";
      ctx.beginPath(); ctx.arc(rx, 370, 12, 0, Math.PI); ctx.fill(); ctx.stroke();
    });
    // 허리 리본 띠 & 브로치
    fillRoundRect(ctx, 192, 306, 96, 14, 7, "#db2777", outline, 5);
    fillRoundRect(ctx, 224, 300, 32, 24, 8, "#fb7185", outline, 5);
    drawHeart(ctx, 240, 288, 9, "#fde047", outline, 3);
    return;
  }

  if (id === "plumber_outfit") {
    // 배관공: 빨간 티셔츠 + 진청 데님 오버롤 멜빵 + 큰 황금 단추 2개 + 앞주머니
    fillRoundRect(ctx, 182, 268, 116, 86, 34, "#ef4444", outline, 8.5);
    fillRoundRect(ctx, 186, 302, 108, 54, 18, "#2563eb", outline, 7.5);
    // 멜빵 끈
    fillRoundRect(ctx, 196, 268, 20, 42, 6, "#2563eb", outline, 6);
    fillRoundRect(ctx, 264, 268, 20, 42, 6, "#2563eb", outline, 6);
    // 큰 황금 단추 2개
    [206, 274].forEach(bx => {
      ctx.fillStyle = "#facc15"; ctx.strokeStyle = outline; ctx.lineWidth = 4.5;
      ctx.beginPath(); ctx.arc(bx, 310, 9, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    });
    // 바지 가랑이 분리선
    ctx.strokeStyle = outline; ctx.lineWidth = 6;
    ctx.beginPath(); ctx.moveTo(240, 340); ctx.lineTo(240, 356); ctx.stroke();
    return;
  }

  if (id === "kindergarten_outfit") {
    // 5살유치원: 시그니처 강렬 빨간 티 + 샛노란 반바지 + 귀여운 배지 포인트
    fillRoundRect(ctx, 182, 268, 116, 60, 28, "#ef4444", outline, 8.5);
    ctx.fillStyle = "#ffffff"; ctx.strokeStyle = outline; ctx.lineWidth = 4;
    ctx.beginPath(); ctx.arc(240, 272, 16, 0, Math.PI); ctx.stroke();
    // 노란 반바지
    fillRoundRect(ctx, 186, 320, 108, 38, 14, "#facc15", outline, 7.5);
    ctx.strokeStyle = outline; ctx.lineWidth = 6;
    ctx.beginPath(); ctx.moveTo(240, 338); ctx.lineTo(240, 358); ctx.stroke();
    return;
  }

  if (id === "pajama_outfit") {
    // 파자마: 민트 파스텔 잠옷 셔츠 + 흰 둥근 카라/단추 + △□○ 도형 패턴!
    fillRoundRect(ctx, 182, 268, 116, 86, 30, "#a7f3d0", outline, 8.5);
    // 셔츠 카라 & 단추
    ctx.fillStyle = "#ffffff"; ctx.strokeStyle = outline; ctx.lineWidth = 5;
    ctx.beginPath(); ctx.moveTo(212, 268); ctx.lineTo(238, 286); ctx.lineTo(222, 294); ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(268, 268); ctx.lineTo(242, 286); ctx.lineTo(258, 294); ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.strokeStyle = outline; ctx.lineWidth = 4;
    ctx.beginPath(); ctx.moveTo(240, 286); ctx.lineTo(240, 352); ctx.stroke();
    // △ ○ □ 도형 패턴 (초록·노랑·핑크)
    ctx.fillStyle = "#fde047"; ctx.strokeStyle = outline; ctx.lineWidth = 2.5;
    ctx.beginPath(); ctx.arc(210, 314, 9, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    fillRoundRect(ctx, 258, 304, 17, 17, 3, "#f472b6", outline, 2.5);
    ctx.fillStyle = "#38bdf8";
    ctx.beginPath(); ctx.moveTo(212, 332); ctx.lineTo(202, 346); ctx.lineTo(222, 346); ctx.closePath(); ctx.fill(); ctx.stroke();
    return;
  }

  if (id === "square_suit") {
    // 노란네모: 화이트 칼라 셔츠 + 빨간 넥타이 + 갈색 바지 + 검은 벨트/금버클
    fillRoundRect(ctx, 182, 268, 116, 54, 24, "#ffffff", outline, 8.5);
    // 셔츠 칼라 & 빨간 넥타이
    ctx.fillStyle = "#f1f5f9"; ctx.strokeStyle = outline; ctx.lineWidth = 4.5;
    ctx.beginPath(); ctx.moveTo(212, 268); ctx.lineTo(234, 286); ctx.lineTo(214, 290); ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(268, 268); ctx.lineTo(246, 286); ctx.lineTo(266, 290); ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.fillStyle = "#ef4444"; ctx.strokeStyle = outline; ctx.lineWidth = 4.5;
    ctx.beginPath(); ctx.moveTo(234, 276); ctx.lineTo(246, 276); ctx.lineTo(249, 314); ctx.lineTo(240, 326); ctx.lineTo(231, 314); ctx.closePath();
    ctx.fill(); ctx.stroke();
    // 갈색 사각 바지 + 검은 점선 벨트
    fillRoundRect(ctx, 184, 320, 112, 38, 10, "#78350f", outline, 7.5);
    ctx.fillStyle = "#0f172a";
    [194, 214, 248, 268].forEach(bx => ctx.fillRect(bx, 324, 12, 7));
    fillRoundRect(ctx, 232, 322, 16, 12, 2, "#facc15", outline, 3);
    return;
  }

  if (id === "bell_cat_outfit") {
    // 방울고양이: 하늘색 몸통 + 하얀 배 반원 + 4차원 주머니 + 빨간 목걸이 + 황금 방울!
    fillRoundRect(ctx, 182, 268, 116, 86, 36, "#0ea5e9", outline, 8.5);
    ctx.fillStyle = "#ffffff"; ctx.strokeStyle = outline; ctx.lineWidth = 6;
    ctx.beginPath(); ctx.ellipse(240, 316, 42, 34, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    // 4차원 배주머니 반원
    ctx.fillStyle = "#f8fafc"; ctx.strokeStyle = outline; ctx.lineWidth = 4.5;
    ctx.beginPath(); ctx.arc(240, 318, 28, 0, Math.PI); ctx.closePath(); ctx.fill(); ctx.stroke();
    // 빨간 목걸이 & 반짝 황금 방울
    fillRoundRect(ctx, 198, 266, 84, 13, 6, "#ef4444", outline, 5.5);
    ctx.fillStyle = "#facc15"; ctx.strokeStyle = outline; ctx.lineWidth = 4.5;
    ctx.beginPath(); ctx.arc(240, 285, 13, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    ctx.strokeStyle = outline; ctx.lineWidth = 2.5;
    ctx.beginPath(); ctx.moveTo(230, 284); ctx.lineTo(250, 284); ctx.stroke();
    ctx.fillStyle = outline; ctx.beginPath(); ctx.arc(240, 289, 3, 0, Math.PI * 2); ctx.fill();
    return;
  }

  // 기존 9종 의상도 모두 개별 디테일화!
  fillRoundRect(ctx, 182, 268, 116, 86, 34, main, outline, 8.5);
  if (id === "basic") {
    fillRoundRect(ctx, 206, 280, 68, 44, 16, sub, outline, 5.5);
    fillRoundRect(ctx, 200, 266, 80, 14, 7, "#ef4444", outline, 5);
  } else if (id === "overalls") {
    fillRoundRect(ctx, 186, 304, 108, 50, 16, sub, outline, 6.5);
    fillRoundRect(ctx, 198, 268, 18, 40, 5, sub, outline, 5);
    fillRoundRect(ctx, 264, 268, 18, 40, 5, sub, outline, 5);
    fillRoundRect(ctx, 224, 314, 32, 20, 5, "#1d4ed8", outline, 3);
  } else if (id === "hoodie_mint") {
    fillRoundRect(ctx, 202, 264, 76, 18, 9, "#0f766e", outline, 5);
    ctx.strokeStyle = "#ffffff"; ctx.lineWidth = 4; ctx.lineCap = "round";
    ctx.beginPath(); ctx.moveTo(226, 280); ctx.lineTo(224, 304); ctx.moveTo(254, 280); ctx.lineTo(256, 304); ctx.stroke();
    fillRoundRect(ctx, 204, 314, 72, 28, 10, "#0d9488", outline, 4.5);
  } else if (id === "uniform") {
    ctx.fillStyle = "#ffffff"; ctx.strokeStyle = outline; ctx.lineWidth = 5;
    ctx.beginPath(); ctx.moveTo(212, 268); ctx.lineTo(240, 312); ctx.lineTo(268, 268); ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.fillStyle = sub;
    ctx.beginPath(); ctx.moveTo(234, 274); ctx.lineTo(246, 274); ctx.lineTo(244, 308); ctx.lineTo(240, 316); ctx.lineTo(236, 308); ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.fillStyle = "#facc15"; ctx.beginPath(); ctx.arc(274, 294, 5, 0, Math.PI * 2); ctx.fill();
  } else if (id === "denim_90s") {
    fillRoundRect(ctx, 224, 274, 32, 74, 6, sub, outline, 4.5);
    fillRoundRect(ctx, 194, 290, 22, 22, 4, "#2563eb", outline, 4);
    fillRoundRect(ctx, 264, 290, 22, 22, 4, "#2563eb", outline, 4);
    ctx.strokeStyle = "#facc15"; ctx.lineWidth = 3.5;
    ctx.beginPath(); ctx.moveTo(192, 336); ctx.quadraticCurveTo(216, 350, 240, 336); ctx.stroke();
  } else if (id === "rock_leather") {
    ctx.fillStyle = sub; ctx.strokeStyle = outline; ctx.lineWidth = 5;
    ctx.beginPath(); ctx.moveTo(214, 268); ctx.lineTo(240, 322); ctx.lineTo(266, 268); ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.strokeStyle = "#e2e8f0"; ctx.lineWidth = 4;
    ctx.beginPath(); ctx.moveTo(256, 274); ctx.lineTo(246, 344); ctx.stroke();
    [198, 282].forEach(sx => {
      ctx.fillStyle = "#e2e8f0"; ctx.beginPath(); ctx.arc(sx, 284, 4.5, 0, Math.PI * 2); ctx.fill();
    });
  } else if (id === "idol_suit") {
    fillRoundRect(ctx, 174, 264, 30, 14, 6, sub, outline, 4.5);
    fillRoundRect(ctx, 276, 264, 30, 14, 6, sub, outline, 4.5);
    ctx.fillStyle = "#ffffff"; ctx.strokeStyle = outline; ctx.lineWidth = 4.5;
    ctx.beginPath(); ctx.moveTo(216, 268); ctx.lineTo(240, 308); ctx.lineTo(264, 268); ctx.closePath(); ctx.fill(); ctx.stroke();
    fillRoundRect(ctx, 186, 318, 108, 12, 4, "#0f172a", outline, 4);
    fillRoundRect(ctx, 232, 316, 16, 16, 3, sub, outline, 3);
  } else if (id === "astronaut") {
    fillRoundRect(ctx, 212, 284, 56, 38, 10, "#cbd5e1", outline, 5);
    fillRoundRect(ctx, 220, 292, 40, 12, 3, "#0f172a");
    fillRoundRect(ctx, 224, 295, 16, 6, 2, sub);
    fillRoundRect(ctx, 220, 310, 10, 6, 2, "#ef4444");
    fillRoundRect(ctx, 236, 310, 22, 6, 2, "#38bdf8");
    fillRoundRect(ctx, 184, 330, 112, 10, 3, "#ef4444", outline, 3.5);
  } else if (id === "king_robe") {
    fillRoundRect(ctx, 198, 264, 84, 22, 10, "#ffffff", outline, 5.5);
    fillRoundRect(ctx, 230, 282, 20, 72, 4, sub, outline, 4.5);
    drawStar(ctx, 240, 298, 10, 4.5, 5, "#ef4444", outline, 2.5);
  }

  if (isFemale && !isThumb) {
    fillRoundRect(ctx, 174, 330, 132, 26, 13, sub, outline, 7.5);
  }
}

// ============================================================================
// 고디테일 얼굴/표정/안경/수염/가면 렌더러 (19종 전종 캐릭터/썸네일 공용!)
// ============================================================================
function drawDetailedFace(ctx, faceItem) {
  const id = (faceItem && faceItem.id) || "default";
  const outline = "#1e1b18";

  // 1) 개구리 눈 (머리 위로 툭 튀어나온 왕눈이 2개 + 얼굴 콧구멍 & 싱긋 미소)
  if (id === "frog_eyes") {
    [184, 296].forEach(fx => {
      ctx.fillStyle = "#4ade80"; ctx.strokeStyle = outline; ctx.lineWidth = 8;
      ctx.beginPath(); ctx.arc(fx, 114, 33, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
      ctx.fillStyle = "#ffffff"; ctx.strokeStyle = outline; ctx.lineWidth = 5;
      ctx.beginPath(); ctx.arc(fx, 114, 22, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
      ctx.fillStyle = outline;
      ctx.beginPath(); ctx.ellipse(fx, 114, 13, 8, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = "#ffffff"; ctx.beginPath(); ctx.arc(fx - 5, 110, 4.5, 0, Math.PI * 2); ctx.fill();
    });
    ctx.fillStyle = outline;
    ctx.beginPath(); ctx.arc(224, 198, 4.5, 0, Math.PI * 2); ctx.arc(256, 198, 4.5, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = outline; ctx.lineWidth = 7.5; ctx.lineCap = "round";
    ctx.beginPath(); ctx.arc(240, 212, 42, 0.15 * Math.PI, 0.85 * Math.PI); ctx.stroke();
    return;
  }

  // 2) 눈 영역
  ctx.strokeStyle = outline; ctx.lineCap = "round"; ctx.lineJoin = "round";
  if (id === "square_glass") {
    [192, 288].forEach(ex => {
      ctx.fillStyle = outline; ctx.beginPath(); ctx.arc(ex, 194, 11, 0, Math.PI * 2); ctx.fill();
    });
    fillRoundRect(ctx, 148, 168, 84, 52, 10, "rgba(255,255,255,0.45)", outline, 9);
    fillRoundRect(ctx, 248, 168, 84, 52, 10, "rgba(255,255,255,0.45)", outline, 9);
    ctx.lineWidth = 8; ctx.beginPath(); ctx.moveTo(232, 192); ctx.lineTo(248, 192); ctx.stroke();
    ctx.strokeStyle = "rgba(255,255,255,0.85)"; ctx.lineWidth = 5;
    ctx.beginPath(); ctx.moveTo(164, 180); ctx.lineTo(182, 206); ctx.moveTo(264, 180); ctx.lineTo(282, 206); ctx.stroke();
  } else if (id === "swirl_glass") {
    ctx.lineWidth = 8;
    [190, 290].forEach(cx => {
      ctx.fillStyle = "#ffffff"; ctx.beginPath(); ctx.arc(cx, 194, 36, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
      ctx.strokeStyle = "#475569"; ctx.lineWidth = 5.5;
      ctx.beginPath();
      for (let t = 0; t < 3.5 * Math.PI; t += 0.25) {
        const r = t * 2.2;
        const x = cx + Math.cos(t) * r, y = 194 + Math.sin(t) * r;
        if (t === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
      }
      ctx.stroke();
      ctx.strokeStyle = outline;
    });
    ctx.lineWidth = 8; ctx.beginPath(); ctx.moveTo(226, 194); ctx.lineTo(254, 194); ctx.stroke();
  } else if (id === "sunglass") {
    fillRoundRect(ctx, 144, 168, 88, 50, 14, "#0f172a", outline, 8);
    fillRoundRect(ctx, 248, 168, 88, 50, 14, "#0f172a", outline, 8);
    ctx.lineWidth = 8; ctx.beginPath(); ctx.moveTo(232, 184); ctx.lineTo(248, 184); ctx.stroke();
    ctx.strokeStyle = "rgba(255,255,255,0.4)"; ctx.lineWidth = 6;
    ctx.beginPath(); ctx.moveTo(160, 180); ctx.lineTo(182, 206); ctx.moveTo(264, 180); ctx.lineTo(286, 206); ctx.stroke();
  } else if (id === "dragonfly_glass") {
    // 엄청 큰 초대형 잠자리 안경!
    [192, 288].forEach(ex => {
      ctx.fillStyle = outline; ctx.beginPath(); ctx.arc(ex, 190, 12, 0, Math.PI * 2); ctx.fill();
    });
    const dgGrad = ctx.createLinearGradient(0, 144, 0, 246);
    dgGrad.addColorStop(0, "rgba(245, 158, 11, 0.58)");
    dgGrad.addColorStop(1, "rgba(236, 72, 153, 0.36)");
    ctx.fillStyle = dgGrad; ctx.strokeStyle = "#78350f"; ctx.lineWidth = 10;
    ctx.beginPath(); ctx.ellipse(176, 196, 56, 48, -0.08, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    ctx.beginPath(); ctx.ellipse(304, 196, 56, 48, 0.08, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    // 이중 골드 브릿지 & 광택
    ctx.strokeStyle = "#facc15"; ctx.lineWidth = 7;
    ctx.beginPath(); ctx.moveTo(226, 174); ctx.lineTo(254, 174); ctx.moveTo(230, 190); ctx.lineTo(250, 190); ctx.stroke();
    ctx.strokeStyle = "rgba(255,255,255,0.65)"; ctx.lineWidth = 6;
    ctx.beginPath(); ctx.moveTo(146, 168); ctx.lineTo(176, 214); ctx.moveTo(274, 168); ctx.lineTo(304, 214); ctx.stroke();
  } else if (id === "neon_visor") {
    fillRoundRect(ctx, 138, 162, 204, 54, 20, "#090d16", "#38bdf8", 7);
    ctx.strokeStyle = "#38bdf8"; ctx.lineWidth = 5;
    ctx.beginPath(); ctx.moveTo(156, 188); ctx.lineTo(324, 188); ctx.stroke();
    ctx.strokeStyle = "#f43f5e"; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.moveTo(168, 174); ctx.lineTo(212, 174); ctx.moveTo(268, 174); ctx.lineTo(312, 174); ctx.stroke();
  } else if (id === "heart_eyes") {
    [190, 290].forEach(hx => {
      drawHeart(ctx, hx, 196, 26, "#f43f5e", outline, 5);
      ctx.fillStyle = "#ffffff"; ctx.beginPath(); ctx.arc(hx - 9, 184, 5, 0, Math.PI * 2); ctx.fill();
    });
  } else if (id === "star_eyes") {
    [190, 290].forEach(sx => {
      drawStar(ctx, sx, 194, 25, 11, 5, "#facc15", outline, 5);
      ctx.fillStyle = "#ffffff"; ctx.beginPath(); ctx.arc(sx - 5, 188, 4.5, 0, Math.PI * 2); ctx.fill();
    });
  } else if (id === "wink" || id === "wink_kiss") {
    ctx.strokeStyle = outline; ctx.lineWidth = 8.5;
    ctx.beginPath(); ctx.moveTo(166, 180); ctx.lineTo(206, 194); ctx.lineTo(166, 208); ctx.stroke();
    ctx.fillStyle = outline; ctx.beginPath(); ctx.arc(292, 194, 17, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = "#ffffff"; ctx.beginPath(); ctx.arc(286, 187, 6.5, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(297, 200, 3, 0, Math.PI * 2); ctx.fill();
    if (id === "wink") {
      drawHeart(ctx, 146, 168, 10, "#fb7185", outline, 3);
    } else {
      drawHeart(ctx, 326, 224, 11, "#f43f5e", outline, 3);
    }
  } else if (id === "xd_laugh") {
    ctx.lineWidth = 9;
    ctx.beginPath();
    ctx.moveTo(166, 180); ctx.lineTo(204, 194); ctx.lineTo(166, 208);
    ctx.moveTo(314, 180); ctx.lineTo(276, 194); ctx.lineTo(314, 208);
    ctx.stroke();
    // 웃음 눈물 방울
    ctx.fillStyle = "#38bdf8"; ctx.strokeStyle = outline; ctx.lineWidth = 3.5;
    ctx.beginPath(); ctx.arc(146, 208, 7, 0, Math.PI * 2); ctx.arc(334, 208, 7, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
  } else if (id === "phantom_mask") {
    // 뾰족 눈 + 오페라 화이트 골드 하프 마스크
    [190, 290].forEach(ex => {
      ctx.fillStyle = outline; ctx.beginPath(); ctx.arc(ex, 192, 13, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = "#ffffff"; ctx.beginPath(); ctx.arc(ex - 4, 187, 4.5, 0, Math.PI * 2); ctx.fill();
    });
    ctx.fillStyle = "#ffffff"; ctx.strokeStyle = "#d97706"; ctx.lineWidth = 7;
    ctx.beginPath();
    ctx.moveTo(126, 184); ctx.quadraticCurveTo(186, 154, 240, 174);
    ctx.quadraticCurveTo(294, 154, 354, 184);
    ctx.quadraticCurveTo(334, 226, 266, 212);
    ctx.lineTo(240, 232);
    ctx.lineTo(214, 212);
    ctx.quadraticCurveTo(146, 226, 126, 184);
    ctx.closePath(); ctx.fill(); ctx.stroke();
    // 가면 눈 구멍 & 보석 포인트
    ctx.fillStyle = outline;
    ctx.beginPath(); ctx.ellipse(190, 192, 22, 13, -0.1, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.ellipse(290, 192, 22, 13, 0.1, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = "#ffffff";
    ctx.beginPath(); ctx.arc(185, 188, 5.5, 0, Math.PI * 2); ctx.arc(285, 188, 5.5, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = "#e11d48"; ctx.strokeStyle = "#b45309"; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.arc(240, 176, 7, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
  } else if (id === "battle_scar") {
    // 늠름한 눈 + 눈가 X 흉터 + 볼 반창고
    ctx.lineWidth = 7;
    ctx.beginPath(); ctx.moveTo(166, 166); ctx.lineTo(206, 174); ctx.moveTo(274, 174); ctx.lineTo(314, 166); ctx.stroke();
    ctx.fillStyle = outline;
    ctx.beginPath(); ctx.arc(190, 192, 14, 0, Math.PI * 2); ctx.arc(290, 192, 14, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = "#ffffff";
    ctx.beginPath(); ctx.arc(185, 187, 5, 0, Math.PI * 2); ctx.arc(285, 187, 5, 0, Math.PI * 2); ctx.fill();
    // 오른쪽 눈 X자 흉터
    ctx.strokeStyle = "#e11d48"; ctx.lineWidth = 5;
    ctx.beginPath(); ctx.moveTo(304, 164); ctx.lineTo(324, 214); ctx.moveTo(298, 184); ctx.lineTo(324, 180); ctx.stroke();
    // 왼쪽 볼 귀여운 반창고
    ctx.save();
    ctx.translate(166, 220); ctx.rotate(-0.3);
    fillRoundRect(ctx, -22, -10, 44, 20, 6, "#fed7aa", outline, 4.5);
    fillRoundRect(ctx, -8, -8, 16, 16, 3, "#fff7ed");
    ctx.restore();
  } else if (id === "tough_beard") {
    ctx.lineWidth = 8.5;
    ctx.beginPath(); ctx.moveTo(164, 166); ctx.lineTo(208, 174); ctx.moveTo(272, 174); ctx.lineTo(316, 166); ctx.stroke();
    ctx.fillStyle = outline;
    ctx.beginPath(); ctx.arc(190, 192, 14, 0, Math.PI * 2); ctx.arc(290, 192, 14, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = "#ffffff";
    ctx.beginPath(); ctx.arc(185, 187, 5, 0, Math.PI * 2); ctx.arc(285, 187, 5, 0, Math.PI * 2); ctx.fill();
  } else if (id === "santa_beard") {
    ctx.fillStyle = outline;
    ctx.beginPath(); ctx.arc(190, 190, 14, 0, Math.PI * 2); ctx.arc(290, 190, 14, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = "#ffffff";
    ctx.beginPath(); ctx.arc(185, 185, 5, 0, Math.PI * 2); ctx.arc(285, 185, 5, 0, Math.PI * 2); ctx.fill();
    // 빨간 루돌프/산타 코
    ctx.fillStyle = "#ef4444"; ctx.strokeStyle = outline; ctx.lineWidth = 5;
    ctx.beginPath(); ctx.arc(240, 210, 14, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    ctx.fillStyle = "#ffffff"; ctx.beginPath(); ctx.arc(235, 205, 4, 0, Math.PI * 2); ctx.fill();
  } else if (id === "surprised" || id === "big_smile" || id === "cat_face") {
    ctx.fillStyle = outline;
    const r = id === "cat_face" ? 12 : 16;
    ctx.beginPath(); ctx.arc(190, 192, r, 0, Math.PI * 2); ctx.arc(290, 192, r, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = "#ffffff";
    ctx.beginPath(); ctx.arc(185, 186, 5.5, 0, Math.PI * 2); ctx.arc(285, 186, 5.5, 0, Math.PI * 2); ctx.fill();
    if (id === "cat_face") {
      // 분홍 코 & 고양이 수염
      ctx.fillStyle = "#f472b6"; ctx.beginPath(); ctx.arc(240, 210, 5.5, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = outline; ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.moveTo(140, 206); ctx.lineTo(166, 212); ctx.moveTo(138, 222); ctx.lineTo(166, 222);
      ctx.moveTo(340, 206); ctx.lineTo(314, 212); ctx.moveTo(342, 222); ctx.lineTo(314, 222);
      ctx.stroke();
    }
  } else {
    // default (기본 미소): 선명한 눈망울 + 부드러운 눈썹
    ctx.lineWidth = 6.5;
    ctx.beginPath(); ctx.moveTo(172, 168); ctx.quadraticCurveTo(190, 162, 208, 168); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(272, 168); ctx.quadraticCurveTo(290, 162, 308, 168); ctx.stroke();
    ctx.fillStyle = outline;
    ctx.beginPath(); ctx.arc(190, 192, 14, 0, Math.PI * 2); ctx.arc(290, 192, 14, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = "#ffffff";
    ctx.beginPath(); ctx.arc(185, 187, 5, 0, Math.PI * 2); ctx.arc(285, 187, 5, 0, Math.PI * 2); ctx.fill();
  }

  // 3) 입 모양 & 수염 오버레이
  if (id === "santa_beard") {
    // 풍성한 순백 산타 턱수염 + 콧수염
    ctx.fillStyle = "#ffffff"; ctx.strokeStyle = outline; ctx.lineWidth = 7;
    ctx.beginPath();
    ctx.arc(196, 250, 30, 0, Math.PI * 2);
    ctx.arc(240, 266, 36, 0, Math.PI * 2);
    ctx.arc(284, 250, 30, 0, Math.PI * 2);
    ctx.fill(); ctx.stroke();
    ctx.beginPath();
    ctx.ellipse(210, 228, 30, 14, -0.2, 0, Math.PI * 2);
    ctx.ellipse(270, 228, 30, 14, 0.2, 0, Math.PI * 2);
    ctx.fill(); ctx.stroke();
  } else if (id === "tough_beard") {
    // 터프 턱수염 + 말아 올린 콧수염
    ctx.fillStyle = "#3f2e21"; ctx.strokeStyle = outline; ctx.lineWidth = 6;
    ctx.beginPath(); ctx.moveTo(212, 250); ctx.quadraticCurveTo(240, 286, 268, 250); ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(240, 224); ctx.bezierCurveTo(214, 210, 182, 232, 174, 218);
    ctx.bezierCurveTo(186, 246, 222, 238, 240, 232);
    ctx.bezierCurveTo(258, 238, 294, 246, 306, 218);
    ctx.bezierCurveTo(298, 232, 266, 210, 240, 224);
    ctx.fill(); ctx.stroke();
  } else if (id === "big_smile" || id === "xd_laugh") {
    fillRoundRect(ctx, 212, 218, 56, 36, 18, "#e11d48", outline, 6.5);
    ctx.fillStyle = "#fda4af"; ctx.beginPath(); ctx.ellipse(240, 246, 18, 7, 0, 0, Math.PI * 2); ctx.fill();
  } else if (id === "surprised") {
    ctx.fillStyle = "#e11d48"; ctx.strokeStyle = outline; ctx.lineWidth = 6.5;
    ctx.beginPath(); ctx.ellipse(240, 234, 15, 19, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
  } else if (id === "wink_kiss") {
    ctx.strokeStyle = outline; ctx.lineWidth = 7.5;
    ctx.beginPath(); ctx.arc(240, 224, 10, -Math.PI * 0.4, Math.PI * 0.4); ctx.stroke();
    ctx.beginPath(); ctx.arc(240, 240, 10, -Math.PI * 0.4, Math.PI * 0.4); ctx.stroke();
  } else if (id === "swirl_glass") {
    ctx.strokeStyle = outline; ctx.lineWidth = 7;
    ctx.beginPath();
    ctx.moveTo(216, 232); ctx.quadraticCurveTo(228, 222, 240, 232);
    ctx.quadraticCurveTo(252, 242, 264, 232); ctx.stroke();
  } else {
    ctx.strokeStyle = outline; ctx.lineWidth = 7.5;
    ctx.beginPath(); ctx.arc(226, 224, 14, 0, Math.PI); ctx.arc(254, 224, 14, 0, Math.PI); ctx.stroke();
  }
}

// ============================================================================
// 고디테일 모자 렌더러 (20종 전종 캐릭터/썸네일 공용!)
// ============================================================================
function drawDetailedHat(ctx, hatItem) {
  if (!hatItem || hatItem.id === "none") return;
  const id = hatItem.id;
  const outline = "#1e1b18";

  if (id === "headset" || id === "cat_ear") {
    const hc = hatItem.color || "#0ea5e9";
    ctx.strokeStyle = outline; ctx.lineWidth = 22;
    ctx.beginPath(); ctx.arc(240, 190, 144, Math.PI * 1.1, Math.PI * 1.9); ctx.stroke();
    ctx.strokeStyle = hc; ctx.lineWidth = 12;
    ctx.beginPath(); ctx.arc(240, 190, 144, Math.PI * 1.1, Math.PI * 1.9); ctx.stroke();
    fillRoundRect(ctx, 82, 162, 34, 68, 16, hc, outline, 7);
    fillRoundRect(ctx, 364, 162, 34, 68, 16, hc, outline, 7);
    fillRoundRect(ctx, 92, 174, 14, 44, 6, "#f8fafc");
    fillRoundRect(ctx, 374, 174, 14, 44, 6, "#f8fafc");
    if (id === "cat_ear") {
      [[144, 92, 162, 32, 196, 82], [336, 92, 318, 32, 284, 82]].forEach(([x1, y1, x2, y2, x3, y3]) => {
        ctx.fillStyle = hc; ctx.strokeStyle = outline; ctx.lineWidth = 7.5;
        ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.lineTo(x3, y3); ctx.closePath(); ctx.fill(); ctx.stroke();
      });
    }
  } else if (id === "bucket_hat") {
    fillRoundRect(ctx, 138, 40, 204, 64, 22, "#1e293b", outline, 8);
    fillRoundRect(ctx, 100, 88, 280, 28, 14, "#334155", outline, 8);
    fillRoundRect(ctx, 218, 62, 44, 14, 4, "#f43f5e", outline, 4);
  } else if (id === "propeller_cap") {
    fillRoundRect(ctx, 148, 46, 184, 58, 28, "#ef4444", outline, 8);
    fillRoundRect(ctx, 202, 48, 76, 54, 18, "#facc15", outline, 6);
    fillRoundRect(ctx, 178, 86, 178, 22, 11, "#2563eb", outline, 7);
    fillRoundRect(ctx, 234, 24, 12, 24, 5, "#475569", outline, 5);
    fillRoundRect(ctx, 184, 16, 112, 16, 8, "#38bdf8", outline, 6);
  } else if (id === "big_ribbon") {
    ctx.fillStyle = "#f43f5e"; ctx.strokeStyle = outline; ctx.lineWidth = 8;
    ctx.beginPath(); ctx.moveTo(234, 74); ctx.lineTo(150, 32); ctx.lineTo(162, 104); ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(246, 74); ctx.lineTo(330, 32); ctx.lineTo(318, 104); ctx.closePath(); ctx.fill(); ctx.stroke();
    fillRoundRect(ctx, 220, 56, 40, 36, 14, "#fb7185", outline, 8);
  } else if (id === "bear_hood") {
    ctx.fillStyle = "#92400e"; ctx.strokeStyle = outline; ctx.lineWidth = 8.5;
    ctx.beginPath(); ctx.arc(154, 54, 32, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    ctx.beginPath(); ctx.arc(326, 54, 32, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    fillRoundRect(ctx, 148, 42, 184, 62, 30, "#92400e", outline, 8.5);
    fillRoundRect(ctx, 214, 66, 52, 30, 14, "#fde68a", outline, 5);
    ctx.fillStyle = outline; ctx.beginPath(); ctx.arc(240, 78, 7, 0, Math.PI * 2); ctx.fill();
  } else if (id === "bunny_band") {
    fillRoundRect(ctx, 152, 12, 42, 86, 21, "#fb7185", outline, 8);
    fillRoundRect(ctx, 286, 12, 42, 86, 21, "#fb7185", outline, 8);
    fillRoundRect(ctx, 164, 26, 18, 56, 9, "#ffe4e6");
    fillRoundRect(ctx, 298, 26, 18, 56, 9, "#ffe4e6");
  } else if (id === "beret_art") {
    fillRoundRect(ctx, 134, 42, 212, 64, 32, "#dc2626", outline, 8.5);
    fillRoundRect(ctx, 232, 24, 16, 22, 6, "#1e1b18");
    drawStar(ctx, 294, 72, 11, 5, 5, "#fde047", outline, 3);
  } else if (id === "acorn_hat") {
    fillRoundRect(ctx, 132, 52, 216, 68, 34, "#a16207", outline, 8.5);
    ctx.strokeStyle = "#713f12"; ctx.lineWidth = 3.5;
    for (let x = 156; x <= 324; x += 28) {
      ctx.beginPath(); ctx.moveTo(x, 56); ctx.lineTo(x + 14, 114); ctx.stroke();
    }
    fillRoundRect(ctx, 232, 28, 16, 28, 6, "#451a03", outline, 6);
  } else if (id === "angel") {
    ctx.strokeStyle = outline; ctx.lineWidth = 20;
    ctx.beginPath(); ctx.ellipse(240, 42, 86, 18, 0, 0, Math.PI * 2); ctx.stroke();
    ctx.strokeStyle = "#fde047"; ctx.lineWidth = 10;
    ctx.beginPath(); ctx.ellipse(240, 42, 86, 18, 0, 0, Math.PI * 2); ctx.stroke();
  } else if (id === "devil_horn") {
    ctx.fillStyle = "#e11d48"; ctx.strokeStyle = outline; ctx.lineWidth = 8;
    [[168, 92, 140, 26, 200, 78], [312, 92, 340, 26, 280, 78]].forEach(([x1, y1, x2, y2, x3, y3]) => {
      ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.lineTo(x3, y3); ctx.closePath(); ctx.fill(); ctx.stroke();
    });
  } else if (id === "cloud_hat") {
    // 구름모자: 폭신한 입체 구름 덩어리 + 파스텔 하늘 음영 + 별 장식
    fillRoundRect(ctx, 146, 80, 188, 28, 14, "#bae6fd", outline, 7);
    ctx.fillStyle = "#ffffff"; ctx.strokeStyle = outline; ctx.lineWidth = 8;
    ctx.beginPath();
    ctx.arc(178, 74, 34, 0, Math.PI * 2);
    ctx.arc(240, 52, 44, 0, Math.PI * 2);
    ctx.arc(302, 74, 34, 0, Math.PI * 2);
    ctx.fill(); ctx.stroke();
    ctx.fillStyle = "#ffffff";
    ctx.beginPath(); ctx.arc(178, 74, 30, 0, Math.PI * 2); ctx.arc(240, 52, 40, 0, Math.PI * 2); ctx.arc(302, 74, 30, 0, Math.PI * 2); ctx.fill();
    drawSparkle(ctx, 294, 42, 10, "#fde047");
  } else if (id === "sun_hat") {
    // 태양모자: 사방으로 뻗친 황금 햇살 + 빛나는 태양 코어
    for (let i = 0; i < 9; i++) {
      const ang = -Math.PI + (i / 8) * Math.PI;
      const bx = 240 + Math.cos(ang) * 52, by = 92 + Math.sin(ang) * 52;
      const tx = 240 + Math.cos(ang) * 90, ty = 92 + Math.sin(ang) * 90;
      ctx.fillStyle = i % 2 === 0 ? "#fde047" : "#f97316";
      ctx.strokeStyle = outline; ctx.lineWidth = 5.5;
      ctx.beginPath();
      ctx.moveTo(bx - Math.sin(ang) * 14, by + Math.cos(ang) * 14);
      ctx.lineTo(tx, ty);
      ctx.lineTo(bx + Math.sin(ang) * 14, by - Math.cos(ang) * 14);
      ctx.closePath(); ctx.fill(); ctx.stroke();
    }
    ctx.fillStyle = "#fbbf24"; ctx.strokeStyle = outline; ctx.lineWidth = 8;
    ctx.beginPath(); ctx.arc(240, 90, 52, Math.PI, 0); ctx.closePath(); ctx.fill(); ctx.stroke();
    fillRoundRect(ctx, 178, 86, 124, 18, 9, "#f59e0b", outline, 6);
  } else if (id === "star_hat") {
    // 별 모자: 네이비 비니 + 꼭대기 커다란 황금 별 + 반짝 포인트
    fillRoundRect(ctx, 148, 52, 184, 52, 26, "#1e1b4b", outline, 8);
    fillRoundRect(ctx, 138, 84, 204, 24, 12, "#facc15", outline, 7);
    drawStar(ctx, 240, 34, 30, 14, 5, "#fde047", outline, 6.5);
    drawStar(ctx, 184, 72, 10, 4.5, 5, "#38bdf8", outline, 3);
    drawStar(ctx, 296, 72, 10, 4.5, 5, "#f472b6", outline, 3);
  } else if (id === "party_hat") {
    // 파티모자: 땡땡이 고깔 + 프릴 테두리 + 꼭대기 보송보송 폼폼
    ctx.fillStyle = "#f43f5e"; ctx.strokeStyle = outline; ctx.lineWidth = 8;
    ctx.beginPath(); ctx.moveTo(166, 98); ctx.lineTo(240, 14); ctx.lineTo(314, 98); ctx.closePath();
    ctx.fill(); ctx.stroke();
    // 사선 스트라이프 & 도트
    ctx.fillStyle = "#fde047";
    ctx.beginPath(); ctx.arc(216, 78, 8, 0, Math.PI * 2); ctx.arc(260, 74, 8, 0, Math.PI * 2); ctx.arc(238, 48, 7, 0, Math.PI * 2); ctx.fill();
    fillRoundRect(ctx, 158, 90, 164, 18, 9, "#38bdf8", outline, 6);
    ctx.fillStyle = "#fef08a"; ctx.strokeStyle = outline; ctx.lineWidth = 6.5;
    ctx.beginPath(); ctx.arc(240, 14, 16, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
  } else if (id === "punk_mohawk") {
    // 펑키스타일: 스터드 밴드 + 거대한 뾰족뾰족 무지개 네온 스파이크!
    fillRoundRect(ctx, 146, 82, 188, 22, 10, "#0f172a", outline, 7);
    [172, 206, 240, 274, 308].forEach(sx => {
      ctx.fillStyle = "#e2e8f0"; ctx.beginPath(); ctx.arc(sx, 93, 5, 0, Math.PI * 2); ctx.fill();
    });
    const spikes = [
      [158, 84, 126, 26, 198, 84, "#38bdf8"],
      [188, 84, 178, 12, 230, 84, "#ec4899"],
      [216, 84, 240, 4, 264, 84, "#facc15"],
      [250, 84, 302, 12, 292, 84, "#ec4899"],
      [282, 84, 354, 26, 322, 84, "#a855f7"]
    ];
    spikes.forEach(([x1, y1, x2, y2, x3, y3, col]) => {
      ctx.fillStyle = col; ctx.strokeStyle = outline; ctx.lineWidth = 7.5;
      ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.lineTo(x3, y3); ctx.closePath();
      ctx.fill(); ctx.stroke();
    });
  } else if (id === "tree_hat") {
    // 트리 모자: 3단 크리스마스 트리 + 반짝 오너먼트 + 꼭대기 왕별
    ctx.fillStyle = "#16a34a"; ctx.strokeStyle = outline; ctx.lineWidth = 7.5;
    [[146, 102, 240, 44, 334, 102], [164, 74, 240, 26, 316, 74], [186, 48, 240, 12, 294, 48]].forEach(([x1, y1, x2, y2, x3, y3]) => {
      ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.lineTo(x3, y3); ctx.closePath();
      ctx.fill(); ctx.stroke();
    });
    // 오너먼트 방울
    [[196, 86, "#ef4444"], [240, 90, "#38bdf8"], [284, 86, "#fde047"], [220, 58, "#f472b6"], [260, 58, "#ef4444"]].forEach(([ox, oy, oc]) => {
      ctx.fillStyle = oc; ctx.strokeStyle = outline; ctx.lineWidth = 3.5;
      ctx.beginPath(); ctx.arc(ox, oy, 8, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    });
    drawStar(ctx, 240, 14, 18, 8, 5, "#fde047", outline, 4.5);
  } else if (id === "royal_crown") {
    ctx.fillStyle = "#fbbf24"; ctx.strokeStyle = outline; ctx.lineWidth = 8.5;
    ctx.beginPath();
    ctx.moveTo(152, 98); ctx.lineTo(152, 42); ctx.lineTo(196, 72); ctx.lineTo(240, 30);
    ctx.lineTo(284, 72); ctx.lineTo(328, 42); ctx.lineTo(328, 98); ctx.closePath();
    ctx.fill(); ctx.stroke();
    [[152, 42, "#38bdf8"], [240, 30, "#ef4444"], [328, 42, "#38bdf8"]].forEach(([jx, jy, jc]) => {
      ctx.fillStyle = jc; ctx.beginPath(); ctx.arc(jx, jy, 10, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    });
  } else if (id === "crown") {
    fillRoundRect(ctx, 152, 34, 176, 66, 14, "#facc15", outline, 8.5);
    fillRoundRect(ctx, 224, 48, 32, 32, 9, "#ef4444", outline, 5.5);
    ctx.fillStyle = "#38bdf8"; ctx.strokeStyle = outline; ctx.lineWidth = 4;
    ctx.beginPath(); ctx.arc(188, 64, 10, 0, Math.PI * 2); ctx.arc(292, 64, 10, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
  }
}

// ============================================================================
// 고디테일 날개 렌더러 (V2.0 신규 4종 — 모기 / 파리 / 잠자리 / 요정)
// ============================================================================
function drawDetailedWing(ctx, wingItem) {
  if (!wingItem || wingItem.id === "none") return;
  const id = wingItem.id;
  const outline = "#1e1b18";
  ctx.save();

  const drawPair = (fn) => {
    ctx.save();
    ctx.translate(240, 292);
    fn(-1);
    fn(1);
    ctx.restore();
  };

  if (id === "wing_mosquito") {
    drawPair(dir => {
      ctx.save();
      ctx.scale(dir, 1);
      ctx.globalAlpha = 0.72;
      ctx.fillStyle = "#e2e8f0";
      ctx.strokeStyle = outline;
      ctx.lineWidth = 6;
      ctx.beginPath();
      ctx.ellipse(98, -14, 72, 22, -0.32, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.strokeStyle = "#94a3b8";
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(42, -4);
      ctx.lineTo(148, -26);
      ctx.stroke();
      ctx.restore();
    });
  } else if (id === "wing_fly") {
    drawPair(dir => {
      ctx.save();
      ctx.scale(dir, 1);
      ctx.globalAlpha = 0.80;
      const grad = ctx.createLinearGradient(30, -40, 170, 20);
      grad.addColorStop(0, "#dbeafe");
      grad.addColorStop(0.5, "#93c5fd");
      grad.addColorStop(1, "#e9d5ff");
      ctx.fillStyle = grad;
      ctx.strokeStyle = outline;
      ctx.lineWidth = 6.5;
      ctx.beginPath();
      ctx.ellipse(104, -18, 76, 34, -0.25, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.strokeStyle = "#60a5fa";
      ctx.lineWidth = 2.8;
      ctx.beginPath();
      ctx.moveTo(42, -6); ctx.lineTo(156, -24);
      ctx.moveTo(58, -16); ctx.lineTo(126, -34);
      ctx.moveTo(64, 2); ctx.lineTo(132, 4);
      ctx.stroke();
      ctx.restore();
    });
  } else if (id === "wing_dragonfly") {
    drawPair(dir => {
      ctx.save();
      ctx.scale(dir, 1);
      ctx.globalAlpha = 0.84;
      const grad = ctx.createLinearGradient(30, -50, 180, 40);
      grad.addColorStop(0, "#bae6fd");
      grad.addColorStop(1, "#38bdf8");
      ctx.fillStyle = grad;
      ctx.strokeStyle = outline;
      ctx.lineWidth = 6;
      ctx.beginPath();
      ctx.ellipse(116, -32, 86, 22, -0.34, 0, Math.PI * 2);
      ctx.fill(); ctx.stroke();
      ctx.beginPath();
      ctx.ellipse(106, 14, 78, 20, 0.24, 0, Math.PI * 2);
      ctx.fill(); ctx.stroke();
      ctx.strokeStyle = "#0284c7";
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.moveTo(46, -12); ctx.lineTo(182, -52);
      ctx.moveTo(46, 2); ctx.lineTo(170, 26);
      ctx.stroke();
      ctx.restore();
    });
  } else if (id === "wing_fairy") {
    drawPair(dir => {
      ctx.save();
      ctx.scale(dir, 1);
      ctx.globalAlpha = 0.88;
      const grad = ctx.createLinearGradient(24, -76, 175, 65);
      grad.addColorStop(0, "#fdf2f8");
      grad.addColorStop(0.5, "#f9a8d4");
      grad.addColorStop(1, "#fde047");
      ctx.fillStyle = grad;
      ctx.strokeStyle = outline;
      ctx.lineWidth = 7;
      ctx.beginPath();
      ctx.moveTo(34, -10);
      ctx.bezierCurveTo(68, -108, 178, -98, 172, -24);
      ctx.bezierCurveTo(166, 22, 86, 26, 36, 4);
      ctx.closePath();
      ctx.fill(); ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(36, 8);
      ctx.bezierCurveTo(106, 8, 152, 52, 128, 76);
      ctx.bezierCurveTo(102, 92, 52, 56, 34, 22);
      ctx.closePath();
      ctx.fill(); ctx.stroke();

      drawSparkle(ctx, 134, -44, 9, "#ffffff");
      drawSparkle(ctx, 108, 46, 7, "#fef08a");
      ctx.restore();
    });
  }
  ctx.restore();
}

// ============================================================================
// 2. 동글동글 만두형 귀요미 캐릭터 렌더러 (최소 480px 고해상도 · 1:1 정배율!)
// ============================================================================
function renderPixelAvatar(canvas, config = DEFAULT_AVATAR_CONFIG, options = {}) {
  if (!canvas) return;

  if (options.matchCssAspect !== false && canvas.clientWidth > 16 && canvas.clientHeight > 16) {
    const dpr = Math.min(3, Math.max(2, window.devicePixelRatio || 2));
    let targetW = Math.round(canvas.clientWidth * dpr);
    let targetH = Math.round(canvas.clientHeight * dpr);
    const minGoal = Math.min(canvas.clientWidth, canvas.clientHeight) < 60 ? 280 : 480;
    const minSide = Math.min(targetW, targetH);
    if (minSide > 0 && minSide < minGoal) {
      const mult = minGoal / minSide;
      targetW = Math.round(targetW * mult);
      targetH = Math.round(targetH * mult);
    }
    if (Math.abs(canvas.width - targetW) > 6 || Math.abs(canvas.height - targetH) > 6) {
      canvas.width = targetW;
      canvas.height = targetH;
    }
  }

  const ctx = canvas.getContext("2d");
  const W = canvas.width;
  const H = canvas.height;

  ctx.save();
  ctx.imageSmoothingEnabled = true;
  ctx.clearRect(0, 0, W, H);

  const cfg = sanitizeAvatarConfigShape(config);
  const isFemale = cfg.gender === "female";

  const bgItem = getItemById("bg", cfg.bg);
  const hairItem = getItemById("hair", cfg.hair);
  const hatItem = getItemById("hat", cfg.hat);
  const faceItem = getItemById("face", cfg.face);
  const outfitItem = getItemById("outfit", cfg.outfit);
  const accItem = getItemById("acc", cfg.acc);
  const wingItem = getItemById("wing", cfg.wing);

  if (!options.transparentBg) {
    renderApfWideBackground(ctx, W, H, bgItem);
  }

  const charSize = Math.min(W, H) * 0.94;
  const offsetX = options.charCenterX !== undefined ? options.charCenterX - charSize / 2 : (W - charSize) / 2;
  const offsetY = (H - charSize) / 2 + (options.charOffsetY || 14);

  ctx.translate(offsetX, offsetY);
  ctx.scale(charSize / 480, charSize / 480);

  const outline = "#1e1b18";
  const faceWhite = "#fffdf9";

  // 발밑 동그란 그림자
  ctx.fillStyle = "rgba(0, 0, 0, 0.22)";
  ctx.beginPath(); ctx.ellipse(240, 405, 86, 20, 0, 0, Math.PI * 2); ctx.fill();

  // 날개 (등 뒤 최후방 레이어)
  drawDetailedWing(ctx, wingItem);

  // 뒷머리 (양갈래·삐삐머리·포니테일·샤기·퍼머)
  drawHairBack(ctx, hairItem);

  // 의상·다리·신발·소매·장갑
  drawDetailedOutfit(ctx, outfitItem, isFemale, { isThumb: false });

  // 양쪽 동글 귀
  const isMonkey = hairItem.style === "monkey";
  const earR = isMonkey ? 46 : 34;
  ctx.fillStyle = isMonkey ? "#6b3410" : faceWhite;
  ctx.strokeStyle = outline; ctx.lineWidth = 9.5;
  ctx.beginPath(); ctx.arc(105, 198, earR, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
  ctx.beginPath(); ctx.arc(375, 198, earR, 0, Math.PI * 2); ctx.fill(); ctx.stroke();

  ctx.fillStyle = isMonkey ? "#fffdf9" : "#fda4af";
  ctx.beginPath();
  ctx.arc(105, 198, earR * 0.55, 0, Math.PI * 2);
  ctx.arc(375, 198, earR * 0.55, 0, Math.PI * 2);
  ctx.fill();
  if (isMonkey) {
    ctx.strokeStyle = outline; ctx.lineWidth = 5.5; ctx.stroke();
  }

  // 만두형 동글 얼굴
  fillRoundRect(ctx, 112, 92, 256, 190, 92, faceWhite, outline, 10);

  // 앞머리 (15종 개별 일러스트)
  drawHairFront(ctx, hairItem);

  if (isFemale && hatItem.id === "none") {
    fillRoundRect(ctx, 312, 96, 52, 32, 12, "#f43f5e", outline, 7);
    ctx.fillStyle = "#ffe4e6";
    ctx.beginPath(); ctx.arc(338, 112, 7, 0, Math.PI * 2); ctx.fill();
  }

  // 볼터치
  ctx.fillStyle = "#fda4af";
  ctx.beginPath();
  ctx.ellipse(164, 222, 24, 13, 0, 0, Math.PI * 2);
  ctx.ellipse(316, 222, 24, 13, 0, 0, Math.PI * 2);
  ctx.fill();

  // 얼굴 표정·안경·수염·상처·개구리눈·가면 (19종)
  drawDetailedFace(ctx, faceItem);

  // 모자·왕관·헤드셋·펑키·트리·구름·태양·별·파티 (20종)
  drawDetailedHat(ctx, hatItem);

  // 정밀 악기 렌더링 결합! (20종)
  drawDetailedInstrument(ctx, accItem, 355, 295, 1.32);

  ctx.restore();
}

// ============================================================================
// 3. 상점 타일 전용 '480×480 고해상도 단품 아이콘' 렌더러
// ============================================================================
function renderItemThumbnail(canvas, category, item) {
  if (!canvas || !item) return;
  if (canvas.width < 480) canvas.width = 480;
  if (canvas.height < 480) canvas.height = 480;

  const ctx = canvas.getContext("2d");
  const W = canvas.width;
  const H = canvas.height;
  const outline = "#1e1b18";

  ctx.save();
  ctx.imageSmoothingEnabled = true;
  ctx.clearRect(0, 0, W, H);
  ctx.scale(W / 240, H / 240);

  if (category === "acc") {
    if (item.id === "none") {
      ctx.strokeStyle = "#57534e"; ctx.lineWidth = 8;
      ctx.beginPath(); ctx.arc(120, 120, 44, 0, Math.PI * 2); ctx.moveTo(90, 90); ctx.lineTo(150, 150); ctx.stroke();
    } else {
      drawDetailedInstrument(ctx, item, 120, 128, 1.42);
    }
  } else if (category === "hair") {
    // 동일 480×480 아바타 좌표계를 축소 투영 + 반투명 마네킹 두상으로 15종 헤어 실루엣 100% 구분!
    ctx.save();
    ctx.translate(120, 132);
    ctx.scale(0.56, 0.56);
    ctx.translate(-240, -172);
    drawHairBack(ctx, item);
    // 희미한 두상 가이드 (실제 앞머리·가닥이 어떻게 얹히는지 한눈에 식별!)
    ctx.save();
    ctx.globalAlpha = item.style === "bald" ? 0.96 : 0.42;
    fillRoundRect(ctx, 112, 92, 256, 190, 92, "#fffdf9", "#94a3b8", 6);
    ctx.restore();
    drawHairFront(ctx, item);
    ctx.restore();
  } else if (category === "face") {
    // 19종 얼굴 전종: 심쿵 윙크/쪽윙크/하트/별/고글/상처/수염/잠자리/개구리눈/가면 전부 동일 함수로 100% 선명 렌더링!
    ctx.save();
    ctx.translate(120, 122);
    ctx.scale(0.62, 0.62);
    ctx.translate(-240, -190);
    fillRoundRect(ctx, 112, 92, 256, 190, 92, "#fffdf9", outline, 10);
    ctx.fillStyle = "#fda4af";
    ctx.beginPath();
    ctx.ellipse(164, 222, 24, 13, 0, 0, Math.PI * 2);
    ctx.ellipse(316, 222, 24, 13, 0, 0, Math.PI * 2);
    ctx.fill();
    drawDetailedFace(ctx, item);
    ctx.restore();
  } else if (category === "hat") {
    if (item.id === "none") {
      ctx.strokeStyle = "#57534e"; ctx.lineWidth = 8;
      ctx.beginPath(); ctx.arc(120, 120, 44, 0, Math.PI * 2); ctx.moveTo(90, 90); ctx.lineTo(150, 150); ctx.stroke();
    } else if (item.id === "headset" || item.id === "cat_ear") {
      ctx.save();
      ctx.translate(120, 124);
      ctx.scale(0.56, 0.56);
      ctx.translate(-240, -162);
      drawDetailedHat(ctx, item);
      ctx.restore();
    } else {
      ctx.save();
      ctx.translate(120, 138);
      ctx.scale(0.74, 0.74);
      ctx.translate(-240, -68);
      drawDetailedHat(ctx, item);
      ctx.restore();
    }
  } else if (category === "wing") {
    if (!item || item.id === "none") {
      ctx.strokeStyle = "#57534e"; ctx.lineWidth = 8;
      ctx.beginPath(); ctx.arc(120, 120, 44, 0, Math.PI * 2); ctx.moveTo(90, 90); ctx.lineTo(150, 150); ctx.stroke();
    } else {
      ctx.save();
      ctx.translate(120, 124);
      ctx.scale(0.56, 0.56);
      ctx.translate(-240, -292);
      drawDetailedWing(ctx, item);
      ctx.restore();
    }
  } else if (category === "outfit") {
    ctx.save();
    ctx.translate(120, 120);
    ctx.scale(0.88, 0.88);
    ctx.translate(-240, -320);
    drawDetailedOutfit(ctx, item, false, { isThumb: true });
    ctx.restore();
  } else if (category === "fishing_rod") {
    if (!item || item.id === "none") {
      ctx.strokeStyle = "#94a3b8";
      ctx.lineWidth = 8;
      ctx.setLineDash([10, 8]);
      ctx.beginPath();
      ctx.moveTo(56, 184);
      ctx.quadraticCurveTo(116, 118, 184, 54);
      ctx.stroke();
      ctx.setLineDash([]);
    } else {
      const rodCol =
        item.id === "rod_s" ? "#facc15" : item.id === "rod_a" ? "#e11d48" : item.id === "rod_b" ? "#0284c7" : "#b45309";
      const gripCol =
        item.id === "rod_s" ? "#92400e" : item.id === "rod_a" ? "#1e1b4b" : item.id === "rod_b" ? "#0f172a" : "#78350f";

      // 휘어진 낚싯대 본체 (굵은 윤곽선)
      ctx.lineCap = "round";
      ctx.strokeStyle = outline;
      ctx.lineWidth = 17;
      ctx.beginPath();
      ctx.moveTo(46, 192);
      ctx.quadraticCurveTo(106, 126, 182, 48);
      ctx.stroke();

      ctx.strokeStyle = rodCol;
      ctx.lineWidth = 10;
      ctx.beginPath();
      ctx.moveTo(46, 192);
      ctx.quadraticCurveTo(106, 126, 182, 48);
      ctx.stroke();

      // 손잡이 그립 + 릴
      ctx.strokeStyle = outline;
      ctx.lineWidth = 22;
      ctx.beginPath();
      ctx.moveTo(42, 196);
      ctx.lineTo(74, 164);
      ctx.stroke();
      ctx.strokeStyle = gripCol;
      ctx.lineWidth = 14;
      ctx.beginPath();
      ctx.moveTo(42, 196);
      ctx.lineTo(74, 164);
      ctx.stroke();

      ctx.fillStyle = item.id === "rod_s" ? "#fde047" : "#cbd5e1";
      ctx.strokeStyle = outline;
      ctx.lineWidth = 6;
      ctx.beginPath();
      ctx.arc(84, 174, 16, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = rodCol;
      ctx.beginPath();
      ctx.arc(84, 174, 6, 0, Math.PI * 2);
      ctx.fill();

      // 가이드 링 & 낚싯줄 + 바늘 + 등급 반짝이
      [
        [114, 122],
        [148, 84],
        [182, 48]
      ].forEach(([gx, gy]) => {
        ctx.fillStyle = "#fef08a";
        ctx.strokeStyle = outline;
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.arc(gx - 3, gy - 3, 6.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
      });

      ctx.strokeStyle = "#38bdf8";
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.moveTo(182, 48);
      ctx.quadraticCurveTo(196, 108, 178, 166);
      ctx.stroke();

      ctx.strokeStyle = outline;
      ctx.lineWidth = 5;
      ctx.beginPath();
      ctx.arc(172, 173, 9, 0, Math.PI * 1.15);
      ctx.stroke();

      if (item.id === "rod_a" || item.id === "rod_s") {
        drawStar(ctx, 118, 62, 14, 6, 5, item.id === "rod_s" ? "#fde047" : "#fb7185", outline, 3.5);
      }
    }
  } else if (category === "fishing_bait") {
    if (!item || item.id === "none") {
      ctx.strokeStyle = "#94a3b8";
      ctx.lineWidth = 8;
      ctx.setLineDash([8, 7]);
      ctx.beginPath();
      ctx.arc(120, 120, 42, 0, Math.PI * 2);
      ctx.stroke();
      ctx.setLineDash([]);
    } else if (item.id === "bait_c") {
      // 지렁이 미끼
      ctx.lineCap = "round";
      ctx.strokeStyle = outline;
      ctx.lineWidth = 36;
      ctx.beginPath();
      ctx.moveTo(54, 152);
      ctx.bezierCurveTo(78, 86, 128, 168, 158, 104);
      ctx.quadraticCurveTo(176, 78, 188, 98);
      ctx.stroke();

      ctx.strokeStyle = "#fb7185";
      ctx.lineWidth = 24;
      ctx.beginPath();
      ctx.moveTo(54, 152);
      ctx.bezierCurveTo(78, 86, 128, 168, 158, 104);
      ctx.quadraticCurveTo(176, 78, 188, 98);
      ctx.stroke();

      ctx.strokeStyle = "#fda4af";
      ctx.lineWidth = 7;
      ctx.beginPath();
      ctx.moveTo(92, 112);
      ctx.lineTo(100, 124);
      ctx.moveTo(128, 130);
      ctx.lineTo(136, 120);
      ctx.stroke();

      ctx.fillStyle = outline;
      ctx.beginPath();
      ctx.arc(178, 92, 4, 0, Math.PI * 2);
      ctx.fill();
    } else if (item.id === "bait_b") {
      // 새우 미끼
      ctx.fillStyle = "#f97316";
      ctx.strokeStyle = outline;
      ctx.lineWidth = 7;
      ctx.beginPath();
      ctx.moveTo(64, 146);
      ctx.quadraticCurveTo(52, 90, 116, 66);
      ctx.quadraticCurveTo(182, 58, 184, 110);
      ctx.quadraticCurveTo(164, 132, 126, 116);
      ctx.quadraticCurveTo(96, 130, 88, 162);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = "#fdba74";
      ctx.beginPath();
      ctx.ellipse(122, 86, 30, 12, -0.3, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = outline;
      ctx.beginPath();
      ctx.arc(166, 94, 5, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = outline;
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.moveTo(182, 102);
      ctx.quadraticCurveTo(208, 88, 210, 62);
      ctx.moveTo(178, 112);
      ctx.quadraticCurveTo(208, 118, 212, 142);
      ctx.stroke();
    } else if (item.id === "bait_a") {
      // 루어 미끼 (청록 반짝 물고기 루어 + 트레블 훅)
      ctx.fillStyle = "#38bdf8";
      ctx.strokeStyle = outline;
      ctx.lineWidth = 7;
      ctx.beginPath();
      ctx.ellipse(118, 112, 62, 30, -0.18, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = "#e0f2fe";
      ctx.beginPath();
      ctx.ellipse(120, 122, 46, 12, -0.18, 0, Math.PI);
      ctx.fill();

      ctx.fillStyle = "#f43f5e";
      ctx.strokeStyle = outline;
      ctx.lineWidth = 5;
      ctx.beginPath();
      ctx.moveTo(60, 124);
      ctx.lineTo(34, 102);
      ctx.lineTo(38, 148);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = "#fde047";
      ctx.strokeStyle = outline;
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.arc(154, 102, 8, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      ctx.strokeStyle = outline;
      ctx.lineWidth = 5;
      ctx.beginPath();
      ctx.arc(114, 152, 10, 0, Math.PI * 1.2);
      ctx.stroke();
      drawStar(ctx, 168, 66, 12, 5, 5, "#ffffff", outline, 3);
    } else {
      // 황금 떡밥
      ctx.fillStyle = "#fef08a";
      ctx.strokeStyle = outline;
      ctx.lineWidth = 8;
      ctx.beginPath();
      ctx.arc(120, 134, 48, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = "#facc15";
      ctx.beginPath();
      ctx.arc(106, 124, 24, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#ffffff";
      ctx.beginPath();
      ctx.arc(98, 114, 9, 0, Math.PI * 2);
      ctx.fill();

      fillRoundRect(ctx, 94, 74, 52, 22, 10, "#f59e0b", outline, 6);
      drawStar(ctx, 64, 82, 13, 5.5, 5, "#fde047", outline, 3.5);
      drawStar(ctx, 178, 86, 11, 5, 5, "#fde047", outline, 3);
    }
  } else if (category === "bg") {
    // 상점 배경 타일도 2색 사각형 대신 실제 배경 일러스트 축소본 둥근 카드 렌더링!
    ctx.save();
    ctx.beginPath();
    if (typeof ctx.roundRect === "function") ctx.roundRect(14, 18, 212, 204, 26);
    else ctx.rect(14, 18, 212, 204);
    ctx.clip();
    ctx.translate(14, 18);
    renderApfWideBackground(ctx, 212, 204, item, { isThumb: true });
    ctx.restore();
    fillRoundRect(ctx, 14, 18, 212, 204, 26, null, outline, 7);
  } else {
    fillRoundRect(ctx, 24, 66, 192, 108, 22, "#fef08a", "#b45309", 9);
    ctx.fillStyle = "#b45309"; ctx.font = "900 32px sans-serif"; ctx.textAlign = "center";
    ctx.fillText(item.id === "gender_ticket" ? "⚧️ 10000" : "🎫 5000", 120, 132);
  }

  ctx.restore();
}

// ============================================================================
// 4. 로그인 화면 전용 '고해상도 도트 디자인 [음악왕] 대형 타이틀 로고' 렌더러
// ============================================================================
function renderPixelLogo(canvas) {
  if (!canvas) return;
  const ctx = canvas.getContext("2d");
  const W = canvas.width;
  const H = canvas.height;

  ctx.save();
  ctx.clearRect(0, 0, W, H);
  ctx.imageSmoothingEnabled = false;

  const gw = 140;
  const gh = 76;
  const pCanvas = document.createElement("canvas");
  pCanvas.width = gw;
  pCanvas.height = gh;
  const pCtx = pCanvas.getContext("2d");
  pCtx.imageSmoothingEnabled = false;

  pCtx.fillStyle = "#17153b";
  pCtx.fillRect(0, 0, gw, gh);
  pCtx.fillStyle = "#2e236c";
  pCtx.fillRect(3, 3, gw - 6, gh - 6);
  pCtx.fillStyle = "#433d8b";
  pCtx.fillRect(6, 6, gw - 12, gh - 12);

  pCtx.fillStyle = "rgba(255, 255, 255, 0.05)";
  for (let y = 8; y < gh - 8; y += 4) {
    pCtx.fillRect(6, y, gw - 12, 2);
  }

  pCtx.fillStyle = "#090d16";
  pCtx.fillRect(0, 0, gw, 2);
  pCtx.fillRect(0, gh - 2, gw, 2);
  pCtx.fillRect(0, 0, 2, gh);
  pCtx.fillRect(gw - 2, 0, 2, gh);

  pCtx.fillStyle = "#facc15";
  pCtx.fillRect(2, 2, gw - 4, 2);
  pCtx.fillRect(2, gh - 4, gw - 4, 2);
  pCtx.fillRect(2, 2, 2, gh - 4);
  pCtx.fillRect(gw - 4, 2, 2, gh - 4);

  [[4, 4], [gw - 8, 4], [4, gh - 8], [gw - 8, gh - 8]].forEach(([cx, cy]) => {
    pCtx.fillStyle = "#090d16"; pCtx.fillRect(cx - 1, cy - 1, 6, 6);
    pCtx.fillStyle = "#f43f5e"; pCtx.fillRect(cx, cy, 4, 4);
    pCtx.fillStyle = "#fda4af"; pCtx.fillRect(cx, cy, 2, 2);
  });

  [[14, 13], [26, 9], [114, 11], [124, 18], [13, 56], [125, 54], [44, 10], [96, 10]].forEach(([sx, sy]) => {
    pCtx.fillStyle = "#fde047";
    pCtx.fillRect(sx - 1, sy, 3, 1);
    pCtx.fillRect(sx, sy - 1, 1, 3);
    pCtx.fillStyle = "#ffffff";
    pCtx.fillRect(sx, sy, 1, 1);
  });

  pCtx.fillStyle = "#090d16"; pCtx.fillRect(55, 6, 30, 13);
  pCtx.fillStyle = "#f59e0b"; pCtx.fillRect(57, 10, 26, 7);
  pCtx.fillStyle = "#fde047";
  pCtx.fillRect(57, 7, 4, 4); pCtx.fillRect(68, 5, 4, 6); pCtx.fillRect(79, 7, 4, 4);
  pCtx.fillRect(58, 11, 24, 4);
  pCtx.fillStyle = "#ef4444"; pCtx.fillRect(68, 11, 4, 3);
  pCtx.fillStyle = "#38bdf8"; pCtx.fillRect(60, 12, 3, 2); pCtx.fillRect(77, 12, 3, 2);

  const maskCanvas = document.createElement("canvas");
  maskCanvas.width = gw;
  maskCanvas.height = gh;
  const mCtx = maskCanvas.getContext("2d");
  mCtx.fillStyle = "#ffffff";
  mCtx.font = "900 38px 'Malgun Gothic', 'Apple SD Gothic Neo', sans-serif";
  mCtx.textAlign = "center";
  mCtx.textBaseline = "middle";
  mCtx.fillText("음악왕", gw / 2, 41);

  const imgData = mCtx.getImageData(0, 0, gw, gh).data;
  const isOn = (x, y) => {
    if (x < 0 || x >= gw || y < 0 || y >= gh) return false;
    return imgData[(y * gw + x) * 4 + 3] > 115;
  };

  for (let y = 16; y < 66; y++) {
    for (let x = 6; x < gw - 6; x++) {
      if (isOn(x, y)) {
        for (let dy = -2; dy <= 4; dy++) {
          for (let dx = -2; dx <= 2; dx++) {
            pCtx.fillStyle = "#090d16";
            pCtx.fillRect(x + dx, y + dy, 1, 1);
          }
        }
      }
    }
  }

  for (let y = 16; y < 66; y++) {
    for (let x = 6; x < gw - 6; x++) {
      if (isOn(x, y)) {
        pCtx.fillStyle = "#b45309";
        pCtx.fillRect(x, y + 2, 1, 1);
        pCtx.fillStyle = "#ea580c";
        pCtx.fillRect(x, y + 1, 1, 1);
      }
    }
  }

  for (let y = 16; y < 66; y++) {
    for (let x = 6; x < gw - 6; x++) {
      if (isOn(x, y)) {
        if (!isOn(x, y - 1)) pCtx.fillStyle = "#ffffff";
        else if (y < 34) pCtx.fillStyle = "#fef08a";
        else if (y < 44) pCtx.fillStyle = "#facc15";
        else pCtx.fillStyle = "#f59e0b";
        pCtx.fillRect(x, y, 1, 1);
      }
    }
  }

  ctx.drawImage(pCanvas, 0, 0, W, H);
  ctx.restore();
}
