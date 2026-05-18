"""
카카오톡 '나에게 보내기' 메시지를 읽어 가계부에 자동 추가하는 스크립트.
매일 오전 9시 Windows 작업 스케줄러로 실행됩니다. (무료 - 외부 API 불필요)
"""

import os
import sys
import json
import time
import re
import uuid
import base64
import subprocess
import ctypes
from datetime import datetime, date
from pathlib import Path

import pyautogui
import pyperclip
import requests

# ── 설정 로드 ──────────────────────────────────────────────
SCRIPT_DIR = Path(__file__).parent
CONFIG_PATH = SCRIPT_DIR / "config.json"
LOG_PATH    = SCRIPT_DIR / "updater.log"

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
def find_kakao_hwnd():
    handles = []
    def callback(hwnd, _):
        if ctypes.windll.user32.IsWindowVisible(hwnd):
            length = ctypes.windll.user32.GetWindowTextLengthW(hwnd)
            buf = ctypes.create_unicode_buffer(length + 1)
            ctypes.windll.user32.GetWindowTextW(hwnd, buf, length + 1)
            if "카카오톡" in buf.value or "KakaoTalk" in buf.value:
                handles.append(hwnd)
        return True
    EnumWindowsProc = ctypes.WINFUNCTYPE(ctypes.c_bool, ctypes.c_int, ctypes.c_int)
    ctypes.windll.user32.EnumWindows(EnumWindowsProc(callback), 0)
    return handles[0] if handles else None

def open_kakao_if_needed():
    hwnd = find_kakao_hwnd()
    if not hwnd:
        log("카카오톡 실행 중...")
        paths = [
            r"C:\Program Files (x86)\Kakao\KakaoTalk\KakaoTalk.exe",
            r"C:\Program Files\Kakao\KakaoTalk\KakaoTalk.exe",
            os.path.expanduser(r"~\AppData\Local\Kakao\KakaoTalk\KakaoTalk.exe"),
        ]
        for p in paths:
            if os.path.exists(p):
                subprocess.Popen([p])
                time.sleep(6)
                break
    else:
        ctypes.windll.user32.ShowWindow(hwnd, 9)
        ctypes.windll.user32.SetForegroundWindow(hwnd)
        time.sleep(1)

def read_kakao_chat():
    """카카오톡 나에게 보내기 채팅 내용 클립보드로 읽기"""
    try:
        open_kakao_if_needed()
        time.sleep(2)
        hwnd = find_kakao_hwnd()
        if not hwnd:
            log("카카오톡 창을 찾을 수 없습니다.")
            return None

        ctypes.windll.user32.SetForegroundWindow(hwnd)
        time.sleep(0.5)

        # 검색 (Ctrl+F) → "나에게 보내기" 검색 → Enter
        pyautogui.hotkey("ctrl", "f")
        time.sleep(0.8)
        pyperclip.copy("나에게 보내기")
        pyautogui.hotkey("ctrl", "v")
        time.sleep(0.8)
        pyautogui.press("enter")
        time.sleep(1)
        pyautogui.press("escape")
        time.sleep(0.5)

        # 채팅창 전체 선택 후 복사
        pyautogui.hotkey("ctrl", "a")
        time.sleep(0.3)
        pyautogui.hotkey("ctrl", "c")
        time.sleep(0.3)

        text = pyperclip.paste()
        log(f"카카오톡 {len(text)}자 읽기 완료")
        return text
    except Exception as e:
        log(f"카카오톡 읽기 오류: {e}")
        return None

# ── 규칙 기반 파싱 (무료) ─────────────────────────────────

# 마트 키워드 → 공과금/마트/장보기
MART_KEYWORDS = ["이마트", "홈플러스", "롯데마트", "코스트코", "마트", "하나로마트", "농협마트", "메가마트"]

