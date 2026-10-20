// 錯題本：依科目列出答錯的題目，可以進入「特訓」只練錯題。連續答對 2 次就畢業。
import { h } from '../ui/dom.js';
import { regionsFor } from '../engine/curriculum.js';
import { wrongFor, WRONG_GRADUATE_STREAK } from '../engine/progress.js';
import { formatAnswer, renderVisual } from '../engine/question-view.js';
import { playerBar } from './world.js';

const SUBJECT_NAME = { chinese: '國語', math: '數學', science: '自然', social: '社會', english: '英語' };

// 「第 3 課」「複習一」「2-2 節」
function sectionLabel(q) {
  const s = String(q.section);
  if (/^r\d$/.test(s)) return `複習${'一二三'[Number(s[1]) - 1]}`;
  if (/^\d+$/.test(s)) return `第 ${s} 課`;
  return `${s} 節`;
}

export default function wrongbook(root, params, { go, app }) {
  const player = app.player;
  if (!player) return go('home');
  const subjects = [...new Set(regionsFor(player.grade).filter((r) => r.status === 'open').map((r) => r.subject))];

  root.append(
    playerBar(player, { go, back: () => go('world') }),
    h('div', { class: 'wrongbook' },
      h('h2', { class: 'scene-title' }, '📒 錯題本'),
      h('p', { class: 'muted' }, `答錯的題目會收在這裡。同一題連續答對 ${WRONG_GRADUATE_STREAK} 次就畢業囉！`),
      subjects.map((s) => {
        const list = wrongFor(player, s).filter((w) => w.q.grade === player.grade);
        return h('div', { class: 'wb-subject' },
          h('div', { class: 'wb-head' },
            h('b', {}, `${SUBJECT_NAME[s]}（${list.length} 題）`),
            list.length ? h('button', { class: 'btn primary', onclick: () => go('battle', { mode: 'wrongbook', subject: s }) }, '開始特訓') : h('span', { class: 'muted' }, '目前沒有錯題 🎉')),
          list.length ? h('details', {}, h('summary', {}, '看題目'),
            list.slice().sort((a, b) => String(a.q.section).localeCompare(String(b.q.section), 'zh-Hant', { numeric: true })).map((w) => h('div', { class: 'wrong-item' },
              h('div', { class: 'wrong-tag' }, sectionLabel(w.q)),
              h('div', { class: 'wrong-q' }, w.q.prompt),
              renderVisual(w.q.visual, 'small'),
              h('div', { class: 'wrong-a' }, '答案：', formatAnswer(w.q), w.streak ? `　（已連對 ${w.streak} 次）` : '')))) : null,
        );
      }),
    ),
  );
}
