// 世界地圖：依年級顯示區域。
import { h, toast } from '../ui/dom.js';
import { regionsFor } from '../engine/curriculum.js';
import { catSVG, SUBJECT_CAT, CATS } from '../art/art.js';
import { levelOf, catOf } from '../engine/progress.js';
import { play } from '../engine/sfx.js';

export function playerBar(player, { go, back }) {
  return h('div', { class: 'topbar' },
    back ? h('button', { class: 'btn icon', 'aria-label': '返回', onclick: back }, '◀') : null,
    h('div', { class: 'who' }, h('span', { class: 'who-avatar' }, player.avatar), h('span', { class: 'who-name' }, player.name)),
    h('div', { class: 'spacer' }),
    h('div', { class: 'chip' }, '🐟 ', String(player.fish)),
    h('div', { class: 'chip' }, '⭐ ', String(Object.values(player.progress).reduce((s, p) => s + (p.stars || 0), 0))),
  );
}

export default function world(root, params, { go, app }) {
  const player = app.player;
  if (!player) return go('home');
  const regions = regionsFor(player.grade);
  const wrongCount = player.wrongBook.filter((w) => w.q.grade === player.grade).length;

  root.append(
    playerBar(player, { go, back: () => go('home') }),
    h('div', { class: 'world' },
      h('h2', { class: 'scene-title' }, '世界地圖'),
      h('div', { class: 'region-grid' }, regions.map((r) => {
        const catId = SUBJECT_CAT[r.subject];
        const cat = catOf(player, catId);
        const open = r.status === 'open';
        return h('button', {
          class: `region-card btn ${open ? '' : 'locked'}`,
          style: { '--region': r.color },
          onclick: () => {
            if (!open) { play('wrong'); toast('這個區域還在建造中，敬請期待！'); return; }
            play('tap');
            go('region', { regionId: r.id });
          },
        },
        h('div', { class: 'region-icon' }, r.icon),
        h('div', { class: 'region-name' }, r.name),
        h('div', { class: 'region-cat', html: catSVG(catId, { mood: open ? 'normal' : 'sleep' }) }),
        h('div', { class: 'region-meta' }, open ? `${CATS[catId].name} Lv.${levelOf(cat.xp)}` : '🚧 建造中'));
      })),
      h('div', { class: 'world-actions' },
        h('button', { class: 'btn', onclick: () => go('wrongbook') }, `📒 錯題本（${wrongCount}）`),
      ),
    ),
  );
}
