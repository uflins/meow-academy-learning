// 依區域載入單元與關卡，並為每場戰鬥抽題（含約 20% 的錯題本題目）。
import { shuffle, sample } from '../gen/util.js';
import { wrongFor } from './progress.js';
import { zhuyinAudioReady } from './zhuyin-audio.js';
import { makeBubble } from '../gen/zhuyin-bubbles.js';
import { fractionClone, shadowQuestion, mapQuestion } from '../gen/boss-special.js';

// 操作型大魔王：約六成題目換成特殊玩法
const SPECIAL_GEN = { 'fraction-clones': fractionClone, shadow: shadowQuestion, map: mapQuestion };
function withSpecial(list, special, n) {
  if (!special) return list;
  const k = Math.ceil(n * 0.6);
  if (SPECIAL_GEN[special]) {
    const extra = [];
    const seen = new Set();
    for (let t = 0; t < k * 15 && extra.length < k; t++) {
      const q = SPECIAL_GEN[special](Math.random);
      const key = `${q.prompt}|${q.answer}|${q.map ? q.map.spots.map((s) => s.name).sort().join() : ''}`;
      const target = q.prompt.match(/「(.+?)」/)?.[1];
      if (seen.has(key) || (target && seen.has(`t:${target}`))) continue;
      seen.add(key);
      if (target) seen.add(`t:${target}`);
      extra.push(q);
    }
    return shuffle(Math.random, [...list.slice(0, n - extra.length), ...extra]);
  }
  return list;
}

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
        special: src.bossSpecial?.[u.unit],
        draw: async (n) => {
          const out = [];
          for (let i = 0; i < n; i++) out.push(makeOne(u.sections[i % u.sections.length], i, n, true));
          return withSpecial(shuffle(Math.random, out), src.bossSpecial?.[u.unit], n);
        },
      });
      return { unit: u.unit, title: `單元 ${u.unit}　${u.title}`, nodes };
    });
  }
  if (src.kind === 'bank') {
    const useBubbles = !!src.bubbles && await zhuyinAudioReady();
    // 把 k 題換成注音泡泡（同一場不重複考同一個符號）
    const withBubbles = (list, section, k) => {
      if (!useBubbles || !k) return list;
      const used = new Set();
      const bubbles = [];
      for (let t = 0; t < k * 6 && bubbles.length < k; t++) {
        const b = makeBubble(Math.random, section);
        if (used.has(b.audio)) continue;
        used.add(b.audio);
        bubbles.push(b);
      }
      return shuffle(Math.random, [...list.slice(0, list.length - bubbles.length), ...bubbles]);
    };
    return src.units.map((u) => {
      const nodes = u.sections.map((s) => ({
        id: `u${u.unit}-s${s.section}`,
        title: s.title,
        isBoss: false,
        sections: [String(s.section)],
        draw: async (n) => withBubbles(pickVaried(await loadBank(s.file), n), s.section, 1),
      }));
      nodes.push({
        id: `u${u.unit}-boss`,
        title: /大魔王|怪/.test(u.boss.title) ? u.boss.title : `${u.boss.title} 大魔王`,
        isBoss: true,
        sections: [...u.sections.map((s) => String(s.section)), String(u.boss.section || '')],
        draw: async (n) => {
          const lessons = (await Promise.all(u.sections.map((s) => loadBank(s.file)))).flat();
          if (u.boss.special === 'rhetoric') {
            // 修辭大魔王：以修辭技能卡為主，再穿插讀音和成語題
            const rh = lessons.filter((q) => q.tags && q.tags[0] === 'rhetoric');
            const picked = pickVaried(rh, Math.ceil(n * 0.6));
            const rest = pickVaried(lessons.filter((q) => !picked.includes(q) && q.tags && ['reading', 'polyphone', 'idiom'].includes(q.tags[0])), n - picked.length);
            const all = [...picked, ...rest];
            return shuffle(Math.random, all.length >= n ? all : [...all, ...pickVaried(lessons.filter((q) => !all.includes(q)), n - all.length)]);
          }
          if (!u.boss.file) return withSpecial(pickVaried(lessons, n), u.boss.special, n);
          const review = await loadBank(u.boss.file);
          const fromReview = pickVaried(review, Math.ceil(n * 0.6));
          const fromLessons = pickVaried(lessons.filter((q) => !fromReview.includes(q)), n - fromReview.length);
          return withBubbles(shuffle(Math.random, [...fromReview, ...fromLessons]), u.boss.section, 2);
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

// 「科目:節」→ 關卡標題（例如「2-4 倍數」「第1課 蚊帳大使」），錯題本和家長區用
const titleMaps = {};
export function sectionTitleMap(grade, regions) {
  if (!titleMaps[grade]) {
    titleMaps[grade] = (async () => {
      const map = {};
      for (const r of regions.filter((x) => x.status === 'open')) {
        try {
          for (const u of await loadRegionUnits(r)) {
            for (const n of u.nodes) if (!n.isBoss && n.sections) map[`${r.subject}:${n.sections[0]}`] = n.title;
            const boss = u.nodes.find((n) => n.isBoss);
            if (boss) for (const s of boss.sections) if (s && !map[`${r.subject}:${s}`]) map[`${r.subject}:${s}`] = boss.title;
          }
        } catch (e) { /* 載入失敗就用節的代號 */ }
      }
      return map;
    })();
  }
  return titleMaps[grade];
}

// 一場戰鬥的題目：先抽新題，再把約 20% 換成錯題本的題目
export async function battleQuestions(player, region, node, n) {
  const fresh = await node.draw(n);
  const wrong = wrongFor(player, region.subject)
    .filter((w) => w.q.grade === player.grade && node.sections.includes(String(w.q.section)));
  const k = Math.min(wrong.length, Math.max(n >= 5 ? 1 : 0, Math.round(n * 0.2)));
  if (!k) return fresh;
  const picked = sample(Math.random, wrong, k).map((w) => Object.assign({}, w.q, { fromWrongBook: true }));
  // 新題裡如果剛好有同一題，先拿掉，避免同一場出現兩次
  const pickedIds = new Set(picked.map((q) => q.id));
  const keep = fresh.filter((q) => !pickedIds.has(q.id)).slice(0, n - picked.length);
  return shuffle(Math.random, [...keep, ...picked]);
}
