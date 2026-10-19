// 五年級數學（南一 5上）出題器：單元 1–5。
// 題目格式見 docs/題目格式.md；題型與數字範圍依 範圍整理/五年級數學.md 第 4 節。
// 每個 make(rng, difficulty) 都只用傳進來的 rng，所以測試時可以固定亂數。
import { randInt, pick, shuffle, sample, gcd, lcm, divisors, buildOptions, makeId } from './util.js';
import * as D from './math5-draw.js';

const { C } = D;

export const subject = 'math';
export const grade = 5;

// ====================== 共用工具 ======================

const CN = ['零', '一', '二', '三', '四', '五', '六', '七', '八', '九', '十', '十一', '十二'];
const cn = (n) => CN[n] ?? String(n);
const LABELS = ['甲', '乙', '丙', '丁', '戊', '己'];
const vis = (svg) => (svg ? { svg } : null);
const sum = (arr) => arr.reduce((s, v) => s + v, 0);
const range = (a, b) => Array.from({ length: b - a + 1 }, (_, i) => a + i);
const byNum = (a, b) => parseFloat(a) - parseFloat(b);
const joinCN = (arr) => arr.join('、');

function wpick(rng, list) {
  const total = sum(list.map(([w]) => w));
  let r = rng() * total;
  for (const [w, v] of list) {
    r -= w;
    if (r < 0) return v;
  }
  return list[list.length - 1][1];
}

// gens: [{ f, min, max, w }]，依難度挑一種題型
function pickGen(rng, d, gens) {
  const pool = gens.filter((g) => (g.min ?? 1) <= d && d <= (g.max ?? 3));
  return wpick(rng, pool.map((g) => [g.w ?? 1, g.f]));
}

// 重抽到 fn 回傳有值為止
function retry(fn, tries = 400) {
  for (let i = 0; i < tries; i++) {
    const v = fn(i);
    if (v) return v;
  }
  throw new Error('math5：找不到符合條件的題目');
}

// 小數用「十分之一」整數表示，避免浮點誤差
const f10 = (v) => (v % 10 === 0 ? String(v / 10) : (v / 10).toFixed(1));

// ---------- 題目組裝 ----------
function choiceQ(rng, o) {
  let options;
  if (o.fixed) options = o.fixed.map(String);
  else {
    options = buildOptions(rng, o.answer, o.distractors, o.count ?? 4);
    if (o.sortNum) options.sort(byNum);
  }
  return { type: 'choice', prompt: o.prompt, visual: vis(o.svg), options, answer: String(o.answer), explanation: o.explanation, tags: o.tags };
}

function inputQ(o) {
  const q = { type: 'input', prompt: o.prompt, visual: vis(o.svg), keypad: o.keypad ?? 'digits', answer: String(o.answer), explanation: o.explanation, tags: o.tags };
  if (o.accept && o.accept.length) q.accept = o.accept.map(String);
  return q;
}

function tfQ(o) {
  return { type: 'truefalse', prompt: o.prompt, visual: vis(o.svg), answer: !!o.answer, explanation: o.explanation, tags: o.tags };
}

function multiQ(o) {
  return {
    type: 'multi', prompt: o.prompt, visual: vis(o.svg),
    options: o.options.map((x) => (typeof x === 'object' ? x : String(x))),
    answer: o.answer.map(String), explanation: o.explanation, tags: o.tags,
  };
}

function orderQ(o) {
  return { type: 'order', prompt: o.prompt, visual: vis(o.svg), items: o.items.map(String), explanation: o.explanation, tags: o.tags };
}

// 選項是圖：標成甲乙丙丁。explanation 可以是 (答案標籤) => 字串
function svgChoiceQ(rng, o) {
  const all = shuffle(rng, [{ svg: o.correct, ok: true }, ...o.wrongs.map((svg) => ({ svg, ok: false }))]);
  const options = all.map((x, i) => ({ label: LABELS[i], svg: x.svg }));
  const answer = LABELS[all.findIndex((x) => x.ok)];
  const explanation = typeof o.explanation === 'function' ? o.explanation(answer) : o.explanation;
  return { type: 'choice', prompt: o.prompt, visual: vis(o.svg), options, answer, explanation, tags: o.tags };
}

// 選項是圖的複選題
function svgMultiQ(rng, o) {
  const all = shuffle(rng, o.items);
  const options = all.map((x, i) => ({ label: LABELS[i], svg: x.svg }));
  const answer = all.map((x, i) => (x.ok ? LABELS[i] : null)).filter(Boolean);
  const explanation = typeof o.explanation === 'function' ? o.explanation(answer, all.map((x, i) => ({ ...x, label: LABELS[i] }))) : o.explanation;
  return { type: 'multi', prompt: o.prompt, visual: vis(o.svg), options, answer, explanation, tags: o.tags };
}

function makeSection(unit, section, title, gens) {
  return {
    section,
    title,
    make(rng, difficulty = 1) {
      const d = Math.min(3, Math.max(1, Math.round(Number(difficulty) || 1)));
      const body = pickGen(rng, d, gens)(rng, d);
      const q = {
        id: makeId(`math5-${section}`),
        grade: 5,
        subject: 'math',
        unit,
        section,
        type: body.type,
        prompt: body.prompt,
        visual: body.visual ?? null,
      };
      if (body.options) q.options = body.options;
      if (body.type !== 'order') q.answer = body.answer;
      if (body.items) q.items = body.items;
      if (body.keypad) q.keypad = body.keypad;
      if (body.accept) q.accept = body.accept;
      q.explanation = body.explanation;
      q.difficulty = d;
      q.tags = body.tags ?? [];
      return q;
    },
  };
}

// 從靜態是非題清單出一題：[敘述, 對錯, 說明, 標籤]
function tfFromList(rng, list) {
  const [prompt, answer, explanation, tag] = pick(rng, list);
  return tfQ({ prompt, answer, explanation, tags: tag ? [tag] : [] });
}

// ====================== 單元 1　折線圖 ======================

const GCOL = [C.a, C.b];
const MONTHS = range(1, 12).map((m) => `${m}月`);

const BAR_CTX = [
  {
    title: '五年級各班參加貓咪社的人數', cats: ['1班', '2班', '3班', '4班', '5班'], groups: ['男生', '女生'], unit: '人',
    read: (c, g) => `${c}參加的${g}有幾人？`,
    most: (g, max) => `哪一班參加的${g}最${max ? '多' : '少'}？`,
    equal: () => '哪一班參加的男生和女生一樣多？',
    totalMost: (max) => `哪一班參加的總人數（男生加女生）最${max ? '多' : '少'}？`,
    diff: (c) => `${c}參加的男生和女生相差幾人？`,
    diffMost: () => '哪一班參加的男生和女生相差最多？',
    sumCat: (c) => `${c}參加的男生和女生共有幾人？`,
    sumGroup: (g) => `各班參加的${g}合起來共有幾人？`,
    sumAll: () => '參加貓咪社的男生和女生一共有幾人？',
  },
  {
    title: '喵喵商店兩天賣出的點心', cats: ['魚乾', '肉泥', '貓草', '餅乾', '罐頭'], groups: ['星期六', '星期日'], unit: '包',
    read: (c, g) => `${g}賣出的${c}有幾包？`,
    most: (g, max) => `${g}賣出最${max ? '多' : '少'}的是哪一種點心？`,
    equal: () => '哪一種點心星期六和星期日賣出的包數一樣多？',
    totalMost: (max) => `兩天合起來，哪一種點心賣出最${max ? '多' : '少'}？`,
    diff: (c) => `${c}星期六和星期日賣出的包數相差幾包？`,
    diffMost: () => '哪一種點心兩天賣出的包數相差最多？',
    sumCat: (c) => `${c}兩天共賣出幾包？`,
    sumGroup: (g) => `${g}各種點心合起來共賣出幾包？`,
    sumAll: () => '兩天所有的點心一共賣出幾包？',
  },
  {
    title: '五年級最喜歡的貓咪花色', cats: ['橘貓', '黑貓', '白貓', '三花貓', '虎斑貓'], groups: ['男生', '女生'], unit: '人',
    read: (c, g) => `喜歡${c}的${g}有幾人？`,
    most: (g, max) => `${g}最${max ? '多' : '少'}人喜歡的是哪一種貓？`,
    equal: () => '喜歡哪一種貓的男生和女生一樣多？',
    totalMost: (max) => `男生和女生合起來，最${max ? '多' : '少'}人喜歡的是哪一種貓？`,
    diff: (c) => `喜歡${c}的男生和女生相差幾人？`,
    diffMost: () => '喜歡哪一種貓的男生和女生相差最多？',
    sumCat: (c) => `喜歡${c}的男生和女生共有幾人？`,
    sumGroup: (g) => `參加投票的${g}共有幾人？`,
    sumAll: () => '參加投票的男生和女生一共有幾人？',
  },
];

function uniqueExtreme(arr, max) {
  const best = max ? Math.max(...arr) : Math.min(...arr);
  return arr.filter((v) => v === best).length === 1 ? arr.indexOf(best) : -1;
}

// 兩組 × 幾個類別的讀圖題（雙長條圖、堆疊長條圖共用）
// how(gi, ci) 說明怎麼讀出那一個數；preferGroup() 決定讀哪一組
function twoGroupQuestion(rng, ctx, cats, vals, tpl, how, preferGroup) {
  const u = ctx.unit;
  const n = cats.length;
  const tot = cats.map((_, i) => vals[0][i] + vals[1][i]);
  const list = (gi) => cats.map((c, i) => `${c} ${vals[gi][i]}`).join('、');
  const catChoice = (ans, prompt, explanation) => ({ kind: 'choice', prompt, answer: ans, distractors: cats.filter((c) => c !== ans), explanation });
  switch (tpl) {
    case 'read': {
      const ci = randInt(rng, 0, n - 1);
      const gi = preferGroup ? preferGroup() : randInt(rng, 0, 1);
      return { kind: 'input', prompt: ctx.read(cats[ci], ctx.groups[gi]), answer: vals[gi][ci], explanation: how(gi, ci) };
    }
    case 'most': {
      const gi = randInt(rng, 0, 1), max = rng() < 0.6;
      const i = uniqueExtreme(vals[gi], max);
      if (i < 0) return null;
      return catChoice(cats[i], ctx.most(ctx.groups[gi], max), `${ctx.groups[gi]}：${list(gi)}，最${max ? '多' : '少'}的是${cats[i]}。`);
    }
    case 'equal': {
      const eq = cats.map((_, i) => i).filter((i) => vals[0][i] === vals[1][i]);
      if (eq.length !== 1) return null;
      const i = eq[0];
      return catChoice(cats[i], ctx.equal(), `${cats[i]}的${ctx.groups[0]}和${ctx.groups[1]}都是 ${vals[0][i]} ${u}，一樣多。`);
    }
    case 'totalMost': {
      const max = rng() < 0.6;
      const i = uniqueExtreme(tot, max);
      if (i < 0) return null;
      return catChoice(cats[i], ctx.totalMost(max), `合計：${cats.map((c, j) => `${c} ${tot[j]}`).join('、')}，最${max ? '多' : '少'}的是${cats[i]}。`);
    }
    case 'diff': {
      const cand = cats.map((_, i) => i).filter((i) => vals[0][i] !== vals[1][i]);
      if (!cand.length) return null;
      const i = pick(rng, cand);
      const [a, b] = [Math.max(vals[0][i], vals[1][i]), Math.min(vals[0][i], vals[1][i])];
      return { kind: 'input', prompt: ctx.diff(cats[i]), answer: a - b, explanation: `${cats[i]}：${ctx.groups[0]} ${vals[0][i]}、${ctx.groups[1]} ${vals[1][i]}，${a} − ${b} = ${a - b}。` };
    }
    case 'diffMost': {
      const diffs = cats.map((_, i) => Math.abs(vals[0][i] - vals[1][i]));
      const i = uniqueExtreme(diffs, true);
      if (i < 0) return null;
      return catChoice(cats[i], ctx.diffMost(), `相差：${cats.map((c, j) => `${c} ${diffs[j]}`).join('、')}，${cats[i]}相差最多。`);
    }
    case 'sumCat': {
      const i = randInt(rng, 0, n - 1);
      return { kind: 'input', ci: i, prompt: ctx.sumCat(cats[i]), answer: tot[i], explanation: `${cats[i]}：${ctx.groups[0]} ${vals[0][i]} + ${ctx.groups[1]} ${vals[1][i]} = ${tot[i]}。` };
    }
    case 'sumGroup': {
      const gi = randInt(rng, 0, 1);
      return { kind: 'input', prompt: ctx.sumGroup(ctx.groups[gi]), answer: sum(vals[gi]), explanation: `${ctx.groups[gi]}：${vals[gi].join(' + ')} = ${sum(vals[gi])}。` };
    }
    case 'sumAll': {
      const s0 = sum(vals[0]), s1 = sum(vals[1]);
      return { kind: 'input', prompt: ctx.sumAll(), answer: s0 + s1, explanation: `${ctx.groups[0]}共 ${s0}，${ctx.groups[1]}共 ${s1}，${s0} + ${s1} = ${s0 + s1}。` };
    }
    default:
      return null;
  }
}

function finishTwoGroup(rng, q, svg, tags) {
  if (q.kind === 'input') return inputQ({ prompt: q.prompt, answer: q.answer, explanation: q.explanation, svg, tags });
  return choiceQ(rng, { prompt: q.prompt, answer: q.answer, distractors: q.distractors, explanation: q.explanation, svg, tags });
}

function forceOneEqual(rng, vals, lo, hi) {
  const k = randInt(rng, 0, vals[0].length - 1);
  vals[1][k] = vals[0][k];
  for (let i = 0; i < vals[0].length; i++) {
    while (i !== k && vals[1][i] === vals[0][i]) vals[1][i] = randInt(rng, lo, hi);
  }
}

// U1-A 雙長條圖
function genDoubleBar(rng, d) {
  const ctx = pick(rng, BAR_CTX);
  const n = d === 1 ? randInt(rng, 3, 4) : randInt(rng, 4, 5);
  const cats = ctx.cats.slice(0, n);
  const tpl = pick(rng, d === 1 ? ['read', 'read', 'most', 'equal']
    : d === 2 ? ['read', 'most', 'equal', 'diff', 'sumCat', 'totalMost']
      : ['diff', 'sumCat', 'totalMost', 'sumGroup', 'diffMost', 'most']);
  return retry(() => {
    const vals = [0, 1].map(() => cats.map(() => randInt(rng, 8, 16)));
    if (tpl === 'equal') forceOneEqual(rng, vals, 8, 16);
    const how = (gi, ci) => `${cats[ci]}的${ctx.groups[gi]}長條對齊刻度是 ${vals[gi][ci]}。`;
    const q = twoGroupQuestion(rng, ctx, cats, vals, tpl, how);
    if (!q) return null;
    const svg = D.doubleBarChart({ title: ctx.title, cats, groups: ctx.groups.map((name, i) => ({ name, color: GCOL[i], values: vals[i] })), yMax: 18, unit: ctx.unit });
    return finishTwoGroup(rng, q, svg, ['double-bar']);
  });
}

// U1-B 堆疊長條圖（直式、橫式）
function genStackedBar(rng, d) {
  const ctx = pick(rng, BAR_CTX);
  const n = randInt(rng, 4, 5);
  const cats = ctx.cats.slice(0, n);
  const horizontal = rng() < 0.45;
  const order = rng() < 0.5 ? [0, 1] : [1, 0]; // order[0] 在下面（左邊）
  const tpl = pick(rng, d === 1 ? ['read', 'read', 'sumCat']
    : d === 2 ? ['read', 'read', 'equal', 'most', 'sumCat', 'totalMost']
      : ['read', 'sumGroup', 'sumAll', 'diff', 'diffMost', 'equal']);
  const lower = horizontal ? '左邊' : '下面', upper = horizontal ? '右邊' : '上面';
  const end = horizontal ? '右端' : '頂端';
  return retry(() => {
    const vals = [0, 1].map(() => cats.map(() => randInt(rng, 5, 16)));
    if (tpl === 'equal') forceOneEqual(rng, vals, 5, 16);
    const tot = cats.map((_, i) => vals[0][i] + vals[1][i]);
    if (Math.max(...tot) > 30) return null;
    const how = (gi, ci) => {
      const g = ctx.groups[gi];
      if (gi === order[0]) return `${cats[ci]}的${g}在${lower}那一段，讀到接縫是 ${vals[gi][ci]}。`;
      return `${cats[ci]}的${g}在${upper}那一段：${end} ${tot[ci]} − 接縫 ${vals[order[0]][ci]} = ${vals[gi][ci]}。`;
    };
    // 讀圖題多考「上面那一段」（常見錯誤：直接讀頂端）
    const prefer = () => (rng() < 0.7 ? order[1] : order[0]);
    const q = twoGroupQuestion(rng, ctx, cats, vals, tpl, how, prefer);
    if (!q) return null;
    if (tpl === 'sumCat') q.explanation = `合計就是整條的${end}，對齊刻度是 ${tot[q.ci]}。`;
    const max = Math.min(32, Math.ceil((Math.max(...tot) + 1) / 2) * 2);
    const svg = D.stackedBarChart({
      title: ctx.title, cats, unit: ctx.unit, max, horizontal,
      stack: order.map((gi) => ({ name: ctx.groups[gi], color: GCOL[gi], values: vals[gi] })),
      legendOrder: ctx.groups,
    });
    return finishTwoGroup(rng, q, svg, ['stacked-bar']);
  });
}

const LINE2_CTX = [
  {
    title: '喵喵樂園每月入園人數', groups: ['大人', '小孩'],
    read: (m, g) => `${m}入園的${g}有幾人？`,
    more: () => '哪幾個月入園的大人比小孩多？（全部選出來）',
    change: (m1, m2, g, up) => `從${m1}到${m2}，入園的${g}${up ? '增加' : '減少'}了幾人？`,
    total: (m1, m2, g) => `${m1}到${m2}這 4 個月，入園的${g}共有幾人？`,
    diff: (m) => `${m}入園的大人和小孩相差幾人？`,
    gapMost: () => '哪一個月入園的大人和小孩相差最多？',
  },
  {
    title: '兩家貓咪咖啡廳每月的客人數', groups: ['甲店', '乙店'],
    read: (m, g) => `${m}${g}有幾位客人？`,
    more: () => '哪幾個月甲店的客人比乙店多？（全部選出來）',
    change: (m1, m2, g, up) => `從${m1}到${m2}，${g}的客人${up ? '增加' : '減少'}了幾人？`,
    total: (m1, m2, g) => `${m1}到${m2}這 4 個月，${g}共有幾位客人？`,
    diff: (m) => `${m}甲店和乙店的客人相差幾人？`,
    gapMost: () => '哪一個月甲店和乙店的客人相差最多？',
  },
];

// U1-C 雙折線圖（縱軸每格 10，下方有省略符號）
function genDoubleLine(rng, d) {
  const ctx = pick(rng, LINE2_CTX);
  const n = randInt(rng, 5, 6);
  const s = randInt(rng, 0, 12 - n);
  const ms = MONTHS.slice(s, s + n);
  const tpl = pick(rng, d === 1 ? ['read', 'read', 'diff'] : d === 2 ? ['read', 'more', 'change', 'change', 'diff'] : ['total', 'gapMost', 'change', 'more']);
  const [g0, g1] = ctx.groups;
  return retry(() => {
    const v = [0, 1].map(() => ms.map(() => randInt(rng, 57, 65) * 10));
    if (v[0].some((x, i) => x === v[1][i])) return null; // 不要同一點重疊
    let q;
    if (tpl === 'read') {
      const i = randInt(rng, 0, n - 1), gi = randInt(rng, 0, 1);
      q = { kind: 'input', prompt: ctx.read(ms[i], ctx.groups[gi]), answer: v[gi][i], explanation: `在${ms[i]}那條直線上找${ctx.groups[gi]}的點，對齊縱軸是 ${v[gi][i]}。` };
    } else if (tpl === 'more') {
      const ans = ms.filter((_, i) => v[0][i] > v[1][i]);
      if (ans.length < 1 || ans.length > n - 1) return null;
      return multiQ({
        prompt: ctx.more(), options: ms, answer: ans, svg: chart(), tags: ['double-line'],
        explanation: `${g0}的點在${g1}上面的月份是：${joinCN(ans)}。`,
      });
    } else if (tpl === 'change') {
      const gi = randInt(rng, 0, 1);
      const i = randInt(rng, 0, n - 2);
      const j = d === 3 ? randInt(rng, i + 1, n - 1) : i + 1;
      const a = v[gi][i], b = v[gi][j];
      if (a === b) return null;
      const up = b > a;
      q = { kind: 'input', prompt: ctx.change(ms[i], ms[j], ctx.groups[gi], up), answer: Math.abs(b - a),
        explanation: `${ms[i]} ${a} 人，${ms[j]} ${b} 人，${Math.max(a, b)} − ${Math.min(a, b)} = ${Math.abs(b - a)}（要兩個月相減）。` };
    } else if (tpl === 'total') {
      if (n < 4) return null;
      const i = randInt(rng, 0, n - 4), gi = randInt(rng, 0, 1);
      const four = v[gi].slice(i, i + 4);
      q = { kind: 'input', prompt: ctx.total(ms[i], ms[i + 3], ctx.groups[gi]), answer: sum(four), explanation: `${four.join(' + ')} = ${sum(four)}。` };
    } else if (tpl === 'diff') {
      const i = randInt(rng, 0, n - 1);
      const a = Math.max(v[0][i], v[1][i]), b = Math.min(v[0][i], v[1][i]);
      q = { kind: 'input', prompt: ctx.diff(ms[i]), answer: a - b, explanation: `${ms[i]}：${g0} ${v[0][i]}、${g1} ${v[1][i]}，${a} − ${b} = ${a - b}。` };
    } else {
      const gaps = ms.map((_, i) => Math.abs(v[0][i] - v[1][i]));
      const i = uniqueExtreme(gaps, true);
      if (i < 0) return null;
      q = { kind: 'choice', prompt: ctx.gapMost(), answer: ms[i], distractors: ms.filter((m) => m !== ms[i]),
        explanation: `兩條線離最遠的是${ms[i]}：${Math.max(v[0][i], v[1][i])} − ${Math.min(v[0][i], v[1][i])} = ${gaps[i]}。` };
    }
    return finishTwoGroup(rng, q, chart(), ['double-line']);

    function chart() {
      return D.lineChart({
        title: ctx.title, xs: ms, unit: '(人)', y0: 5600, step: 100, rows: 10, brk: true, labelAt: () => true,
        series: [{ name: g0, color: C.a, marker: 'circle', values10: v[0].map((x) => x * 10) }, { name: g1, color: C.b, marker: 'square', values10: v[1].map((x) => x * 10) }],
      });
    }
  });
}

const CHART_USE = [
  ['小橘從 1 月到 6 月體重的變化', '折線圖'],
  ['一天當中，每 2 小時量一次的氣溫', '折線圖'],
  ['喵喵商店每個月賣出魚乾數量的增減', '折線圖'],
  ['一株向日葵每星期長高的情形', '折線圖'],
  ['小黑每年生日量的身高', '折線圖'],
  ['五年級各班最喜歡的點心票數', '長條圖'],
  ['四種口味貓罐頭賣出的數量', '長條圖'],
  ['喵喵學園各個社團的人數', '長條圖'],
  ['公園裡各種顏色的貓各有幾隻', '長條圖'],
  ['各班男生和女生參加運動會的人數', '長條圖'],
];

const CHART_TF = [
  ['折線圖適合用來看資料隨著時間增加或減少的情形。', true, '折線圖把點依序連起來，最容易看出上升或下降。', 'chart-use'],
  ['雙長條圖可以同時比較兩組資料，例如各班的男生和女生。', true, '每個類別並排兩條長條，兩組可以一起比較。', 'chart-use'],
  ['堆疊長條圖上面那一段的數量，就是那一段頂端對齊的刻度。', false, '上面那一段要用「頂端的刻度 − 接縫的刻度」。', 'stacked-bar'],
  ['縱軸用了「≈」省略一段時，圖上的點高了 2 倍，數量也一定是 2 倍。', false, '「≈」省略了 0 到某個刻度，縱軸不是從 0 開始，不能用高度比倍數。', 'line-break'],
  ['要比較五個班喜歡的點心票數，用長條圖比用折線圖合適。', true, '這是不同類別比多少，用長條圖。', 'chart-use'],
  ['在折線圖上，兩個點之間的線越陡，表示變化越大。', true, '線越陡，表示上升或下降的數量越多。', 'line-read'],
];

