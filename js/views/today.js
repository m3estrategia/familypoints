// Pantalla Hoy
import * as S from '../store.js';
import { todayKey, formatLong, weekStart, addDays } from '../dates.js';
import { h, avatar, signed, plural, vibrate, confetti, toast, emptyState, pageHeader, royal } from '../ui.js';
import { manualForm, childForm } from './forms.js';
import { go } from '../router.js';
import { leagueCard } from './crown.js';

function chips(children, selected, onPick) {
  const row = h('div', { class: 'chips scroll', role: 'tablist' });
  const mk = (id, label, color) => h('button', {
    class: 'chip big' + (selected === id ? ' on' : ''), role: 'tab', 'aria-selected': String(selected === id),
    style: selected === id && color ? { background: color, borderColor: color, color: '#fff' } : null,
    onclick: () => onPick(id),
  }, label);
  if (children.length > 1) row.append(mk('all', '👨‍👩‍👧 Todos'));
  children.forEach((c) => row.append(mk(c.id, `${c.avatar} ${c.name}`, c.color)));
  return row;
}

function complete(task, child) {
  const e = S.completeTask(task.id, child.id);
  if (!e) { toast(`👑 ${child.name} es ${royal(child).the}: no puede ganar puntos esta semana`); return; }
  vibrate(e.status === 'pending' ? 20 : [15, 40, 15]);
  if (e.status === 'pending') toast(`⏳ "${task.title}" pendiente de aprobar`, { label: 'Deshacer', fn: () => S.removeEntry(e.id) });
  else {
    if (task.points > 0) confetti(50);
    toast(`${signed(task.points)} puntos para ${child.name}`, { label: 'Deshacer', fn: () => S.removeEntry(e.id) });
  }
}

function taskRow(item, child, showChildTag) {
  const { task, entry, count, last } = item;
  const rep = S.repeatable(task);
  const done = !!entry && S.counts(entry);
  const pending = !!entry && entry.status === 'pending';
  const neg = task.points < 0;
  const onTap = () => {
    if (rep) return complete(task, child);
    if (entry) { S.removeEntry(entry.id); vibrate(10); toast('Deshecho'); return; }
    complete(task, child);
  };
  const row = h('div', { class: 'task-row' + (done ? ' done' : '') + (pending ? ' pending' : '') },
    h('button', { class: 'task-main', type: 'button', onclick: onTap, 'aria-label': `${task.title}: ${done ? 'hecha, tocar para deshacer' : pending ? 'pendiente de aprobar, tocar para deshacer' : 'marcar como hecha'}` },
      h('span', { class: 'check' + (neg ? ' neg' : ''), style: child ? { '--c': child.color } : null }, done ? '✓' : pending ? '⏳' : rep ? '＋' : ''),
      h('span', { class: 'task-emoji' }, task.emoji),
      h('span', { class: 'task-text' },
        h('span', { class: 'task-title' }, task.title),
        h('span', { class: 'task-meta' },
          [task.isHabit ? '🔥 Hábito' : null, task.requiresApproval ? '✋ Aprobación' : null, pending ? 'Pendiente de aprobar' : null,
            rep && count ? `×${count} hoy` : null, task.freq === 'weekly' ? 'Semanal' : null, task.freq === 'once' ? 'Puntual' : null,
            showChildTag ? child.name : null].filter(Boolean).join(' · '))),
      h('span', { class: 'pts' + (neg ? ' neg' : '') }, signed(task.points))),
    rep && last ? h('button', { class: 'mini-btn', type: 'button', 'aria-label': 'Deshacer la última', onclick: () => { S.removeEntry(last.id); toast('Deshecho'); } }, '↩︎') : null);
  return row;
}

