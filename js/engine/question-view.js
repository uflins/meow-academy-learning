// 把一題畫到畫面上，等孩子作答。題目格式見 docs/題目格式.md。
import { h, fromHTML } from '../ui/dom.js';
import { shuffle } from '../gen/util.js';
import { speak } from './speech.js';
import { play } from './sfx.js';
import { playZhuyin } from './zhuyin-audio.js';
import { mapSVG, COMPASS_LABELS } from '../gen/boss-special.js';
import { monsterSVG } from '../art/art.js';

export function optionLabel(o) {
  return typeof o === 'string' ? o : o.label;
}

function norm(s) {
  return String(s ?? '').replace(/\s+/g, '').replace(/°/g, '').replace(/／/g, '/').trim();
}

function sameNumber(a, b) {
  if (/[/]/.test(a) || /[/]/.test(b)) return false;
  const x = Number(a), y = Number(b);
  return a !== '' && b !== '' && Number.isFinite(x) && Number.isFinite(y) && Math.abs(x - y) < 1e-9;
}

export function isCorrect(q, given) {
  switch (q.type) {
    case 'choice': return String(given) === String(q.answer);
    case 'truefalse': return given === q.answer;
    case 'multi': {
      const a = new Set(q.answer.map(String));
      const g = new Set((given || []).map(String));
      return a.size === g.size && [...a].every((x) => g.has(x));
    }
    case 'input': {
      const g = norm(given);
      return [q.answer, ...(q.accept || [])].some((a) => norm(a) === g || sameNumber(norm(a), g));
    }
    case 'order': return Array.isArray(given) && given.length === q.items.length && given.every((x, i) => String(x) === String(q.items[i]));
    default: return false;
  }
}

export function formatAnswer(q) {
  switch (q.type) {
    case 'truefalse': return q.answer ? '⭕ 對' : '❌ 錯';
    case 'multi': return q.answer.join('、');
    case 'order': return q.items.join(' → ');
    case 'input': return q.keypad === 'degree' ? `${q.answer}°` : String(q.answer);
    default: return String(q.answer);
  }
}

// ---------- 一年級注音玩法的圖 ----------

export const TONE_NO = { '一聲': 1, '二聲': 2, '三聲': 3, '四聲': 4, '輕聲': 5 };

// 聲調跳跳貓：貓咪跳法的路線（一聲平走、二聲往上、三聲先蹲再跳、四聲往下溜、輕聲輕輕點）
function toneSVG(label) {
  const paths = {
    1: 'M10 26 H 70',
    2: 'M10 38 L 70 10',
    3: 'M10 12 Q 30 44 42 38 T 72 8',
    4: 'M10 10 L 70 38',
  };
  const n = TONE_NO[label];
  const body = n === 5
    ? '<circle cx="40" cy="26" r="7" fill="#E07B45"/>'
    : `<path d="${paths[n]}" fill="none" stroke="#E07B45" stroke-width="5" stroke-linecap="round" stroke-dasharray="1 9"/>
       <circle cx="${n === 1 ? 70 : 72}" cy="${n === 1 ? 26 : n === 2 || n === 3 ? 9 : 38}" r="6" fill="#E07B45"/>`;
  return `<svg viewBox="0 0 80 48"><text x="4" y="46" font-size="11" fill="#B08968">🐾</text>${body}</svg>`;
}

// 嘴形猜猜看：ㄧ 扁扁的、ㄨ 圓圓的、ㄩ 嘟起來
function mouthSVG(sym) {
  const mouth = {
    'ㄧ': '<ellipse cx="50" cy="66" rx="20" ry="5" fill="#B85C5C" stroke="#7A3B3B" stroke-width="2"/>',
    'ㄨ': '<ellipse cx="50" cy="66" rx="9" ry="10" fill="#B85C5C" stroke="#7A3B3B" stroke-width="2"/>',
    'ㄩ': '<ellipse cx="50" cy="66" rx="12" ry="9" fill="#E9868F" stroke="#7A3B3B" stroke-width="2.5"/><ellipse cx="50" cy="66" rx="5" ry="4.5" fill="#7A3B3B"/>',
  }[sym] || '';
  return `<svg viewBox="0 0 100 90">
    <path d="M20 34 L 24 6 L 40 22 Z M80 34 L 76 6 L 60 22 Z" fill="#F6B26B" stroke="#9C5426" stroke-width="2.5" stroke-linejoin="round"/>
    <circle cx="50" cy="50" r="34" fill="#F6B26B" stroke="#9C5426" stroke-width="2.5"/>
    <circle cx="38" cy="44" r="4" fill="#3A2A22"/><circle cx="62" cy="44" r="4" fill="#3A2A22"/>
    ${mouth}</svg>`;
}

