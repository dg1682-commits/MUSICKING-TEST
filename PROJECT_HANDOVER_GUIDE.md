# 👑 대한민국 음악왕 (MUSIC KING) — 전체 개발·기획·인수인계 마스터 가이드

> **문서 목적**: 다른 PC / 다른 Antigravity 세션에서도 현재 상태(`v10.27`) 그대로 막힘없이 이어서 개발·유지보수·배포할 수 있도록 모든 기술 스펙, DB 구조, 게임 기획, UI/UX 규칙, PWA/APK 파이프라인 및 주의사항을 총망라한 문서입니다.

---

## 1. 프로젝트 개요 & 실행 환경

- **앱 이름**: 음악왕 (`v10.27`)
- **현재 버전**: **v10.27** (`SHOP_CATALOG_VERSION = 13` · 총 문제 DB **448곡**)
- **프로젝트 경로**: `c:\Users\user1\Desktop\개발\음악왕`
- **GitHub 저장소**: `https://github.com/dg1682-commits/MUSICKING` (`main` 브랜치, GitHub Actions Pages 배포)
- **모바일 앱 패키징**: **PWABuilder Android TWA APK** (`io.github.dg1682_commits.twa`)
  - APK가 GitHub Pages URL을 실시간으로 불러오는 TWA(Trusted Web Activity) 구조이므로, **웹 코드 수정 후 GitHub에 반영하면 APK 재설치 없이 앱에 자동 반영**됩니다(단, [sw.js](file:///c:/Users/user1/Desktop/개발/음악왕/sw.js), [index.html](file:///c:/Users/user1/Desktop/개발/음악왕/index.html), [admin.html](file:///c:/Users/user1/Desktop/개발/음악왕/admin.html) 3곳의 `?v=X.X` 캐시 버스팅 필수).

---

## 2. 파일 구조 및 로드 순서

| 파일명 | 역할 | 비고 |
| :--- | :--- | :--- |
| [index.html](file:///c:/Users/user1/Desktop/개발/음악왕/index.html) | 메인 SPA 진입점 (최상단 `<head>` 원스토어 H5 Game SDK `v1.1.0` `<script type="module">` `window.onestoreSdk` 및 `initializeAsync`→`setLoadingProgress`→`startGameAsync` 생명주기 + `interactive-widget=overlays-content` 뷰포트 리사이즈 차단 + 모든 게임/CDN 스크립트 `defer` 순서 보장 + 14개 전체화면 `<section>`/`<main>` + 16개 모달 + `#fishingLoadingOverlay`) | `<head>` 최상단 원스토어 SDK (`v` 접두사 `v1.1.0`) 및 `.hidden` 인라인 스타일 필수 |
| [style.css](file:///c:/Users/user1/Desktop/개발/음악왕/style.css) | 전체 UI 스타일 (홈 2×3 버튼 도크·16:10 와이드 홈 스테이지 + 낚시터 상/하 분할 및 키보드 입력창 부양 + 상점 + MIDI 다크 스튜디오 + 카톡 DM 테마 + `--os-safe-*` 원스토어 노치 대응) | 기본 폰트: 고딕 (`use-pixel-font` 토글 지원) |
| [data.js](file:///c:/Users/user1/Desktop/개발/음악왕/data.js) | 1990s(106)·2000s(122)·2010s(114)·2020s(106) 총 **448곡** K-POP 문제 DB (`QUESTIONS_DB`), `HARD_MODE_ARTISTS`, 공용 MD 파서(`parseMarkdownQuestions`)·지문/힌트 자동 마스킹(`maskAnswerInBehindText`, `sanitizeKeywordHint`)·iTunes 아티스트/곡명 정밀 스코어링 조회 유틸(`fetchItunesSongMeta`, MR/커버 필터) | `defer` 로드 · 전곡 실가사 검수 & 자동 마스킹 포함 |
| [pixel_avatar.js](file:///c:/Users/user1/Desktop/개발/음악왕/pixel_avatar.js) | 1~20레벨 테이블(`EXP_LEVEL_TABLE`), 상점 아이템 카탈로그(`BASE_AVATAR_SHOP_ITEMS`, v13), 최소 480×480 고디테일 캐릭터·배경·의상·헤어·악기·도트 로고 캔버스 렌더러 | `defer` 로드 · `online.js`, `fishing.js`, `app.js`보다 **반드시 먼저** 실행 |
| [online.js](file:///c:/Users/user1/Desktop/개발/음악왕/online.js) | Supabase 연동 (회원/세션·인게임/외부 탈퇴 RPC `delete_my_account`, 약관·삭제 URL 라우팅 `?page=privacy/delete`, 신고/차단 `user_reports`, 유저별 최고점 랭킹 TOP 20·상단 2-1-3 대형 포디엄·TOP 3 최초/갱신 시 EXP·CD 동시 5/3/2배 보너스, 상점 미보유 시착 시 `🛍️ 구매하기` 전환·단일/선택 일괄 구매·낚시 인벤토리 슬롯·`#shopBgCanvas` 풀배경 연동, 1:1/4인 필터 대기실·대결 전적, 카톡 친구/1:1 DM, 5초 DB 폴링, `_fishingDaily`·`_fishingLive`·`keepalive` 저장) | `defer` 로드 · `userState`, `dmState`, `dmNotiState`, `plazaState` 관리 |
| [fishing.js](file:///c:/Users/user1/Desktop/개발/음악왕/fishing.js) | **통합 방치형 소셜 낚시터 모듈 (`fishing_room_1`)**: Realtime(Presence/Broadcast) + 4초 DB 로스터(`_fishingLive`) 하이브리드 동기화 & WS 자동 재연결, 폰 홈버튼 유지(`mode: "bg"`, `💤`) & 스와이프 강제종료(`beforeunload`/`pagehide` keepalive) 자동 퇴장, 상단 보유 `CD · Lv/EXP` 실시간 HUD 바, KST 오전 `06:00` 초기화, 6시간 기본 `+1,000 EXP / +3,000 CD` + 낚싯대·미끼 버프 연동, 15fps 호수 캔버스·바닥 이동·5초 말풍선, 2초 바운스 로딩 | `defer` 로드 · `online.js` 다음, `app.js` 전에 실행 |
| [app.js](file:///c:/Users/user1/Desktop/개발/음악왕/app.js) | 싱글 게임 엔진, iTunes 곡객체 정밀 검색(`fetchItunesTrack(q)`)·1초 듣기, `useKeywordHint()` 단계별 동적 마스킹(`sanitizeKeywordHint`), BGM(`main.mp3`/`shop.mp3`/`fish.mp3`)/클릭 효과음, 원스토어 H5 SDK 생명주기 연동(`onOnestorePause`/`Resume`/`Exit`/`GameStarted`, `handleOnestoreBackPressed`, `ringerSilent`), 백그라운드 전환 시 낚시터 유지·강제종료 정리·물리 뒤로가기 종료 가드, 상점 고스트 스크롤, 화면 전환(`switchScreen`), 쿠팡 배너 슬롯 재배치, 모바일 키보드 뷰포트 제어, 폭죽/결과 공유 | `defer` 로드 · `DOMContentLoaded`에서 `initEvents()`, `__markMusickingBootReady()`, `sw.js` 등록 |
| [admin.html](file:///c:/Users/user1/Desktop/개발/음악왕/admin.html) | 관리자 백엔드 대시보드 (음악 더블클릭 수정·`➕ 1곡 직접 추가`·**`📂 MD 파일 일괄 추가`**·삭제, 상점 시세 관리, 유저 CD/계정 초기화, **`🚨 신고 내역 조회`**, **`📦 스토어 출시 정보`**) | 닉네임 `"관리자"` 세션 이중 잠금 |
| [manifest.json](file:///c:/Users/user1/Desktop/개발/음악왕/manifest.json) | PWA 매니페스트 (`standalone`, `portrait`, `launch_handler: focus-existing`, 192/512/maskable/svg 아이콘) | PWABuilder 패키징 기준 |
| [sw.js](file:///c:/Users/user1/Desktop/개발/음악왕/sw.js) | Service Worker (동일 출처 Network-First + 오프라인 폴백 / 외부 API 직통) | 버전 변경 시 `CACHE_NAME` 수정 필수 (`v10.27`) |
| [.nojekyll](file:///c:/Users/user1/Desktop/개발/음악왕/.nojekyll) | GitHub Pages Jekyll 비활성화 (`.well-known` 폴더 404 방지) | 절대 삭제 금지 *(GitHub 웹 업로드 시 주의!)* |
| [.well-known/assetlinks.json](file:///c:/Users/user1/Desktop/개발/음악왕/.well-known/assetlinks.json) | Android TWA 상단 주소창 완전 제거용 Digital Asset Links | PWABuilder 서명 키 지문 등록됨 |
| [가수목록.md](file:///c:/Users/user1/Desktop/개발/음악왕/가수목록.md) | 1990s~2020s 연대별 50팀씩 총 200팀 가수 리스트 & 제외 가수·동의어 규칙 메모 | 문제 확장 참고 목록 |
| [문제추가_양식.md](file:///c:/Users/user1/Desktop/개발/음악왕/문제추가_양식.md) | 나무위키 등에서 복사한 곡 정보를 문제 양식으로 정리하는 가이드 | [admin.html](file:///c:/Users/user1/Desktop/개발/음악왕/admin.html) `[📂 MD 파일 일괄 추가]`에서 바로 불러오기 지원 |
| `icons/` | `icon-192.png`, `icon-512.png`, `icon-maskable-512.png`, [icon.svg](file:///c:/Users/user1/Desktop/개발/음악왕/icons/icon.svg), [make_icons.html](file:///c:/Users/user1/Desktop/개발/음악왕/icons/make_icons.html) | APK 아이콘 생성용 자산 |
| `bgm/` | `main.mp3`, `shop.mp3`, `fish.mp3`, `click.wav` | GitHub 저장소 내 `bgm/` 폴더에 실파일 위치 (`fish.mp3`는 낚시터 전용) |

### ⚠️ 스크립트 로드·실행 순서 (절대 유지)
[index.html](file:///c:/Users/user1/Desktop/개발/음악왕/index.html) 최상단 `<head>`의 원스토어 H5 SDK `<script type="module">`이 **무조건 가장 먼저 실행**되도록 하단 게임 스크립트와 외부 CDN 스크립트에 모두 `defer`가 적용되어 있으며, 반드시 아래 순서를 지켜야 합니다:
1. `<head>` 최상단 `<script type="module">` (ONE store H5 SDK `v1.1.0`)
2. `supabase-js@2` (`defer`), `html2canvas` (`defer`)
3. `data.js` (`defer`)
4. `pixel_avatar.js` (`defer`)
5. `online.js` (`defer`)
6. `fishing.js` *(index.html 전용, `defer`)*
7. `app.js` *(index.html 전용, `defer`)*

---

## 3. Supabase 백엔드 & 데이터베이스 구조

### 연결 정보 ([online.js](file:///c:/Users/user1/Desktop/개발/음악왕/online.js#L8-L9))
- **SUPABASE_URL**: `https://szafomntmenppcbczrwl.supabase.co`
- **SUPABASE_KEY (Publishable)**: `sb_publishable_msR49lWjgSJQnMQxSzIaug_XXlJUd4Z`
- **유저 인증 변환 규칙**: 닉네임 기반 로그인을 구현하기 위해 `nicknameToEmail(nick)`에서 닉네임을 16진수(hex)로 인코딩해 `u_<hex>@musicking.com` 이메일로 `supabase.auth`에 가입/로그인합니다. (닉네임 최소 2자, 비밀번호 최소 6자)

### 사용 테이블 & 특수 JSONB 저장 규약

1. **`profiles`**
   - 컬럼: `id` (uuid, auth.users.id), `nickname`, `bio`, `cd_coins`, `avatar_config` (jsonb), `owned_items` (jsonb), `updated_at`
   - **⚠️ 중요 — EXP · 랭킹 달성 · 대전 전적 · 차단 목록 · 낚시터 일일 누적 무중단 저장 방식**:
     - DB 테이블에 별도 컬럼을 추가하지 않고 에러 없이 저장하기 위해 **`avatar_config` JSONB 내부에 다음 메타 필드를 함께 저장**합니다 ([syncProfileToServer](file:///c:/Users/user1/Desktop/개발/음악왕/online.js#L565-L587)):
       - `_exp`: 누적 경험치 (`number`)
       - `_claimedTopRanks`: `{ "behind_1": 1, ... }` 형태로 `(mode_stage)`별 보너스를 수령한 최고 순위
       - `_battleStats`: `{ "1v1": { wins, losses }, "4p": { wins, losses } }` 온라인 대전 전적·승률
       - `_blockedUsers`: `[{ id, nickname, blockedAt }]` 차단한 유저 목록 *(로컬 `mk_blocked_users_<uid>`와 병합 유지)*
       - `_fishingDaily`: `{ date: "YYYY-MM-DD", seconds, earnedExp, earnedCd }` 낚시터 일일 누적 기록 *(KST 오전 `06:00` 주기 기준)*
       - `_fishingLive`: `{ active, channelId, mode: "fg"|"bg", x, y, posTs, heartbeatAt, sessionTag }` 통합 서버 낚시터 실시간 로스터·위치 상태
     - 따라서 `syncProfileToServer()` 수정 시 반드시 `buildProfilePayloadConfig()`를 통해 `_exp`, `_claimedTopRanks`, `_battleStats`, `_blockedUsers`, `_fishingDaily`, `_fishingLive`를 함께 유지해야 합니다.
   - **⚠️ 특수 시스템 행 (`nickname === "__ADMIN_CONFIG__"`)**:
     - [admin.html](file:///c:/Users/user1/Desktop/개발/음악왕/admin.html)에서 수정한 글로벌 상점 카탈로그와 문제 오버라이드를 저장하는 공용 설정 행입니다.
     - `avatar_config`: `{ shopCatalog: AVATAR_SHOP_ITEMS, catalogVersion: SHOP_CATALOG_VERSION }`
     - `owned_items`: 수정/추가/`_deleted: true` 처리된 문제 배열
     - **주의**: 서버 카탈로그의 `catalogVersion < SHOP_CATALOG_VERSION` (현재 `12`)인 구버전 데이터는 무시하여 최신 시세 및 신규 아이템이 덮어씌워지지 않도록 방어되어 있습니다 ([applyServerShopCatalog](file:///c:/Users/user1/Desktop/개발/음악왕/pixel_avatar.js#L232-L248)).

2. **`rankings`**
   - 컬럼: `user_id`, `nickname`, `avatar_config`, `decade_filter`, `game_mode` (`behind` | `lyrics` | `onesec`), `stage` (`1` | `2` | `3`), `question_limit`, `time_attack`, `score`, `accuracy`
   - **랭킹 & 프로필 저장**: `dedupeRankingRows()`([online.js](file:///c:/Users/user1/Desktop/개발/음악왕/online.js#L961-L1025)), `syncProfileToServer()`([online.js](file:///c:/Users/user1/Desktop/개발/음악왕/online.js#L556-L577)), **`delete_my_account()` RPC** ([handleDeleteAccount / submitExternalDeleteAccount](file:///c:/Users/user1/Desktop/개발/음악왕/online.js#L776-L867)) — 로그인 하단 `?page=privacy` / `?page=delete` 딥링크 라우팅 포함([getRequestedLegalAction](file:///c:/Users/user1/Desktop/개발/음악왕/online.js#L417-L441))

3. **`friendships`**
   - 컬럼: `id`, `requester_id`, `receiver_id`, `status` (`pending` | `accepted`)
   - 이미 `accepted` 상태인 친구의 프로필(`userInspectModal`)을 열면 `➕ 친구 신청` 버튼을 숨기고 `💬 DM 보내기` 버튼으로 전환됩니다.

4. **`direct_messages`**
   - 컬럼: `id`, `sender_id`, `receiver_id`, `content`, `created_at`
   - 실시간 구독(`postgres_changes`) + 폴백 폴링(채팅창 내부 4초, 전역 알림 8초) 병행

5. **`rooms`**
   - 컬럼: `id`, `title`, `host_id`, `room_type` (`1v1` | `4p`), `game_config` (`{ decade, mode, stage }`), `status` (`waiting` | `playing` | `finished`), `players` (jsonb array, `{ id, nickname, score, passQ }`), `current_q_index`, `question_ids` (jsonb array)
   - **WebSocket 끊김 대비 폴링**: `subscribeToBattleRoom()`에서 5초 주기(`roomPollTimer`)로 DB `rooms` 상태를 폴링해 무제한 대기·대전 중 동기화를 유지합니다.
   - **라운드 전환 & 패스**: `passOnlineBattleQuestion()` 호출 시 전원(`passQ === curIdx`)이 패스하면 정답 토스트 표시 후 다음 라운드로 자동 넘어가며, 라운드 변경·종료 시 입력창(`#battleArtistInput`, `#battleTitleInput`)을 자동 초기화합니다.
   - **방 자동 삭제**: `leaveBattleRoom()` 시 남은 인원이 `0명`이면 즉시 `rooms` 테이블에서 해당 방을 삭제(`delete`)합니다.

6. **`user_reports` (신고 내역) & RPC `delete_my_account()` (회원탈퇴)**
   - **`user_reports`**: `id`, `reporter_id`, `target_id`, `target_nickname`, `reason`, `created_at` (일반 로그인 유저 `INSERT` 허용 + 닉네임 `"관리자"` 계정만 `SELECT` 허용하는 RLS 정책 적용 — [admin.html](file:///c:/Users/user1/Desktop/개발/음악왕/admin.html#L248-L260) 4번째 탭에서 바로 조회 가능)
   - **`delete_my_account()` RPC (`SECURITY DEFINER`)**: 로그인 본인(`auth.uid()`)의 `direct_messages`, `friendships`, `rankings`, `rooms`, `profiles` 및 `auth.users`까지 서버 측에서 일괄 완전 삭제하므로 탈퇴 후 동일 닉네임 재가입 가능([handleDeleteAccount](file:///c:/Users/user1/Desktop/개발/음악왕/online.js#L776-L867)).

---

## 4. 화면 구성 (14개 전체화면 + 주요 모달)

`switchScreen(targetId, opts)`가 모든 화면 전환의 단일 진입점입니다 ([app.js](file:///c:/Users/user1/Desktop/개발/음악왕/app.js#L969-L1049)).

| 화면 ID | 설명 | 상단 헤더 | BGM 상태 |
| :--- | :--- | :---: | :--- |
| `loginScreen` | 대형 3D 칼각 도트 `"음악왕"` 로고 + 아이디 저장/자동로그인 + 회원가입 시 성별 모달 + 하단 `[개인정보처리방침]`·`[계정 탈퇴/삭제 요청]` 링크 | 숨김 | `main.mp3` |
| `homeScreen` | 카드 모서리 좌(`?`)·우(`🔔`)·우하(`🔊`) 정렬 + 타이틀·`16:10` 와이드 직사각형 배경·EXP 바·**하단 2×3 버튼 도크(1행 `🎯 싱글 플레이` · `⚔️ 멀티 플레이` · `🎣 낚시터(초록)` / 2행 `상점·랭킹·친구(흰색)`) 밀착 배치** + **최하단 쿠팡 파트너스 `320×50` 배너(`#homeAdBannerSlot`) & 대가성 안내 문구** | 표시 | `main.mp3` |
| `fishingScreen` | **전용 방치형 소셜 낚시터 (`fishing_room_1`)**: 입·퇴장 2초 흰 배경 바운스 캐릭터 로딩(`#fishingLoadingOverlay`), 상단 호수 캔버스·스탠딩 캐릭터(바닥 터치 스무스 이동)·중앙 상단 06:00 초기화 누적타이머·우상단 경험치(+1,000)/CD(+3,000) 체력바·반투명 접속자 리스트 + 하단 휘발성 실시간 채팅 & 5초 fade-out 말풍선 | 숨김 | **`fish.mp3`** |
| `shopScreen` | 액션퍼즐패밀리풍 7개 탭 상점 (입어보기 ➔ 단일/다중 선택 구매·장착 + 배경 실시간 미리보기 + 고스트 스크롤) | 숨김 | `shop.mp3` |
| `setupScreen` | 싱글 게임 설정 (**최상단 `[🎲 랜덤 플레이]` 10문제 즉시 시작** + 연대/모드/단계/문제수/타임어택/하드모드) | 표시 | `main.mp3` |
| `gameScreen` | 싱글 퀴즈 진행 (**전자 미디 다크 스튜디오 테마** 자동 적용) | 표시 | **정지(무음)** |
| `judgeScreen` | 문제별 정/오답 해설 & 앨범 커버 & 10초 미리듣기 | 표시 | **정지(무음)** |
| `resultScreen` | 최종 점수표 + 도전자 닉네임 + 이미지 캡처 공유 + 보상 정산 모달 | 표시 | **정지(무음)** |
| `plazaScreen` | 멀티 대기실 (생성된 방 목록 + 대기실 접속 유저 캐릭터 아이콘 리스트) | 표시 | `main.mp3` |
| `battleRoomScreen` | 온라인 대기방 (방 내부 캐릭터 맵 이동 + 말풍선 채팅 + 방장 시작 + 5초 DB 폴링) | 숨김 | `main.mp3` |
| `battlePlayScreen` | 온라인 대전 전용 플레이 화면 (**전자 미디 다크 스튜디오 테마**, 1초듣기/가사/비하인드 + `⏭️ 패스` 카운트 배지 + 라운드 플래시 토스트) | 숨김 | **정지(무음)** |
| `rankingScreen` | 실시간 명예의 전당 TOP 20 (커스텀 칩 필터, 윈도우 select 미사용) | 숨김 | `main.mp3` |
| `socialScreen` | 카카오톡 스타일 전체화면 친구 목록 + 친구 추가/요청 | 숨김 | `main.mp3` |
| `dmChatScreen` | 카카오톡 스타일 전체화면 1:1 DM 채팅방 (노란/흰 말풍선 + 실시간) | 숨김 | `main.mp3` |

### 주요 모달 (`index.html` 16개 + `admin.html` 3개)
- `signupGenderModal`: 회원가입 버튼 클릭 시 뜨는 남/여 캐릭터 선택 모달 (성별 변경권 `10,000 CD` 안내 일치)
- *(관리자 백엔드 전용)* [admin.html](file:///c:/Users/user1/Desktop/개발/음악왕/admin.html) 내부에 **`songEditModal`**, **`mdImportModal`** 및 **`📦 스토어 출시 정보`** 탭(심사 제출 URL·패키지 ID·SHA-256·체크리스트) 탑재
- `multiModeSelectModal`: 홈 `[⚔️ 멀티 플레이]` 클릭 시 **`⚡ 1:1 선착순 대결`** / **`🏆 4인 점수제 대결`** 선택 후 해당 필터 대기실(`#plazaScreen`)로 이동
- `privacyPolicyModal` / `externalDeleteModal`: 로그인 하단 링크 및 `?page=privacy`, `?page=delete` URL로 바로 열리는 개인정보처리방침 & 웹 외부 본인인증 탈퇴 모달
- `blockedUsersModal`: 환경설정 내 `[🚫 차단한 유저 목록 관리]` 차단 해제 모달
- `profileModal`: 좌측 상단 투명 닉네임(전체 표기) 클릭 시 열리는 내 프로필·통산 전적·1:1/4인 승률·EXP
- `userInspectModal`: 타 유저 프로필·통산 전적·1:1/4인 승률(내 프로필과 동일 UI, 친구면 `💬 DM 보내기` 전환)
- `shopMultiBuyModal`: 여러 미구매 아이템을 동시에 입어본 뒤 구매할 때 뜨는 체크박스 선택 일괄 구매·총합 확인 모달
- `patchNotesModal`: 우측 상단 `📢` 버튼 클릭 시 뜨는 버전별 업데이트 내역
- `settingsModal`: 볼륨, 폰트 토글, 전체화면 전환, 관리자 페이지(아이디 `"관리자"` 전용), 로그아웃
- `createRoomModal`: 방 만들기 전 연대·모드·단계 선택
- `titlesModal`: 1~20레벨 타이틀 & 필요 경험치 도감 (`📜 타이틀` 또는 캐릭터 위 타이틀 클릭)
- `rewardSummaryModal`: 게임 종료 시 뜨는 CD/EXP 정산 + % 상승 애니메이션 + TOP 3 폭죽 + **`닫기`** 버튼
- `dmNotiModal`: 우측 상단 `🔔` 종 버튼 클릭 시 뜨는 도착한 DM 미리보기
- `howToPlayModal`: 좌측 상단 `?` 버튼 클릭 시 뜨는 게임 방법 안내
- `customDialogModal`: 브라우저 기본 `alert`/`confirm`/`prompt`를 대체하는 공용 게임 모달

---

## 5. 게임 규칙 · 보상 · 20레벨 경험치 테이블

### 1) 점수 · CD · 경험치(EXP) 규칙
- **싱글 정답 점수**: 기본 `+100점`, 3단계 `+20점` 추가, 타임어택(15초) ON 시 `×2배`, 힌트 사용 시(`글자수 -15`, `단어 -15`, `노래 -20`) 차감
- **CD 보상**: 싱글 `Math.max(정답 > 0 ? 5 : 0, Math.floor(score / 10))`, 멀티 우승 `30 CD` / 참여 득점 `10 CD`
- **기본 경험치(EXP)**: `Math.round(score * 0.1)` (싱글·멀티 공통)
- **랭킹 TOP 3 1회성(최초 진입/순위 갱신) EXP · CD 동시 보너스 & 폭죽 파티클** ([checkAndProcessGameRewards](file:///c:/Users/user1/Desktop/개발/음악왕/online.js)):
  - 게임 종료 직후 해당 `(모드 + 단계)` 랭킹을 **유저별 최고 기록 기준**으로 집계하여, 내가 해당 순위(또는 더 높은 순위)에 **방금 처음으로 도달/갱신한 순간(1회)** 에만 기본 EXP와 기본 CD에 **동시에** 배율이 적용됩니다:
    - 🥇 **1위**: 기본 EXP · 기본 CD **×5배** + 폭죽 파티클
    - 🥈 **2위**: 기본 EXP · 기본 CD **×3배** + 폭죽 파티클
    - 🥉 **3위**: 기본 EXP · 기본 CD **×2배** + 폭죽 파티클
- **랭킹 상단 대형 포디엄 & 내 순위 배너** ([online.js](file:///c:/Users/user1/Desktop/개발/음악왕/online.js)):
  - `#rankingScreen` 최상단 중앙에 선택한 `(모드 + 단계)` 기준 **2위–1위–3위 대형 포디엄 카드**와 현재 나의 실시간 순위 배너를 노출하며, 4위 이하 전체 목록도 하단에 이어집니다.
  - 이후 `rewardSummaryModal`에서 **닫기** 버튼을 누르면 폭죽과 정산 창이 닫히고 결과표(`#resultScreen`)를 캡처·공유(`#finalPlayerBadge` 내 아이디 표기 포함)할 수 있습니다.

### 2) 1~20레벨 경험치 & 타이틀 테이블 (`EXP_LEVEL_TABLE`)
| 레벨 | 누적 필요 EXP | 구간 EXP | 타이틀 이름 |
| :---: | ---: | ---: | :--- |
| **Lv.1** | 0 | 1,000 | 🐣 방구석 리스너 |
| **Lv.2** | 1,000 | 1,500 | 🎧 이어폰 유망주 |
| **Lv.3** | 2,500 | 2,000 | 🎵 흥얼대는 루키 |
| **Lv.4** | 4,500 | 2,500 | 🎤 코인노래방 단골 |
| **Lv.5** | 7,000 | 3,000 | 📻 심야 라디오 DJ |
| **Lv.6** | 10,000 | 4,000 | 🎸 홍대 인디 루키 |
| **Lv.7** | 14,000 | 5,000 | 🥁 리듬 비트메이커 |
| **Lv.8** | 19,000 | 6,000 | 💿 음반 콜렉터 |
| **Lv.9** | 25,000 | 7,000 | 🎹 스튜디오 세션맨 |
| **Lv.10** | 32,000 | 8,500 | 🌟 데뷔 직전 연습생 |
| **Lv.11** | 40,500 | 10,000 | 📺 음방 1위 후보 |
| **Lv.12** | 50,500 | 11,500 | 💃 떼창 엔딩요정 |
| **Lv.13** | 62,000 | 13,000 | 🏆 골든디스크 신인왕 |
| **Lv.14** | 75,000 | 15,000 | 🔊 음원차트 올킬러 |
| **Lv.15** | 90,000 | 17,000 | 🎙️ 고척돔 매진 보컬 |
| **Lv.16** | 107,000 | 19,500 | 🎼 천재 히트 작곡가 |
| **Lv.17** | 126,500 | 22,000 | 🌍 빌보드 핫100 스타 |
| **Lv.18** | 148,500 | 24,500 | ⚡ 1초 컷 가요 마스터 |
| **Lv.19** | 173,000 | 27,000 | 💎 살아있는 K-POP 백과 |
| **Lv.20** | **200,000** | MAX | 👑 대한민국 전설의 음악왕 |

---

## 6. 캐릭터 · 상점(v13 카탈로그) & 사운드(BGM/SFX) 규격

### 캐릭터 & 상점 시스템 ([pixel_avatar.js](file:///c:/Users/user1/Desktop/개발/음악왕/pixel_avatar.js))
- **정배율 · 16:10 와이드 직사각형 홈 배경 & 최소 480×480+ 고해상도 렌더링**: `#homeScreen`의 `.home-wide-stage`는 가로 100% `16:10` 직사각형(`aspect-ratio: 16 / 10; min-height: 152px; max-height: min(246px, 29dvh);`) 비율로 배경 일러스트 좌우 디테일 전체가 시원하게 노출되며, `#loginScreen` / `#signupGenderModal`의 `.home-wide-stage`는 기존 고정 높이 직사각 비율(`flex: 0 0 auto`)을 유지합니다. `renderPixelAvatar` 내부에서도 CSS 비율과 맞추면서 단변 최소 `480px`(목록 소형 아이콘은 `280px`) 및 고DPR(`2~3x`)을 보장하고, 상점 상단 스테이지(`#shopBgCanvas`)에도 선택한 배경 풀 일러스트를 실시간 렌더링합니다.
- **상점 시세 & 보유 수 (`SHOP_CATALOG_VERSION = 13`)**:
  - `🏞️ 배경 (bg)`: **12종** (`0 ~ 2,000 CD`) — *해변·골목·지하실·구름 신규 4종 포함, 전종 타일 미니 일러스트화*
  - `💇 헤어 (hair)`: **15종** (`0 ~ 1,100 CD`) — *바가지/금발/쉼표/양갈래 3종/포니테일/불꽃샤기컷/실버펌/만두/삐삐 등 15종 전부 개별 앞·뒷머리 실루엣 & 엔젤링 고디테일화*
  - `🎧 모자 (hat)`: **20종** (`0 ~ 2,000 CD`) — *구름모자·태양모자·별 모자·파티모자·펑키스타일·트리 모자 6종 신규*
  - `👓 얼굴 (face)`: **19종** (`0 ~ 1,500 CD`) — *기존 "표정" ➔ "얼굴" 개명, 중복 `열창 표정` 제거(`default` 자동 폴백), `심쿵 윙크` 아이콘 버그 수정, 터프 수염·산타 수염·상처·잠자리안경·개구리 눈·가면 6종 신규*
  - `🎸 악기 (acc)`: **20종** (`0 ~ 1,800 CD`) — *해골·키보드·선풍기·스노우보드·X-Mas 선물 5종 신규*
  - `👕 의상 (outfit)`: **15종** (`0 ~ 1,800 CD`) — *배관공·5살유치원·파자마·노란네모·방울고양이·드레스 6종 신규, 전종 소매·장갑·신발·패턴 디테일화*
  - `🎣 낚싯대 (fishing_rod)`: **4종** (`avatarConfig.fishingRod` 저장, 낚시터 경험치 버프) — *나무 낚싯대(C, 5,000 CD, +5%), 카본 낚싯대(B, 10,000 CD, +10%), 루비 낚싯대(A, 20,000 CD, +20%), 황금 낚싯대(S, 30,000 CD, +30%)*
  - `🪱 미끼 (fishing_bait)`: **4종** (`avatarConfig.fishingBait` 저장, 낚시터 CD 버프) — *지렁이 미끼(C, 4,000 CD, +10%), 새우 미끼(B, 8,000 CD, +20%), 루어 미끼(A, 16,000 CD, +30%), 황금 떡밥(S, 24,000 CD, +50%)*
  - `🎫 변경권 (special)`: **닉네임 변경권 `5,000 CD`**, **성별 변경권 `10,000 CD`**
- **캐릭터 하단 낚시터 인벤토리 2슬롯 & 선택 일괄 구매** ([index.html](file:///c:/Users/user1/Desktop/개발/음악왕/index.html#L176-L196), [online.js](file:///c:/Users/user1/Desktop/개발/음악왕/online.js#L1085-L1290)):
  - 상점 캐릭터 아래에 `#shopInvRodSlot` · `#shopInvBaitSlot` 인벤토리 슬롯을 배치하여 현재 실제 착용 여부(`착용중(+버프%)` / `미착용`)를 즉시 확인하고 터치 한 번으로 해당 탭 이동·장착 해제가 가능합니다.
  - 피팅룸에서 여러 미구매 아이템을 입어본 상태에서 구매를 누르면 `shopMultiBuyModal`이 떠서 체크박스로 원하는 항목만 골라 결제할 수 있으며(`AVATAR_CONFIG_KEY_BY_CAT` 매핑), `sanitizeAvatarConfigToOwned()`가 미구매 미리보기 파츠 및 삭제된 구형 `face("singing")`을 자동 정리합니다.
- **상점 고스트 스크롤 & 탭**:
  - 9개 탭이 좁은 화면에서도 짤리지 않도록 9열 균등 그리드(`.apf-tab-bar`) + 2줄 아이콘·라벨 스택 적용
  - `#shopItemsGrid`는 스크롤할 때(`.is-scrolling`)만 얇은 흰색 스크롤바가 나타납니다 ([app.js](file:///c:/Users/user1/Desktop/개발/음악왕/app.js#L64-L74), [style.css](file:///c:/Users/user1/Desktop/개발/음악왕/style.css#L585-L621)).
- **신규 아이템 추가 시 주의**: `BASE_AVATAR_SHOP_ITEMS`에 아이템을 추가할 때는 **반드시** [pixel_avatar.js](file:///c:/Users/user1/Desktop/개발/음악왕/pixel_avatar.js)의 `drawDetailedInstrument()` / `renderApfWideBackground()` / `drawHairBack()` / `drawHairFront()` / `drawDetailedOutfit()` / `drawDetailedFace()` / `drawDetailedHat()` 및 `renderItemThumbnail()`에 해당 `id` 드로잉 분기를 함께 작성하고 `SHOP_CATALOG_VERSION`을 올리세요.

### 링크 공유 OG 메타태그 ([index.html](file:///c:/Users/user1/Desktop/개발/음악왕/index.html#L15-L31))
- `og:title` (`"음악왕"`), `og:description` (`"1초 듣고 맞추는 짜릿한 음악 퀴즈!"`), `og:image` (`https://dg1682-commits.github.io/MUSICKING/icons/icon-512.png`, `512×512`) 및 `twitter:card`가 등록되어 있습니다.
- 카카오톡 등은 링크 썸네일을 자체 캐싱하므로 이미지·문구 변경 배포 후 즉시 새 미리보기가 안 뜰 경우 카카오 디벨로퍼스 URL 캐시 초기화를 1회 실행하면 즉시 갱신됩니다.

### 사운드(BGM & 효과음) 및 1초 듣기 규격 ([app.js](file:///c:/Users/user1/Desktop/개발/음악왕/app.js#L724-L905))
- **`bgm/main.mp3`** (volume `0.22`, loop): `loginScreen`, `homeScreen`, `setupScreen`, `plazaScreen`, `battleRoomScreen`, `rankingScreen`, `socialScreen`, `dmChatScreen`에서 **이미 재생 중이면 끊기지 않고 계속 유지**됩니다.
- **`bgm/shop.mp3`** (volume `0.22`, loop): `shopScreen` 전용 배경음
- **`bgm/fish.mp3`** (volume `0.22`, loop): `fishingScreen` 전용 배경음 *(우측 음소거 또는 낚시터 상단 `#fishingSoundBtn`으로 ON/OFF 동기화)*
- **무음 화면**: `gameScreen`, `judgeScreen`, `resultScreen`, `battlePlayScreen` 진입 시 모든 BGM 일시정지
- **백그라운드/종료 시 완전 차단**: `visibilitychange`(`document.hidden === true`) 및 `pagehide`, 앱 종료(`performCleanAppExit()`) 시 모든 BGM·클릭음·미리듣기를 즉시 정지하며, 종료 시에는 리소스 해제 및 `#appExitedOverlay`로 덮어 좀비 BGM·로그인 회귀를 원천 차단합니다([app.js](file:///c:/Users/user1/Desktop/개발/음악왕/app.js#L265-L300), [L883-L905](file:///c:/Users/user1/Desktop/개발/음악왕/app.js#L883-L905)). 단, `fishingScreen`에 머무른 채 백그라운드로 내려간 경우 BGM만 끄고 `advanceFishingClockTo(Date.now())` + 서버 동기화로 경과 시간이 유지됩니다(다른 화면·종료 시 정지).
- **`bgm/click.wav`** (volume `0.45`, 4채널 라운드로빈 풀): 버튼·칩·타일·리스트 클릭 시 즉시 효과음 재생 *(단, 싱글/온라인 대전 **`1초 듣기`(`onesec`)** 시작·재도전·플레이·정답공개 전환 시에는 음원 충돌 방지를 위해 무음 처리, 타임어택 타이머는 그대로 유지)*
- **`1초 듣기` 자동재생 · 결과표 미리듣기 · 출처 표기**: 싱글(`loadCurrentQuestion`, [app.js](file:///c:/Users/user1/Desktop/개발/음악왕/app.js#L1211-L1215)) 및 온라인 대전(`renderBattlePlayScreen`, [online.js](file:///c:/Users/user1/Desktop/개발/음악왕/online.js#L2860-L2865))의 `1초 듣기` 라운드 진입 시 `playAudioSnippet()`으로 자동재생(차단 시 팝업 없이 상태 안내 후 수동 재청취 가능)되며, 두 플레이어 하단에 iTunes/Apple Music 출처 문구(`.itunes-source-credit`)를 작게 표기합니다. 싱글 결과표(`#historyList`) 각 행에서도 `[▶ 듣기 / ⏹ 정지]` 토글(`toggleResultSongPreview`)로 앱 내 15초 하이라이트 재생이 가능합니다.
- **음소거 토글**: `floatingSoundBtn` (`.app-shell` 내부, `loginScreen`, `homeScreen`, `rankingScreen`, `shopScreen`, `socialScreen` 노출 — `homeScreen`에서는 `.home-hero` 우측 하단 모서리 안쪽 위로 올려 쿠팡 배너와 터치가 겹치지 않도록 자동 정렬) 클릭 시 `localStorage` `mk_bgm_muted` 저장 및 BGM·클릭음 일괄 제어

---

## 7. PWA · PWABuilder APK · iOS Safari 홈화면 설치 안내

- **Android 패키지명**: `io.github.dg1682_commits.twa` ([.well-known/assetlinks.json](file:///c:/Users/user1/Desktop/개발/음악왕/.well-known/assetlinks.json#L5))
- **서명 SHA-256 지문**: `9C:BB:08:16:F2:E7:CC:3F:37:64:47:13:50:4A:8E:F4:44:CA:C2:BB:94:94:E0:D7:C5:DF:7C:01:CC:6C:30:27`
- **APK 서명 키 파일 (`signing.keystore`, `signing-key-info`)**: 사용자 로컬 다운로드 폴더(`음악왕 - Google Play package`)에 보관 중. 추후 플레이스토어 업데이트나 APK 재서명 시 동일 키가 필요하므로 분실 금지!
- **iOS + Android 통합 앱 설치 배너 (`#smart-pwa-banner`)**: 이미 APK(TWA)나 홈 화면 앱(Standalone/Fullscreen) 상태로 실행 중이면 숨겨지며, 일반 모바일 웹 접속 시 ① **iOS Safari**에는 하단 `[공유 📤] ➔ [홈 화면에 추가 ➕]` 안내를, ② **갤럭시(Android Chrome/삼성 인터넷)**에는 `beforeinstallprompt`를 가로채 **`⚡ 지금 앱 바로 설치하기`** 원클릭 OS 설치 팝업 버튼을 띄웁니다(닫기 시 24시간 숨김, `.app-shell`은 `env(safe-area-inset-top/bottom)` 적용, `<meta name="apple-mobile-web-app-title" content="음악왕">`, 아이콘은 `icons/icon-192.png`).
- **Service Worker 전략 ([sw.js](file:///c:/Users/user1/Desktop/개발/음악왕/sw.js))**:
  - 같은 출처 HTML/CSS/JS는 **Network-First**(온라인이면 항상 최신 GitHub Pages 버전 받아오고 실패 시에만 캐시 사용)
  - 외부 API(`supabase.co`, `itunes.apple.com`, `cdn.jsdelivr.net`)는 캐시하지 않고 네트워크 직통

---

## 8. 🚨 핵심 주의사항 & 과거 버그 방지 가이드 (필독!)

다음 Antigravity 세션에서 작업할 때 아래 규칙을 반드시 지켜야 기존 버그가 재발하지 않습니다.

1. **캐시 버전(`?v=X.X`) 3곳 동시 업데이트 필수**
   - `style.css`, `data.js`, `pixel_avatar.js`, `online.js`, `fishing.js`, `app.js` 중 하나라도 수정했으면:
     1) [index.html](file:///c:/Users/user1/Desktop/개발/음악왕/index.html)의 CSS/JS `?v=` 쿼리 스트링
     2) [admin.html](file:///c:/Users/user1/Desktop/개발/음악왕/admin.html)의 CSS/JS `?v=` 쿼리 스트링
     3) [sw.js](file:///c:/Users/user1/Desktop/개발/음악왕/sw.js)의 `CACHE_NAME` 및 `APP_SHELL_FILES`
     이 **3곳의 버전 숫자를 모두 똑같이 올린 뒤** GitHub에 반영하세요. 안 그러면 모바일 크롬/APK가 구버전 JS를 계속 캐시해 오류가 납니다.

2. **GitHub 업로드 시 숨김 파일(`.nojekyll`, `.well-known/assetlinks.json`) 누락 해결법**
   - GitHub 웹사이트의 **`Upload files`(드래그&드롭)** 기능은 점(`.`)으로 시작하는 숨김 파일/폴더(`.nojekyll`, `.well-known/`)를 보안상 자동으로 무시하고 올리지 않습니다. *(PC 로컬 폴더 안에는 이미 안전하게 존재합니다.)*
   - **영구 해결 방법**:
     1) GitHub 저장소 웹에서 **딱 1번만** `Add file` ➔ **`Create new file`**로 `.nojekyll` 과 `.well-known/assetlinks.json`을 직접 생성·커밋해 두면, 이후 다른 일반 파일만 드래그&드롭으로 덮어써도 GitHub 서버의 두 점(`.`) 파일은 지워지지 않고 유지됩니다.
     2) 또는 Git CLI / GitHub Desktop으로 `git push` 하면 로컬의 `.nojekyll`과 `.well-known/` 폴더도 한 번에 같이 업로드됩니다.
     3) *(참고)* 일반 PWA "홈 화면에 추가"는 `manifest.json`만으로 주소창 숨김이 동작하며, `.well-known/assetlinks.json`은 Play 스토어용 TWA APK에서 주소창을 없애기 위해 GitHub 저장소에도 반드시 존재해야 합니다.

3. **모바일 키보드 올라올 때 허공 밀림 & 화면 찌그러짐(Viewport Resize) · 낚시터 고정 방지 규약 (`v10.27`)**
   - `<meta name="viewport">`의 `interactive-widget=overlays-content` ([index.html](file:///c:/Users/user1/Desktop/개발/음악왕/index.html#L133)) 및 `navigator.virtualKeyboard.overlaysContent = true` 유지
   - `html, body` 및 `.app-shell`의 `position: fixed; height: var(--app-locked-h, 100svh); overflow: hidden; overflow: clip;` 유지 ([style.css](file:///c:/Users/user1/Desktop/개발/음악왕/style.css#L73-L115))
   - `setupMobileKeyboardViewportHandler()`([app.js](file:///c:/Users/user1/Desktop/개발/음악왕/app.js#L112-L310))에서 가상 키보드 등장 시에도 `--app-locked-h` 고정 px 높이를 절대 줄이지 않고 `scroll` 이벤트 즉시 원복(`window.scrollTo(0, 0)`), 활성 채팅 입력 바(`#fishingInputBar`, `.kakao-chat-inputbar`, `.room-chat-inputbar`) 및 겹치는 `.answer-area`만 `--kb-height`/`env(keyboard-inset-height)`만큼 `translate3d`로 부양해 배경·낚시터 호수·헤더가 1px도 밀리거나 찌그러지지 않게 유지합니다.
   - **❌ 금지**: `document.activeElement.scrollIntoView()`를 전역으로 호출하거나 `interactive-widget=resizes-content` · `100dvh`로 레이아웃을 리사이즈하면 원스토어 인앱 웹뷰/안드로이드에서 전체 화면이 위로 밀리며 UI가 찌그러지므로 절대 재도입 금지!

4. **물리 뒤로가기 & `requestFullscreen()` 규약**
   - 로그인 완료/자동로그인 시 `showHome({ replaceHistory: true })`로 로그인 화면 기록을 덮어쓰고, 사용자 터치 제스처가 확보되는 즉시 `armAppBackGuard()`([app.js](file:///c:/Users/user1/Desktop/개발/음악왕/app.js#L209-L285))가 단일 가드 엔트리(`{ mkRole: "app_guard" }`)를 유지해 **Chrome History Manipulation Intervention에 스킵되지 않고** `homeScreen` 뒤로가기 시 종료 확인 창을 띄웁니다. `[취소]` 시에만 가드를 재설정하며 `[확인]` 시 오디오 해제·종료 화면 오버레이·`window.close()`/`history.back()`으로 깔끔히 종료합니다.
   - 화면/버튼을 터치할 때 자동으로 `requestFullscreen()`을 걸면 안드로이드 크롬/APK 하단에 `"전체 화면을 종료하려면 위에서 드래그..."` 시스템 토스트가 계속 뜹니다. APK/홈 화면 앱은 `assetlinks.json` + `manifest.json`만으로 원래 주소창이 없으므로 자동 풀스크린 코드는 넣지 마세요. (설정 메뉴 수동 전환만 유지)

5. **관리자 페이지(`admin.html`) & MD 문제 일괄 추가 · 쿠팡 배너 주의사항**
   - 환경설정 내 백엔드 이동 버튼(`#settingsAdminMenuBtn`)은 `userState.nickname === "관리자"`일 때만 노출되며, `admin.html` 진입 시에도 세션 닉네임이 `"관리자"`가 아니면 메인으로 리다이렉트됩니다.
   - MD 문제 일괄 추가 버튼([admin.html](file:///c:/Users/user1/Desktop/개발/음악왕/admin.html#L152)) UI 및 파서(`data.js`)는 백엔드 페이지(`admin.html`) 내부에서만 접근 가능하며(메인 화면에는 버튼 없음), 기존 `1곡 직접 추가`와 구분되어 여러 곡 일괄 파싱·자동 마스킹·음원 매칭을 담당합니다.
   - **쿠팡 파트너스 배너(`#homeAdBannerSlot`, ID `1051148`)**: [index.html](file:///c:/Users/user1/Desktop/개발/음악왕/index.html#L134-146)에 `320×50` 캐러셀 배너와 공식 대가성 문구가 삽입되어 있으며, `relocateCoupangAdBanner()`([app.js](file:///c:/Users/user1/Desktop/개발/음악왕/app.js#L827-L837))가 다른 화면 노출을 방지합니다. 쿠팡 파트너스 계정 `[내 정보 ➔ 웹사이트 URL]`에 실제 배포 주소를 반드시 등록하고, 배너 클릭에 게임 보상(CD/EXP)을 연동하지 마세요.
   - `homeScreen` 활성화 시(`body.on-home-screen`) `syncHomeCornerFloatingButtons()`([app.js](file:///c:/Users/user1/Desktop/개발/음악왕/app.js#L840-L882))가 `#floatingDmNotiBtn` 을 `.home-hero` 우측 상단 모서리(`?` 와 대칭)에, `#floatingSoundBtn` 을 `.home-hero` 우측 하단 모서리 안쪽 위(하단 버튼·배너 모두 비겹침)에 자동 정렬합니다.

6. **보안·개발 환경 안내**
   - 회사/특정 작업 PC 정책에 따라 터미널(`run_command` / PowerShell) 실행이 제한된 환경에서는 파일 읽기/편집 도구(`read_file`, `edit_file`, `write_file`)만 사용해 작업할 수 있으며, 이 프로젝트는 빌드 과정이 없는 순수 HTML/CSS/JS 구조이므로 별도 터미널 없이도 모든 수정·유지보수가 가능합니다.

7. **GitHub 반영 시 체크해야 할 자산 & 숨김 파일**
   - `icons/icon-192.png`, `icons/icon-512.png`, `icons/icon-maskable-512.png`
   - `bgm/main.mp3`, `bgm/shop.mp3`, `bgm/fish.mp3`*(낚시터 BGM 직접 추가)*, `bgm/click.wav`
   - `.nojekyll` 및 `.well-known/assetlinks.json` *(웹 업로더가 아닌 `Create new file` 1회 생성 또는 Git/GitHub Desktop 푸시 권장)*
