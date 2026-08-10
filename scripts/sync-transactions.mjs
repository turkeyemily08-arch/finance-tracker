#!/usr/bin/env node
// Firestore(households/kyuri)의 실시간 수정 오버레이(patches/additions/deletions)를
// public/data/transactions.json(승인본 베이스)에 병합해 그대로 파일에 저장한다.
// → 폰/PC에서 입력한 거래가 Firestore에만 남지 않고, 주기적으로 GitHub에도 백업된다.
// 병합 로직은 src/App.jsx의 mergeAll/mergeMemoIntoDesc와 동일해야 한다.

import { readFileSync, writeFileSync } from 'node:fs';

const PROJECT_ID = 'finance-tracker-47f53';
const API_KEY = 'AIzaSyASbfzbyB7fhIls-3mbJTFMEvr-_OEk9t4'; // 클라이언트 번들에도 그대로 포함되는 공개 키
const DOC_PATH = 'households/kyuri';
const DATA_FILE = new URL('../public/data/transactions.json', import.meta.url);

function fromFirestoreValue(v) {
  if (v == null) return null;
  if ('nullValue' in v) return null;
  if ('booleanValue' in v) return v.booleanValue;
  if ('integerValue' in v) return Number(v.integerValue);
  if ('doubleValue' in v) return v.doubleValue;
  if ('stringValue' in v) return v.stringValue;
  if ('timestampValue' in v) return v.timestampValue;
  if ('arrayValue' in v) return (v.arrayValue.values || []).map(fromFirestoreValue);
  if ('mapValue' in v) return fromFirestoreFields(v.mapValue.fields || {});
  return null;
}

function fromFirestoreFields(fields) {
  const out = {};
  for (const [k, v] of Object.entries(fields)) out[k] = fromFirestoreValue(v);
  return out;
}

async function fetchOverlay() {
  const url = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents/${DOC_PATH}?key=${API_KEY}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Firestore fetch 실패: ${res.status} ${await res.text()}`);
  const json = await res.json();
  const fields = fromFirestoreFields(json.fields || {});
  return {
    patches: fields.patches || {},
    additions: fields.additions || [],
    deletions: fields.deletions || [],
  };
}

// 주의: src/App.jsx의 mergeAll은 화면 표시용으로 mergeMemoIntoDesc(memo→description 합치기)까지
// 적용하지만, 그건 순수 UI 표시 변환이라 저장용 베이스 파일에는 절대 적용하면 안 된다.
// (적용 시 매 실행마다 원본 memo 필드가 사라지고 description으로 흡수돼버림 — CLAUDE.md 금지사항)
// 여기서는 patches/additions/deletions만 그대로 반영해 원본 필드 형태를 보존한다.
function mergeAll(serverTransactions, overlay) {
  const { patches = {}, additions = [], deletions = [] } = overlay;
  const deletionSet = new Set(deletions);
  const serverIds = new Set(serverTransactions.map((t) => t.id));

  const merged = serverTransactions
    .filter((t) => !deletionSet.has(t.id))
    .map((t) => (patches[t.id] ? { ...t, ...patches[t.id] } : t));

  additions
    .filter((t) => !serverIds.has(t.id) && !deletionSet.has(t.id))
    .forEach((t) => merged.push(t));

  return merged;
}

const raw = readFileSync(DATA_FILE, 'utf-8');
const data = JSON.parse(raw);
const overlay = await fetchOverlay();

const mergedTransactions = mergeAll(data.transactions || [], overlay);
// 날짜순 정렬해 diff를 읽기 쉽게 유지
mergedTransactions.sort((a, b) => (a.date === b.date ? a.id.localeCompare(b.id) : a.date.localeCompare(b.date)));

const next = { ...data, transactions: mergedTransactions };
// 원본 파일이 트레일링 개행 없이 저장돼 있으므로 형식을 그대로 맞춰 불필요한 diff를 만들지 않는다.
const nextStr = JSON.stringify(next, null, 2);

if (nextStr === raw) {
  console.log('변경 없음 — 스킵');
  process.exit(0);
}

writeFileSync(DATA_FILE, nextStr);
console.log(`transactions.json 갱신: ${data.transactions.length}건 → ${mergedTransactions.length}건`);
