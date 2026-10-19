// 存檔層：所有進度都存在這台 iPad 瀏覽器的 localStorage。
// 之後若要改成雲端存檔，只需要替換這個模組（介面：load / save / exportData / importData）。

const KEY = 'meow-academy-save';
const VERSION = 1;

function emptyData() {
  return {
    version: VERSION,
    family: {
      parentPinHash: null,
      lastBackupAt: null,
      settings: { muted: false, voiceRate: 0.9 },
    },
    players: {},
  };
}

let data = null;
let storageOk = true;

function migrate(d) {
  if (!d || typeof d !== 'object') return emptyData();
  // 目前只有第 1 版；之後改版時在這裡把舊格式轉成新格式。
  if (!d.version) d.version = 1;
  d.family = Object.assign(emptyData().family, d.family || {});
  d.family.settings = Object.assign(emptyData().family.settings, d.family.settings || {});
  d.players = d.players || {};
  for (const p of Object.values(d.players)) normalizePlayer(p);
  return d;
}

export function normalizePlayer(p) {
  p.xp = p.xp || 0;
  p.fish = p.fish || 0;
  p.progress = p.progress || {};
  p.stats = p.stats || {};
  p.wrongBook = p.wrongBook || [];
  p.cats = p.cats || {};
  p.history = p.history || [];
  return p;
}

export function load() {
  if (data) return data;
  try {
    const raw = localStorage.getItem(KEY);
    data = migrate(raw ? JSON.parse(raw) : emptyData());
  } catch (e) {
    storageOk = false;
    data = emptyData();
  }
  return data;
}

function isQuotaError(e) {
  return e && (e.name === 'QuotaExceededError' || e.code === 22 || e.code === 1014);
}

// 空間不夠時，把每位玩家最舊的錯題刪掉一半再存，最多試幾次
function trimForSpace() {
  let trimmed = false;
  for (const p of Object.values(data.players)) {
    if (p.wrongBook.length > 10) {
      p.wrongBook.splice(0, Math.ceil(p.wrongBook.length / 2));
      trimmed = true;
    }
    if (p.history.length > 50) {
      p.history.splice(0, p.history.length - 50);
      trimmed = true;
    }
  }
  return trimmed;
}

export function save() {
  if (!data) return;
  for (let attempt = 0; attempt < 5; attempt++) {
    try {
      localStorage.setItem(KEY, JSON.stringify(data));
      storageOk = true;
      return;
    } catch (e) {
      if (!isQuotaError(e) || !trimForSpace()) break;
    }
  }
  storageOk = false;
}

export function isStorageOk() {
  load();
  return storageOk;
}

export function getData() {
  return load();
}

export function settings() {
  return load().family.settings;
}

// ---------- 玩家 ----------

export function listPlayers() {
  return Object.values(load().players).sort((a, b) => a.createdAt - b.createdAt);
}

export function getPlayer(id) {
  return load().players[id] || null;
}

export function addPlayer({ name, avatar, grade, pinHash, pinKind }) {
  const id = 'p' + Date.now().toString(36);
  load().players[id] = normalizePlayer({
    id, name, avatar, grade, pinHash, pinKind, createdAt: Date.now(),
  });
  save();
  return load().players[id];
}

export function updatePlayer(id, patch) {
  const p = getPlayer(id);
  if (!p) return null;
  Object.assign(p, patch);
  save();
  return p;
}

export function removePlayer(id) {
  delete load().players[id];
  save();
}

// ---------- 家長 PIN ----------

export function hasParentPin() {
  return !!load().family.parentPinHash;
}

export function setParentPinHash(hash) {
  load().family.parentPinHash = hash;
  save();
}

export function parentPinHash() {
  return load().family.parentPinHash;
}

// ---------- 匯出／匯入 ----------

export function exportData() {
  const d = load();
  d.family.lastBackupAt = Date.now();
  save();
  return JSON.stringify({ app: 'meow-academy', exportedAt: new Date().toISOString(), data: d }, null, 0);
}

export function importData(text) {
  const parsed = JSON.parse(text);
  if (!parsed || parsed.app !== 'meow-academy' || !parsed.data) {
    throw new Error('這不是喵喵學園的存檔檔案');
  }
  data = migrate(parsed.data);
  save();
  return data;
}

export function lastBackupAt() {
  return load().family.lastBackupAt;
}

// ---------- PIN 雜湊 ----------

export async function hashPin(pin) {
  const text = 'meow-academy:' + pin;
  try {
    if (crypto && crypto.subtle) {
      const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
      return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, '0')).join('');
    }
  } catch (e) { /* 改用下面的簡易雜湊 */ }
  let h = 2166136261;
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return 'f' + (h >>> 0).toString(16);
}