// 拼音魔法鍋：注音符號泡泡飄進冒泡的鍋子
function potSVG(partsText) {
  const parts = partsText.split(/[＋+]/).map((x) => x.trim()).filter(Boolean);
  const gap = 260 / (parts.length + 1);
  const bubbles = parts.map((p, i) => {
    const x = 20 + gap * (i + 1);
    return `<circle cx="${x}" cy="44" r="27" fill="#E8F4FF" stroke="#8CC8EE" stroke-width="3"/>
            <text x="${x}" y="58" font-size="36" font-weight="800" text-anchor="middle" fill="#4A3B32">${p}</text>`;
  }).join('');
  return `<svg viewBox="0 0 300 230">
    ${bubbles}
    <path d="M70 120 h160 q -6 84 -80 92 q -74 -8 -80 -92 Z" fill="#7E57C2" stroke="#4A2F7A" stroke-width="4"/>
    <ellipse cx="150" cy="120" rx="86" ry="16" fill="#B39DDB" stroke="#4A2F7A" stroke-width="4"/>
    <circle cx="120" cy="114" r="7" fill="#E1D5F5"/><circle cx="150" cy="108" r="9" fill="#E1D5F5"/><circle cx="180" cy="114" r="6" fill="#E1D5F5"/>
    <path d="M60 128 q -16 0 -16 14 M240 128 q 16 0 16 14" fill="none" stroke="#4A2F7A" stroke-width="5" stroke-linecap="round"/>
  </svg>`;
}

// 修辭技能卡的圖示
const RHETORIC_ICON = { 譬喻: '🪞', 轉化: '🎭', 設問: '❓', 排比: '📚', 摹寫: '👂', 類疊: '🔁', 引用: '💬' };

// 依題型替選項加上圖
function decorateOption(q, o, ctx) {
  const kind = q.tags && q.tags[0];
  const obj = typeof o === 'string' ? { label: o } : Object.assign({}, o);
  if (kind === 'tone' && TONE_NO[obj.label]) obj.svg = toneSVG(obj.label);
  if (kind === 'mouth' && ['ㄧ', 'ㄨ', 'ㄩ'].includes(obj.label)) obj.svg = mouthSVG(obj.label);
  if (kind === 'blend' && ctx.lowGrade && obj.image) obj.hideLabel = true; // 首冊沒教國字，只顯示圖
  if (q.style === 'clones') obj.svg = monsterSVG(q.subject, { className: 'clone' }); // 分數大魔王的分身
  if (kind === 'rhetoric' && RHETORIC_ICON[obj.label]) obj.image = RHETORIC_ICON[obj.label];
  return typeof o === 'string' && !obj.svg && !obj.image ? o : obj;
}

// ---------- 附圖 ----------

function splitDiagramSVG({ total, parts }) {
  const box = (x, y, v) => `
    <rect x="${x - 34}" y="${y - 30}" width="68" height="60" rx="14" fill="${v == null ? '#FFF3D6' : '#fff'}" stroke="#C98A4B" stroke-width="3"/>
    <text x="${x}" y="${y + 13}" font-size="38" font-weight="800" text-anchor="middle" fill="${v == null ? '#E07B45' : '#4A3B32'}">${v == null ? '?' : v}</text>`;
  return `<svg viewBox="0 0 260 190">
    <path d="M130 64 L 70 126 M130 64 L 190 126" stroke="#C98A4B" stroke-width="4" stroke-linecap="round"/>
    ${box(130, 40, total)}${box(70, 150, parts[0])}${box(190, 150, parts[1])}
  </svg>`;
}

// 題目附圖；size = 'small' 用在錯題回顧、錯題本
export function renderVisual(v, size = '') {
  if (!v) return null;
  if (v.svg) return h('div', { class: `q-visual svg ${size}`, html: v.svg });
  if (v.splitDiagram) return h('div', { class: `q-visual svg split ${size}`, html: splitDiagramSVG(v.splitDiagram) });
  if (v.emojiGroups) {
    return h('div', { class: `q-visual groups ${size}` },
      v.emojiGroups.map((g) => h('div', { class: 'emoji-group' },
        g.label ? h('div', { class: 'emoji-group-label' }, g.label) : null,
        h('div', { class: `emoji-grid ${g.count > 6 ? 'dense' : ''} ${g.count === 1 ? 'single' : ''}` },
          Array.from({ length: g.count }, () => h('span', { class: 'emoji' }, g.emoji))))));
  }
  return null;
}

