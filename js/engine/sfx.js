// 用 Web Audio 合成簡單音效，不需要音檔。
import { settings } from '../save/store.js';

let ctx = null;

function audio() {
  if (!ctx) {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    ctx = new AC();
  }
  if (ctx.state === 'suspended') ctx.resume();
  return ctx;
}

// iPad 要在使用者觸控後才能播放聲音
export function unlock() {
  audio();
}

function tone(freq, start, dur, { type = 'sine', gain = 0.18, slideTo = null } = {}) {
  const a = audio();
  if (!a) return;
  const t0 = a.currentTime + start;
  const osc = a.createOscillator();
  const g = a.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, t0);
  if (slideTo) osc.frequency.exponentialRampToValueAtTime(slideTo, t0 + dur);
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.exponentialRampToValueAtTime(gain, t0 + 0.02);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  osc.connect(g).connect(a.destination);
  osc.start(t0);
  osc.stop(t0 + dur + 0.05);
}

const sounds = {
  tap: () => tone(660, 0, 0.08, { type: 'triangle', gain: 0.08 }),
  correct: () => { tone(784, 0, 0.12, { type: 'triangle' }); tone(1047, 0.1, 0.2, { type: 'triangle' }); },
  wrong: () => { tone(330, 0, 0.18, { type: 'sine', gain: 0.12, slideTo: 260 }); },
  attack: () => tone(500, 0, 0.18, { type: 'square', gain: 0.06, slideTo: 1200 }),
  special: () => { [523, 659, 784, 1047, 1319].forEach((f, i) => tone(f, i * 0.07, 0.18, { type: 'triangle', gain: 0.12 })); },
  hurt: () => tone(220, 0, 0.2, { type: 'sawtooth', gain: 0.05, slideTo: 140 }),
  win: () => { [523, 659, 784, 1047].forEach((f, i) => tone(f, i * 0.12, 0.25, { type: 'triangle', gain: 0.14 })); },
  levelup: () => { [659, 784, 988, 1319].forEach((f, i) => tone(f, i * 0.09, 0.22, { type: 'square', gain: 0.06 })); },
  pop: () => tone(900, 0, 0.1, { type: 'sine', gain: 0.12, slideTo: 300 }),
};

export function play(name) {
  if (settings().muted) return;
  try { sounds[name]?.(); } catch (e) { /* 音效失敗不影響遊戲 */ }
}