// U1-D 選圖概念題
function genChartUse(rng) {
  if (rng() < 0.6) {
    const [s, ans] = pick(rng, CHART_USE);
    return choiceQ(rng, {
      prompt: `要表示「${s}」，用哪一種圖比較合適？`, answer: ans, fixed: ['長條圖', '折線圖'], tags: ['chart-use'],
      explanation: ans === '折線圖' ? '這是隨著時間（順序）改變的資料，用折線圖最容易看出增加或減少。' : '這是不同類別之間比多少，用長條圖比較清楚。',
    });
  }
  return tfFromList(rng, CHART_TF);
}

// ---------- 1-2 繪製折線圖 ----------
const LINE_KINDS = [
  {
    key: 'temp', title: '喵喵村一天的氣溫', what: '氣溫', unit: '度', yUnit: '(度)', head: '時間',
    xs: () => ['8時', '10時', '12時', '14時', '16時', '18時'], xTitle: '(時)', y0: 0, step: 20, rows: 15, kmin: 5, kmax: 15, brk: false,
    labelAt: () => true, sparse: (k) => k % 5 === 0,
    maxQ: (max) => `哪一個時間的氣溫最${max ? '高' : '低'}？`, upWord: '上升', downWord: '下降',
    readQ: (x) => `${x}的氣溫是幾度？`, stmt: (x, v) => `${x}的氣溫是 ${v} 度`,
  },
  {
    key: 'fish', title: '喵喵商店每天賣出的魚乾', what: '賣出的魚乾', unit: '包', yUnit: '(包)', head: '星期',
    xs: () => ['星期一', '星期二', '星期三', '星期四', '星期五', '星期六'], xTitle: '(星期)', y0: 1240, step: 10, rows: 17, kmin: 1, kmax: 16, brk: true,
    labelAt: (k) => k % 2 === 0, sparse: (k) => k % 4 === 0,
    maxQ: (max) => `哪一天賣出的魚乾最${max ? '多' : '少'}？`, upWord: '增加', downWord: '減少',
    readQ: (x) => `${x}賣出幾包魚乾？`, stmt: (x, v) => `${x}賣出 ${v} 包魚乾`,
  },
  {
    key: 'save', title: '小橘每個月的存款', what: '存款', unit: '千元', yUnit: '(千元)', head: '月份',
    xs: (rng) => { const s = randInt(rng, 0, 6); return MONTHS.slice(s, s + 6); }, xTitle: '(月)', y0: 70, step: 10, rows: 6, kmin: 1, kmax: 5, brk: true,
    labelAt: () => true, sparse: (k) => k % 3 === 0,
    maxQ: (max) => `哪一個月的存款最${max ? '多' : '少'}？`, upWord: '增加', downWord: '減少',
    readQ: (x) => `${x}的存款是多少千元？`, stmt: (x, v) => `${x}的存款是 ${v} 千元`,
  },
  {
    key: 'weight', title: '小美每個月的體重', what: '體重', unit: '公斤', yUnit: '(公斤)', head: '月份',
    xs: (rng) => { const s = randInt(rng, 0, 6); return MONTHS.slice(s, s + 6); }, xTitle: '(月)', y0: 356, step: 2, rows: 15, kmin: 2, kmax: 14, brk: true,
    labelAt: (k) => (356 + 2 * k) % 10 === 0, sparse: (k) => (356 + 2 * k) % 10 === 0,
    maxQ: (max) => `哪一個月的體重最${max ? '重' : '輕'}？`, upWord: '增加', downWord: '減少',
    readQ: (x) => `${x}的體重是多少公斤？`, stmt: (x, v) => `${x}的體重是 ${v} 公斤`,
  },
];

const shortX = (x) => x.replace('星期', '').replace('月', '').replace('時', '');
const kv = (kind, k) => kind.y0 + kind.step * k; // 第 k 條格線的值（十分之一）

function randomSeries(rng, kind, n) {
  return retry(() => {
    const ks = Array.from({ length: n }, () => randInt(rng, kind.kmin, kind.kmax));
    for (let i = 1; i < n; i++) if (ks[i] === ks[i - 1]) return null;
    return ks;
  });
}

function kindChart(kind, xs, ks, o = {}) {
  return D.lineChart({
    title: o.noTitle ? '' : kind.title, xs, unit: kind.yUnit, y0: kind.y0, step: kind.step, rows: kind.rows, brk: kind.brk,
    labelAt: o.labelAt ?? kind.labelAt, blanks: o.blanks, fmt: f10,
    series: ks ? [{ name: kind.what, color: C.a, marker: 'circle', values10: ks.map((k) => kv(kind, k)) }] : [{ name: kind.what }],
  });
}

// 讀點（U1-H 的讀值）
function genReadPoint(rng, d) {
  const kind = d === 3 ? pick(rng, [LINE_KINDS[3], LINE_KINDS[3], LINE_KINDS[1]]) : pick(rng, LINE_KINDS.slice(0, 3));
  const xs = kind.xs(rng);
  const ks = randomSeries(rng, kind, xs.length);
  const i = randInt(rng, 0, xs.length - 1);
  const v = kv(kind, ks[i]);
  const decimal = v % 10 !== 0;
  const lab = [...range(0, ks[i])].reverse().find((k) => kind.labelAt(k));
  const grids = ks[i] - lab;
  return inputQ({
    prompt: kind.readQ(xs[i]), answer: f10(v), keypad: kind.step < 10 ? 'decimal' : 'digits',
    accept: !decimal && kind.step < 10 ? [`${v / 10}.0`] : [],
    svg: kindChart(kind, xs, ks), tags: ['line-read'],
    explanation: grids === 0 ? `${xs[i]}的點剛好在 ${f10(kv(kind, lab))} 那條線上。`
      : `每格代表 ${f10(kind.step)}，${xs[i]}的點在 ${f10(kv(kind, lab))} 往上 ${grids} 格，是 ${f10(v)} ${kind.unit}。`,
  });
}

// U1-E 簡化：描點要畫在第幾格
function genPlotPosition(rng, d) {
  const kind = d === 3 ? LINE_KINDS[3] : pick(rng, LINE_KINDS);
  const xs = kind.xs(rng);
  return retry(() => {
    const k = randInt(rng, kind.kmin, kind.kmax);
    if (kind.sparse(k)) return null;
    const lab = [...range(0, k)].reverse().find((j) => kind.sparse(j));
    const v = kv(kind, k), L = kv(kind, lab);
    const x = pick(rng, xs);
    return inputQ({
      prompt: `縱軸每格代表 ${f10(kind.step)} ${kind.unit}。${kind.stmt(x, f10(v))}，這個點要畫在 ${f10(L)} ${kind.unit}那條線往上幾格？`,
      answer: k - lab, svg: kindChart(kind, xs, null, { labelAt: kind.sparse }), tags: ['line-plot'],
      explanation: kind.step < 10 ? `${f10(v)} − ${f10(L)} = ${f10(v - L)}，${f10(v - L)} 裡有 ${k - lab} 個 ${f10(kind.step)}，所以往上 ${k - lab} 格。`
        : kind.step === 10 ? `${f10(v)} − ${f10(L)} = ${f10(v - L)}，每格 1 ${kind.unit}，所以往上 ${k - lab} 格。`
          : `${f10(v)} − ${f10(L)} = ${f10(v - L)}，${f10(v - L)} ÷ ${f10(kind.step)} = ${k - lab}，所以往上 ${k - lab} 格。`,
    });
  });
}

// U1-G 縱軸刻度：每格代表多少、圓圈裡填多少
function genAxisScale(rng, d) {
  const kind = pick(rng, d === 1 ? LINE_KINDS.slice(0, 3) : LINE_KINDS);
  const xs = kind.xs(rng);
  const ks = randomSeries(rng, kind, xs.length);
  if (rng() < 0.5) {
    return inputQ({
      prompt: `看縱軸的刻度，每一格代表多少${kind.unit}？`, answer: f10(kind.step), keypad: kind.step < 10 ? 'decimal' : 'digits',
      svg: kindChart(kind, xs, ks, { labelAt: kind.sparse }), tags: ['line-scale'],
      explanation: (() => {
        const labs = range(0, kind.rows).filter(kind.sparse);
        const [a, b] = [labs[0], labs[1]];
        return `${f10(kv(kind, a))} 到 ${f10(kv(kind, b))} 相差 ${f10(kv(kind, b) - kv(kind, a))}，中間有 ${b - a} 格，每格是 ${f10(kind.step)}。`;
      })(),
    });
  }
  return retry(() => {
    const k = randInt(rng, 1, kind.rows - 1);
    if (kind.sparse(k)) return null;
    const lab = [...range(0, k)].reverse().find((j) => kind.sparse(j));
    return inputQ({
      prompt: '縱軸上「甲」那條格線應該寫多少？', answer: f10(kv(kind, k)), keypad: kind.step < 10 ? 'decimal' : 'digits',
      svg: kindChart(kind, xs, ks, { labelAt: kind.sparse, blanks: { [k]: '甲' } }), tags: ['line-scale'],
      explanation: `每格代表 ${f10(kind.step)}，從 ${f10(kv(kind, lab))} 往上 ${k - lab} 格：${f10(kv(kind, lab))} + ${f10(kind.step * (k - lab))} = ${f10(kv(kind, k))}。`,
    });
  });
}

// U1-H 看折線圖找變化
function genLineChange(rng, d) {
  const kind = pick(rng, LINE_KINDS);
  const xs = kind.xs(rng);
  return retry(() => {
    const ks = randomSeries(rng, kind, xs.length);
    const svg = kindChart(kind, xs, ks);
    if (d === 1 || rng() < 0.35) {
      const max = rng() < 0.6;
      const i = uniqueExtreme(ks, max);
      if (i < 0) return null;
      return choiceQ(rng, {
        prompt: kind.maxQ(max), answer: xs[i], distractors: xs.filter((x) => x !== xs[i]), svg, tags: ['line-read'],
        explanation: `折線上最${max ? '高' : '低'}的點在${xs[i]}，是 ${f10(kv(kind, ks[i]))} ${kind.unit}。`,
      });
    }
    const up = rng() < 0.5;
    const ch = ks.slice(1).map((k, i) => (k - ks[i]) * (up ? 1 : -1));
    const i = uniqueExtreme(ch, true);
    if (i < 0 || ch[i] <= 0) return null;
    const opts = xs.slice(1).map((x, j) => `${xs[j]}到${x}`);
    return choiceQ(rng, {
      prompt: `${kind.what}在哪一段時間${up ? kind.upWord : kind.downWord}最多？`, answer: opts[i], distractors: opts.filter((o) => o !== opts[i]), svg, tags: ['line-read'],
      explanation: `${opts[i]}：${f10(kv(kind, ks[i]))} → ${f10(kv(kind, ks[i + 1]))}，${up ? kind.upWord : kind.downWord}了 ${f10(kind.step * ch[i])} ${kind.unit}，這一段線最陡。`,
    });
  });
}

// U1-F 選出畫對的折線圖
function genWhichChart(rng) {
  const kind = pick(rng, LINE_KINDS);
  const xs = kind.xs(rng).slice(0, 5);
  return retry(() => {
    const ks = randomSeries(rng, kind, 5);
    const key = (a) => a.join(',');
    const seen = new Set([key(ks)]);
    const wrongs = [];
    const add = (a) => { if (a.every((k) => k >= kind.kmin && k <= kind.kmax) && !seen.has(key(a))) { seen.add(key(a)); wrongs.push(a); } };
    for (const i of sample(rng, range(0, 4), 2)) {
      const a = ks.slice();
      a[i] += pick(rng, [1, -1]);
      add(a);
    }
    for (const i of shuffle(rng, range(0, 3))) {
      if (ks[i] === ks[i + 1]) continue;
      const a = ks.slice();
      [a[i], a[i + 1]] = [a[i + 1], a[i]];
      add(a);
      break;
    }
    if (wrongs.length < 3) return null;
    const all = [ks, ...wrongs].flat();
    let lo = Math.max(0, Math.min(...all) - 1), hi = Math.min(kind.rows, Math.max(...all) + 1);
    while (hi - lo < 5) { if (lo > 0) lo--; else hi++; }
    const rows = hi - lo;
    const every = rows <= 8 ? 1 : 2;
    const mini = (a) => D.lineChart({
      compact: true, xs: xs.map(shortX), unit: kind.yUnit, y0: kv(kind, lo), step: kind.step, rows, brk: kv(kind, lo) > 0,
      labelAt: (k) => (k + lo) % every === 0, fmt: f10, series: [{ name: '', color: C.a, values10: a.map((k) => kv(kind, k)) }],
    });
    return svgChoiceQ(rng, {
      prompt: '把統計表畫成折線圖，哪一張畫對了？', correct: mini(ks), wrongs: wrongs.map(mini),
      svg: D.tableChart({ title: kind.title, head: [kind.head, ...xs], row: [`${kind.what}(${kind.unit})`, ...ks.map((k) => f10(kv(kind, k)))] }),
      tags: ['line-plot'],
      explanation: (lab) => `一個點一個點對照統計表：${lab}每個點都對；其他圖有的點差了一格，或兩個點畫反了。`,
    });
  });
}

// 依資料選縱軸刻度（每格代表多少）
const SCALE_SETS = [
  { what: '體重', unit: '公斤', head: '月份', xs: () => ['1月', '2月', '3月', '4月', '5月'], gen: (rng) => 360 + 2 * randInt(rng, 0, 12), ans: 2 },
  { what: '賣出的魚乾', unit: '包', head: '星期', xs: () => ['星期一', '星期二', '星期三', '星期四', '星期五'], gen: (rng) => 10 * randInt(rng, 125, 140), ans: 10 },
  { what: '氣溫', unit: '度', head: '時間', xs: () => ['8時', '10時', '12時', '14時', '16時'], gen: (rng) => 20 * randInt(rng, 5, 15), ans: 20 },
  { what: '入園人數', unit: '人', head: '月份', xs: () => ['3月', '4月', '5月', '6月', '7月'], gen: (rng) => 100 * randInt(rng, 57, 65), ans: 100 },
];
const STEP_CANDS = [1, 2, 5, 10, 20, 50, 100, 200, 500, 1000];

function genScaleChoice(rng) {
  const set = pick(rng, SCALE_SETS);
  return retry(() => {
    const vals = Array.from({ length: 5 }, () => set.gen(rng));
    const mn = Math.min(...vals), mx = Math.max(...vals);
    const mult = (s) => vals.every((v) => v % s === 0);
    const rowsOf = (s) => (mx - Math.floor(mn / s) * s) / s;
    const rA = rowsOf(set.ans);
    if (!mult(set.ans) || rA < 4) return null;
    const smaller = STEP_CANDS.filter((s) => s < set.ans && mult(s));
    const closeSmall = smaller[smaller.length - 1];
    const R = rA + randInt(rng, 0, rA - 1);
    const valid = STEP_CANDS.filter((s) => mult(s) && rowsOf(s) <= R);
    if (valid.length !== 1 || valid[0] !== set.ans) return null;
    const larger = STEP_CANDS.filter((s) => s > set.ans).slice(0, 2);
    const fmt = (s) => `${f10(s)} ${set.unit}`;
    return choiceQ(rng, {
      prompt: `要把統計表畫成折線圖，方格紙的縱軸只有 ${R} 格（下面可以用「≈」省略）。每格代表多少，才畫得下而且每個點都在格線上？`,
      answer: fmt(set.ans), distractors: [fmt(closeSmall), ...larger.map(fmt)],
      svg: D.tableChart({ head: [set.head, ...set.xs()], row: [`${set.what}(${set.unit})`, ...vals.map(f10)] }), tags: ['line-scale'],
      explanation: `資料都是 ${f10(set.ans)} 的倍數，每格 ${f10(set.ans)} ${set.unit}要 ${rA} 格，畫得下；每格 ${f10(closeSmall)} ${set.unit}要 ${rowsOf(closeSmall)} 格，太多了。`,
    });
  });
}

const BREAK_TF = [
  ['資料都在 125 到 140 之間，畫折線圖時可以用「≈」省略 0 到 124 這一段，讓圖比較清楚。', true, '數字都很大又很接近時，用「≈」省略下面一段，變化看得比較清楚。', 'line-break'],
  ['畫折線圖時，每個點要畫在那個月份（時間）的直線上。', true, '點要對齊橫軸的月份，再對齊縱軸的數量。', 'line-plot'],
  ['描好點以後，不用照順序，只要把點隨便連起來就好。', false, '要照橫軸的順序，用直線一個一個連起來。', 'line-plot'],
  ['縱軸每格代表的數，一定是 1。', false, '每格可以代表 1、2、10 或 0.2 等，要看資料決定。', 'line-scale'],
];

function genBreakConcept(rng, d) {
  const r = rng();
  if (r < 0.35) {
    return choiceQ(rng, {
      prompt: '折線圖的縱軸上有「≈」這個符號，它表示什麼？',
      answer: '省略了 0 到最下面刻度中間的一段',
      distractors: ['資料是估計的，不太準確', '這一段的資料都是 0', '縱軸每格代表的數變大了'], tags: ['line-break'],
      explanation: '「≈」是省略符號：0 到最下面刻度那一段沒有畫出來，縱軸不是從 0 開始。',
    });
  }
  if (r < 0.7 || d === 1) return tfFromList(rng, BREAK_TF);
  // 描點格數的是非題（常見錯誤：點畫差一格）
  const kind = pick(rng, [LINE_KINDS[3], LINE_KINDS[3], LINE_KINDS[0], LINE_KINDS[1]]);
  return retry(() => {
    const k = randInt(rng, kind.kmin, kind.kmax);
    if (kind.sparse(k)) return null;
    const lab = [...range(0, k)].reverse().find((j) => kind.sparse(j));
    const g = k - lab;
    const claim = rng() < 0.5 ? g : (kind.step === 2 && rng() < 0.5 ? g * 2 : g + pick(rng, [1, -1]));
    if (claim <= 0) return null;
    return tfQ({
      prompt: `縱軸每格代表 ${f10(kind.step)} ${kind.unit}，${f10(kv(kind, k))} ${kind.unit}要畫在 ${f10(kv(kind, lab))} ${kind.unit}那條線往上 ${claim} 格。`,
      answer: claim === g, tags: ['line-plot'],
      explanation: `${f10(kv(kind, k))} − ${f10(kv(kind, lab))} = ${f10(kv(kind, k) - kv(kind, lab))}，是 ${g} 個 ${f10(kind.step)}，要往上 ${g} 格。`,
    });
  });
}

function genDrawSteps() {
  return orderQ({
    prompt: '畫折線圖的步驟，依先後順序排排看。',
    items: ['看資料，決定縱軸每格代表多少', '在橫軸和縱軸標上時間和刻度', '在每個時間的直線上描點', '用直線依序把點連起來'],
    explanation: '先決定刻度並標好，再一個一個描點，最後依序連線。', tags: ['line-plot'],
  });
}

// ====================== 單元 2　因數和倍數 ======================

const factorPairs = (n) => divisors(n).filter((x) => x * x <= n).map((x) => `${x}×${n / x}`);

// ---------- 2-1 整除 ----------
function divPair(rng, d, exact) {
  const twoDigit = rng() < (d === 1 ? 0.2 : d === 2 ? 0.6 : 0.85);
  const dv = twoDigit ? randInt(rng, 11, 30) : randInt(rng, 2, 9);
  const qMax = Math.min(120, Math.floor(999 / dv) - 1);
  const q = !twoDigit && rng() < 0.3 ? randInt(rng, 100, qMax) : randInt(rng, 2, qMax);
  let r = 0;
  if (!exact) r = twoDigit && rng() < 0.6 ? randInt(rng, Math.max(1, dv - 3), dv - 1) : randInt(rng, 1, dv - 1);
  return { a: dv * q + r, dv, q, r, label: `${dv * q + r} ÷ ${dv}` };
}
const divText = (p) => (p.r ? `${p.a} ÷ ${p.dv} = ${p.q} 餘 ${p.r}` : `${p.a} ÷ ${p.dv} = ${p.q}`);

function genDivTF(rng, d) {
  const p = divPair(rng, d, rng() < 0.5);
  return tfQ({
    prompt: `「${p.label}」可以整除。`, answer: p.r === 0, tags: ['divisible'],
    explanation: p.r === 0 ? `${divText(p)}，沒有餘數，所以可以整除。` : `${divText(p)}，有餘數，所以不能整除。`,
  });
}

function genDivMulti(rng, d) {
  return retry(() => {
    const nExact = randInt(rng, 1, 3);
    const ps = [...range(1, 5)].map((i) => divPair(rng, d, i <= nExact));
    if (new Set(ps.map((p) => p.label)).size !== 5) return null;
    const ex = ps.filter((p) => p.r === 0);
    return multiQ({
      prompt: '下面哪些算式可以整除？（全部選出來）', options: shuffle(rng, ps.map((p) => p.label)), answer: ex.map((p) => p.label), tags: ['divisible'],
      explanation: `${ex.map(divText).join('；')}，沒有餘數；其他的都有餘數。`,
    });
  });
}

function genDivNotExact(rng, d) {
  return retry(() => {
    const bad = divPair(rng, Math.max(d, 2), false);
    const good = [1, 2, 3].map(() => divPair(rng, d, true));
    const labels = [bad, ...good].map((p) => p.label);
    if (new Set(labels).size !== 4) return null;
    return choiceQ(rng, {
      prompt: '下面哪一個算式不能整除？', answer: bad.label, distractors: good.map((p) => p.label), tags: ['divisible'],
      explanation: `${divText(bad)}，有餘數，所以不能整除。`,
    });
  });
}

function genShareBags(rng, d) {
  return retry(() => {
    const n = randInt(rng, 12, 36);
    const ds = divisors(n);
    if (ds.length < 4 || ds.length > 8) return null;
    if (rng() < 0.5 || d === 1) {
      const non = sample(rng, range(2, n - 1).filter((x) => n % x !== 0), Math.min(3, 10 - ds.length));
      return multiQ({
        prompt: `把 ${n} 片貓餅乾平分裝袋，每袋一樣多，而且剛好裝完（只裝 1 袋也可以）。每袋可以裝幾片？（全部選出來）`,
        options: [...ds, ...non].sort((a, b) => a - b), answer: ds, tags: ['factor'],
        explanation: `每袋裝的片數要能整除 ${n}，就是 ${n} 的因數：${joinCN(ds)}。`,
      });
    }
    return inputQ({
      prompt: `把 ${n} 片貓餅乾平分裝袋，每袋一樣多，而且剛好裝完（只裝 1 袋也算一種）。共有幾種裝法？`,
      answer: ds.length, tags: ['factor'],
      explanation: `${n} 的因數有 ${joinCN(ds)}，共 ${ds.length} 個，所以有 ${ds.length} 種裝法。`,
    });
  });
}

// ---------- 2-2 因數 ----------
function pickN(rng, lo, hi, minDiv, maxDiv) {
  return retry(() => {
    const n = randInt(rng, lo, hi);
    const c = divisors(n).length;
    return c >= minDiv && c <= maxDiv ? n : null;
  });
}

function genFactorList(rng, d) {
  const [lo, hi] = d === 1 ? [6, 40] : d === 2 ? [20, 72] : [40, 100];
  const prime = rng() < 0.12;
  const n = prime ? pickN(rng, lo, hi, 2, 2) : pickN(rng, lo, hi, 4, 8);
  const ds = divisors(n);
  const near = range(2, n - 1).filter((x) => n % x !== 0);
  const extra = [2 * n, ...sample(rng, near, 3)];
  const opts = [...ds, ...sample(rng, extra, Math.min(3, 10 - ds.length))].sort((a, b) => a - b);
  return multiQ({
    prompt: `${n} 的因數有哪些？（全部選出來）`, options: opts, answer: ds, tags: ['factor'],
    explanation: `用乘法配對：${joinCN(factorPairs(n))}，所以因數是 ${joinCN(ds)}。`,
  });
}

