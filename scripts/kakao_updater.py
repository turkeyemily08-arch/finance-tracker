"""
카카오톡 '나에게 보내기' 메시지를 읽어 가계부에 자동 추가하는 스크립트.
매일 오전 9시 Windows 작업 스케줄러로 실행됩니다.
"""

import os
import sys
import json
import time
import base64
import subprocess
import re
import uuid
from datetime import datetime, date
from pathlib import Path

import pyautogui
import pyperclip
import requests

# ── 설정 로드 ──────────────────────────────────────────────
SCRIPT_DIR = Path(__file__).parent
CONFIG_PATH = SCRIPT_DIR / "config.json"
LOG_PATH = SCRIPT_DIR / "updater.log"

def load_config():
    with open(CONFIG_PATH, encoding="utf-8") as f:
        return json.load(f)

def save_config(cfg):
    with open(CONFIG_PATH, "w", encoding="utf-8") as f:
        json.dump(cfg, f, ensure_ascii=False, indent=2)

def log(msg):
    ts = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    line = f"[{ts}] {msg}"
    print(line)
    with open(LOG_PATH, "a", encoding="utf-8") as f:
        f.write(line + "\n")

# ── 카카오톡 메시지 읽기 ───────────────────────────────────
def find_kakao_window():
    """카카오톡 창을 찾아서 활성화"""
    import ctypes
    import ctypes.wintypes

    EnumWindows = ctypes.windll.user32.EnumWindows
    EnumWindowsProc = ctypes.WINFUNCTYPE(ctypes.c_bool, ctypes.c_int, ctypes.c_int)
    GetWindowText = ctypes.windll.user32.GetWindowTextW
    GetWindowTextLength = ctypes.windll.user32.GetWindowTextLengthW
    IsWindowVisible = ctypes.windll.user32.IsWindowVisible

    handles = []
    def callback(hwnd, _):
        if IsWindowVisible(hwnd):
            length = GetWindowTextLength(hwnd)
            buf = ctypes.create_unicode_buffer(length + 1)
            GetWindowText(hwnd, buf, length + 1)
            if "카카오톡" in buf.value or "KakaoTalk" in buf.value:
                handles.append(hwnd)
        return True

    EnumWindows(EnumWindowsProc(callback), 0)
    return handles[0] if handles else None

def open_kakao_if_needed():
    """카카오톡이 실행 중이 아니면 실행"""
    hwnd = find_kakao_window()
    if not hwnd:
        log("카카오톡 실행 중...")
        kakao_paths = [
            r"C:\Program Files (x86)\Kakao\KakaoTalk\KakaoTalk.exe",
            r"C:\Program Files\Kakao\KakaoTalk\KakaoTalk.exe",
            os.path.expanduser(r"~\AppData\Local\Kakao\KakaoTalk\KakaoTalk.exe"),
        ]
        for p in kakao_paths:
            if os.path.exists(p):
                subprocess.Popen([p])
                time.sleep(5)
                break
    else:
        # 창 활성화
        import ctypes
        ctypes.windll.user32.ShowWindow(hwnd, 9)  # SW_RESTORE
        ctypes.windll.user32.SetForegroundWindow(hwnd)
        time.sleep(1)

def read_kakao_chat():
    """카카오톡 나에게 보내기 채팅 내용 읽기"""
    try:
        open_kakao_if_needed()
        time.sleep(2)

        # 카카오톡 창 찾기
        hwnd = find_kakao_window()
        if not hwnd:
            log("카카오톡 창을 찾을 수 없습니다.")
            return None

        import ctypes
        ctypes.windll.user32.SetForegroundWindow(hwnd)
        time.sleep(0.5)

        # 검색창 열기 (Ctrl+F)
        pyautogui.hotkey("ctrl", "f")
        time.sleep(0.8)

        # 검색어 입력 (나에게 보내기 = 자신의 이름)
        pyperclip.copy("나에게 보내기")
        pyautogui.hotkey("ctrl", "v")
        time.sleep(0.8)
        pyautogui.press("enter")
        time.sleep(1)
        pyautogui.press("escape")
        time.sleep(0.5)

        # 채팅방 내용 전체 선택 후 복사
        pyautogui.hotkey("ctrl", "a")
        time.sleep(0.3)
        pyautogui.hotkey("ctrl", "c")
        time.sleep(0.3)

        text = pyperclip.paste()
        if not text:
            log("채팅 내용을 읽지 못했습니다.")
            return None

        log(f"카카오톡 메시지 {len(text)}자 읽기 완료")
        return text

    except Exception as e:
        log(f"카카오톡 읽기 오류: {e}")
        return None