// ---------- 作答區 ----------

function optionContent(o) {
  if (typeof o === 'string') return [h('span', { class: 'opt-label' }, o)];
  const parts = [];
  if (o.image) parts.push(h('span', { class: 'opt-image' }, o.image));
  if (o.svg) parts.push(h('span', { class: 'opt-svg', html: o.svg }));
  if (o.label && !(o.image && o.hideLabel)) parts.push(h('span', { class: 'opt-label' }, o.label));
  return parts;
}

function choiceArea(q, ctx, answer) {
  const kind = q.tags && q.tags[0];
  const fixedOrder = kind === 'tone' || kind === 'mouth' || q.style === 'bubble' || q.keepOrder
    || q.options.every((o) => /^[甲乙丙丁戊己]$/.test(optionLabel(o)));
  const order = fixedOrder ? q.options.map((_, i) => i) : shuffle(Math.random, q.options.map((_, i) => i));
  const ordered = order.map((i) => q.options[i]);
  const shownOpts = ordered.map((o) => decorateOption(q, o, ctx));
  const wrap = h('div', { class: `q-options n${q.options.length} ${shownOpts.some((o) => o.svg) ? 'has-svg' : ''} ${q.style === 'bubble' ? 'bubbles' : ''} kind-${(q.tags && q.tags[0]) || ''}` });
  for (let oi = 0; oi < ordered.length; oi++) {
    const o = ordered[oi];
    const label = optionLabel(o);
    const shown = shownOpts[oi];
    const btn = h('button', { class: `opt btn ${q.style === 'bubble' ? 'bubble' : ''}`, dataset: { label }, onclick: () => answer(label, btn) }, optionContent(shown));
    if (ctx.lowGrade && typeof o === 'object' && o.speak) {
      btn.append(h('span', {
        class: 'opt-say', role: 'button', 'aria-label': '聽一聽',
        onclick: (e) => { e.stopPropagation(); speak(o.speak); },
      }, '🔊'));
    }
    wrap.append(btn);
  }
  return wrap;
}

// 影子魔法師：點方位盤
function compassArea(q, ctx, answer) {
  const R = 150, C = 200;
  const ANGLE = { 正北: 0, 東偏北: 58, 正東: 90, 東偏南: 122, 正南: 180, 西偏南: 238, 正西: 270, 西偏北: 302 };
  const spots = q.options.filter((l) => l in ANGLE).map((l) => {
    const a = (ANGLE[l] * Math.PI) / 180;
    const x = C + R * Math.sin(a), y = C - R * Math.cos(a);
    // 文字放在圓圈外側：左右兩邊靠外對齊，上下兩個放在圓圈的上方或下方
    const side = Math.abs(Math.sin(a)) < 0.2 ? 0 : Math.sign(Math.sin(a));
    const tx = side ? x + side * 30 : x;
    const ty = side ? y + 8 : y + (Math.cos(a) > 0 ? -32 : 46);
    const anchor = side > 0 ? 'start' : side < 0 ? 'end' : 'middle';
    return `<g class="hot" data-label="${l}"><circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="22" fill="#FFF8EE" stroke="#E07B45" stroke-width="4"/>
      <text x="${tx.toFixed(1)}" y="${ty.toFixed(1)}" font-size="23" font-weight="800" text-anchor="${anchor}" fill="#4A3B32">${l}</text></g>`;
  }).join('');
  const center = q.options.includes('幾乎沒有影子')
    ? `<g class="hot" data-label="幾乎沒有影子"><circle cx="${C}" cy="${C + 58}" r="30" fill="#FFF8EE" stroke="#E07B45" stroke-width="4"/>
       <text x="${C}" y="${C + 54}" font-size="13" font-weight="800" text-anchor="middle" fill="#4A3B32">幾乎沒</text>
       <text x="${C}" y="${C + 70}" font-size="13" font-weight="800" text-anchor="middle" fill="#4A3B32">有影子</text></g>`
    : '';
  const svg = `<svg viewBox="-60 -40 520 480">
    <ellipse cx="${C}" cy="${C}" rx="${R + 10}" ry="${R + 10}" fill="#E8F5D9" stroke="#9CC98A" stroke-width="3"/>
    <path d="M${C} ${C - R + 26} L ${C} ${C + R - 26} M${C - R + 26} ${C} L ${C + R - 26} ${C}" stroke="#9CC98A" stroke-width="3" stroke-dasharray="6 8"/>
    <rect x="${C - 5}" y="${C - 46}" width="10" height="50" rx="4" fill="#8C6239"/>
    <ellipse cx="${C}" cy="${C + 4}" rx="16" ry="6" fill="#8C6239" opacity=".5"/>
    ${spots}${center}
  </svg>`;
  const el = h('div', { class: 'q-hot compass', html: svg });
  el.addEventListener('click', (e) => {
    const g = e.target.closest('.hot');
    if (g) answer(g.dataset.label, g);
  });
  return el;
}

