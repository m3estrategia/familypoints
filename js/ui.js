// Utilidades de interfaz: constructor DOM seguro, hojas modales, diálogos, toasts, confeti, vibración.
// Todo el texto se inserta con textContent / nodos de texto (nunca innerHTML con datos del usuario).

import { currentKingId } from './store.js';

export function h(tag, attrs, ...children) {
  const el = document.createElement(tag);
  if (attrs) {
    for (const [k, v] of Object.entries(attrs)) {
      if (v == null || v === false) continue;
      if (k === 'class') el.className = v;
      else if (k === 'style' && typeof v === 'object') Object.assign(el.style, v);
      else if (k.startsWith('on') && typeof v === 'function') el.addEventListener(k.slice(2).toLowerCase(), v);
      else if (k === 'dataset') Object.assign(el.dataset, v);
      else if (k in el && k !== 'list') el[k] = v;
      else el.setAttribute(k, v === true ? '' : v);
    }
  }
  append(el, children);
  return el;
}
function append(el, children) {
  for (const c of children) {
    if (c == null || c === false) continue;
    if (Array.isArray(c)) append(el, c);
    else el.append(c instanceof Node ? c : document.createTextNode(String(c)));
  }
}
export const clear = (el) => { while (el.firstChild) el.removeChild(el.firstChild); };

export const signed = (n) => (n > 0 ? '+' + n : String(n));
export const plural = (n, one, many) => (Math.abs(n) === 1 ? one : many);

export function vibrate(p = 15) { try { if (navigator.vibrate) navigator.vibrate(p); } catch { /* sin soporte */ } }

/* ---------- Tema ---------- */
export function applyTheme(theme) {
  const root = document.documentElement;
  if (theme === 'light' || theme === 'dark') root.dataset.theme = theme; else delete root.dataset.theme;
}

/* ---------- Avatar ---------- */
// Si el miembro es el Rey de la semana actual, lleva una corona encima (crown = false para desactivarla).
export function avatar(child, size = 40, crown = true) {
  const isKing = crown && currentKingId() === child.id;
  return h('span', {
    class: 'avatar' + (isKing ? ' king' : ''),
    style: { width: size + 'px', height: size + 'px', fontSize: Math.round(size * 0.55) + 'px', background: child.color + '33', borderColor: child.color },
    'aria-hidden': 'true',
  }, child.avatar, isKing ? h('span', { class: 'crown', style: { fontSize: Math.max(12, Math.round(size * 0.4)) + 'px' } }, '👑') : null);
}

/* ---------- Hojas modales ---------- */
const overlays = () => document.getElementById('overlays');
let openSheets = 0;

export function sheet({ title, content, onClose, full = false }) {
  const backdrop = h('div', { class: 'backdrop' });
  const panel = h('div', { class: 'sheet' + (full ? ' sheet-full' : ''), role: 'dialog', 'aria-modal': 'true', 'aria-label': title });
  let closed = false;
  const close = () => {
    if (closed) return;
    closed = true;
    openSheets--;
    if (!openSheets) document.body.classList.remove('no-scroll');
    document.removeEventListener('keydown', onKey);
    backdrop.classList.add('out');
    panel.classList.add('out');
    setTimeout(() => { wrap.remove(); }, 260);
    if (onClose) onClose();
  };
  const onKey = (e) => { if (e.key === 'Escape') close(); };
  backdrop.addEventListener('click', close);
  panel.append(
    h('div', { class: 'sheet-grabber' }),
    h('div', { class: 'sheet-head' },
      h('h2', null, title),
      h('button', { class: 'btn-text', type: 'button', onclick: close }, 'Cerrar')),
    h('div', { class: 'sheet-body' }, content)
  );
  const wrap = h('div', { class: 'sheet-wrap' }, backdrop, panel);
  overlays().append(wrap);
  openSheets++;
  document.body.classList.add('no-scroll');
  document.addEventListener('keydown', onKey);
  return { close, el: panel };
}

