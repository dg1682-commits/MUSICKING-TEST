// ============================================================================
// [음악왕 v4.0] Supabase 클라우드 연동 · 대기실/방 분리 · 프로필 전적 · 상용 친구창 (online.js)
// - 대기실: 방 목록 + 접속 유저 리스트(닉네임 왼쪽에 480x480 캐릭터 아이콘)
// - 방 내부: 방에 입장한 유저들의 캐릭터만 맵에 표시 + 방 내부 전용 채팅 + 혼자 나갈 시 방 자동 삭제
// - 좌측 상단 내 닉네임 클릭 시: 통산 전적 & 최고 점수 & 내 랭킹 순위 프로필 팝업 표시
// ============================================================================

// [V2.0 테섭(Staging) Supabase] 본섭 반영 시 아래 주석의 본섭 URL/KEY로 교체하세요.
// 본섭: "https://szafomntmenppcbczrwl.supabase.co" / "sb_publishable_msR49lWjgSJQnMQxSzIaug_XXlJUd4Z"
const SUPABASE_URL = "https://ntayjjpakcbtrqdppjle.supabase.co";
const SUPABASE_KEY = "sb_publishable_tGc8gA_738CIahaHy71CUQ_SlHhT7JE";

let sbClient = null;
window.mkSupabaseAccessToken = "";
if (window.supabase && window.supabase.createClient) {
  sbClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
  try {
    sbClient.auth.onAuthStateChange((_event, session) => {
      window.mkSupabaseAccessToken = session?.access_token || "";
    });
  } catch (e) {}
}

// ============================================================================
// 커스텀 상용 게임 모달 팝업 (시스템 alert/confirm/prompt 완전 대체)
// ============================================================================
window.gameAlert = function (message, title = "👑 음악왕 알림") {
  const modal = document.getElementById("customDialogModal");
  if (!modal) return;
  document.getElementById("dialogTitle").textContent = title;
  document.getElementById("dialogMessage").innerHTML = String(message).replace(/\n/g, "<br/>");
  document.getElementById("dialogInputWrap").classList.add("hidden");
  document.getElementById("dialogCancelBtn").classList.add("hidden");

  const okBtn = document.getElementById("dialogConfirmBtn");
  okBtn.textContent = "확인";
  okBtn.onclick = () => modal.classList.add("hidden");
  modal.classList.remove("hidden");
};

window.gameConfirm = function (message, onConfirm, title = "✨ 확인해주세요", onCancel = null) {
  const modal = document.getElementById("customDialogModal");
  if (!modal) return;
  document.getElementById("dialogTitle").textContent = title;
  document.getElementById("dialogMessage").innerHTML = String(message).replace(/\n/g, "<br/>");
  document.getElementById("dialogInputWrap").classList.add("hidden");

  const cancelBtn = document.getElementById("dialogCancelBtn");
  cancelBtn.classList.remove("hidden");
  cancelBtn.textContent = "취소";
  cancelBtn.onclick = () => {
    modal.classList.add("hidden");
    if (typeof onCancel === "function") onCancel();
  };

  const okBtn = document.getElementById("dialogConfirmBtn");
  okBtn.textContent = "확인";
  okBtn.onclick = () => {
    modal.classList.add("hidden");
    if (typeof onConfirm === "function") onConfirm();
  };
  modal.classList.remove("hidden");
};

window.gamePrompt = function (message, defaultValue = "", onConfirm, title = "✏️ 입력하기") {
  const modal = document.getElementById("customDialogModal");
  if (!modal) return;
  document.getElementById("dialogTitle").textContent = title;
  document.getElementById("dialogMessage").innerHTML = String(message).replace(/\n/g, "<br/>");

  const inputWrap = document.getElementById("dialogInputWrap");
  const inputEl = document.getElementById("dialogPromptInput");
  inputWrap.classList.remove("hidden");
  inputEl.value = defaultValue;

  const cancelBtn = document.getElementById("dialogCancelBtn");
  cancelBtn.classList.remove("hidden");
  cancelBtn.textContent = "취소";
  cancelBtn.onclick = () => modal.classList.add("hidden");

  const okBtn = document.getElementById("dialogConfirmBtn");
  okBtn.textContent = "완료";
  okBtn.onclick = () => {
    const val = inputEl.value.trim();
    modal.classList.add("hidden");
    if (typeof onConfirm === "function") onConfirm(val);
  };
  modal.classList.remove("hidden");
  setTimeout(() => inputEl.focus(), 60);
};

// ============================================================================
// 유저 상태 및 헤더/로비 동기화
// ============================================================================
const DEFAULT_BATTLE_STATS = {
  "1v1": { wins: 0, losses: 0 },
  "4p": { wins: 0, losses: 0 }
};

function normalizeBattleStats(raw) {
  const s = raw || {};
  return {
    "1v1": { wins: Number(s["1v1"]?.wins) || 0, losses: Number(s["1v1"]?.losses) || 0 },
    "4p": { wins: Number(s["4p"]?.wins) || 0, losses: Number(s["4p"]?.losses) || 0 }
  };
}

function formatBattleStatText(statObj) {
  const w = Number(statObj?.wins) || 0;
  const l = Number(statObj?.losses) || 0;
  const total = w + l;
  const pct = total > 0 ? Math.round((w / total) * 100) : 0;
  return `${total}전 ${w}승 ${l}패 (${pct}%)`;
}

const userState = {
  id: null,
  nickname: "게스트도전자",
  bio: "안녕하세요! 음악왕 도전자입니다.",
  cdCoins: 100,
  exp: 0,
  claimedTopRanks: {},
  battleStats: normalizeBattleStats(DEFAULT_BATTLE_STATS),
  blockedUsers: [],
  fishingDaily: null,
  fishingLive: null,
  inventory: {},
  equippedItems: [],
  dailyState: null,
  v2BaitMigrated: false,
  avatarConfig: { ...DEFAULT_AVATAR_CONFIG },
  ownedItems: ["meadow", "default", "none", "basic", "mic_silver"],
  isLoggedIn: false
};