function genRectangles(rng) {
  const n = pickN(rng, 6, 36, 3, 9);
  const ds = divisors(n);
  return inputQ({
    prompt: `用 ${n} 張一樣大的正方形紙卡，全部排成一個長方形。「1 排 ${n} 張」和「${n} 排 1 張」算不同排法，共有幾種排法？`,
    answer: ds.length, tags: ['factor'],
    explanation: `每排的張數要是 ${n} 的因數：${joinCN(ds)}，共 ${ds.length} 種排法（問的是「幾種」）。`,
  });
}

function genShareCats(rng, d) {
  const n = pickN(rng, d === 1 ? 12 : 18, d === 3 ? 72 : 48, 4, 8);
  const ds = divisors(n).filter((x) => x !== 1 && x !== n);
  const non = sample(rng, range(2, Math.min(n - 1, 15)).filter((x) => n % x !== 0), 3);
  const opts = [...sample(rng, ds, Math.min(ds.length, 5)), ...non].sort((a, b) => a - b);
  const ans = opts.filter((x) => n % x === 0);
  return multiQ({
    prompt: `${n} 條小魚乾要平分給幾隻貓，剛好分完？下面哪些貓的隻數可以？（全部選出來）`, options: opts, answer: ans, tags: ['factor'],
    explanation: `隻數要能整除 ${n}，也就是 ${n} 的因數：${joinCN(ans)} 都可以。`,
  });
}

function genFactorExtreme(rng, d) {
  const n = rng() < 0.3 ? pickN(rng, 11, 97, 2, 2) : randInt(rng, 12, d === 1 ? 50 : 99);
  const r = rng();
  if (r < 0.4) {
    return choiceQ(rng, {
      prompt: `${n} 最大的因數是多少？`, answer: n, distractors: [n + 1, 2 * n, n - 1], sortNum: true, tags: ['factor', 'factor-multiple'],
      explanation: `${n} ÷ ${n} = 1，最大的因數就是 ${n} 自己；比 ${n} 大的數不會是 ${n} 的因數。`,
    });
  }
  if (r < 0.7) {
    return choiceQ(rng, {
      prompt: `${n} 最小的因數是多少？`, answer: 1, distractors: [n, 2, n + 1], sortNum: true, tags: ['factor', 'factor-multiple'],
      explanation: `任何整數 ÷ 1 都能整除，所以最小的因數是 1。`,
    });
  }
  const ds = divisors(n);
  return inputQ({
    prompt: `${n} 共有幾個因數？`, answer: ds.length, tags: ['factor'],
    explanation: `${n} 的因數是 ${joinCN(ds)}，共 ${ds.length} 個。`,
  });
}

function genWhichFactor(rng, d) {
  const n = pickN(rng, 12, d === 1 ? 48 : 99, 5, 12);
  const ds = divisors(n).filter((x) => x !== 1 && x !== n);
  const nonDiv = range(2, n - 1).filter((x) => n % x !== 0);
  if (rng() < 0.6) {
    const ans = pick(rng, ds);
    return choiceQ(rng, {
      prompt: `下面哪一個是 ${n} 的因數？`, answer: ans, distractors: [2 * n, ...sample(rng, nonDiv, 3)], sortNum: true, tags: ['factor', 'factor-multiple'],
      explanation: `${n} ÷ ${ans} = ${n / ans}，可以整除，所以 ${ans} 是 ${n} 的因數。${2 * n} 是 ${n} 的倍數，不是因數。`,
    });
  }
  const ans = pick(rng, nonDiv);
  return choiceQ(rng, {
    prompt: `下面哪一個不是 ${n} 的因數？`, answer: ans, distractors: sample(rng, ds, 3), sortNum: true, tags: ['factor'],
    explanation: `${n} ÷ ${ans} = ${Math.floor(n / ans)} 餘 ${n % ans}，不能整除，所以 ${ans} 不是 ${n} 的因數。`,
  });
}

// 因數、倍數方向（常見錯誤）
function genDirectionTF(rng) {
  const a = randInt(rng, 2, 12), m = randInt(rng, 2, 9);
  const b = a * m;
  const forms = [
    [`${a} 是 ${b} 的因數。`, true],
    [`${b} 是 ${a} 的因數。`, false],
    [`${b} 是 ${a} 的倍數。`, true],
    [`${a} 是 ${b} 的倍數。`, false],
    [`因為 ${a} × ${m} = ${b}，所以 ${a} 和 ${m} 都是 ${b} 的因數。`, true],
    [`因為 ${a} × ${m} = ${b}，所以 ${b} 是 ${a} 的因數。`, false],
  ];
  const [prompt, answer] = pick(rng, forms);
  return tfQ({
    prompt, answer, tags: ['factor-multiple'],
    explanation: `${b} ÷ ${a} = ${m}，可以整除：小的 ${a} 是 ${b} 的因數，大的 ${b} 是 ${a} 的倍數。`,
  });
}

// ---------- 2-3 公因數和最大公因數 ----------
function gcdPair(rng, d, needG2 = false) {
  const max = d === 1 ? 40 : d === 2 ? 72 : 100;
  return retry(() => {
    const g = rng() < 0.12 && !needG2 ? 1 : randInt(rng, 2, d === 1 ? 8 : 18);
    const m = randInt(rng, 1, 12), n = randInt(rng, 2, 12);
    if (m === n || gcd(m, n) !== 1) return null;
    const a = g * m, b = g * n;
    if (a > max || b > max || a < 6 || b < 6) return null;
    return a < b ? { a, b, g } : { a: b, b: a, g };
  });
}
const commonDivs = (a, b) => divisors(gcd(a, b));

function genGcdInput(rng, d) {
  const { a, b, g } = gcdPair(rng, d);
  const cd = commonDivs(a, b);
  return inputQ({
    prompt: `${a} 和 ${b} 的最大公因數是多少？`, answer: g, tags: ['gcd'],
    explanation: cd.length === 1 ? `${a} 和 ${b} 的公因數只有 1，所以最大公因數是 1。` : `${a} 和 ${b} 的公因數有 ${joinCN(cd)}，最大的是 ${g}。`,
  });
}

function genCommonFactors(rng, d) {
  return retry(() => {
    const { a, b } = gcdPair(rng, d);
    const cd = commonDivs(a, b);
    if (cd.length > 6) return null;
    const only = [...divisors(a), ...divisors(b)].filter((x) => !cd.includes(x));
    const uniq = [...new Set(only)];
    if (uniq.length < 2) return null;
    const opts = [...cd, ...sample(rng, uniq, Math.min(uniq.length, 9 - cd.length, 4))].sort((x, y) => x - y);
    if (rng() < 0.5) {
      return multiQ({
        prompt: `${a} 和 ${b} 的公因數有哪些？（全部選出來）`, options: opts, answer: cd, tags: ['gcd'],
        explanation: `同時能整除 ${a} 和 ${b} 的數：${joinCN(cd)}。`,
      });
    }
    return inputQ({
      prompt: `${a} 和 ${b} 共有幾個公因數？`, answer: cd.length, tags: ['gcd'],
      explanation: `${a} 和 ${b} 的公因數有 ${joinCN(cd)}，共 ${cd.length} 個。`,
    });
  });
}

function genGcdChoice(rng, d) {
  const { a, b, g } = gcdPair(rng, d, true);
  const cd = commonDivs(a, b).filter((x) => x !== g);
  return choiceQ(rng, {
    prompt: `${a} 和 ${b} 的最大公因數是多少？`, answer: g, distractors: [lcm(a, b), ...cd.slice(-2), a, 1], sortNum: true, tags: ['gcd', 'factor-multiple'],
    explanation: `${a} 和 ${b} 的公因數有 ${joinCN(commonDivs(a, b))}，最大的是 ${g}。${lcm(a, b)} 是最小公倍數，不是公因數。`,
  });
}

function genGrouping(rng, d) {
  return retry(() => {
    const { a, b, g } = gcdPair(rng, 2, true);
    if (a < 12 || b > 60 || b > 2.2 * a) return null;
    const boys = rng() < 0.5 ? a : b, girls = boys === a ? b : a;
    const cd = commonDivs(a, b);
    const head = `五年級有男生 ${boys} 人、女生 ${girls} 人，要分組玩遊戲，每組的男生一樣多，女生也一樣多，而且全部分完。`;
    const r = rng();
    if (r < 0.35) {
      return inputQ({ prompt: `${head}最多可以分成幾組？`, answer: g, tags: ['gcd'],
        explanation: `組數要是 ${boys} 和 ${girls} 的公因數，最大公因數是 ${g}，所以最多 ${g} 組。` });
    }
    if (r < 0.55) {
      return inputQ({ prompt: `${head}如果分成最多組，每組有幾個男生？`, answer: boys / g, tags: ['gcd'],
        explanation: `最多分成 ${g} 組（最大公因數），每組男生 ${boys} ÷ ${g} = ${boys / g} 人。` });
    }
    if (r < 0.8) {
      return inputQ({ prompt: `${head}共有幾種分法？（全部分成 1 組也算一種）`, answer: cd.length, tags: ['gcd'],
        explanation: `組數可以是公因數 ${joinCN(cd)}，共 ${cd.length} 種分法。` });
    }
    const cands = cd.filter((x) => x > 1);
    const non = range(2, Math.min(boys, 15)).filter((x) => !cd.includes(x));
    const opts = [...cands, ...sample(rng, non, Math.max(0, Math.min(non.length, 7 - cands.length, 4)))].sort((x, y) => x - y);
    if (opts.length < 3) return null;
    return multiQ({ prompt: `${head}下面哪些組數可以做到？（全部選出來）`, options: opts, answer: cands, tags: ['gcd'],
      explanation: `組數要同時能整除 ${boys} 和 ${girls}：${joinCN(cands)} 都可以。` });
  });
}

function genGcdTF(rng, d) {
  if (rng() < 0.3) {
    return tfFromList(rng, [
      ['1 是任何兩個整數的公因數。', true, '任何整數 ÷ 1 都能整除，所以 1 一定是公因數。', 'gcd'],
      ['兩個數的最大公因數，一定比這兩個數都小。', false, '例如 6 和 12 的最大公因數是 6，和 6 一樣大。', 'gcd'],
      ['兩個數的公因數中，最大的那一個叫作最大公因數。', true, '這就是最大公因數的意思。', 'gcd'],
    ]);
  }
  const { a, b, g } = gcdPair(rng, d, true);
  const claim = pick(rng, [g, g, lcm(a, b), ...commonDivs(a, b).filter((x) => x !== g)]);
  return tfQ({
    prompt: `${a} 和 ${b} 的最大公因數是 ${claim}。`, answer: claim === g, tags: ['gcd'],
    explanation: `${a} 和 ${b} 的公因數有 ${joinCN(commonDivs(a, b))}，最大的是 ${g}。`,
  });
}

// ---------- 2-4 倍數 ----------
function multipleList(rng, k) {
  return retry(() => {
    const mults = range(10, 120).filter((x) => x % k === 0);
    const non = range(10, 120).filter((x) => x % k !== 0);
    const nm = randInt(rng, 4, 6);
    const picked = [...sample(rng, mults, nm), ...sample(rng, non, 9 - nm)];
    if (rng() < 0.4 && !picked.includes(k)) picked.push(k); else picked.push(pick(rng, non.filter((x) => !picked.includes(x))));
    const nums = [...new Set(picked)].sort((a, b) => a - b);
    return nums.length === 10 ? nums : null;
  });
}

function genMultipleList(rng, d) {
  const k = randInt(rng, 6, 12);
  const nums = multipleList(rng, k);
  const ans = nums.filter((x) => x % k === 0);
  const asFactor = rng() < (d === 1 ? 0.3 : 0.55);
  return multiQ({
    prompt: asFactor ? `${k} 是下面哪些數的因數？（全部選出來）` : `下面哪些數是 ${k} 的倍數？（全部選出來）`,
    options: nums, answer: ans, tags: ['multiple', 'factor-multiple'],
    explanation: asFactor ? `「${k} 是某數的因數」就是「某數是 ${k} 的倍數」：${joinCN(ans)}。`
      : `能被 ${k} 整除的數就是 ${k} 的倍數：${joinCN(ans)}。`,
  });
}

function genLargestMultiple(rng) {
  const k = randInt(rng, 6, 25), N = randInt(rng, 50, 300);
  const q = Math.floor(N / k), r = N % k;
  return inputQ({
    prompt: `1 到 ${N} 的整數中，${k} 的倍數最大是多少？`, answer: q * k, tags: ['multiple'],
    explanation: r === 0 ? `${N} ÷ ${k} = ${q}，剛好整除，所以 ${N} 本身就是。` : `${N} ÷ ${k} = ${q} 餘 ${r}，${k} × ${q} = ${q * k}。`,
  });
}

function genDecadeShare(rng) {
  const D10 = randInt(rng, 2, 9), k = randInt(rng, 3, 9);
  const opts = range(D10 * 10 + 1, D10 * 10 + 9);
  const ans = opts.filter((x) => x % k === 0);
  return multiQ({
    prompt: `有${cn(D10)}十幾顆糖果，平分給 ${k} 隻貓剛好分完。糖果可能有幾顆？（全部選出來）`, options: opts, answer: ans, tags: ['multiple'],
    explanation: `顆數要是 ${k} 的倍數，${opts[0]} 到 ${opts[8]} 中有 ${joinCN(ans)}，每一個都要寫出來。`,
  });
}

function genLeastAdd(rng) {
  return retry(() => {
    const a = randInt(rng, 100, 999), k = randInt(rng, 6, 40);
    const q = Math.floor(a / k), r = a % k;
    if (r === 0) return null;
    if (rng() < 0.7) {
      return inputQ({
        prompt: `${a} 最少要加上多少，才會是 ${k} 的倍數？`, answer: k - r, tags: ['multiple'],
        explanation: `${a} ÷ ${k} = ${q} 餘 ${r}，再加 ${k} − ${r} = ${k - r}，就是 ${k} × ${q + 1} = ${k * (q + 1)}。`,
      });
    }
    return inputQ({
      prompt: `${a} 最少要減去多少，才會是 ${k} 的倍數？`, answer: r, tags: ['multiple'],
      explanation: `${a} ÷ ${k} = ${q} 餘 ${r}，減去餘數 ${r}，就是 ${k} × ${q} = ${k * q}。`,
    });
  });
}

function genNearestMultiple(rng) {
  return retry(() => {
    const k = randInt(rng, 11, 50), N = randInt(rng, 100, 500);
    const r = N % k;
    if (r === 0 || 2 * r === k) return null;
    const lo = N - r, hi = lo + k;
    const ans = N - lo < hi - N ? lo : hi;
    return inputQ({
      prompt: `最接近 ${N} 的 ${k} 的倍數是多少？`, answer: ans, tags: ['multiple'],
      explanation: `${k} × ${lo / k} = ${lo}，${k} × ${hi / k} = ${hi}；${N} 離 ${lo} 差 ${N - lo}，離 ${hi} 差 ${hi - N}，所以是 ${ans}。`,
    });
  });
}

function genBetweenMultiples(rng) {
  return retry(() => {
    const k = randInt(rng, 4, 12);
    const a = randInt(rng, 20, 80), b = a + randInt(rng, 15, 30);
    if (a % k === 0 || b % k === 0) return null;
    const inside = range(a + 1, b - 1);
    const ans = inside.filter((x) => x % k === 0);
    if (ans.length < 1 || ans.length > 4) return null;
    const non = inside.filter((x) => x % k !== 0);
    const opts = [...ans, ...sample(rng, non, 7 - ans.length)].sort((x, y) => x - y);
    return multiQ({
      prompt: `${a} 到 ${b} 之間，${k} 的倍數有哪些？（全部選出來）`, options: opts, answer: ans, tags: ['multiple'],
      explanation: `${k} × ${ans[0] / k} = ${ans[0]} 開始，每次加 ${k}：${joinCN(ans)}。`,
    });
  });
}

function genSmallestMultiple(rng) {
  const k = randInt(rng, 6, 99);
  if (rng() < 0.7) {
    return choiceQ(rng, {
      prompt: `${k} 的倍數中，最小的是多少？`, answer: k, distractors: [1, 2 * k, '沒有最小的'], tags: ['multiple', 'factor-multiple'],
      explanation: `${k} × 1 = ${k}，最小的倍數就是 ${k} 自己；最小的「因數」才是 1。`,
    });
  }
  return choiceQ(rng, {
    prompt: `${k} 的倍數中，最大的是多少？`, answer: '沒有最大的', distractors: [k * 10, k * k, k * 100], tags: ['multiple'],
    explanation: `${k} 的倍數是 ${k}、${2 * k}、${3 * k}……一直乘下去有無限多個，沒有最大的。`,
  });
}

function genWhichMultiple(rng) {
  return retry(() => {
    const k = randInt(rng, 6, 15);
    const ans = k * randInt(rng, 3, 12);
    const facs = divisors(k).filter((x) => x > 1 && x < k);
    const near = [ans + 1, ans - 1, ans + 2, ans + Math.floor(k / 2)].filter((x) => x % k !== 0);
    const ds = [...sample(rng, facs, 1), ...sample(rng, near, 3)];
    if (ds.length < 3) return null;
    return choiceQ(rng, {
      prompt: `下面哪一個是 ${k} 的倍數？`, answer: ans, distractors: ds, sortNum: true, tags: ['multiple', 'factor-multiple'],
      explanation: `${ans} ÷ ${k} = ${ans / k}，可以整除，所以 ${ans} 是 ${k} 的倍數。`,
    });
  });
}

// ---------- 2-5 公倍數和最小公倍數 ----------
const NL_PAIRS = [[2, 3], [2, 5], [2, 6], [3, 4], [3, 5], [3, 6], [4, 5], [4, 6]];

function genNumberLine(rng) {
  const [a, b] = shuffle(rng, pick(rng, NL_PAIRS));
  const max = 24;
  const mA = range(1, max).filter((x) => x % a === 0), mB = range(1, max).filter((x) => x % b === 0);
  const common = mA.filter((x) => x % b === 0);
  const onlyOne = [...mA, ...mB].filter((x) => !common.includes(x));
  const opts = [...common, ...sample(rng, [...new Set(onlyOne)], 8 - common.length)].sort((x, y) => x - y);
  return multiQ({
    prompt: `看數線，1 到 ${max} 之間，${a} 和 ${b} 的公倍數有哪些？（全部選出來）`, options: opts, answer: common,
    svg: D.numberLine({ max, marksA: mA, marksB: mB, nameA: `${a} 的倍數`, nameB: `${b} 的倍數` }), tags: ['lcm'],
    explanation: `圓點和方塊都有的數，就是公倍數：${joinCN(common)}。`,
  });
}

function lcmPair(rng, d) {
  const [lo, hi] = d === 1 ? [2, 12] : d === 2 ? [4, 20] : [6, 40];
  return retry(() => {
    const a = randInt(rng, lo, hi), b = randInt(rng, lo, hi);
    if (a >= b) return null;
    const L = lcm(a, b);
    if (L > 200 || b % a === 0) return null;
    if (gcd(a, b) === 1 && rng() < 0.6) return null; // 多出「相乘不是最小公倍數」的題
    return { a, b, L };
  });
}

function multiplesUpTo(k, L) {
  const list = [];
  for (let x = k; x <= L; x += k) list.push(x);
  return list.length > 6 ? `${list.slice(0, 4).join('、')}……${L}` : joinCN(list);
}

function genLcmInput(rng, d) {
  const { a, b, L } = lcmPair(rng, d);
  return inputQ({
    prompt: `${a} 和 ${b} 的最小公倍數是多少？`, answer: L, tags: ['lcm'],
    explanation: `找 ${b} 的倍數：${multiplesUpTo(b, L)}，第一個也是 ${a} 的倍數的是 ${L}。`,
  });
}

function genLcmChoice(rng, d) {
  const { a, b, L } = lcmPair(rng, d);
  if (rng() < 0.5) {
    return choiceQ(rng, {
      prompt: `${a} 和 ${b} 的最小公倍數是多少？`, answer: L, distractors: [a * b, gcd(a, b), 2 * L, a + b], sortNum: true, tags: ['lcm', 'factor-multiple'],
      explanation: a * b === L ? `${a} 和 ${b} 的公倍數最小是 ${L}。` : `${a} × ${b} = ${a * b} 是公倍數，但不是最小的；最小公倍數是 ${L}。`,
    });
  }
  const tri = (x) => `${x}、${2 * x}、${3 * x}`;
  return choiceQ(rng, {
    prompt: `由小到大寫出 ${a} 和 ${b} 的前三個公倍數，哪一組正確？`, answer: tri(L),
    distractors: [tri(a * b), tri(b), `${L}、${2 * L}、${4 * L}`, tri(L + b)], tags: ['lcm'],
    explanation: `最小公倍數是 ${L}，公倍數都是 ${L} 的倍數：${tri(L)}。`,
  });
}

function genLcmRange(rng) {
  return retry(() => {
    const a = randInt(rng, 2, 9), b = randInt(rng, 2, 9);
    if (a >= b) return null;
    const L = lcm(a, b);
    if (L > 45 || L === b) return null;
    const D10 = randInt(rng, 2, 9);
    const opts = range(D10 * 10 + 1, D10 * 10 + 9);
    const ans = opts.filter((x) => x % L === 0);
    if (ans.length < 1 || ans.length > 2) return null;
    const head = `有${cn(D10)}十幾顆貓餅乾，平分給 ${a} 隻貓或 ${b} 隻貓都剛好分完。`;
    const why = `顆數要是 ${a} 和 ${b} 的公倍數，也就是 ${L} 的倍數；${opts[0]} 到 ${opts[8]} 中是 ${joinCN(ans)}。`;
    if (ans.length === 1) return inputQ({ prompt: `${head}貓餅乾有幾顆？`, answer: ans[0], tags: ['lcm'], explanation: why });
    return multiQ({ prompt: `${head}貓餅乾可能有幾顆？（全部選出來）`, options: opts, answer: ans, tags: ['lcm'], explanation: why });
  });
}

function genLcmLeast(rng, d) {
  const { a, b, L } = lcmPair(rng, Math.min(d, 2));
  const ctx = pick(rng, [
    `貓咪排隊，每排 ${a} 隻或每排 ${b} 隻都剛好排完，最少有幾隻貓？`,
    `一盒魚乾平分給 ${a} 隻貓或 ${b} 隻貓都剛好分完，這盒魚乾最少有幾條？`,
  ]);
  return inputQ({ prompt: ctx, answer: L, tags: ['lcm'], explanation: `要同時是 ${a} 和 ${b} 的倍數，最少就是最小公倍數 ${L}。` });
}

function genLcmTF(rng, d) {
  const r = rng();
  if (r < 0.3) {
    return tfFromList(rng, [
      ['兩個數的公倍數有無限多個。', true, '最小公倍數乘 1、2、3……都是公倍數，一直都有。', 'lcm'],
      ['兩個數相乘的積，一定是這兩個數的公倍數。', true, 'a × b 是 a 的倍數，也是 b 的倍數。', 'lcm'],
      ['兩個數的公倍數中，最小的叫作最小公倍數。', true, '這就是最小公倍數的意思。', 'lcm'],
    ]);
  }
  const { a, b, L } = lcmPair(rng, d);
  if (r < 0.65) {
    const ok = a * b === L;
    return tfQ({
      prompt: `${a} × ${b} = ${a * b}，所以 ${a * b} 是 ${a} 和 ${b} 的最小公倍數。`, answer: ok, tags: ['lcm'],
      explanation: ok ? `${a} 和 ${b} 的最小公倍數剛好是 ${L}。` : `${a * b} 是公倍數，但最小公倍數是 ${L}，比 ${a * b} 小。`,
    });
  }
  const x = L * randInt(rng, 2, 4) + (rng() < 0.5 ? 0 : pick(rng, [a, b]));
  const ok = x % L === 0;
  return tfQ({
    prompt: `${x} 是 ${a} 和 ${b} 的公倍數。`, answer: ok, tags: ['lcm'],
    explanation: ok ? `${x} ÷ ${L} = ${x / L}，是最小公倍數 ${L} 的倍數，所以是公倍數。`
      : `${x} ÷ ${L} = ${Math.floor(x / L)} 餘 ${x % L}，不是 ${L} 的倍數，所以不是公倍數。`,
  });
}

