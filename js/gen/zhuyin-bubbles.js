// 注音泡泡：聽一個注音的發音（音檔），從 3 個泡泡裡點出正確的符號。
// 只用到該課為止教過的單一符號（依設計規格書 9.1）。
import { pick, shuffle, makeId } from './util.js';

// 各課新教的單一符號（結合韻不算單一符號）
const NEW_SYMBOLS = {
  1: 'ㄅㄆㄇㄉㄧㄠ',
  2: 'ㄈㄏㄓㄔㄨㄚㄜ',
  3: 'ㄌㄑㄗㄩㄛㄢㄤ',
  4: 'ㄒㄕㄟㄡㄦ',
  5: 'ㄋㄍㄞㄥ',
  6: 'ㄐㄙㄝ',
  7: 'ㄊㄎㄣ',
  8: 'ㄖㄘ',
  9: '',
};
const REVIEW_UPTO = { r1: 3, r2: 6, r3: 9 };

// 容易混淆的符號（干擾選項優先用這些）
const CONFUSABLE = [
  'ㄅㄆ', 'ㄇㄈ', 'ㄉㄊ', 'ㄋㄌ', 'ㄍㄎ', 'ㄐㄑ', 'ㄓㄗ', 'ㄔㄘ', 'ㄕㄙ', 'ㄖㄌ',
  'ㄧㄩ', 'ㄨㄩ', 'ㄛㄜ', 'ㄢㄤ', 'ㄣㄥ', 'ㄟㄝ', 'ㄞㄟ', 'ㄠㄡ', 'ㄢㄣ', 'ㄤㄥ', 'ㄒㄕ', 'ㄏㄈ',
];

function lessonNo(section) {
  if (REVIEW_UPTO[section]) return REVIEW_UPTO[section];
  return Number(section) || 9;
}

function taughtUpTo(n) {
  let all = '';
  for (let i = 1; i <= n; i++) all += NEW_SYMBOLS[i] || '';
  return [...all];
}

export function makeBubble(rng, section) {
  const n = lessonNo(section);
  const taught = taughtUpTo(n);
  const fresh = [...(NEW_SYMBOLS[n] || '')];
  // 七成考這一課新教的符號，其餘從學過的裡面挑
  const target = fresh.length && rng() < 0.7 ? pick(rng, fresh) : pick(rng, taught);
  const near = CONFUSABLE.filter((p) => p.includes(target)).flatMap((p) => [...p]).filter((s) => s !== target && taught.includes(s));
  const others = shuffle(rng, taught.filter((s) => s !== target && !near.includes(s)));
  const distractors = [...shuffle(rng, near), ...others].slice(0, 2);
  return {
    id: makeId(`g1zh-bubble-${section}`),
    grade: 1,
    subject: 'chinese',
    unit: '首冊',
    section: String(section),
    type: 'choice',
    style: 'bubble',
    prompt: '注音泡泡：\n聽一聽，是哪一個注音？',
    speak: '聽一聽，是哪一個注音？',
    audio: target,
    options: shuffle(rng, [target, ...distractors]),
    answer: target,
    explanation: `這個音是「${target}」，再聽一次。`,
    explainSpeak: '這個音是',
    difficulty: 1,
    tags: ['bubble', `sym-${target}`],
  };
}