export function render(root) {
  const st = S.getState();
  const kids = S.activeChildren();
  const today = todayKey();
  const ws = weekStart(today, st.settings.weekStart);
  let sel = st.settings.lastChild;
  if (sel !== 'all' && !kids.some((k) => k.id === sel)) sel = 'all';
  if (kids.length === 1) sel = kids[0].id;
  const shown = sel === 'all' ? kids : kids.filter((k) => k.id === sel);

  const pending = S.pendingEntries().length;
  root.append(pageHeader('Hoy', formatLong(today)[0].toUpperCase() + formatLong(today).slice(1),
    h('button', { class: 'btn small primary', type: 'button', onclick: () => manualForm(sel) }, '± Puntos')));

  if (!kids.length) {
    root.append(emptyState('👨‍👩‍👧', 'Aún no hay miembros', 'Añade a toda la familia, papá y mamá incluidos, para empezar a sumar puntos.',
      h('button', { class: 'btn primary', type: 'button', onclick: () => childForm(null) }, 'Añadir miembro')));
    return;
  }

  const scopeId = sel === 'all' ? null : sel;
  const todayPts = S.pointsInRange(scopeId, today, today);
  const weekPts = S.pointsInRange(scopeId, ws, addDays(ws, 6));
  const crowns = scopeId ? S.crownCount(scopeId) : 0;
  const streak = scopeId ? S.childStreak(scopeId) : null;
  root.append(h('section', { class: 'summary' },
    h('div', { class: 'sum-item' }, h('span', { class: 'sum-num' }, signed(todayPts)), h('span', { class: 'sum-lbl' }, 'puntos hoy')),
    h('div', { class: 'sum-item' }, h('span', { class: 'sum-num' }, signed(weekPts)), h('span', { class: 'sum-lbl' }, 'esta semana')),
    scopeId && crowns ? h('div', { class: 'sum-item' }, h('span', { class: 'sum-num' }, '👑 ×' + crowns), h('span', { class: 'sum-lbl' }, plural(crowns, 'corona', 'coronas'))) : null,
    scopeId && streak ? h('div', { class: 'sum-item' }, h('span', { class: 'sum-num' }, '🔥 ' + streak), h('span', { class: 'sum-lbl' }, plural(streak, 'día de racha', 'días de racha'))) : null));

  if (kids.length > 1 || S.currentKingId()) root.append(leagueCard());

  if (pending) {
    const kingNow = S.currentKingId() && S.getChild(S.currentKingId());
    root.append(h('button', { class: 'banner', type: 'button', onclick: () => go('/aprobaciones') },
      h('span', null, `✋ ${pending} ${plural(pending, 'tarea pendiente', 'tareas pendientes')} de aprobar${kingNow ? ` · 👑 Decide ${royal(kingNow).the} ${kingNow.name}` : ''}`), h('span', null, 'Revisar ›')));
  }

  if (kids.length > 1) root.append(chips(kids, sel, (id) => S.setSetting('lastChild', id)));

  if (!st.tasks.length) {
    root.append(emptyState('📝', 'No hay tareas', 'Crea tareas y hábitos en Ajustes → Tareas.',
      h('button', { class: 'btn primary', type: 'button', onclick: () => go('/ajustes/tareas') }, 'Ir a tareas')));
    return;
  }

  for (const child of shown) {
    if (child.id === S.currentKingId()) {
      root.append(h('section', { class: 'card king-card' }, avatar(child, 44),
        h('div', { class: 'grow' }, h('strong', null, `👑 ${child.name} es ${royal(child).the} esta semana: reparte los puntos`),
          h('small', { class: 'muted' }, `${royal(child).the[0].toUpperCase() + royal(child).the.slice(1)} no compite ni gana puntos durante su semana.`))));
      continue;
    }
    const items = S.tasksForDay(child.id, today);
    const pendingItems = items.filter((i) => !i.entry);
    const doneItems = items.filter((i) => i.entry);
    const card = h('section', { class: 'card child-card' });
    if (sel === 'all') {
      card.append(h('div', { class: 'child-head' }, avatar(child, 36),
        h('div', { class: 'grow' }, h('strong', null, child.name), h('small', null, `${doneItems.length}/${items.length} hechas`)),
        h('span', { class: 'balance', style: { color: child.color } }, signed(S.pointsInRange(child.id, ws, addDays(ws, 6))) + ' pts', S.crownCount(child.id) ? ` · 👑×${S.crownCount(child.id)}` : '')));
    }
    if (!items.length) card.append(h('p', { class: 'muted pad' }, 'No hay tareas para hoy 🎉'));
    else {
      if (!pendingItems.length) card.append(h('p', { class: 'muted pad center' }, '🎉 ¡Todo hecho por hoy!'));
      pendingItems.forEach((i) => card.append(taskRow(i, child, false)));
      if (doneItems.length) {
        card.append(h('div', { class: 'list-sep' }, 'Hechas'));
        doneItems.forEach((i) => card.append(taskRow(i, child, false)));
      }
    }
    root.append(card);
  }
}