// ---------- 2-6 找 2、5、10 的倍數 ----------
function numWithLast(rng, d, last) {
  const digits = d === 1 ? randInt(rng, 3, 4) : randInt(rng, 4, 6);
  const head = randInt(rng, 10 ** (digits - 2), 10 ** (digits - 1) - 1);
  return head * 10 + last;
}

const lastRule = {
  2: '2 的倍數個位是 0、2、4、6、8',
  5: '5 的倍數個位是 0 或 5',
  10: '10 的倍數個位是 0',
};

function genMult2510TF(rng, d) {
  const m = pick(rng, [2, 5, 10]);
  const n = numWithLast(rng, d, randInt(rng, 0, 9));
  const ok = n % m === 0;
  return tfQ({
    prompt: `${n} 是 ${m} 的倍數。`, answer: ok, tags: ['mult-2-5-10'],
    explanation: `看個位：${n} 的個位是 ${n % 10}，${lastRule[m]}，所以${ok ? '是' : '不是'} ${m} 的倍數。`,
  });
}

function genMult2510Multi(rng, d) {
  const n = numWithLast(rng, d, pick(rng, [0, 0, 2, 4, 5, 5, 6, 8]));
  const opts = ['2', '5', '10'];
  const ans = opts.filter((m) => n % Number(m) === 0);
  return multiQ({
    prompt: `${n} 是下面哪些數的倍數？（全部選出來）`, options: opts, answer: ans, tags: ['mult-2-5-10'],
    explanation: `${n} 的個位是 ${n % 10}，所以是 ${joinCN(ans)} 的倍數。${n % 10 === 0 ? '個位是 0 的數同時是 2、5、10 的倍數。' : ''}`,
  });
}

function genMult2510List(rng, d) {
  return retry(() => {
    const m = pick(rng, [2, 5, 10]);
    const nums = [...new Set(Array.from({ length: 6 }, () => numWithLast(rng, d, randInt(rng, 0, 9))))];
    const ans = nums.filter((x) => x % m === 0);
    if (nums.length !== 6 || ans.length < 2 || ans.length > 4) return null;
    return multiQ({
      prompt: `下面哪些數是 ${m} 的倍數？（全部選出來）`, options: nums, answer: ans, tags: ['mult-2-5-10'],
      explanation: `${lastRule[m]}：${joinCN(ans)}。`,
    });
  });
}

function genMultDigit(rng, d) {
  const prefix = randInt(rng, 10, d === 1 ? 99 : 999);
  const kind = pick(rng, ['both', 'five', 'two', 'fiveNotTwo']);
  const digits = range(0, 9).map(String);
  if (kind === 'both') {
    return choiceQ(rng, {
      prompt: `${prefix}□ 要同時是 2 和 5 的倍數，□ 裡要填哪一個數字？`, answer: '0', distractors: ['5', '2', '8'], sortNum: true, tags: ['mult-2-5-10'],
      explanation: '同時是 2 和 5 的倍數，個位只能是 0（也就是 10 的倍數）。',
    });
  }
  if (kind === 'fiveNotTwo') {
    return choiceQ(rng, {
      prompt: `${prefix}□ 是 5 的倍數，但不是 2 的倍數，□ 裡要填哪一個數字？`, answer: '5', distractors: ['0', '2', '1'], sortNum: true, tags: ['mult-2-5-10'],
      explanation: '5 的倍數個位是 0 或 5；個位是 0 也會是 2 的倍數，所以只能填 5。',
    });
  }
  const m = kind === 'five' ? 5 : 2;
  const ans = digits.filter((x) => Number(x) % m === 0);
  return multiQ({
    prompt: `${prefix}□ 是 ${m} 的倍數，□ 裡可以填哪些數字？（全部選出來）`, options: digits, answer: ans, tags: ['mult-2-5-10'],
    explanation: `${lastRule[m]}，所以 □ 可以填 ${joinCN(ans)}。`,
  });
}

// 延伸：3、9、4 的倍數（非必考，只在難度 3 出）
function genMult39(rng) {
  const m = pick(rng, [3, 9, 4]);
  return retry(() => {
    const n = randInt(rng, 1000, 99999);
    const ok = n % m === 0;
    if (!ok && rng() < 0.4) return null; // 大約一半是對的
    const ds = String(n).split('').map(Number);
    const why = m === 4 ? `末兩位 ${String(n).slice(-2)} ${Number(String(n).slice(-2)) % 4 === 0 ? '是' : '不是'} 4 的倍數`
      : `各位數字和 ${ds.join('+')} = ${sum(ds)}，${sum(ds) % m === 0 ? '是' : '不是'} ${m} 的倍數`;
    return tfQ({ prompt: `${n} 是 ${m} 的倍數。（延伸題）`, answer: ok, tags: ['mult-3-9-4'], explanation: `${why}，所以${ok ? '是' : '不是'}。` });
  });
}

// ====================== 單元 3　多邊形 ======================

const NAME_N = (n) => (n === 3 ? '三角形' : `${cn(n)}邊形`);
const NAME_REG = (n) => (n === 3 ? '正三角形' : `正${cn(n)}邊形`);

function regularPoly(n, r = 1, rot = -90) {
  return range(0, n - 1).map((i) => [r * Math.cos(D.deg(rot + (360 * i) / n)), r * Math.sin(D.deg(rot + (360 * i) / n))]);
}

// 隨機的多邊形（星形排列，不會自己交叉），每個角都明顯不是 180°
function randomPoly(rng, n, convex = false) {
  return retry(() => {
    const base = 360 / n;
    const pts = range(0, n - 1).map((i) => {
      const a = base * i + (rng() - 0.5) * base * 0.5 - 90;
      const r = convex ? 0.85 + rng() * 0.15 : 0.6 + rng() * 0.4;
      return [r * Math.cos(D.deg(a)), r * Math.sin(D.deg(a))];
    });
    const ia = D.interiorAngles(pts);
    if (ia.some((a) => Math.abs(a - 180) < 16 || a < 30)) return null;
    if (convex && ia.some((a) => a > 180)) return null;
    for (let i = 0; i < n; i++) if (D.vlen(D.vsub(pts[i], pts[(i + 1) % n])) < 0.3) return null;
    return pts;
  });
}

function polyFigure(pts, o = {}) {
  const W = o.W ?? 600, H = o.H ?? 340;
  const extra = o.extraPts ?? [];
  const f = D.fitter([...pts, ...extra], W, H, o.pad ?? 40);
  const P = pts.map(f);
  let body = D.polygon(P, o.fill ?? C.shape, C.shapeStroke, o.sw ?? 4);
  for (const [i, j] of o.diagonals ?? []) body += D.dashed(...P[i], ...P[j], C.mark, 3);
  if (o.dots) for (const p of P) body += D.circle(p[0], p[1], 6, C.shapeStroke);
  if (o.mark != null) body += D.circle(P[o.mark][0], P[o.mark][1], 8, C.mark);
  return D.doc(W, H, body);
}

// 不是多邊形的圖形
function nonPolygonSvg(rng, kind, W = 600, H = 340) {
  const cx = W / 2, cy = H / 2, r = Math.min(W, H) * 0.36;
  const stroke = `stroke="${C.shapeStroke}" stroke-width="4" stroke-linejoin="round"`;
  const p = (x, y) => `${D.r2(x)} ${D.r2(y)}`;
  if (kind === 'circle') return D.doc(W, H, D.circle(cx, cy, r, C.shape, C.shapeStroke, 4));
  if (kind === 'semi') return D.doc(W, H, `<path d="M ${p(cx - r * 1.2, cy + r * 0.5)} A ${r * 1.2} ${r * 1.2} 0 0 1 ${p(cx + r * 1.2, cy + r * 0.5)} Z" fill="${C.shape}" ${stroke}/>`);
  if (kind === 'sector') {
    const a1 = D.deg(-90 - 50), a2 = D.deg(-90 + 50), R = r * 1.5, oy = cy + r * 0.75;
    return D.doc(W, H, `<path d="M ${p(cx, oy)} L ${p(cx + R * Math.cos(a1), oy + R * Math.sin(a1))} A ${R} ${R} 0 0 1 ${p(cx + R * Math.cos(a2), oy + R * Math.sin(a2))} Z" fill="${C.shape}" ${stroke}/>`);
  }
  if (kind === 'curve') {
    const A = [cx - r * 1.1, cy + r * 0.7], B = [cx + r * 1.1, cy + r * 0.7], T = [cx + r * 0.2, cy - r * 0.8];
    return D.doc(W, H, `<path d="M ${p(...A)} L ${p(...B)} L ${p(...T)} Q ${p(cx - r * 1.4, cy - r * 0.6)} ${p(...A)} Z" fill="${C.shape}" ${stroke}/>`);
  }
  // open：少一條邊，沒有圍起來
  const pts = randomPoly(rng, randInt(rng, 4, 6), true);
  const f = D.fitter(pts, W, H, 50);
  const P = pts.map(f);
  return D.doc(W, H, D.polyline(P, C.shapeStroke, 4));
}
const NONPOLY_WHY = {
  circle: '圓形是用曲線圍成的，不是多邊形。',
  semi: '半圓有一條彎彎的曲線，不是多邊形。',
  sector: '扇形有一條彎彎的曲線，不是多邊形。',
  curve: '這個圖形有一條邊是曲線，不是多邊形。',
  open: '這個圖形沒有圍起來，不是多邊形。',
};

// ---------- 3-1 多邊形 ----------
function genCountParts(rng, d) {
  const n = d === 1 ? randInt(rng, 3, 8) : d === 2 ? randInt(rng, 5, 10) : randInt(rng, 7, 12);
  const pts = randomPoly(rng, n);
  const what = pick(rng, [['頂點', '個'], ['邊', '條'], ['角', '個']]);
  return inputQ({
    prompt: `這個多邊形有幾${what[1]}${what[0]}？`, answer: n, svg: polyFigure(pts, { dots: d === 1 || n >= 9 }), tags: ['polygon'],
    explanation: `沿著圖形繞一圈數，有 ${n} ${what[1]}${what[0]}；多邊形的邊數、角數、頂點數都一樣多。`,
  });
}

function genNamePolygon(rng, d) {
  const n = randInt(rng, 4, d === 1 ? 8 : 10);
  const pts = randomPoly(rng, n);
  return choiceQ(rng, {
    prompt: '這個圖形是幾邊形？', answer: NAME_N(n), distractors: [NAME_N(n - 1), NAME_N(n + 1), NAME_REG(n)], svg: polyFigure(pts, { dots: d === 1 }), tags: ['polygon'],
    explanation: `它有 ${n} 條邊，是${NAME_N(n)}；邊和角沒有都一樣，不能叫${NAME_REG(n)}。`,
  });
}

function genIsPolygon(rng) {
  const isPoly = rng() < 0.45;
  if (isPoly) {
    const n = randInt(rng, 3, 9);
    return tfQ({
      prompt: '這個圖形是多邊形。', answer: true, svg: polyFigure(randomPoly(rng, n)), tags: ['polygon'],
      explanation: `它是用 ${n} 條直直的邊圍成的封閉圖形，是${NAME_N(n)}。`,
    });
  }
  const kind = pick(rng, ['circle', 'semi', 'sector', 'curve', 'open']);
  return tfQ({ prompt: '這個圖形是多邊形。', answer: false, svg: nonPolygonSvg(rng, kind), tags: ['polygon'], explanation: NONPOLY_WHY[kind] });
}

function genPickPolygons(rng) {
  return retry(() => {
    const kinds = sample(rng, ['circle', 'semi', 'sector', 'curve', 'open'], randInt(rng, 1, 3));
    const nPoly = 5 - kinds.length;
    const items = [
      ...kinds.map((k) => ({ svg: nonPolygonSvg(rng, k, 300, 220), ok: false })),
      ...range(1, nPoly).map(() => ({ svg: polyFigure(randomPoly(rng, randInt(rng, 3, 8)), { W: 300, H: 220, pad: 26, sw: 3 }), ok: true })),
    ];
    return svgMultiQ(rng, {
      prompt: '下面哪些是多邊形？（全部選出來）', items, tags: ['polygon'],
      explanation: '用直直的邊圍成、而且有圍起來的才是多邊形；有曲線或沒圍起來的都不是。',
    });
  });
}

const POLY_TF = [
  ['多邊形至少要有 3 條邊。', true, '3 條邊圍成三角形，是最少邊的多邊形。', 'polygon'],
  ['圓形是多邊形。', false, '圓形是曲線圍成的，不是多邊形。', 'polygon'],
  ['扇形有 2 條直直的邊，所以是多邊形。', false, '扇形還有一條曲線，有曲線的圖形不是多邊形。', 'polygon'],
  ['多邊形的邊數、角數和頂點數都一樣多。', true, '每個頂點有一個角，頂點和頂點之間是一條邊。', 'polygon'],
];

function genPolyFacts(rng) {
  if (rng() < 0.5) return tfFromList(rng, POLY_TF);
  const n = randInt(rng, 5, 12);
  const what = pick(rng, [['頂點', '個'], ['角', '個'], ['邊', '條']]);
  return inputQ({
    prompt: `一個${NAME_N(n)}有幾${what[1]}${what[0]}？`, answer: n, tags: ['polygon'],
    explanation: `${NAME_N(n)}有 ${n} 條邊、${n} 個角、${n} 個頂點。`,
  });
}

// ---------- 3-2 正多邊形 ----------
// 用「每條邊的方向（度，y 向上）」和邊長畫出多邊形
function polyFromEdges(dirs, lens) {
  const pts = [[0, 0]];
  for (let i = 0; i < dirs.length - 1; i++) {
    const u = D.dirOf(dirs[i]);
    const [x, y] = pts[i];
    pts.push([x + u[0] * lens[i], y + u[1] * lens[i]]);
  }
  return pts;
}

function anglesFromDirs(dirs) {
  const n = dirs.length;
  return dirs.map((d0, i) => {
    const prev = dirs[(i + n - 1) % n];
    let turn = d0 - prev;
    while (turn < 0) turn += 360;
    return 180 - turn;
  });
}

// 標出邊長和角度的多邊形（模型 y 向上）
function labeledPolygon(pts, sideLabels, angleLabels, o = {}) {
  const W = o.W ?? 600, H = o.H ?? 380;
  const f = D.fitter(pts, W, H, 62, true);
  const P = pts.map(f);
  const n = P.length;
  const cen = [sum(P.map((p) => p[0])) / n, sum(P.map((p) => p[1])) / n];
  let body = D.polygon(P, C.shape, C.shapeStroke, 4);
  for (let i = 0; i < n; i++) {
    const A = P[i], B = P[(i + 1) % n];
    if (sideLabels && sideLabels[i] != null) {
      const pos = D.sideLabelPos(A, B, cen, sideLabels[i], 16);
      body += D.labelBox(pos[0], pos[1], sideLabels[i], { size: 16, fill: C.a, bold: true });
    }
  }
  for (let i = 0; i < n; i++) {
    if (!angleLabels || angleLabels[i] == null) continue;
    const V = P[i], Pp = P[(i + n - 1) % n], Q = P[(i + 1) % n];
    const ang = D.angleAt(V, Pp, Q);
    body += D.angleArc(V, Pp, Q, 18, C.mark, 2);
    const pos = D.bisectorPoint(V, Pp, Q, D.labelDist(ang, 22) + 4);
    body += D.text(pos[0], pos[1], angleLabels[i], { size: 15, fill: C.mark, bold: true });
  }
  return D.doc(W, H, body);
}

function genNameRegular(rng, d) {
  const kind = wpick(rng, [[5, 'regular'], [2, 'equilateral'], [1.5, 'equiangular'], [1.5, 'irregular']]);
  const s = randInt(rng, 2, 9);
  let n, pts, sides, angles;
  if (kind === 'regular') {
    n = pick(rng, [3, 4, 5, 6, 8]);
    const dirs = range(0, n - 1).map((i) => (360 * i) / n);
    pts = polyFromEdges(dirs, dirs.map(() => 1));
    sides = dirs.map(() => `${s}公分`);
    angles = dirs.map(() => `${((n - 2) * 180) / n}°`);
  } else if (kind === 'equilateral') {
    n = pick(rng, [4, 6, 6, 8]);
    const half = n / 2;
    const dirs = retry(() => {
      const cuts = [0, ...sample(rng, range(1, 17), half - 1).sort((a, b) => a - b).map((x) => x * 10)];
      const gaps = cuts.slice(1).map((c, i) => c - cuts[i]).concat(180 - cuts[half - 1]);
      if (gaps.some((g) => g < 30) || gaps.every((g) => g === gaps[0])) return null;
      return [...cuts, ...cuts.map((c) => c + 180)];
    });
    pts = polyFromEdges(dirs, dirs.map(() => 1));
    sides = dirs.map(() => `${s}公分`);
    angles = anglesFromDirs(dirs).map((a) => `${a}°`);
  } else if (kind === 'equiangular') {
    n = pick(rng, [4, 6, 8]);
    const t = s + randInt(rng, 1, 4);
    const dirs = range(0, n - 1).map((i) => (360 * i) / n);
    const lens = dirs.map((_, i) => (i % 2 ? t : s));
    pts = polyFromEdges(dirs, lens);
    sides = lens.map((l) => `${l}公分`);
    angles = dirs.map(() => `${((n - 2) * 180) / n}°`);
  } else {
    n = pick(rng, [3, 4, 5, 6, 7]);
    pts = randomPoly(rng, n, true).map(([x, y]) => [x, -y]);
    const raw = D.interiorAngles(pts);
    const ang = raw.map((a) => Math.round(a));
    ang[n - 1] += (n - 2) * 180 - sum(ang);
    const lens = pts.map((p, i) => Math.max(2, Math.round(D.vlen(D.vsub(pts[(i + 1) % n], p)) * 6)));
    if (lens.every((l) => l === lens[0])) lens[0] += 1;
    // pts[i] 到 pts[i+1] 的邊對應 sides[i]；角度對應頂點 i
    sides = lens.map((l) => `${l}公分`);
    angles = ang.map((a) => `${a}°`);
  }
  const reg = kind === 'regular';
  const ans = reg ? NAME_REG(n) : NAME_N(n);
  const why = {
    regular: `邊都一樣長，角也都一樣大（${angles[0]}），是${NAME_REG(n)}；「正」字不能漏寫。`,
    equilateral: `邊都一樣長，但角不一樣大，所以只是${NAME_N(n)}，不是正多邊形。`,
    equiangular: `角都一樣大，但邊不一樣長，所以只是${NAME_N(n)}，不是正多邊形。`,
    irregular: `邊和角都不一樣，是${NAME_N(n)}。`,
  }[kind];
  return choiceQ(rng, {
    prompt: '量量看（看圖上的長度和角度），這個圖形應該叫作什麼？', answer: ans,
    distractors: reg ? [NAME_N(n), NAME_REG(n + 1), NAME_N(n + 1)] : [NAME_REG(n), NAME_N(n + 1), NAME_N(n - 1 < 3 ? 5 : n - 1)],
    svg: labeledPolygon(pts, sides, angles), tags: ['regular-polygon'], explanation: why,
  });
}

function shapeSmall(pts, W = 300, H = 220) {
  const f = D.fitter(pts, W, H, 26);
  return D.doc(W, H, D.polygon(pts.map(f), C.shape, C.shapeStroke, 3));
}

function genPickRegular(rng) {
  const n = randInt(rng, 3, 8);
  const reg = regularPoly(n);
  const fakes = [
    [[-1.6, -0.8], [1.6, -0.8], [1.6, 0.8], [-1.6, 0.8]], // 長方形
    [[0, -0.75], [1.3, 0], [0, 0.75], [-1.3, 0]], // 菱形
    polyFromEdges([0, 40, 110, 180, 220, 290], [1, 1, 1, 1, 1, 1]).map(([x, y]) => [x, -y]), // 邊相等、角不相等的六邊形
    polyFromEdges([0, 60, 120, 180, 240, 300], [2, 1, 2, 1, 2, 1]).map(([x, y]) => [x, -y]), // 角相等、邊不相等的六邊形
    [[0, -1.5], [0.7, 1], [-0.7, 1]], // 瘦長的等腰三角形
    randomPoly(rng, 5, true),
  ];
  return svgChoiceQ(rng, {
    prompt: '下面哪一個是正多邊形？', correct: shapeSmall(reg), wrongs: sample(rng, fakes, 3).map((p) => shapeSmall(p)), tags: ['regular-polygon'],
    explanation: (lab) => `${lab}的邊都一樣長、角也都一樣大，是${NAME_REG(n)}；其他的邊或角不完全相等。`,
  });
}

const REG_NAMES = [
  ['正方形', true], ['正三角形', true], ['長方形', false], ['菱形', false], ['等腰三角形', false], ['平行四邊形', false], ['梯形', false],
];

function genRegularNames(rng) {
  return retry(() => {
    const picked = sample(rng, REG_NAMES, 5);
    const ans = picked.filter(([, ok]) => ok).map(([nm]) => nm);
    if (!ans.length) return null;
    return multiQ({
      prompt: '下面哪些是正多邊形？（全部選出來）', options: picked.map(([nm]) => nm), answer: ans, tags: ['regular-polygon'],
      explanation: `邊都一樣長「而且」角都一樣大才是正多邊形：${joinCN(ans)}。菱形角不一定一樣大，長方形邊不一樣長。`,
    });
  });
}

const REG_TF = [
  ['菱形的四條邊一樣長，所以菱形是正四邊形。', false, '菱形的角不一定一樣大，不是正四邊形。', 'regular-polygon'],
  ['正方形就是正四邊形。', true, '正方形四條邊一樣長、四個角都是直角。', 'regular-polygon'],
  ['長方形的四個角一樣大，所以長方形是正四邊形。', false, '長方形的邊不一樣長，不是正多邊形。', 'regular-polygon'],
  ['邊都一樣長的多邊形，一定是正多邊形。', false, '還要角都一樣大，才是正多邊形。', 'regular-polygon'],
  ['正多邊形的每一個角都一樣大。', true, '正多邊形的邊都一樣長，角也都一樣大。', 'regular-polygon'],
  ['正三角形就是三條邊一樣長、三個角都是 60° 的三角形。', true, '正三角形的邊和角都相等，每個角 60°。', 'regular-polygon'],
];

function genRegularFacts(rng, d) {
  if (rng() < 0.55) return tfFromList(rng, REG_TF);
  const n = randInt(rng, 3, 10), s = randInt(rng, 2, 15);
  if (d >= 2 && rng() < 0.5) {
    return inputQ({
      prompt: `一個${NAME_REG(n)}的周長是 ${n * s} 公分，每條邊長幾公分？`, answer: s, tags: ['regular-polygon'],
      explanation: `${NAME_REG(n)}有 ${n} 條一樣長的邊，${n * s} ÷ ${n} = ${s}。`,
    });
  }
  return inputQ({
    prompt: `一個${NAME_REG(n)}，每條邊長 ${s} 公分，周長是幾公分？`, answer: n * s, tags: ['regular-polygon'],
    explanation: `${NAME_REG(n)}有 ${n} 條一樣長的邊，${s} × ${n} = ${n * s}。`,
  });
}

// ---------- 3-3 三角形邊長的性質 ----------
const STICK_COLORS = ['#E4572E', '#2F7FC1', '#3AA669'];

