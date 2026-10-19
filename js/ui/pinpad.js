// PIN 輸入：數字（孩子 4 位、家長 6 位）或圖片密碼（一年級，依序點 3 張圖）。
import { h, wait } from './dom.js';
import { PICTURE_KEYS } from '../art/art.js';
import { play } from '../engine/sfx.js';

// 回傳輸入的字串；按取消回傳 null。
// check(value) 可選：回傳 true 表示正確；錯誤時清空重來，不關閉。
export function askPin({ title, subtitle = '', kind = 'digits', length = 4, check = null }) {
  return new Promise((resolve) => {
    let value = [];
    const dots = h('div', { class: 'pin-dots' });
    const msg = h('div', { class: 'pin-msg' }, subtitle);
    const keys = kind === 'pictures' ? PICTURE_KEYS : ['1', '2', '3', '4', '5', '6', '7', '8', '9', '', '0', '⌫'];

    const renderDots = () => {
      dots.replaceChildren(...Array.from({ length }, (_, i) =>
        h('span', { class: `pin-dot ${i < value.length ? 'on' : ''}` },
          kind === 'pictures' && i < value.length ? value[i] : '')));
    };

    const submit = async () => {
      const v = value.join(kind === 'pictures' ? ',' : '');
      if (check) {
        const ok = await check(v);
        if (!ok) {
          play('wrong');
          card.classList.add('shake');
          msg.textContent = '不對喔，再試一次';
          await wait(450);
          card.classList.remove('shake');
          value = [];
          renderDots();
          return;
        }
      }
      overlay.remove();
      resolve(v);
    };

    const press = (k) => {
      if (!k) return;
      play('tap');
      if (k === '⌫') value.pop();
      else if (value.length < length) value.push(k);
      renderDots();
      if (value.length === length) setTimeout(submit, 150);
    };

    const pad = h('div', { class: `pin-pad ${kind}` },
      keys.map((k) => h('button', { class: `pin-key ${k ? '' : 'blank'}`, disabled: !k, onclick: () => press(k) }, k)));
    if (kind === 'pictures') pad.append(h('button', { class: 'pin-key', onclick: () => press('⌫') }, '⌫'));

    const card = h('div', { class: 'modal pin-card' },
      h('h2', { class: 'modal-title' }, title),
      msg, dots, pad,
      h('button', { class: 'btn ghost', onclick: () => { overlay.remove(); resolve(null); } }, '取消'),
    );
    const overlay = h('div', { class: 'modal-overlay' }, card);
    renderDots();
    document.body.append(overlay);
  });
}

// 設定新 PIN：輸入兩次一樣才成功
export async function createPin({ title, kind = 'digits', length = 4 }) {
  const first = await askPin({ title, subtitle: kind === 'pictures' ? `依序點 ${length} 張圖` : `輸入 ${length} 位數字`, kind, length });
  if (first == null) return null;
  const second = await askPin({ title, subtitle: '再輸入一次確認', kind, length, check: (v) => v === first });
  return second;
}