# ── Claude API로 파싱 ─────────────────────────────────────
PARSE_PROMPT = """
아래는 카카오톡 '나에게 보내기' 채팅 내용입니다.
오늘 날짜: {today}
마지막 처리 날짜: {last_processed}

규칙:
1. 마지막 처리 이후의 새 메시지만 추출하세요.
2. 금액이 포함된 메시지를 거래로 인식하세요.
3. 재원(source) 판단 기준:
   - "공과금" 명시 → 공과금
   - "복지포인트" 명시 → 복지포인트
   - 마트(이마트/홈플러스/롯데마트/코스트코/마트) → 공과금
   - 그 외 → 용돈
4. 카테고리 자동 판단:
   - 공과금 재원: 마트→"마트/장보기", 쿠팡+공과금→"쿠팡 공과금", 전기/가스/수도→"전기/가스/수도", 관리비→"관리비"
   - 용돈 재원: 식당/음식점→"식비/외식", 카페/커피→"카페/음료", 미용실/뷰티→"미용/뷰티", 교통→"교통비", 병원/약국→"의료/건강", 영화/문화→"문화/여가", 의류→"의류/쇼핑", 쿠팡(기타)→내용보고추정
   - 복지포인트 재원: 병원/약→"의료/건강(포인트)", 쇼핑→"쇼핑(포인트)", 그 외→"기타(포인트)"
5. "수입" 또는 "정산" 명시 시 type="income"
6. "/" 뒤는 메모로 처리

다음 JSON 배열만 출력하세요 (다른 텍스트 없이):
[
  {{
    "date": "YYYY-MM-DD",
    "type": "expense 또는 income",
    "source": "공과금/용돈/복지포인트/급여/정산",
    "category": "카테고리명",
    "description": "내용",
    "amount": 숫자,
    "memo": "메모 (없으면 빈 문자열)"
  }}
]

새 거래가 없으면 빈 배열 []을 출력하세요.

채팅 내용:
{chat_text}
"""

def parse_with_claude(chat_text, cfg, last_processed):
    """Claude API로 메시지 파싱"""
    import anthropic

    client = anthropic.Anthropic(api_key=cfg["anthropic_api_key"])
    today = date.today().isoformat()

    prompt = PARSE_PROMPT.format(
        today=today,
        last_processed=last_processed or "없음 (전체 처리)",
        chat_text=chat_text[-8000:],  # 최근 8000자만
    )

    response = client.messages.create(
        model="claude-sonnet-4-6",
        max_tokens=2000,
        messages=[{"role": "user", "content": prompt}],
    )

    raw = response.content[0].text.strip()
    # JSON 배열 추출
    match = re.search(r'\[.*\]', raw, re.DOTALL)
    if not match:
        log("파싱 결과에서 JSON을 찾을 수 없습니다.")
        return []

    parsed = json.loads(match.group())
    log(f"Claude 파싱 완료: {len(parsed)}건")
    return parsed

# ── GitHub 업데이트 ───────────────────────────────────────
def get_github_file(cfg, path):
    """GitHub에서 파일 내용과 SHA 가져오기"""
    url = f"https://api.github.com/repos/{cfg['github_owner']}/{cfg['github_repo']}/contents/{path}"
    headers = {"Authorization": f"token {cfg['github_token']}"}
    r = requests.get(url, headers=headers)
    r.raise_for_status()
    data = r.json()
    content = base64.b64decode(data["content"]).decode("utf-8")
    return json.loads(content), data["sha"]

def update_github_file(cfg, path, content, sha, message):
    """GitHub 파일 업데이트"""
    url = f"https://api.github.com/repos/{cfg['github_owner']}/{cfg['github_repo']}/contents/{path}"
    headers = {"Authorization": f"token {cfg['github_token']}", "Content-Type": "application/json"}
    body = {
        "message": message,
        "content": base64.b64encode(json.dumps(content, ensure_ascii=False, indent=2).encode()).decode(),
        "sha": sha,
    }
    r = requests.put(url, headers=headers, json=body)
    r.raise_for_status()
    log("GitHub 업데이트 완료")

def add_transactions_to_github(new_txs, cfg):
    """새 거래를 GitHub transactions.json에 추가"""
    data, sha = get_github_file(cfg, cfg["github_data_path"])

    existing_ids = {t["id"] for t in data["transactions"]}
    added = 0
    for tx in new_txs:
        tx["id"] = str(uuid.uuid4())
        if tx.get("description") and tx["id"] not in existing_ids:
            data["transactions"].append(tx)
            added += 1

    if added == 0:
        log("추가할 새 거래 없음")
        return 0

    data["settings"]["lastUpdated"] = date.today().isoformat()
    today_str = date.today().strftime("%Y.%m.%d")
    update_github_file(cfg, cfg["github_data_path"], data, sha, f"자동 업데이트: {today_str} ({added}건)")
    return added

# ── 메인 ──────────────────────────────────────────────────
def main():
    log("=" * 50)
    log("가계부 자동 업데이트 시작")

    cfg = load_config()

    if cfg.get("anthropic_api_key") == "여기에_Claude_API_키_입력":
        log("오류: config.json에 Anthropic API 키를 입력해주세요.")
        sys.exit(1)

    # 1. 카카오톡 메시지 읽기
    chat_text = read_kakao_chat()
    if not chat_text:
        log("카카오톡 메시지를 읽지 못했습니다. 종료.")
        sys.exit(1)

    # 2. Claude로 파싱
    last_processed = cfg.get("last_processed", "")
    new_txs = parse_with_claude(chat_text, cfg, last_processed)

    if not new_txs:
        log("새로운 거래 내역 없음")
    else:
        # 3. GitHub 업데이트
        added = add_transactions_to_github(new_txs, cfg)
        log(f"총 {added}건 가계부에 추가됨")

    # 4. 마지막 처리 시간 저장
    cfg["last_processed"] = datetime.now().isoformat()
    save_config(cfg)
    log("완료")

if __name__ == "__main__":
    main()