function getV2KstDayKey(nowMs = Date.now()) {
  const shifted = new Date(nowMs + (9 * 60 * 60 * 1000) - (6 * 60 * 60 * 1000));
  const y = shifted.getUTCFullYear();
  const m = String(shifted.getUTCMonth() + 1).padStart(2, "0");
  const d = String(shifted.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function createFreshDailyState(dayKey = getV2KstDayKey()) {
  return {
    kstDate: dayKey,
    dailyCdClaimed: false,
    randomBoxClaimed: false,
    attendanceClaimedToday: false,
    attendanceStreak: 0,
    shopAdCount: 0,
    itemAdCounts: {},
    fishing2xExpiresAt: 0,
    fishing2xKstDate: dayKey
  };
}

function ensureV2DailyState() {
  const today = getV2KstDayKey();
  const cur = userState.dailyState && typeof userState.dailyState === "object"
    ? { ...userState.dailyState }
    : createFreshDailyState(today);
  if (cur.kstDate !== today) {
    cur.kstDate = today;
    cur.dailyCdClaimed = false;
    cur.randomBoxClaimed = false;
    cur.attendanceClaimedToday = false;
    cur.shopAdCount = 0;
    cur.itemAdCounts = {};
    cur.fishing2xExpiresAt = 0;
    cur.fishing2xKstDate = today;
    if (Number(cur.attendanceStreak) >= 28) {
      cur.attendanceStreak = 0;
    }
  }
  if (!cur.itemAdCounts || typeof cur.itemAdCounts !== "object") {
    cur.itemAdCounts = {};
  }
  userState.dailyState = cur;
  return cur;
}

function escapeJsSingleArg(str) {
  return String(str || "")
    .replace(/\\/g, "\\\\")
    .replace(/'/g, "\\'")
    .replace(/"/g, "&quot;");
}

function getBlockedStorageKey(uid = userState.id) {
  return `mk_blocked_users_${uid || "guest"}`;
}

function normalizeBlockedList(arr) {
  if (!Array.isArray(arr)) return [];
  const seen = new Set();
  const res = [];
  for (const item of arr) {
    if (!item) continue;
    const id = item.id ? String(item.id) : "";
    const nickname = item.nickname ? String(item.nickname) : "";
    const key = id || (nickname ? `nick:${nickname}` : "");
    if (!key || seen.has(key)) continue;
    seen.add(key);
    res.push({ id, nickname, blockedAt: item.blockedAt || new Date().toISOString() });
  }
  return res;
}

function loadBlockedUsersFromStorage(profileBlocked = null) {
  let localArr = [];
  try {
    localArr = JSON.parse(localStorage.getItem(getBlockedStorageKey()) || "[]");
  } catch (e) {}
  const merged = normalizeBlockedList([...(Array.isArray(profileBlocked) ? profileBlocked : []), ...(Array.isArray(localArr) ? localArr : [])]);
  userState.blockedUsers = merged;
  try {
    localStorage.setItem(getBlockedStorageKey(), JSON.stringify(merged));
  } catch (e) {}
  return merged;
}

function saveBlockedUsersToStorage() {
  userState.blockedUsers = normalizeBlockedList(userState.blockedUsers);
  try {
    localStorage.setItem(getBlockedStorageKey(), JSON.stringify(userState.blockedUsers));
  } catch (e) {}
}

function isUserBlocked(targetId, targetNick = "") {
  const list = userState.blockedUsers || [];
  if (list.length === 0) return false;
  return list.some(b => {
    if (targetId && b.id && String(b.id) === String(targetId)) return true;
    if (targetNick && b.nickname && !b.id && b.nickname === targetNick) return true;
    return false;
  });
}

const shopPreviewState = {
  config: { ...DEFAULT_AVATAR_CONFIG },
  selectedCat: "hair",
  selectedItem: null
};

let pendingSignupGender = "male";

function resetUserStateToFreshDefaults() {
  if (typeof cleanupFishingRuntime === "function") {
    try { cleanupFishingRuntime(false); } catch (e) {}
  }
  userState.id = null;
  userState.nickname = "게스트도전자";
  userState.bio = "안녕하세요! 음악왕 도전자입니다.";
  userState.cdCoins = 100;
  userState.exp = 0;
  userState.claimedTopRanks = {};
  userState.battleStats = normalizeBattleStats(DEFAULT_BATTLE_STATS);
  userState.blockedUsers = [];
  userState.fishingDaily = null;
  userState.fishingLive = null;
  userState.inventory = {};
  userState.equippedItems = [];
  userState.dailyState = createFreshDailyState();
  userState.v2BaitMigrated = false;
  userState.avatarConfig = { ...DEFAULT_AVATAR_CONFIG };
  userState.ownedItems = ["meadow", "default", "none", "basic", "mic_silver"];
  userState.isLoggedIn = false;

  shopPreviewState.config = { ...DEFAULT_AVATAR_CONFIG };
  shopPreviewState.selectedCat = "hair";
  shopPreviewState.selectedItem = null;

  if (typeof dmNotiState !== "undefined") {
    dmNotiState.unreadList = [];
    if (dmNotiState.profileMap) dmNotiState.profileMap.clear();
  }
  if (typeof dmState !== "undefined") {
    dmState.peerId = null;
    dmState.peerNick = "";
    dmState.peerAvatar = { ...DEFAULT_AVATAR_CONFIG };
  }
  if (typeof plazaState !== "undefined") {
    if (plazaState.onlinePlayers) plazaState.onlinePlayers.clear();
    plazaState.currentRoom = null;
    plazaState.lastRenderedQIndex = null;
    plazaState.lastRoomId = null;
    plazaState.lastRewardedKey = null;
  }
  if (typeof syncDmNotiBadgeUI === "function") {
    try { syncDmNotiBadgeUI(); } catch (e) {}
  }
}

const plazaState = {
  channel: null,
  onlinePlayers: new Map(),
  currentRoom: null,
  roomChannel: null,
  roomPollTimer: null,
  lastRenderedQIndex: null,
  lastRoomId: null,
  pendingRoundToast: null,
  battleToastTimer: null,
  roomPlayersMap: new Map(), // 방 내부 맵 캐릭터 좌표/말풍선 상태
  myRoomX: 130,
  myRoomChat: "",
  myRoomChatExpire: 0,
  roomAnimFrame: null,
  roomFilter: "ALL"
};

window.selectSignupGender = function (gender) {
  pendingSignupGender = gender === "female" ? "female" : "male";
  document.querySelectorAll("[data-signup-gender]").forEach(btn => {
    btn.classList.toggle("active", btn.getAttribute("data-signup-gender") === pendingSignupGender);
  });
  const signupPreview = document.getElementById("signupCharPreview");
  if (signupPreview) {
    renderPixelAvatar(signupPreview, { ...DEFAULT_AVATAR_CONFIG, gender: pendingSignupGender });
  }
};

window.openSignupGenderStep = async function () {
  const nickInput = document.getElementById("authNicknameInput").value.trim();
  const pwInput = document.getElementById("authPasswordInput").value.trim();

  if (!nickInput || nickInput.length < 2) {
    gameAlert("가입할 닉네임을 2글자 이상 먼저 입력해주세요.");
    return;
  }
  if (!pwInput || pwInput.length < 6) {
    gameAlert("비밀번호를 6자리 이상 먼저 입력해주세요.");
    return;
  }
  if (sbClient) {
    try {
      const { data: existNick } = await sbClient
        .from("profiles")
        .select("id")
        .eq("nickname", nickInput)
        .maybeSingle();
      if (existNick) {
        gameAlert("이미 사용 중인 닉네임입니다!\n다른 닉네임을 입력하거나 [로그인]을 눌러주세요.");
        return;
      }
    } catch (e) {}
  }

  pendingSignupGender = "male";
  resetUserStateToFreshDefaults();
  document.querySelectorAll("[data-signup-gender]").forEach(btn => {
    btn.classList.toggle("active", btn.getAttribute("data-signup-gender") === "male");
  });

  openModal("signupGenderModal");
  const signupPreview = document.getElementById("signupCharPreview");
  if (signupPreview) renderPixelAvatar(signupPreview, { ...DEFAULT_AVATAR_CONFIG, gender: "male" });
};

window.confirmSignupWithGender = function () {
  closeModal("signupGenderModal");
  handleAuthSubmit("signup");
};

function updateHeaderUserUI() {
  const cdEl = document.getElementById("headerCdCount");
  if (cdEl) cdEl.textContent = `${userState.cdCoins}`;

  // 왼쪽 상단: 아이콘·도형 없이 닉네임 전체 표기
  const topNickEl = document.getElementById("headerTopMyNick");
  if (topNickEl) {
    topNickEl.textContent = String(userState.nickname || "도전자");
  }

  // 관리자 백엔드 버튼은 아이디가 "관리자"인 경우에만 노출!
  const adminBtn = document.getElementById("settingsAdminMenuBtn");
  if (adminBtn) {
    adminBtn.classList.toggle("hidden", !(userState.isLoggedIn && userState.nickname === "관리자"));
  }

  // 레벨 · 타이틀 · 경험치 UI 동기화
  if (typeof getLevelInfo === "function") {
    const lv = getLevelInfo(userState.exp);
    const titlePill = document.getElementById("homeCharTitlePill");
    if (titlePill) titlePill.textContent = `Lv.${lv.level} ${lv.title}`;

    const lvLabel = document.getElementById("homeExpLevelLabel");
    if (lvLabel) {
      lvLabel.textContent = lv.isMax
        ? `Lv.20 MAX (${lv.exp.toLocaleString()} EXP)`
        : `Lv.${lv.level} (${lv.inLevelExp.toLocaleString()} / ${lv.needInLevel.toLocaleString()} EXP)`;
    }
    const pctLabel = document.getElementById("homeExpPercentLabel");
    if (pctLabel) pctLabel.textContent = `${lv.percent.toFixed(1)}%`;

    const barFill = document.getElementById("homeExpBarFill");
    if (barFill) barFill.style.width = `${lv.percent.toFixed(1)}%`;
  }

  const homeCanvas = document.getElementById("homeHeroAvatar");
  if (homeCanvas) renderPixelAvatar(homeCanvas, userState.avatarConfig);

  const logoCanvas = document.getElementById("loginLogoCanvas");
  if (logoCanvas && typeof renderPixelLogo === "function") {
    renderPixelLogo(logoCanvas);
  }

  const signupPreview = document.getElementById("signupCharPreview");
  if (signupPreview) renderPixelAvatar(signupPreview, userState.avatarConfig);
}

window.openTitlesModal = function () {
  if (typeof EXP_LEVEL_TABLE === "undefined") return;
  const lv = getLevelInfo(userState.exp);
  const summaryEl = document.getElementById("titlesCurrentSummary");
  if (summaryEl) {
    summaryEl.textContent = lv.isMax
      ? `👑 현재 최고 레벨 Lv.20 달성! (${lv.title}) · 총 ${lv.exp.toLocaleString()} EXP`
      : `현재 Lv.${lv.level} [${lv.title}] · 보유 ${lv.exp.toLocaleString()} EXP (Lv.${lv.level + 1}까지 ${(lv.nextReq - lv.exp).toLocaleString()} EXP 남음)`;
  }

  const listEl = document.getElementById("titlesTableList");
  if (listEl) {
    listEl.innerHTML = EXP_LEVEL_TABLE.map((row, idx) => {
      const unlocked = userState.exp >= row.reqExp;
      const isCurrent = lv.level === row.level;
      const nextReq = EXP_LEVEL_TABLE[idx + 1] ? EXP_LEVEL_TABLE[idx + 1].reqExp : null;
      const rangeStr = nextReq
        ? `필요 누적 ${row.reqExp.toLocaleString()} EXP (다음 +${(nextReq - row.reqExp).toLocaleString()})`
        : `최종 달성 누적 ${row.reqExp.toLocaleString()} EXP (MAX)`;
      return `
        <div class="pixel-list-item" style="cursor:default; background:${isCurrent ? "#fef9c3" : unlocked ? "#f0fdf4" : "#f8fafc"}; border-color:${isCurrent ? "#f59e0b" : unlocked ? "#86efac" : "#cbd5e1"};">
          <div>
            <div style="font-weight:900; font-size:0.88rem; color:var(--text-main);">Lv.${row.level} ${row.title} ${isCurrent ? "⭐(현재)" : ""}</div>
            <div style="font-size:0.73rem; color:var(--text-sub);">${rangeStr}</div>
          </div>
          <span class="badge ${unlocked ? "accent" : ""}">${unlocked ? "✅ 달성" : "🔒 잠금"}</span>
        </div>
      `;
    }).join("");
  }
  openModal("titlesModal");
};

// ============================================================================
// 아이디 저장 / 자동로그인 설정 관리
// ============================================================================
window.initAuthPreferences = function () {
  const saveIdBox = document.getElementById("saveIdCheckbox");
  const autoLoginBox = document.getElementById("autoLoginCheckbox");
  const nickInput = document.getElementById("authNicknameInput");

  const saveIdPref = localStorage.getItem("mk_save_id") !== "false";
  const autoLoginPref = localStorage.getItem("mk_auto_login") !== "false";
  const savedNick = localStorage.getItem("mk_saved_nick") || "";

  if (saveIdBox) saveIdBox.checked = saveIdPref;
  if (autoLoginBox) autoLoginBox.checked = autoLoginPref;
  if (nickInput && saveIdPref && savedNick) {
    nickInput.value = savedNick;
  }
};

window.saveAuthPreferences = function (nickToSave = null) {
  const saveIdBox = document.getElementById("saveIdCheckbox");
  const autoLoginBox = document.getElementById("autoLoginCheckbox");
  const nickInput = document.getElementById("authNicknameInput");

  const saveId = saveIdBox ? saveIdBox.checked : true;
  const autoLogin = autoLoginBox ? autoLoginBox.checked : true;

  localStorage.setItem("mk_save_id", saveId ? "true" : "false");
  localStorage.setItem("mk_auto_login", autoLogin ? "true" : "false");

  const targetNick = nickToSave !== null ? nickToSave : (nickInput ? nickInput.value.trim() : "");
  if (saveId && targetNick) {
    localStorage.setItem("mk_saved_nick", targetNick);
  } else if (!saveId) {
    localStorage.removeItem("mk_saved_nick");
  }
};

function nicknameToEmail(nick) {
  const hex = Array.from(nick.trim())
    .map(c => c.charCodeAt(0).toString(16))
    .join("");
  return `u_${hex.slice(0, 36)}@musicking.com`;
}

// ============================================================================
// Supabase 글로벌 설정 & 세션 복원
// ============================================================================
async function loadServerGlobalConfigs() {
  if (!sbClient) return;
  try {
    const { data } = await sbClient
      .from("profiles")
      .select("avatar_config, owned_items")
      .eq("nickname", "__ADMIN_CONFIG__")
      .maybeSingle();

    if (data) {
      if (data.avatar_config && data.avatar_config.shopCatalog) {
        applyServerShopCatalog(data.avatar_config.shopCatalog, data.avatar_config.catalogVersion || 0);
      }
      if (Array.isArray(data.owned_items) && data.owned_items.length > 0) {
        applyServerSongsOverride(data.owned_items);
      }
    }
  } catch (e) {}
}

function applyServerSongsOverride(serverSongs) {
  if (!Array.isArray(serverSongs)) return;
  const map = new Map(QUESTIONS_DB.map((q, idx) => [q.id, idx]));
  serverSongs.forEach(sq => {
    if (!sq || !sq.id) return;
    if (sq._deleted) {
      const i = QUESTIONS_DB.findIndex(item => item.id === sq.id);
      if (i !== -1) QUESTIONS_DB.splice(i, 1);
      return;
    }
    if (map.has(sq.id)) {
      const idx = QUESTIONS_DB.findIndex(item => item.id === sq.id);
      if (idx !== -1) QUESTIONS_DB[idx] = { ...QUESTIONS_DB[idx], ...sq };
    } else {
      QUESTIONS_DB.push(sq);
    }
  });
  if (typeof updateLobbyCounts === "function") updateLobbyCounts();
}

function getRequestedLegalAction() {
  try {
    const params = new URLSearchParams(window.location.search || "");
    const page = (params.get("page") || params.get("action") || "").toLowerCase();
    const hash = (window.location.hash || "").toLowerCase();
    if (page === "privacy" || hash === "#privacy") return "privacy";
    if (page === "delete" || hash === "#delete" || hash === "#delete-account") return "delete";
  } catch (e) {}
  return "";
}

window.openPrivacyPolicyModal = function () {
  if (typeof openModal === "function") openModal("privacyPolicyModal");
};

window.openExternalDeleteAccountModal = function () {
  const nickInput = document.getElementById("extDeleteNickInput");
  const pwInput = document.getElementById("extDeletePwInput");
  const authNick = document.getElementById("authNicknameInput")?.value?.trim() || "";
  if (nickInput) {
    nickInput.value = (userState.isLoggedIn ? userState.nickname : authNick) || localStorage.getItem("mk_saved_nick") || "";
  }
  if (pwInput) pwInput.value = "";
  if (typeof openModal === "function") openModal("externalDeleteModal");
};

function applyProfileRowToUserState(uid, prof, fallbackNick = "도전자") {
  resetUserStateToFreshDefaults();
  const rawCfg = prof?.avatar_config || {};
  userState.id = uid;
  userState.nickname = prof?.nickname || fallbackNick;
  userState.bio = prof?.bio || "안녕하세요! 음악왕 도전자입니다.";
  userState.cdCoins = prof?.cd_coins ?? 100;
  userState.exp = Number(rawCfg._exp) || 0;
  userState.claimedTopRanks = rawCfg._claimedTopRanks || {};
  userState.battleStats = normalizeBattleStats(rawCfg._battleStats);
  userState.fishingDaily =
    rawCfg._fishingDaily && typeof rawCfg._fishingDaily === "object"
      ? { ...rawCfg._fishingDaily }
      : null;
  userState.fishingLive =
    rawCfg._fishingLive && typeof rawCfg._fishingLive === "object"
      ? { ...rawCfg._fishingLive }
      : null;
  userState.inventory =
    rawCfg._inventory && typeof rawCfg._inventory === "object"
      ? { ...rawCfg._inventory }
      : {};
  userState.equippedItems = Array.isArray(rawCfg._equippedItems)
    ? rawCfg._equippedItems.filter(Boolean).slice(0, 6)
    : [];
  userState.dailyState =
    rawCfg._dailyState && typeof rawCfg._dailyState === "object"
      ? { ...rawCfg._dailyState }
      : createFreshDailyState();
  userState.v2BaitMigrated = Boolean(rawCfg._v2BaitMigrated);
  userState.avatarConfig = sanitizeAvatarConfigShape(rawCfg);
  userState.ownedItems = Array.isArray(prof?.owned_items)
    ? [...prof.owned_items]
    : ["meadow", "default", "none", "basic", "mic_silver"];
  userState.isLoggedIn = true;

  // [V2.0] 기존 영구 미끼 보유 유저 -> 황금 떡밥(bait_s) 소모품 2개 자동 전환
  if (!userState.v2BaitMigrated) {
    const legacyBaitIds = ["bait_c", "bait_b", "bait_a", "bait_s"];
    const hasLegacyBait =
      legacyBaitIds.some(bid => userState.ownedItems.includes(bid)) ||
      legacyBaitIds.includes(userState.avatarConfig.fishingBait);
    if (hasLegacyBait) {
      userState.inventory.bait_s = Math.max(0, Number(userState.inventory.bait_s) || 0) + 2;
      userState.ownedItems = userState.ownedItems.filter(id => !legacyBaitIds.includes(id));
      userState.avatarConfig.fishingBait = "bait_s";
    }
    userState.v2BaitMigrated = true;
    setTimeout(() => { try { syncProfileToServer(); } catch (e) {} }, 250);
  }
  ensureV2DailyState();

  shopPreviewState.config = { ...userState.avatarConfig };
  shopPreviewState.selectedItem = null;
  loadBlockedUsersFromStorage(rawCfg._blockedUsers);
}

async function restoreSupabaseSession() {
  await loadServerGlobalConfigs();
  const reqAction = getRequestedLegalAction();
  if (reqAction === "delete") {
    openExternalDeleteAccountModal();
    return;
  }

  if (!sbClient) {
    if (reqAction === "privacy") openPrivacyPolicyModal();
    return;
  }
  if (localStorage.getItem("mk_auto_login") === "false") {
    if (reqAction === "privacy") openPrivacyPolicyModal();
    return;
  }
  try {
    const { data } = await sbClient.auth.getSession();
    window.mkSupabaseAccessToken = data?.session?.access_token || "";
    const sessionUser = data?.session?.user;
    if (sessionUser) {
      const { data: prof } = await sbClient
        .from("profiles")
        .select("*")
        .eq("id", sessionUser.id)
        .maybeSingle();

      if (prof && prof.nickname !== "__ADMIN_CONFIG__") {
        applyProfileRowToUserState(sessionUser.id, prof, prof.nickname);
        updateHeaderUserUI();
        if (typeof startGlobalDmNotiListener === "function") startGlobalDmNotiListener();

        let savedFishingSession = null;
        try {
          const rawSess = sessionStorage.getItem("mk_fishing_session");
          if (rawSess) savedFishingSession = JSON.parse(rawSess);
        } catch (e) {}

        if (
          savedFishingSession &&
          savedFishingSession.uid === sessionUser.id &&
          typeof enterFishingRoom === "function"
        ) {
          // 폰 홈버튼 전환 후 브라우저 탭 재로드 시에도 낚시터 유지!
          enterFishingRoom(savedFishingSession.channelId, {
            skipLoading: true,
            restorePos: savedFishingSession.pos
          });
        } else {
          // 강제종료(스와이프 종료) 후 새 앱 실행이면 기존 잔류 접속 상태 정리 후 홈으로 이동
          if (userState.fishingLive && userState.fishingLive.active) {
            userState.fishingLive = { active: false, leftAt: Date.now() };
            syncProfileToServer();
          }
          if (typeof showHome === "function") showHome({ replaceHistory: true });
        }
      }
    }
  } catch (e) {}

  if (reqAction === "privacy") {
    openPrivacyPolicyModal();
  }
}

async function addCdCoins(amount) {
  userState.cdCoins = Math.max(0, userState.cdCoins + amount);
  updateHeaderUserUI();
  await syncProfileToServer();
}

function buildProfilePayloadConfig() {
  const cleanAvatar = { ...userState.avatarConfig };
  delete cleanAvatar._exp;
  delete cleanAvatar._claimedTopRanks;
  delete cleanAvatar._battleStats;
  delete cleanAvatar._blockedUsers;
  delete cleanAvatar._fishingDaily;
  delete cleanAvatar._fishingLive;
  delete cleanAvatar._inventory;
  delete cleanAvatar._equippedItems;
  delete cleanAvatar._dailyState;
  delete cleanAvatar._v2BaitMigrated;
  return {
    ...cleanAvatar,
    _exp: userState.exp,
    _claimedTopRanks: userState.claimedTopRanks || {},
    _battleStats: normalizeBattleStats(userState.battleStats),
    _blockedUsers: userState.blockedUsers || [],
    _fishingDaily: userState.fishingDaily || null,
    _fishingLive: userState.fishingLive || null,
    _inventory: userState.inventory || {},
    _equippedItems: userState.equippedItems || [],
    _dailyState: userState.dailyState || null,
    _v2BaitMigrated: Boolean(userState.v2BaitMigrated)
  };
}

window.sendProfileKeepalivePatch = function () {
  if (!userState.isLoggedIn || !userState.id || !window.mkSupabaseAccessToken) return;
  try {
    fetch(`${SUPABASE_URL}/rest/v1/profiles?id=eq.${encodeURIComponent(userState.id)}`, {
      method: "PATCH",
      keepalive: true,
      headers: {
        apikey: SUPABASE_KEY,
        Authorization: `Bearer ${window.mkSupabaseAccessToken}`,
        "Content-Type": "application/json",
        Prefer: "return=minimal"
      },
      body: JSON.stringify({
        cd_coins: userState.cdCoins,
        avatar_config: buildProfilePayloadConfig(),
        updated_at: new Date().toISOString()
      })
    }).catch(() => {});
  } catch (e) {}
};

async function syncProfileToServer() {
  updateHeaderUserUI();
  if (!sbClient || !userState.isLoggedIn || !userState.id) return;
  try {
    const payloadConfig = buildProfilePayloadConfig();
    await sbClient.from("profiles").upsert({
      id: userState.id,
      nickname: userState.nickname,
      bio: userState.bio,
      cd_coins: userState.cdCoins,
      avatar_config: payloadConfig,
      owned_items: userState.ownedItems,
      updated_at: new Date().toISOString()
    });
  } catch (e) {}
}

// ============================================================================
// 1. 회원가입 / 로그인 / 로그아웃
// ============================================================================
window.handleAuthSubmit = async function (mode) {
  const nickInput = document.getElementById("authNicknameInput").value.trim();
  const pwInput = document.getElementById("authPasswordInput").value.trim();

  if (!nickInput || nickInput.length < 2) {
    gameAlert("닉네임을 2글자 이상 입력해주세요.");
    return;
  }
  if (!pwInput || pwInput.length < 6) {
    gameAlert("비밀번호는 6자리 이상 입력해주세요.");
    return;
  }
  if (!sbClient) {
    gameAlert("서버 연결을 초기화할 수 없습니다.");
    return;
  }

  const email = nicknameToEmail(nickInput);

  try {
    if (mode === "signup") {
      const { data: existNick } = await sbClient
        .from("profiles")
        .select("id")
        .eq("nickname", nickInput)
        .maybeSingle();

      if (existNick) {
        gameAlert("이미 사용 중인 닉네임입니다!\n다른 닉네임을 입력하거나 [로그인]을 눌러주세요.");
        return;
      }

      const chosenGender = pendingSignupGender === "female" ? "female" : "male";
      // 이전 계정의 인메모리 상태가 신규 가입 프로필로 절대 넘어가지 않도록 완전 초기화 후 가입!
      resetUserStateToFreshDefaults();

      const { data, error } = await sbClient.auth.signUp({
        email,
        password: pwInput
      });

      if (error) {
        gameAlert(`회원가입 오류: ${error.message}`);
        return;
      }

      const uid = data?.user?.id;
      if (!uid) {
        gameAlert("회원가입 처리 중 문제가 발생했습니다.");
        return;
      }
      window.mkSupabaseAccessToken = data?.session?.access_token || "";
      try { sessionStorage.removeItem("mk_fishing_session"); } catch (e) {}

      const starterAvatar = { ...DEFAULT_AVATAR_CONFIG, gender: chosenGender };
      const starterOwned = ["meadow", "default", "none", "basic", "mic_silver"];
      const starterBio = "안녕하세요! 음악왕 도전자입니다.";

      userState.id = uid;
      userState.nickname = nickInput;
      userState.bio = starterBio;
      userState.cdCoins = 100;
      userState.exp = 0;
      userState.claimedTopRanks = {};
      userState.battleStats = normalizeBattleStats(DEFAULT_BATTLE_STATS);
      userState.blockedUsers = [];
      userState.avatarConfig = starterAvatar;
      userState.ownedItems = starterOwned;
      userState.isLoggedIn = true;
      shopPreviewState.config = { ...starterAvatar };
      shopPreviewState.selectedItem = null;
      loadBlockedUsersFromStorage([]);
      saveAuthPreferences(nickInput);

      const { error: upsertErr } = await sbClient.from("profiles").upsert({
        id: uid,
        nickname: nickInput,
        bio: starterBio,
        cd_coins: 100,
        avatar_config: {
          ...starterAvatar,
          _exp: 0,
          _claimedTopRanks: {},
          _battleStats: normalizeBattleStats(DEFAULT_BATTLE_STATS),
          _blockedUsers: []
        },
        owned_items: starterOwned
      });

      if (upsertErr) {
        gameAlert(`프로필 생성 중 오류가 발생했습니다: ${upsertErr.message}`);
        return;
      }

      updateHeaderUserUI();
      if (typeof startGlobalDmNotiListener === "function") startGlobalDmNotiListener();
      showHome({ replaceHistory: true });
      if (typeof armAppBackGuard === "function") armAppBackGuard(true);
      gameAlert(`환영합니다, [${nickInput}]님!\n웰컴 보너스 💿 100 CD가 지급되었습니다!`, "🎉 가입 완료");
    } else {
      resetUserStateToFreshDefaults();
      const { data, error } = await sbClient.auth.signInWithPassword({
        email,
        password: pwInput
      });

      if (error) {
        gameAlert("닉네임 또는 비밀번호가 일치하지 않습니다.\n처음 오셨다면 [회원가입] 버튼을 눌러주세요!");
        return;
      }

      const uid = data.user.id;
      window.mkSupabaseAccessToken = data?.session?.access_token || "";
      try { sessionStorage.removeItem("mk_fishing_session"); } catch (e) {}
      const { data: prof } = await sbClient
        .from("profiles")
        .select("*")
        .eq("id", uid)
        .maybeSingle();

      applyProfileRowToUserState(uid, prof, nickInput);
      if (userState.fishingLive && userState.fishingLive.active) {
        userState.fishingLive = { active: false, leftAt: Date.now() };
        syncProfileToServer();
      }
      saveAuthPreferences(userState.nickname);

      updateHeaderUserUI();
      if (typeof startGlobalDmNotiListener === "function") startGlobalDmNotiListener();
      showHome({ replaceHistory: true });
      if (typeof armAppBackGuard === "function") armAppBackGuard(true);
    }
  } catch (err) {
    gameAlert("서버 통신 중 오류가 발생했습니다.");
  }
};

window.handleLogout = async function () {
  gameConfirm("정말 로그아웃 하시겠습니까?", async () => {
    if (typeof cleanupFishingRuntime === "function") cleanupFishingRuntime(true);
    if (typeof stopGlobalDmNotiListener === "function") stopGlobalDmNotiListener();
    if (typeof stopDmRealtime === "function") stopDmRealtime();
    if (sbClient) {
      try {
        if (plazaState.channel) {
          sbClient.removeChannel(plazaState.channel);
          plazaState.channel = null;
        }
        if (plazaState.roomChannel) {
          sbClient.removeChannel(plazaState.roomChannel);
          plazaState.roomChannel = null;
        }
        await sbClient.auth.signOut();
      } catch (e) {}
    }
    window.mkSupabaseAccessToken = "";
    try { sessionStorage.removeItem("mk_fishing_session"); } catch (e) {}
    resetUserStateToFreshDefaults();
    const pwInput = document.getElementById("authPasswordInput");
    if (pwInput) pwInput.value = "";
    updateHeaderUserUI();
    closeAllModals();
    showLoginScreen({ replaceHistory: true });
    if (typeof resetHistoryToExitBase === "function") resetHistoryToExitBase();
    if (typeof initAuthPreferences === "function") initAuthPreferences();
  }, "🚪 로그아웃");
};

async function finalizeAccountDeletionSession(targetUid, targetNick) {
  try {
    if (plazaState.channel && sbClient) {
      sbClient.removeChannel(plazaState.channel);
      plazaState.channel = null;
    }
    if (plazaState.roomChannel && sbClient) {
      sbClient.removeChannel(plazaState.roomChannel);
      plazaState.roomChannel = null;
    }
    await sbClient.auth.signOut();
  } catch (e) {}

  try {
    if (targetUid) {
      localStorage.removeItem(getBlockedStorageKey(targetUid));
      localStorage.removeItem(`mk_dm_seen_map_${targetUid}`);
    }
    if (targetNick && localStorage.getItem("mk_saved_nick") === targetNick) {
      localStorage.removeItem("mk_saved_nick");
    }
  } catch (e) {}

  resetUserStateToFreshDefaults();

  const nickInput = document.getElementById("authNicknameInput");
  const pwInput = document.getElementById("authPasswordInput");
  if (nickInput && nickInput.value.trim() === targetNick) nickInput.value = "";
  if (pwInput) pwInput.value = "";

  updateHeaderUserUI();
  if (typeof closeAllModals === "function") closeAllModals();
  if (typeof showLoginScreen === "function") showLoginScreen({ replaceHistory: true });
  if (typeof resetHistoryToExitBase === "function") resetHistoryToExitBase();
  if (typeof initAuthPreferences === "function") initAuthPreferences();
}

window.handleDeleteAccount = function () {
  if (!userState.isLoggedIn || !userState.id || !sbClient) {
    gameAlert("로그인 상태에서만 회원탈퇴를 진행할 수 있습니다.");
    return;
  }

  gameConfirm(
    `정말 회원탈퇴 하시겠습니까?\n탈퇴 시 [${userState.nickname}] 계정의 캐릭터·CD·경험치·랭킹·친구·DM 기록 및 로그인 계정이 모두 영구 삭제되며 복구할 수 없습니다.`,
    async () => {
      const targetUid = userState.id;
      const targetNick = userState.nickname;

      if (typeof cleanupFishingRuntime === "function") cleanupFishingRuntime(false);
      if (typeof stopAllAppAudio === "function") stopAllAppAudio(false);
      if (typeof stopGlobalDmNotiListener === "function") stopGlobalDmNotiListener();
      if (typeof stopDmRealtime === "function") stopDmRealtime();

      try {
        if (plazaState.currentRoom && typeof leaveBattleRoom === "function") {
          await leaveBattleRoom();
        }
      } catch (e) {}

      try {
        const { error } = await sbClient.rpc("delete_my_account");
        if (error) {
          gameAlert(`회원탈퇴 처리 중 오류가 발생했습니다.\n(${error.message || "서버 오류"})`);
          return;
        }
      } catch (err) {
        gameAlert("회원탈퇴 요청 중 네트워크 오류가 발생했습니다.");
        return;
      }

      await finalizeAccountDeletionSession(targetUid, targetNick);
      gameAlert("회원탈퇴가 완료되었으며 모든 계정 및 게임 데이터가 영구 삭제되었습니다.", "👋 회원탈퇴 완료");
    },
    "⚠️ 회원탈퇴 (영구 삭제)"
  );
};

window.submitExternalDeleteAccount = function () {
  const nick = document.getElementById("extDeleteNickInput")?.value?.trim() || "";
  const pw = document.getElementById("extDeletePwInput")?.value?.trim() || "";

  if (!nick || nick.length < 2) {
    gameAlert("삭제할 계정의 닉네임을 2글자 이상 입력해주세요.");
    return;
  }
  if (!pw || pw.length < 6) {
    gameAlert("본인 확인을 위해 비밀번호 6자리 이상을 입력해주세요.");
    return;
  }
  if (!sbClient) {
    gameAlert("서버 연결을 초기화할 수 없습니다.");
    return;
  }

  gameConfirm(
    `[${nick}] 계정을 영구 삭제하시겠습니까?\n본인 확인 후 캐릭터·CD·랭킹·친구·DM 및 로그인 계정이 즉시 파기되며 복구할 수 없습니다.`,
    async () => {
      if (typeof cleanupFishingRuntime === "function") cleanupFishingRuntime(false);
      if (typeof stopAllAppAudio === "function") stopAllAppAudio(false);
      if (typeof stopGlobalDmNotiListener === "function") stopGlobalDmNotiListener();
      if (typeof stopDmRealtime === "function") stopDmRealtime();

      try {
        const email = nicknameToEmail(nick);
        const { data: authData, error: signInErr } = await sbClient.auth.signInWithPassword({
          email,
          password: pw
        });
        if (signInErr || !authData?.user) {
          gameAlert("닉네임 또는 비밀번호가 일치하지 않습니다.\n본인 계정의 정보를 정확히 입력해주세요.");
          return;
        }

        const verifiedUid = authData.user.id;
        const { error: delErr } = await sbClient.rpc("delete_my_account");
        if (delErr) {
          await sbClient.auth.signOut().catch(() => {});
          gameAlert(`계정 삭제 처리 중 오류가 발생했습니다.\n(${delErr.message || "서버 오류"})`);
          return;
        }

        await finalizeAccountDeletionSession(verifiedUid, nick);
        gameAlert(`[${nick}] 계정 및 모든 서버 데이터가 영구 삭제되었습니다.`, "👋 계정 삭제 완료");
      } catch (err) {
        gameAlert("계정 삭제 요청 중 네트워크 오류가 발생했습니다.");
      }
    },
    "⚠️ 외부 계정 영구 삭제 확인"
  );
};

// ============================================================================
// 2. 점수 랭킹 시스템 (전용 전체화면 #rankingScreen & 커스텀 게임 필터 칩)
// ============================================================================
const rankFilterState = {
  mode: "ALL",
  stage: "ALL"
};

window.setRankFilter = function (type, val) {
  rankFilterState[type] = val;
  document.querySelectorAll(`[data-rank-${type}]`).forEach(el => {
    el.classList.toggle("active", el.getAttribute(`data-rank-${type}`) === String(val));
  });
  loadRankingsList();
};

async function submitScoreToRanking(record) {
  if (!sbClient || !userState.isLoggedIn || !userState.id) return;
  try {
    await sbClient.from("rankings").insert({
      user_id: userState.id,
      nickname: userState.nickname,
      avatar_config: userState.avatarConfig,
      decade_filter: record.decadeFilter,
      game_mode: record.mode,
      stage: record.stage,
      question_limit: String(record.limit),
      time_attack: Boolean(record.timeAttack),
      score: record.score,
      accuracy: record.accuracy
    });
  } catch (e) {}
}

// 게임 종료 시 기본 경험치/CD + 랭킹 TOP3 최초 진입/순위 갱신 순간(1회) 1위×5 / 2위×3 / 3위×2 배율 보너스 동시 지급
async function checkAndProcessGameRewards(score, mode, stage, baseCd = 0) {
  const safeBaseCd = Math.max(0, Math.floor(Number(baseCd) || 0));
  const baseExp = Math.max(0, Math.round((Number(score) || 0) * 0.1));
  const expBefore = Number(userState.exp) || 0;
  let multiplier = 1;
  let achievedTopRank = null; // 1, 2, 3 (없으면 null)

  if (sbClient && userState.isLoggedIn && userState.id && score > 0) {
    try {
      const { data: topRows } = await sbClient
        .from("rankings")
        .select("user_id, score, created_at")
        .eq("game_mode", mode)
        .eq("stage", Number(stage))
        .order("score", { ascending: false })
        .order("created_at", { ascending: true })
        .limit(300);

      if (Array.isArray(topRows) && topRows.length > 0) {
        // 유저별 최고 기록 기준으로 중복 제거해 상위 3명 추출
        const bestByUser = [];
        const seen = new Set();
        for (const r of topRows) {
          if (!r.user_id || seen.has(r.user_id)) continue;
          seen.add(r.user_id);
          bestByUser.push(r);
          if (bestByUser.length >= 3) break;
        }

        const myIdx = bestByUser.findIndex(r => r.user_id === userState.id && Number(r.score) === Number(score));
        if (myIdx !== -1 && myIdx < 3) {
          const currentRank = myIdx + 1;
          const rankKey = `${mode}_${stage}`;
          const prevClaimed = Number(userState.claimedTopRanks?.[rankKey]) || 99;
          // 해당 순위(또는 더 높은 순위)에 방금 처음으로 도달한 그 순간(1회)만 발동!
          if (currentRank < prevClaimed) {
            achievedTopRank = currentRank;
            multiplier = currentRank === 1 ? 5 : currentRank === 2 ? 3 : 2;
            userState.claimedTopRanks = { ...(userState.claimedTopRanks || {}), [rankKey]: currentRank };
          }
        }
      }
    } catch (e) {}
  }

  const finalExp = baseExp * multiplier;
  const finalCd = safeBaseCd * multiplier;
  userState.exp = expBefore + finalExp;
  if (finalCd > 0) {
    userState.cdCoins = (Number(userState.cdCoins) || 0) + finalCd;
  }
  await syncProfileToServer();

  return {
    baseExp,
    finalExp,
    baseCd: safeBaseCd,
    earnedCd: finalCd,
    finalCd,
    multiplier,
    achievedTopRank,
    expBefore,
    expAfter: userState.exp
  };
}

function dedupeRankingRows(rows, maxCount = 20) {
  const uniqueRows = [];
  const seenUsers = new Set();
  for (const row of rows || []) {
    if (!row) continue;
    if (isUserBlocked(row.user_id, row.nickname)) continue;
    const key = row.user_id ? `id:${row.user_id}` : `nick:${row.nickname || ""}`;
    if (seenUsers.has(key)) continue;
    seenUsers.add(key);
    uniqueRows.push(row);
    if (uniqueRows.length >= maxCount) break;
  }
  return uniqueRows;
}

async function computeUserUniqueRank(targetId, bestScore) {
  if (!sbClient || !(bestScore > 0)) return "기록 없음";
  try {
    const { data: higherRows } = await sbClient
      .from("rankings")
      .select("user_id, nickname")
      .gt("score", bestScore)
      .limit(1000);

    const higherUsers = new Set();
    (higherRows || []).forEach(r => {
      if (!r) return;
      if (targetId && r.user_id === targetId) return;
      const key = r.user_id ? `id:${r.user_id}` : `nick:${r.nickname || ""}`;
      if (key) higherUsers.add(key);
    });
    return `전체 ${higherUsers.size + 1}위`;
  } catch (e) {
    return "-";
  }
}

window.loadRankingsList = async function () {
  const listEl = document.getElementById("rankingListContainer");
  const podiumEl = document.getElementById("rankingTop3Podium");
  const myRankBannerEl = document.getElementById("rankingMyCurrentRankBanner");
  if (!listEl) return;

  const modeFilter = rankFilterState.mode;
  const stageFilter = rankFilterState.stage;
  const modeTitleMap = { ALL: "전체 모드", behind: "비하인드", lyrics: "가사", onesec: "1초듣기" };
  const stageTitleMap = { ALL: "전체 단계", 1: "1단계(노래)", 2: "2단계(가수)", 3: "3단계(모두)" };
  const filterTitle = `${modeTitleMap[modeFilter] || modeFilter} · ${stageTitleMap[stageFilter] || stageFilter}`;

  if (myRankBannerEl) myRankBannerEl.textContent = `📊 [${filterTitle}] 내 현재 순위 조회 중...`;
  if (podiumEl) podiumEl.innerHTML = "";
  listEl.innerHTML = `<div style="text-align:center; padding:24px; color:var(--text-sub); font-weight:700;">🏆 랭킹 데이터를 불러오는 중...</div>`;

  if (!sbClient) return;

  try {
    let query = sbClient
      .from("rankings")
      .select("*")
      .order("score", { ascending: false })
      .order("created_at", { ascending: true })
      .limit(1000);

    if (modeFilter !== "ALL") query = query.eq("game_mode", modeFilter);
    if (stageFilter !== "ALL") query = query.eq("stage", Number(stageFilter));

    const { data, error } = await query;
    const allRows = dedupeRankingRows(data, 500);
    const rows = allRows.slice(0, 20);

    if (myRankBannerEl) {
      if (error) {
        myRankBannerEl.textContent = `⚠️ [${filterTitle}] 순위를 불러오지 못했습니다.`;
      } else if (!userState.isLoggedIn || !userState.id) {
        myRankBannerEl.textContent = `🏅 [${filterTitle}] 로그인 후 내 순위를 확인할 수 있습니다.`;
      } else {
        const myRankIdx = allRows.findIndex(r => r.user_id === userState.id);
        if (myRankIdx !== -1) {
          const myRow = allRows[myRankIdx];
          const myPlace = myRankIdx + 1;
          const placeBadge = myPlace === 1 ? "👑 1위" : myPlace === 2 ? "🥈 2위" : myPlace === 3 ? "🥉 3위" : `${myPlace}위`;
          myRankBannerEl.textContent = `🏅 [${filterTitle}] 현재 내 순위: ${placeBadge} / 총 ${allRows.length}명 (${Number(myRow.score || 0).toLocaleString()}점)`;
        } else {
          myRankBannerEl.textContent = `📌 [${filterTitle}] 현재 내 순위: 기록 없음 (총 ${allRows.length}명 도전 중)`;
        }
      }
    }

    if (error || rows.length === 0) {
      if (podiumEl) podiumEl.innerHTML = "";
      listEl.innerHTML = `<div style="text-align:center; padding:32px; color:var(--text-sub); font-weight:700;">아직 해당 조건에 등록된 랭킹 기록이 없습니다.<br/>첫 번째 1등 주인공이 되어보세요!</div>`;
      return;
    }

    const modeLabel = { behind: "📖비하인드", lyrics: "📝가사", onesec: "⚡1초듣기" };

    // 중앙 상단 대형 TOP 3 포디엄 (시각적 시상대 배치: 2위 - 1위 - 3위)
    if (podiumEl) {
      const podiumOrder = [
        { rank: 2, row: rows[1] || null, badge: "🥈 2위" },
        { rank: 1, row: rows[0] || null, badge: "👑 1위" },
        { rank: 3, row: rows[2] || null, badge: "🥉 3위" }
      ];
      podiumEl.innerHTML = podiumOrder
        .map(({ rank, row, badge }) => {
          if (!row) {
            return `
              <div class="rank-podium-card is-rank-${rank} is-empty">
                <div class="rank-podium-place">${badge}</div>
                <div style="font-size:1.35rem; margin:6px 0;">🎵</div>
                <div class="rank-podium-nick">도전 대기</div>
                <div class="rank-podium-sub">-</div>
              </div>
            `;
          }
          const safeId = escapeJsSingleArg(row.user_id);
          const safeNick = escapeJsSingleArg(row.nickname);
          const isMe = userState.id && row.user_id === userState.id;
          return `
            <div class="rank-podium-card is-rank-${rank}" onclick="inspectOtherUser('${safeId}', '${safeNick}')">
              <div class="rank-podium-place">${badge}</div>
              <canvas class="rank-podium-canvas" width="480" height="480" data-avatar='${JSON.stringify(row.avatar_config || DEFAULT_AVATAR_CONFIG)}'></canvas>
              <div class="rank-podium-nick">${isMe ? "⭐ " : ""}${row.nickname}</div>
              <div class="rank-podium-score">${Number(row.score || 0).toLocaleString()}점</div>
              <div class="rank-podium-sub">${modeLabel[row.game_mode] || row.game_mode}·${row.stage}단계</div>
            </div>
          `;
        })
        .join("");

      podiumEl.querySelectorAll(".rank-podium-canvas").forEach(cv => {
        try {
          renderPixelAvatar(cv, JSON.parse(cv.getAttribute("data-avatar")));
        } catch (e) {}
      });
    }

    const tailRows = rows.slice(3);
    if (tailRows.length === 0) {
      listEl.innerHTML = `<div style="text-align:center; padding:18px; color:var(--text-sub); font-weight:700; font-size:0.82rem;">4위 이후 랭킹 도전자를 기다리고 있습니다!</div>`;
    } else {
      listEl.innerHTML = tailRows
        .map((row, idx) => {
          const realRank = idx + 4;
          const safeId = escapeJsSingleArg(row.user_id);
          const safeNick = escapeJsSingleArg(row.nickname);
          const isMe = userState.id && row.user_id === userState.id;
          return `
          <div class="pixel-list-item" onclick="inspectOtherUser('${safeId}', '${safeNick}')">
            <div style="display:flex; align-items:center; gap:9px;">
              <span style="font-weight:900; min-width:32px; font-size:0.92rem; color:var(--primary-dark);">#${realRank}</span>
              <canvas class="rank-mini-canvas" width="480" height="480" style="width:42px; height:42px; border-radius:10px; border:2px solid #1e1b18;" data-avatar='${JSON.stringify(row.avatar_config || DEFAULT_AVATAR_CONFIG)}'></canvas>
              <div>
                <div style="font-weight:900; font-size:0.88rem;">${isMe ? "⭐ " : ""}${row.nickname} ${row.time_attack ? "⏱️" : ""}</div>
                <div style="font-size:0.72rem; font-weight:700; color:var(--text-sub);">${modeLabel[row.game_mode] || row.game_mode} · ${row.stage}단계 · 정답률 ${row.accuracy}%</div>
              </div>
            </div>
            <div style="font-weight:900; color:#b45309; font-size:0.95rem;">${Number(row.score || 0).toLocaleString()}점</div>
          </div>
        `;
        })
        .join("");

      listEl.querySelectorAll(".rank-mini-canvas").forEach(cv => {
        try {
          renderPixelAvatar(cv, JSON.parse(cv.getAttribute("data-avatar")));
        } catch (e) {}
      });
    }
  } catch (err) {
    if (myRankBannerEl) myRankBannerEl.textContent = `⚠️ [${filterTitle}] 순위 조회 오류`;
    listEl.innerHTML = `<div style="text-align:center; padding:20px;">랭킹 조회 중 오류가 발생했습니다.</div>`;
  }
};

// ============================================================================
// 3. 전용 전체화면 상점 (#shopScreen)
// - 성별은 회원가입 시 설정하며, 이후 변경은 [성별 변경권 10,000 CD] 아이템으로만 가능!
// - [닉네임 변경권 5,000 CD] 아이템 판매
// ============================================================================
window.openShopModal = function (initialCat = null) {
  shopPreviewState.config = sanitizeAvatarConfigShape(userState.avatarConfig);
  const targetCat = initialCat || shopPreviewState.selectedCat || "hair";
  shopPreviewState.selectedCat = targetCat;
  if (targetCat === "game_item") {
    const firstGameItem = (typeof GAME_ITEMS_CATALOG !== "undefined" && GAME_ITEMS_CATALOG[0]) || null;
    shopPreviewState.selectedItem = firstGameItem ? { cat: "game_item", ...firstGameItem } : null;
  } else {
    const initItem = getItemById(targetCat, shopPreviewState.config[getShopCatConfigKey(targetCat)] || "default");
    shopPreviewState.selectedItem = { cat: targetCat, ...initItem };
  }
  switchScreen("shopScreen");
  syncShopMainTabsUI(targetCat);
  renderShopCategory(targetCat);
  updateShopPreviewCanvas();
  if (typeof updateShopFreeCdAdButton === "function") updateShopFreeCdAdButton();
};

const SHOP_GROUP_MAP = {
  fashion: ["bg", "hair", "hat", "face", "outfit", "acc", "wing"],
  item: ["game_item"],
  feature: ["fishing_rod", "fishing_bait"],
  special: ["special"]
};

function getShopMainGroupForCat(cat) {
  for (const [grp, cats] of Object.entries(SHOP_GROUP_MAP)) {
    if (cats.includes(cat)) return grp;
  }
  return "fashion";
}

function syncShopMainTabsUI(cat) {
  const grp = getShopMainGroupForCat(cat);
  document.querySelectorAll("[data-shop-group]").forEach(btn => {
    btn.classList.toggle("active", btn.getAttribute("data-shop-group") === grp);
  });
  const fashionSub = document.getElementById("shopSubTabsFashion");
  const featureSub = document.getElementById("shopSubTabsFeature");
  if (fashionSub) fashionSub.classList.toggle("hidden", grp !== "fashion");
  if (featureSub) featureSub.classList.toggle("hidden", grp !== "feature");
}

window.switchShopMainGroup = function (grp) {
  const cats = SHOP_GROUP_MAP[grp] || ["hair"];
  const nextCat = cats.includes(shopPreviewState.selectedCat) ? shopPreviewState.selectedCat : cats[0];
  syncShopMainTabsUI(nextCat);
  renderShopCategory(nextCat);
  const list = nextCat === "game_item"
    ? (typeof GAME_ITEMS_CATALOG !== "undefined" ? GAME_ITEMS_CATALOG : [])
    : (AVATAR_SHOP_ITEMS[nextCat] || []);
  if (list[0]) {
    previewShopItem(nextCat, list[0].id);
  }
};

function getShopCatConfigKey(cat) {
  return (typeof AVATAR_CONFIG_KEY_BY_CAT !== "undefined" && AVATAR_CONFIG_KEY_BY_CAT[cat]) || cat;
}

function getEquippableShopCatsList() {
  return typeof EQUIPPABLE_SHOP_CATS !== "undefined"
    ? EQUIPPABLE_SHOP_CATS
    : ["bg", "hair", "hat", "face", "outfit", "acc", "wing", "fishing_rod", "fishing_bait"];
}

function getConsumableCount(id) {
  if (!id || id === "none") return 0;
  return Math.max(0, Number((userState.inventory && userState.inventory[id]) || 0));
}

window.renderShopInventorySlots = function () {
  const rodSlot = document.getElementById("shopInvRodSlot");
  const rodCanvas = document.getElementById("shopInvRodCanvas");
  const rodBadge = document.getElementById("shopInvRodBadge");
  const rodName = document.getElementById("shopInvRodName");

  const baitSlot = document.getElementById("shopInvBaitSlot");
  const baitCanvas = document.getElementById("shopInvBaitCanvas");
  const baitBadge = document.getElementById("shopInvBaitBadge");
  const baitName = document.getElementById("shopInvBaitName");

  const cfg = userState.avatarConfig || DEFAULT_AVATAR_CONFIG;

  const rodId = cfg.fishingRod || "none";
  const rodItem = getItemById("fishing_rod", rodId);
  const rodEquipped = rodId !== "none" && rodItem && rodItem.id !== "none";
  if (rodSlot) rodSlot.classList.toggle("is-equipped", rodEquipped);
  if (rodBadge) {
    const pct = rodEquipped ? Math.round(((Number(rodItem.expMultiplier) || 1) - 1) * 100) : 0;
    rodBadge.textContent = rodEquipped ? `EXP+${pct}%` : "미착용";
  }
  if (rodName) rodName.textContent = rodEquipped ? rodItem.name : "낚싯대";
  if (rodCanvas && typeof renderItemThumbnail === "function") {
    renderItemThumbnail(rodCanvas, "fishing_rod", rodItem);
  }

  const baitId = cfg.fishingBait || "none";
  const baitItem = getItemById("fishing_bait", baitId);
  const baitCount = getConsumableCount(baitId);
  const baitEquipped = baitId !== "none" && baitItem && baitItem.id !== "none" && baitCount > 0;
  if (baitSlot) baitSlot.classList.toggle("is-equipped", baitEquipped);
  if (baitBadge) {
    const pct = baitEquipped ? Math.round(((Number(baitItem.cdMultiplier) || 1) - 1) * 100) : 0;
    baitBadge.textContent = baitEquipped ? `CD+${pct}% (${baitCount}개)` : "미착용";
  }
  if (baitName) baitName.textContent = baitEquipped ? baitItem.name : "미끼";
  if (baitCanvas && typeof renderItemThumbnail === "function") {
    renderItemThumbnail(baitCanvas, "fishing_bait", baitItem);
  }
};

window.inspectShopFishingSlot = function (cat) {
  const cfgKey = getShopCatConfigKey(cat);
  const equippedId = (userState.avatarConfig && userState.avatarConfig[cfgKey]) || "none";
  const list = AVATAR_SHOP_ITEMS[cat] || [];
  const target = (equippedId !== "none" && list.find(x => x.id === equippedId)) || list[0];
  if (target) {
    shopPreviewState.selectedItem = { cat, ...target };
    shopPreviewState.config[cfgKey] = target.id;
  }
  renderShopCategory(cat);
  updateShopPreviewCanvas();
};

async function equipOwnedFishingGear(sel) {
  if (!sel || !sel.cat || !sel.id) return;
  const cfgKey = getShopCatConfigKey(sel.cat);
  userState.avatarConfig[cfgKey] = sel.id;
  shopPreviewState.config[cfgKey] = sel.id;
  await syncProfileToServer();
  renderShopCategory(shopPreviewState.selectedCat);
  updateShopPreviewCanvas();
  gameAlert(`[${sel.name}] 아이템을 장착했습니다!\n상점 캐릭터 왼쪽 아래 슬롯에서 착용 여부를 확인할 수 있습니다.`, "🎣 장착 완료");
}

window.unequipFishingGear = async function (cat) {
  const cfgKey = getShopCatConfigKey(cat);
  userState.avatarConfig[cfgKey] = "none";
  shopPreviewState.config[cfgKey] = "none";
  await syncProfileToServer();
  renderShopCategory(shopPreviewState.selectedCat);
  updateShopPreviewCanvas();
  const label = cat === "fishing_rod" ? "낚싯대" : "미끼";
  gameAlert(`[${label}] 장착이 해제되어 미착용 상태로 변경되었습니다.`);
};

function updateShopPreviewCanvas() {
  shopPreviewState.config = sanitizeAvatarConfigShape(shopPreviewState.config);
  const cv = document.getElementById("shopAvatarCanvas");
  if (cv) {
    renderPixelAvatar(cv, shopPreviewState.config, { transparentBg: true });
  }
  renderShopInventorySlots();

  // 선택한 배경(bg) 고디테일 풀 일러스트 & 컬러를 상점 상단 스테이지에도 실시간 반영!
  const topBackdrop = document.getElementById("shopTopBackdrop");
  const bgItem = getItemById("bg", shopPreviewState.config.bg);
  if (topBackdrop) {
    const c = (bgItem && bgItem.colors) || ["#5ec8f8", "#aee4ff", "#76d32d", "#58b018"];
    topBackdrop.style.background = `linear-gradient(180deg, ${c[0]} 0%, ${c[1]} 58%, ${c[2]} 58%, ${c[3]} 100%)`;
  }
  const bgCanvas = document.getElementById("shopBgCanvas");
  if (bgCanvas && topBackdrop && typeof renderApfWideBackground === "function") {
    const w = Math.max(640, Math.round((topBackdrop.clientWidth || 380) * 2));
    const h = Math.max(360, Math.round((topBackdrop.clientHeight || 200) * 2));
    if (Math.abs(bgCanvas.width - w) > 8 || Math.abs(bgCanvas.height - h) > 8) {
      bgCanvas.width = w;
      bgCanvas.height = h;
    }
    const bgCtx = bgCanvas.getContext("2d");
    bgCtx.clearRect(0, 0, bgCanvas.width, bgCanvas.height);
    renderApfWideBackground(bgCtx, bgCanvas.width, bgCanvas.height, bgItem);
  }

  const cdSpan = document.getElementById("shopCdBalance");
  if (cdSpan) cdSpan.textContent = `${userState.cdCoins}`;

  const titleEl = document.getElementById("shopBoardTitle");
  const priceBadgeEl = document.getElementById("shopBoardPriceBadge");
  const descEl = document.getElementById("shopBoardDesc");
  const confirmBtn = document.getElementById("shopConfirmActionBtn");
  if (!titleEl || !descEl || !confirmBtn) return;

  const sel = shopPreviewState.selectedItem || getItemById("hair", shopPreviewState.config.hair);
  titleEl.textContent = sel.name || "기본 스타일";
  descEl.textContent = sel.desc || "아이템을 눌러 먼저 입어보세요!";

  if (sel.cat === "special" && sel.id === "nickname_ticket") {
    if (priceBadgeEl) priceBadgeEl.textContent = `💿 ${sel.price.toLocaleString()} CD`;
    confirmBtn.textContent = "🛍️ 구매 · 닉변하기";
    confirmBtn.className = "btn btn-gold";
    confirmBtn.onclick = purchaseNicknameTicket;
    return;
  }

  if (sel.cat === "special" && sel.id === "gender_ticket") {
    if (priceBadgeEl) priceBadgeEl.textContent = `💿 ${sel.price.toLocaleString()} CD`;
    confirmBtn.textContent = "🛍️ 구매 · 성별변경";
    confirmBtn.className = "btn btn-gold";
    confirmBtn.onclick = purchaseGenderTicket;
    return;
  }

  if (sel.cat === "game_item") {
    const cnt = getConsumableCount(sel.id);
    if (priceBadgeEl) priceBadgeEl.textContent = `💿 ${sel.price.toLocaleString()} CD · 보유 ${cnt}개`;
    confirmBtn.textContent = "🛍️ 1개 구매하기";
    confirmBtn.className = "btn btn-gold";
    confirmBtn.onclick = () => purchaseConsumableShopItem("game_item", sel);
    return;
  }

  if (sel.cat === "fishing_bait") {
    const cnt = getConsumableCount(sel.id);
    const isEquipped = userState.avatarConfig && userState.avatarConfig.fishingBait === sel.id && cnt > 0;
    if (priceBadgeEl) priceBadgeEl.textContent = `💿 ${sel.price.toLocaleString()} CD · 보유 ${cnt}개`;
    confirmBtn.textContent = cnt > 0 && !isEquipped ? "✅ 장착하기 (또는 추가구매)" : "🛍️ 1개 구매하기";
    confirmBtn.className = "btn btn-gold";
    confirmBtn.onclick = () => {
      if (cnt > 0 && !isEquipped) {
        gameConfirm(`[${sel.name}] (보유 ${cnt}개)\n장착하시겠습니까, 아니면 1개 더 구매하시겠습니까?`, async () => {
          await equipOwnedFishingGear(sel);
        }, "🪱 미끼 선택", () => purchaseConsumableShopItem("fishing_bait", sel));
        const okBtn = document.getElementById("dialogConfirmBtn");
        const cancelBtn = document.getElementById("dialogCancelBtn");
        if (okBtn) okBtn.textContent = "✅ 장착하기";
        if (cancelBtn) cancelBtn.textContent = "🛍️ 1개 더 구매";
      } else {
        purchaseConsumableShopItem("fishing_bait", sel);
      }
    };
    return;
  }

  if (sel.purchasable === false && !userState.ownedItems.includes(sel.id)) {
    if (priceBadgeEl) priceBadgeEl.textContent = "🎁 28일 출석 한정판";
    confirmBtn.textContent = "🔒 구매 불가 (출석 보상)";
    confirmBtn.className = "btn";
    confirmBtn.onclick = () => gameAlert("이 아이템은 상점에서 구매할 수 없는 28일차 출석체크 한정판입니다!\n우측 📅 출첵 보드에서 28일 출석을 달성해 획득하세요.");
    return;
  }

  const isOwned = !sel.price || sel.price === 0 || userState.ownedItems.includes(sel.id);
  const unownedPreviewList = getUnownedPreviewItems();
  const hasAnyUnownedPreview = unownedPreviewList.length > 0;

  if (sel.cat === "fishing_rod" || sel.cat === "fishing_bait") {
    const cfgKey = getShopCatConfigKey(sel.cat);
    const isEquipped = userState.avatarConfig && userState.avatarConfig[cfgKey] === sel.id;
    if (hasAnyUnownedPreview) {
      if (priceBadgeEl) {
        priceBadgeEl.textContent = !isOwned
          ? `💿 ${sel.price.toLocaleString()} CD`
          : `🛍️ 미구매 ${unownedPreviewList.length}개 착용`;
      }
      confirmBtn.textContent =
        unownedPreviewList.length > 1 ? `🛍️ 구매하기 (${unownedPreviewList.length}개)` : "🛍️ 구매하기";
      confirmBtn.className = "btn btn-gold";
      confirmBtn.onclick = () => purchaseAndEquipPreviewItem(sel);
    } else if (!isOwned) {
      if (priceBadgeEl) priceBadgeEl.textContent = `💿 ${sel.price.toLocaleString()} CD`;
      confirmBtn.textContent = "🛍️ 구매하기";
      confirmBtn.className = "btn btn-gold";
      confirmBtn.onclick = () => purchaseAndEquipPreviewItem(sel);
    } else if (isEquipped) {
      if (priceBadgeEl) priceBadgeEl.textContent = "✅ 착용중";
      confirmBtn.textContent = "❎ 착용 해제";
      confirmBtn.className = "btn";
      confirmBtn.onclick = () => unequipFishingGear(sel.cat);
    } else {
      if (priceBadgeEl) priceBadgeEl.textContent = "✅ 보유중";
      confirmBtn.textContent = "✅ 장착하기";
      confirmBtn.className = "btn btn-primary";
      confirmBtn.onclick = () => equipOwnedFishingGear(sel);
    }
    return;
  }

  if (hasAnyUnownedPreview) {
    if (priceBadgeEl) {
      priceBadgeEl.textContent = !isOwned
        ? `💿 ${sel.price.toLocaleString()} CD`
        : `✅ 보유중 (미구매 ${unownedPreviewList.length}개 착용)`;
    }
    confirmBtn.textContent =
      unownedPreviewList.length > 1 ? `🛍️ 구매하기 (${unownedPreviewList.length}개)` : "🛍️ 구매하기";
    confirmBtn.className = "btn btn-gold";
    confirmBtn.onclick = () => purchaseAndEquipPreviewItem(sel);
  } else {
    if (priceBadgeEl) priceBadgeEl.textContent = "✅ 보유중";
    confirmBtn.textContent = "✅ 장착 저장";
    confirmBtn.className = "btn btn-primary";
    confirmBtn.onclick = saveCurrentPreviewLook;
  }
}

window.resetShopPreview = function () {
  shopPreviewState.config = { ...userState.avatarConfig };
  const curHair = getItemById("hair", userState.avatarConfig.hair);
  shopPreviewState.selectedItem = { cat: "hair", ...curHair };
  renderShopCategory(shopPreviewState.selectedCat);
  updateShopPreviewCanvas();
};

async function saveCurrentPreviewLook() {
  for (const cat of getEquippableShopCatsList()) {
    const cfgKey = getShopCatConfigKey(cat);
    const id = shopPreviewState.config[cfgKey];
    if (!id || id === "none") continue;
    const item = getItemById(cat, id);
    if (item && item.price > 0 && !userState.ownedItems.includes(id)) {
      gameAlert(`[${item.name}] 아이템은 아직 구매하지 않았습니다!\n우측 보드의 [구매하기] 버튼을 먼저 눌러주세요.`);
      return;
    }
  }
  userState.avatarConfig = { ...shopPreviewState.config };
  await syncProfileToServer();
  renderShopCategory(shopPreviewState.selectedCat);
  updateShopPreviewCanvas();
  gameAlert("캐릭터 코스튬 장착이 저장되었습니다!", "👗 장착 완료");
}

const SHOP_CAT_LABELS = {
  bg: "배경",
  hair: "헤어",
  hat: "모자",
  face: "얼굴",
  outfit: "의상",
  acc: "악기",
  wing: "날개",
  game_item: "아이템",
  fishing_rod: "낚싯대",
  fishing_bait: "미끼"
};

function getUnownedPreviewItems() {
  const list = [];
  for (const cat of getEquippableShopCatsList()) {
    if (cat === "fishing_bait") continue;
    const cfgKey = getShopCatConfigKey(cat);
    const id = shopPreviewState.config[cfgKey];
    if (!id || id === "none") continue;
    const item = getItemById(cat, id);
    if (item && item.purchasable !== false && item.price > 0 && !userState.ownedItems.includes(item.id)) {
      list.push({ cat, ...item });
    }
  }
  return list;
}

function sanitizeAvatarConfigToOwned(previewCfg) {
  const safe = sanitizeAvatarConfigShape(userState.avatarConfig);
  const cleanPreview = sanitizeAvatarConfigShape(previewCfg);
  for (const cat of getEquippableShopCatsList()) {
    const cfgKey = getShopCatConfigKey(cat);
    const id = cleanPreview[cfgKey];
    if (id === "none") {
      safe[cfgKey] = "none";
      continue;
    }
    if (cat === "fishing_bait") {
      if (getConsumableCount(id) > 0) safe[cfgKey] = id;
      continue;
    }
    const item = getItemById(cat, id);
    if (item && (((!item.price || item.price === 0) && item.purchasable !== false) || userState.ownedItems.includes(item.id))) {
      safe[cfgKey] = id;
    }
  }
  return safe;
}

let pendingMultiBuyList = [];

window.updateShopMultiBuyTotal = function () {
  const checks = Array.from(document.querySelectorAll("#shopMultiBuyList input[type='checkbox']:checked"));
  const total = checks.reduce((sum, el) => sum + (Number(el.dataset.price) || 0), 0);
  const totalEl = document.getElementById("shopMultiBuyTotal");
  const btn = document.getElementById("shopMultiBuyConfirmBtn");
  if (totalEl) totalEl.textContent = `💿 ${total.toLocaleString()} CD`;
  if (btn) {
    btn.disabled = checks.length === 0;
    btn.textContent = checks.length > 0 ? `🛍️ ${checks.length}개 구매 · 장착` : "구매할 아이템을 선택하세요";
  }
};

window.confirmMultiBuyShopItems = async function () {
  const checks = Array.from(document.querySelectorAll("#shopMultiBuyList input[type='checkbox']:checked"));
  if (checks.length === 0) return;

  const selected = checks.map(el => ({
    cat: el.dataset.cat,
    id: el.dataset.id,
    name: el.dataset.name,
    price: Number(el.dataset.price) || 0
  }));

  const totalCost = selected.reduce((sum, item) => sum + item.price, 0);
  if (userState.cdCoins < totalCost) {
    gameAlert(`💿 CD가 부족합니다!\n(보유: ${userState.cdCoins.toLocaleString()} CD / 필요: ${totalCost.toLocaleString()} CD)`);
    return;
  }

  userState.cdCoins -= totalCost;
  for (const item of selected) {
    if (!userState.ownedItems.includes(item.id)) {
      userState.ownedItems.push(item.id);
    }
  }
  // 선택한 아이템 + 기존 보유 아이템만 실제 장착(미구매 미리보기는 자동 제외)
  userState.avatarConfig = sanitizeAvatarConfigToOwned(shopPreviewState.config);
  shopPreviewState.config = { ...userState.avatarConfig };

  closeModal("shopMultiBuyModal");
  await syncProfileToServer();
  renderShopCategory(shopPreviewState.selectedCat);
  updateShopPreviewCanvas();

  const names = selected.map(s => s.name).join(", ");
  gameAlert(`🎉 [${names}] 구매 및 장착 완료!\n(총 💿 ${totalCost.toLocaleString()} CD 사용)`, "🛍️ 구매 성공");
};

async function purchaseAndEquipPreviewItem(sel) {
  const unownedList = getUnownedPreviewItems();
  if (
    sel &&
    sel.id &&
    sel.price > 0 &&
    !userState.ownedItems.includes(sel.id) &&
    !unownedList.some(x => x.cat === sel.cat && x.id === sel.id)
  ) {
    unownedList.push({ cat: sel.cat, ...sel });
  }

  if (unownedList.length === 0) {
    saveCurrentPreviewLook();
    return;
  }

  // 입어보고 있는 미구매 아이템이 2개 이상이면 각각 가격/총합 팝업으로 선택 구매 제공
  if (unownedList.length > 1) {
    pendingMultiBuyList = unownedList;
    const listEl = document.getElementById("shopMultiBuyList");
    const balEl = document.getElementById("shopMultiBuyBalance");
    if (balEl) balEl.textContent = `${userState.cdCoins.toLocaleString()} CD`;
    if (listEl) {
      listEl.innerHTML = unownedList
        .map(
          item => `
        <label class="shop-multibuy-item">
          <div style="display:flex; align-items:center; gap:8px; min-width:0;">
            <input type="checkbox" checked data-cat="${item.cat}" data-id="${item.id}" data-name="${item.name}" data-price="${item.price}" onchange="updateShopMultiBuyTotal()" />
            <div style="min-width:0;">
              <div style="font-size:0.84rem; font-weight:900; color:var(--text-main);">[${SHOP_CAT_LABELS[item.cat] || item.cat}] ${item.name}</div>
              <div style="font-size:0.72rem; color:var(--text-sub);">${sel && item.id === sel.id ? "현재 선택한 아이템" : "입어보기 중인 아이템"}</div>
            </div>
          </div>
          <strong style="color:#b45309; font-size:0.86rem; white-space:nowrap;">💿 ${item.price.toLocaleString()}</strong>
        </label>
      `
        )
        .join("");
    }
    updateShopMultiBuyTotal();
    openModal("shopMultiBuyModal");
    return;
  }

  const targetItem = unownedList[0];
  if (userState.cdCoins < targetItem.price) {
    gameAlert(`💿 CD가 부족합니다!\n(보유: ${userState.cdCoins.toLocaleString()} CD / 필요: ${targetItem.price.toLocaleString()} CD)\n문제를 풀고 점수를 얻으면 CD가 지급됩니다!`);
    return;
  }

  const buyTitle =
    targetItem.cat === "fishing_rod"
      ? "🎣 낚싯대 구매"
      : targetItem.cat === "fishing_bait"
      ? "🪱 미끼 구매"
      : "🛍️ 코스튬 구매";
  gameConfirm(`[${targetItem.name}] 아이템을 💿 ${targetItem.price.toLocaleString()} CD에 구매하고 장착할까요?`, async () => {
    userState.cdCoins -= targetItem.price;
    if (!userState.ownedItems.includes(targetItem.id)) {
      userState.ownedItems.push(targetItem.id);
    }
    userState.avatarConfig = sanitizeAvatarConfigToOwned(shopPreviewState.config);
    shopPreviewState.config = { ...userState.avatarConfig };
    await syncProfileToServer();
    renderShopCategory(shopPreviewState.selectedCat);
    updateShopPreviewCanvas();
    gameAlert(`🎉 [${targetItem.name}] 구매 및 장착 완료!`, "🛍️ 구매 성공");
  }, buyTitle);
}

function purchaseNicknameTicket() {
  const item = getItemById("special", "nickname_ticket");
  const price = item ? item.price : 5000;

  if (!userState.isLoggedIn) {
    gameAlert("닉네임 변경권은 로그인한 계정에서 사용할 수 있습니다!");
    return;
  }
  if (userState.cdCoins < price) {
    gameAlert(`💿 CD가 부족합니다! (보유: ${userState.cdCoins} CD / 필요: ${price.toLocaleString()} CD)`);
    return;
  }

  gamePrompt(`🎫 닉네임 변경권 (${price.toLocaleString()} CD)\n새 닉네임을 입력해주세요 (2~12자):`, userState.nickname, async newNick => {
    if (!newNick || newNick.length < 2) {
      gameAlert("닉네임은 2글자 이상이어야 합니다.");
      return;
    }
    if (newNick === userState.nickname) {
      gameAlert("현재 닉네임과 동일합니다.");
      return;
    }

    const { data: exist } = await sbClient
      .from("profiles")
      .select("id")
      .eq("nickname", newNick)
      .maybeSingle();

    if (exist) {
      gameAlert("이미 다른 유저가 사용 중인 닉네임입니다!");
      return;
    }

    userState.cdCoins -= price;
    userState.nickname = newNick;
    await syncProfileToServer();
    updateShopPreviewCanvas();
    gameAlert(`✨ 닉네임이 [${newNick}](으)로 변경되었습니다!`, "🎫 닉네임 변경 완료");
  }, "🎫 닉네임 변경권 사용");
}

function purchaseGenderTicket() {
  const item = getItemById("special", "gender_ticket");
  const price = item ? item.price : 10000;

  if (userState.cdCoins < price) {
    gameAlert(`💿 CD가 부족합니다! (보유: ${userState.cdCoins} CD / 필요: ${price.toLocaleString()} CD)`);
    return;
  }

  const nextGender = userState.avatarConfig.gender === "female" ? "male" : "female";
  const nextLabel = nextGender === "female" ? "👧 여자 캐릭터" : "👦 남자 캐릭터";

  gameConfirm(`⚧️ 성별 변경권 (${price.toLocaleString()} CD)을 구매하여\n내 기본 캐릭터를 [${nextLabel}]로 변경하시겠습니까?`, async () => {
    userState.cdCoins -= price;
    userState.avatarConfig.gender = nextGender;
    shopPreviewState.config.gender = nextGender;
    await syncProfileToServer();
    updateShopPreviewCanvas();
    gameAlert(`✨ 캐릭터 성별이 [${nextLabel}]로 변경되었습니다!`, "⚧️ 성별 변경 완료");
  }, "⚧️ 성별 변경권 사용");
}

async function purchaseConsumableShopItem(cat, item) {
  if (!item || !item.id) return;
  const price = Number(item.price) || 0;
  if (userState.cdCoins < price) {
    gameAlert(`💿 CD가 부족합니다!\n(보유: ${userState.cdCoins.toLocaleString()} CD / 필요: ${price.toLocaleString()} CD)`);
    return;
  }
  gameConfirm(`[${item.name}] 1개를 💿 ${price.toLocaleString()} CD에 구매할까요?`, async () => {
    userState.cdCoins -= price;
    if (!userState.inventory || typeof userState.inventory !== "object") userState.inventory = {};
    userState.inventory[item.id] = getConsumableCount(item.id) + 1;
    if (cat === "fishing_bait") {
      userState.avatarConfig.fishingBait = item.id;
      shopPreviewState.config.fishingBait = item.id;
    }
    await syncProfileToServer();
    renderShopCategory(shopPreviewState.selectedCat);
    updateShopPreviewCanvas();
    gameAlert(`🎉 [${item.name}] 1개를 구매했습니다! (현재 보유: ${userState.inventory[item.id]}개)`, "🛍️ 구매 완료");
  }, "🛍️ 소모품 구매");
}

window.renderShopCategory = function (cat) {
  shopPreviewState.selectedCat = cat;
  syncShopMainTabsUI(cat);
  document.querySelectorAll("[data-shop-cat]").forEach(btn => {
    btn.classList.toggle("active", btn.getAttribute("data-shop-cat") === cat);
  });

  const grid = document.getElementById("shopItemsGrid");
  if (!grid) return;

  const cfgKey = getShopCatConfigKey(cat);
  const isFishingGearCat = cat === "fishing_rod" || cat === "fishing_bait";
  const isGameItemCat = cat === "game_item";
  const items = isGameItemCat
    ? (typeof GAME_ITEMS_CATALOG !== "undefined" ? GAME_ITEMS_CATALOG : [])
    : (AVATAR_SHOP_ITEMS[cat] || []);

  grid.innerHTML = items
    .map((item, idx) => {
      const cnt = getConsumableCount(item.id);
      const isConsumable = cat === "fishing_bait" || isGameItemCat;
      const owned = isConsumable
        ? cnt > 0
        : (item.purchasable !== false && item.price === 0) || userState.ownedItems.includes(item.id);
      const isEquipped =
        isFishingGearCat &&
        userState.avatarConfig &&
        userState.avatarConfig[cfgKey] === item.id &&
        (cat !== "fishing_bait" || cnt > 0);
      const previewing =
        cat === "special" || isGameItemCat
          ? shopPreviewState.selectedItem?.id === item.id
          : shopPreviewState.config[cfgKey] === item.id;
      const grade = item.grade || "C";
      const priceText =
        cat === "special" || isGameItemCat
          ? `💿${item.price.toLocaleString()}`
          : item.purchasable === false && !owned
          ? "출석한정"
          : isEquipped
          ? `착용(${cat === "fishing_bait" ? `${cnt}개` : "중"})`
          : cat === "fishing_bait"
          ? `💿${item.price.toLocaleString()}${cnt > 0 ? `(${cnt})` : ""}`
          : owned
          ? "보유"
          : `💿${item.price.toLocaleString()}`;

      let buffHtml = "";
      if (cat === "fishing_rod" && Number(item.expMultiplier) > 1) {
        const pct = Math.round((Number(item.expMultiplier) - 1) * 100);
        buffHtml = `<span class="apf-tile-buff">EXP +${pct}%</span>`;
      } else if (cat === "fishing_bait" && Number(item.cdMultiplier) > 1) {
        const pct = Math.round((Number(item.cdMultiplier) - 1) * 100);
        buffHtml = `<span class="apf-tile-buff is-cd">CD +${pct}%</span>`;
      } else if (isGameItemCat) {
        buffHtml = `<span class="apf-tile-buff">${item.scopeLabel || "아이템"} · ${cnt}개</span>`;
      }
      const thumbSize = isFishingGearCat ? 40 : 52;
      const iconEmoji = isGameItemCat ? (item.name.split(" ")[0] || "🎒") : "";

      return `
      <div class="apf-tile ${owned && cat !== "special" && !isGameItemCat ? "owned-tile" : ""} ${previewing ? "preview-selected" : ""}" onclick="previewShopItem('${cat}', '${item.id}')">
        <span class="apf-tile-price ${isEquipped ? "is-equipped" : owned && cat !== "special" && !isGameItemCat ? "is-owned" : ""}">${priceText}</span>
        ${previewing ? `<div class="apf-tile-check">✔</div>` : `<div class="apf-tile-grade grade-${grade}">${grade}</div>`}
        ${isGameItemCat
          ? `<div style="font-size:2rem; line-height:52px; height:52px; margin-top:7px;">${iconEmoji}</div>`
          : `<canvas id="shopThumb_${cat}_${idx}" width="480" height="480" style="width:${thumbSize}px; height:${thumbSize}px; margin-top:7px;"></canvas>`}
        ${buffHtml}
        <span class="apf-tile-name">${item.name}</span>
      </div>
    `;
    })
    .join("");

  if (!isGameItemCat) {
    items.forEach((item, idx) => {
      const cv = document.getElementById(`shopThumb_${cat}_${idx}`);
      if (cv) renderItemThumbnail(cv, cat, item);
    });
  }
};

window.previewShopItem = function (cat, itemId) {
  const item = cat === "game_item"
    ? (typeof getGameItemById === "function" ? getGameItemById(itemId) : null)
    : getItemById(cat, itemId);
  if (!item) return;
  shopPreviewState.selectedItem = { cat, ...item };
  if (cat !== "special" && cat !== "game_item") {
    shopPreviewState.config[getShopCatConfigKey(cat)] = itemId;
  } else if (itemId === "gender_ticket") {
    // 성별 변경권 선택 시 피팅룸에서 반대 성별 미리보기 제공
    shopPreviewState.config.gender = userState.avatarConfig.gender === "female" ? "male" : "female";
  }
  renderShopCategory(cat);
  updateShopPreviewCanvas();
};

// ============================================================================
// 4. 좌측 상단 클릭 -> 내 프로필 & 전적/랭킹 팝업 + 타 유저 프로필
// ============================================================================
window.openMyProfileModal = async function () {
  if (!userState.isLoggedIn) {
    gameConfirm("로그인이 필요한 기능입니다.\n로그인 화면으로 이동할까요?", () => showLoginScreen());
    return;
  }
  openModal("profileModal");
  const cv = document.getElementById("profileAvatarCanvas");
  if (cv) renderPixelAvatar(cv, userState.avatarConfig);

  document.getElementById("profileNickDisplay").textContent = userState.nickname;
  document.getElementById("profileCdDisplay").textContent = `💿 ${userState.cdCoins.toLocaleString()} CD`;
  document.getElementById("profileBioInput").value = userState.bio;

  const b1 = document.getElementById("profileBattle1v1");
  const b4 = document.getElementById("profileBattle4p");
  if (b1) b1.textContent = formatBattleStatText(userState.battleStats["1v1"]);
  if (b4) b4.textContent = formatBattleStatText(userState.battleStats["4p"]);

  if (typeof getLevelInfo === "function") {
    const lv = getLevelInfo(userState.exp);
    const pTitle = document.getElementById("profileTitleDisplay");
    if (pTitle) pTitle.textContent = `Lv.${lv.level} ${lv.title}`;
    const pExpText = document.getElementById("profileExpText");
    if (pExpText) {
      pExpText.textContent = lv.isMax
        ? `MAX (${lv.exp.toLocaleString()} EXP)`
        : `${lv.inLevelExp.toLocaleString()} / ${lv.needInLevel.toLocaleString()} EXP (총 ${lv.exp.toLocaleString()})`;
    }
    const pExpPct = document.getElementById("profileExpPercent");
    if (pExpPct) pExpPct.textContent = `${lv.percent.toFixed(1)}%`;
    const pExpFill = document.getElementById("profileExpFill");
    if (pExpFill) pExpFill.style.width = `${lv.percent.toFixed(1)}%`;
  }

  // 수파베이스에서 내 통산 전적 및 랭킹 순위 계산
  document.getElementById("statPlayCount").textContent = "조회중...";
  document.getElementById("statBestScore").textContent = "-";
  document.getElementById("statAvgAcc").textContent = "-";
  document.getElementById("statMyRank").textContent = "-";

  if (sbClient && userState.id) {
    try {
      const { data: myRecords } = await sbClient
        .from("rankings")
        .select("score, accuracy")
        .eq("user_id", userState.id);

      const playCount = myRecords ? myRecords.length : 0;
      const bestScore = playCount > 0 ? Math.max(...myRecords.map(r => r.score || 0)) : 0;
      const avgAcc =
        playCount > 0
          ? Math.round(myRecords.reduce((acc, r) => acc + (r.accuracy || 0), 0) / playCount)
          : 0;

      document.getElementById("statPlayCount").textContent = `${playCount}회`;
      document.getElementById("statBestScore").textContent = `${bestScore}점`;
      document.getElementById("statAvgAcc").textContent = `${avgAcc}%`;

      document.getElementById("statMyRank").textContent = await computeUserUniqueRank(userState.id, bestScore);
    } catch (e) {}
  }
};

window.saveMyBio = async function () {
  const newBio = document.getElementById("profileBioInput").value.trim();
  userState.bio = newBio || "안녕하세요! 음악왕 도전자입니다.";
  await syncProfileToServer();
  gameAlert("프로필 소개글이 저장되었습니다!");
};

window.inspectOtherUser = async function (targetId, fallbackNick) {
  if (!targetId || targetId === "undefined") return;
  openModal("userInspectModal");
  document.getElementById("inspectNick").textContent = fallbackNick || "유저";
  document.getElementById("inspectBio").textContent = "프로필 불러오는 중...";
  document.getElementById("inspectTargetId").value = targetId;

  document.getElementById("inspectPlayCount").textContent = "조회중...";
  document.getElementById("inspectBestScore").textContent = "-";
  document.getElementById("inspectAvgAcc").textContent = "-";
  document.getElementById("inspectUserRank").textContent = "-";
  document.getElementById("inspectBattle1v1").textContent = "0전 0승 0패 (0%)";
  document.getElementById("inspectBattle4p").textContent = "0전 0승 0패 (0%)";

  const actionRow = document.getElementById("inspectActionRow");
  const friendBtn = document.getElementById("inspectFriendBtn");
  const dmBtn = document.getElementById("inspectDmBtn");
  const isSelf = userState.id && targetId === userState.id;

  if (actionRow) actionRow.classList.toggle("hidden", !!isSelf);
  if (friendBtn) {
    friendBtn.classList.remove("hidden");
    friendBtn.disabled = false;
    friendBtn.textContent = "➕ 친구 신청";
    friendBtn.onclick = () => sendFriendRequestByNick(document.getElementById("inspectNick").textContent);
  }
  if (dmBtn) {
    dmBtn.textContent = "💬 1:1 채팅";
    dmBtn.onclick = () => {
      closeModal("userInspectModal");
      prepareDmTo(targetId, document.getElementById("inspectNick").textContent);
    };
  }

  if (sbClient) {
    try {
      const { data } = await sbClient.from("profiles").select("*").eq("id", targetId).maybeSingle();
      if (data) {
        document.getElementById("inspectNick").textContent = data.nickname;
        document.getElementById("inspectBio").textContent = data.bio || "소개가 없습니다.";
        document.getElementById("inspectCdDisplay").textContent = `💿 ${(data.cd_coins ?? 0).toLocaleString()} CD`;
        const rawCfg = data.avatar_config || DEFAULT_AVATAR_CONFIG;
        const cv = document.getElementById("inspectAvatarCanvas");
        if (cv) renderPixelAvatar(cv, rawCfg);

        const targetExp = Number(rawCfg._exp) || 0;
        if (typeof getLevelInfo === "function") {
          const lv = getLevelInfo(targetExp);
          document.getElementById("inspectTitleDisplay").textContent = `Lv.${lv.level} ${lv.title}`;
          document.getElementById("inspectExpText").textContent = lv.isMax
            ? `MAX (${lv.exp.toLocaleString()} EXP)`
            : `${lv.inLevelExp.toLocaleString()} / ${lv.needInLevel.toLocaleString()} EXP (총 ${lv.exp.toLocaleString()})`;
          document.getElementById("inspectExpPercent").textContent = `${lv.percent.toFixed(1)}%`;
          document.getElementById("inspectExpFill").style.width = `${lv.percent.toFixed(1)}%`;
        }

        const bStats = normalizeBattleStats(rawCfg._battleStats);
        document.getElementById("inspectBattle1v1").textContent = formatBattleStatText(bStats["1v1"]);
        document.getElementById("inspectBattle4p").textContent = formatBattleStatText(bStats["4p"]);
      }

      const { data: recs } = await sbClient.from("rankings").select("score, accuracy").eq("user_id", targetId);
      const playCount = recs ? recs.length : 0;
      const bestScore = playCount > 0 ? Math.max(...recs.map(r => r.score || 0)) : 0;
      const avgAcc =
        playCount > 0
          ? Math.round(recs.reduce((acc, r) => acc + (r.accuracy || 0), 0) / playCount)
          : 0;
      document.getElementById("inspectPlayCount").textContent = `${playCount}회`;
      document.getElementById("inspectBestScore").textContent = `${bestScore}점`;
      document.getElementById("inspectAvgAcc").textContent = `${avgAcc}%`;

      document.getElementById("inspectUserRank").textContent = await computeUserUniqueRank(targetId, bestScore);

      // 친구 여부 확인: 이미 친구면 친구추가 버튼 비활성화(숨김) + DM보내기 버튼으로 전환!
      if (!isSelf && userState.id && friendBtn && dmBtn) {
        const { data: rel } = await sbClient
          .from("friendships")
          .select("status")
          .or(`and(requester_id.eq.${userState.id},receiver_id.eq.${targetId}),and(requester_id.eq.${targetId},receiver_id.eq.${userState.id})`)
          .maybeSingle();

        if (rel && rel.status === "accepted") {
          friendBtn.classList.add("hidden");
          dmBtn.textContent = "💬 DM 보내기";
        } else if (rel && rel.status === "pending") {
          friendBtn.disabled = true;
          friendBtn.textContent = "⏳ 친구 대기중";
        }
      }
    } catch (e) {}
  }
};

window.openReportBlockDialog = function (targetId, targetNick) {
  if (!userState.isLoggedIn || !userState.id) {
    gameAlert("신고 및 차단 기능은 로그인 후 이용할 수 있습니다.");
    return;
  }
  const cleanId = targetId && targetId !== "undefined" ? String(targetId) : "";
  const cleanNick = String(targetNick || "유저").trim() || "유저";
  if (cleanId && cleanId === userState.id) {
    gameAlert("자기 자신은 신고 또는 차단할 수 없습니다.");
    return;
  }

  gamePrompt(
    `[${cleanNick}]님을 신고 및 차단하시겠습니까?\n차단 시 친구 목록·1:1 DM·알림에서 즉시 숨겨집니다.\n\n신고 사유를 입력해 주세요:`,
    "부적절한 언어 / 비매너 행동",
    async reasonInput => {
      const reason = String(reasonInput || "").trim() || "부적절한 행동/비매너";
      if (!isUserBlocked(cleanId, cleanNick)) {
        userState.blockedUsers = [
          ...(userState.blockedUsers || []),
          { id: cleanId, nickname: cleanNick, blockedAt: new Date().toISOString() }
        ];
        saveBlockedUsersToStorage();
      }

      if (cleanId) {
        dmNotiState.unreadList = dmNotiState.unreadList.filter(m => m.sender_id !== cleanId);
        syncDmNotiBadgeUI();
      }

      if (sbClient && userState.id) {
        try {
          await syncProfileToServer();
          const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
          if (cleanId && uuidRegex.test(cleanId)) {
            await sbClient.from("user_reports").insert({
              reporter_id: userState.id,
              target_id: cleanId,
              target_nickname: cleanNick,
              reason
            });
          }
        } catch (e) {}
      }

      closeModal("userInspectModal");
      if (typeof state !== "undefined" && state.currentScreen === "dmChatScreen" && dmState.peerId === cleanId) {
        if (typeof stopDmRealtime === "function") stopDmRealtime();
        switchScreen("socialScreen");
      }

      if (typeof loadFriendsData === "function") loadFriendsData();
      if (typeof state !== "undefined" && state.currentScreen === "rankingScreen") loadRankingsList();
      if (typeof state !== "undefined" && state.currentScreen === "plazaScreen") renderLobbyOnlineUsers();

      gameAlert(`[${cleanNick}]님이 신고 및 차단 처리되었습니다.\n내 화면의 친구·DM·알림·대기실 목록에서 즉시 숨겨집니다.`, "🚨 신고/차단 완료");
    },
    "🚨 유저 신고 및 차단"
  );
};

window.unblockUserById = async function (targetId, targetNick = "") {
  userState.blockedUsers = (userState.blockedUsers || []).filter(b => {
    if (targetId && b.id) return String(b.id) !== String(targetId);
    return b.nickname !== targetNick;
  });
  saveBlockedUsersToStorage();
  await syncProfileToServer();
  openBlockedUsersModal();
  if (typeof loadFriendsData === "function") loadFriendsData();
};

window.openBlockedUsersModal = function () {
  const box = document.getElementById("blockedUsersListBox");
  if (!box) return;
  const list = userState.blockedUsers || [];
  if (list.length === 0) {
    box.innerHTML = `<div style="text-align:center; padding:24px; color:var(--text-sub); font-size:0.84rem;">현재 차단된 유저가 없습니다.</div>`;
  } else {
    box.innerHTML = list
      .map(b => {
        const safeId = escapeJsSingleArg(b.id);
        const safeNick = escapeJsSingleArg(b.nickname || "유저");
        const dateStr = b.blockedAt ? new Date(b.blockedAt).toLocaleDateString() : "";
        return `
          <div class="pixel-list-item" style="cursor:default;">
            <div>
              <strong style="font-size:0.88rem;">🚫 ${b.nickname || "알 수 없는 유저"}</strong>
              ${dateStr ? `<div style="font-size:0.72rem; color:var(--text-sub);">차단일: ${dateStr}</div>` : ""}
            </div>
            <button type="button" class="btn" style="padding:5px 10px; font-size:0.76rem;" onclick="unblockUserById('${safeId}', '${safeNick}')">차단 해제</button>
          </div>
        `;
      })
      .join("");
  }
  openModal("blockedUsersModal");
};

// ============================================================================
// 5. 카카오톡 스타일 전체화면 친구 목록(#socialScreen) & 1:1 DM 채팅방(#dmChatScreen)
// ============================================================================
const dmState = {
  peerId: null,
  peerNick: "",
  peerAvatar: { ...DEFAULT_AVATAR_CONFIG },
  channel: null,
  pollTimer: null
};

const dmNotiState = {
  unreadList: [],
  profileMap: new Map(),
  channel: null,
  pollTimer: null
};

function getSeenDmMap() {
  if (!userState.id) return {};
  try {
    return JSON.parse(localStorage.getItem(`mk_dm_seen_map_${userState.id}`) || "{}");
  } catch (e) {
    return {};
  }
}

window.markPeerDmRead = function (peerId, newestIso = null) {
  if (!userState.id || !peerId) return;
  const map = getSeenDmMap();
  map[peerId] = newestIso || new Date().toISOString();
  localStorage.setItem(`mk_dm_seen_map_${userState.id}`, JSON.stringify(map));
  dmNotiState.unreadList = dmNotiState.unreadList.filter(m => m.sender_id !== peerId);
  syncDmNotiBadgeUI();
};

window.markAllDmNotiRead = function () {
  if (!userState.id) return;
  const map = getSeenDmMap();
  const nowIso = new Date().toISOString();
  dmNotiState.unreadList.forEach(m => {
    map[m.sender_id] = m.created_at > nowIso ? m.created_at : nowIso;
  });
  localStorage.setItem(`mk_dm_seen_map_${userState.id}`, JSON.stringify(map));
  dmNotiState.unreadList = [];
  syncDmNotiBadgeUI();
};

window.syncDmNotiBadgeUI = function () {
  const btn = document.getElementById("floatingDmNotiBtn");
  const badge = document.getElementById("dmNotiBadgeCount");
  if (!btn || !badge) return;
  const count = dmNotiState.unreadList.length;
  const curScreen = typeof state !== "undefined" ? state.currentScreen : "homeScreen";
  const allowScreen = ["homeScreen", "setupScreen", "plazaScreen", "rankingScreen", "socialScreen"].includes(curScreen);
  btn.classList.toggle("hidden", !(userState.isLoggedIn && count > 0 && allowScreen));
  badge.textContent = count > 99 ? "99+" : String(count);
  if (typeof syncHomeCornerFloatingButtons === "function") {
    syncHomeCornerFloatingButtons();
  }
};

window.refreshUnreadDmNotis = async function () {
  if (!sbClient || !userState.isLoggedIn || !userState.id) {
    dmNotiState.unreadList = [];
    syncDmNotiBadgeUI();
    return;
  }

  try {
    const sinceIso = new Date(Date.now() - 1000 * 60 * 60 * 48).toISOString();
    const { data: msgs } = await sbClient
      .from("direct_messages")
      .select("*")
      .eq("receiver_id", userState.id)
      .gte("created_at", sinceIso)
      .order("created_at", { ascending: false })
      .limit(40);

    const seenMap = getSeenDmMap();
    const curScreen = typeof state !== "undefined" ? state.currentScreen : "";

    // 현재 해당 상대와 카톡 채팅방에 이미 들어가 있거나 차단한 유저면 알림 제외
    const unread = (msgs || []).filter(m => {
      if (isUserBlocked(m.sender_id)) return false;
      if (curScreen === "dmChatScreen" && dmState.peerId === m.sender_id) {
        return false;
      }
      const seenAt = seenMap[m.sender_id] || "";
      return !seenAt || new Date(m.created_at).getTime() > new Date(seenAt).getTime();
    });

    dmNotiState.unreadList = unread;

    const senderIds = [...new Set(unread.map(m => m.sender_id))];
    if (senderIds.length > 0) {
      const { data: profs } = await sbClient.from("profiles").select("id, nickname, avatar_config").in("id", senderIds);
      (profs || []).forEach(p => dmNotiState.profileMap.set(p.id, p));
    }

    syncDmNotiBadgeUI();
  } catch (e) {}
};

window.startGlobalDmNotiListener = function () {
  stopGlobalDmNotiListener();
  if (!sbClient || !userState.isLoggedIn || !userState.id) return;

  refreshUnreadDmNotis();

  dmNotiState.channel = sbClient
    .channel(`global_dm_noti_${userState.id}`)
    .on("postgres_changes", { event: "INSERT", schema: "public", table: "direct_messages" }, payload => {
      const row = payload.new;
      if (row && row.receiver_id === userState.id) {
        refreshUnreadDmNotis();
      }
    })
    .subscribe();

  dmNotiState.pollTimer = setInterval(() => {
    refreshUnreadDmNotis();
  }, 8000);
};

window.stopGlobalDmNotiListener = function () {
  if (dmNotiState.channel && sbClient) {
    try { sbClient.removeChannel(dmNotiState.channel); } catch (e) {}
    dmNotiState.channel = null;
  }
  if (dmNotiState.pollTimer) {
    clearInterval(dmNotiState.pollTimer);
    dmNotiState.pollTimer = null;
  }
  dmNotiState.unreadList = [];
  syncDmNotiBadgeUI();
};

window.openDmNotiModal = async function () {
  await refreshUnreadDmNotis();
  const listEl = document.getElementById("dmNotiPreviewList");
  if (!listEl) return;

  if (dmNotiState.unreadList.length === 0) {
    listEl.innerHTML = `<div style="text-align:center; padding:24px; color:var(--text-sub);">새로 도착한 메시지가 없습니다.</div>`;
  } else {
    listEl.innerHTML = dmNotiState.unreadList
      .map(m => {
        const prof = dmNotiState.profileMap.get(m.sender_id) || { nickname: "친구", avatar_config: DEFAULT_AVATAR_CONFIG };
        const safeNick = String(prof.nickname || "친구").replace(/'/g, "\\'");
        const d = new Date(m.created_at);
        const timeStr = `${d.getHours() >= 12 ? "오후" : "오전"} ${d.getHours() % 12 || 12}:${String(d.getMinutes()).padStart(2, "0")}`;
        return `
          <div class="pixel-list-item" onclick="closeModal('dmNotiModal'); prepareDmTo('${m.sender_id}', '${safeNick}')">
            <div style="display:flex; align-items:center; gap:9px; min-width:0; flex:1;">
              <canvas class="noti-mini-cv kakao-avatar-sq" width="480" height="480" style="width:40px; height:40px;" data-avatar='${JSON.stringify(prof.avatar_config || DEFAULT_AVATAR_CONFIG)}'></canvas>
              <div style="min-width:0; flex:1;">
                <div style="display:flex; justify-content:space-between; align-items:center;">
                  <strong style="font-size:0.88rem;">${prof.nickname}</strong>
                  <span style="font-size:0.68rem; color:var(--text-sub);">${timeStr}</span>
                </div>
                <div style="font-size:0.78rem; color:var(--primary-dark); white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">${String(m.content || "").replace(/</g, "&lt;")}</div>
              </div>
            </div>
            <span class="badge primary">답장 ➔</span>
          </div>
        `;
      })
      .join("");

    listEl.querySelectorAll(".noti-mini-cv").forEach(cv => {
      try { renderPixelAvatar(cv, JSON.parse(cv.getAttribute("data-avatar"))); } catch (e) {}
    });
  }

  openModal("dmNotiModal");
};

window.stopDmRealtime = function () {
  if (dmState.channel && sbClient) {
    try { sbClient.removeChannel(dmState.channel); } catch (e) {}
    dmState.channel = null;
  }
  if (dmState.pollTimer) {
    clearInterval(dmState.pollTimer);
    dmState.pollTimer = null;
  }
};

window.openSocialModal = async function (tab = "friends") {
  if (!userState.isLoggedIn) {
    gameConfirm("친구 및 DM 기능은 로그인 후 이용하실 수 있습니다.\n로그인 화면으로 이동할까요?", () => showLoginScreen());
    return;
  }

  switchScreen("socialScreen");

  // 상단 내 카톡 프로필 업데이트
  const myNickEl = document.getElementById("socialMyNickDisplay");
  const myBioEl = document.getElementById("socialMyBioDisplay");
  const myCv = document.getElementById("socialMyAvatarCanvas");
  if (myNickEl) myNickEl.textContent = userState.nickname;
  if (myBioEl) myBioEl.textContent = userState.bio || "상태 메시지가 없습니다.";
  if (myCv) renderPixelAvatar(myCv, userState.avatarConfig);

  switchSocialTab(tab === "dm" ? "friends" : tab);
};

window.switchSocialTab = async function (tab) {
  const fBtn = document.getElementById("socialTab_friends");
  const rBtn = document.getElementById("socialTab_requests");
  const fPane = document.getElementById("socialPane_friends");
  const rPane = document.getElementById("socialPane_requests");

  if (fBtn) fBtn.style.background = tab === "friends" ? "#fef08a" : "#ffffff";
  if (rBtn) rBtn.style.background = tab === "requests" ? "#fef08a" : "#ffffff";
  if (fPane) fPane.classList.toggle("hidden", tab !== "friends");
  if (rPane) rPane.classList.toggle("hidden", tab !== "requests");

  await loadFriendsData();
};

window.sendFriendRequestByNick = async function (targetNickParam) {
  if (!userState.isLoggedIn) {
    showLoginScreen();
    return;
  }
  const searchEl = document.getElementById("friendSearchInput");
  const nick = targetNickParam || (searchEl ? searchEl.value.trim() : "");
  if (!nick) {
    gameAlert("친구 추가할 닉네임을 입력해주세요.");
    return;
  }
  if (nick === userState.nickname) {
    gameAlert("자기 자신에게는 친구 신청을 보낼 수 없습니다.");
    return;
  }

  const { data: targetProf } = await sbClient
    .from("profiles")
    .select("id, nickname")
    .eq("nickname", nick)
    .maybeSingle();

  if (!targetProf) {
    gameAlert(`[${nick}] 닉네임을 가진 유저를 찾을 수 없습니다.`);
    return;
  }

  const { error } = await sbClient.from("friendships").insert({
    requester_id: userState.id,
    receiver_id: targetProf.id,
    status: "pending"
  });

  if (error) {
    gameAlert("이미 친구 신청을 보냈거나 친구로 등록되어 있습니다.");
    return;
  }

  if (searchEl) searchEl.value = "";
  gameAlert(`💌 [${targetProf.nickname}]님에게 친구 신청을 보냈습니다!`);
  loadFriendsData();
};

async function loadFriendsData() {
  const acceptedBox = document.getElementById("friendsListContainer");
  const pendingBox = document.getElementById("friendRequestsContainer");
  const countLabel = document.getElementById("kakaoFriendsCountLabel");
  if (!acceptedBox || !pendingBox || !sbClient || !userState.id) return;

  const { data: rels } = await sbClient
    .from("friendships")
    .select("*")
    .or(`requester_id.eq.${userState.id},receiver_id.eq.${userState.id}`);

  if (!rels || rels.length === 0) {
    if (countLabel) countLabel.textContent = "친구 0";
    acceptedBox.innerHTML = `<div style="text-align:center; padding:36px 16px; color:var(--text-sub); font-size:0.86rem;">아직 등록된 친구가 없습니다.<br/>우측 상단 <strong>[➕ 추가]</strong> 버튼으로 친구를 추가해보세요!</div>`;
    pendingBox.innerHTML = `<div style="text-align:center; padding:24px; color:var(--text-sub);">대기 중인 친구 요청이 없습니다.</div>`;
    return;
  }

  const otherIds = rels.map(r => (r.requester_id === userState.id ? r.receiver_id : r.requester_id));
  const { data: profs } = await sbClient.from("profiles").select("*").in("id", otherIds);
  const profMap = new Map((profs || []).map(p => [p.id, p]));

  const acceptedRels = rels.filter(r => {
    if (r.status !== "accepted") return false;
    const otherId = r.requester_id === userState.id ? r.receiver_id : r.requester_id;
    const prof = profMap.get(otherId);
    return !isUserBlocked(otherId, prof?.nickname || "");
  });
  const pendingRels = rels.filter(r => {
    if (r.status !== "pending") return false;
    const otherId = r.requester_id === userState.id ? r.receiver_id : r.requester_id;
    const prof = profMap.get(otherId);
    return !isUserBlocked(otherId, prof?.nickname || "");
  });

  if (countLabel) countLabel.textContent = `친구 ${acceptedRels.length}`;

  // 1) 카카오톡 스타일 친구 목록 (행 클릭 -> 즉시 카톡 1:1 DM 채팅방 전체화면 오픈!)
  if (acceptedRels.length === 0) {
    acceptedBox.innerHTML = `<div style="text-align:center; padding:36px 16px; color:var(--text-sub); font-size:0.86rem;">아직 수락된 친구가 없습니다.<br/>우측 상단 <strong>[➕ 추가]</strong> 탭에서 요청을 확인해보세요!</div>`;
  } else {
    acceptedBox.innerHTML = acceptedRels
      .map(r => {
        const otherId = r.requester_id === userState.id ? r.receiver_id : r.requester_id;
        const p = profMap.get(otherId) || { nickname: "유저", bio: "", avatar_config: DEFAULT_AVATAR_CONFIG };
        const safeNick = String(p.nickname || "유저").replace(/'/g, "\\'");
        return `
        <div class="kakao-friend-row" onclick="prepareDmTo('${otherId}', '${safeNick}')">
          <div class="kakao-friend-main">
            <canvas class="friend-mini-cv kakao-avatar-sq" width="480" height="480" data-avatar='${JSON.stringify(p.avatar_config || DEFAULT_AVATAR_CONFIG)}'></canvas>
            <div style="flex:1; min-width:0;">
              <div class="kakao-friend-nick">${p.nickname}</div>
              <div class="kakao-friend-bio">${p.bio || "상태 메시지가 없습니다."}</div>
            </div>
          </div>
          <div style="display:flex; gap:5px; flex-shrink:0;" onclick="event.stopPropagation()">
            <button class="header-btn" onclick="inspectOtherUser('${otherId}', '${safeNick}')" title="프로필">🪪</button>
            <button class="header-btn" style="color:var(--danger);" onclick="removeFriendship(${r.id}, '${safeNick}')" title="친구 삭제">✕</button>
          </div>
        </div>
      `;
      })
      .join("");
  }

  // 2) 받은/보낸 친구 요청 목록
  if (pendingRels.length === 0) {
    pendingBox.innerHTML = `<div style="text-align:center; padding:24px; color:var(--text-sub);">받은 친구 요청이 없습니다.</div>`;
  } else {
    pendingBox.innerHTML = pendingRels
      .map(r => {
        const isIncoming = r.receiver_id === userState.id;
        const otherId = isIncoming ? r.requester_id : r.receiver_id;
        const p = profMap.get(otherId) || { nickname: "유저" };
        const safeNick = String(p.nickname || "유저").replace(/'/g, "\\'");
        return `
        <div class="pixel-list-item">
          <div style="display:flex; align-items:center; gap:9px;">
            <canvas class="friend-mini-cv kakao-avatar-sq" width="480" height="480" style="width:40px; height:40px;" data-avatar='${JSON.stringify(p.avatar_config || DEFAULT_AVATAR_CONFIG)}'></canvas>
            <div>
              <strong>${p.nickname}</strong>
              <div style="font-size:0.72rem; color:var(--primary);">${isIncoming ? "📩 나를 친구 추가하고 싶어합니다" : "⏳ 상대방의 수락 대기중"}</div>
            </div>
          </div>
          <div style="display:flex; gap:4px;">
            ${
              isIncoming
                ? `<button class="btn btn-primary" style="padding:5px 10px; font-size:0.75rem;" onclick="acceptFriendRequest(${r.id})">수락</button>`
                : ""
            }
            <button class="btn" style="padding:5px 8px; font-size:0.75rem;" onclick="removeFriendship(${r.id}, '${safeNick}')">거절/취소</button>
          </div>
        </div>
      `;
      })
      .join("");
  }

  document.querySelectorAll(".friend-mini-cv").forEach(cv => {
    try {
      renderPixelAvatar(cv, JSON.parse(cv.getAttribute("data-avatar")));
    } catch (e) {}
  });
}

window.acceptFriendRequest = async function (friendshipId) {
  await sbClient.from("friendships").update({ status: "accepted" }).eq("id", friendshipId);
  loadFriendsData();
};

window.removeFriendship = function (friendshipId, nick) {
  gameConfirm(`[${nick}]님과의 친구(또는 요청)를 삭제할까요?`, async () => {
    await sbClient.from("friendships").delete().eq("id", friendshipId);
    loadFriendsData();
  });
};

// 친구 클릭 -> 카카오톡 스타일 1:1 채팅방 전체화면(#dmChatScreen) 입장!
window.prepareDmTo = async function (receiverId, receiverNick) {
  if (!userState.isLoggedIn) {
    gameConfirm("1:1 채팅은 로그인 후 이용할 수 있습니다.\n로그인 화면으로 이동할까요?", () => showLoginScreen());
    return;
  }
  if (isUserBlocked(receiverId, receiverNick)) {
    gameAlert("차단한 유저와는 1:1 대화를 이용할 수 없습니다.\n(환경설정 > 차단한 유저 목록 관리에서 해제 가능)");
    return;
  }
  closeModal("userInspectModal");
  dmState.peerId = receiverId;
  dmState.peerNick = receiverNick || "친구";
  dmState.peerAvatar = { ...DEFAULT_AVATAR_CONFIG };

  document.getElementById("dmTargetId").value = dmState.peerId;
  document.getElementById("dmTargetNick").value = dmState.peerNick;
  document.getElementById("dmPeerNickTitle").textContent = dmState.peerNick;

  switchScreen("dmChatScreen");

  // 상대 프로필 아바타 불러오기
  if (sbClient && dmState.peerId) {
    try {
      const { data: peerProf } = await sbClient
        .from("profiles")
        .select("nickname, avatar_config")
        .eq("id", dmState.peerId)
        .maybeSingle();
      if (peerProf) {
        dmState.peerNick = peerProf.nickname || dmState.peerNick;
        dmState.peerAvatar = peerProf.avatar_config || DEFAULT_AVATAR_CONFIG;
        document.getElementById("dmPeerNickTitle").textContent = dmState.peerNick;
        const peerCv = document.getElementById("dmPeerAvatarCanvas");
        if (peerCv) renderPixelAvatar(peerCv, dmState.peerAvatar);
      }
    } catch (e) {}
  }

  await loadCurrentDmConversation();
  markPeerDmRead(dmState.peerId);
  startDmRealtime();
};

function startDmRealtime() {
  stopDmRealtime();
  if (!sbClient || !userState.id || !dmState.peerId) return;

  const pairKey = [userState.id, dmState.peerId].sort().join("_");
  dmState.channel = sbClient
    .channel(`dm_${pairKey}`)
    .on("postgres_changes", { event: "INSERT", schema: "public", table: "direct_messages" }, payload => {
      const row = payload.new;
      if (
        row &&
        ((row.sender_id === userState.id && row.receiver_id === dmState.peerId) ||
          (row.sender_id === dmState.peerId && row.receiver_id === userState.id))
      ) {
        loadCurrentDmConversation();
      }
    })
    .subscribe();

  // 폴백 폴링 (Realtime 미활성 테이블 환경 대비 4초 간격)
  dmState.pollTimer = setInterval(() => {
    if (typeof state !== "undefined" && state.currentScreen === "dmChatScreen") {
      loadCurrentDmConversation();
    }
  }, 4000);
}

window.loadCurrentDmConversation = async function () {
  const box = document.getElementById("dmChatMessages");
  if (!box || !sbClient || !userState.id || !dmState.peerId) return;

  const { data: msgs } = await sbClient
    .from("direct_messages")
    .select("*")
    .or(
      `and(sender_id.eq.${userState.id},receiver_id.eq.${dmState.peerId}),and(sender_id.eq.${dmState.peerId},receiver_id.eq.${userState.id})`
    )
    .order("created_at", { ascending: true })
    .limit(60);

  if (!msgs || msgs.length === 0) {
    box.innerHTML = `<div style="margin:auto; text-align:center; background:rgba(15,23,42,0.18); color:#ffffff; padding:8px 14px; border-radius:999px; font-size:0.78rem; font-weight:700;">💬 [${dmState.peerNick}]님과의 1:1 대화를 시작해보세요!</div>`;
    return;
  }

  const fmtTime = iso => {
    if (!iso) return "";
    const d = new Date(iso);
    const h = d.getHours();
    const m = String(d.getMinutes()).padStart(2, "0");
    return `${h >= 12 ? "오후" : "오전"} ${h % 12 || 12}:${m}`;
  };

  const escapeHtml = str =>
    String(str)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");

  box.innerHTML = msgs
    .map(m => {
      const isMine = m.sender_id === userState.id;
      const t = fmtTime(m.created_at);
      if (isMine) {
        return `
          <div class="kakao-msg-row mine">
            <span class="kakao-msg-time">${t}</span>
            <div class="kakao-bubble mine">${escapeHtml(m.content)}</div>
          </div>
        `;
      }
      return `
        <div class="kakao-msg-row theirs">
          <canvas class="dm-bubble-avatar kakao-avatar-sq" width="480" height="480" style="width:34px; height:34px; border-radius:11px;"></canvas>
          <div class="kakao-bubble-wrap">
            <div style="font-size:0.72rem; font-weight:800; color:#334155; margin-bottom:3px;">${escapeHtml(dmState.peerNick)}</div>
            <div style="display:flex; align-items:flex-end; gap:5px;">
              <div class="kakao-bubble theirs">${escapeHtml(m.content)}</div>
              <span class="kakao-msg-time">${t}</span>
            </div>
          </div>
        </div>
      `;
    })
    .join("");

  box.querySelectorAll(".dm-bubble-avatar").forEach(cv => {
    renderPixelAvatar(cv, dmState.peerAvatar);
  });
  box.scrollTop = box.scrollHeight;
  markPeerDmRead(dmState.peerId);
};

window.sendDirectMessage = async function () {
  const input = document.getElementById("dmContentInput");
  const content = input ? input.value.trim() : "";
  const targetId = document.getElementById("dmTargetId")?.value || dmState.peerId;

  if (!content || !targetId) return;
  input.value = "";

  await sbClient.from("direct_messages").insert({
    sender_id: userState.id,
    receiver_id: targetId,
    content
  });

  await loadCurrentDmConversation();
};

// ============================================================================
// 6. 대기실 로비 (방 목록 + 접속 유저 아이콘 리스트) vs 방 내부 (맵 캐릭터 + 방 채팅 + 방 삭제)
// ============================================================================
function syncPlazaRoomFilterUI() {
  const filter = plazaState.roomFilter || "ALL";
  document.querySelectorAll("[data-plaza-filter]").forEach(el => {
    el.classList.toggle("active", el.getAttribute("data-plaza-filter") === filter);
  });
  const labelEl = document.getElementById("plazaRoomListLabel");
  if (labelEl) {
    labelEl.textContent =
      filter === "1v1"
        ? "⚡ 입장 가능한 1:1 대전 방 목록"
        : filter === "4p"
        ? "🏆 입장 가능한 4인 대전 방 목록"
        : "⚔️ 입장 가능한 대전 방 목록";
  }
}

window.setPlazaRoomFilter = function (filterType = "ALL") {
  plazaState.roomFilter = ["1v1", "4p", "ALL"].includes(filterType) ? filterType : "ALL";
  syncPlazaRoomFilterUI();
  refreshRoomsList();
};

window.enterMultiPlazaWithMode = function (modeType = "ALL") {
  plazaState.roomFilter = modeType || "ALL";
  enterPlazaScreen();
};

window.enterPlazaScreen = async function () {
  switchScreen("plazaScreen");
  syncPlazaRoomFilterUI();
  await refreshRoomsList();
  renderLobbyOnlineUsers();

  if (sbClient && !plazaState.channel) {
    const myKey = userState.id || `guest_${Math.floor(Math.random() * 9999)}`;
    plazaState.channel = sbClient.channel("music_king_plaza", {
      config: { presence: { key: myKey } }
    });

    plazaState.channel
      .on("presence", { event: "sync" }, () => {
        const stateObj = plazaState.channel.presenceState();
        plazaState.onlinePlayers.clear();
        Object.values(stateObj).forEach(arr => {
          const p = arr[0];
          if (p) plazaState.onlinePlayers.set(p.key, p);
        });
        renderLobbyOnlineUsers();
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "rooms" }, () => {
        refreshRoomsList();
      })
      .subscribe(async status => {
        if (status === "SUBSCRIBED") {
          await trackLobbyPresence();
        }
      });
  } else {
    trackLobbyPresence();
  }
};

async function trackLobbyPresence() {
  const myKey = userState.id || "guest_me";
  const payload = {
    key: myKey,
    userId: userState.id,
    nickname: userState.nickname,
    avatarConfig: userState.avatarConfig
  };
  plazaState.onlinePlayers.set(myKey, payload);
  renderLobbyOnlineUsers();

  if (plazaState.channel) {
    try {
      await plazaState.channel.track(payload);
    } catch (e) {}
  }
}

// 대기실에서는 맵 대신 접속 유저 리스트(닉네임 왼쪽에 480x480 캐릭터 아이콘) 표시!
function renderLobbyOnlineUsers() {
  const countEl = document.getElementById("plazaOnlineCount");
  const listEl = document.getElementById("plazaUsersList");
  if (!listEl) return;

  const players = Array.from(plazaState.onlinePlayers.values()).filter(
    p => !isUserBlocked(p.userId, p.nickname)
  );
  if (players.length === 0) {
    players.push({
      key: "me",
      userId: userState.id,
      nickname: userState.nickname,
      avatarConfig: userState.avatarConfig
    });
  }

  if (countEl) countEl.textContent = `대기실 유저 ${players.length}명`;

  listEl.innerHTML = players
    .map(
      p => `
      <div class="pixel-list-item" style="padding:6px 9px;" onclick="inspectOtherUser('${escapeJsSingleArg(p.userId || "")}', '${escapeJsSingleArg(p.nickname)}')">
        <div style="display:flex; align-items:center; gap:8px;">
          <canvas class="lobby-user-cv" width="480" height="480" style="width:36px; height:36px; border-radius:9px; border:1.5px solid #334155;" data-avatar='${JSON.stringify(p.avatarConfig || DEFAULT_AVATAR_CONFIG)}'></canvas>
          <strong style="font-size:0.86rem;">${p.nickname}</strong>
        </div>
        <span class="badge primary">대기중</span>
      </div>
    `
    )
    .join("");

  listEl.querySelectorAll(".lobby-user-cv").forEach(cv => {
    try {
      renderPixelAvatar(cv, JSON.parse(cv.getAttribute("data-avatar")));
    } catch (e) {}
  });
}

window.refreshRoomsList = async function () {
  const box = document.getElementById("plazaRoomsList");
  if (!box || !sbClient) return;

  const { data: rooms } = await sbClient
    .from("rooms")
    .select("*")
    .eq("status", "waiting")
    .order("created_at", { ascending: false })
    .limit(15);

  // 인원이 0명인 유령 방 제외 + 선택된 1:1 / 4인 모드 필터 적용
  const filter = plazaState.roomFilter || "ALL";
  const validRooms = (rooms || []).filter(r => {
    if (!Array.isArray(r.players) || r.players.length === 0) return false;
    if (filter !== "ALL" && r.room_type !== filter) return false;
    return true;
  });

  if (validRooms.length === 0) {
    const modeEmptyLabel = filter === "1v1" ? "1:1" : filter === "4p" ? "4인" : "대기 중인";
    box.innerHTML = `<div style="text-align:center; padding:22px; color:var(--text-sub); font-size:0.84rem;">현재 ${modeEmptyLabel} 방이 없습니다.<br/>하단 <strong>[방 만들기]</strong> 버튼으로 새 방을 열어보세요!</div>`;
    return;
  }

  box.innerHTML = validRooms
    .map(room => {
      const maxP = room.room_type === "1v1" ? 2 : 4;
      const curP = room.players.length;
      const cfg = room.game_config || { mode: "behind", stage: 1, decade: "ALL", itemMode: "notem" };
      const modeName = { behind: "비하인드", lyrics: "가사", onesec: "1초듣기" }[cfg.mode] || "비하인드";
      const itemTag = cfg.itemMode === "item" ? "🎒아이템전" : "🚫노템전";
      return `
      <div class="pixel-list-item">
        <div>
          <span class="badge primary" style="margin-right:4px;">${room.room_type === "1v1" ? "1:1" : "4인"}</span>
          <span class="badge accent" style="margin-right:4px;">${modeName}·${cfg.stage || 1}단계</span>
          <span class="badge ${cfg.itemMode === "item" ? "gold" : ""}" style="margin-right:4px;">${itemTag}</span>
          <strong>${room.title}</strong>
          <span style="font-size:0.76rem; color:var(--text-sub);">(${curP}/${maxP}명)</span>
        </div>
        <button class="btn btn-primary" style="padding:5px 10px; font-size:0.78rem;" onclick="joinOnlineRoom('${room.id}')">입장 ➔</button>
      </div>
    `;
    })
    .join("");
};

const createRoomState = {
  roomType: "1v1",
  decade: "ALL",
  mode: "behind",
  stage: 1,
  itemMode: "notem"
};

window.openCreateRoomModal = function (defaultType = "1v1") {
  if (!userState.isLoggedIn) {
    gameConfirm("온라인 방 만들기는 로그인 후 가능합니다.\n로그인 화면으로 이동할까요?", () => showLoginScreen());
    return;
  }
  createRoomState.roomType = defaultType;
  document.getElementById("createRoomModalTitle").textContent =
    defaultType === "1v1" ? "⚡ 1:1 선착순 대전 방 만들기" : "🏆 4인 점수제 대전 방 만들기";
  document.getElementById("createRoomTitleInput").value = `${userState.nickname}님의 대결방!`;
  selectRoomConfig("decade", createRoomState.decade);
  selectRoomConfig("mode", createRoomState.mode);
  selectRoomConfig("stage", createRoomState.stage);
  selectRoomConfig("itemMode", createRoomState.itemMode || "notem");
  openModal("createRoomModal");
};

window.selectRoomConfig = function (key, val) {
  createRoomState[key] = key === "stage" ? Number(val) : val;
  document.querySelectorAll(`[data-room-${key}]`).forEach(el => {
    el.classList.toggle("active", el.getAttribute(`data-room-${key}`) === String(val));
  });
};

window.confirmCreateOnlineRoom = async function () {
  const title = document.getElementById("createRoomTitleInput").value.trim();
  if (!title) {
    gameAlert("방 제목을 입력해주세요!");
    return;
  }

  let pool =
    createRoomState.decade === "ALL"
      ? QUESTIONS_DB
      : QUESTIONS_DB.filter(q => q.decade === createRoomState.decade);
  if (pool.length < 10) pool = QUESTIONS_DB;
  const shuffledIds = shuffleArray(pool).slice(0, 10).map(q => q.id);

  const initialPlayers = [
    {
      id: userState.id,
      nickname: userState.nickname,
      avatarConfig: userState.avatarConfig,
      score: 0
    }
  ];

  const { data, error } = await sbClient
    .from("rooms")
    .insert({
      title,
      host_id: userState.id,
      room_type: createRoomState.roomType,
      game_config: {
        decade: createRoomState.decade,
        mode: createRoomState.mode,
        stage: createRoomState.stage,
        itemMode: createRoomState.itemMode || "notem"
      },
      status: "waiting",
      players: initialPlayers,
      current_q_index: 0,
      question_ids: shuffledIds
    })
    .select()
    .single();

  if (error || !data) {
    gameAlert("방 생성 중 오류가 발생했습니다.");
    return;
  }

  closeModal("createRoomModal");
  joinOnlineRoom(data.id);
};

window.joinOnlineRoom = async function (roomId) {
  if (!userState.isLoggedIn) {
    gameConfirm("온라인 대전은 로그인 후 입장하실 수 있습니다.\n로그인 화면으로 이동할까요?", () => showLoginScreen());
    return;
  }

  const { data: room } = await sbClient.from("rooms").select("*").eq("id", roomId).maybeSingle();
  if (!room) {
    gameAlert("존재하지 않거나 이미 삭제된 방입니다.");
    refreshRoomsList();
    return;
  }

  const maxP = room.room_type === "1v1" ? 2 : 4;
  let players = Array.isArray(room.players) ? [...room.players] : [];
  if (!players.some(p => p.id === userState.id)) {
    if (players.length >= maxP) {
      gameAlert("방 인원이 가득 찼습니다!");
      return;
    }
    players.push({
      id: userState.id,
      nickname: userState.nickname,
      avatarConfig: userState.avatarConfig,
      score: 0
    });
    await sbClient.from("rooms").update({ players }).eq("id", roomId);
    room.players = players;
  }

  plazaState.currentRoom = room;
  plazaState.roomPlayersMap.clear();
  document.getElementById("roomChatLog").innerHTML = "";
  subscribeToBattleRoom(room);
};

function showBattleRoundToast(msg, isError = false) {
  const toastEl = document.getElementById("battleRoundToast");
  if (!toastEl) return;
  toastEl.textContent = msg;
  toastEl.style.background = isError
    ? "linear-gradient(90deg, #e11d48, #be123c)"
    : "linear-gradient(90deg, #0ea5e9, #6366f1)";
  toastEl.classList.remove("hidden");
  if (plazaState.battleToastTimer) clearTimeout(plazaState.battleToastTimer);
  plazaState.battleToastTimer = setTimeout(() => {
    toastEl.classList.add("hidden");
  }, 2600);
}

function triggerBattleCardTransitionEffect(toastMsg) {
  const card = document.getElementById("battleQuestionCard");
  if (card) {
    card.classList.remove("battle-card-flash");
    void card.offsetWidth;
    card.classList.add("battle-card-flash");
  }
  if (typeof playUiClickSound === "function") {
    playUiClickSound();
  }
  if (toastMsg) {
    showBattleRoundToast(toastMsg, false);
  }
}

// 방 내부 입장: 팝업이 아닌 전용 전체화면(#battleRoomScreen)으로 전환!
function subscribeToBattleRoom(room) {
  if (plazaState.roomChannel) {
    sbClient.removeChannel(plazaState.roomChannel);
  }
  if (plazaState.roomPollTimer) {
    clearInterval(plazaState.roomPollTimer);
    plazaState.roomPollTimer = null;
  }

  plazaState.lastRoomId = room.id;
  plazaState.lastRenderedQIndex = null;

  switchScreen("battleRoomScreen");
  renderBattleRoomState(room);
  startRoomStageCanvasLoop();

  plazaState.roomChannel = sbClient
    .channel(`room_${room.id}`)
    .on("broadcast", { event: "room_update" }, ({ payload }) => {
      if (payload) {
        if (payload._lastEventText) {
          plazaState.pendingRoundToast = payload._lastEventText;
        }
        plazaState.currentRoom = payload;
        renderBattleRoomState(payload);
      }
    })
    .on("broadcast", { event: "room_char_sync" }, ({ payload }) => {
      if (payload && payload.id) {
        if (isUserBlocked(payload.id, payload.nickname)) return;
        plazaState.roomPlayersMap.set(payload.id, payload);
        if (payload.newChatLine) {
          appendRoomChatLine(payload.nickname, payload.newChatLine);
        }
      }
    })
    .subscribe(status => {
      if (status === "SUBSCRIBED") {
        broadcastMyRoomCharacter("");
        plazaState.roomChannel.send({
          type: "broadcast",
          event: "room_update",
          payload: plazaState.currentRoom || room
        });
      }
    });

  // 무제한 대기 중 WebSocket이 일시 끊겨도 방이 꺼지거나 멈추지 않도록 5초 간격 DB 동기화 유지
  plazaState.roomPollTimer = setInterval(async () => {
    if (!plazaState.currentRoom || !sbClient) return;
    try {
      const { data: latest } = await sbClient
        .from("rooms")
        .select("*")
        .eq("id", plazaState.currentRoom.id)
        .maybeSingle();
      if (!latest) return;
      const cur = plazaState.currentRoom;
      const changed =
        latest.status !== cur.status ||
        latest.current_q_index !== cur.current_q_index ||
        JSON.stringify(latest.game_config) !== JSON.stringify(cur.game_config) ||
        JSON.stringify(latest.players) !== JSON.stringify(cur.players);
      if (changed) {
        plazaState.currentRoom = latest;
        renderBattleRoomState(latest);
      }
    } catch (e) {}
  }, 5000);
}

function broadcastMyRoomCharacter(newChatLine = "") {
  if (!plazaState.currentRoom) return;
  const payload = {
    id: userState.id || "me",
    nickname: userState.nickname,
    avatarConfig: userState.avatarConfig,
    x: plazaState.myRoomX,
    chatMsg: Date.now() < plazaState.myRoomChatExpire ? plazaState.myRoomChat : "",
    newChatLine
  };
  plazaState.roomPlayersMap.set(payload.id, payload);

  if (plazaState.roomChannel) {
    plazaState.roomChannel.send({
      type: "broadcast",
      event: "room_char_sync",
      payload
    });
  }
}

window.sendRoomChat = function () {
  const input = document.getElementById("roomChatInput");
  const msg = input.value.trim();
  if (!msg) return;
  input.value = "";
  plazaState.myRoomChat = msg;
  plazaState.myRoomChatExpire = Date.now() + 5000;
  appendRoomChatLine(userState.nickname, msg);
  broadcastMyRoomCharacter(msg);
};

function appendRoomChatLine(nick, msg) {
  const log = document.getElementById("roomChatLog");
  if (!log) return;
  const div = document.createElement("div");
  div.style.fontSize = "0.78rem";
  div.innerHTML = `<strong style="color:var(--primary);">${nick}:</strong> ${msg}`;
  log.appendChild(div);
  log.scrollTop = log.scrollHeight;
}

// 방 내부 전용 맵 캔버스 (방에 들어온 사람들의 480x480 캐릭터가 움직이고 말풍선 표시)
function startRoomStageCanvasLoop() {
  const canvas = document.getElementById("roomStageCanvas");
  if (!canvas) return;
  const ctx = canvas.getContext("2d");

  canvas.onclick = e => {
    const rect = canvas.getBoundingClientRect();
    const clickX = ((e.clientX - rect.left) / rect.width) * canvas.width;
    plazaState.myRoomX = Math.max(40, Math.min(canvas.width - 40, clickX));
    broadcastMyRoomCharacter("");
  };

  const offscreen = document.createElement("canvas");
  offscreen.width = 480;
  offscreen.height = 480;

  const loop = () => {
    const roomScreen = document.getElementById("battleRoomScreen");
    if (!roomScreen || roomScreen.classList.contains("hidden")) {
      return;
    }

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // 방 내부 스테이지 배경
    const grad = ctx.createLinearGradient(0, 0, 0, 95);
    grad.addColorStop(0, "#7dd3fc");
    grad.addColorStop(1, "#e0f2fe");
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, canvas.width, 95);
    ctx.fillStyle = "#4ade80";
    ctx.fillRect(0, 95, canvas.width, 10);
    ctx.fillStyle = "#16a34a";
    ctx.fillRect(0, 105, canvas.width, 30);

    const room = plazaState.currentRoom;
    const roomPlayers = room && Array.isArray(room.players) ? room.players : [];

    roomPlayers.forEach((rp, idx) => {
      const live = plazaState.roomPlayersMap.get(rp.id) || {};
      const cfg = live.avatarConfig || rp.avatarConfig || DEFAULT_AVATAR_CONFIG;
      renderPixelAvatar(offscreen, cfg, { transparentBg: true });

      const defaultX = 80 + idx * 95;
      const drawX = live.x || defaultX;
      ctx.drawImage(offscreen, drawX - 32, 38, 64, 64);

      // 닉네임 태그
      ctx.font = "bold 11px sans-serif";
      ctx.textAlign = "center";
      ctx.fillStyle = "rgba(15, 23, 42, 0.8)";
      const tagW = ctx.measureText(rp.nickname).width + 12;
      ctx.fillRect(drawX - tagW / 2, 103, tagW, 16);
      ctx.fillStyle = "#ffffff";
      ctx.fillText(rp.nickname, drawX, 115);

      // 말풍선
      if (live.chatMsg) {
        ctx.fillStyle = "#ffffff";
        const msgW = Math.min(160, ctx.measureText(live.chatMsg).width + 14);
        ctx.fillRect(drawX - msgW / 2, 16, msgW, 20);
        ctx.strokeStyle = "#4f46e5";
        ctx.lineWidth = 2;
        ctx.strokeRect(drawX - msgW / 2, 16, msgW, 20);
        ctx.fillStyle = "#0f172a";
        ctx.fillText(live.chatMsg.slice(0, 16), drawX, 30);
      }
    });

    plazaState.roomAnimFrame = requestAnimationFrame(loop);
  };

  if (plazaState.roomAnimFrame) cancelAnimationFrame(plazaState.roomAnimFrame);
  plazaState.roomAnimFrame = requestAnimationFrame(loop);
}

function renderBattleRoomState(room) {
  document.getElementById("battleRoomTitle").textContent = `[${room.room_type === "1v1" ? "1:1 선착순" : "4인 점수제"}] ${room.title}`;

  const cfg = room.game_config || { decade: "ALL", mode: "behind", stage: 1, itemMode: "notem" };
  const decLabel = cfg.decade === "ALL" ? "전연대" : String(cfg.decade).replace("s", "년대");
  const modeLabel = { behind: "📖 비하인드", lyrics: "📝 가사", onesec: "⚡ 1초듣기" }[cfg.mode] || "📖 비하인드";
  const stageLabel = `${cfg.stage || 1}단계(${cfg.stage === 2 ? "가수" : cfg.stage === 3 ? "가수+노래" : "노래"})`;
  const itemModeLabel = cfg.itemMode === "item" ? "🎒 아이템전" : "🚫 노템전";
  const isHost = room.host_id === userState.id;

  const configBar = document.getElementById("battleRoomConfigBar");
  if (configBar) {
    configBar.innerHTML = `
      <span class="badge">${decLabel}</span>
      <span class="badge primary">${modeLabel}</span>
      <span class="badge accent">${stageLabel}</span>
      <span class="badge ${cfg.itemMode === "item" ? "gold" : ""}">${itemModeLabel}</span>
    `;
  }

  const hostEditBox = document.getElementById("battleHostConfigEditor");
  if (hostEditBox) {
    hostEditBox.classList.toggle("hidden", !isHost || room.status !== "waiting");
    const decSel = document.getElementById("roomEditDecade");
    const modeSel = document.getElementById("roomEditMode");
    const stageSel = document.getElementById("roomEditStage");
    const itemSel = document.getElementById("roomEditItemMode");
    if (decSel) decSel.value = cfg.decade || "ALL";
    if (modeSel) modeSel.value = cfg.mode || "behind";
    if (stageSel) stageSel.value = String(cfg.stage || 1);
    if (itemSel) itemSel.value = cfg.itemMode || "notem";
  }

  const playersEl = document.getElementById("battlePlayersBoard");
  playersEl.innerHTML = (room.players || [])
    .map(
      p => `
      <div class="score-rule-item">
        <span>${p.id === room.host_id ? "👑" : "👤"} ${p.nickname}</span>
        <strong class="score-plus">${p.score || 0}점</strong>
      </div>
    `
    )
    .join("");

  const startBtn = document.getElementById("battleHostStartBtn");
  const waitBanner = document.getElementById("battleGuestWaitBanner");

  if (room.status === "waiting") {
    plazaState.lastRenderedQIndex = null;
    if (startBtn) startBtn.classList.toggle("hidden", !isHost);
    if (waitBanner) waitBanner.classList.toggle("hidden", isHost);
    if (typeof state !== "undefined" && state.currentScreen === "battlePlayScreen") {
      switchScreen("battleRoomScreen");
      startRoomStageCanvasLoop();
    }
  } else if (room.status === "playing" || room.status === "finished") {
    if (typeof state !== "undefined" && state.currentScreen !== "battlePlayScreen") {
      switchScreen("battlePlayScreen");
    }
    renderBattlePlayScreen(room);
  }
}

function renderBattlePlayScreen(room) {
  const cfg = room.game_config || { decade: "ALL", mode: "behind", stage: 1 };
  const mode = cfg.mode || "behind";
  const stage = Number(cfg.stage || 1);
  const curIdx = room.current_q_index || 0;

  // 라운드 전환 감지: 내가 맞췄든 상대가 맞췄든 패스했든 입력창 초기화 + 전환 효과!
  if (plazaState.lastRoomId !== room.id) {
    plazaState.lastRoomId = room.id;
    plazaState.lastRenderedQIndex = null;
  }

  const prevIdx = plazaState.lastRenderedQIndex;
  const roundChanged = prevIdx !== null && prevIdx !== curIdx;
  const shouldAutoPlayOneSec =
    room.status === "playing" && mode === "onesec" && (prevIdx === null || roundChanged);
  if (roundChanged || (prevIdx === null && room.status === "playing")) {
    const aInp = document.getElementById("battleArtistInput");
    const tInp = document.getElementById("battleTitleInput");
    if (aInp) aInp.value = "";
    if (tInp) tInp.value = "";
  }

  if (roundChanged && room.status === "playing") {
    const prevQId = (room.question_ids || [])[prevIdx];
    const prevQ = QUESTIONS_DB.find(item => item.id === prevQId);
    const defaultMsg = prevQ
      ? `✨ 다음 문제! (이전 정답: ${prevQ.artist} - ${prevQ.title})`
      : "✨ 다음 문제로 넘어갔습니다!";
    const toastMsg = plazaState.pendingRoundToast || defaultMsg;
    plazaState.pendingRoundToast = null;
    triggerBattleCardTransitionEffect(toastMsg);
  }
  plazaState.lastRenderedQIndex = room.status === "playing" ? curIdx : null;

  const hudEl = document.getElementById("battlePlayPlayersHud");
  if (hudEl) {
    hudEl.innerHTML = (room.players || [])
      .map(
        p => `
        <div class="score-rule-item">
          <span>${p.id === room.host_id ? "👑" : "👤"} ${p.nickname}</span>
          <strong class="score-plus">${p.score || 0}점</strong>
        </div>
      `
      )
      .join("");
  }

  const inputBox = document.getElementById("battlePlayInputBox");
  const finishedBox = document.getElementById("battleFinishedActions");
  const qTextEl = document.getElementById("battlePlayQuestionText");
  const oneSecBox = document.getElementById("battleOneSecBox");
  const artistGroup = document.getElementById("battleArtistInputGroup");
  const titleGroup = document.getElementById("battleTitleInputGroup");

  if (room.status === "finished") {
    if (typeof stopAudio === "function") stopAudio();
    if (inputBox) inputBox.classList.add("hidden");
    if (finishedBox) finishedBox.classList.remove("hidden");
    if (oneSecBox) oneSecBox.classList.add("hidden");
    if (qTextEl) {
      qTextEl.classList.remove("hidden");
      const rankList = [...(room.players || [])]
        .sort((a, b) => (b.score || 0) - (a.score || 0))
        .map((p, i) => `${i + 1}위. ${p.nickname} (${p.score || 0}점)`)
        .join("<br/>");
      qTextEl.innerHTML = `<div style="text-align:center; padding:8px 0;"><strong>🎹 대결 최종 순위</strong><br/><br/>${rankList}</div>`;
    }
    const sorted = [...(room.players || [])].sort((a, b) => (b.score || 0) - (a.score || 0));
    const winner = sorted[0];
    document.getElementById("battleWinnerBanner").textContent =
      `🏆 최종 우승: ${winner ? winner.nickname : "없음"} (${winner ? winner.score : 0}점)`;

    const roundRewardKey = `${room.id}_${(room.question_ids || []).join(",")}`;
    if (plazaState.lastRewardedKey !== roundRewardKey) {
      plazaState.lastRewardedKey = roundRewardKey;
      const aInp = document.getElementById("battleArtistInput");
      const tInp = document.getElementById("battleTitleInput");
      if (aInp) aInp.value = "";
      if (tInp) tInp.value = "";
      triggerBattleCardTransitionEffect(plazaState.pendingRoundToast || "🏁 대결이 종료되었습니다!");
      plazaState.pendingRoundToast = null;

      const me = (room.players || []).find(p => p.id === userState.id);
      const myScore = me ? Number(me.score) || 0 : 0;
      const isWinner = !!(winner && winner.id === userState.id && myScore > 0);
      const baseEarnedCd = isWinner ? 30 : myScore > 0 ? 10 : 0;
      const doubleMult = plazaState.battleDoubleActive ? 2 : 1;
      const earnedCd = baseEarnedCd * doubleMult;
      const expBefore = Number(userState.exp) || 0;
      const gainExp = Math.round(myScore * 0.1) * doubleMult;
      userState.exp = expBefore + gainExp;
      if (earnedCd > 0) userState.cdCoins += earnedCd;

      // 1:1 / 4인 대결 승패 기록 업데이트
      const statKey = room.room_type === "1v1" ? "1v1" : "4p";
      if (!userState.battleStats) userState.battleStats = normalizeBattleStats(DEFAULT_BATTLE_STATS);
      if (isWinner) {
        userState.battleStats[statKey].wins += 1;
      } else {
        userState.battleStats[statKey].losses += 1;
      }

      syncProfileToServer();
      if (typeof showRewardSummaryModal === "function") {
        showRewardSummaryModal({
          earnedCd,
          baseExp: gainExp,
          finalExp: gainExp,
          multiplier: 1,
          achievedTopRank: null,
          expBefore,
          expAfter: userState.exp
        });
      }
    }
    return;
  }

  if (inputBox) inputBox.classList.remove("hidden");
  if (finishedBox) finishedBox.classList.add("hidden");

  // 패스 버튼 및 카운트 배지 업데이트
  const passBtn = document.getElementById("battlePassBtn");
  const passBadge = document.getElementById("battlePassBadge");
  const players = room.players || [];
  const passCount = players.filter(p => Number(p.passQ) === curIdx).length;
  const myPassed = players.some(p => p.id === userState.id && Number(p.passQ) === curIdx);

  if (passBtn) {
    passBtn.classList.toggle("is-passed", myPassed);
    const labelNode = passBtn.childNodes[0];
    if (labelNode && labelNode.nodeType === 3) {
      labelNode.textContent = myPassed ? "✅ 패스함 " : "⏭️ 패스 ";
    }
  }
  if (passBadge) {
    passBadge.textContent = String(passCount);
    passBadge.classList.toggle("hidden", passCount <= 0);
  }

  const qId = (room.question_ids || [])[curIdx];
  const q = QUESTIONS_DB.find(item => item.id === qId) || QUESTIONS_DB[0];

  document.getElementById("battlePlayProgress").textContent = `ROUND ${curIdx + 1} / ${(room.question_ids || []).length}`;
  document.getElementById("battlePlayModeBadge").textContent =
    { behind: "📖 비하인드", lyrics: "📝 가사", onesec: "⚡ 1초듣기" }[mode] || "📖 비하인드";
  document.getElementById("battlePlayYearTag").textContent = `${q.year}년`;

  const hintTextEl = document.getElementById("battlePlayHintText");
  const battleArtistEl = document.getElementById("battleArtistInput");
  const battleTitleEl = document.getElementById("battleTitleInput");
  if (battleArtistEl) battleArtistEl.enterKeyHint = stage === 3 ? "next" : "send";
  if (battleTitleEl) battleTitleEl.enterKeyHint = "send";
  if (stage === 1) {
    hintTextEl.textContent = `🎤 가수 힌트: ${q.artist}`;
    artistGroup.classList.add("hidden");
    titleGroup.classList.remove("hidden");
    document.querySelector("#battleTitleInputGroup label").textContent = "🎵 노래 제목 입력";
    document.getElementById("battleTitleInput").placeholder = "노래 제목을 입력하세요!";
  } else if (stage === 2) {
    hintTextEl.textContent = `🎵 노래 힌트: ${q.title}`;
    artistGroup.classList.remove("hidden");
    titleGroup.classList.add("hidden");
  } else {
    hintTextEl.textContent = "🔥 가수 + 노래 모두 맞히기!";
    artistGroup.classList.remove("hidden");
    titleGroup.classList.remove("hidden");
    document.querySelector("#battleTitleInputGroup label").textContent = "🎵 노래 제목";
    document.getElementById("battleTitleInput").placeholder = "노래 제목 입력";
  }

  if (mode === "behind") {
    document.getElementById("battlePlayTypeTag").textContent = "🎹 음악왕 라이브 · 비하인드 퀴즈";
    qTextEl.className = "question-content";
    qTextEl.textContent = q.behindQuestion;
    qTextEl.classList.remove("hidden");
    oneSecBox.classList.add("hidden");
  } else if (mode === "lyrics") {
    document.getElementById("battlePlayTypeTag").textContent = "🎶 음악왕 라이브 · 하이라이트 가사";
    qTextEl.className = "question-content lyrics-style";
    qTextEl.innerHTML = `" ${q.lyricsQuestion.replace(/\//g, "<br>")} "`;
    qTextEl.classList.remove("hidden");
    oneSecBox.classList.add("hidden");
  } else {
    document.getElementById("battlePlayTypeTag").textContent = "⚡ 음악왕 라이브 · 1초 듣기";
    qTextEl.classList.add("hidden");
    oneSecBox.classList.remove("hidden");
    if (shouldAutoPlayOneSec) {
      playOnlineBattleAudio(0, true);
    }
  }
  if (typeof renderBattlePlayItemBar === "function") {
    renderBattlePlayItemBar(room);
  }
}

window.playOnlineBattleAudio = function (offsetIdx = 0, isAutoPlay = false) {
  const room = plazaState.currentRoom;
  if (!room) return;
  const qId = (room.question_ids || [])[room.current_q_index || 0];
  const q = QUESTIONS_DB.find(item => item.id === qId) || QUESTIONS_DB[0];
  if (typeof playAudioSnippet === "function") {
    playAudioSnippet(
      1.2,
      offsetIdx === 1 ? 15 : 6,
      q,
      document.getElementById("battleVinylDisc"),
      document.getElementById("battleAudioStatusText"),
      { isAutoPlay: Boolean(isAutoPlay) }
    );
  }
};

window.hostStartOnlineBattle = async function () {
  const room = plazaState.currentRoom;
  if (!room) return;
  if (typeof unlockQuizAudio === "function") unlockQuizAudio();
  const cfg = room.game_config || { decade: "ALL", mode: "behind", stage: 1 };
  let pool = cfg.decade && cfg.decade !== "ALL" ? QUESTIONS_DB.filter(q => q.decade === cfg.decade) : QUESTIONS_DB;
  if (pool.length < 10) pool = QUESTIONS_DB;
  const nextIds = shuffleArray(pool).slice(0, 10).map(q => q.id);

  room.status = "playing";
  room.current_q_index = 0;
  room.question_ids = nextIds;
  room.players = (room.players || []).map(p => ({ ...p, score: 0, passQ: -1 }));
  plazaState.lastRenderedQIndex = null;
  plazaState.usedBattleItems = new Set();
  plazaState.battleDoubleActive = false;

  await sbClient
    .from("rooms")
    .update({ status: "playing", current_q_index: 0, question_ids: nextIds, players: room.players })
    .eq("id", room.id);

  plazaState.roomChannel.send({ type: "broadcast", event: "room_update", payload: room });
  renderBattleRoomState(room);
};

window.passOnlineBattleQuestion = async function () {
  const room = plazaState.currentRoom;
  if (!room || room.status !== "playing") return;
  const curIdx = room.current_q_index || 0;

  // 이미 내가 이번 라운드에 패스 눌렀다면 중복 처리 방지
  const me = (room.players || []).find(p => p.id === userState.id);
  if (me && Number(me.passQ) === curIdx) return;

  room.players = (room.players || []).map(p =>
    p.id === userState.id ? { ...p, passQ: curIdx } : p
  );

  const passCount = room.players.filter(p => Number(p.passQ) === curIdx).length;
  const allPassed = passCount >= room.players.length;
  let eventText = "";

  if (allPassed) {
    const qId = (room.question_ids || [])[curIdx];
    const q = QUESTIONS_DB.find(item => item.id === qId);
    eventText = q
      ? `⏭️ 전원 패스! (정답: ${q.artist} - ${q.title})`
      : "⏭️ 전원 패스! 다음 문제로 이동합니다.";

    if (curIdx + 1 >= (room.question_ids || []).length) {
      room.status = "finished";
    } else {
      room.current_q_index = curIdx + 1;
    }
    plazaState.pendingRoundToast = eventText;
  }

  await sbClient
    .from("rooms")
    .update({
      players: room.players,
      current_q_index: room.current_q_index,
      status: room.status
    })
    .eq("id", room.id);

  if (plazaState.roomChannel) {
    plazaState.roomChannel.send({
      type: "broadcast",
      event: "room_update",
      payload: allPassed ? { ...room, _lastEventText: eventText } : room
    });
  }
  renderBattleRoomState(room);
};

window.handleOnlineBattleInputEnter = function (e, field) {
  if (!e || e.key !== "Enter" || e.isComposing) return;
  e.preventDefault();
  const stage = Number(plazaState.currentRoom?.game_config?.stage || 1);
  if (field === "artist" && stage === 3) {
    const titleEl = document.getElementById("battleTitleInput");
    if (titleEl && !titleEl.value.trim()) {
      titleEl.focus();
      return;
    }
  }
  submitOnlineBattleAnswer();
};

window.submitOnlineBattleAnswer = async function () {
  const room = plazaState.currentRoom;
  if (!room || room.status !== "playing") return;

  const cfg = room.game_config || { mode: "behind", stage: 1 };
  const stage = Number(cfg.stage || 1);
  const artistInput = document.getElementById("battleArtistInput");
  const titleInput = document.getElementById("battleTitleInput");
  const artistVal = artistInput ? artistInput.value.trim() : "";
  const titleVal = titleInput ? titleInput.value.trim() : "";

  if (stage === 1 && !titleVal) return;
  if (stage === 2 && !artistVal) return;
  if (stage === 3 && (!artistVal || !titleVal)) {
    showBattleRoundToast("3단계는 가수와 노래 제목을 모두 입력해주세요!", true);
    return;
  }

  const curIdx = room.current_q_index || 0;
  const qId = (room.question_ids || [])[curIdx];
  const q = QUESTIONS_DB.find(item => item.id === qId) || QUESTIONS_DB[0];

  const isCorrect =
    stage === 1
      ? isTitleMatch(titleVal, q)
      : stage === 2
      ? isArtistMatch(artistVal, q)
      : isArtistMatch(artistVal, q) && isTitleMatch(titleVal, q);

  if (isCorrect) {
    if (artistInput) artistInput.value = "";
    if (titleInput) titleInput.value = "";
    room.players = (room.players || []).map(p =>
      p.id === userState.id ? { ...p, score: (p.score || 0) + 100, passQ: -1 } : { ...p, passQ: -1 }
    );

    const eventText = `🎉 [${userState.nickname}] 정답! (${q.artist} - ${q.title})`;
    plazaState.pendingRoundToast = eventText;

    if (curIdx + 1 >= (room.question_ids || []).length) {
      room.status = "finished";
    } else {
      room.current_q_index = curIdx + 1;
    }

    await sbClient
      .from("rooms")
      .update({
        players: room.players,
        current_q_index: room.current_q_index,
        status: room.status
      })
      .eq("id", room.id);

    if (plazaState.roomChannel) {
      plazaState.roomChannel.send({
        type: "broadcast",
        event: "room_update",
        payload: { ...room, _lastEventText: eventText }
      });
    }
    renderBattleRoomState(room);
  } else {
    showBattleRoundToast("❌ 오답입니다! 다시 생각해보세요!", true);
  }
};

window.returnToWaitingRoomFromBattle = async function () {
  const room = plazaState.currentRoom;
  if (!room) {
    switchScreen("plazaScreen");
    return;
  }
  if (room.host_id === userState.id && sbClient) {
    room.status = "waiting";
    await sbClient.from("rooms").update({ status: "waiting" }).eq("id", room.id);
    if (plazaState.roomChannel) {
      plazaState.roomChannel.send({ type: "broadcast", event: "room_update", payload: room });
    }
  }
  switchScreen("battleRoomScreen");
  startRoomStageCanvasLoop();
  renderBattleRoomState(room);
};

window.confirmExitOnlineBattle = function () {
  gameConfirm(
    "진행 중인 온라인 대전에서 나가면 현재 점수가 초기화됩니다.\n정말 나가시겠습니까?",
    () => {
      leaveBattleRoom();
    },
    "⚠️ 대전 나가기 확인"
  );
};

// 혼자 있는데 방 나가면(또는 마지막 남은 사람이 나가면) 방 즉시 삭제!
window.leaveBattleRoom = async function () {
  if (plazaState.roomPollTimer) {
    clearInterval(plazaState.roomPollTimer);
    plazaState.roomPollTimer = null;
  }
  plazaState.lastRenderedQIndex = null;
  plazaState.lastRoomId = null;

  const room = plazaState.currentRoom;
  if (room && sbClient) {
    try {
      const remaining = (room.players || []).filter(p => p.id !== userState.id);
      if (remaining.length === 0) {
        // 남은 사람이 0명이면 방을 DB에서 완전 삭제!
        await sbClient.from("rooms").delete().eq("id", room.id);
      } else {
        const nextHost = room.host_id === userState.id ? remaining[0].id : room.host_id;
        const updatedRoom = { ...room, players: remaining, host_id: nextHost };
        await sbClient
          .from("rooms")
          .update({ players: remaining, host_id: nextHost })
          .eq("id", room.id);
        if (plazaState.roomChannel) {
          plazaState.roomChannel.send({
            type: "broadcast",
            event: "room_update",
            payload: updatedRoom
          });
        }
      }
    } catch (e) {}
  }

  if (plazaState.roomChannel && sbClient) {
    sbClient.removeChannel(plazaState.roomChannel);
    plazaState.roomChannel = null;
  }
  plazaState.currentRoom = null;
  switchScreen("plazaScreen");
  refreshRoomsList();
};

// ============================================================================
// [V2.0] 방장 대기방 설정 변경 & 멀티 아이템전
// ============================================================================
window.updateBattleRoomSettingsByHost = async function () {
  const room = plazaState.currentRoom;
  if (!room || room.host_id !== userState.id || room.status !== "waiting" || !sbClient) return;
  const decade = document.getElementById("roomEditDecade")?.value || "ALL";
  const mode = document.getElementById("roomEditMode")?.value || "behind";
  const stage = Number(document.getElementById("roomEditStage")?.value || 1);
  const itemMode = document.getElementById("roomEditItemMode")?.value || "notem";

  room.game_config = { decade, mode, stage, itemMode };
  const decLabel = decade === "ALL" ? "전연대" : decade.replace("s", "년대");
  const modeLabel = { behind: "비하인드", lyrics: "가사", onesec: "1초듣기" }[mode] || mode;
  const itemLabel = itemMode === "item" ? "아이템전" : "노템전";
  const sysText = `⚙️ 방장이 설정을 변경했습니다: [${decLabel} · ${modeLabel} · ${stage}단계 · ${itemLabel}]`;

  await sbClient.from("rooms").update({ game_config: room.game_config }).eq("id", room.id);
  appendRoomChatLine("시스템", sysText);
  broadcastMyRoomCharacter(sysText);
  if (plazaState.roomChannel) {
    plazaState.roomChannel.send({ type: "broadcast", event: "room_update", payload: room });
  }
  renderBattleRoomState(room);
};

window.renderBattlePlayItemBar = function (room) {
  const bar = document.getElementById("battleItemSlotsBar");
  if (!bar) return;
  const cfg = room?.game_config || {};
  if (room?.status !== "playing" || cfg.itemMode !== "item") {
    bar.classList.add("hidden");
    return;
  }
  bar.classList.remove("hidden");
  const allowedIds = ["item_3sec", "item_chosung", "item_double"];
  const equipped = (userState.equippedItems || []).filter(id => allowedIds.includes(id));
  if (equipped.length === 0) {
    bar.innerHTML = `<span style="font-size:0.75rem; color:#94a3b8;">장착한 공용 아이템이 없습니다 (가방에서 장착 가능)</span>`;
    return;
  }
  const used = plazaState.usedBattleItems || new Set();
  bar.innerHTML = equipped
    .map(id => {
      const meta = typeof getGameItemById === "function" ? getGameItemById(id) : null;
      if (!meta) return "";
      const cnt = getConsumableCount(id);
      const isUsed = used.has(id);
      const disabled = isUsed || cnt <= 0;
      return `<button type="button" class="quick-item-btn ${isUsed ? "is-used" : ""}" ${disabled ? "disabled" : ""} onclick="useBattleGameItem('${id}')">${meta.name} (${cnt})</button>`;
    })
    .join("");
};

window.useBattleGameItem = async function (itemId) {
  const room = plazaState.currentRoom;
  if (!room || room.status !== "playing") return;
  const cfg = room.game_config || {};
  if (cfg.itemMode !== "item") return;
  if (!["item_3sec", "item_chosung", "item_double"].includes(itemId)) return;

  if (!plazaState.usedBattleItems) plazaState.usedBattleItems = new Set();
  if (plazaState.usedBattleItems.has(itemId)) {
    showBattleRoundToast("이번 판에서 이미 사용한 아이템입니다!", true);
    return;
  }
  const cnt = getConsumableCount(itemId);
  if (cnt <= 0) {
    showBattleRoundToast("보유 수량이 부족합니다!", true);
    return;
  }

  userState.inventory[itemId] = cnt - 1;
  plazaState.usedBattleItems.add(itemId);
  await syncProfileToServer();

  const curIdx = room.current_q_index || 0;
  const qId = (room.question_ids || [])[curIdx];
  const q = QUESTIONS_DB.find(item => item.id === qId) || QUESTIONS_DB[0];

  if (itemId === "item_3sec") {
    if (typeof playAudioSnippet === "function") {
      playAudioSnippet(
        3.0,
        6,
        q,
        document.getElementById("battleVinylDisc"),
        document.getElementById("battleAudioStatusText"),
        { isAutoPlay: false }
      );
    }
    showBattleRoundToast("🎧 3초 듣기 아이템 발동!", false);
  } else if (itemId === "item_chosung") {
    const stage = Number(cfg.stage || 1);
    const toCho = typeof getChosungString === "function" ? getChosungString : (s => String(s || ""));
    const hintStr =
      stage === 1
        ? `노래 초성: ${toCho(q.title)}`
        : stage === 2
        ? `가수 초성: ${toCho(q.artist)}`
        : `가수: ${toCho(q.artist)} / 노래: ${toCho(q.title)}`;
    showBattleRoundToast(`🔤 ${hintStr}`, false);
  } else if (itemId === "item_double") {
    plazaState.battleDoubleActive = true;
    showBattleRoundToast("⚡ 더블어택 발동! 이번 판 점수·CD 2배!", false);
  }
  renderBattlePlayItemBar(room);
};

// ============================================================================
// [V2.0] 플랫폼별 광고 어댑터 (AdMob / ONE AdMax / 자체 광고 15초)
// ============================================================================
const AD_CONFIG = {
  ADMOB_BANNER_ID: "",
  ADMOB_REWARD_ID: "",
  ONESTORE_ADMAX_ID: ""
};

window.getCurrentPlatformEnv = function () {
  if (window.Capacitor && typeof window.Capacitor.isNativePlatform === "function" && window.Capacitor.isNativePlatform()) {
    return "capacitor";
  }
  if (window.onestoreCtx) {
    return "onestore";
  }
  return "web";
};

window.updateHomeAdBannerPlatform = function () {
  const env = getCurrentPlatformEnv();
  const coupangWrap = document.getElementById("homeCoupangFrameWrap");
  const coupangDisc = document.querySelector("#homeAdBannerSlot .coupang-disclosure");
  const admobSlot = document.getElementById("homeAdmobBannerSlot");
  if (env === "capacitor") {
    if (coupangWrap) coupangWrap.classList.add("hidden");
    if (coupangDisc) coupangDisc.classList.add("hidden");
    if (admobSlot) admobSlot.classList.remove("hidden");
  } else {
    if (coupangWrap) coupangWrap.classList.remove("hidden");
    if (coupangDisc) coupangDisc.classList.remove("hidden");
    if (admobSlot) admobSlot.classList.add("hidden");
  }
};

let selfAdTimerId = null;
window.showRewardedAd = function (reasonLabel, onRewardCallback) {
  const env = getCurrentPlatformEnv();
  // Capacitor AdMob 실키가 등록된 경우에만 네이티브 호출, 미등록 시 자체 광고 폴백
  if (env === "capacitor" && AD_CONFIG.ADMOB_REWARD_ID && window.Capacitor?.Plugins?.AdMob) {
    try {
      window.Capacitor.Plugins.AdMob.prepareRewardVideoAd({ adId: AD_CONFIG.ADMOB_REWARD_ID })
        .then(() => window.Capacitor.Plugins.AdMob.showRewardVideoAd())
        .then(() => { if (typeof onRewardCallback === "function") onRewardCallback(); })
        .catch(() => gameAlert("광고를 불러오지 못했습니다. 잠시 후 다시 시도해주세요."));
      return;
    } catch (e) {}
  }
  // ONE AdMax 실키가 등록된 경우 호출, 미등록 시 자체 광고 폴백
  if (env === "onestore" && AD_CONFIG.ONESTORE_ADMAX_ID && window.onestoreSdk?.showRewardedAd) {
    try {
      window.onestoreSdk.showRewardedAd({ placementId: AD_CONFIG.ONESTORE_ADMAX_ID })
        .then(() => { if (typeof onRewardCallback === "function") onRewardCallback(); })
        .catch(() => gameAlert("원스토어 광고를 불러오지 못했습니다."));
      return;
    } catch (e) {}
  }

  // 자체 책 광고 모달 (myad/ad1.png · 15초 카운트다운)
  const modal = document.getElementById("selfAdModal");
  const titleEl = document.getElementById("selfAdRewardLabel");
  const timerEl = document.getElementById("selfAdCountdownText");
  const barEl = document.getElementById("selfAdProgressFill");
  const claimBtn = document.getElementById("selfAdClaimBtn");
  const imgEl = document.getElementById("selfAdImage");
  if (!modal) {
    if (typeof onRewardCallback === "function") onRewardCallback();
    return;
  }

  if (imgEl) {
    imgEl.src = "myad/ad1.png?v=20.0";
  }
  if (titleEl) titleEl.textContent = reasonLabel || "15초 시청 시 보상이 지급됩니다!";
  if (selfAdTimerId) clearInterval(selfAdTimerId);

  let remain = 15;
  const updateTimerUi = () => {
    if (timerEl) {
      timerEl.textContent = remain > 0 ? `⏳ ${remain}초 후 보상 받기 가능` : "✅ 시청 완료! 아래 버튼을 눌러 보상을 받으세요!";
    }
    if (barEl) {
      barEl.style.width = `${Math.round(((15 - remain) / 15) * 100)}%`;
    }
    if (claimBtn) {
      claimBtn.disabled = remain > 0;
      claimBtn.textContent = remain > 0 ? `⏳ 대기 중 (${remain}s)` : "🎁 보상 받기!";
    }
  };

  if (claimBtn) {
    claimBtn.onclick = () => {
      if (remain > 0) return;
      if (selfAdTimerId) { clearInterval(selfAdTimerId); selfAdTimerId = null; }
      closeModal("selfAdModal");
      if (typeof onRewardCallback === "function") onRewardCallback();
    };
  }

  updateTimerUi();
  openModal("selfAdModal");

  selfAdTimerId = setInterval(() => {
    remain = Math.max(0, remain - 1);
    updateTimerUi();
    if (remain <= 0 && selfAdTimerId) {
      clearInterval(selfAdTimerId);
      selfAdTimerId = null;
    }
  }, 1000);
};

window.closeSelfAdModal = function () {
  if (selfAdTimerId) {
    clearInterval(selfAdTimerId);
    selfAdTimerId = null;
  }
  closeModal("selfAdModal");
};

// ============================================================================
// [V2.0] 가방 (인벤토리 · 착용 슬롯 6칸 · 광고 충전)
// ============================================================================
let bagSelectedItemId = "item_3sec";

window.openBagScreen = function () {
  ensureV2DailyState();
  switchScreen("bagScreen");
  renderBagScreen();
};

window.renderBagScreen = function () {
  ensureV2DailyState();
  const avCv = document.getElementById("bagAvatarCanvas");
  if (avCv && typeof renderPixelAvatar === "function") {
    renderPixelAvatar(avCv, userState.avatarConfig);
  }

  const equipped = userState.equippedItems || [];
  const slotsEl = document.getElementById("bagEquipSlotsRow");
  if (slotsEl) {
    const html = [];
    for (let i = 0; i < 6; i++) {
      const id = equipped[i];
      const meta = id && typeof getGameItemById === "function" ? getGameItemById(id) : null;
      const cnt = id ? getConsumableCount(id) : 0;
      if (meta) {
        const emoji = meta.name.split(" ")[0] || "🎒";
        html.push(`
          <button type="button" class="bag-slot-card is-filled" onclick="toggleEquipBagItem('${id}')" title="터치하여 장착 해제">
            <span class="bag-slot-emoji">${emoji}</span>
            <span class="bag-slot-count">x${cnt}</span>
          </button>
        `);
      } else {
        html.push(`<div class="bag-slot-card is-empty"><span>빈 슬롯</span></div>`);
      }
    }
    slotsEl.innerHTML = html.join("");
  }

  const listEl = document.getElementById("bagItemsGrid");
  if (listEl && typeof GAME_ITEMS_CATALOG !== "undefined") {
    listEl.innerHTML = GAME_ITEMS_CATALOG.map(item => {
      const cnt = getConsumableCount(item.id);
      const isEquipped = equipped.includes(item.id);
      const isSelected = bagSelectedItemId === item.id;
      const emoji = item.name.split(" ")[0] || "🎒";
      return `
        <div class="bag-item-tile ${isEquipped ? "is-equipped" : ""} ${isSelected ? "is-selected" : ""}" onclick="selectBagItem('${item.id}')">
          <span class="bag-item-scope">${item.scopeLabel}</span>
          <div style="font-size:1.75rem; margin:6px 0 2px;">${emoji}</div>
          <div class="bag-item-name">${item.name.replace(/^[^\s]+\s/, "")}</div>
          <div class="bag-item-cnt">${isEquipped ? "✅ 장착중 · " : ""}보유 ${cnt}개</div>
        </div>
      `;
    }).join("");
  }

  renderBagSelectedDetail();
};

window.selectBagItem = function (itemId) {
  bagSelectedItemId = itemId;
  renderBagScreen();
};

function renderBagSelectedDetail() {
  const item = typeof getGameItemById === "function" ? getGameItemById(bagSelectedItemId) : null;
  if (!item) return;
  const titleEl = document.getElementById("bagDetailTitle");
  const scopeEl = document.getElementById("bagDetailScope");
  const descEl = document.getElementById("bagDetailDesc");
  const equipBtn = document.getElementById("bagToggleEquipBtn");
  const adBtn = document.getElementById("bagAdRechargeBtn");

  const cnt = getConsumableCount(item.id);
  const isEquipped = (userState.equippedItems || []).includes(item.id);

  if (titleEl) titleEl.textContent = `${item.name} (보유 ${cnt}개)`;
  if (scopeEl) scopeEl.textContent = `사용 가능: ${item.scopeLabel}`;
  if (descEl) descEl.textContent = item.desc;

  if (equipBtn) {
    equipBtn.textContent = isEquipped ? "❎ 장착 해제" : "✅ 슬롯에 장착";
    equipBtn.className = isEquipped ? "btn" : "btn btn-primary";
    equipBtn.onclick = () => toggleEquipBagItem(item.id);
  }

  if (adBtn) {
    if (!item.adRechargeable) {
      adBtn.disabled = true;
      adBtn.textContent = "🚫 광고 충전 불가";
    } else {
      const ds = ensureV2DailyState();
      const used = Number(ds.itemAdCounts[item.id] || 0);
      const max = item.maxAdPerDay || 3;
      adBtn.disabled = used >= max;
      adBtn.textContent = used >= max ? `✅ 충전 완료 (${used}/${max})` : `📺 광고 보고 충전 (${used}/${max})`;
      adBtn.onclick = () => rechargeBagItemWithAd(item.id);
    }
  }
}

window.toggleEquipBagItem = async function (itemId) {
  if (!userState.equippedItems) userState.equippedItems = [];
  const idx = userState.equippedItems.indexOf(itemId);
  if (idx !== -1) {
    userState.equippedItems.splice(idx, 1);
  } else {
    if (userState.equippedItems.length >= 6) {
      gameAlert("착용 슬롯 6칸이 모두 찼습니다! 기존 아이템을 먼저 해제해주세요.");
      return;
    }
    userState.equippedItems.push(itemId);
  }
  await syncProfileToServer();
  renderBagScreen();
};

window.rechargeBagItemWithAd = function (itemId) {
  const item = typeof getGameItemById === "function" ? getGameItemById(itemId) : null;
  if (!item || !item.adRechargeable) return;
  const ds = ensureV2DailyState();
  const used = Number(ds.itemAdCounts[itemId] || 0);
  if (used >= (item.maxAdPerDay || 3)) {
    gameAlert("오늘 이 아이템의 광고 충전 횟수(3회)를 모두 사용했습니다.\n매일 오전 6시에 초기화됩니다.");
    return;
  }
  showRewardedAd(`[${item.name}] 1개 무료 충전`, async () => {
    const fresh = ensureV2DailyState();
    fresh.itemAdCounts[itemId] = Number(fresh.itemAdCounts[itemId] || 0) + 1;
    userState.inventory[itemId] = getConsumableCount(itemId) + 1;
    await syncProfileToServer();
    renderBagScreen();
    gameAlert(`🎉 [${item.name}] 1개가 가방에 충전되었습니다!`, "🎒 충전 완료");
  });
};

// ============================================================================
// [V2.0] 상점 무료 CD 광고 (일 3회 · 200 CD)
// ============================================================================
window.updateShopFreeCdAdButton = function () {
  const btn = document.getElementById("shopFreeCdAdBtn");
  if (!btn) return;
  const ds = ensureV2DailyState();
  const used = Number(ds.shopAdCount || 0);
  btn.disabled = used >= 3;
  btn.textContent = used >= 3 ? "✅ 무료 CD 완료 (3/3)" : `📺 무료 +200 CD (${used}/3)`;
};

window.claimShopFreeCdAd = function () {
  const ds = ensureV2DailyState();
  if (Number(ds.shopAdCount || 0) >= 3) {
    gameAlert("오늘 무료 CD 충전(3회)을 모두 완료했습니다!\n매일 오전 6시에 초기화됩니다.");
    return;
  }
  showRewardedAd("상점 무료 +200 CD 충전", async () => {
    const fresh = ensureV2DailyState();
    fresh.shopAdCount = Number(fresh.shopAdCount || 0) + 1;
    userState.cdCoins += 200;
    await syncProfileToServer();
    updateShopFreeCdAdButton();
    updateShopPreviewCanvas();
    gameAlert("💿 +200 CD가 지급되었습니다!", "📺 무료 CD 충전");
  });
};

// ============================================================================
// [V2.0] 홈 일일 CD · 오늘의 랜덤상자 · 28일 출석체크 · 이벤트 팝업
// ============================================================================
function playDingSound() {
  try {
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const now = ctx.currentTime;
    [880, 1318.5].forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(freq, now + i * 0.08);
      gain.gain.setValueAtTime(0.18, now + i * 0.08);
      gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.08 + 0.45);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now + i * 0.08);
      osc.stop(now + i * 0.08 + 0.46);
    });
  } catch (e) {}
}

window.syncHomeV2BadgesUI = function () {
  const ds = ensureV2DailyState();
  const cdDot = document.getElementById("dailyCdNotiDot");
  const boxDot = document.getElementById("dailyBoxNotiDot");
  const attDot = document.getElementById("dailyAttendanceNotiDot");
  if (cdDot) cdDot.classList.toggle("hidden", Boolean(ds.dailyCdClaimed));
  if (boxDot) boxDot.classList.toggle("hidden", Boolean(ds.randomBoxClaimed));
  if (attDot) attDot.classList.toggle("hidden", Boolean(ds.attendanceClaimedToday));
};

window.claimDailyCd = async function () {
  if (!userState.isLoggedIn) {
    gameConfirm("로그인 후 매일 +100 CD를 받을 수 있습니다.", () => showLoginScreen());
    return;
  }
  const ds = ensureV2DailyState();
  if (ds.dailyCdClaimed) {
    gameAlert("오늘의 일일 무료 +100 CD를 이미 받았습니다!\n매일 오전 6시에 초기화됩니다.", "💿 일일 CD");
    return;
  }
  ds.dailyCdClaimed = true;
  userState.cdCoins += 100;
  playDingSound();
  await syncProfileToServer();
  syncHomeV2BadgesUI();
  gameAlert("🎉 오늘의 일일 CD 보너스 💿 +100 CD가 지급되었습니다!", "💿 일일 CD 수령");
};

window.openRandomBoxModal = function () {
  if (!userState.isLoggedIn) {
    gameConfirm("로그인 후 오늘의 랜덤상자를 열 수 있습니다.", () => showLoginScreen());
    return;
  }
  const ds = ensureV2DailyState();
  const btn = document.getElementById("openRandomBoxBtn");
  const resEl = document.getElementById("randomBoxResultText");
  const boxVisual = document.getElementById("randomBoxVisual");
  if (boxVisual) boxVisual.classList.remove("is-opened");
  if (ds.randomBoxClaimed) {
    if (btn) { btn.disabled = true; btn.textContent = "✅ 오늘 수령 완료 (06시 초기화)"; }
    if (resEl) resEl.textContent = "오늘의 선물상자를 이미 열어보셨습니다!";
  } else {
    if (btn) { btn.disabled = false; btn.textContent = "🎁 상자 열어보기!"; }
    if (resEl) resEl.textContent = "노란·빨간 리본 선물상자를 터치해 오늘의 행운을 확인하세요!";
  }
  openModal("randomBoxModal");
};

window.claimDailyRandomBox = async function () {
  const ds = ensureV2DailyState();
  if (ds.randomBoxClaimed) return;
  const pool = [
    { label: "💿 +100 CD", type: "cd", amount: 100 },
    { label: "💿 +200 CD", type: "cd", amount: 200 },
    { label: "🪱 지렁이 미끼 +1개", type: "inv", id: "bait_c", amount: 1 },
    { label: "🎧 3초 듣기 +1개", type: "inv", id: "item_3sec", amount: 1 },
    { label: "🔤 초성힌트 +1개", type: "inv", id: "item_chosung", amount: 1 },
    { label: "⏳ 모래시계 +1개", type: "inv", id: "item_hourglass", amount: 1 },
    { label: "💖 하트요정 +1개", type: "inv", id: "item_heart", amount: 1 }
  ];
  const pick = pool[Math.floor(Math.random() * pool.length)];
  ds.randomBoxClaimed = true;
  if (pick.type === "cd") {
    userState.cdCoins += pick.amount;
  } else {
    userState.inventory[pick.id] = getConsumableCount(pick.id) + pick.amount;
  }
  playDingSound();
  const boxVisual = document.getElementById("randomBoxVisual");
  const btn = document.getElementById("openRandomBoxBtn");
  const resEl = document.getElementById("randomBoxResultText");
  if (boxVisual) boxVisual.classList.add("is-opened");
  if (btn) { btn.disabled = true; btn.textContent = "✅ 수령 완료!"; }
  if (resEl) resEl.innerHTML = `<strong style="color:#d97706; font-size:1.05rem;">✨ 축하합니다! [${pick.label}] 획득!</strong>`;
  await syncProfileToServer();
  syncHomeV2BadgesUI();
};

const ATTENDANCE_REWARDS_28 = (() => {
  const arr = [];
  for (let day = 1; day <= 28; day++) {
    if (day === 28) {
      arr.push({ day, label: "🧚 요정날개(S+)", type: "wing", id: "wing_fairy" });
    } else if (day === 14) {
      arr.push({ day, label: "⚡ 더블어택 +1", type: "inv", id: "item_double", amount: 1 });
    } else {
      const mod = ((day - 1) % 14) + 1;
      if (mod === 2 || mod === 9) arr.push({ day, label: "🪱 지렁이미끼+2", type: "inv", id: "bait_c", amount: 2 });
      else if (mod === 4) arr.push({ day, label: "🎧 3초듣기+2", type: "inv", id: "item_3sec", amount: 2 });
      else if (mod === 6) arr.push({ day, label: "🔤 초성힌트+2", type: "inv", id: "item_chosung", amount: 2 });
      else if (mod === 11) arr.push({ day, label: "⏳ 모래시계+2", type: "inv", id: "item_hourglass", amount: 2 });
      else if (mod === 13) arr.push({ day, label: "💖 하트요정+2", type: "inv", id: "item_heart", amount: 2 });
      else if (mod === 7 || mod === 14) arr.push({ day, label: "💿 +500 CD", type: "cd", amount: 500 });
      else arr.push({ day, label: "💿 +200 CD", type: "cd", amount: 200 });
    }
  }
  return arr;
})();

window.openAttendanceModal = function () {
  if (!userState.isLoggedIn) {
    gameConfirm("로그인 후 출석체크 보상을 받을 수 있습니다.", () => showLoginScreen());
    return;
  }
  renderAttendanceBoard();
  openModal("attendanceModal");
};

function renderAttendanceBoard() {
  const ds = ensureV2DailyState();
  const streak = Math.max(0, Math.min(28, Number(ds.attendanceStreak) || 0));
  const claimedToday = Boolean(ds.attendanceClaimedToday);
  const nextDay = claimedToday ? streak : streak + 1;

  const grid = document.getElementById("attendanceBoardGrid");
  if (grid) {
    grid.innerHTML = ATTENDANCE_REWARDS_28.map(r => {
      const isDone = r.day <= streak;
      const isTodayTarget = !claimedToday && r.day === nextDay;
      return `
        <div class="att-day-cell ${isDone ? "is-done" : ""} ${isTodayTarget ? "is-today" : ""} ${r.day === 14 || r.day === 28 ? "is-special" : ""}">
          <div class="att-day-num">Day ${r.day}</div>
          <div class="att-day-reward">${r.label}</div>
          ${isDone ? `<span class="att-done-mark">✔</span>` : ""}
        </div>
      `;
    }).join("");
  }

  const btn = document.getElementById("claimAttendanceBtn");
  if (btn) {
    btn.disabled = claimedToday;
    btn.textContent = claimedToday ? "✅ 오늘 출석 완료 (내일 06시 초기화)" : `📅 Day ${nextDay} 출석 보상 받기!`;
  }
}

window.claimAttendanceDay = async function () {
  const ds = ensureV2DailyState();
  if (ds.attendanceClaimedToday) return;
  const nextDay = Math.min(28, (Number(ds.attendanceStreak) || 0) + 1);
  const reward = ATTENDANCE_REWARDS_28[nextDay - 1];
  if (!reward) return;

  ds.attendanceStreak = nextDay;
  ds.attendanceClaimedToday = true;

  if (reward.type === "cd") {
    userState.cdCoins += reward.amount;
  } else if (reward.type === "inv") {
    userState.inventory[reward.id] = getConsumableCount(reward.id) + reward.amount;
  } else if (reward.type === "wing") {
    if (!userState.ownedItems.includes(reward.id)) userState.ownedItems.push(reward.id);
    userState.avatarConfig.wing = reward.id;
  }

  playDingSound();
  await syncProfileToServer();
  renderAttendanceBoard();
  syncHomeV2BadgesUI();
  gameAlert(`🎉 Day ${nextDay} 출석 완료!\n[${reward.label}] 보상이 지급되었습니다!`, "📅 출석체크 완료");
};

// ============================================================================
// [V2.0] 이벤트 팝업 (최대 5개 현수막 배너 크기 + 백엔드 연동)
// ============================================================================
const DEFAULT_FALLBACK_EVENTS = [
  {
    id: 1,
    title: "신고하고 보상받자!",
    content: "신고만해도 보상해드립니다!, 이용해주셔서 감사합니다 이용하시다가 음악이나 가사, 듣기가 뭐 오류가 있거나 잘못되어있는 부분을 '관리자' 아이디 친구추천 해서 DM으로 신고해주시면 내용 반영 후 건마다 1,000CD 드리겠습니다",
    banner_url: "",
    is_published: true
  }
];
let cachedPublishedEvents = [...DEFAULT_FALLBACK_EVENTS];
let selectedEventIndex = 0;

window.openEventModal = async function () {
  openModal("eventModal");
  const bannersEl = document.getElementById("eventBannersList");
  if (bannersEl) bannersEl.innerHTML = `<div style="text-align:center; padding:14px; font-size:0.82rem; color:var(--text-sub);">이벤트 불러오는 중...</div>`;

  if (sbClient) {
    try {
      const { data, error } = await sbClient
        .from("events")
        .select("*")
        .eq("is_published", true)
        .order("sort_order", { ascending: true })
        .order("id", { ascending: true })
        .limit(5);
      if (!error && Array.isArray(data) && data.length > 0) {
        cachedPublishedEvents = data;
      } else if (!error && Array.isArray(data) && data.length === 0) {
        cachedPublishedEvents = [];
      }
    } catch (e) {}
  }

  selectedEventIndex = 0;
  renderEventModalContent();
};

window.selectEventBanner = function (idx) {
  selectedEventIndex = idx;
  renderEventModalContent();
};

function renderEventModalContent() {
  const bannersEl = document.getElementById("eventBannersList");
  const titleEl = document.getElementById("eventDetailTitle");
  const bodyEl = document.getElementById("eventDetailBody");
  if (!bannersEl || !titleEl || !bodyEl) return;

  if (!cachedPublishedEvents || cachedPublishedEvents.length === 0) {
    bannersEl.innerHTML = `<div style="text-align:center; padding:18px; color:var(--text-sub); font-size:0.84rem;">현재 진행 중인 이벤트가 없습니다.</div>`;
    titleEl.textContent = "진행 중인 이벤트 없음";
    bodyEl.textContent = "새로운 이벤트가 등록되면 이곳에서 확인하실 수 있습니다.";
    return;
  }

  bannersEl.innerHTML = cachedPublishedEvents
    .slice(0, 5)
    .map((ev, idx) => {
      const active = idx === selectedEventIndex;
      const bgStyle = ev.banner_url
        ? `background-image:linear-gradient(90deg, rgba(15,23,42,0.72), rgba(15,23,42,0.35)), url('${ev.banner_url}'); background-size:cover; background-position:center; color:#ffffff;`
        : "";
      return `
        <button type="button" class="event-banner-pill ${active ? "active" : ""}" style="${bgStyle}" onclick="selectEventBanner(${idx})">
          <span class="event-banner-badge">EVENT ${idx + 1}</span>
          <span class="event-banner-title">${ev.title}</span>
        </button>
      `;
    })
    .join("");

  const cur = cachedPublishedEvents[selectedEventIndex] || cachedPublishedEvents[0];
  titleEl.textContent = cur.title || "이벤트";
  bodyEl.innerHTML = String(cur.content || "").replace(/\n/g, "<br/>");
}

