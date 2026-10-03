// Historial de movimientos
import * as S from '../store.js';
import { formatRelativeDay, formatTime } from '../dates.js';
import { h, avatar, signed, toast, vibrate, sheet, confirmDialog, emptyState, pageHeader } from '../ui.js';
import { refresh } from '../router.js';

const f = { child: 'all', type: 'all', limit: 100 };
const TYPES = [['all', 'Todo'], ['task', 'Tareas'], ['manual', 'Manuales'], ['redeem', 'Canjes'], ['pending', 'Pendientes'], ['rejected', 'Rechazadas']];
const STATUS = { pending: 'Pendiente de aprobar', approved: 'Aprobada', rejected: 'Rechazada', done: '' };
const TYPE_LABEL = { task: 'Tarea', manual: 'Puntos manuales', redeem: 'Canje', reset: 'Reinicio' };

function grantedLabel(e) {
  const k = e.grantedBy && S.getChild(e.grantedBy);
  return k ? `otorgado por 👑 ${k.name}` : '';
}

function matches(e) {
  if (f.child !== 'all' && e.childId !== f.child) return false;
  if (f.type === 'all') return true;
  if (f.type === 'pending') return e.status === 'pending';
  if (f.type === 'rejected') return e.status === 'rejected';
  return e.type === f.type;
}

function openEntry(e) {
  const child = S.getChild(e.childId);
  const body = h('div', { class: 'form' },
    h('div', { class: 'detail' }, h('div', { class: 'task-emoji big' }, e.emoji), h('h3', null, e.title),
      h('p', { class: 'muted' }, `${TYPE_LABEL[e.type] || ''}${STATUS[e.status] ? ' · ' + STATUS[e.status] : ''}`),
      h('p', { class: 'muted' }, `${child ? child.name : '—'} · ${formatRelativeDay(e.date)} ${formatTime(e.ts)}`),
      grantedLabel(e) ? h('p', { class: 'muted' }, grantedLabel(e)) : null,
      h('p', { class: 'pts big' + (e.points < 0 ? ' neg' : '') }, signed(e.points) + ' puntos')),
    (e.status === 'approved' || e.status === 'rejected')
      ? h('button', { class: 'btn block', type: 'button', onclick: () => { S.setEntryStatus(e.id, 'pending'); sh.close(); toast('Vuelve a estar pendiente de aprobar'); } }, '↩︎ Volver a pendiente')
      : null,
    h('button', { class: 'btn danger-soft block', type: 'button', onclick: async () => {
      const ok = await confirmDialog({ title: '¿Deshacer este movimiento?', message: 'Se borrará del historial y el saldo se recalculará.', confirmText: 'Deshacer y borrar', danger: true });
      if (ok) { S.removeEntry(e.id); vibrate(15); sh.close(); toast('Movimiento borrado'); }
    } }, '🗑 Deshacer / borrar'));
  const sh = sheet({ title: 'Movimiento', content: body });
}

export function render(root) {
  const kids = S.getState().children;
  root.append(pageHeader('Historial'));
  if (!S.getState().ledger.length) { root.append(emptyState('🕘', 'Sin movimientos', 'Aquí aparecerán las tareas, puntos y canjes.')); return; }
  root.append(h('div', { class: 'chips scroll' },
    [{ id: 'all', avatar: '👨‍👩‍👧', name: 'Todos' }, ...kids].map((c) => h('button', {
      class: 'chip' + (f.child === c.id ? ' on' : ''), onclick: () => { f.child = c.id; f.limit = 100; refresh(); },
    }, `${c.avatar} ${c.name}`))));
  root.append(h('div', { class: 'chips scroll' }, TYPES.map(([v, l]) => h('button', {
    class: 'chip' + (f.type === v ? ' on' : ''), onclick: () => { f.type = v; f.limit = 100; refresh(); },
  }, l))));
  if (f.child !== 'all' && !kids.some((k) => k.id === f.child)) f.child = 'all';

  const all = S.getState().ledger.filter(matches).sort((a, b) => b.ts - a.ts);
  if (!all.length) { root.append(h('p', { class: 'muted pad center' }, 'No hay movimientos con estos filtros.')); return; }
  const list = all.slice(0, f.limit);
  let lastDay = null, card = null;
  list.forEach((e) => {
    if (e.date !== lastDay) {
      lastDay = e.date;
      root.append(h('h3', { class: 'section-title' }, formatRelativeDay(e.date)));
      card = h('section', { class: 'card' });
      root.append(card);
    }
    const child = S.getChild(e.childId);
    const dead = !S.counts(e);
    card.append(h('button', { class: 'hist-row' + (dead ? ' dead' : ''), type: 'button', onclick: () => openEntry(e) },
      child ? avatar(child, 34) : null,
      h('span', { class: 'task-emoji' }, e.emoji),
      h('span', { class: 'grow left' }, h('strong', null, e.title),
        h('small', null, [child ? child.name : '—', formatTime(e.ts), TYPE_LABEL[e.type], STATUS[e.status], grantedLabel(e)].filter(Boolean).join(' · '))),
      h('span', { class: 'pts' + (e.points < 0 ? ' neg' : '') }, signed(e.points))));
  });
  if (all.length > list.length) {
    root.append(h('button', { class: 'btn block', type: 'button', onclick: () => { f.limit += 100; refresh(); } }, `Mostrar más (${all.length - list.length})`));
  }
}
