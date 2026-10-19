// 把一題畫到畫面上，等孩子作答。題目格式見 docs/題目格式.md。
import { h, fromHTML } from '../ui/dom.js';
import { shuffle } from '../gen/util.js';
import { speak } from './speech.js';
import { play } from './sfx.js';

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

function renderVisual(v) {
  if (!v) return null;
  if (v.svg) return h('div', { class: 'q-visual svg', html: v.svg });
  if (v.splitDiagram) return h('div', { class: 'q-visual svg split', html: splitDiagramSVG(v.splitDiagram) });
  if (v.emojiGroups) {
    return h('div', { class: 'q-visual groups' },
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
  const wrap = h('div', { class: `q-options n${q.options.length} ${q.options.some((o) => o.svg) ? 'has-svg' : ''}` });
  for (const o of q.options) {
    const label = optionLabel(o);
    const btn = h('button', { class: 'opt btn', dataset: { label }, onclick: () => answer(label, btn) }, optionContent(o));
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
  wrap.append(h('div', { class: 'q-hint' }, '可以選很多個，選好按「確定」'), opts,
    h('button', { class: 'btn primary confirm', onclick: () => answer([...chosen]) }, '確定'));
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

  const sayBtn = h('button', { class: 'say-btn', 'aria-label': '再聽一次', onclick: () => speak(q.speak || q.prompt) }, '🔊');
  const prompt = h('div', { class: 'q-prompt' }, sayBtn, h('span', { class: 'q-text' }, q.prompt));

  let area;
  switch (q.type) {
    case 'choice': area = choiceArea(q, ctx, answer); break;
    case 'multi': area = multiArea(q, ctx, answer); break;
    case 'truefalse': area = trueFalseArea(q, ctx, answer); break;
    case 'input': area = inputArea(q, ctx, answer); break;
    case 'order': area = orderArea(q, ctx, answer); break;
    default: area = h('div', {}, `（不支援的題型：${q.type}）`);
  }

  const visual = renderVisual(q.visual);
  const el = h('div', { class: `question type-${q.type} ${visual ? 'has-visual' : ''}` },
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
    },
  };
}

export { fromHTML };