# 카테고리 키워드 매핑 (용돈 재원)
YONGDON_CATEGORY_RULES = [
    (["스타벅스","카페","커피","이디야","투썸","빽다방","메가커피","컴포즈"], "카페/음료"),
    (["식당","밥","점심","저녁","아침","외식","음식","국밥","치킨","피자","햄버거","파스타","초밥","고기","삼겹","갈비","냉면","분식","떡볶이","김밥","편의점"], "식비/외식"),
    (["미용실","헤어","네일","왁싱","뷰티","미용"], "미용/뷰티"),
    (["버스","지하철","택시","카카오택시","교통","기차","ktx","고속버스"], "교통비"),
    (["병원","의원","약국","약","진료","치과","한의원","의료"], "의료/건강"),
    (["영화","cgv","롯데시네마","메가박스","공연","콘서트","전시","뮤지컬","문화"], "문화/여가"),
    (["옷","의류","쇼핑","패션","무신사","자라","h&m","유니클로","신발"], "의류/쇼핑"),
]

# 카테고리 키워드 매핑 (공과금 재원)
GONGGWA_CATEGORY_RULES = [
    (["전기","전기세","전기요금","한전"], "전기/가스/수도"),
    (["가스","도시가스","가스요금"], "전기/가스/수도"),
    (["수도","수도요금","상수도"], "전기/가스/수도"),
    (["관리비","아파트관리"], "관리비"),
]

def detect_source_and_category(text_lower, has_gonggwa_tag, has_bokji_tag):
    """재원과 카테고리 자동 판단"""
    if has_bokji_tag:
        for keywords, cat in [
            (["병원","의원","약국","약","의료"], "의료/건강(포인트)"),
            (["쇼핑","마트","올리브","다이소"], "쇼핑(포인트)"),
            (["영화","공연","문화"], "문화/여가(포인트)"),
        ]:
            if any(k in text_lower for k in keywords):
                return "복지포인트", cat
        return "복지포인트", "기타(포인트)"

    # 마트 → 공과금/마트/장보기
    if any(k in text_lower for k in MART_KEYWORDS):
        return "공과금", "마트/장보기"

    # 쿠팡 + 공과금 태그
    if "쿠팡" in text_lower:
        if has_gonggwa_tag:
            return "공과금", "쿠팡 공과금"
        return "용돈", "의류/쇼핑"  # 기본값, 사용자가 수정 가능

    # 공과금 태그 있는 경우
    if has_gonggwa_tag:
        for keywords, cat in GONGGWA_CATEGORY_RULES:
            if any(k in text_lower for k in keywords):
                return "공과금", cat
        return "공과금", "기타 공과금"

    # 용돈: 키워드 매핑
    for keywords, cat in YONGDON_CATEGORY_RULES:
        if any(k in text_lower for k in keywords):
            return "용돈", cat

    return "용돈", "기타 용돈"

