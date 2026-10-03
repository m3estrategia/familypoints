// Recompensas: catálogo, canje y progreso
import * as S from '../store.js';
import { formatRelativeDay, formatTime } from '../dates.js';
import { h, avatar, vibrate, confetti, toast, confirmDialog, emptyState, pageHeader } from '../ui.js';
import { go, refresh } from '../router.js';

let selected = null;

async function doRedeem(reward, child) {
  const ok = await confirmDialog({
    title: `¿Canjear "${reward.title}"?`,
    message: `${child.name} gastará ${reward.cost} puntos y le quedarán ${S.balance(child.id) - reward.cost}.`,
    confirmText: 'Canjear',
  });
  if (!ok) return;
  const r = S.redeem(reward.id, child.id);
  if (!r.ok) { toast(`Faltan ${r.missing} puntos`); return; }
  vibrate([30, 50, 30, 50, 60]);
  confetti(140);
  toast(`🎉 ${child.name} ha canjeado ${reward.emoji} ${reward.title}`);
}

export function render(root) {
  const kids = S.activeChildren();
  root.append(pageHeader('Recompensas', null,
    h('button', { class: 'btn small', type: 'button', onclick: () => go('/ajustes/premios') }, 'Gestionar')));
  if (!kids.length) { root.append(emptyState('🧒', 'Aún no hay miembros', 'Añade a la familia en Ajustes para poder canjear premios.')); return; }
  if (!kids.some((k) => k.id === selected)) selected = kids[0].id;
  const child = S.getChild(selected);
  const bal = S.balance(child.id);

  if (kids.length > 1) {
    root.append(h('div', { class: 'chips scroll' }, kids.map((c) => h('button', {
      class: 'chip big' + (c.id === selected ? ' on' : ''), style: c.id === selected ? { background: c.color, borderColor: c.color, color: '#fff' } : null,
      onclick: () => { selected = c.id; refresh(); },
    }, `${c.avatar} ${c.name}`))));
  }
  root.append(h('section', { class: 'summary balance-card', style: { '--c': child.color } },
    avatar(child, 52), h('div', { class: 'grow' }, h('strong', null, child.name), h('small', null, `${S.totalEarned(child.id)} puntos ganados en total`)),
    h('div', { class: 'sum-item' }, h('span', { class: 'sum-num' }, '⭐ ' + bal), h('span', { class: 'sum-lbl' }, 'saldo'))));

  const rewards = S.getState().rewards.filter((r) => S.rewardAppliesTo(r, child.id)).sort((a, b) => a.cost - b.cost);
  if (!rewards.length) {
    root.append(emptyState('🎁', 'No hay premios', 'Crea premios en Ajustes → Premios.',
      h('button', { class: 'btn primary', type: 'button', onclick: () => go('/ajustes/premios') }, 'Crear premios')));
  } else {
    const card = h('section', { class: 'card' });
    rewards.forEach((r) => {
      const can = bal >= r.cost;
      const pct = Math.max(0, Math.min(100, Math.round((bal / r.cost) * 100)));
      card.append(h('div', { class: 'reward' },
        h('div', { class: 'row-top' },
          h('span', { class: 'task-emoji big' }, r.emoji),
          h('div', { class: 'grow' }, h('strong', null, r.title), h('small', null, `${r.cost} puntos`)),
          h('button', { class: 'btn small ' + (can ? 'primary' : 'disabled-look'), type: 'button', onclick: () => (can ? doRedeem(r, child) : toast(`Faltan ${r.cost - bal} puntos para "${r.title}"`)) }, 'Canjear')),
        h('div', { class: 'progress', role: 'progressbar', 'aria-valuenow': pct, 'aria-valuemin': 0, 'aria-valuemax': 100 }, h('i', { style: { width: pct + '%', background: child.color } })),
        h('small', { class: 'muted' }, can ? '¡Ya se puede canjear!' : `Faltan ${r.cost - bal} puntos (${pct}%)`)));
    });
    root.append(card);
  }

  const redeems = S.getState().ledger.filter((e) => e.type === 'redeem' && e.childId === child.id).sort((a, b) => b.ts - a.ts).slice(0, 15);
  root.append(h('h3', { class: 'section-title' }, 'Canjes de ' + child.name));
  if (!redeems.length) root.append(h('p', { class: 'muted pad' }, 'Todavía no hay canjes.'));
  else {
    const card = h('section', { class: 'card' });
    redeems.forEach((e) => card.append(h('div', { class: 'hist-row' },
      h('span', { class: 'task-emoji' }, e.emoji),
      h('div', { class: 'grow' }, h('strong', null, e.title), h('small', null, `${formatRelativeDay(e.date)} · ${formatTime(e.ts)}`)),
      h('span', { class: 'pts neg' }, String(e.points)))));
    root.append(card);
  }
}
