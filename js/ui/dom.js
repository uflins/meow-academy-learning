// 小型 DOM 工具：h() 建立元素、modal() 對話框、toast() 提示。

export function h(tag, props = {}, ...children) {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(props || {})) {
    if (v == null || v === false) continue;
    if (k === 'class') el.className = v;
    else if (k === 'style' && typeof v === 'object') {
      // CSS 自訂屬性（--xxx）要用 setProperty 才設得進去
      for (const [prop, val] of Object.entries(v)) {
        if (prop.startsWith('--')) el.style.setProperty(prop, val);
        else el.style[prop] = val;
      }
    }
    else if (k === 'html') el.innerHTML = v;
    else if (k.startsWith('on') && typeof v === 'function') el.addEventListener(k.slice(2).toLowerCase(), v);
    else if (k === 'dataset') Object.assign(el.dataset, v);
    else el.setAttribute(k, v === true ? '' : v);
  }
  append(el, children);
  return el;
}

function append(el, children) {
  for (const c of children.flat(Infinity)) {
    if (c == null || c === false) continue;
    el.append(c instanceof Node ? c : document.createTextNode(String(c)));
  }
}

export function clear(el) {
  while (el.firstChild) el.removeChild(el.firstChild);
  return el;
}

export function fromHTML(markup) {
  const t = document.createElement('template');
  t.innerHTML = markup.trim();
  return t.content.firstElementChild;
}

export function wait(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

// 對話框：actions = [{ label, value, kind }]，回傳被按下的 value
export function modal({ title, body, actions = [{ label: '好', value: true, kind: 'primary' }], dismissible = true }) {
  return new Promise((resolve) => {
    const close = (v) => { overlay.remove(); resolve(v); };
    const overlay = h('div', { class: 'modal-overlay', onclick: (e) => { if (dismissible && e.target === overlay) close(null); } },
      h('div', { class: 'modal' },
        title ? h('h2', { class: 'modal-title' }, title) : null,
        body ? h('div', { class: 'modal-body' }, body) : null,
        h('div', { class: 'modal-actions' },
          actions.map((a) => h('button', { class: `btn ${a.kind || ''}`, onclick: () => close(a.value) }, a.label)),
        ),
      ),
    );
    document.body.append(overlay);
  });
}

export function toast(message, ms = 2200) {
  const el = h('div', { class: 'toast' }, message);
  document.body.append(el);
  requestAnimationFrame(() => el.classList.add('show'));
  setTimeout(() => { el.classList.remove('show'); setTimeout(() => el.remove(), 300); }, ms);
}
