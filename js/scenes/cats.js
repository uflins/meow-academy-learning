// 我的貓咪：圖鑑（收集貓咪）、貓咪詳情（等級、進化、換裝、出戰設定）、換裝商店。
import { h, toast } from '../ui/dom.js';
import { CATS, GEAR, SUBJECT_CAT, catSVG, catName } from '../art/art.js';
import { regionsFor } from '../engine/curriculum.js';
import { levelOf, levelProgress, catOf } from '../engine/progress.js';
import {
  ensureRewards, catLook, isEvolved, EVOLVE_LEVEL, GEAR_PRICE, SPECIAL_CATS,
  buyGear, equip, setBattleCat, battleCatFor,
} from '../engine/rewards.js';
import { playerBar } from './world.js';
import { play } from '../engine/sfx.js';

const SLOT_NAME = { hat: '帽子', neck: '脖子', eyes: '眼睛' };

export default function cats(root, params, { go, app }) {
  const player = app.player;
  if (!player) return go('home');
  ensureRewards(player);
  let tab = params.tab || 'book';
  let selected = params.cat || null;

  const regions = regionsFor(player.grade).filter((r) => r.status === 'open');
  // 圖鑑：這個年級各區的夥伴貓 + 特別貓
  const partnerIds = [...new Set(regionsFor(player.grade).map((r) => SUBJECT_CAT[r.subject]))];
  const bookIds = [...partnerIds, ...Object.keys(SPECIAL_CATS)];

  const body = h('div', { class: 'cats-body' });
  const tabs = h('div', { class: 'tabs' });
  const bar = h('div');

  function hintFor(id) {
    if (SPECIAL_CATS[id]) return SPECIAL_CATS[id].hint;
    const r = regionsFor(player.grade).find((x) => SUBJECT_CAT[x.subject] === id);
    return r ? `在「${r.name}」戰鬥一次就會加入` : '';
  }

  function render() {
    bar.replaceChildren(playerBar(player, { go, back: () => go('world') }));
    tabs.replaceChildren(...[['book', '🐱 貓咪圖鑑'], ['shop', '🛍️ 換裝商店']].map(([id, label]) =>
      h('button', { class: `tab ${tab === id ? 'on' : ''}`, onclick: () => { tab = id; selected = null; render(); } }, label)));
    body.replaceChildren(...(tab === 'shop' ? shop() : selected ? detail(selected) : book()));
  }

  function book() {
    const owned = bookIds.filter((id) => player.collection[id]).length;
    return [
      h('p', { class: 'muted' }, `已收集 ${owned} / ${bookIds.length} 隻。點一隻貓咪可以換裝、設定出戰。`),
      h('div', { class: 'cat-grid' }, bookIds.map((id) => {
        const have = !!player.collection[id];
        const look = have ? catLook(player, id) : {};
        return h('button', {
          class: `cat-card btn ${have ? '' : 'locked'}`,
          onclick: () => { if (!have) { toast(hintFor(id)); return; } play('tap'); selected = id; render(); },
        },
        h('div', { class: 'cat-pic', html: catSVG(id, Object.assign({ mood: have ? 'normal' : 'sleep' }, look)) }),
        h('div', { class: 'cat-name' }, have ? catName(id, look.evolved) : '？？？'),
        h('div', { class: 'cat-sub' }, have ? `Lv.${levelOf(catOf(player, id).xp)}` : hintFor(id)));
      })),
    ];
  }

  function detail(id) {
    const look = catLook(player, id);
    const xp = catOf(player, id).xp;
    const lv = levelOf(xp);
    const gear = look.gear;
    const slots = ['hat', 'neck', 'eyes'];
    return [
      h('div', { class: 'cat-detail' },
        h('div', { class: 'cat-detail-pic', html: catSVG(id, Object.assign({ mood: 'happy' }, look)) }),
        h('div', { class: 'cat-detail-info' },
          h('h2', {}, catName(id, look.evolved)),
          h('div', { class: 'muted' }, CATS[id].desc),
          h('div', { class: 'lv-row' }, h('b', {}, `Lv.${lv}`),
            h('div', { class: 'xpbar' }, h('div', { class: 'xpfill', style: { width: `${Math.round(levelProgress(xp) * 100)}%` } })),
            h('span', { class: 'muted' }, `${xp % 100} / 100`)),
          h('div', { class: 'muted' }, isEvolved(player, id) ? '✨ 已經進化了！' : `再升到 Lv.${EVOLVE_LEVEL} 就會進化喔！`),
          h('h3', {}, '換裝'),
          player.gearOwned.length
            ? h('div', { class: 'gear-row' }, player.gearOwned.map((gid) => h('button', {
                class: `btn small gear ${gear[GEAR[gid].slot] === gid ? 'primary' : ''}`,
                onclick: () => { play('tap'); equip(player, id, gid); render(); },
              }, `${GEAR[gid].icon} ${GEAR[gid].name}`)))
            : h('p', { class: 'muted' }, '還沒有配件，可以到「換裝商店」用小魚乾買。'),
          h('div', { class: 'muted' }, slots.map((s) => `${SLOT_NAME[s]}：${gear[s] ? GEAR[gear[s]].name : '—'}`).join('　')),
          h('h3', {}, '出戰設定'),
          h('div', { class: 'gear-row' }, regions.map((r) => {
            const on = battleCatFor(player, r.subject) === id;
            const partner = SUBJECT_CAT[r.subject] === id;
            return h('button', {
              class: `btn small ${on ? 'primary' : ''}`,
              onclick: () => { setBattleCat(player, r.subject, id); toast(`${catName(id, look.evolved)}會在${r.name}出戰`); render(); },
            }, `${r.icon} ${r.name}${partner ? '（夥伴加成）' : ''}`);
          })),
        ),
      ),
      h('div', { class: 'panel-actions' }, h('button', { class: 'btn', onclick: () => { selected = null; render(); } }, '◀ 回圖鑑')),
    ];
  }

  function shop() {
    return [
      h('p', { class: 'muted' }, `你有 🐟 ${player.fish} 條小魚乾。買了以後，到圖鑑點貓咪就能換上。`),
      h('div', { class: 'shop-grid' }, Object.entries(GEAR).map(([gid, g]) => {
        const owned = player.gearOwned.includes(gid);
        const price = GEAR_PRICE[gid];
        return h('div', { class: 'shop-item' },
          h('div', { class: 'shop-pic', html: catSVG('abacus', { gear: { [g.slot]: gid } }) }),
          h('div', { class: 'shop-name' }, `${g.icon} ${g.name}`),
          h('button', {
            class: `btn small ${owned ? '' : 'primary'}`, disabled: owned || player.fish < price,
            onclick: () => {
              if (buyGear(player, gid)) { play('levelup'); toast(`買到了 ${g.name}！`); render(); }
            },
          }, owned ? '已擁有' : `🐟 ${price}`));
      })),
    ];
  }

  root.append(bar, h('div', { class: 'cats' }, h('h2', { class: 'scene-title' }, '🐱 我的貓咪'), tabs, body));
  render();
}
