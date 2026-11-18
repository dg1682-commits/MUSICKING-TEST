// ============================================================================
// [음악왕 v10.23] 방치형 소셜 낚시터 전용 모듈 (fishing.js)
// - 단일 통합 글로벌 서버 (fishing_room_1) — 모든 접속자가 한 서버에 함께 접속
// - 실시간 Presence + Broadcast + 4초 DB 로스터(_fishingLive) 하이브리드 동기화로
//   폰 홈버튼(백그라운드) 전환 시에도 방 유지 & 복귀 즉시 실시간 위치·채팅 재동기화
// - 스와이프 강제종료 / 앱 닫기(beforeunload/pagehide) 시 keepalive 자동 퇴장 처리
// ============================================================================

const FISHING_CHANNELS = [
  { id: "fishing_room_1", name: "통합 서버 · 잔잔한 호수" }
];
let currentFishingChannelId = FISHING_CHANNELS[0].id;

const FISHING_MAX_SECONDS_PER_DAY = 6 * 60 * 60; // 21,600초 (360분)
const FISHING_BASE_MAX_EXP = 1000;
const FISHING_BASE_MAX_CD = 3000;
const FISHING_EXP_PER_MINUTE = FISHING_BASE_MAX_EXP / 360;
const FISHING_CD_PER_MINUTE = FISHING_BASE_MAX_CD / 360;
const FISHING_KST_OFFSET_MS = 9 * 60 * 60 * 1000;
const FISHING_LOADING_DURATION_MS = 2000;
const FISHING_SYNC_INTERVAL_MS = 60000;
const FISHING_ROSTER_POLL_MS = 4000;
const FISHING_HEARTBEAT_MS = 18000;
const FISHING_FG_STALE_MS = 45000;
const FISHING_BG_IDLE_MAX_MS = 6 * 60 * 60 * 1000;
const FISHING_SESSION_KEY = "mk_fishing_session";

const fishingState = {
  isInside: false,
  isTransitioning: false,
  hasRunForcedExit: false,
  sessionTag: `${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`,
  channel: null,
  timerInterval: null,
  rosterPollTimer: null,
  heartbeatTimer: null,
  reconnectTimer: null,
  dbMoveSaveTimer: null,
  bgAnimFrame: null,
  lastTickAt: 0,
  lastServerSyncAt: 0,
  msCarry: 0,
  daily: {
    date: "",
    seconds: 0,
    earnedExp: 0,
    earnedCd: 0
  },
  myPos: { x: 50, y: 68 },
  myPosTs: 0,
  playersMap: new Map(),
  knownPeerIds: new Set(),
  recentLeftAt: new Map(),
  hasInitialPresenceSync: false,
  hasInitialDbSync: false,
  chatMessages: [],
  activeBubbles: new Map(),
  playerNodeMap: new Map(),
  playerAvatarKeys: new Map(),
  topBubbleZ: 100
};

function getPublicFishingAvatarConfig(rawCfg = null) {
  const src = rawCfg || (typeof userState !== "undefined" ? userState.avatarConfig : DEFAULT_AVATAR_CONFIG);
  if (typeof sanitizeAvatarConfigShape === "function") {
    const clean = sanitizeAvatarConfigShape(src);
    return {
      gender: clean.gender,
      bg: clean.bg,
      hair: clean.hair,
      hat: clean.hat,
      face: clean.face,
      outfit: clean.outfit,
      acc: clean.acc,
      fishingRod: clean.fishingRod || "none",
      fishingBait: clean.fishingBait || "none"
    };
  }
  return { ...DEFAULT_AVATAR_CONFIG };
}

function persistFishingSessionMarker() {
  if (typeof userState === "undefined" || !userState.id) return;
  try {
    sessionStorage.setItem(
      FISHING_SESSION_KEY,
      JSON.stringify({
        uid: userState.id,
        channelId: currentFishingChannelId,
        pos: fishingState.myPos,
        savedAt: Date.now()
      })
    );
  } catch (e) {}
}

function clearFishingSessionMarker() {
  try {
    sessionStorage.removeItem(FISHING_SESSION_KEY);
  } catch (e) {}
}