/* ---------- Diálogos de confirmación ---------- */
export function confirmDialog({ title, message, confirmText = 'Aceptar', cancelText = 'Cancelar', danger = false, extra }) {
  return new Promise((resolve) => {
    const done = (v) => { wrap.remove(); resolve(v); };
    const wrap = h('div', { class: 'sheet-wrap alert-wrap' },
      h('div', { class: 'backdrop', onclick: () => done(false) }),
      h('div', { class: 'alert', role: 'alertdialog', 'aria-modal': 'true' },
        h('h3', null, title),
        message ? h('p', null, message) : null,
        extra || null,
        h('div', { class: 'alert-actions' },
          h('button', { class: 'btn-text', type: 'button', onclick: () => done(false) }, cancelText),
          h('button', { class: 'btn-text strong' + (danger ? ' danger' : ''), type: 'button', onclick: () => done(true) }, confirmText))));
    overlays().append(wrap);
  });
}

/* ---------- Toasts ---------- */
let toastTimer;
export function toast(message, action) {
  document.querySelectorAll('.toast').forEach((t) => t.remove());
  clearTimeout(toastTimer);
  const t = h('div', { class: 'toast', role: 'status' },
    h('span', null, message),
    action ? h('button', { class: 'btn-text', type: 'button', onclick: () => { t.remove(); action.fn(); } }, action.label) : null);
  overlays().append(t);
  toastTimer = setTimeout(() => { t.classList.add('out'); setTimeout(() => t.remove(), 250); }, action ? 5000 : 2400);
}

/* ---------- Confeti ---------- */
export function confetti(count = 90) {
  if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const canvas = h('canvas', { class: 'confetti' });
  const dpr = window.devicePixelRatio || 1;
  const W = window.innerWidth, H = window.innerHeight;
  canvas.width = W * dpr; canvas.height = H * dpr;
  document.body.append(canvas);
  const ctx = canvas.getContext('2d');
  ctx.scale(dpr, dpr);
  const colors = ['#ff4a80', '#ffa833', '#ffd60a', '#34c759', '#32ade6', '#7b5cff'];
  const parts = Array.from({ length: count }, () => ({
    x: W / 2 + (Math.random() - 0.5) * 80, y: H * 0.55,
    vx: (Math.random() - 0.5) * 12, vy: -Math.random() * 14 - 4,
    s: 5 + Math.random() * 6, r: Math.random() * 6, vr: (Math.random() - 0.5) * 0.4,
    c: colors[Math.floor(Math.random() * colors.length)],
  }));
  const start = performance.now();
  (function frame(now) {
    const t = now - start;
    ctx.clearRect(0, 0, W, H);
    for (const p of parts) {
      p.vy += 0.35; p.x += p.vx; p.y += p.vy; p.r += p.vr; p.vx *= 0.99;
      ctx.save();
      ctx.globalAlpha = Math.max(0, 1 - t / 1800);
      ctx.translate(p.x, p.y); ctx.rotate(p.r);
      ctx.fillStyle = p.c; ctx.fillRect(-p.s / 2, -p.s / 4, p.s, p.s / 2);
      ctx.restore();
    }
    if (t < 1800) requestAnimationFrame(frame); else canvas.remove();
  })(start);
}

/* ---------- Componentes de formulario ---------- */
export function field(label, input, hint) {
  return h('label', { class: 'field' }, h('span', { class: 'field-label' }, label), input, hint ? h('span', { class: 'hint' }, hint) : null);
}

// Selector de una opción (segmentado). options: [{value,label}]
export function segmented(options, value, onChange) {
  const wrap = h('div', { class: 'segmented', role: 'group' });
  const render = (val) => {
    clear(wrap);
    options.forEach((o) => wrap.append(h('button', {
      type: 'button', class: o.value === val ? 'on' : '', 'aria-pressed': String(o.value === val),
      onclick: () => { onChange(o.value); render(o.value); },
    }, o.label)));
  };
  render(value);
  return wrap;
}

// Selector de emoji: campo de texto + cuadrícula de sugerencias. Devuelve {el, get}
// suggestions: array plano de emojis, o array de grupos [{title, items}] (se muestra un título pequeño por grupo).
export function emojiPicker(value, suggestions) {
  const input = h('input', { type: 'text', class: 'emoji-input', value: value || '', maxLength: 16, 'aria-label': 'Emoji' });
  const btns = (list) => h('div', { class: 'emoji-grid' }, list.map((e) => h('button', {
    type: 'button', 'aria-label': e, onclick: () => { input.value = e; },
  }, e)));
  const grouped = suggestions.length && typeof suggestions[0] === 'object';
  const body = grouped
    ? suggestions.map((g) => h('div', { class: 'emoji-group' }, h('span', { class: 'emoji-group-title' }, g.title), btns(g.items)))
    : btns(suggestions);
  return { el: h('div', { class: 'field' }, h('span', { class: 'field-label' }, 'Emoji'), input, body), get: () => input.value.trim() };
}

