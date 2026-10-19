// 出題器共用工具。所有函式都接受 rng（回傳 [0,1) 的函式），方便測試時固定亂數。

export function randInt(rng, min, max) {
  return min + Math.floor(rng() * (max - min + 1));
}

export function pick(rng, list) {
  return list[Math.floor(rng() * list.length)];
}

export function shuffle(rng, list) {
  const a = list.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// 從 list 取 n 個不重複的元素
export function sample(rng, list, n) {
  return shuffle(rng, list).slice(0, n);
}

export function gcd(a, b) {
  a = Math.abs(a); b = Math.abs(b);
  while (b) [a, b] = [b, a % b];
  return a;
}

export function lcm(a, b) {
  return (a / gcd(a, b)) * b;
}

export function divisors(n) {
  const out = [];
  for (let i = 1; i <= n; i++) if (n % i === 0) out.push(i);
  return out;
}

// 由正確答案和干擾選項組出選擇題選項：去重、打散，正確答案一定在裡面。
export function buildOptions(rng, answer, distractors, count = 4) {
  const seen = new Set([String(answer)]);
  const picked = [];
  for (const d of shuffle(rng, distractors)) {
    const key = String(d);
    if (seen.has(key)) continue;
    seen.add(key);
    picked.push(d);
    if (picked.length >= count - 1) break;
  }
  return shuffle(rng, [answer, ...picked]).map(String);
}

// 可重現的亂數（mulberry32），測試用
export function seededRng(seed) {
  let t = seed >>> 0;
  return function () {
    t += 0x6d2b79f5;
    let r = Math.imul(t ^ (t >>> 15), 1 | t);
    r ^= r + Math.imul(r ^ (r >>> 7), 61 | r);
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
}

let counter = 0;
export function makeId(prefix) {
  counter += 1;
  return `${prefix}-${Date.now().toString(36)}-${counter}`;
}