function triSides(rng, d, want, decimal) {
  // 回傳十分之一為單位的三邊（未排序）
  const [lo, hi] = decimal ? [20, 150] : [20, 300];
  const unit = decimal ? 1 : 10;
  return retry(() => {
    const a = randInt(rng, lo / unit, hi / unit) * unit, b = randInt(rng, lo / unit, hi / unit) * unit;
    let c;
    if (want === 'equal') c = a + b;
    else if (want === 'less') c = a + b + randInt(rng, 1, 6) * unit;
    else c = randInt(rng, Math.max(Math.abs(a - b) + unit, lo / unit * unit) / unit, (a + b - unit) / unit) * unit;
    if (c > hi || c < lo) return null;
    const s = [a, b, c].sort((x, y) => x - y);
    if (want === 'can' && !(s[0] + s[1] > s[2])) return null;
    if (want !== 'can' && s[2] !== c) return null;
    if (decimal && [a, b, c].every((x) => x % 10 === 0)) return null;
    return shuffle(rng, [a, b, c]);
  });
}

function triVerdict(sides) {
  const s = sides.slice().sort((x, y) => x - y);
  const t = s[0] + s[1];
  const rel = t > s[2] ? '>' : t === s[2] ? '=' : '<';
  return { s, t, rel, ok: rel === '>' };
}

function genTriTF(rng, d) {
  const decimal = d >= 2 && rng() < 0.5;
  const want = wpick(rng, [[45, 'can'], [25, 'equal'], [30, 'less']]);
  const sides = triSides(rng, d, want, decimal);
  const v = triVerdict(sides);
  const L = sides.map(f10);
  return tfQ({
    prompt: `三根小棒子長 ${L.join(' 公分、')} 公分，可以排成一個三角形。`, answer: v.ok,
    svg: D.sticks(sides.map((x, i) => ({ len: x, label: `${f10(x)} 公分`, color: STICK_COLORS[i] }))), tags: ['triangle-sides'],
    explanation: `較短的兩根：${f10(v.s[0])} + ${f10(v.s[1])} = ${f10(v.t)}，${v.rel === '>' ? '比' : v.rel === '=' ? '等於' : '比'} ${f10(v.s[2])}${v.rel === '>' ? ' 大' : v.rel === '=' ? '' : ' 小'}，所以${v.ok ? '可以' : '不能'}排成三角形。${v.rel === '=' ? '（剛好相等會攤平成一直線）' : ''}`,
  });
}

const TRI_KINDS = ['正三角形', '等腰三角形', '任意三角形', '不能排成三角形'];

function genTriClassify(rng) {
  const kind = wpick(rng, [[1, 'eq'], [2, 'iso'], [2, 'sca'], [1, 'isoBad'], [2, 'bad']]);
  const sides = retry(() => {
    const a = randInt(rng, 2, 15), b = randInt(rng, 2, 15), c = randInt(rng, 2, 20);
    const s = { eq: [a, a, a], iso: [a, a, b], sca: [a, b, c], isoBad: [a, a, c], bad: [a, b, c] }[kind];
    const v = triVerdict(s);
    const distinct = new Set(s).size;
    if (kind === 'eq') return s;
    if (kind === 'iso' && (distinct !== 2 || !v.ok)) return null;
    if (kind === 'sca' && (distinct !== 3 || !v.ok)) return null;
    if (kind === 'isoBad' && (distinct !== 2 || v.ok)) return null;
    if (kind === 'bad' && (distinct !== 3 || v.ok)) return null;
    return shuffle(rng, s);
  });
  const v = triVerdict(sides);
  const distinct = new Set(sides).size;
  const ans = !v.ok ? TRI_KINDS[3] : distinct === 1 ? TRI_KINDS[0] : distinct === 2 ? TRI_KINDS[1] : TRI_KINDS[2];
  const first = `${v.s[0]} + ${v.s[1]} = ${v.t}，${v.ok ? `比 ${v.s[2]} 大，可以排` : `沒有比 ${v.s[2]} 大，不能排`}`;
  return choiceQ(rng, {
    prompt: `用 ${sides.join(' 公分、')} 公分的三根火柴棒，可以排成哪一種三角形？`, answer: ans, fixed: TRI_KINDS,
    svg: D.sticks(sides.map((x, i) => ({ len: x, label: `${x} 公分`, color: STICK_COLORS[i] }))), tags: ['triangle-sides'],
    explanation: `先判斷能不能排：${first}。${v.ok ? (distinct === 1 ? '三邊一樣長，是正三角形。' : distinct === 2 ? '有兩邊一樣長，是等腰三角形。' : '三邊都不一樣長，是任意三角形。') : ''}`,
  });
}

function genTriWhichSet(rng, d) {
  return retry(() => {
    const decimal = d === 3 && rng() < 0.4;
    const good = triSides(rng, d, 'can', decimal);
    const bads = [triSides(rng, d, 'equal', decimal), triSides(rng, d, 'less', decimal), triSides(rng, d, pick(rng, ['equal', 'less']), decimal)];
    const lab = (s) => `${s.map(f10).join('、')} 公分`;
    const labels = [good, ...bads].map(lab);
    if (new Set(labels).size !== 4) return null;
    const v = triVerdict(good);
    return choiceQ(rng, {
      prompt: '下面哪一組小棒子可以排成三角形？', answer: lab(good), distractors: bads.map(lab), tags: ['triangle-sides'],
      explanation: `${lab(good)}：較短兩根 ${f10(v.s[0])} + ${f10(v.s[1])} = ${f10(v.t)}，比 ${f10(v.s[2])} 大；其他組的較短兩根加起來都沒有比最長的大。`,
    });
  });
}

function genThirdSide(rng) {
  const a = randInt(rng, 3, 15), b = randInt(rng, 3, 15);
  const lo = Math.abs(a - b) + 1, hi = a + b - 1;
  const r = rng();
  if (r < 0.4) {
    return inputQ({
      prompt: `三角形的兩條邊是 ${a} 公分和 ${b} 公分，第三邊是整數公分，最長可以是幾公分？`, answer: hi, tags: ['triangle-sides'],
      explanation: `第三邊要比 ${a} + ${b} = ${a + b} 短，整數最長是 ${hi} 公分。`,
    });
  }
  if (r < 0.7) {
    return inputQ({
      prompt: `三角形的兩條邊是 ${a} 公分和 ${b} 公分，第三邊是整數公分，最短可以是幾公分？`, answer: lo, tags: ['triangle-sides'],
      explanation: `第三邊加上較短的 ${Math.min(a, b)} 要比 ${Math.max(a, b)} 長，所以要比 ${Math.max(a, b)} − ${Math.min(a, b)} = ${lo - 1} 長，最短 ${lo} 公分。`,
    });
  }
  const opts = [...new Set([lo - 1, lo, randInt(rng, lo, hi), hi, hi + 1, hi + 2].filter((x) => x >= 1))].sort((x, y) => x - y);
  const ans = opts.filter((x) => x >= lo && x <= hi);
  return multiQ({
    prompt: `三角形的兩條邊是 ${a} 公分和 ${b} 公分，第三邊可能是幾公分？（全部選出來）`, options: opts, answer: ans, tags: ['triangle-sides'],
    explanation: `第三邊要比 ${a + b} 短、比 ${Math.abs(a - b)} 長，所以 ${joinCN(ans)} 都可以。`,
  });
}

// ---------- 3-4 多邊形內角和 ----------
const angleSum = (n) => (n - 2) * 180;

function genAngleSum(rng, d) {
  const n = d === 1 ? randInt(rng, 3, 8) : randInt(rng, 5, 12);
  const showPic = d >= 2 && rng() < 0.5;
  const S = angleSum(n);
  const prompt = showPic ? '這個多邊形的內角和是幾度？' : `${NAME_N(n)}的內角和是幾度？`;
  const svg = showPic ? polyFigure(randomPoly(rng, n, true), { dots: n >= 9 }) : null;
  const explanation = n === 3 ? '三角形的三個角合起來是一個平角，內角和是 180°。'
    : `${showPic ? `數一數有 ${n} 條邊，` : ''}${NAME_N(n)}可以切成 ${n} − 2 = ${n - 2} 個三角形，180 × ${n - 2} = ${S}°。`;
  if (rng() < 0.5) {
    return choiceQ(rng, {
      prompt, svg, answer: S, distractors: [n * 180, (n - 1) * 180, (n - 2) * 90, S + 180], sortNum: true, tags: ['angle-sum'],
      explanation,
    });
  }
  return inputQ({ prompt, svg, answer: S, keypad: 'degree', tags: ['angle-sum'], explanation });
}

function genDiagonalTriangles(rng, d) {
  const n = randInt(rng, 4, d === 1 ? 8 : 12);
  const pts = randomPoly(rng, n, true);
  if (rng() < 0.6) {
    const show = d === 1;
    return inputQ({
      prompt: show ? '從紅點那個頂點畫出所有的對角線（虛線），把多邊形切成了幾個三角形？'
        : '從紅點那個頂點畫出所有的對角線，可以把這個多邊形切成幾個三角形？',
      answer: n - 2,
      svg: polyFigure(pts, { diagonals: show ? range(2, n - 2).map((j) => [0, j]) : [], mark: 0, dots: n >= 9 }), tags: ['angle-sum'],
      explanation: `這是${NAME_N(n)}（${n} 條邊），從一個頂點畫對角線，可以切成 ${n} − 2 = ${n - 2} 個三角形。`,
    });
  }
  return inputQ({
    prompt: `從${NAME_N(n)}的一個頂點，可以畫出幾條對角線？`, answer: n - 3, svg: polyFigure(pts, { mark: 0 }), tags: ['angle-sum'],
    explanation: `不能連到自己和旁邊的 2 個頂點，${n} − 3 = ${n - 3} 條。`,
  });
}

function genRegularAngle(rng) {
  const n = pick(rng, [3, 4, 5, 6, 8, 9, 10, 12]);
  const S = angleSum(n);
  return inputQ({
    prompt: `${NAME_REG(n)}的每一個角是幾度？`, answer: S / n, keypad: 'degree', tags: ['angle-sum', 'regular-polygon'],
    explanation: `內角和 180 × ${n - 2} = ${S}°，${n} 個角一樣大，${S} ÷ ${n} = ${S / n}°。`,
  });
}

function genSidesFromSum(rng) {
  const n = randInt(rng, 5, 12);
  return inputQ({
    prompt: `一個多邊形的內角和是 ${angleSum(n)} 度，它是幾邊形？（填數字）`, answer: n, tags: ['angle-sum'],
    explanation: `${angleSum(n)} ÷ 180 = ${n - 2} 個三角形，邊數是 ${n - 2} + 2 = ${n}。`,
  });
}

// ---------- 3-5 求未知角 ----------
// 模型座標 y 向上；angles: [{ V, P, Q, label, q(是問號), right(直角記號) }]
function angleFigure(o) {
  const W = 600, H = 360;
  const f = D.fitter(o.points, W, H, 56, true);
  let body = '';
  for (const poly of o.fills ?? []) body += D.polygon(poly.map(f), C.shape, 'none');
  for (const [P, Q, style] of o.segs) {
    body += style === 'dash' ? D.dashed(...f(P), ...f(Q), C.sub, 2.5) : D.line(...f(P), ...f(Q), C.shapeStroke, 3.5, 'stroke-linecap="round"');
  }
  for (const t of o.ticks ?? []) body += D.ticks(f(t[0]), f(t[1]), t[2] ?? 1);
  for (const a of o.angles) {
    const V = f(a.V), P = f(a.P), Q = f(a.Q);
    const col = a.q ? C.mark : C.a;
    if (a.right) body += D.rightMark(V, P, Q, 18, col);
    else body += D.angleArc(V, P, Q, a.r ?? 24, col, 2.5);
    if (a.label) {
      const ang = D.angleAt(V, P, Q);
      const pos = D.bisectorPoint(V, P, Q, D.labelDist(ang, 26));
      body += D.text(pos[0], pos[1], a.label, { size: 20, bold: true, fill: a.q ? C.mark : C.ink });
    }
  }
  return D.doc(W, H, body);
}

function triangleFrom(alpha, beta) {
  // A 在左下、B 在右下，∠A = alpha，∠B = beta
  const A = [0, 0], B = [1, 0];
  const ac = Math.sin(D.deg(beta)) / Math.sin(D.deg(alpha + beta));
  const Cc = [ac * Math.cos(D.deg(alpha)), ac * Math.sin(D.deg(alpha))];
  return [A, B, Cc];
}

function genTriangleAngle(rng) {
  return retry(() => {
    const a = randInt(rng, 20, 110), b = randInt(rng, 20, 110);
    if (a + b > 160) return null;
    const c = 180 - a - b;
    const [A, B, Cc] = triangleFrom(a, b);
    const unknown = randInt(rng, 0, 2);
    const vals = [a, b, c];
    const corners = [[A, B, Cc], [B, Cc, A], [Cc, A, B]];
    const angles = corners.map(([V, P, Q], i) => ({ V, P, Q, label: i === unknown ? '?' : `${vals[i]}°`, q: i === unknown }));
    const known = vals.filter((_, i) => i !== unknown);
    return inputQ({
      prompt: '三角形中，「?」的角是幾度？', answer: vals[unknown], keypad: 'degree',
      svg: angleFigure({ points: [A, B, Cc], fills: [[A, B, Cc]], segs: [[A, B], [B, Cc], [Cc, A]], angles }), tags: ['find-angle'],
      explanation: `三角形內角和 180°：180 − ${known[0]} − ${known[1]} = ${vals[unknown]}°。`,
    });
  });
}

function genIsosceles(rng, d) {
  const mode = d === 1 ? 'apex' : pick(rng, ['apex', 'base', 'other']);
  const apex = mode === 'apex' ? 2 * randInt(rng, 10, 70) : 180 - 2 * randInt(rng, 20, 80);
  const base = (180 - apex) / 2;
  const A = [-1, 0], B = [1, 0], T = [0, Math.tan(D.deg(base))];
  const angles = [];
  let ans, expl;
  if (mode === 'apex') {
    angles.push({ V: T, P: A, Q: B, label: `${apex}°` }, { V: A, P: B, Q: T, label: '?', q: true });
    ans = base; expl = `等腰三角形兩個底角一樣大：(180 − ${apex}) ÷ 2 = ${base}°。`;
  } else if (mode === 'base') {
    angles.push({ V: B, P: T, Q: A, label: `${base}°` }, { V: T, P: A, Q: B, label: '?', q: true });
    ans = apex; expl = `兩個底角都是 ${base}°，頂角 = 180 − ${base} − ${base} = ${apex}°。`;
  } else {
    angles.push({ V: B, P: T, Q: A, label: `${base}°` }, { V: A, P: B, Q: T, label: '?', q: true });
    ans = base; expl = `等腰三角形的兩個底角一樣大，所以也是 ${base}°。`;
  }
  return inputQ({
    prompt: '這是一個等腰三角形（記號一樣的邊等長），「?」的角是幾度？', answer: ans, keypad: 'degree',
    svg: angleFigure({ points: [A, B, T], fills: [[A, B, T]], segs: [[A, B], [B, T], [T, A]], ticks: [[A, T], [B, T]], angles }), tags: ['find-angle', 'isosceles'],
    explanation: expl,
  });
}

function genStraightAngle(rng) {
  const phi = randInt(rng, 25, 155);
  const L = [-1.2, 0], R = [1.2, 0], O = [0, 0], Rr = [Math.cos(D.deg(phi)), Math.sin(D.deg(phi))];
  const askLeft = rng() < 0.5;
  const known = askLeft ? phi : 180 - phi;
  const angles = [
    { V: O, P: R, Q: Rr, label: askLeft ? `${phi}°` : '?', q: !askLeft },
    { V: O, P: Rr, Q: L, label: askLeft ? '?' : `${180 - phi}°`, q: askLeft },
  ];
  return inputQ({
    prompt: '一條直線上的兩個角，「?」的角是幾度？', answer: 180 - known, keypad: 'degree',
    svg: angleFigure({ points: [L, R, Rr, [0, -0.2]], segs: [[L, R], [O, Rr]], angles }), tags: ['find-angle'],
    explanation: `直線上的角是平角 180°：180 − ${known} = ${180 - known}°。`,
  });
}

function genExterior(rng, d) {
  return retry(() => {
    const two = d === 3 || rng() < 0.5;
    const e1 = randInt(rng, 95, 170);
    const a = 180 - e1;
    let b, e2;
    if (two) { e2 = randInt(rng, 95, 170); b = 180 - e2; } else b = randInt(rng, 25, 85);
    const c = 180 - a - b;
    if (c < 20) return null;
    const [A, B, Cc] = triangleFrom(a, b);
    const Dp = [-0.45, 0], Ep = [1.45, 0];
    const angles = [{ V: A, P: Dp, Q: Cc, label: `${e1}°` }];
    if (two) angles.push({ V: B, P: Cc, Q: Ep, label: `${e2}°` });
    else angles.push({ V: B, P: Cc, Q: A, label: `${b}°` });
    angles.push({ V: Cc, P: A, Q: B, label: '?', q: true });
    return inputQ({
      prompt: '底邊延長後的外面有角度標示，「?」的角是幾度？', answer: c, keypad: 'degree',
      svg: angleFigure({ points: [Dp, Ep, Cc, A, B], fills: [[A, B, Cc]], segs: [[Dp, Ep], [B, Cc], [Cc, A]], angles }), tags: ['find-angle'],
      explanation: two ? `先換成三角形裡面的角：180 − ${e1} = ${a}°，180 − ${e2} = ${b}°；再算 180 − ${a} − ${b} = ${c}°。`
        : `先換成裡面的角：180 − ${e1} = ${a}°；再算 180 − ${a} − ${b} = ${c}°。`,
    });
  });
}

// 依四個內角畫四邊形（逆時針，y 向上）
function quadFrom(angles, rng) {
  return retry(() => {
    const dirs = [0];
    for (let i = 1; i < 4; i++) dirs.push(dirs[i - 1] + 180 - angles[i]);
    const u = dirs.map(D.dirOf);
    const t = 0.55 + rng() * 1.0;
    const rhs = [-(u[0][0] + t * u[1][0]), -(u[0][1] + t * u[1][1])];
    const det = D.cross(u[2], u[3]);
    if (Math.abs(det) < 1e-6) return null;
    const l2 = D.cross(rhs, u[3]) / det, l3 = D.cross(u[2], rhs) / det;
    const lens = [1, t, l2, l3];
    if (lens.some((l) => l < 0.45 || l > 2.2)) return null;
    return polyFromEdges(dirs, lens);
  }, 200);
}

function genQuadAngle(rng) {
  return retry(() => {
    const vals = [randInt(rng, 40, 150), randInt(rng, 40, 150), randInt(rng, 40, 150)];
    if (rng() < 0.4) vals[randInt(rng, 0, 2)] = 90;
    const x = 360 - sum(vals);
    if (x < 40 || x > 160) return null;
    const unknown = randInt(rng, 0, 3);
    const all = vals.slice();
    all.splice(unknown, 0, x);
    let pts;
    try { pts = quadFrom(all, rng); } catch { return null; }
    const angles = pts.map((V, i) => {
      const P = pts[(i + 3) % 4], Q = pts[(i + 1) % 4];
      if (i === unknown) return { V, P, Q, label: '?', q: true };
      if (all[i] === 90) return { V, P, Q, right: true };
      return { V, P, Q, label: `${all[i]}°` };
    });
    const known = all.filter((_, i) => i !== unknown);
    const hasRight = known.includes(90);
    return inputQ({
      prompt: '四邊形中，「?」的角是幾度？', answer: x, keypad: 'degree',
      svg: angleFigure({ points: pts, fills: [pts], segs: pts.map((p, i) => [p, pts[(i + 1) % 4]]), angles }), tags: ['find-angle'],
      explanation: `四邊形內角和 360°${hasRight ? '（直角記號是 90°）' : ''}：${known.join(' + ')} = ${sum(known)}，360 − ${sum(known)} = ${x}°。`,
    });
  });
}

// 多步驟：直角被一條線分開（U3-O）
function genCompositeRight(rng) {
  return retry(() => {
    const alpha = randInt(rng, 25, 65), theta = randInt(rng, 20, 70);
    const beta = 90 - alpha;
    const Cc = [0, 0], A = [1, 0], B = [0, Math.tan(D.deg(alpha))];
    // D 在斜邊上，∠ACD = theta
    const u = D.dirOf(theta);
    const AB = D.vsub(B, A);
    const det = D.cross(u, AB);
    const s = D.cross(A, AB) / det;
    const Dp = D.vmul(u, s);
    const adc = 180 - alpha - theta, bdc = alpha + theta, bcd = 90 - theta;
    if (adc < 25 || bdc < 25 || bcd < 18) return null;
    const giveBeta = rng() < 0.5, askBDC = rng() < 0.5;
    const angles = [
      { V: Cc, P: A, Q: B, right: true },
      { V: Cc, P: A, Q: Dp, label: `${theta}°`, r: 40 },
      giveBeta ? { V: B, P: Cc, Q: A, label: `${beta}°` } : { V: A, P: B, Q: Cc, label: `${alpha}°` },
      askBDC ? { V: Dp, P: B, Q: Cc, label: '?', q: true } : { V: Dp, P: Cc, Q: A, label: '?', q: true },
    ];
    let ans, expl;
    if (!giveBeta) {
      ans = askBDC ? bdc : adc;
      expl = askBDC ? `下面的三角形：180 − ${alpha} − ${theta} = ${adc}°；再用平角：180 − ${adc} = ${bdc}°。`
        : `下面的三角形：180 − ${alpha} − ${theta} = ${adc}°。`;
    } else {
      ans = askBDC ? bdc : adc;
      expl = askBDC ? `直角的另一份是 90 − ${theta} = ${bcd}°；上面的三角形：180 − ${beta} − ${bcd} = ${bdc}°。`
        : `90 − ${theta} = ${bcd}°；上面的三角形 180 − ${beta} − ${bcd} = ${bdc}°；平角 180 − ${bdc} = ${adc}°。`;
    }
    return inputQ({
      prompt: '直角記號是 90°。「?」的角是幾度？（可以分幾步算）', answer: ans, keypad: 'degree',
      svg: angleFigure({ points: [A, B, Cc], fills: [[A, B, Cc]], segs: [[Cc, A], [A, B], [B, Cc], [Cc, Dp]], angles }), tags: ['find-angle', 'multi-step'],
      explanation: expl,
    });
  });
}

// 多步驟：三角形底邊延長求外角
function genCompositeExterior(rng) {
  return retry(() => {
    const a = randInt(rng, 30, 80), c = randInt(rng, 30, 90);
    const b = 180 - a - c;
    if (b < 25) return null;
    const [A, B, Cc] = triangleFrom(a, b);
    const Ep = [1.5, 0];
    return inputQ({
      prompt: '三角形的底邊往右延長，「?」的角是幾度？', answer: 180 - b, keypad: 'degree',
      svg: angleFigure({
        points: [A, Ep, Cc], fills: [[A, B, Cc]], segs: [[A, Ep], [B, Cc], [Cc, A]],
        angles: [{ V: A, P: B, Q: Cc, label: `${a}°` }, { V: Cc, P: A, Q: B, label: `${c}°` }, { V: B, P: Ep, Q: Cc, label: '?', q: true }],
      }), tags: ['find-angle', 'multi-step'],
      explanation: `先算三角形的第三個角：180 − ${a} − ${c} = ${b}°；再用平角：180 − ${b} = ${180 - b}°。`,
    });
  });
}

function genAngleTerms(rng) {
  return choiceQ(rng, {
    prompt: '等腰三角形裡，兩個一樣大的角叫作什麼角？', answer: '底角', fixed: ['頂角', '底角', '直角', '平角'], tags: ['isosceles'],
    explanation: '兩個一樣大的角叫底角，另一個角叫頂角。',
  });
}

// ====================== 單元 4　擴分、約分和通分 ======================

const fs = (n, d) => `${n}/${d}`;
const ms = (w, n, d) => `${w}又${n}/${d}`;
const F = (n, d, w) => (w != null ? { n, d, w } : { n, d });

function properReduced(rng, dLo, dHi) {
  return retry(() => {
    const d = randInt(rng, dLo, dHi), n = randInt(rng, 1, d - 1);
    return gcd(n, d) === 1 ? [n, d] : null;
  });
}

