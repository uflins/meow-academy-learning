// 世界地圖：依年級顯示區域。
import { h, toast } from '../ui/dom.js';
import { regionsFor } from '../engine/curriculum.js';
import { catSVG, SUBJECT_CAT, CATS } from '../art/art.js';
import { levelOf, catOf } from '../engine/progress.js';
import { battleCatFor, catLook, dailyTasks, claimDaily, FURNITURE } from '../engine/rewards.js';
import { catName } from '../art/art.js';
import { play } from '../engine/sfx.js';
import { speak } from '../engine/speech.js';
import { zy } from '../ui/zhuyin.js';

export function playerBar(player, { go, back }) {
  return h('div', { class: 'topbar' },
    back ? h('button', { class: 'btn icon', 'aria-label': '返回', onclick: back }, '◀') : null,
    h('div', { class: 'who' }, h('span', { class: 'who-avatar' }, player.avatar), h('span', { class: 'who-name' }, player.name)),
    h('div', { class: 'spacer' }),
    h('div', { class: 'chip' }, '🐟 ', String(player.fish)),
    h('div', { class: 'chip' }, '⭐ ', String(Object.values(player.progress).reduce((s, p) => s + (p.stars || 0), 0))),
  );
}

// 今天的任務
function dailyPanel(player, refresh) {
  const d = dailyTasks(player);
  const low = player.grade <= 2;
  return h('div', { class: 'daily' },
    h('div', { class: 'daily-title' }, '📅 ', low ? zy('今天的任務') : '今天的任務',
      low ? h('button', { class: 'mini-say', 'aria-label': '念給我聽', onclick: () => speak(`今天的任務：${d.tasks.map((t) => t.label).join('，')}`) }, '🔊') : null, d.bonus ? h('span', { class: 'muted' }, '　全部完成，明天再來！') : h('span', { class: 'muted' }, '　三個都完成送一件「軟綿綿小日子」家具')),
    h('div', { class: 'daily-list' }, d.tasks.map((t) => h('div', { class: `daily-task ${t.claimed ? 'claimed' : ''}` },
      h('div', { class: 'daily-label' }, t.label),
      h('div', { class: 'xpbar' }, h('div', { class: 'xpfill', style: { width: `${Math.round((t.n / t.goal) * 100)}%` } })),
      h('div', { class: 'daily-n' }, `${t.n}/${t.goal}`),
      t.claimed
        ? h('span', { class: 'daily-done' }, '✓ 已領')
        : h('button', {
            class: `btn small ${t.n >= t.goal ? 'primary' : ''}`, disabled: t.n < t.goal,
            onclick: () => {
              const got = claimDaily(player, t.id);
              if (!got) return;
              play('levelup');
              toast(got.furniture ? `+${got.fish} 🐟，還得到家具「${FURNITURE[got.furniture].name}」！` : `+${got.fish} 🐟`);
              refresh();
            },
          }, `領 🐟${t.fish}`)))));
}

export default function world(root, params, { go, app }) {
  const player = app.player;
  if (!player) return go('home');
  const regions = regionsFor(player.grade);
  const low = player.grade <= 2;
  const wrongCount = player.wrongBook.filter((w) => w.q.grade === player.grade).length;

  root.append(
    playerBar(player, { go, back: () => go('home') }),
    h('div', { class: 'world' },
      h('h2', { class: 'scene-title' }, '世界地圖'),
      h('div', { class: 'region-grid' }, regions.map((r) => {
        const catId = battleCatFor(player, r.subject);
        const cat = catOf(player, catId);
        const look = catLook(player, catId);
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
        h('div', { class: 'region-name' }, r.name, low ? h('span', { class: 'mini-say', role: 'button', 'aria-label': '念給我聽', onclick: (e) => { e.stopPropagation(); speak(r.name); } }, '🔊') : null),
        h('div', { class: 'region-cat', html: catSVG(catId, Object.assign({ mood: open ? 'normal' : 'sleep' }, open ? look : {})) }),
        h('div', { class: 'region-meta' }, open ? `${catName(catId, look.evolved)} Lv.${levelOf(cat.xp)}` : '🚧 建造中'));
      })),
      dailyPanel(player, () => go('world')),
      h('div', { class: 'world-actions' },
        h('button', { class: 'btn', onclick: () => go('cats') }, '🐱 ', low ? zy('我的貓咪') : '我的貓咪'),
        h('button', { class: 'btn', onclick: () => go('house') }, '🏠 ', low ? zy('我的喵屋') : '我的喵屋'),
        h('button', { class: 'btn', onclick: () => go('wrongbook') }, '📒 ', low ? zy('錯題本') : '錯題本', `（${wrongCount}）`),
      ),
    ),
  );
}