// 寶島航海王：點地圖上的位置
function mapArea(q, ctx, answer) {
  const el = h('div', { class: 'q-hot map', html: mapSVG(q.map.spots) });
  el.addEventListener('click', (e) => {
    const g = e.target.closest('.map-spot');
    if (g) answer(g.dataset.label, g);
  });
  return el;
}

function multiArea(q, ctx, answer) {
  const chosen = new Set();
  const wrap = h('div', { class: 'q-multi' });
  const opts = h('div', { class: `q-options n${q.options.length} ${q.options.some((o) => o.svg) ? 'has-svg' : ''}` });
  for (const o of q.options) {
    const label = optionLabel(o);
    const btn = h('button', { class: 'opt btn toggle', dataset: { label }, onclick: () => {
      play('tap');
      if (chosen.has(label)) chosen.delete(label); else chosen.add(label);
      btn.classList.toggle('on', chosen.has(label));
    } }, optionContent(o));
    opts.append(btn);
  }
  const hint = h('div', { class: 'q-hint' }, '可以選很多個，選好按「確定」');
  wrap.append(hint, opts,
    h('button', { class: 'btn primary confirm', onclick: (e) => {
      if (!chosen.size) {
        hint.textContent = '還沒有選喔！先點選答案，再按「確定」';
        hint.classList.add('shake');
        setTimeout(() => hint.classList.remove('shake'), 400);
        return;
      }
      answer([...chosen]);
    } }, '確定'));
  return wrap;
}

function trueFalseArea(q, ctx, answer) {
  return h('div', { class: 'q-options tf' },
    h('button', { class: 'opt btn tf-true', onclick: (e) => answer(true, e.currentTarget) }, h('span', { class: 'opt-image' }, '⭕'), h('span', { class: 'opt-label' }, '對')),
    h('button', { class: 'opt btn tf-false', onclick: (e) => answer(false, e.currentTarget) }, h('span', { class: 'opt-image' }, '❌'), h('span', { class: 'opt-label' }, '錯')),
  );
}

function inputArea(q, ctx, answer) {
  if (ctx.lowGrade) {
    // 一年級：0–10 大按鈕，點了就是答案
    return h('div', { class: 'q-numbers' },
      Array.from({ length: 11 }, (_, i) => h('button', { class: 'btn num', onclick: (e) => answer(String(i), e.currentTarget) }, String(i))));
  }
  let value = '';
  const display = h('div', { class: 'q-display' });
  const suffix = q.keypad === 'degree' ? '°' : (q.unitLabel || '');
  const show = () => { display.textContent = (value || ' ') + suffix; display.classList.toggle('empty', !value); };
  const extra = q.keypad === 'fraction' ? '/' : q.keypad === 'decimal' ? '.' : '';
  const keys = ['7', '8', '9', '4', '5', '6', '1', '2', '3', extra || '', '0', '⌫'];
  const pad = h('div', { class: 'keypad' }, keys.map((k) => h('button', {
    class: `btn key ${k ? '' : 'blank'}`, disabled: !k,
    onclick: () => {
      play('tap');
      if (k === '⌫') value = value.slice(0, -1);
      else if (value.length < 8) value += k;
      show();
    },
  }, k)));
  show();
  return h('div', { class: 'q-input' },
    h('div', { class: 'q-input-top' }, display,
      h('button', { class: 'btn primary', onclick: () => { if (value) answer(value); } }, '確定')),
    pad);
}