def parse_messages(chat_text, last_processed):
    """카카오톡 채팅 텍스트에서 거래 내역 파싱"""
    # 카카오톡 메시지 패턴: [이름] [오전/오후 H:MM] 내용
    # 날짜 구분선: ---- YYYY년 MM월 DD일 ----
    transactions = []

    # 날짜 파싱
    current_date = date.today()
    date_pattern = re.compile(r'(\d{4})년\s*(\d{1,2})월\s*(\d{1,2})일')
    # 금액 패턴: 숫자+원, 쉼표 포함
    amount_pattern = re.compile(r'(\d{1,3}(?:,\d{3})*|\d+)\s*원')

    # last_processed 이후 메시지만 처리
    last_dt = None
    if last_processed:
        try:
            last_dt = datetime.fromisoformat(last_processed)
        except Exception:
            pass

    lines = chat_text.splitlines()
    i = 0
    while i < len(lines):
        line = lines[i].strip()

        # 날짜 구분선 파싱
        dm = date_pattern.search(line)
        if dm:
            current_date = date(int(dm.group(1)), int(dm.group(2)), int(dm.group(3)))
            i += 1
            continue

        # 메시지 라인: [이름] [오전/오후 H:MM] 내용
        msg_match = re.match(r'\[.+?\]\s*\[(?:오전|오후)\s*\d{1,2}:\d{2}\]\s*(.+)', line)
        if not msg_match:
            i += 1
            continue

        content = msg_match.group(1).strip()

        # last_processed 체크 (날짜 기준)
        if last_dt and current_date < last_dt.date():
            i += 1
            continue

        # 금액 추출
        amt_match = amount_pattern.search(content)
        if not amt_match:
            i += 1
            continue

        amount_str = amt_match.group(1).replace(",", "")
        amount = int(amount_str)
        if amount < 100:  # 100원 미만은 무시
            i += 1
            continue

        # 태그 확인
        content_lower = content.lower()
        has_gonggwa = "공과금" in content
        has_bokji   = "복지포인트" in content
        is_income   = any(k in content for k in ["수입", "정산", "급여", "받음", "입금"])

        # 메모 추출 (/ 뒤)
        memo = ""
        if "/" in content:
            parts = content.split("/", 1)
            memo = parts[1].strip()
            content = parts[0].strip()

        # 설명: 금액/태그 제거
        description = content
        description = amount_pattern.sub("", description).strip()
        for tag in ["공과금", "복지포인트", "수입", "정산", "급여"]:
            description = description.replace(tag, "").strip()
        description = re.sub(r'\s+', ' ', description).strip(" -,")
        if not description:
            description = "기타"

        # 재원/카테고리 판단
        if is_income:
            if "정산" in content:
                source, category = "정산", "공과금 정산"
            elif "급여" in content:
                source, category = "급여", "급여"
            else:
                source, category = "급여", "기타 수입"
            tx_type = "income"
        else:
            source, category = detect_source_and_category(content_lower, has_gonggwa, has_bokji)
            tx_type = "expense"

        transactions.append({
            "id": str(uuid.uuid4()),
            "date": current_date.isoformat(),
            "type": tx_type,
            "source": source,
            "category": category,
            "description": description,
            "amount": amount,
            "memo": memo,
        })

        i += 1

    log(f"파싱 완료: {len(transactions)}건")
    return transactions

# ── GitHub 업데이트 ───────────────────────────────────────
def get_github_file(cfg, path):
    url = f"https://api.github.com/repos/{cfg['github_owner']}/{cfg['github_repo']}/contents/{path}"
    headers = {"Authorization": f"token {cfg['github_token']}"}
    r = requests.get(url, headers=headers)
    r.raise_for_status()
    data = r.json()
    content = base64.b64decode(data["content"]).decode("utf-8")
    return json.loads(content), data["sha"]

def update_github_file(cfg, path, content, sha, message):
    url = f"https://api.github.com/repos/{cfg['github_owner']}/{cfg['github_repo']}/contents/{path}"
    headers = {"Authorization": f"token {cfg['github_token']}", "Content-Type": "application/json"}
    body = {
        "message": message,
        "content": base64.b64encode(
            json.dumps(content, ensure_ascii=False, indent=2).encode()
        ).decode(),
        "sha": sha,
    }
    r = requests.put(url, headers=headers, json=body)
    r.raise_for_status()
    log("GitHub 업데이트 완료")

def add_transactions_to_github(new_txs, cfg):
    data, sha = get_github_file(cfg, cfg["github_data_path"])
    added = 0
    for tx in new_txs:
        data["transactions"].append(tx)
        added += 1
    if added == 0:
        log("추가할 새 거래 없음")
        return 0
    data["settings"]["lastUpdated"] = date.today().isoformat()
    today_str = date.today().strftime("%Y.%m.%d")
    update_github_file(cfg, cfg["github_data_path"], data, sha,
                       f"자동 업데이트: {today_str} ({added}건)")
    return added

# ── 메인 ──────────────────────────────────────────────────
def main():
    log("=" * 50)
    log("가계부 자동 업데이트 시작")

    cfg = load_config()

    # 1. 카카오톡 메시지 읽기
    chat_text = read_kakao_chat()
    if not chat_text:
        log("카카오톡 메시지를 읽지 못했습니다. 종료.")
        sys.exit(1)

    # 2. 규칙 기반 파싱 (무료)
    last_processed = cfg.get("last_processed", "")
    new_txs = parse_messages(chat_text, last_processed)

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