// ---------- 4-1 擴分 ----------
function genAreaModel(rng) {
  const [a, b] = properReduced(rng, 2, 6);
  const k = randInt(rng, 2, 4);
  return inputQ({
    prompt: `長方形平分成 ${b} 份，塗色 ${a} 份是 ${fs(a, b)}。再把每一份平分成 ${k} 小份，用小格子來看，塗色部分是幾分之幾？`,
    answer: fs(a * k, b * k), keypad: 'fraction', svg: D.areaModel({ b, a, k }), tags: ['expand-fraction'],
    explanation: `全部有 ${b} × ${k} = ${b * k} 小格，塗色 ${a} × ${k} = ${a * k} 小格，所以 ${fs(a, b)} = ${fs(a * k, b * k)}。`,
  });
}

function genExpandBlank(rng, d) {
  const [a, b] = properReduced(rng, 2, d === 1 ? 9 : 15);
  if (d === 1 || rng() < 0.5) {
    const k = randInt(rng, 2, d === 1 ? 5 : 10);
    const inNum = rng() < 0.6;
    const tokens = [F(a, b), '=', inNum ? F('□', b * k) : F(a * k, '□')];
    return inputQ({
      prompt: inNum ? `擴分：${fs(a, b)} = □/${b * k}，□ 裡是多少？` : `擴分：${fs(a, b)} = ${a * k}/□，□ 裡是多少？`,
      answer: inNum ? a * k : b * k, svg: D.fracRow(tokens), tags: ['expand-fraction'],
      explanation: inNum ? `分母 ${b} × ${k} = ${b * k}，分子也要乘 ${k}：${a} × ${k} = ${a * k}。`
        : `分子 ${a} × ${k} = ${a * k}，分母也要乘 ${k}：${b} × ${k} = ${b * k}。`,
    });
  }
  // 連等式
  const ks = sample(rng, range(2, 9), randInt(rng, 2, 3)).sort((x, y) => x - y);
  const blankAt = randInt(rng, 0, ks.length - 1);
  const inNum = rng() < 0.5;
  const tokens = [F(a, b)];
  const text = [fs(a, b)];
  ks.forEach((k, i) => {
    tokens.push('=');
    if (i === blankAt) {
      tokens.push(inNum ? F('□', b * k) : F(a * k, '□'));
      text.push(inNum ? `□/${b * k}` : `${a * k}/□`);
    } else {
      tokens.push(F(a * k, b * k));
      text.push(fs(a * k, b * k));
    }
  });
  const k = ks[blankAt];
  return inputQ({
    prompt: `${text.join(' = ')}，□ 裡是多少？`, answer: inNum ? a * k : b * k, svg: D.fracRow(tokens), tags: ['expand-fraction'],
    explanation: `${fs(a, b)} 的分子和分母同乘 ${k}，得到 ${fs(a * k, b * k)}。`,
  });
}

function genExpandMixed(rng) {
  const [a, b] = properReduced(rng, 2, 9);
  const w = randInt(rng, 1, 5), k = randInt(rng, 2, 6);
  return inputQ({
    prompt: `${ms(w, a, b)} = ${w}又□/${b * k}，□ 裡是多少？`, answer: a * k, svg: D.fracRow([F(a, b, w), '=', F('□', b * k, w)]), tags: ['expand-fraction'],
    explanation: `帶分數只擴分分數部分，整數 ${w} 不變：分母乘 ${k}，分子 ${a} × ${k} = ${a * k}。`,
  });
}

function genExpandTarget(rng) {
  const T = pick(rng, [10, 100]);
  const b = pick(rng, T === 10 ? [2, 5] : [2, 4, 5, 10, 20, 25, 50]);
  const a = retry(() => { const x = randInt(rng, 1, b - 1); return gcd(x, b) === 1 ? x : null; });
  const unit = pick(rng, ['公尺', '盒', '公升', '公斤']);
  return inputQ({
    prompt: `${fs(a, b)} ${unit} = □/${T} ${unit}，□ 裡是多少？`, answer: a * (T / b), svg: D.fracRow([F(a, b), '=', F('□', T)]), tags: ['expand-fraction'],
    explanation: `${b} × ${T / b} = ${T}，分子也乘 ${T / b}：${a} × ${T / b} = ${a * (T / b)}。`,
  });
}

function genEqualChoice(rng) {
  return retry(() => {
    const [a, b] = properReduced(rng, 3, 9);
    const k = randInt(rng, 2, 5);
    const val = (n, d) => n * b === a * d;
    const ds = [[a * k, b], [a, b * k], [a + k, b + k], [a * k, b * k + 1], [a * k + 1, b * k]].filter(([n, d]) => !val(n, d));
    if (ds.length < 3) return null;
    return choiceQ(rng, {
      prompt: `下面哪一個分數和 ${fs(a, b)} 一樣大？`, answer: fs(a * k, b * k), distractors: ds.map(([n, d]) => fs(n, d)), tags: ['expand-fraction'],
      explanation: `分子和分母同乘 ${k}：${fs(a, b)} = ${fs(a * k, b * k)}。只乘一邊或同加一個數，大小會改變。`,
    });
  });
}

function genExpandTF(rng) {
  if (rng() < 0.5) {
    return tfFromList(rng, [
      ['分子和分母同時乘以 3，分數的大小不變。', true, '擴分是分子和分母同乘一個數，大小不變。', 'expand-fraction'],
      ['分子和分母同時加上 2，分數的大小不變。', false, '例如 1/2 變成 3/4，變大了；要同乘才不變。', 'expand-fraction'],
      ['擴分以後分母變大了，所以分數也變大了。', false, '每一份變小了，但份數也變多，分數大小不變。', 'expand-fraction'],
    ]);
  }
  const [a, b] = properReduced(rng, 2, 9);
  const k = randInt(rng, 2, 6);
  const ok = rng() < 0.5;
  const shown = ok ? fs(a * k, b * k) : fs(a * k, b * (k + 1));
  return tfQ({
    prompt: `${fs(a, b)} 擴分以後可以寫成 ${shown}。`, answer: ok, tags: ['expand-fraction'],
    explanation: ok ? `分子和分母都乘 ${k}，所以正確。` : `分子乘了 ${k}，分母卻乘 ${k + 1}，乘的數不一樣，大小改變了。`,
  });
}

// ---------- 4-2 約分 ----------
function genRibbon(rng) {
  const [p, q] = properReduced(rng, 2, 6);
  const k = randInt(rng, 2, 4);
  const a = p * k, b = q * k;
  return inputQ({
    prompt: `彩帶平分成 ${b} 段，塗色 ${a} 段是 ${fs(a, b)}。如果每 ${k} 段併成 1 份，塗色部分是幾分之幾？`, answer: fs(p, q), keypad: 'fraction',
    svg: D.ribbon({ b, a, k }), tags: ['reduce-fraction'],
    explanation: `${b} ÷ ${k} = ${q} 份，塗色 ${a} ÷ ${k} = ${p} 份，所以 ${fs(a, b)} = ${fs(p, q)}。`,
  });
}

function reducible(rng, maxD) {
  return retry(() => {
    const [p, q] = properReduced(rng, 2, 12);
    const k = randInt(rng, 2, 12);
    return q * k <= maxD ? { p, q, k, n: p * k, d: q * k } : null;
  });
}

function genReduceBlank(rng, d) {
  const { n, d: den } = reducible(rng, d === 1 ? 50 : 100);
  // 選一個公因數（不一定是最大的）
  const c = pick(rng, divisors(gcd(n, den)).filter((x) => x > 1));
  const r = rng();
  if (r < 0.4) {
    return inputQ({
      prompt: `約分：${fs(n, den)} = □/${den / c}，□ 裡是多少？`, answer: n / c, svg: D.fracRow([F(n, den), '=', F('□', den / c)]), tags: ['reduce-fraction'],
      explanation: `分母 ${den} ÷ ${c} = ${den / c}，分子也要除以 ${c}：${n} ÷ ${c} = ${n / c}。`,
    });
  }
  if (r < 0.7) {
    return inputQ({
      prompt: `約分：${fs(n, den)} = ${n / c}/□，□ 裡是多少？`, answer: den / c, svg: D.fracRow([F(n, den), '=', F(n / c, '□')]), tags: ['reduce-fraction'],
      explanation: `分子 ${n} ÷ ${c} = ${n / c}，分母也要除以 ${c}：${den} ÷ ${c} = ${den / c}。`,
    });
  }
  return inputQ({
    prompt: `${fs(n, den)} = ${fs(n / c, den / c)}，分子和分母同除以多少？`, answer: c, svg: D.fracRow([F(n, den), '=', F(n / c, den / c)]), tags: ['reduce-fraction'],
    explanation: `${n} ÷ ${n / c} = ${c}，${den} ÷ ${den / c} = ${c}，同除以 ${c}。`,
  });
}

function genAllReductions(rng) {
  return retry(() => {
    const { n, d } = reducible(rng, 100);
    const cds = divisors(gcd(n, d)).filter((x) => x > 1);
    if (cds.length < 2 || cds.length > 5) return null;
    const correct = cds.map((c) => fs(n / c, d / c));
    const same = (a, b) => a * d === n * b;
    const cand = [];
    for (const c of cds) {
      cand.push([n / c, d], [n, d / c]);
      if (c > 2) cand.push([n / c + 1, d / c], [n / c, d / c + 1]);
    }
    for (const c of [2, 3, 5]) if (n % c === 0 && d % c !== 0) cand.push([n / c, Math.floor(d / c)]);
    const wrong = [...new Set(cand.filter(([a, b]) => b > 0 && a > 0 && !same(a, b) && b <= d).map(([a, b]) => fs(a, b)))].filter((x) => !correct.includes(x));
    if (wrong.length < 2) return null;
    const opts = shuffle(rng, [...correct, ...sample(rng, wrong, Math.min(3, 8 - correct.length))]);
    return multiQ({
      prompt: `把 ${fs(n, d)} 約分，可以得到下面哪些分數？（全部選出來）`, options: opts, answer: correct, tags: ['reduce-fraction'],
      explanation: `${n} 和 ${d} 的公因數（1 以外）有 ${joinCN(cds)}，分子分母同除，得到 ${joinCN(correct)}。`,
    });
  });
}

function genLowestTerms(rng, d) {
  const { p, q, n, d: den } = reducible(rng, d === 1 ? 60 : 100);
  const g = gcd(n, den);
  const partial = divisors(g).filter((x) => x > 1 && x < g);
  if (rng() < 0.5) {
    return inputQ({
      prompt: `把 ${fs(n, den)} 約到不能再約分，是多少？`, answer: fs(p, q), keypad: 'fraction', tags: ['reduce-fraction', 'lowest-terms'],
      explanation: `${n} 和 ${den} 的最大公因數是 ${g}，分子分母同除以 ${g}，得到 ${fs(p, q)}。`,
    });
  }
  const ds = [...partial.map((c) => fs(n / c, den / c)), fs(n / g, den), fs(n, den / g), fs(p, q + 1), fs(p + 1, q + 1)];
  return choiceQ(rng, {
    prompt: `把 ${fs(n, den)} 約到不能再約分，是多少？`, answer: fs(p, q), distractors: ds.filter((x) => x !== fs(p, q)), tags: ['reduce-fraction', 'lowest-terms'],
    explanation: `用最大公因數 ${g} 一次約完：${n} ÷ ${g} = ${p}，${den} ÷ ${g} = ${q}。`,
  });
}

function genMixedLowest(rng) {
  return retry(() => {
    const { p, q, n, d } = reducible(rng, 48);
    const g = gcd(n, d);
    const w = randInt(rng, 2, 6);
    const partial = divisors(g).filter((x) => x > 1 && x < g);
    const ds = [ms(w, n, d), fs(p, q), ...partial.map((c) => ms(w, n / c, d / c))];
    if (w % g === 0) ds.push(ms(w / g, p, q)); else ds.push(ms(w + 1, p, q));
    return choiceQ(rng, {
      prompt: `把 ${ms(w, n, d)} 約到不能再約分，是多少？`, answer: ms(w, p, q), distractors: ds, svg: D.fracRow([F(n, d, w)]), tags: ['reduce-fraction', 'lowest-terms'],
      explanation: `整數 ${w} 不動，只約分數部分：${fs(n, d)} 同除以 ${g} 是 ${fs(p, q)}。`,
    });
  });
}

function genWhichLowest(rng) {
  return retry(() => {
    const [p, q] = properReduced(rng, 5, 15);
    const bad = range(1, 3).map(() => { const r = reducible(rng, 60); return fs(r.n, r.d); });
    if (new Set(bad).size < 3) return null;
    return choiceQ(rng, {
      prompt: '下面哪一個分數已經不能再約分了？', answer: fs(p, q), distractors: bad, tags: ['reduce-fraction', 'lowest-terms'],
      explanation: `${p} 和 ${q} 的公因數只有 1，不能再約分；其他分數的分子和分母都還有 1 以外的公因數。`,
    });
  });
}

// ---------- 4-3 通分和比大小 ----------
const cmpFrac = (a, b, c, d) => Math.sign(a * d - c * b);
const sym = (s) => (s > 0 ? '>' : s < 0 ? '<' : '=');

function genCompareExpand(rng, d) {
  return retry(() => {
    const [a, b] = properReduced(rng, 2, d === 1 ? 9 : 15);
    let [c, e] = properReduced(rng, 2, d === 1 ? 9 : 15);
    if (rng() < 0.15) { const k = randInt(rng, 2, 4); [c, e] = [a * k, b * k]; }
    if (b === e) return null;
    const L = lcm(b, e);
    if (L > 90) return null;
    const x = a * (L / b), y = c * (L / e);
    const s = cmpFrac(a, b, c, e);
    if (d === 1 && rng() < 0.5) {
      return inputQ({
        prompt: `把 ${fs(a, b)} 和 ${fs(c, e)} 通分，分母用 ${L}，${fs(a, b)} = □/${L}，□ 裡是多少？`, answer: x,
        svg: D.fracRow([F(a, b), '=', F('□', L)]), tags: ['common-denominator'],
        explanation: `${b} × ${L / b} = ${L}，分子也乘 ${L / b}：${a} × ${L / b} = ${x}。`,
      });
    }
    const ans = s > 0 ? fs(a, b) : s < 0 ? fs(c, e) : '一樣大';
    return choiceQ(rng, {
      prompt: `${fs(a, b)} 和 ${fs(c, e)}，哪一個比較大？`, answer: ans, fixed: [fs(a, b), fs(c, e), '一樣大'],
      svg: D.fracRow([F(a, b), '和', F(c, e)]), tags: ['compare-fraction'],
      explanation: `通分成分母 ${L}：${fs(a, b)} = ${fs(x, L)}，${fs(c, e)} = ${fs(y, L)}，${x} ${sym(s)} ${y}${s === 0 ? '，一樣大' : `，所以 ${ans} 比較大`}。`,
    });
  });
}

function genCompareReduce(rng) {
  return retry(() => {
    const q = randInt(rng, 2, 9);
    const p = randInt(rng, 1, q - 1), r = rng() < 0.25 ? p : randInt(rng, 1, q - 1);
    if (gcd(p, q) !== 1 || gcd(r, q) !== 1) return null;
    const k1 = randInt(rng, 2, 8), k2 = randInt(rng, 2, 8);
    if (k1 === k2 || q * k1 > 60 || q * k2 > 60 || gcd(k1, k2) !== 1) return null;
    const [a, b, c, d] = [p * k1, q * k1, r * k2, q * k2];
    const s = cmpFrac(a, b, c, d);
    const ans = s > 0 ? fs(a, b) : s < 0 ? fs(c, d) : '一樣大';
    return choiceQ(rng, {
      prompt: `${fs(a, b)} 和 ${fs(c, d)}，哪一個比較大？（試試先約分）`, answer: ans, fixed: [fs(a, b), fs(c, d), '一樣大'],
      svg: D.fracRow([F(a, b), '和', F(c, d)]), tags: ['compare-fraction'],
      explanation: `先約分：${fs(a, b)} = ${fs(p, q)}，${fs(c, d)} = ${fs(r, q)}，分母一樣比分子${s === 0 ? '，一樣大' : `，${ans} 比較大`}。`,
    });
  });
}

function genCompareMixed(rng) {
  return retry(() => {
    const b = randInt(rng, 2, 9), w = randInt(rng, 1, 4), a = randInt(rng, 1, b - 1);
    const sameDen = rng() < 0.5;
    const d = sameDen ? b : randInt(rng, 2, 9);
    let n;
    const t = rng();
    if (t < 0.25 && sameDen) n = w * d + a; // 一樣大
    else n = randInt(rng, d + 1, 5 * d);
    if (n % d === 0) return null;
    const s = cmpFrac(n, d, w * b + a, b);
    const wn = Math.floor(n / d), rn = n % d;
    const why = wn !== w ? `${fs(n, d)} = ${ms(wn, rn, d)}，先比整數 ${wn} 和 ${w}`
      : `${fs(n, d)} = ${ms(wn, rn, d)}，整數一樣，再比 ${fs(rn, d)} 和 ${fs(a, b)}`;
    return choiceQ(rng, {
      prompt: `${fs(n, d)} ○ ${ms(w, a, b)}，○ 裡要填 >、< 還是 =？`, answer: sym(s), fixed: ['>', '<', '='],
      svg: D.fracRow([F(n, d), '○', F(a, b, w)]), tags: ['compare-fraction', 'improper-fraction'],
      explanation: `${why}，所以填「${sym(s)}」。`,
    });
  });
}

function genSameNumerator(rng, d) {
  if (d === 3 && rng() < 0.5) {
    const [x, y] = sample(rng, range(3, 12), 2);
    const big = Math.max(x, y);
    return choiceQ(rng, {
      prompt: `${fs(x - 1, x)} 和 ${fs(y - 1, y)}，哪一個比較大？`, answer: fs(big - 1, big), fixed: [fs(x - 1, x), fs(y - 1, y), '一樣大'],
      svg: D.fracRow([F(x - 1, x), '和', F(y - 1, y)]), tags: ['compare-fraction'],
      explanation: `${fs(x - 1, x)} 比 1 少 ${fs(1, x)}，${fs(y - 1, y)} 比 1 少 ${fs(1, y)}；${fs(1, big)} 比較小，少得越少越大，所以 ${fs(big - 1, big)} 比較大。`,
    });
  }
  return retry(() => {
    const a = randInt(rng, 1, 9), b = randInt(rng, 2, 15), c = randInt(rng, 2, 15);
    if (b === c) return null;
    const small = Math.min(b, c);
    return choiceQ(rng, {
      prompt: `${fs(a, b)} 和 ${fs(a, c)}，哪一個比較大？`, answer: fs(a, small), fixed: [fs(a, b), fs(a, c), '一樣大'],
      svg: D.fracRow([F(a, b), '和', F(a, c)]), tags: ['compare-fraction'],
      explanation: `分子一樣是 ${a}，分母越小每一份越大，所以 ${fs(a, small)} 比較大。`,
    });
  });
}

const LIFE_CTX = [
  { q: (x, y) => `小橘喝了 ${x} 瓶牛奶，小黑喝了 ${y} 瓶牛奶，誰喝得比較多？`, opts: ['小橘', '小黑', '一樣多'] },
  { q: (x, y) => `甲盒巧克力重 ${x} 公斤，乙盒巧克力重 ${y} 公斤，哪一盒比較重？`, opts: ['甲盒', '乙盒', '一樣重'] },
  { q: (x, y) => `咪咪吃了 ${x} 盒貓餅乾，花花吃了 ${y} 盒，誰吃得比較多？`, opts: ['咪咪', '花花', '一樣多'] },
];

function genLifeCompare(rng) {
  return retry(() => {
    const ctx = pick(rng, LIFE_CTX);
    const [a, b] = properReduced(rng, 2, 12);
    let c, d;
    if (rng() < 0.25) { const k = randInt(rng, 2, 4); [c, d] = [a * k, b * k]; } else [c, d] = properReduced(rng, 2, 12);
    if (b === d) return null;
    const L = lcm(b, d);
    if (L > 72) return null;
    const s = cmpFrac(a, b, c, d);
    const ans = ctx.opts[s > 0 ? 0 : s < 0 ? 1 : 2];
    return choiceQ(rng, {
      prompt: ctx.q(fs(a, b), fs(c, d)), answer: ans, fixed: ctx.opts, tags: ['compare-fraction'],
      explanation: `通分成分母 ${L}：${fs(a * (L / b), L)} 和 ${fs(c * (L / d), L)}，${a * (L / b)} ${sym(s)} ${c * (L / d)}，答案是「${ans}」。`,
    });
  });
}

function genFillSymbol(rng) {
  return retry(() => {
    const [a, b] = properReduced(rng, 2, 8);
    const k = randInt(rng, 2, 4);
    const e = b * k;
    const c = rng() < 0.3 ? a * k : randInt(rng, 1, e - 1);
    const left = rng() < 0.5;
    const [n1, d1, n2, d2] = left ? [a, b, c, e] : [c, e, a, b];
    const s = cmpFrac(n1, d1, n2, d2);
    return choiceQ(rng, {
      prompt: `${fs(n1, d1)} ○ ${fs(n2, d2)}，○ 裡要填 >、< 還是 =？`, answer: sym(s), fixed: ['>', '<', '='],
      svg: D.fracRow([F(n1, d1), '○', F(n2, d2)]), tags: ['compare-fraction'],
      explanation: `把 ${fs(a, b)} 擴分成 ${fs(a * k, e)}，再和 ${fs(c, e)} 比分子：${a * k} ${left ? sym(s) : sym(-s)} ${c}，填「${sym(s)}」。`,
    });
  });
}

function genBoxDigits(rng) {
  return retry(() => {
    const form = randInt(rng, 1, 4);
    const [p, q] = properReduced(rng, 2, 9);
    const m = randInt(rng, 2, 3), c = q * m;
    let test, tokens, text, why;
    if (form === 1) { test = (x) => cmpFrac(p, q, x, c) > 0; tokens = [F(p, q), '>', F('□', c)]; text = `${fs(p, q)} > □/${c}`; why = `把 ${fs(p, q)} 擴分成 ${fs(p * m, c)}，□ 要比 ${p * m} 小`; }
    if (form === 2) { test = (x) => cmpFrac(p, q, p, x) > 0; tokens = [F(p, q), '>', F(p, '□')]; text = `${fs(p, q)} > ${p}/□`; why = `分子一樣，分母越大分數越小，□ 要比 ${q} 大`; }
    if (form === 3) { test = (x) => cmpFrac(p, q, x, c) < 0; tokens = [F(p, q), '<', F('□', c)]; text = `${fs(p, q)} < □/${c}`; why = `把 ${fs(p, q)} 擴分成 ${fs(p * m, c)}，□ 要比 ${p * m} 大`; }
    if (form === 4) { test = (x) => cmpFrac(p, q, p, x) < 0; tokens = [F(p, q), '<', F(p, '□')]; text = `${fs(p, q)} < ${p}/□`; why = `分子一樣，分母越小分數越大，□ 要比 ${q} 小`; }
    const ans = range(1, 9).filter(test).map(String);
    if (ans.length < 1 || ans.length > 7) return null;
    return multiQ({
      prompt: `${text}，□ 裡可以填 1～9 的哪些數字？（全部選出來）`, options: range(1, 9).map(String), answer: ans,
      svg: D.fracRow(tokens), tags: ['compare-fraction'],
      explanation: `${why}：${joinCN(ans)}。`,
    });
  });
}

function genOrderFractions(rng) {
  if (rng() < 0.5) {
    const ns = sample(rng, range(3, 12), 3).sort((a, b) => a - b);
    return orderQ({
      prompt: '由小到大排排看。', items: ns.map((n) => fs(n - 1, n)), tags: ['compare-fraction'],
      explanation: `每個都比 1 少一點：少 ${ns.map((n) => fs(1, n)).join('、')}，少得越多越小，所以 ${ns.map((n) => fs(n - 1, n)).join(' < ')}。`,
    });
  }
  return retry(() => {
    const fr = range(1, 3).map(() => properReduced(rng, 2, 12));
    const L = fr.reduce((acc, [, d]) => lcm(acc, d), 1);
    if (L > 60) return null;
    const vals = fr.map(([n, d]) => n * (L / d));
    if (new Set(vals).size !== 3 || new Set(fr.map(([, d]) => d)).size < 2) return null;
    const sorted = fr.map((f, i) => [f, vals[i]]).sort((x, y) => x[1] - y[1]);
    return orderQ({
      prompt: '由小到大排排看。', items: sorted.map(([[n, d]]) => fs(n, d)), tags: ['compare-fraction'],
      explanation: `通分成分母 ${L}：${sorted.map(([[n, d], v]) => `${fs(n, d)} = ${fs(v, L)}`).join('，')}。`,
    });
  });
}