export const EMOJIS_TASK = ['🛏️', '🪥', '🧸', '📚', '🍽️', '📖', '🧽', '🧹', '👕', '🐶', '🌱', '🗑️', '🎒', '🛁', '💊', '🎹', '⚽', '🧠', '✏️', '😠', '📵', '🤝', '⭐', '💪'];
export const EMOJIS_REWARD = ['📺', '🍕', '🛝', '🎬', '🍦', '🎁', '🎮', '🧁', '🚲', '🏊', '🛍️', '🌙', '🎨', '🍿', '🎢', '👑'];
export const EMOJI_AVATAR_GROUPS = [
  { title: 'Héroes', items: ['🦸‍♂️', '🦸‍♀️', '🦹‍♂️', '🦹‍♀️', '🕷️', '🦇', '⚡', '🛡️', '🔨', '🦾', '🥷', '🤖', '🚀', '🐺', '🦅', '🔥'] },
  { title: 'Princesas y fantasía', items: ['👸', '🤴', '🧜‍♀️', '🧜‍♂️', '🧚‍♀️', '🧚‍♂️', '🦄', '🏰', '👑', '💎', '🌹', '❄️', '🐉', '🧞', '🧙‍♀️', '🧙‍♂️'] },
  { title: 'Personajes', items: ['🧛', '🧟', '👽', '👻', '🤠', '🏴‍☠️', '🦁', '🐯', '🐼', '🦊', '🐸', '🐵', '🐶', '🐱', '🐧', '🐢'] },
  { title: 'Familia', items: ['👩', '👨', '👧', '👦', '👵', '👴', '🧔', '👱‍♀️'] },
];
export const EMOJIS_AVATAR = EMOJI_AVATAR_GROUPS.flatMap((g) => g.items);
export const COLORS = ['#ff4a80', '#ff9500', '#ffcc00', '#34c759', '#32ade6', '#5e5ce6', '#af52de', '#8e6e53'];

export function colorPicker(value, onChange) {
  const wrap = h('div', { class: 'color-row' });
  const render = (val) => {
    clear(wrap);
    COLORS.forEach((c) => wrap.append(h('button', {
      type: 'button', class: 'color-dot' + (c === val ? ' on' : ''), style: { background: c }, 'aria-label': 'Color ' + c,
      'aria-pressed': String(c === val), onclick: () => { onChange(c); render(c); },
    })));
  };
  render(value);
  return h('div', { class: 'field' }, h('span', { class: 'field-label' }, 'Color'), wrap);
}

// Chips de selección de miembros (multiselección). Devuelve {el, get}
export function childMultiSelect(children, selected, label = 'Asignar a', emptyText = 'Todos') {
  const sel = new Set(selected);
  const wrap = h('div', { class: 'chips wrap' });
  const render = () => {
    clear(wrap);
    wrap.append(h('button', { type: 'button', class: 'chip' + (!sel.size ? ' on' : ''), onclick: () => { sel.clear(); render(); } }, emptyText));
    children.forEach((c) => wrap.append(h('button', {
      type: 'button', class: 'chip' + (sel.has(c.id) ? ' on' : ''), style: sel.has(c.id) ? { background: c.color, borderColor: c.color, color: '#fff' } : null,
      onclick: () => { sel.has(c.id) ? sel.delete(c.id) : sel.add(c.id); if (sel.size === children.length) sel.clear(); render(); },
    }, c.avatar + ' ' + c.name)));
  };
  render();
  return { el: h('div', { class: 'field' }, h('span', { class: 'field-label' }, label), wrap), get: () => [...sel] };
}

export function emptyState(emoji, title, text, action) {
  return h('div', { class: 'empty' }, h('div', { class: 'empty-emoji' }, emoji), h('h3', null, title), text ? h('p', null, text) : null, action || null);
}

export function pageHeader(title, subtitle, right) {
  return h('header', { class: 'page-header' },
    h('div', null, h('h1', null, title), subtitle ? h('p', { class: 'subtitle' }, subtitle) : null),
    right || null);
}
