// Bandeja de aprobaciones
import * as S from '../store.js';
import { formatRelativeDay, formatTime } from '../dates.js';
import { h, avatar, signed, vibrate, confetti, toast, emptyState, pageHeader, royal } from '../ui.js';
import { back } from '../router.js';

export function render(root) {
  const list = S.pendingEntries();
  root.append(pageHeader('Aprobaciones', null, h('button', { class: 'btn-text', type: 'button', onclick: () => back('/hoy') }, '‹ Hoy')));
  if (!list.length) { root.append(emptyState('✅', 'Todo al día', 'No hay tareas pendientes de aprobar.')); return; }
  const king = S.currentKingId() && S.getChild(S.currentKingId());
  if (king) root.append(h('p', { class: 'decides' }, `👑 Decide ${royal(king).the} ${king.name}`));
  const card = h('section', { class: 'card' });
  list.forEach((e) => {
    const child = S.getChild(e.childId);
    if (!child) return;
    card.append(h('div', { class: 'approval' },
      h('div', { class: 'row-top' }, avatar(child, 40),
        h('div', { class: 'grow' },
          h('strong', null, `${e.emoji} ${e.title}`),
          h('small', null, `${child.name} · ${formatRelativeDay(e.date)} ${formatTime(e.ts)}`)),
        h('span', { class: 'pts' + (e.points < 0 ? ' neg' : '') }, signed(e.points))),
      h('div', { class: 'row-actions' },
        h('button', { class: 'btn danger-soft', type: 'button', onclick: () => { S.rejectEntry(e.id); vibrate(20); toast('Rechazada', { label: 'Deshacer', fn: () => S.setEntryStatus(e.id, 'pending') }); } }, 'Rechazar'),
        h('button', { class: 'btn primary', type: 'button', onclick: () => { S.approveEntry(e.id); vibrate([15, 40, 15]); if (e.points > 0) confetti(60); toast(`${signed(e.points)} puntos para ${child.name}`, { label: 'Deshacer', fn: () => S.setEntryStatus(e.id, 'pending') }); } }, 'Aprobar'))));
  });
  root.append(card);
}