function orderArea(q, ctx, answer) {
  const placed = [];
  const pool = shuffle(Math.random, q.items.map((x, i) => ({ x: String(x), i })));
  const row = h('div', { class: 'order-row' });
  const bank = h('div', { class: 'order-bank' });
  const render = () => {
    row.replaceChildren(...q.items.map((_, i) => h('div', { class: 'order-slot' },
      placed[i] ? h('button', { class: 'btn card', onclick: () => { play('tap'); placed.splice(i, 1); render(); } }, placed[i].x) : String(i + 1))));
    bank.replaceChildren(...pool.filter((p) => !placed.includes(p)).map((p) => h('button', {
      class: 'btn card', onclick: () => {
        play('tap');
        placed.push(p);
        render();
        if (placed.length === q.items.length) setTimeout(() => answer(placed.map((p2) => p2.x)), 250);
      },
    }, p.x)));
  };
  render();
  return h('div', { class: 'q-order' }, h('div', { class: 'q-hint' }, '依序點選排好'), row, bank);
}

// 畫出一題。回傳 { el, waitAnswer() }；waitAnswer 在孩子作答時 resolve({ given, correct })。
export function renderQuestion(q, ctx = {}) {
  let resolveAnswer;
  let locked = false;
  const answered = new Promise((r) => { resolveAnswer = r; });

  const answer = (given, btn) => {
    if (locked) return;
    locked = true;
    const correct = isCorrect(q, given);
    if (btn) btn.classList.add(correct ? 'right' : 'wrong');
    resolveAnswer({ given, correct, btn });
  };

  const sayBtn = h('button', { class: 'say-btn', 'aria-label': '再聽一次', onclick: () => (q.audio ? playZhuyin(q.audio) : speak(q.speak || q.prompt)) }, '🔊');
  const prompt = h('div', { class: 'q-prompt' }, sayBtn, h('span', { class: 'q-text' }, q.prompt));

  let area;
  switch (q.style === 'compass' ? 'compass' : q.style === 'map' ? 'map' : q.type) {
    case 'compass': area = compassArea(q, ctx, answer); break;
    case 'map': area = mapArea(q, ctx, answer); break;
    case 'choice': area = choiceArea(q, ctx, answer); break;
    case 'multi': area = multiArea(q, ctx, answer); break;
    case 'truefalse': area = trueFalseArea(q, ctx, answer); break;
    case 'input': area = inputArea(q, ctx, answer); break;
    case 'order': area = orderArea(q, ctx, answer); break;
    default: area = h('div', {}, `（不支援的題型：${q.type}）`);
  }

  const kind0 = q.tags && q.tags[0];
  const visual = renderVisual(!q.visual && kind0 === 'blend' ? { svg: potSVG(q.prompt.split('\n').pop()) } : q.visual);
  const el = h('div', { class: `question type-${q.type} ${q.style ? `style-${q.style}` : ''} ${visual ? 'has-visual' : ''}` },
    q.fromWrongBook ? h('div', { class: 'q-badge' }, '📒 錯題複習') : null,
    prompt,
    h('div', { class: 'q-body' }, visual, h('div', { class: 'q-answer' }, area)),
  );

  return {
    el,
    waitAnswer: () => answered,
    // 一年級答錯時再給一次機會：把剛剛選錯的按鈕變灰
    retry(wrongBtn) {
      locked = false;
      if (wrongBtn) { wrongBtn.classList.remove('wrong'); wrongBtn.classList.add('used'); wrongBtn.disabled = true; }
      return new Promise((r) => { resolveAnswer = r; });
    },
    lock() { locked = true; el.classList.add('locked'); },
    // 限時挑戰：時間到算答錯
    timeUp() {
      if (locked) return;
      locked = true;
      resolveAnswer({ given: null, correct: false, timedOut: true });
    },
    // 答錯時把說明放在作答區的位置，題目和附圖保持看得到
    showExplanation(panel) {
      el.classList.add('explaining');
      el.querySelector('.q-body').append(panel);
    },
    highlightCorrect() {
      if (q.type === 'choice') {
        el.querySelectorAll('.opt').forEach((b) => { if (b.dataset.label === String(q.answer)) b.classList.add('right'); });
      }
      if (q.type === 'multi') {
        const ans = new Set(q.answer.map(String));
        el.querySelectorAll('.opt').forEach((b) => {
          const on = b.classList.contains('on');
          if (ans.has(b.dataset.label)) b.classList.add('right');
          else if (on) b.classList.add('wrong');
        });
      }
      if (q.type === 'truefalse') {
        el.querySelector(q.answer ? '.tf-true' : '.tf-false')?.classList.add('right');
      }
      if (q.style === 'compass' || q.style === 'map') {
        el.querySelectorAll('[data-label]').forEach((g) => { if (g.dataset.label === String(q.answer)) g.classList.add('right'); });
      }
    },
  };
}

export { fromHTML };
