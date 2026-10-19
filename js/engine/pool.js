// 依區域載入單元與關卡，並為每場戰鬥抽題（含約 20% 的錯題本題目）。
import { shuffle, sample } from '../gen/util.js';
import { wrongFor } from './progress.js';

const bankCache = new Map();
const moduleCache = new Map();

async function loadBank(file) {
  if (!bankCache.has(file)) {
    bankCache.set(file, fetch(new URL(`../../data/questions/${file}`, import.meta.url))
      .then((r) => {
        if (!r.ok) throw new Error(`題庫載入失敗：${file}`);
        return r.json();
      })
      .then((list) => list.filter((q) => !q.needsAudio)));
  }
  return bankCache.get(file);
}

async function loadModule(path) {
  if (!moduleCache.has(path)) moduleCache.set(path, import(path));
  return moduleCache.get(path);
}

// 回傳 [{ unit, title, nodes: [{ id, title, isBoss, sectionIds, draw(n) }] }]
export async function loadRegionUnits(region) {
  const src = region.source;
  if (!src) return [];
  if (src.kind === 'gen') {
    const mod = await loadModule(src.module);
    return mod.units.map((u) => {
      const nodes = u.sections.map((s) => ({
        id: `u${u.unit}-s${s.section}`,
        title: `${s.section} ${s.title}`,
        isBoss: false,
        sections: [String(s.section)],
        draw: async (n) => makeMany(s, n, false),
      }));
      nodes.push({
        id: `u${u.unit}-boss`,
        title: `${u.title} 大魔王`,
        isBoss: true,
        sections: u.sections.map((s) => String(s.section)),
        draw: async (n) => {
          const out = [];
          for (let i = 0; i < n; i++) out.push(makeOne(u.sections[i % u.sections.length], i, n, true));
          return shuffle(Math.random, out);
        },
      });
      return { unit: u.unit, title: `單元 ${u.unit}　${u.title}`, nodes };
    });
  }
  if (src.kind === 'bank') {
    return src.units.map((u) => {
      const nodes = u.sections.map((s) => ({
        id: `u${u.unit}-s${s.section}`,
        title: s.title,
        isBoss: false,
        sections: [String(s.section)],
        draw: async (n) => pickVaried(await loadBank(s.file), n),
      }));
      nodes.push({
        id: `u${u.unit}-boss`,
        title: `${u.boss.title} 大魔王`,
        isBoss: true,
        sections: [...u.sections.map((s) => String(s.section)), String(u.boss.section || '')],
        draw: async (n) => {
          const review = await loadBank(u.boss.file);
          const lessons = (await Promise.all(u.sections.map((s) => loadBank(s.file)))).flat();
          const fromReview = pickVaried(review, Math.ceil(n * 0.6));
          const fromLessons = pickVaried(lessons.filter((q) => !fromReview.includes(q)), n - fromReview.length);
          return shuffle(Math.random, [...fromReview, ...fromLessons]);
        },
      });
      return { unit: u.unit, title: u.title, nodes };
    });
  }
  return [];
}

// 從題庫抽 n 題，盡量每題是不同的子題型（tags 的第一個）
function pickVaried(list, n) {
  const pool = shuffle(Math.random, list);
  const out = [];
  const kinds = new Set();
  for (const q of pool) {
    if (out.length >= n) break;
    const kind = (q.tags && q.tags[0]) || q.type;
    if (kinds.has(kind)) continue;
    kinds.add(kind);
    out.push(q);
  }
  for (const q of pool) {
    if (out.length >= n) break;
    if (!out.includes(q)) out.push(q);
  }
  return shuffle(Math.random, out);
}

function difficultyFor(i, n, isBoss) {
  // 前面簡單、後面難一點；大魔王整體難一點
  const t = n > 1 ? i / (n - 1) : 0;
  if (isBoss) return t < 0.5 ? 2 : 3;
  return t < 0.4 ? 1 : t < 0.8 ? 2 : 3;
}

function makeOne(section, i, n, isBoss) {
  const q = section.make(Math.random, difficultyFor(i, n, isBoss));
  return q;
}

// 同一場盡量不要出現同一種子題型（tags 的第一個）或重複的題目
function makeMany(section, n, isBoss) {
  const out = [];
  const seen = new Set();
  const kinds = new Set();
  let guard = 0;
  while (out.length < n && guard < n * 12) {
    guard++;
    const q = makeOne(section, out.length, n, isBoss);
    const key = q.prompt + '|' + JSON.stringify(q.answer);
    const kind = (q.tags && q.tags[0]) || q.type;
    if (seen.has(key)) continue;
    if (kinds.has(kind) && guard < n * 8) continue;
    seen.add(key);
    kinds.add(kind);
    out.push(q);
  }
  return out;
}

// 一場戰鬥的題目：先抽新題，再把約 20% 換成錯題本的題目
export async function battleQuestions(player, region, node, n) {
  const fresh = await node.draw(n);
  const wrong = wrongFor(player, region.subject)
    .filter((w) => w.q.grade === player.grade && node.sections.includes(String(w.q.section)));
  const k = Math.min(wrong.length, Math.max(n >= 5 ? 1 : 0, Math.round(n * 0.2)));
  if (!k) return fresh;
  const picked = sample(Math.random, wrong, k).map((w) => Object.assign({}, w.q, { fromWrongBook: true }));
  const keep = fresh.slice(0, n - picked.length);
  return shuffle(Math.random, [...keep, ...picked]);
}
