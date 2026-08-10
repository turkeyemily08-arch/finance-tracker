# finance-tracker — 작업 규칙 (Claude는 작업 전 반드시 읽을 것)

이 저장소는 사용자의 **개인 가계부 앱**입니다. 사용자가 데이터·버전 문제로 크게 고생한 적이 있어,
아래 규칙을 **반드시** 지켜야 합니다. 어느 계정·어느 컴퓨터에서 작업하든 동일하게 적용됩니다.

## 🔒 현재 상태: "승인본"으로 잠겨 있음 (깨지 말 것)
- **승인본 = 거래 167건** (3/1~6/14), **메모는 원본 그대로** 유지.
  - 예시: 쿠팡(2026-06-13, 13,990원) 메모 = `오빠 선크림` / 이체 메모 `이민구 → 내 신한계좌` 등.
- `main`·`gh-pages`·로컬이 이 버전으로 정렬돼 있고, 사용자가 직접 **"이게 맞다"고 승인**함.
- **자동배포 워크플로우 켜져 있음** (`.github/workflows/deploy.yml`, 2026-08-10부터): `main`에 push되면
  GitHub Actions가 자동으로 build → `gh-pages` 브랜치에 배포함. `npm run deploy`를 수동으로 안 돌려도 됨.
  (이 설정은 세션·캐시가 날아가도 리포에 파일로 남아있으니 계속 유지됨.)
- **Firestore → GitHub 자동 백업 켜져 있음** (`.github/workflows/sync-transactions.yml`, 2026-08-10부터):
  3시간마다 `scripts/sync-transactions.mjs`가 실시간 DB(Firestore `households/kyuri` 오버레이:
  patches/additions/deletions)를 읽어 `public/data/transactions.json`에 병합·커밋함(변경 있을 때만,
  `github-actions[bot]` 커밋으로). **그래서 167건이던 거래 수가 시간이 지나며 자연스럽게 늘어나는 건
  정상**이다 — 이게 바로 이 자동화의 목적(폰/PC에서 입력한 게 유실 없이 GitHub에도 쌓이는 것)이니
  "버전이 깨졌다"고 오판해 되돌리지 말 것. (단, 이 스크립트는 memo→description 합치기 같은 UI 표시용
  변환은 절대 하지 않고 patches/additions/deletions만 그대로 반영하도록 만들어져 있음 — 수정 시 이 원칙
  유지할 것.)

## ❌ 절대 하지 말 것
1. **버전을 통째로 바꾸지 말 것.** 위 자동 백업으로 늘어난 게 아니라 갑자기 건수가 큰 폭으로 줄거나
   전혀 다른 내용(메모·금액)으로 바뀐 데이터로 `main`이나 `gh-pages`를 덮어쓰지 말 것.
2. **메모·재원·카테고리를 임의로 정리/변경하지 말 것.** 사용자가 콕 집어 요청한 항목만 수정.
3. **옛 백업 파일로 "복원"하지 말 것**(전체 덮어쓰기 → 사고남).
4. 사용자가 명시적으로 "버전 바꿔도 돼"라고 하기 전엔 위 잠금을 유지.

## ✅ 수정 요청을 받으면 (순서)
1. **먼저 최신본 받기**: `git pull origin main` (사용자가 사이트에서 입력한 게 쌓여 있을 수 있음).
2. **요청한 부분만** 정확히 수정 (데이터는 `public/data/transactions.json`).
3. **라이브 반영**: `main`에 push하면 GitHub Actions가 자동으로 build·배포함 (수동 `npm run deploy` 불필요).
   배포 진행 상황은 `gh run list --repo turkeyemily08-arch/finance-tracker` 로 확인 가능.
4. 사용자에게 안내: **다른 기기/브라우저는 처음 한 번 `Ctrl+Shift+R`(강력 새로고침)** 필요.
   (원격 브라우저 캐시는 지워줄 수 없음. 이 버전의 서비스워커는 HTML·JSON을 항상 새로 받으므로
   한 번 정리되면 그 뒤로는 안정적임.)

## 참고
- 데이터 단위: 거래 1건 = `{id, date, type, source, category, paymentMethod, amount, memo, description}`.
  `id`는 `tx-YYYYMMDD-NNN` 형식.
- 화면에서 "내용" 칸 = `description`, "메모" 칸 = `memo`.
- 이전에 밀어낸 171건 버전은 git 히스토리 `6ee4d56`에 보관(필요 시 사용자 확인 후에만 사용).