// ====================== 單元 5　線對稱圖形 ======================

function starPoly(points, rIn) {
  return range(0, 2 * points - 1).map((i) => {
    const r = i % 2 ? rIn : 1;
    const a = D.deg(-90 + (180 * i) / points);
    return [r * Math.cos(a), r * Math.sin(a)];
  });
}

const PLUS = [[-0.4, -1.2], [0.4, -1.2], [0.4, -0.4], [1.2, -0.4], [1.2, 0.4], [0.4, 0.4], [0.4, 1.2], [-0.4, 1.2], [-0.4, 0.4], [-1.2, 0.4], [-1.2, -0.4], [-0.4, -0.4]];

// 對稱軸用「通過的兩點」描述（模型座標 y 向下）；lines: 真的對稱軸，fakeLines: 看起來像但不是
const SYM_SHAPES = [
  { name: '正三角形', axes: 3, polys: () => [regularPoly(3)] },
  { name: '正方形', axes: 4, polys: () => [[[-1, -1], [1, -1], [1, 1], [-1, 1]]],
    lines: [[[0, -1], [0, 1]], [[-1, -1], [1, 1]]], fakeLines: [] },
  { name: '長方形', axes: 2, polys: () => [[[-1.5, -0.9], [1.5, -0.9], [1.5, 0.9], [-1.5, 0.9]]],
    lines: [[[0, -0.9], [0, 0.9]], [[-1.5, 0], [1.5, 0]]], fakeLines: [[[-1.5, -0.9], [1.5, 0.9]]], why: '長方形只有直的和橫的 2 條對稱軸，對角線不是對稱軸。' },
  { name: '菱形', axes: 2, polys: () => [[[0, -1.5], [0.95, 0], [0, 1.5], [-0.95, 0]]],
    lines: [[[0, -1.5], [0, 1.5]], [[-0.95, 0], [0.95, 0]]], fakeLines: [[[0.475, -0.75], [-0.475, 0.75]]], why: '菱形的 2 條對角線是對稱軸。' },
  { name: '等腰三角形', axes: 1, polys: () => [[[0, -1.5], [0.85, 1], [-0.85, 1]]],
    lines: [[[0, -1.5], [0, 1]]], fakeLines: [[[0.85, 1], [-0.425, -0.25]]], why: '等腰三角形只有 1 條對稱軸，從頂點垂直到底邊中點。' },
  { name: '平行四邊形', axes: 0, polys: () => [[[-1.0, -0.8], [1.6, -0.8], [1.0, 0.8], [-1.6, 0.8]]],
    lines: [], fakeLines: [[[0.3, -0.8], [-0.3, 0.8]], [[-1.3, 0], [1.3, 0]], [[-1.0, -0.8], [1.0, 0.8]]], why: '平行四邊形找不到對摺後完全重合的線，有 0 條對稱軸。' },
  { name: '等腰梯形', axes: 1, polys: () => [[[-0.7, -0.8], [0.7, -0.8], [1.5, 0.8], [-1.5, 0.8]]],
    lines: [[[0, -0.8], [0, 0.8]]], fakeLines: [[[-1.1, 0], [1.1, 0]]], why: '等腰梯形只有 1 條對稱軸，是上下底中點的連線。' },
  { name: '梯形', axes: 0, polys: () => [[[-1.3, -0.8], [0.3, -0.8], [1.4, 0.8], [-1.3, 0.8]]], why: '這個梯形兩邊不一樣，沒有對稱軸。' },
  { name: '三角形', axes: 0, polys: () => [[[-1.5, 0.9], [1.3, 0.9], [0.9, -1.2]]], why: '三條邊都不一樣長的三角形沒有對稱軸。' },
  { name: '正五邊形', axes: 5, polys: () => [regularPoly(5)] },
  { name: '正六邊形', axes: 6, polys: () => [regularPoly(6)],
    lines: [[[0, -1], [0, 1]], [[-Math.cos(D.deg(30)), 0], [Math.cos(D.deg(30)), 0]]],
    fakeLines: [[[0, -1], [Math.cos(D.deg(30)) * 0.5 + Math.cos(D.deg(30)) * 0.5, 0.25]]] },
  { name: '正八邊形', axes: 8, polys: () => [regularPoly(8, 1, -90 + 22.5)] },
  { name: '五角星', axes: 5, polys: () => [starPoly(5, 0.42)] },
  { name: '八角星', axes: 8, polys: () => [starPoly(8, 0.62)] },
  { name: '箏形', axes: 1, polys: () => [[[0, -1.1], [0.9, -0.35], [0, 1.6], [-0.9, -0.35]]],
    lines: [[[0, -1.1], [0, 1.6]]], fakeLines: [[[-0.9, -0.35], [0.9, -0.35]]], why: '箏形只有長的那條對角線是對稱軸。' },
  { name: '十字形', axes: 4, polys: () => [PLUS] },
  { name: '箭頭', axes: 1, polys: () => [[[0, -1.5], [1.1, -0.3], [0.4, -0.3], [0.4, 1.4], [-0.4, 1.4], [-0.4, -0.3], [-1.1, -0.3]]] },
  { name: 'L 形', axes: 0, polys: () => [[[-1, -1.4], [-0.2, -1.4], [-0.2, 0.6], [1.2, 0.6], [1.2, 1.4], [-1, 1.4]]] },
  { name: '閃電', axes: 0, polys: () => [[[-0.2, -1.5], [0.9, -1.5], [0.3, -0.2], [0.9, -0.2], [-0.6, 1.6], [-0.1, 0.2], [-0.7, 0.2]]] },
  { name: '蝴蝶結', axes: 2, polys: () => [[[-1.5, -0.9], [0, 0], [-1.5, 0.9]], [[1.5, -0.9], [0, 0], [1.5, 0.9]]] },
];
const SYM_LETTERS = { yes: ['A', 'D', 'E', 'H', 'M', 'T', 'U'], no: ['F', 'G', 'J', 'N', 'P', 'R', 'S', 'Z'] };

const rotPts = (pts, deg) => {
  const c = Math.cos(D.deg(deg)), s = Math.sin(D.deg(deg));
  return pts.map(([x, y]) => [x * c - y * s, x * s + y * c]);
};

// 隨機的正多邊形或星形（對稱軸條數 = 邊數或角數）
function randomRegularShape(rng) {
  if (rng() < 0.65) {
    const n = randInt(rng, 3, 10);
    return { name: NAME_REG(n), axes: n, polys: () => [regularPoly(n)] };
  }
  const n = randInt(rng, 4, 8), rIn = 0.38 + rng() * 0.22;
  return { name: `${cn(n)}角星`, axes: n, polys: () => [starPoly(n, rIn)] };
}

// 從圖形庫或隨機正多邊形挑一個，並隨機轉一個角度（轉動不會改變對稱軸的條數）
function pickSymShape(rng) {
  const base = rng() < 0.25 ? randomRegularShape(rng) : pick(rng, SYM_SHAPES);
  const rot = rng() < 0.5 ? 0 : randInt(rng, 1, 11) * 30;
  return { ...base, rot };
}

function shapeSvg(shape, o = {}) {
  const W = o.W ?? 600, H = o.H ?? 340;
  const rot = shape.rot ?? 0;
  const polys = shape.polys().map((p) => rotPts(p, rot));
  const extra = o.line ? (o.line = rotPts(o.line, rot)) : [];
  const f = D.fitter([...polys.flat(), ...extra], W, H, o.pad ?? 40);
  let body = polys.map((p) => D.polygon(p.map(f), C.shape, C.shapeStroke, o.sw ?? 4)).join('');
  if (o.line) {
    const [P, Q] = o.line.map(f);
    const u = D.vunit(D.vsub(Q, P));
    const ext = 40;
    body += D.dashed(P[0] - u[0] * ext, P[1] - u[1] * ext, Q[0] + u[0] * ext, Q[1] + u[1] * ext, C.axisLine, 4);
  }
  return D.doc(W, H, body);
}

function letterSvg(ch, W = 600, H = 340) {
  return D.doc(W, H, D.text(W / 2, H / 2 + 6, ch, { size: Math.round(H * 0.72), bold: true, fill: C.a, family: 'Arial,Helvetica,sans-serif' }));
}

function axesWhy(s) {
  if (s.why) return s.why;
  if (s.axes === 0) return `${s.name}沒有對稱軸。`;
  if (s.name.startsWith('正')) return `${s.name}有 ${s.axes} 條對稱軸（正幾邊形就有幾條）。`;
  return `${s.name}有 ${s.axes} 條對稱軸。`;
}

// ---------- 5-1 ----------
function genIsSymmetric(rng) {
  if (rng() < 0.4) {
    const yes = rng() < 0.5;
    const ch = pick(rng, yes ? SYM_LETTERS.yes : SYM_LETTERS.no);
    return tfQ({
      prompt: '這個字母是線對稱圖形。', answer: yes, svg: letterSvg(ch), tags: ['line-symmetry'],
      explanation: yes ? `${ch} 沿著一條${['D', 'E'].includes(ch) ? '橫' : '直'}線對摺，兩邊可以完全重合。`
        : ['N', 'S', 'Z'].includes(ch) ? `${ch} 轉半圈會和原來一樣，但找不到對摺後完全重合的線，不是線對稱圖形。`
          : `${ch} 找不到一條線，對摺後兩邊完全重合，不是線對稱圖形。`,
    });
  }
  const s = pickSymShape(rng);
  return tfQ({
    prompt: '這個圖形是線對稱圖形。', answer: s.axes > 0, svg: shapeSvg(s), tags: ['line-symmetry'],
    explanation: s.axes > 0 ? `${s.name}沿著對稱軸對摺，兩邊會完全重合；${axesWhy(s)}` : `${s.name}找不到對摺後完全重合的線，不是線對稱圖形。`,
  });
}

function genPickSymmetric(rng) {
  return retry(() => {
    const nYes = randInt(rng, 2, 3);
    const yesPool = [...SYM_SHAPES.filter((s) => s.axes > 0), randomRegularShape(rng), randomRegularShape(rng)];
    const ss = [...sample(rng, yesPool, nYes), ...sample(rng, SYM_SHAPES.filter((s) => s.axes === 0), 5 - nYes)]
      .map((x) => ({ ...x, rot: rng() < 0.5 ? 0 : randInt(rng, 1, 11) * 30 }));
    if (new Set(ss.map((x) => x.name)).size < 5) return null;
    return svgMultiQ(rng, {
      prompt: '下面哪些是線對稱圖形？（全部選出來）',
      items: ss.map((s) => ({ svg: shapeSvg(s, { W: 300, H: 220, pad: 24, sw: 3 }), ok: s.axes > 0, name: s.name })),
      tags: ['line-symmetry'],
      explanation: (ans, all) => `${all.filter((x) => x.ok).map((x) => `${x.label}（${x.name}）`).join('、')}對摺後可以完全重合；其他的不行。`,
    });
  });
}

function genAxesCount(rng) {
  const s = pickSymShape(rng);
  return inputQ({
    prompt: '這個圖形有幾條對稱軸？', answer: s.axes, svg: shapeSvg(s), tags: ['symmetry-axis'], explanation: axesWhy(s),
  });
}

function genIsAxisLine(rng) {
  const base = pick(rng, SYM_SHAPES.filter((x) => x.lines && (x.lines.length || x.fakeLines.length)));
  const s = { ...base, rot: rng() < 0.5 ? 0 : randInt(rng, 1, 11) * 30 };
  const real = s.lines.length && (rng() < 0.5 || !s.fakeLines.length);
  const ln = pick(rng, real ? s.lines : s.fakeLines);
  return tfQ({
    prompt: '圖中的虛線是這個圖形的對稱軸。', answer: !!real, svg: shapeSvg(s, { line: ln.slice() }), tags: ['symmetry-axis'],
    explanation: real ? `沿著虛線對摺，兩邊會完全重合，所以是對稱軸。` : `沿著虛線對摺，兩邊不會完全重合，所以不是對稱軸。${s.why ?? ''}`,
  });
}

const SYM_TF = [
  ['長方形的對角線是它的對稱軸。', false, '沿著對角線對摺，兩邊不會重合；長方形只有 2 條對稱軸。', 'symmetry-axis'],
  ['正方形有 4 條對稱軸。', true, '直的、橫的和 2 條對角線，共 4 條。', 'symmetry-axis'],
  ['平行四邊形是線對稱圖形。', false, '一般的平行四邊形找不到對摺後完全重合的線。', 'line-symmetry'],
  ['正五邊形有 5 條對稱軸。', true, '正幾邊形就有幾條對稱軸。', 'symmetry-axis'],
  ['線對稱圖形沿著對稱軸對摺，兩邊會完全重合。', true, '這就是線對稱圖形的意思。', 'line-symmetry'],
  ['英文字母 S 轉半圈會和原來一樣，所以 S 是線對稱圖形。', false, '轉半圈一樣不算，要對摺後完全重合才是線對稱圖形。', 'line-symmetry'],
];

// ---------- 5-2 ----------
// 產生對稱軸是直線 x = 0 的多邊形（格子座標，y 向下），回傳頂點、名稱和對稱對應
function symPolygon(rng, d) {
  return retry(() => {
    const k = randInt(rng, 2, d === 1 ? 2 : 3);
    const topApex = rng() < 0.6, botApex = rng() < 0.5;
    const ys = sample(rng, range(1, 6), k).sort((a, b) => a - b);
    const right = ys.map((y) => [randInt(rng, 1, 4), y]);
    const pts = [];
    const mirrorOf = [];
    if (topApex) pts.push([0, 0]);
    right.forEach((p) => pts.push(p));
    if (botApex) pts.push([0, 7]);
    const nRight = pts.length;
    for (let i = right.length - 1; i >= 0; i--) pts.push([-right[i][0], right[i][1]]);
    // 對稱對應
    for (let i = 0; i < pts.length; i++) {
      const [x, y] = pts[i];
      mirrorOf.push(pts.findIndex(([x2, y2]) => x2 === -x && y2 === y));
    }
    // 不要有平平的角
    const ia = D.interiorAngles(pts);
    if (ia.some((a) => Math.abs(a - 180) < 12 || a < 25)) return null;
    for (let i = 0; i < pts.length; i++) if (D.vlen(D.vsub(pts[i], pts[(i + 1) % pts.length])) < 1) return null;
    return { pts, mirrorOf, nRight };
  });
}

const VLAB = 'ABCDEFGHIJ';

function symPolySvg(sp, o = {}) {
  const W = 600, H = 380;
  const horizontal = !!o.horizontal;
  const tr = ([x, y]) => (horizontal ? [y, -x] : [x, y]);
  const P0 = sp.pts.map(tr);
  const ys = sp.pts.map((p) => p[1]);
  const [y1, y2] = [Math.min(...ys) - 0.9, Math.max(...ys) + 0.9];
  const axisPts = horizontal ? [[y1, 0], [y2, 0]] : [[0, y1], [0, y2]];
  const f = D.fitter([...P0, ...axisPts], W, H, 54);
  const P = P0.map(f);
  let body = D.polygon(P, C.shape, C.shapeStroke, 4);
  const [a1, a2] = axisPts.map(f);
  body += D.dashed(a1[0], a1[1], a2[0], a2[1], C.axisLine, 3.5);
  if (o.labels) {
    P.forEach((p, i) => {
      const dir = D.outwardDir(P, i);
      const pos = D.vadd(p, D.vmul(dir, 24));
      body += D.text(pos[0], pos[1], VLAB[i], { size: 20, bold: true, fill: C.a, family: 'Arial,Helvetica,sans-serif' });
    });
  }
  for (const s of o.sideLabels ?? []) {
    const A = P[s.i], B = P[(s.i + 1) % P.length];
    const cen = [sum(P.map((p) => p[0])) / P.length, sum(P.map((p) => p[1])) / P.length];
    const pos = D.sideLabelPos(A, B, cen, s.text, 17);
    body += D.labelBox(pos[0], pos[1], s.text, { size: 17, bold: true, fill: s.q ? C.mark : C.a });
  }
  for (const a of o.angleLabels ?? []) {
    const n = P.length;
    const V = P[a.i], Pp = P[(a.i + n - 1) % n], Q = P[(a.i + 1) % n];
    const ang = D.interiorAngles(P)[a.i];
    if (ang < 180) {
      body += D.angleArc(V, Pp, Q, 20, a.q ? C.mark : C.a, 2.5);
      const pos = D.bisectorPoint(V, Pp, Q, D.labelDist(ang, 24));
      body += D.text(pos[0], pos[1], a.text, { size: 18, bold: true, fill: a.q ? C.mark : C.ink });
    }
  }
  return D.doc(W, H, body);
}

function genCorresponding(rng, d) {
  const sp = symPolygon(rng, d);
  const n = sp.pts.length;
  const horizontal = rng() < 0.3;
  const svg = symPolySvg(sp, { labels: true, horizontal });
  const offAxis = range(0, n - 1).filter((i) => sp.mirrorOf[i] !== i);
  const kind = pick(rng, ['point', 'point', 'edge', 'angle']);
  if (kind === 'point' || kind === 'angle') {
    const i = pick(rng, offAxis);
    const j = sp.mirrorOf[i];
    const nm = kind === 'point' ? '點' : '角';
    return choiceQ(rng, {
      prompt: `虛線是對稱軸。${nm} ${VLAB[i]} 的對稱${nm}是哪一個？`, answer: `${nm} ${VLAB[j]}`,
      distractors: range(0, n - 1).filter((x) => x !== j).map((x) => `${nm} ${VLAB[x]}`), svg, tags: ['symmetric-parts'],
      explanation: `沿著對稱軸對摺，${nm} ${VLAB[i]} 會和${nm} ${VLAB[j]} 重合${kind === 'angle' ? '，兩個角一樣大' : ''}。`,
    });
  }
  // 邊：找一條不跨過對稱軸的邊
  const edges = range(0, n - 1).map((i) => [i, (i + 1) % n]);
  const keyE = ([a, b]) => [a, b].sort().join('-');
  const cand = edges.filter(([a, b]) => keyE([sp.mirrorOf[a], sp.mirrorOf[b]]) !== keyE([a, b]));
  const [a, b] = pick(rng, cand);
  const [ma, mb] = [sp.mirrorOf[a], sp.mirrorOf[b]];
  const ename = (x, y) => `邊 ${VLAB[x]}${VLAB[y]}`;
  const ans = ename(ma, mb);
  const wrong = edges.filter((e) => keyE(e) !== keyE([ma, mb])).map(([x, y]) => ename(x, y));
  return choiceQ(rng, {
    prompt: `虛線是對稱軸。${ename(a, b)} 的對稱邊是哪一條？`, answer: ans, distractors: wrong, svg, tags: ['symmetric-parts'],
    explanation: `${[a, b].map((x) => (sp.mirrorOf[x] === x ? `點 ${VLAB[x]} 在對稱軸上` : `點 ${VLAB[x]} 對到點 ${VLAB[sp.mirrorOf[x]]}`)).join('，')}，所以對稱邊是${ans}，兩條一樣長。`,
  });
}

const PROP_TF = [
  ['線對稱圖形的對稱邊一樣長。', true, '對摺後對稱邊完全重合，所以一樣長。', 'symmetric-parts'],
  ['線對稱圖形的對稱角一樣大。', true, '對摺後對稱角完全重合，所以一樣大。', 'symmetric-parts'],
  ['對稱點的連線和對稱軸互相垂直。', true, '對稱點連起來的線和對稱軸成直角。', 'symmetric-parts'],
  ['對稱點的連線和對稱軸互相平行。', false, '是互相垂直，不是平行。', 'symmetric-parts'],
  ['對稱軸會把對稱點的連線分成一樣長的兩段。', true, '兩個對稱點到對稱軸的距離一樣。', 'symmetric-parts'],
  ['對稱點到對稱軸的距離不一定一樣。', false, '對稱點到對稱軸的距離一定一樣。', 'symmetric-parts'],
];

function genGridDistance(rng) {
  const horizontal = rng() < 0.35;
  const cols = 12, rows = 8;
  const axisAt = horizontal ? 4 : 6;
  const k = randInt(rng, 1, horizontal ? 4 : 5);
  const side = rng() < 0.5 ? -1 : 1;
  const pP = horizontal ? [randInt(rng, 1, 11), axisAt + side * k] : [axisAt + side * k, randInt(rng, 1, 7)];
  const pQ = horizontal ? [pP[0], axisAt - side * k] : [axisAt - side * k, pP[1]];
  const mode = pick(rng, ['dist', 'len', 'half']);
  const dots = [{ x: pP[0], y: pP[1], label: 'P' }];
  const polys = [];
  if (mode === 'half') {
    dots.push({ x: pQ[0], y: pQ[1], label: 'Q', color: C.a });
    polys.push({ points: [pP, pQ], open: true, stroke: C.mark, sw: 3 });
  }
  const svg = D.gridFigure({ cols, rows, axis: { dir: horizontal ? 'h' : 'v', at: axisAt }, dots, polys, W: 600, H: 400 });
  if (mode === 'dist') {
    return inputQ({
      prompt: '虛線是對稱軸。點 P 的對稱點離對稱軸幾格？', answer: k, svg, tags: ['symmetric-parts'],
      explanation: `點 P 離對稱軸 ${k} 格，對稱點到對稱軸的距離一樣，也是 ${k} 格。`,
    });
  }
  if (mode === 'len') {
    return inputQ({
      prompt: '虛線是對稱軸。把點 P 和它的對稱點連起來，這條線長幾格？', answer: 2 * k, svg, tags: ['symmetric-parts'],
      explanation: `P 離對稱軸 ${k} 格，對稱點在另一邊也是 ${k} 格，${k} + ${k} = ${2 * k} 格。`,
    });
  }
  return inputQ({
    prompt: '虛線是對稱軸，P 和 Q 是對稱點。PQ 連線被對稱軸分成兩段，每段長幾格？', answer: k, svg, tags: ['symmetric-parts'],
    explanation: `PQ 長 ${2 * k} 格，對稱軸把它平分，每段 ${2 * k} ÷ 2 = ${k} 格。`,
  });
}

function genSymPerimeter(rng, d) {
  return retry(() => {
    const sp = symPolygon(rng, 2);
    const n = sp.pts.length;
    const len = (i) => Math.max(1, Math.round(D.vlen(D.vsub(sp.pts[(i + 1) % n], sp.pts[i])) * 2));
    const edges = range(0, n - 1);
    const crossing = edges.filter((i) => sp.mirrorOf[i] === (i + 1) % n); // 跨過對稱軸的邊（自己對自己）
    const rightEdges = edges.filter((i) => !crossing.includes(i) && sp.pts[i][0] >= 0 && sp.pts[(i + 1) % n][0] >= 0);
    const L = edges.map(len);
    const half = sum(rightEdges.map((i) => L[i]));
    const cross = sum(crossing.map((i) => L[i]));
    const P = 2 * half + cross;
    const labels = [...rightEdges, ...crossing].map((i) => ({ i, text: `${L[i]}公分` }));
    if (d === 3 && rightEdges.length >= 2 && rng() < 0.6) {
      const qi = pick(rng, rightEdges);
      const lab = labels.map((s) => (s.i === qi ? { ...s, text: '?', q: true } : s));
      const others = half - L[qi];
      return inputQ({
        prompt: `虛線是對稱軸，整個圖形的周長是 ${P} 公分。「?」那條邊長幾公分？`, answer: L[qi],
        svg: symPolySvg(sp, { sideLabels: lab }), tags: ['symmetric-parts'],
        explanation: `${cross ? `${P} − ${cross} = ${P - cross}，` : ''}一半是 ${(P - cross) / 2}，${(P - cross) / 2} − ${others} = ${L[qi]}。`,
      });
    }
    return inputQ({
      prompt: '虛線是對稱軸，圖上只標出一邊的長度。這個圖形的周長是幾公分？', answer: P, svg: symPolySvg(sp, { sideLabels: labels }), tags: ['symmetric-parts'],
      explanation: `對稱邊一樣長：一邊是 ${rightEdges.map((i) => L[i]).join(' + ')} = ${half}，${half} × 2${cross ? ` + ${cross}` : ''} = ${P} 公分。`,
    });
  });
}

