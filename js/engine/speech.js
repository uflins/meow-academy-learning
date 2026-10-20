// 用瀏覽器內建語音（Web Speech API）念題目。iPad 要在使用者點過畫面之後才能開始發聲。
import { settings } from '../save/store.js';

let voice = null;
let voicesReady = false;

function chooseVoice() {
  if (!('speechSynthesis' in window)) return null;
  const voices = speechSynthesis.getVoices();
  if (!voices.length) return null;
  voicesReady = true;
  const tw = voices.filter((v) => /zh[-_]TW/i.test(v.lang));
  const prefer = tw.find((v) => /Mei-?Jia|美佳/i.test(v.name)) || tw.find((v) => v.localService) || tw[0];
  return prefer || voices.find((v) => /^zh/i.test(v.lang)) || null;
}

if ('speechSynthesis' in window) {
  voice = chooseVoice();
  speechSynthesis.addEventListener?.('voiceschanged', () => { voice = chooseVoice(); });
}

// iPad Safari 要求第一次朗讀發生在手指點擊的當下；在第一次點擊時先念一句無聲的，之後就能自由朗讀
export function unlock() {
  if (!available()) return;
  try {
    const u = new SpeechSynthesisUtterance(' ');
    u.volume = 0;
    u.lang = 'zh-TW';
    speechSynthesis.speak(u);
  } catch (e) { /* 忽略 */ }
}

export function available() {
  return 'speechSynthesis' in window;
}

export function voiceInfo() {
  if (!voice) voice = chooseVoice();
  return voice ? `${voice.name}（${voice.lang}）` : (voicesReady ? '找不到中文語音' : '語音還沒準備好');
}

export function stop() {
  if (available()) speechSynthesis.cancel();
}

// 念一段文字；念完（或失敗、逾時）時 resolve。
export function speak(text, { rate } = {}) {
  return new Promise((resolve) => {
    if (!text || !available() || settings().muted) return resolve(false);
    if (!voice) voice = chooseVoice();
    speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.lang = 'zh-TW';
    if (voice) u.voice = voice;
    u.rate = rate || settings().voiceRate || 0.9;
    u.pitch = 1.05;
    let done = false;
    const finish = (ok) => { if (!done) { done = true; resolve(ok); } };
    u.onend = () => finish(true);
    u.onerror = () => finish(false);
    // 有些瀏覽器不會觸發 onend，用字數估計一個逾時
    setTimeout(() => finish(true), 1500 + text.length * 450);
    speechSynthesis.speak(u);
  });
}