// ============================================================================
// 1. KST 오전 06:00 일일 초기화 계산 & 버프 확장(낚싯대/미끼) 모듈
// ============================================================================
function getFishingCycleKey(timestampMs = Date.now()) {
  const kst = new Date(timestampMs + FISHING_KST_OFFSET_MS);
  if (kst.getUTCHours() < 6) {
    kst.setUTCDate(kst.getUTCDate() - 1);
  }
  const y = kst.getUTCFullYear();
  const m = String(kst.getUTCMonth() + 1).padStart(2, "0");
  const d = String(kst.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function getNextFishingResetTimestampMs(timestampMs = Date.now()) {
  const kstMs = timestampMs + FISHING_KST_OFFSET_MS;
  const kst = new Date(kstMs);
  let nextResetKst = Date.UTC(kst.getUTCFullYear(), kst.getUTCMonth(), kst.getUTCDate(), 6, 0, 0, 0);
  if (kstMs >= nextResetKst) {
    nextResetKst += 24 * 60 * 60 * 1000;
  }
  return nextResetKst - FISHING_KST_OFFSET_MS;
}

function isFishing2xBuffActive(nowTs = Date.now()) {
  if (typeof userState === "undefined" || !userState.dailyState) return false;
  const ds = userState.dailyState;
  const curCycle = getFishingCycleKey(nowTs);
  return ds.fishing2xKstDate === curCycle && Number(ds.fishing2xExpiresAt || 0) > nowTs;
}

function getFishingBuffMultipliers() {
  // [V2.0] 낚싯대(영구 EXP 버프) + 소모품 미끼(보유 > 0일 때만 CD 버프) + 광고 2배 버프
  let expMultiplier = 1.0;
  let cdMultiplier = 1.0;
  const is2xActive = isFishing2xBuffActive();

  if (typeof AVATAR_SHOP_ITEMS !== "undefined" && typeof userState !== "undefined" && userState.avatarConfig) {
    const rodItem = (AVATAR_SHOP_ITEMS.fishing_rod || []).find(r => r.id === userState.avatarConfig.fishingRod);
    const baitId = userState.avatarConfig.fishingBait;
    const baitItem = (AVATAR_SHOP_ITEMS.fishing_bait || []).find(b => b.id === baitId);
    const baitCount = typeof getConsumableCount === "function" ? getConsumableCount(baitId) : 0;
    if (rodItem && Number(rodItem.expMultiplier) > 0) expMultiplier *= Number(rodItem.expMultiplier);
    if (baitItem && baitCount > 0 && Number(baitItem.cdMultiplier) > 0) cdMultiplier *= Number(baitItem.cdMultiplier);
  }
  if (is2xActive) {
    cdMultiplier *= 2;
  }

  return {
    expMultiplier,
    cdMultiplier,
    is2xActive,
    expPerMin: FISHING_EXP_PER_MINUTE * expMultiplier,
    cdPerMin: FISHING_CD_PER_MINUTE * cdMultiplier,
    maxExp: Math.round(FISHING_BASE_MAX_EXP * expMultiplier),
    maxCd: Math.round(FISHING_BASE_MAX_CD * cdMultiplier)
  };
}

function computeCumulativeFishingRewards(secondsInCycle, multipliers = getFishingBuffMultipliers()) {
  const clampedSec = Math.max(0, Math.min(FISHING_MAX_SECONDS_PER_DAY, Math.floor(Number(secondsInCycle) || 0)));
  const ratio = clampedSec / FISHING_MAX_SECONDS_PER_DAY;
  return {
    clampedSec,
    totalExp: Math.floor(ratio * multipliers.maxExp),
    totalCd: Math.floor(ratio * multipliers.maxCd),
    maxExp: multipliers.maxExp,
    maxCd: multipliers.maxCd
  };
}

function loadFishingDailyFromUserState(nowTs = Date.now()) {
  const curKey = getFishingCycleKey(nowTs);
  const saved = (typeof userState !== "undefined" && userState.fishingDaily) || null;
  if (saved && saved.date === curKey) {
    fishingState.daily = {
      date: curKey,
      seconds: Math.max(0, Math.min(FISHING_MAX_SECONDS_PER_DAY, Math.floor(Number(saved.seconds) || 0))),
      earnedExp: Math.max(0, Math.floor(Number(saved.earnedExp) || 0)),
      earnedCd: Math.max(0, Math.floor(Number(saved.earnedCd) || 0))
    };
  } else {
    fishingState.daily = { date: curKey, seconds: 0, earnedExp: 0, earnedCd: 0 };
  }
  syncUserStateFishingDaily();
}

function syncUserStateFishingDaily() {
  if (typeof userState !== "undefined") {
    userState.fishingDaily = { ...fishingState.daily };
  }
}

function formatFishingHms(totalSec) {
  const sec = Math.max(0, Math.floor(Number(totalSec) || 0));
  const h = String(Math.floor(sec / 3600)).padStart(2, "0");
  const m = String(Math.floor((sec % 3600) / 60)).padStart(2, "0");
  const s = String(sec % 60).padStart(2, "0");
  return `${h}:${m}:${s}`;
}

function renderFishingHud() {
  const mults = getFishingBuffMultipliers();
  const sec = Math.max(0, Math.min(FISHING_MAX_SECONDS_PER_DAY, fishingState.daily.seconds || 0));
  const earnedExp = fishingState.daily.earnedExp || 0;
  const earnedCd = fishingState.daily.earnedCd || 0;
  const isCapped = sec >= FISHING_MAX_SECONDS_PER_DAY;

  const timerEl = document.getElementById("fishingElapsedTimer");
  if (timerEl) {
    timerEl.textContent = isCapped
      ? `⏱️ ${formatFishingHms(sec)} / 06:00:00 (MAX)`
      : `⏱️ ${formatFishingHms(sec)} / 06:00:00`;
  }

  const expValEl = document.getElementById("fishingExpStatText");
  const expFillEl = document.getElementById("fishingExpBarFill");
  const cdValEl = document.getElementById("fishingCdStatText");
  const cdFillEl = document.getElementById("fishingCdBarFill");

  if (expValEl) expValEl.textContent = `경험치 +${earnedExp.toLocaleString()} (${earnedExp.toLocaleString()}/${mults.maxExp.toLocaleString()})`;
  if (expFillEl) {
    const pct = Math.min(100, Math.max(0, (earnedExp / Math.max(1, mults.maxExp)) * 100));
    expFillEl.style.width = `${pct.toFixed(1)}%`;
  }

  if (cdValEl) cdValEl.textContent = `CD +${earnedCd.toLocaleString()} (${earnedCd.toLocaleString()}/${mults.maxCd.toLocaleString()})`;
  if (cdFillEl) {
    const pct = Math.min(100, Math.max(0, (earnedCd / Math.max(1, mults.maxCd)) * 100));
    cdFillEl.style.width = `${pct.toFixed(1)}%`;
  }

  const buffEl = document.getElementById("fishingBuffBadge");
  if (buffEl) {
    const parts = [];
    if (mults.expMultiplier > 1) parts.push(`🎣EXP+${Math.round((mults.expMultiplier - 1) * 100)}%`);
    if (mults.cdMultiplier > 1) parts.push(`🪱CD+${Math.round((mults.cdMultiplier - 1) * 100)}%`);
    if (mults.is2xActive) parts.push("⚡광고2배");
    buffEl.textContent = parts.join(" · ");
    buffEl.classList.toggle("hidden", parts.length === 0);
  }

  const ad2xBtn = document.getElementById("fishing2xBuffBtn");
  if (ad2xBtn) {
    if (mults.is2xActive && typeof userState !== "undefined" && userState.dailyState) {
      const remSec = Math.max(0, Math.ceil((Number(userState.dailyState.fishing2xExpiresAt) - Date.now()) / 1000));
      const mm = String(Math.floor(remSec / 60)).padStart(2, "0");
      const ss = String(remSec % 60).padStart(2, "0");
      ad2xBtn.disabled = true;
      ad2xBtn.textContent = `⚡ 2배 버프중 (${mm}:${ss})`;
    } else {
      ad2xBtn.disabled = false;
      ad2xBtn.textContent = "📺 30분 CD 2배";
    }
  }

  const myCdEl = document.getElementById("fishingMyCdText");
  const myExpEl = document.getElementById("fishingMyExpText");
  const curCd = typeof userState !== "undefined" ? Math.max(0, Math.floor(Number(userState.cdCoins) || 0)) : 0;
  const curExp = typeof userState !== "undefined" ? Math.max(0, Math.floor(Number(userState.exp) || 0)) : 0;
  if (myCdEl) myCdEl.textContent = `💿 보유 ${curCd.toLocaleString()} CD`;
  if (myExpEl) {
    if (typeof getLevelInfo === "function") {
      const lv = getLevelInfo(curExp);
      myExpEl.textContent = `✨ Lv.${lv.level} · ${curExp.toLocaleString()} EXP`;
    } else {
      myExpEl.textContent = `✨ ${curExp.toLocaleString()} EXP`;
    }
  }
}

// 낚시터 안에 머문 상태에서만 시간 흐름 (화면 내려놓기·오전 06:00 돌파 모두 정확히 분할 계산!)
window.advanceFishingClockTo = function (nowTs = Date.now()) {
  if (!fishingState.isInside) return;
  if (typeof state !== "undefined" && state.currentScreen !== "fishingScreen") return;

  let cursor = fishingState.lastTickAt || nowTs;
  if (nowTs < cursor) {
    fishingState.lastTickAt = nowTs;
    return;
  }

  const mults = getFishingBuffMultipliers();
  let changedRewards = false;
  let crossedReset = false;

  while (cursor < nowTs) {
    const nextReset = getNextFishingResetTimestampMs(cursor);
    const segmentEnd = Math.min(nowTs, nextReset);
    const segKey = getFishingCycleKey(cursor);

    if (fishingState.daily.date !== segKey) {
      fishingState.daily = { date: segKey, seconds: 0, earnedExp: 0, earnedCd: 0 };
      fishingState.msCarry = 0;
      crossedReset = true;
    }

    fishingState.msCarry += segmentEnd - cursor;
    const deltaSec = Math.floor(fishingState.msCarry / 1000);
    if (deltaSec > 0) {
      fishingState.msCarry -= deltaSec * 1000;
      const nextSec = Math.min(FISHING_MAX_SECONDS_PER_DAY, fishingState.daily.seconds + deltaSec);
      fishingState.daily.seconds = nextSec;

      const calc = computeCumulativeFishingRewards(nextSec, mults);
      const gainExp = Math.max(0, calc.totalExp - fishingState.daily.earnedExp);
      const gainCd = Math.max(0, calc.totalCd - fishingState.daily.earnedCd);

      if (gainExp > 0 || gainCd > 0) {
        fishingState.daily.earnedExp += gainExp;
        fishingState.daily.earnedCd += gainCd;
        if (typeof userState !== "undefined") {
          userState.exp = (Number(userState.exp) || 0) + gainExp;
          userState.cdCoins = (Number(userState.cdCoins) || 0) + gainCd;
        }
        changedRewards = true;
      }

      // [V2.0] 소모품 미끼 30분(1800초)당 1개 자동 소모
      if (typeof userState !== "undefined" && userState.avatarConfig) {
        const curBaitId = userState.avatarConfig.fishingBait;
        const curBaitCnt = typeof getConsumableCount === "function" ? getConsumableCount(curBaitId) : 0;
        if (curBaitId && curBaitId !== "none" && curBaitCnt > 0) {
          fishingState.baitSecCarry = (fishingState.baitSecCarry || 0) + deltaSec;
          while (fishingState.baitSecCarry >= 1800 && getConsumableCount(curBaitId) > 0) {
            fishingState.baitSecCarry -= 1800;
            const nextCnt = Math.max(0, getConsumableCount(curBaitId) - 1);
            userState.inventory[curBaitId] = nextCnt;
            changedRewards = true;
            if (nextCnt <= 0) {
              userState.avatarConfig.fishingBait = "none";
              if (typeof appendFishingChatLine === "function") {
                appendFishingChatLine("시스템", "🪱 장착한 미끼가 모두 소모되어 기본 낚시로 전환되었습니다.");
              }
              break;
            }
          }
        } else {
          fishingState.baitSecCarry = 0;
        }
      }
    }

    cursor = segmentEnd;
    if (cursor >= nextReset) {
      // 오전 06:00 정각 돌파 시 미사용 잔여 시간 즉시 폐기하고 00:00:00으로 새 주기 시작!
      const newKey = getFishingCycleKey(nextReset);
      fishingState.daily = { date: newKey, seconds: 0, earnedExp: 0, earnedCd: 0 };
      fishingState.msCarry = 0;
      crossedReset = true;
    }
  }

  fishingState.lastTickAt = nowTs;
  syncUserStateFishingDaily();
  renderFishingHud();

  if (changedRewards && typeof updateHeaderUserUI === "function") {
    const cdEl = document.getElementById("headerCdCount");
    if (cdEl && typeof userState !== "undefined") cdEl.textContent = `${userState.cdCoins}`;
  }

  if (crossedReset) {
    appendFishingSystemMessage("🌅 오전 06:00 일일 초기화! 새로운 6시간 낚시가 시작되었습니다.");
  }

  if (changedRewards && nowTs - fishingState.lastServerSyncAt >= FISHING_SYNC_INTERVAL_MS) {
    fishingState.lastServerSyncAt = nowTs;
    if (typeof syncProfileToServer === "function") syncProfileToServer();
  }
};

function startFishingRewardTimer() {
  stopFishingRewardTimer();
  fishingState.lastTickAt = Date.now();
  fishingState.lastServerSyncAt = Date.now();
  fishingState.msCarry = 0;

  fishingState.timerInterval = setInterval(() => {
    if (!fishingState.isInside || (typeof state !== "undefined" && state.currentScreen !== "fishingScreen")) {
      stopFishingRewardTimer();
      return;
    }
    window.advanceFishingClockTo(Date.now());
  }, 1000);
}

function stopFishingRewardTimer() {
  if (fishingState.timerInterval) {
    clearInterval(fishingState.timerInterval);
    fishingState.timerInterval = null;
  }
}

// ============================================================================
// 2. 상단 낚시터 배경 캔버스 (뚜렷한 게임 외곽선 · 입체 수변 데크 · 물결/찌 디테일)
// ============================================================================
function startFishingBgLoop() {
  stopFishingBgLoop();
  const canvas = document.getElementById("fishingBgCanvas");
  if (!canvas) return;
  const ctx = canvas.getContext("2d");
  let lastDraw = 0;

  const drawCloud = (cx, cy, sc) => {
    ctx.save();
    ctx.translate(cx, cy);
    ctx.scale(sc, sc);
    ctx.fillStyle = "#ffffff";
    ctx.strokeStyle = "#1e1b18";
    ctx.lineWidth = 2.6 / sc;
    ctx.beginPath();
    ctx.moveTo(-34, 10);
    ctx.bezierCurveTo(-44, 10, -44, -8, -26, -8);
    ctx.bezierCurveTo(-24, -24, 4, -26, 12, -11);
    ctx.bezierCurveTo(28, -14, 38, -2, 34, 10);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.restore();
  };

  const drawTree = (tx, ty, radius, trunkH) => {
    ctx.lineWidth = 2.4;
    ctx.strokeStyle = "#1e1b18";
    ctx.fillStyle = "#78350f";
    ctx.fillRect(tx - radius * 0.22, ty - trunkH, radius * 0.44, trunkH);
    ctx.strokeRect(tx - radius * 0.22, ty - trunkH, radius * 0.44, trunkH);

    ctx.fillStyle = "#16a34a";
    ctx.beginPath();
    ctx.arc(tx, ty - trunkH - radius * 0.55, radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = "#4ade80";
    ctx.beginPath();
    ctx.arc(tx - radius * 0.25, ty - trunkH - radius * 0.72, radius * 0.42, 0, Math.PI * 2);
    ctx.fill();
  };

  const drawFrame = ts => {
    if (!fishingState.isInside || (typeof state !== "undefined" && state.currentScreen !== "fishingScreen")) {
      return;
    }
    fishingState.bgAnimFrame = requestAnimationFrame(drawFrame);
    if (document.hidden) return;
    if (ts - lastDraw < 65) return; // 약 15fps 최적화
    lastDraw = ts;

    const area = canvas.parentElement;
    if (area && area.clientWidth > 20 && area.clientHeight > 20) {
      const tw = Math.round(area.clientWidth * 2);
      const th = Math.round(area.clientHeight * 2);
      if (Math.abs(canvas.width - tw) > 6 || Math.abs(canvas.height - th) > 6) {
        canvas.width = tw;
        canvas.height = th;
      }
    }

    const W = canvas.width;
    const H = canvas.height;
    const t = ts * 0.0014;
    const waterTop = H * 0.28;
    const shoreY = H * 0.52;
    const outlineW = Math.max(3, Math.round(W * 0.0042));

    // 1) 맑은 하늘 그라데이션 & 윤곽선 구름
    const skyGrad = ctx.createLinearGradient(0, 0, 0, waterTop + 12);
    skyGrad.addColorStop(0, "#38bdf8");
    skyGrad.addColorStop(1, "#e0f2fe");
    ctx.fillStyle = skyGrad;
    ctx.fillRect(0, 0, W, waterTop + 12);

    drawCloud(W * 0.24 + Math.sin(t * 0.28) * (W * 0.014), H * 0.14, W / 720);
    drawCloud(W * 0.76 + Math.cos(t * 0.24) * (W * 0.014), H * 0.11, W / 800);

    // 먼 초록 능선 + 검은 외곽선
    ctx.fillStyle = "#34d399";
    ctx.strokeStyle = "#1e1b18";
    ctx.lineWidth = outlineW;
    ctx.beginPath();
    ctx.moveTo(0, waterTop);
    ctx.quadraticCurveTo(W * 0.24, waterTop - H * 0.08, W * 0.50, waterTop - H * 0.01);
    ctx.quadraticCurveTo(W * 0.78, waterTop - H * 0.10, W, waterTop - H * 0.02);
    ctx.lineTo(W, waterTop + 4);
    ctx.lineTo(0, waterTop + 4);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // 언덕 위 작은 나무 포인트
    drawTree(W * 0.09, waterTop + 1, W * 0.024, H * 0.032);
    drawTree(W * 0.91, waterTop, W * 0.026, H * 0.036);

    // 2) 반짝이는 호수 수면 & 수평선 외곽선
    const waterGrad = ctx.createLinearGradient(0, waterTop, 0, shoreY);
    waterGrad.addColorStop(0, "#0284c7");
    waterGrad.addColorStop(0.55, "#0ea5e9");
    waterGrad.addColorStop(1, "#38bdf8");
    ctx.fillStyle = waterGrad;
    ctx.fillRect(0, waterTop, W, shoreY - waterTop);

    // 호수 위쪽 경계 라인
    ctx.strokeStyle = "#1e1b18";
    ctx.lineWidth = outlineW;
    ctx.beginPath();
    ctx.moveTo(0, waterTop);
    ctx.lineTo(W, waterTop);
    ctx.stroke();

    // 물결 윤슬
    ctx.strokeStyle = "rgba(255, 255, 255, 0.55)";
    ctx.lineWidth = Math.max(2, W * 0.0032);
    ctx.lineCap = "round";
    for (let row = 0; row < 4; row++) {
      const ry = waterTop + (shoreY - waterTop) * (0.20 + row * 0.21);
      for (let col = 0; col < 4; col++) {
        const rx = ((W * (0.14 + col * 0.25 + (row % 2) * 0.08)) + Math.sin(t + row + col) * 12) % W;
        ctx.beginPath();
        ctx.moveTo(rx - W * 0.036, ry);
        ctx.lineTo(rx + W * 0.036, ry);
        ctx.stroke();
      }
    }

    // 호수 위 수련 잎 + 동동 뜨는 빨간 낚시 찌 2개
    [0.21, 0.79].forEach((px, idx) => {
      const padX = W * px;
      const padY = waterTop + (shoreY - waterTop) * (0.42 + idx * 0.16);
      ctx.fillStyle = "#22c55e";
      ctx.strokeStyle = "#1e1b18";
      ctx.lineWidth = Math.max(2, outlineW * 0.75);
      ctx.beginPath();
      ctx.ellipse(padX, padY, W * 0.028, H * 0.016, 0, 0.2, Math.PI * 1.9);
      ctx.lineTo(padX, padY);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
    });

    const bobX = W * 0.48;
    const bobY = waterTop + (shoreY - waterTop) * 0.44 + Math.sin(t * 2.8) * 3.5;
    ctx.strokeStyle = "rgba(255,255,255,0.65)";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.ellipse(bobX, bobY + 4, W * 0.025 + Math.sin(t * 2.8) * 4, H * 0.011, 0, 0, Math.PI * 2);
    ctx.stroke();
    ctx.fillStyle = "#ef4444";
    ctx.strokeStyle = "#1e1b18";
    ctx.lineWidth = 2.4;
    ctx.beginPath();
    ctx.arc(bobX, bobY - 3, W * 0.011, Math.PI, 0);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = "#ffffff";
    ctx.beginPath();
    ctx.arc(bobX, bobY - 3, W * 0.011, 0, Math.PI);
    ctx.fill();
    ctx.stroke();

    // 3) 물가 경계 흙/잔디 언덕라인 + 포말
    ctx.fillStyle = "rgba(224, 242, 254, 0.9)";
    for (let x = 0; x <= W + 24; x += W * 0.065) {
      const waveY = shoreY + Math.sin(t * 2 + x * 0.02) * 2.2;
      ctx.beginPath();
      ctx.arc(x, waveY, W * 0.033, Math.PI, 0);
      ctx.fill();
    }

    const groundGrad = ctx.createLinearGradient(0, shoreY, 0, H);
    groundGrad.addColorStop(0, "#86efac");
    groundGrad.addColorStop(0.24, "#4ade80");
    groundGrad.addColorStop(1, "#22c55e");
    ctx.fillStyle = groundGrad;
    ctx.fillRect(0, shoreY, W, H - shoreY);

    // 물과 잔디 사이 뚜렷한 진갈색/검정 해안선
    ctx.fillStyle = "#d97706";
    ctx.fillRect(0, shoreY - 4, W, H * 0.024);
    ctx.strokeStyle = "#1e1b18";
    ctx.lineWidth = outlineW;
    ctx.beginPath();
    ctx.moveTo(0, shoreY - 4);
    ctx.lineTo(W, shoreY - 4);
    ctx.moveTo(0, shoreY - 4 + H * 0.024);
    ctx.lineTo(W, shoreY - 4 + H * 0.024);
    ctx.stroke();

    // 4) 입체 수변 나무 데크(부두) + 나무 말뚝 기둥
    const deckX = W * 0.14;
    const deckW = W * 0.72;
    const deckY = shoreY - H * 0.055;
    const deckH = H * 0.24;

    // 데크 앞쪽 수면 그림자
    ctx.fillStyle = "rgba(15, 23, 42, 0.22)";
    ctx.fillRect(deckX + 6, deckY + deckH, deckW - 12, H * 0.026);

    // 데크 상판
    ctx.fillStyle = "#c26d1f";
    ctx.strokeStyle = "#1e1b18";
    ctx.lineWidth = outlineW;
    ctx.beginPath();
    if (typeof ctx.roundRect === "function") ctx.roundRect(deckX, deckY, deckW, deckH, 10);
    else ctx.rect(deckX, deckY, deckW, deckH);
    ctx.fill();
    ctx.stroke();

    // 데크 상단 밝은 하이라이트 보드 + 아래쪽 두께감
    ctx.fillStyle = "#ea8c2f";
    ctx.fillRect(deckX + outlineW, deckY + outlineW, deckW - outlineW * 2, H * 0.025);
    ctx.fillStyle = "#92400e";
    ctx.fillRect(deckX + outlineW, deckY + deckH - H * 0.036, deckW - outlineW * 2, H * 0.036 - outlineW);
    ctx.strokeStyle = "#1e1b18";
    ctx.lineWidth = Math.max(2, outlineW * 0.7);
    ctx.beginPath();
    ctx.moveTo(deckX, deckY + deckH - H * 0.036);
    ctx.lineTo(deckX + deckW, deckY + deckH - H * 0.036);
    ctx.stroke();

    // 나무 널빤지 이음새 & 못 디테일
    ctx.strokeStyle = "#451a03";
    ctx.lineWidth = Math.max(2, outlineW * 0.6);
    for (let px = deckX + W * 0.065; px < deckX + deckW - 12; px += W * 0.065) {
      ctx.beginPath();
      ctx.moveTo(px, deckY + outlineW);
      ctx.lineTo(px, deckY + deckH - H * 0.036);
      ctx.stroke();
    }

    // 좌/우/중앙 나무 말뚝 기둥(윤곽선 포함)
    [deckX + 8, deckX + deckW * 0.5 - 7, deckX + deckW - 22].forEach(postX => {
      const postW = Math.max(12, W * 0.022);
      const postH = H * 0.085;
      const postY = deckY - postH * 0.45;
      ctx.fillStyle = "#92400e";
      ctx.strokeStyle = "#1e1b18";
      ctx.lineWidth = Math.max(2.5, outlineW * 0.85);
      ctx.fillRect(postX, postY, postW, postH);
      ctx.strokeRect(postX, postY, postW, postH);
      ctx.fillStyle = "#facc15";
      ctx.fillRect(postX + 2, postY + 2, postW - 4, 5);
    });

    // 앞마당 돌 & 풀잎 포인트 (선명한 외곽선)
    ctx.lineWidth = Math.max(2, outlineW * 0.7);
    ctx.strokeStyle = "#1e1b18";
    [[0.07, 0.78], [0.92, 0.73]].forEach(([rx, ry]) => {
      ctx.fillStyle = "#94a3b8";
      ctx.beginPath();
      ctx.ellipse(W * rx, H * ry, W * 0.022, H * 0.015, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
    });
    [[0.22, 0.88], [0.76, 0.86], [0.11, 0.64], [0.89, 0.62]].forEach(([gx, gy]) => {
      ctx.strokeStyle = "#14532d";
      ctx.lineWidth = 2.6;
      ctx.beginPath();
      ctx.moveTo(W * gx, H * gy);
      ctx.lineTo(W * gx - 6, H * gy - 11);
      ctx.moveTo(W * gx, H * gy);
      ctx.lineTo(W * gx, H * gy - 14);
      ctx.moveTo(W * gx, H * gy);
      ctx.lineTo(W * gx + 6, H * gy - 10);
      ctx.stroke();
    });
  };

  fishingState.bgAnimFrame = requestAnimationFrame(drawFrame);
}

function stopFishingBgLoop() {
  if (fishingState.bgAnimFrame) {
    cancelAnimationFrame(fishingState.bgAnimFrame);
    fishingState.bgAnimFrame = null;
  }
}

// ============================================================================
// 3. 캐릭터 스탠딩 DOM 렌더링 · 바닥 터치 스무스 이동 · 5초 말풍선 최상단 z-index
// ============================================================================
function getMyFishingKey() {
  return (typeof userState !== "undefined" && userState.id) || `guest_${Math.floor(Math.random() * 99999)}`;
}

function handleFishingStageTap(e) {
  if (!fishingState.isInside) return;
  if (e.target.closest(".fishing-player-node, .fishing-hud-box, .fishing-users-overlay, .fishing-top-left")) {
    return;
  }
  const stageArea = document.getElementById("fishingStageArea");
  if (!stageArea) return;
  const rect = stageArea.getBoundingClientRect();
  if (rect.width <= 0 || rect.height <= 0) return;

  const clientX = e.touches && e.touches[0] ? e.touches[0].clientX : e.clientX;
  const clientY = e.touches && e.touches[0] ? e.touches[0].clientY : e.clientY;
  const rawX = ((clientX - rect.left) / rect.width) * 100;
  const rawY = ((clientY - rect.top) / rect.height) * 100;

  // 물 위나 UI 위를 터치해도 안전하게 걸어다닐 수 있는 바닥 범위(Y: 54% ~ 88%)로 클램프!
  const targetX = Math.max(9, Math.min(91, Math.round(rawX * 10) / 10));
  const targetY = Math.max(54, Math.min(88, Math.round(rawY * 10) / 10));

  fishingState.myPos = { x: targetX, y: targetY };
  fishingState.myPosTs = Date.now();
  persistFishingSessionMarker();

  const myKey = getMyFishingKey();
  const prev = fishingState.playersMap.get(myKey) || {};
  fishingState.playersMap.set(myKey, {
    ...prev,
    key: myKey,
    userId: userState.id,
    nickname: userState.nickname,
    avatarConfig: getPublicFishingAvatarConfig(),
    x: targetX,
    y: targetY,
    posTs: fishingState.myPosTs,
    mode: "fg"
  });
  syncFishingPlayersDOM();
  trackMyFishingPresence(true);
  scheduleFishingMoveDbSave();
}

function syncFishingPlayersDOM() {
  const layer = document.getElementById("fishingPlayersLayer");
  if (!layer) return;

  const activePlayers = [];
  fishingState.playersMap.forEach((p, key) => {
    if (!p) return;
    if (typeof isUserBlocked === "function" && isUserBlocked(p.userId, p.nickname)) return;
    activePlayers.push({ ...p, key });
  });

  const activeKeys = new Set(activePlayers.map(p => p.key));

  // 나간 유저 DOM 정리
  fishingState.playerNodeMap.forEach((node, key) => {
    if (!activeKeys.has(key)) {
      node.remove();
      fishingState.playerNodeMap.delete(key);
      fishingState.playerAvatarKeys.delete(key);
    }
  });

  const myKey = getMyFishingKey();

  activePlayers.forEach(p => {
    let node = fishingState.playerNodeMap.get(p.key);
    const isMe = p.key === myKey || (userState.id && p.userId === userState.id);
    const cfg = typeof sanitizeAvatarConfigShape === "function"
      ? sanitizeAvatarConfigShape(p.avatarConfig || DEFAULT_AVATAR_CONFIG)
      : (p.avatarConfig || DEFAULT_AVATAR_CONFIG);
    const cfgSig = JSON.stringify(cfg);

    if (!node) {
      node = document.createElement("div");
      node.className = `fishing-player-node${isMe ? " is-me" : ""}`;
      node.innerHTML = `
        <div class="fishing-bubble-slot"></div>
        <canvas class="fishing-player-canvas" width="480" height="480"></canvas>
        <div class="fishing-player-nick">${escapeFishingHtml(p.nickname || "도전자")}</div>
      `;
      node.addEventListener("click", ev => {
        ev.stopPropagation();
        if (isMe) {
          if (typeof openMyProfileModal === "function") openMyProfileModal();
        } else if (typeof inspectOtherUser === "function") {
          inspectOtherUser(p.userId || "", p.nickname || "");
        }
      });
      layer.appendChild(node);
      fishingState.playerNodeMap.set(p.key, node);
    }

    node.style.left = `${Math.max(8, Math.min(92, Number(p.x) || 50))}%`;
    node.style.top = `${Math.max(52, Math.min(89, Number(p.y) || 68))}%`;
    node.classList.toggle("is-bg", p.mode === "bg");

    const nickEl = node.querySelector(".fishing-player-nick");
    if (nickEl) {
      nickEl.textContent = p.mode === "bg" ? `${p.nickname || "도전자"} 💤` : p.nickname || "도전자";
    }

    // 아바타가 변경되었을 때만 480x480 캔버스 렌더링 (6시간 배터리 최적화!)
    if (fishingState.playerAvatarKeys.get(p.key) !== cfgSig) {
      fishingState.playerAvatarKeys.set(p.key, cfgSig);
      const cv = node.querySelector(".fishing-player-canvas");
      if (cv && typeof renderPixelAvatar === "function") {
        renderPixelAvatar(cv, cfg, { transparentBg: true, matchCssAspect: false });
      }
    }
  });

  renderFishingOnlineUsersList(activePlayers);
}

function renderFishingOnlineUsersList(playersList = null) {
  const countEl = document.getElementById("fishingOnlineCount");
  const listEl = document.getElementById("fishingOnlineUsersList");
  if (!listEl) return;

  const players = playersList || Array.from(fishingState.playersMap.values()).filter(
    p => p && !(typeof isUserBlocked === "function" && isUserBlocked(p.userId, p.nickname))
  );

  if (countEl) countEl.textContent = `접속자 ${players.length}명`;

  listEl.innerHTML = players
    .map(p => {
      const safeId = typeof escapeJsSingleArg === "function" ? escapeJsSingleArg(p.userId || "") : "";
      const safeNick = typeof escapeJsSingleArg === "function" ? escapeJsSingleArg(p.nickname || "") : "";
      const isMe = userState.id && p.userId === userState.id;
      return `<div class="fishing-user-item${isMe ? " is-me" : ""}" onclick="event.stopPropagation(); ${isMe ? "openMyProfileModal()" : `inspectOtherUser('${safeId}', '${safeNick}')`}">${escapeFishingHtml(p.nickname || "도전자")}${p.mode === "bg" ? " 💤" : ""}</div>`;
    })
    .join("");
}

function showFishingSpeechBubble(playerKey, text) {
  const node = fishingState.playerNodeMap.get(playerKey);
  if (!node) return;
  const slot = node.querySelector(".fishing-bubble-slot");
  if (!slot) return;

  const existing = fishingState.activeBubbles.get(playerKey);
  if (existing) {
    clearTimeout(existing.fadeTimer);
    clearTimeout(existing.removeTimer);
  }

  // 가장 최근 말풍선이 화면 맨 위로 덮여 보이도록 z-index 최상단 상승!
  const nextZ = ++fishingState.topBubbleZ;
  node.style.zIndex = String(nextZ);

  slot.innerHTML = "";
  const bubble = document.createElement("div");
  bubble.className = "fishing-speech-bubble";
  bubble.style.zIndex = String(nextZ);
  bubble.textContent = String(text || "").slice(0, 60);
  slot.appendChild(bubble);

  const fadeTimer = setTimeout(() => {
    bubble.classList.add("is-fading");
  }, 4550);

  const removeTimer = setTimeout(() => {
    if (bubble.parentNode === slot) {
      slot.innerHTML = "";
    }
    fishingState.activeBubbles.delete(playerKey);
  }, 5000);

  fishingState.activeBubbles.set(playerKey, { fadeTimer, removeTimer });
}

// ============================================================================
// 4. 휘발성 실시간 채팅 & Supabase Realtime (Presence + Broadcast)
// ============================================================================
function escapeFishingHtml(str) {
  return String(str || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function appendFishingChatRow(htmlContent, rowClass = "chat-row") {
  const logEl = document.getElementById("fishingChatLog");
  if (!logEl) return;
  fishingState.chatMessages.push({ htmlContent, rowClass });
  if (fishingState.chatMessages.length > 90) {
    fishingState.chatMessages.shift();
    if (logEl.firstChild) logEl.removeChild(logEl.firstChild);
  }
  const div = document.createElement("div");
  div.className = `fishing-chat-item ${rowClass}`;
  div.innerHTML = htmlContent;
  logEl.appendChild(div);
  logEl.scrollTop = logEl.scrollHeight;
}

function appendFishingSystemMessage(text) {
  appendFishingChatRow(escapeFishingHtml(text), "system-join");
}

function appendFishingUserChat(nick, msg, isMe = false) {
  appendFishingChatRow(
    `<strong class="fishing-chat-nick${isMe ? " is-me" : ""}">${escapeFishingHtml(nick)}:</strong> <span>${escapeFishingHtml(msg)}</span>`,
    "user-msg"
  );
}

function buildMyFishingLivePayload(mode = "fg", active = true) {
  return {
    active: !!active,
    channelId: currentFishingChannelId,
    mode,
    x: fishingState.myPos.x,
    y: fishingState.myPos.y,
    posTs: fishingState.myPosTs || Date.now(),
    heartbeatAt: Date.now(),
    sessionTag: fishingState.sessionTag
  };
}

function scheduleFishingMoveDbSave() {
  if (fishingState.dbMoveSaveTimer) {
    clearTimeout(fishingState.dbMoveSaveTimer);
  }
  fishingState.dbMoveSaveTimer = setTimeout(() => {
    fishingState.dbMoveSaveTimer = null;
    if (!fishingState.isInside) return;
    if (typeof userState !== "undefined") {
      userState.fishingLive = buildMyFishingLivePayload(document.hidden ? "bg" : "fg", true);
    }
    if (typeof syncProfileToServer === "function") syncProfileToServer();
  }, 850);
}

async function trackMyFishingPresence(alsoBroadcastMove = false) {
  const myKey = getMyFishingKey();
  const posTs = fishingState.myPosTs || Date.now();
  const cleanAvatar = getPublicFishingAvatarConfig();
  const mode = document.hidden ? "bg" : "fg";
  const payload = {
    key: myKey,
    userId: userState.id,
    nickname: userState.nickname,
    avatarConfig: cleanAvatar,
    x: fishingState.myPos.x,
    y: fishingState.myPos.y,
    posTs,
    joinedAt: Date.now(),
    mode
  };
  fishingState.playersMap.set(myKey, payload);

  if (fishingState.channel) {
    try {
      await fishingState.channel.track(payload);
      if (alsoBroadcastMove) {
        fishingState.channel.send({
          type: "broadcast",
          event: "fishing_move",
          payload: {
            key: myKey,
            userId: userState.id,
            nickname: userState.nickname || "도전자",
            avatarConfig: cleanAvatar,
            x: payload.x,
            y: payload.y,
            ts: posTs,
            mode
          }
        });
      }
    } catch (e) {}
  }
}

function scheduleFishingReconnect() {
  if (!fishingState.isInside || (typeof state !== "undefined" && state.currentScreen !== "fishingScreen")) return;
  if (document.hidden) return;
  if (fishingState.reconnectTimer) return;
  fishingState.reconnectTimer = setTimeout(() => {
    fishingState.reconnectTimer = null;
    if (!fishingState.isInside || (typeof state !== "undefined" && state.currentScreen !== "fishingScreen")) return;
    try {
      if (sbClient && sbClient.realtime && !sbClient.realtime.isConnected()) {
        sbClient.realtime.connect();
      }
    } catch (e) {}
    connectFishingRealtimeChannel(true);
  }, 1500);
}

function ensureFishingRealtimeHealthy() {
  if (!fishingState.isInside || (typeof state !== "undefined" && state.currentScreen !== "fishingScreen")) return;
  if (!sbClient) return;
  try {
    if (sbClient.realtime && !sbClient.realtime.isConnected()) {
      sbClient.realtime.connect();
    }
  } catch (e) {}

  const st = fishingState.channel && fishingState.channel.state;
  if (!fishingState.channel || st !== "joined") {
    connectFishingRealtimeChannel(true);
  } else {
    trackMyFishingPresence(true);
  }
}

async function syncFishingGlobalRosterFromDb() {
  if (!fishingState.isInside || !sbClient) return;
  if (typeof state !== "undefined" && state.currentScreen !== "fishingScreen") return;

  try {
    const { data: rows, error } = await sbClient
      .from("profiles")
      .select("id, nickname, avatar_config")
      .neq("nickname", "__ADMIN_CONFIG__")
      .limit(250);

    if (error || !Array.isArray(rows)) return;
    if (!fishingState.isInside) return;

    const myKey = getMyFishingKey();
    const now = Date.now();
    const presKeys = new Set();
    if (fishingState.channel) {
      try {
        const pres = fishingState.channel.presenceState();
        Object.entries(pres).forEach(([pk, arr]) => {
          const entry = Array.isArray(arr) && arr[0];
          presKeys.add((entry && entry.key) || pk);
        });
      } catch (e) {}
    }

    const activeDbKeys = new Set([myKey]);

    rows.forEach(r => {
      if (!r || !r.id || r.id === userState.id) return;
      if (typeof isUserBlocked === "function" && isUserBlocked(r.id, r.nickname)) return;

      const cfg = r.avatar_config || {};
      const live = cfg._fishingLive;
      if (!live || !live.active || live.channelId !== currentFishingChannelId) return;

      const leftStamp = fishingState.recentLeftAt.get(r.id) || 0;
      if (leftStamp && now - leftStamp < 10000 && (live.heartbeatAt || 0) <= leftStamp) {
        return;
      }

      const inPresence = presKeys.has(r.id);
      const hbAge = now - (Number(live.heartbeatAt) || 0);
      const mode = live.mode || "fg";

      if (!inPresence) {
        if (mode === "fg" && hbAge > FISHING_FG_STALE_MS) return;
        if (mode === "bg" && hbAge > FISHING_BG_IDLE_MAX_MS) return;
      }

      activeDbKeys.add(r.id);
      const prev = fishingState.playersMap.get(r.id);
      const dbPosTs = Number(live.posTs) || 0;
      const useDbPos = !prev || dbPosTs > (Number(prev.posTs) || 0);
      const resolvedMode = inPresence && mode !== "bg" ? "fg" : mode;

      fishingState.playersMap.set(r.id, {
        ...(prev || {}),
        key: r.id,
        userId: r.id,
        nickname: r.nickname || prev?.nickname || "도전자",
        avatarConfig: getPublicFishingAvatarConfig(cfg),
        x: useDbPos ? (Number(live.x) || 50) : prev.x,
        y: useDbPos ? (Number(live.y) || 68) : prev.y,
        posTs: useDbPos ? dbPosTs : prev.posTs,
        mode: resolvedMode
      });

      if (fishingState.hasInitialDbSync && !fishingState.knownPeerIds.has(r.id)) {
        fishingState.knownPeerIds.add(r.id);
        appendFishingSystemMessage(`[${r.nickname || "도전자"}]님이 입장하였습니다`);
      }
      fishingState.knownPeerIds.add(r.id);
    });

    // Realtime Presence와 DB 로스터 모두에서 사라진 유저 정리
    Array.from(fishingState.playersMap.keys()).forEach(k => {
      if (k === myKey) return;
      if (!activeDbKeys.has(k) && !presKeys.has(k)) {
        fishingState.playersMap.delete(k);
        fishingState.knownPeerIds.delete(k);
      }
    });

    fishingState.hasInitialDbSync = true;
    syncFishingPlayersDOM();
  } catch (e) {}
}

function startFishingNetworkSync() {
  stopFishingNetworkSync();

  fishingState.rosterPollTimer = setInterval(() => {
    if (!fishingState.isInside || document.hidden) return;
    if (typeof state !== "undefined" && state.currentScreen !== "fishingScreen") return;
    syncFishingGlobalRosterFromDb();
  }, FISHING_ROSTER_POLL_MS);

  fishingState.heartbeatTimer = setInterval(() => {
    if (!fishingState.isInside || document.hidden) return;
    if (typeof state !== "undefined" && state.currentScreen !== "fishingScreen") return;
    ensureFishingRealtimeHealthy();
    if (typeof userState !== "undefined") {
      userState.fishingLive = buildMyFishingLivePayload("fg", true);
    }
    if (typeof syncProfileToServer === "function") syncProfileToServer();
  }, FISHING_HEARTBEAT_MS);
}

function stopFishingNetworkSync() {
  if (fishingState.rosterPollTimer) {
    clearInterval(fishingState.rosterPollTimer);
    fishingState.rosterPollTimer = null;
  }
  if (fishingState.heartbeatTimer) {
    clearInterval(fishingState.heartbeatTimer);
    fishingState.heartbeatTimer = null;
  }
  if (fishingState.reconnectTimer) {
    clearTimeout(fishingState.reconnectTimer);
    fishingState.reconnectTimer = null;
  }
  if (fishingState.dbMoveSaveTimer) {
    clearTimeout(fishingState.dbMoveSaveTimer);
    fishingState.dbMoveSaveTimer = null;
  }
}

function connectFishingRealtimeChannel(isReconnect = false, restorePos = null) {
  disconnectFishingRealtimeChannel({ keepPlayers: isReconnect, sendLeaveSignal: false });

  const myKey = getMyFishingKey();
  if (!isReconnect) {
    if (restorePos && typeof restorePos.x === "number" && typeof restorePos.y === "number") {
      fishingState.myPos = { x: restorePos.x, y: restorePos.y };
    } else {
      const initX = 24 + Math.floor(Math.random() * 52);
      const initY = 60 + Math.floor(Math.random() * 22);
      fishingState.myPos = { x: initX, y: initY };
    }
    fishingState.myPosTs = Date.now();
    fishingState.playersMap.clear();
    fishingState.knownPeerIds = new Set([myKey]);
    fishingState.recentLeftAt.clear();
    fishingState.hasInitialPresenceSync = false;
    fishingState.hasInitialDbSync = false;
  }

  const myInitialPayload = {
    key: myKey,
    userId: userState.id,
    nickname: userState.nickname,
    avatarConfig: getPublicFishingAvatarConfig(),
    x: fishingState.myPos.x,
    y: fishingState.myPos.y,
    posTs: fishingState.myPosTs || Date.now(),
    joinedAt: Date.now(),
    mode: document.hidden ? "bg" : "fg"
  };
  fishingState.playersMap.set(myKey, myInitialPayload);
  syncFishingPlayersDOM();

  if (!sbClient) return;

  fishingState.channel = sbClient.channel(currentFishingChannelId, {
    config: { presence: { key: myKey } }
  });

  fishingState.channel
    .on("presence", { event: "sync" }, () => {
      if (!fishingState.channel) return;
      const pres = fishingState.channel.presenceState();
      const presentKeys = new Set();

      Object.entries(pres).forEach(([presKey, arr]) => {
        const entry = Array.isArray(arr) && arr[0];
        if (!entry) return;
        const k = entry.key || presKey;
        if (k === myKey) return;
        if (typeof isUserBlocked === "function" && isUserBlocked(entry.userId, entry.nickname)) return;

        presentKeys.add(k);
        fishingState.recentLeftAt.delete(k);

        const prev = fishingState.playersMap.get(k);
        const entryTs = Number(entry.posTs) || Number(entry.joinedAt) || 0;
        const prevTs = prev ? (Number(prev.posTs) || Number(prev.joinedAt) || 0) : -1;
        const keepPrevPos = prev && prevTs > entryTs;

        fishingState.playersMap.set(k, {
          ...(prev || {}),
          ...entry,
          key: k,
          avatarConfig: getPublicFishingAvatarConfig(entry.avatarConfig),
          x: keepPrevPos ? prev.x : entry.x,
          y: keepPrevPos ? prev.y : entry.y,
          posTs: Math.max(entryTs, prevTs),
          mode: entry.mode === "bg" ? "bg" : "fg"
        });

        if (fishingState.hasInitialPresenceSync && !fishingState.knownPeerIds.has(k)) {
          appendFishingSystemMessage(`[${entry.nickname || "도전자"}]님이 입장하였습니다`);
        }
        fishingState.knownPeerIds.add(k);
      });

      // 내가 항상 목록에 유지되도록 보장
      fishingState.playersMap.set(myKey, {
        ...myInitialPayload,
        x: fishingState.myPos.x,
        y: fishingState.myPos.y,
        posTs: fishingState.myPosTs || Date.now(),
        mode: document.hidden ? "bg" : "fg"
      });

      fishingState.hasInitialPresenceSync = true;
      syncFishingPlayersDOM();
      syncFishingGlobalRosterFromDb();
    })
    .on("presence", { event: "leave" }, ({ leftPresences }) => {
      if (Array.isArray(leftPresences)) {
        leftPresences.forEach(lp => {
          const lk = (lp && (lp.key || lp.userId)) || "";
          if (lk && lk !== myKey) {
            const p = fishingState.playersMap.get(lk);
            // 명시적 bg가 아니라 실시간 이탈이면 임시 제거 (knownPeerIds는 DB 대조에서 최종 정리해 재입장 메시지 오출력 방지)
            if (!p || p.mode !== "bg") {
              fishingState.playersMap.delete(lk);
            }
          }
        });
        syncFishingPlayersDOM();
      }
      syncFishingGlobalRosterFromDb();
    })
    .on("broadcast", { event: "fishing_move" }, ({ payload }) => {
      if (!payload || !payload.key) return;
      if (payload.key === myKey || (userState.id && payload.userId === userState.id)) return;
      fishingState.recentLeftAt.delete(payload.key);
      const existing = fishingState.playersMap.get(payload.key);
      const moveTs = Number(payload.ts) || Date.now();
      fishingState.playersMap.set(payload.key, {
        ...(existing || {}),
        key: payload.key,
        userId: payload.userId || existing?.userId,
        nickname: payload.nickname || existing?.nickname || "도전자",
        avatarConfig: getPublicFishingAvatarConfig(payload.avatarConfig || existing?.avatarConfig),
        x: payload.x,
        y: payload.y,
        posTs: moveTs,
        mode: payload.mode || "fg"
      });
      fishingState.knownPeerIds.add(payload.key);
      syncFishingPlayersDOM();
    })
    .on("broadcast", { event: "fishing_leave" }, ({ payload }) => {
      if (!payload || !payload.key) return;
      if (payload.key === myKey || (userState.id && payload.userId === userState.id)) return;
      fishingState.recentLeftAt.set(payload.key, Date.now());
      fishingState.playersMap.delete(payload.key);
      fishingState.knownPeerIds.delete(payload.key);
      syncFishingPlayersDOM();
    })
    .on("broadcast", { event: "fishing_chat" }, ({ payload }) => {
      if (!payload || !payload.msg) return;
      if (typeof isUserBlocked === "function" && isUserBlocked(payload.userId, payload.nickname)) return;
      const senderKey = payload.key || payload.userId;
      // 내 채팅은 sendFishingChat()에서 즉시 렌더링하므로 자기 에코 중복 차단
      if (senderKey === myKey || (userState.id && payload.userId === userState.id)) return;
      appendFishingUserChat(payload.nickname || "도전자", payload.msg, false);
      showFishingSpeechBubble(senderKey, payload.msg);
    })
    .subscribe(async status => {
      if (status === "SUBSCRIBED") {
        await trackMyFishingPresence(isReconnect);
        if (!isReconnect) {
          appendFishingSystemMessage(`[${userState.nickname || "도전자"}]님이 입장하였습니다`);
        }
        syncFishingGlobalRosterFromDb();
      } else if (status === "CHANNEL_ERROR" || status === "TIMED_OUT" || status === "CLOSED") {
        scheduleFishingReconnect();
      }
    });
}

function disconnectFishingRealtimeChannel(opts = {}) {
  const { keepPlayers = false, sendLeaveSignal = false } = opts;
  const ch = fishingState.channel;
  fishingState.channel = null;

  if (ch && sbClient) {
    try {
      if (sendLeaveSignal) {
        const myKey = getMyFishingKey();
        ch.send({
          type: "broadcast",
          event: "fishing_leave",
          payload: { key: myKey, userId: userState.id, ts: Date.now() }
        });
        ch.untrack();
      }
      sbClient.removeChannel(ch);
    } catch (e) {}
  }

  if (!keepPlayers) {
    fishingState.activeBubbles.forEach(b => {
      clearTimeout(b.fadeTimer);
      clearTimeout(b.removeTimer);
    });
    fishingState.activeBubbles.clear();
    fishingState.playerNodeMap.clear();
    fishingState.playerAvatarKeys.clear();
    const layer = document.getElementById("fishingPlayersLayer");
    if (layer) layer.innerHTML = "";
  }
}

window.sendFishingChat = function () {
  if (!fishingState.isInside) return;
  const input = document.getElementById("fishingChatInput");
  if (!input) return;
  const msg = input.value.trim();
  if (!msg) return;
  input.value = "";

  const myKey = getMyFishingKey();
  const payload = {
    key: myKey,
    userId: userState.id,
    nickname: userState.nickname || "도전자",
    msg: msg.slice(0, 80),
    ts: Date.now()
  };

  // 본인 채팅·말풍선은 Supabase broadcast.self=false 여부와 무관하게 즉시 화면에 반영!
  appendFishingUserChat(payload.nickname, payload.msg, true);
  showFishingSpeechBubble(myKey, payload.msg);

  ensureFishingRealtimeHealthy();
  if (fishingState.channel) {
    try {
      fishingState.channel.send({
        type: "broadcast",
        event: "fishing_chat",
        payload
      });
    } catch (e) {}
  }
};

// ============================================================================
// 5. 2초 로딩 오버레이 · 폰 홈 유지 / 스와이프 강제종료 퇴장 라이프사이클
// ============================================================================
function showFishingLoadingOverlay(labelText) {
  const overlay = document.getElementById("fishingLoadingOverlay");
  const titleEl = document.getElementById("fishingLoadingTitle");
  const barEl = document.getElementById("fishingLoadingBarFill");
  const avatarCv = document.getElementById("fishingLoadingAvatar");
  if (!overlay) return;

  if (titleEl) titleEl.textContent = labelText;
  if (avatarCv && typeof renderPixelAvatar === "function") {
    const cfg = typeof userState !== "undefined" ? userState.avatarConfig : DEFAULT_AVATAR_CONFIG;
    renderPixelAvatar(avatarCv, cfg, { transparentBg: true, matchCssAspect: false });
  }
  if (barEl) {
    barEl.style.transition = "none";
    barEl.style.width = "0%";
    void barEl.offsetWidth;
    barEl.style.transition = `width ${FISHING_LOADING_DURATION_MS}ms linear`;
    barEl.style.width = "100%";
  }
  overlay.classList.remove("hidden");
}

function hideFishingLoadingOverlay() {
  const overlay = document.getElementById("fishingLoadingOverlay");
  if (overlay) overlay.classList.add("hidden");
}

window.enterFishingRoom = function (channelId = FISHING_CHANNELS[0].id, opts = {}) {
  const skipLoading = !!(opts && opts.skipLoading);
  const restorePos = opts && opts.restorePos ? opts.restorePos : null;
  if (fishingState.isTransitioning && !skipLoading) return;
  if (typeof userState !== "undefined" && !userState.isLoggedIn) {
    gameConfirm("낚시터는 로그인한 계정으로만 입장할 수 있습니다.\n로그인 화면으로 이동할까요?", () => showLoginScreen());
    return;
  }

  fishingState.isTransitioning = !skipLoading;
  fishingState.hasRunForcedExit = false;
  currentFishingChannelId = channelId || FISHING_CHANNELS[0].id;
  fishingState.chatMessages = [];
  const logEl = document.getElementById("fishingChatLog");
  if (logEl) logEl.innerHTML = "";

  const chInfo = FISHING_CHANNELS.find(c => c.id === currentFishingChannelId) || FISHING_CHANNELS[0];
  const chBadge = document.getElementById("fishingChannelLabel");
  if (chBadge) chBadge.textContent = `🎣 ${chInfo.name}`;

  loadFishingDailyFromUserState(Date.now());
  renderFishingHud();

  if (!skipLoading) {
    showFishingLoadingOverlay("🎣 낚시터 가는중..");
  }

  // 로딩 연출 중 화면 미리 전환 + 통합 서버 연결!
  if (typeof switchScreen === "function") {
    switchScreen("fishingScreen", skipLoading ? { replaceHistory: true } : {});
  }
  fishingState.isInside = true;
  connectFishingRealtimeChannel(false, restorePos);
  persistFishingSessionMarker();

  if (typeof userState !== "undefined") {
    userState.fishingLive = buildMyFishingLivePayload("fg", true);
    if (typeof syncProfileToServer === "function") syncProfileToServer();
  }

  startFishingBgLoop();
  startFishingRewardTimer();
  startFishingNetworkSync();
  syncFishingGlobalRosterFromDb();

  if (skipLoading) {
    if (typeof syncFishingViewportLock === "function") syncFishingViewportLock();
  } else {
    setTimeout(() => {
      hideFishingLoadingOverlay();
      fishingState.isTransitioning = false;
      if (typeof syncFishingViewportLock === "function") syncFishingViewportLock();
    }, FISHING_LOADING_DURATION_MS);
  }
};

window.handleFishingVisibilityChange = function (isHidden) {
  if (!fishingState.isInside) return;
  if (typeof state !== "undefined" && state.currentScreen !== "fishingScreen") return;

  if (isHidden) {
    // 폰 홈버튼 전환: 낚시터에서 나가지 않고 방 + 경험치/CD 시계 + 백그라운드 상태 유지!
    window.advanceFishingClockTo(Date.now());
    persistFishingSessionMarker();
    if (typeof userState !== "undefined") {
      userState.fishingLive = buildMyFishingLivePayload("bg", true);
    }
    if (fishingState.channel) {
      try {
        fishingState.channel.send({
          type: "broadcast",
          event: "fishing_move",
          payload: {
            key: getMyFishingKey(),
            userId: userState.id,
            nickname: userState.nickname || "도전자",
            avatarConfig: getPublicFishingAvatarConfig(),
            x: fishingState.myPos.x,
            y: fishingState.myPos.y,
            ts: Date.now(),
            mode: "bg"
          }
        });
      } catch (e) {}
    }
    if (typeof sendProfileKeepalivePatch === "function") {
      sendProfileKeepalivePatch();
    } else if (typeof syncProfileToServer === "function") {
      syncProfileToServer();
    }
  } else {
    // 폰 홈에서 복귀: 경과 시간 즉시 반영 + 끊긴 WebSocket·전역 로스터 즉시 재동기화!
    window.advanceFishingClockTo(Date.now());
    persistFishingSessionMarker();
    if (typeof userState !== "undefined") {
      userState.fishingLive = buildMyFishingLivePayload("fg", true);
      if (typeof syncProfileToServer === "function") syncProfileToServer();
    }
    ensureFishingRealtimeHealthy();
    syncFishingGlobalRosterFromDb();
  }
};

window.handleFishingForcedExit = function (ev) {
  if (!fishingState.isInside || fishingState.hasRunForcedExit) return;
  if (ev && ev.type === "pagehide" && ev.persisted) return;

  fishingState.hasRunForcedExit = true;
  clearFishingSessionMarker();
  window.advanceFishingClockTo(Date.now());

  if (typeof userState !== "undefined") {
    userState.fishingLive = { active: false, leftAt: Date.now() };
  }
  if (typeof sendProfileKeepalivePatch === "function") {
    sendProfileKeepalivePatch();
  }
  disconnectFishingRealtimeChannel({ keepPlayers: true, sendLeaveSignal: true });
};

window.addEventListener("online", () => {
  if (fishingState.isInside && typeof state !== "undefined" && state.currentScreen === "fishingScreen") {
    ensureFishingRealtimeHealthy();
    syncFishingGlobalRosterFromDb();
  }
});

window.cleanupFishingRuntime = function (shouldSyncServer = true) {
  if (fishingState.isInside) {
    window.advanceFishingClockTo(Date.now());
  }
  fishingState.isInside = false;
  clearFishingSessionMarker();
  stopFishingRewardTimer();
  stopFishingNetworkSync();
  stopFishingBgLoop();
  disconnectFishingRealtimeChannel({ keepPlayers: false, sendLeaveSignal: true });

  if (typeof userState !== "undefined") {
    userState.fishingLive = { active: false, leftAt: Date.now() };
  }

  const chatInput = document.getElementById("fishingChatInput");
  if (chatInput) chatInput.blur();
  const inputBar = document.getElementById("fishingInputBar");
  if (inputBar) {
    inputBar.style.transform = "";
    inputBar.classList.remove("is-kb-floating");
  }
  const stageArea = document.getElementById("fishingStageArea");
  if (stageArea) {
    stageArea.style.flex = "";
    stageArea.style.height = "";
  }

  if (shouldSyncServer && typeof syncProfileToServer === "function") {
    syncProfileToServer();
  }
};

window.confirmExitFishingRoom = function () {
  if (fishingState.isTransitioning) return;
  const dlg = document.getElementById("customDialogModal");
  if (dlg && !dlg.classList.contains("hidden")) {
    return;
  }
  if (typeof gameConfirm === "function") {
    gameConfirm(
      "낚시터에서 나가시겠습니까?\n(현재까지 쌓인 경험치·CD는 자동 저장됩니다.)",
      () => window.exitFishingScreenWithLoading(),
      "🎣 낚시터 나가기"
    );
  } else {
    window.exitFishingScreenWithLoading();
  }
};

window.exitFishingScreenWithLoading = function () {
  if (fishingState.isTransitioning) return;
  fishingState.isTransitioning = true;

  window.cleanupFishingRuntime(true);
  showFishingLoadingOverlay("🏠 낚시터 나오는중..");

  setTimeout(() => {
    hideFishingLoadingOverlay();
    fishingState.isTransitioning = false;
    if (typeof showHome === "function") {
      showHome();
    }
  }, FISHING_LOADING_DURATION_MS);
};

// [V2.0] 낚시터 황금 떡밥 2배 버프 (광고 시청 시 30분 CD 2배 · 중첩 불가 · 06시 초기화)
window.activateFishing2xBuffAd = function () {
  if (isFishing2xBuffActive()) {
    gameAlert("이미 30분 CD 2배 버프가 적용 중입니다! (중첩 불가)");
    return;
  }
  if (typeof showRewardedAd !== "function") return;
  showRewardedAd("낚시터 30분 CD 2배 버프", async () => {
    const ds = typeof ensureV2DailyState === "function" ? ensureV2DailyState() : null;
    if (ds) {
      ds.fishing2xKstDate = getFishingCycleKey();
      ds.fishing2xExpiresAt = Date.now() + 30 * 60 * 1000;
    }
    if (typeof syncProfileToServer === "function") await syncProfileToServer();
    renderFishingHud();
    if (typeof appendFishingChatLine === "function") {
      appendFishingChatLine("시스템", "⚡ [황금 떡밥 2배 버프] 30분간 낚시터 CD 획득량이 2배가 됩니다!");
    }
  });
};