function genSymAngle(rng) {
  return retry(() => {
    const sp = symPolygon(rng, 2);
    const n = sp.pts.length;
    const ia = D.interiorAngles(sp.pts);
    const cand = range(0, n - 1).filter((i) => sp.mirrorOf[i] !== i && sp.pts[i][0] > 0 && ia[i] < 180);
    if (!cand.length) return null;
    const i = pick(rng, cand), j = sp.mirrorOf[i];
    const a = Math.round(ia[i]);
    return inputQ({
      prompt: '虛線是對稱軸，「?」的角是幾度？', answer: a, keypad: 'degree',
      svg: symPolySvg(sp, { angleLabels: [{ i, text: `${a}°` }, { i: j, text: '?', q: true }] }), tags: ['symmetric-parts'],
      explanation: `「?」和 ${a}° 的角是對稱角，對稱角一樣大，所以是 ${a}°。`,
    });
  });
}

// ---------- 5-3 畫出線對稱圖形 ----------
const cellKey = (cells) => cells.map(([c, r]) => `${c},${r}`).sort().join(';');

function randomCells(rng, maxC, rows, count, touchCol) {
  return retry(() => {
    const start = [touchCol, randInt(rng, 0, rows - 1)];
    const set = new Map([[start.join(','), start]]);
    let guard = 0;
    while (set.size < count && guard++ < 100) {
      const [c, r] = pick(rng, [...set.values()]);
      const [dc, dr] = pick(rng, [[1, 0], [-1, 0], [0, 1], [0, -1]]);
      const nc = c + dc, nr = r + dr;
      if (nc < 0 || nc > maxC || nr < 0 || nr >= rows) continue;
      set.set(`${nc},${nr}`, [nc, nr]);
    }
    return set.size === count ? [...set.values()] : null;
  });
}

function genGridComplete(rng, d) {
  return retry(() => {
    const half = 4, cols = 8, rows = 6;
    const left = randomCells(rng, half - 1, rows, randInt(rng, 4, d === 1 ? 5 : 7), half - 1);
    const mir = ([c, r]) => [cols - 1 - c, r];
    const correct = [...left, ...left.map(mir)];
    const variants = [
      [...left, ...left.map(([c, r]) => [c + half, r])], // 平移，沒有翻過來
      [...left, ...left.map(([c, r]) => [cols - 1 - c, rows - 1 - r])], // 上下也翻了
    ];
    const m = left.map(mir);
    for (let t = 0; t < 6; t++) {
      const i = randInt(rng, 0, m.length - 1);
      const moved = m.slice();
      const [c, r] = moved[i];
      const nb = pick(rng, [[c + 1, r], [c, r + 1], [c, r - 1]]);
      if (nb[0] < half || nb[0] >= cols || nb[1] < 0 || nb[1] >= rows) continue;
      if (moved.some(([x, y]) => x === nb[0] && y === nb[1])) continue;
      moved[i] = nb;
      variants.push([...left, ...moved]);
    }
    const seen = new Set([cellKey(correct)]);
    const wrongs = [];
    for (const v of variants) {
      const k = cellKey(v);
      if (!seen.has(k) && v.every(([c, r]) => c >= 0 && c < cols && r >= 0 && r < rows)) { seen.add(k); wrongs.push(v); }
    }
    if (wrongs.length < 3) return null;
    const horizontal = rng() < 0.35;
    const tr = (cells) => (horizontal ? cells.map(([c, r]) => ({ c: r, r: c })) : cells.map(([c, r]) => ({ c, r })));
    const dims = horizontal ? { cols: rows, rows: cols } : { cols, rows };
    const axis = { dir: horizontal ? 'h' : 'v', at: half };
    const mini = (cells) => D.gridFigure({ ...dims, cells: tr(cells), axis, W: 300, H: 230, pad: 14 });
    return svgChoiceQ(rng, {
      prompt: '虛線是對稱軸。要把圖形畫成線對稱圖形，完成後是哪一張？',
      svg: D.gridFigure({ ...dims, cells: tr(left), axis, W: 600, H: 400 }), correct: mini(correct), wrongs: wrongs.slice(0, 3).map(mini),
      tags: ['draw-symmetric'],
      explanation: (lab) => `每一格到對稱軸的距離，在另一邊要一樣遠（像照鏡子一樣翻過去）：${lab}才對。`,
    });
  });
}

// 點子圖：給一半的多邊形，選出畫對的另一半
function genDotComplete(rng) {
  return retry(() => {
    const ax = 5, cols = 10, rows = 8;
    const k = randInt(rng, 2, 4);
    const ys = sample(rng, range(1, 7), k).sort((a, b) => a - b);
    const y0 = randInt(rng, 0, ys[0] - 1), yn = randInt(rng, ys[k - 1] + 1, 8);
    if (yn > rows) return null;
    const inner = ys.map((y) => [ax - randInt(rng, 1, 4), y]);
    const halfPath = [[ax, y0], ...inner, [ax, yn]];
    const mirror = ([x, y]) => [2 * ax - x, y];
    const full = (rightInner) => [...halfPath, ...rightInner.slice().reverse()];
    const good = inner.map(mirror);
    const pts = full(good);
    const ia = D.interiorAngles(pts);
    if (ia.some((a) => Math.abs(a - 180) < 10)) return null;
    const variants = [];
    const i1 = randInt(rng, 0, k - 1);
    const v1 = good.map((p, i) => (i === i1 ? [p[0] + pick(rng, [1, -1]), p[1]] : p));
    variants.push(v1);
    const i2 = randInt(rng, 0, k - 1);
    const v2 = good.map((p, i) => (i === i2 ? [p[0], p[1] + pick(rng, [1, -1])] : p));
    variants.push(v2);
    variants.push(good.map(([x, y]) => [x + 1, y]));
    const ok = (ri) => ri.every(([x, y]) => x > ax && x <= cols && y > y0 && y < yn)
      && ri.every((p, i) => i === 0 || p[1] > ri[i - 1][1]);
    const seen = new Set([JSON.stringify(good)]);
    const wrongs = [];
    for (const v of variants) {
      const key = JSON.stringify(v);
      if (ok(v) && !seen.has(key)) { seen.add(key); wrongs.push(v); }
    }
    if (wrongs.length < 2) return null;
    const mini = (ri) => D.gridFigure({ cols, rows, dotGrid: true, axis: { dir: 'v', at: ax }, polys: [{ points: full(ri) }], W: 300, H: 240, pad: 14 });
    return svgChoiceQ(rng, {
      prompt: '虛線是對稱軸。用點子圖畫出另一半，哪一張畫對了？',
      svg: D.gridFigure({ cols, rows, dotGrid: true, axis: { dir: 'v', at: ax }, polys: [{ points: halfPath, open: true }], W: 600, H: 400 }),
      correct: mini(good), wrongs: wrongs.map(mini), tags: ['draw-symmetric'],
      explanation: (lab) => `先數每個頂點離對稱軸幾格，在另一邊同樣的格數找對稱點，再依序連線：${lab}每個點都對。`,
    });
  });
}

function genPickSymPoint(rng) {
  return retry(() => {
    const cols = 10, rows = 8, ax = 5;
    const px = randInt(rng, 1, 4), py = randInt(rng, 2, 6);
    const good = [2 * ax - px, py];
    const cands = [[good[0], py - 1], [good[0], py + 1], [good[0] + 1, py], [good[0] - 1, py], [px + ax, py]]
      .filter(([x, y]) => x > ax && x < cols && y >= 1 && y < rows && !(x === good[0] && y === good[1]));
    const uniq = [...new Map(cands.map((p) => [p.join(','), p])).values()];
    if (uniq.length < 3) return null;
    const pts = shuffle(rng, [good, ...sample(rng, uniq, 3)]);
    const ansLab = LABELS[pts.findIndex((p) => p === good)];
    const dots = [{ x: px, y: py, label: 'P', dx: 0.34, dy: -0.36 }, ...pts.map((p, i) => ({ x: p[0], y: p[1], label: LABELS[i], color: C.a, dx: 0.34, dy: -0.36, size: 17 }))];
    return choiceQ(rng, {
      prompt: '虛線是對稱軸。點 P 的對稱點是哪一個？', answer: ansLab, fixed: LABELS.slice(0, 4),
      svg: D.gridFigure({ cols, rows, axis: { dir: 'v', at: ax }, dots, W: 600, H: 400 }), tags: ['draw-symmetric'],
      explanation: `P 在對稱軸左邊 ${ax - px} 格，對稱點要在右邊 ${ax - px} 格、同一列，是${ansLab}。`,
    });
  });
}

function genCountCells(rng) {
  const half = 4, cols = 8, rows = 6;
  const left = randomCells(rng, half - 1, rows, randInt(rng, 3, 7), half - 1);
  const svg = D.gridFigure({ cols, rows, cells: left.map(([c, r]) => ({ c, r })), axis: { dir: 'v', at: half }, W: 600, H: 400 });
  if (rng() < 0.5) {
    return inputQ({
      prompt: '虛線是對稱軸。要畫成線對稱圖形，另一邊要塗幾格？', answer: left.length, svg, tags: ['draw-symmetric'],
      explanation: `每一格都有一格對稱的格子，左邊塗了 ${left.length} 格，右邊也要塗 ${left.length} 格。`,
    });
  }
  return inputQ({
    prompt: '虛線是對稱軸。畫完整個線對稱圖形後，一共塗了幾格？', answer: 2 * left.length, svg, tags: ['draw-symmetric'],
    explanation: `另一邊也塗 ${left.length} 格，${left.length} + ${left.length} = ${2 * left.length} 格。`,
  });
}

// ---------- 5-4 剪出線對稱圖形 ----------
const HALF_LIB = [
  [[0, 0], [1, 0], [1, 2], [3, 2], [3, 5], [0, 5]], // 凸字形
  [[0, 0], [1, 0], [1, 2], [3, 2], [3, 3], [1, 3], [1, 6], [0, 6]], // 十字形
  [[0, 0], [3, 0], [3, 1], [1, 1], [1, 4], [3, 4], [3, 5], [0, 5]], // 工字形
  [[0, 0], [3, 2], [2, 2], [2, 5], [0, 5]], // 房子
  [[0, 0], [3, 3], [1, 3], [1, 6], [0, 6]], // 箭頭
  [[0, 0], [2, 2], [1, 2], [3, 4], [1, 4], [1, 6], [0, 6]], // 樹
  [[0, 2], [1, 0], [2, 2], [3, 0], [3, 5], [0, 5]], // 皇冠
  [[0, 1], [1, 0], [2, 0], [3, 1], [3, 2], [0, 5]], // 愛心
  [[0, 0], [2, 0], [2, 1], [1, 1], [1, 2], [3, 2], [3, 3], [1, 3], [1, 5], [0, 5]],
];

function randomHalf(rng) {
  return retry(() => {
    const k = randInt(rng, 2, 4);
    const ys = sample(rng, range(1, 5), k).sort((a, b) => a - b);
    const pts = [[0, 0], ...ys.map((y) => [randInt(rng, 1, 3), y]), [0, 6]];
    const ia = D.interiorAngles([...pts, ...pts.slice(1, -1).reverse().map(([x, y]) => [-x, y])]);
    return ia.some((a) => Math.abs(a - 180) < 10) ? null : pts;
  });
}

const mirrorX = (pts, at = 0) => pts.map(([x, y]) => [2 * at - x, y]);
const unfold = (half) => [half, mirrorX(half)];

function silhouetteSvg(polys, box, W = 300, H = 220) {
  const f = D.fitter(box, W, H, 18);
  return D.doc(W, H, polys.map((p) => D.polygon(p.map(f), C.green, C.green, 1.5)).join(''));
}

function foldedSvg(half, foldRight, paperW, paperH, W = 600, H = 380) {
  const flip = (pts) => (foldRight ? pts.map(([x, y]) => [paperW - x, y]) : pts);
  const paper = flip([[0, -0.5], [paperW, -0.5], [paperW, paperH + 0.5], [0, paperH + 0.5]]);
  const f = D.fitter(paper, W, H, 40);
  const cut = flip(half);
  let body = D.polygon(paper.map(f), C.paper, '#C9B88E', 2);
  body += D.polygon(cut.map(f), '#BFE3C8', 'none');
  body += D.polyline(cut.map(f), C.mark, 4, 'stroke-dasharray="2 0"');
  const fx = foldRight ? paperW : 0;
  const [a, b] = [f([fx, -0.5]), f([fx, paperH + 0.5])];
  body += D.dashed(a[0], a[1], b[0], b[1], C.axisLine, 4);
  body += D.text(a[0] + (foldRight ? -10 : 10), a[1] - 16, '摺線', { size: 18, bold: true, fill: C.axisLine, anchor: foldRight ? 'end' : 'start' });
  body += D.text(W / 2, H - 16, '紅線是剪線', { size: 16, fill: C.mark });
  return D.doc(W, H, body);
}

function genUnfold(rng, d) {
  return retry(() => {
    const half = d === 1 || rng() < 0.6 ? pick(rng, HALF_LIB) : randomHalf(rng);
    const maxX = Math.max(...half.map((p) => p[0]));
    const maxY = Math.max(...half.map((p) => p[1]));
    const paperW = maxX + 1;
    const foldRight = rng() < 0.5;
    const flipSide = (polys) => (foldRight ? polys.map((p) => mirrorX(p)) : polys);
    const correct = unfold(half);
    const cands = [
      [half, mirrorX(half, paperW)], // 以為另一邊是摺線
      [half, half.map(([x, y]) => [-x, maxY - y])], // 上下顛倒
      [half, half.map(([x, y]) => [x + maxX, y])], // 沒有翻過來，直接平移
      [half],
    ];
    const seen = new Set([D.silhouetteKey(correct)]);
    const wrongs = [];
    for (const c of cands) {
      const k = D.silhouetteKey(c);
      if (!seen.has(k)) { seen.add(k); wrongs.push(c); }
      if (wrongs.length === 3) break;
    }
    if (wrongs.length < 3) return null;
    const all = [correct, ...wrongs].map(flipSide);
    const allPts = all.flat(2);
    const xs = allPts.map((p) => p[0]), ys = allPts.map((p) => p[1]);
    // 每個選項用同一個比例尺，各自置中
    const span = Math.max(Math.max(...xs) - Math.min(...xs), 1);
    const draw = (polys) => {
      const pts = polys.flat();
      const minX = Math.min(...pts.map((p) => p[0])), mx = Math.max(...pts.map((p) => p[0]));
      const cx = (minX + mx) / 2;
      const box = [[cx - span / 2, Math.min(...ys)], [cx + span / 2, Math.max(...ys)]];
      return silhouetteSvg(polys, box);
    };
    return svgChoiceQ(rng, {
      prompt: '把紙對摺，沿著紅線剪下來，打開後是哪一個圖形？', svg: foldedSvg(half, foldRight, paperW, maxY),
      correct: draw(all[0]), wrongs: all.slice(1).map(draw), tags: ['cut-symmetric'],
      explanation: (lab) => `摺線那一邊沒有剪開，打開後剪下的形狀會沿著摺線翻到另一邊，左右對稱：${lab}。`,
    });
  });
}

const CUT_TF = [
  ['把紙對摺後剪出圖形，打開後一定是線對稱圖形，摺線就是對稱軸。', true, '兩層紙一起剪，打開後兩邊完全一樣，摺線是對稱軸。', 'cut-symmetric'],
  ['對摺剪紙時，如果把摺線那一邊整個剪開，打開後還是連在一起的一張。', false, '摺線被剪開，打開後會變成分開的兩片。', 'cut-symmetric'],
  ['對摺剪出來的圖形打開後，面積是剪下那一片（還沒打開時）的 2 倍。', true, '打開後有兩片一樣大的部分，所以是 2 倍。', 'cut-symmetric'],
];

// ====================== 匯出 ======================

export const units = [
  {
    unit: '1',
    title: '折線圖',
    sections: [
      makeSection('1', '1-1', '認識複雜長條圖和折線圖', [
        { f: genDoubleBar, w: 4 },
        { f: genStackedBar, w: 3 },
        { f: genStackedBar, min: 2, w: 2 },
        { f: genDoubleLine, min: 2, w: 4 },
        { f: genDoubleLine, max: 1, w: 1 },
        { f: genChartUse, w: 2, max: 2 },
      ]),
      makeSection('1', '1-2', '繪製折線圖', [
        { f: genLineChange, w: 3 },
        { f: genReadPoint, w: 2 },
        { f: genBreakConcept, w: 2 },
        { f: genDrawSteps, max: 1, w: 1 },
        { f: genAxisScale, w: 3 },
        { f: genPlotPosition, min: 2, w: 3 },
        { f: genWhichChart, min: 2, w: 4 },
        { f: genWhichChart, max: 1, w: 1 },
        { f: genScaleChoice, min: 3, w: 2 },
      ]),
    ],
  },
  {
    unit: '2',
    title: '因數和倍數',
    sections: [
      makeSection('2', '2-1', '整除', [
        { f: genDivTF, w: 4 },
        { f: genDivMulti, w: 3 },
        { f: genDivNotExact, w: 2 },
        { f: genShareBags, min: 2, w: 3 },
        { f: genShareBags, max: 1, w: 1 },
      ]),
      makeSection('2', '2-2', '因數', [
        { f: genFactorList, w: 3 },
        { f: genFactorExtreme, w: 3 },
        { f: genDirectionTF, w: 3 },
        { f: genWhichFactor, w: 2 },
        { f: genRectangles, min: 2, w: 3 },
        { f: genShareCats, min: 2, w: 2 },
      ]),
      makeSection('2', '2-3', '公因數和最大公因數', [
        { f: genGcdInput, w: 3 },
        { f: genCommonFactors, w: 3 },
        { f: genGcdChoice, w: 2 },
        { f: genGcdTF, w: 2 },
        { f: genGrouping, min: 2, w: 4 },
      ]),
      makeSection('2', '2-4', '倍數', [
        { f: genMultipleList, w: 4 },
        { f: genSmallestMultiple, w: 3 },
        { f: genWhichMultiple, w: 2 },
        { f: genDirectionTF, w: 2 },
        { f: genLargestMultiple, w: 2 },
        { f: genBetweenMultiples, w: 1 },
        { f: genDecadeShare, min: 2, w: 2 },
        { f: genLeastAdd, min: 2, w: 2 },
        { f: genNearestMultiple, min: 2, w: 2 },
      ]),
      makeSection('2', '2-5', '公倍數和最小公倍數', [
        { f: genNumberLine, max: 2, w: 3 },
        { f: genLcmInput, w: 3 },
        { f: genLcmChoice, w: 3 },
        { f: genLcmTF, w: 2 },
        { f: genLcmLeast, min: 2, w: 3 },
        { f: genLcmRange, min: 3, w: 3 },
        { f: genLcmRange, min: 2, max: 2, w: 1 },
      ]),
      makeSection('2', '2-6', '倍數的應用——找 2、5 和 10 的倍數', [
        { f: genMult2510TF, w: 3 },
        { f: genMult2510Multi, w: 3 },
        { f: genMult2510List, w: 2 },
        { f: genMultDigit, w: 2 },
        { f: genMult39, min: 3, w: 1 },
      ]),
    ],
  },
  {
    unit: '3',
    title: '多邊形',
    sections: [
      makeSection('3', '3-1', '多邊形', [
        { f: genCountParts, w: 3 },
        { f: genNamePolygon, w: 2 },
        { f: genIsPolygon, w: 3 },
        { f: genPickPolygons, min: 2, w: 3 },
        { f: genPolyFacts, w: 2 },
      ]),
      makeSection('3', '3-2', '正多邊形', [
        { f: genNameRegular, w: 5 },
        { f: genPickRegular, w: 2 },
        { f: genRegularNames, w: 2 },
        { f: genRegularFacts, w: 3 },
      ]),
      makeSection('3', '3-3', '三角形邊長的性質', [
        { f: genTriTF, w: 4 },
        { f: genTriClassify, min: 2, w: 3 },
        { f: genTriClassify, max: 1, w: 1 },
        { f: genTriWhichSet, w: 2 },
        { f: genThirdSide, min: 3, w: 3 },
      ]),
      makeSection('3', '3-4', '多邊形內角和', [
        { f: genAngleSum, w: 4 },
        { f: genDiagonalTriangles, w: 3 },
        { f: genRegularAngle, min: 2, w: 3 },
        { f: genSidesFromSum, min: 3, w: 2 },
      ]),
      makeSection('3', '3-5', '多邊形內角和的應用', [
        { f: genTriangleAngle, w: 3 },
        { f: genStraightAngle, max: 2, w: 2 },
        { f: genIsosceles, w: 3 },
        { f: genExterior, min: 2, w: 3 },
        { f: genQuadAngle, min: 2, w: 3 },
        { f: genQuadAngle, max: 1, w: 1 },
        { f: genCompositeRight, min: 3, w: 3 },
        { f: genCompositeExterior, min: 2, w: 2 },
        { f: genAngleTerms, max: 1, w: 1 },
      ]),
    ],
  },
  {
    unit: '4',
    title: '擴分、約分和通分',
    sections: [
      makeSection('4', '4-1', '擴分', [
        { f: genAreaModel, max: 2, w: 3 },
        { f: genExpandBlank, w: 4 },
        { f: genEqualChoice, w: 3 },
        { f: genExpandTF, w: 2 },
        { f: genExpandMixed, min: 2, w: 2 },
        { f: genExpandTarget, min: 2, w: 2 },
      ]),
      makeSection('4', '4-2', '約分', [
        { f: genRibbon, max: 2, w: 3 },
        { f: genReduceBlank, w: 4 },
        { f: genLowestTerms, min: 2, w: 4 },
        { f: genLowestTerms, max: 1, w: 1 },
        { f: genWhichLowest, min: 2, w: 2 },
        { f: genAllReductions, min: 2, w: 3 },
        { f: genMixedLowest, min: 3, w: 2 },
      ]),
      makeSection('4', '4-3', '通分和異分母分數的大小比較', [
        { f: genFillSymbol, w: 3 },
        { f: genCompareExpand, w: 4 },
        { f: genSameNumerator, min: 2, w: 2 },
        { f: genLifeCompare, min: 2, w: 2 },
        { f: genCompareReduce, min: 2, w: 2 },
        { f: genCompareMixed, min: 3, w: 2 },
        { f: genBoxDigits, min: 3, w: 3 },
        { f: genOrderFractions, min: 3, w: 2 },
      ]),
    ],
  },
  {
    unit: '5',
    title: '線對稱圖形',
    sections: [
      makeSection('5', '5-1', '認識線對稱圖形和對稱軸', [
        { f: genIsSymmetric, w: 4 },
        { f: genIsAxisLine, w: 3 },
        { f: (rng) => tfFromList(rng, SYM_TF), w: 2 },
        { f: genAxesCount, min: 2, w: 4 },
        { f: genPickSymmetric, min: 2, w: 3 },
      ]),
      makeSection('5', '5-2', '認識對稱點、對稱邊和對稱角', [
        { f: genCorresponding, w: 4 },
        { f: (rng) => tfFromList(rng, PROP_TF), w: 2 },
        { f: genSymAngle, w: 2 },
        { f: genGridDistance, min: 2, w: 3 },
        { f: genSymPerimeter, min: 2, w: 3 },
      ]),
      makeSection('5', '5-3', '畫出線對稱圖形', [
        { f: genGridComplete, w: 4 },
        { f: genPickSymPoint, w: 3 },
        { f: genCountCells, max: 1, w: 2 },
        { f: genDotComplete, min: 2, w: 4 },
      ]),
      makeSection('5', '5-4', '剪出線對稱圖形', [
        { f: genUnfold, w: 6 },
        { f: (rng) => tfFromList(rng, CUT_TF), w: 1 },
      ]),
    ],
  },
];
