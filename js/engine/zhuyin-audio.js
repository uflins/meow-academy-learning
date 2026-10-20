// 注音單音音檔（assets/zhuyin/）。用 Web Audio 播放，和音效共用同一個已解鎖的音訊環境。
import { audioContext } from './sfx.js';
import { settings } from '../save/store.js';

let indexPromise = null;
const buffers = new Map();
let current = null;

function loadIndex() {
  if (!indexPromise) {
    indexPromise = fetch(new URL('../../assets/zhuyin/index.json', import.meta.url))
      .then((r) => (r.ok ? r.json() : null))
      .catch(() => null);
  }
  return indexPromise;
}

// 有沒有音檔可以用（沒有的話，注音泡泡就不出題）
export async function zhuyinAudioReady() {
  const idx = await loadIndex();
  return !!(idx && Object.keys(idx).length);
}

async function bufferFor(symbol) {
  if (buffers.has(symbol)) return buffers.get(symbol);
  const idx = await loadIndex();
  const file = idx && idx[symbol];
  if (!file) return null;
  const p = fetch(new URL(`../../assets/zhuyin/${file}`, import.meta.url))
    .then((r) => r.arrayBuffer())
    .then((buf) => new Promise((resolve, reject) => audioContext().decodeAudioData(buf, resolve, reject)))
    .catch(() => null);
  buffers.set(symbol, p);
  return p;
}

// 先把這一題要用的音載好，播放時比較不會延遲
export function preloadZhuyin(symbols) {
  for (const s of symbols) bufferFor(s);
}

// 播放一個注音；播完時 resolve
export async function playZhuyin(symbol) {
  if (settings().muted) return false;
  const ctx = audioContext();
  const buf = await bufferFor(symbol);
  if (!ctx || !buf) return false;
  if (current) { try { current.stop(); } catch (e) { /* 已經停了 */ } }
  return new Promise((resolve) => {
    const src = ctx.createBufferSource();
    src.buffer = buf;
    src.connect(ctx.destination);
    src.onended = () => resolve(true);
    current = src;
    src.start();
  });
}
