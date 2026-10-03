// Estadísticas y resumen semanal
import * as S from '../store.js';
import { todayKey, weekStart, weekDays, addDays, formatWeekRange, DAY_SHORT, dow } from '../dates.js';
import { h, avatar, signed, plural, emptyState, pageHeader } from '../ui.js';
import { refresh } from '../router.js';

let offset = 0;      // 0 = semana actual, -1 = anterior...
let selChild = 'all';

const NS = 'http://www.w3.org/2000/svg';
function svgEl(tag, attrs, text) {
  const el = document.createElementNS(NS, tag);
  for (const [k, v] of Object.entries(attrs || {})) el.setAttribute(k, v);
  if (text != null) el.textContent = text;
  return el;
}

function barChart(days, values, color) {
  const W = 340, H = 170, top = 22, bottom = 26, side = 8;
  const max = Math.max(1, ...values), min = Math.min(0, ...values);
  const range = max - min;
  const plotH = H - top - bottom;
  const y = (v) => top + ((max - v) / range) * plotH;
  const bw = (W - side * 2) / 7;
  const svg = svgEl('svg', { viewBox: `0 0 ${W} ${H}`, class: 'chart', role: 'img', 'aria-label': 'Puntos por día de la semana' });
  svg.append(svgEl('line', { x1: side, x2: W - side, y1: y(0), y2: y(0), class: 'axis' }));
  values.forEach((v, i) => {
    const x = side + i * bw + bw * 0.18, w = bw * 0.64;
    const y0 = y(0), y1 = y(v);
    const isToday = days[i] === todayKey();
    svg.append(svgEl('rect', {
      x, width: w, y: Math.min(y0, y1), height: Math.max(2, Math.abs(y1 - y0)), rx: 6,
      fill: v < 0 ? 'var(--red)' : color, opacity: v === 0 ? 0.25 : 1,
    }));
    svg.append(svgEl('text', { x: x + w / 2, y: (v < 0 ? y1 + 12 : Math.min(y0, y1) - 5), class: 'chart-val', 'text-anchor': 'middle' }, v !== 0 ? String(v) : ''));
    svg.append(svgEl('text', { x: x + w / 2, y: H - 8, class: 'chart-lbl' + (isToday ? ' today' : ''), 'text-anchor': 'middle' }, DAY_SHORT[dow(days[i])]));
  });
  return svg;
}

function delta(cur, prev) {
  const d = cur - prev;
  const cls = d > 0 ? 'up' : d < 0 ? 'down' : '';
  const txt = d === 0 ? 'Igual que la semana anterior' : `${d > 0 ? '▲' : '▼'} ${Math.abs(d)} ${plural(d, 'punto', 'puntos')} ${d > 0 ? 'más' : 'menos'} que la semana anterior`;
  return h('span', { class: 'delta ' + cls }, txt);
}

export function render(root) {
  const st = S.getState();
  const kids = S.activeChildren();
  root.append(pageHeader('Estadísticas'));
  if (!kids.length) { root.append(emptyState('📊', 'Sin datos', 'Añade miembros de la familia y completa tareas para ver estadísticas.')); return; }
  if (selChild !== 'all' && !kids.some((k) => k.id === selChild)) selChild = 'all';

  const thisWs = weekStart(todayKey(), st.settings.weekStart);
  const ws = addDays(thisWs, offset * 7), we = addDays(ws, 6);
  const pws = addDays(ws, -7), pwe = addDays(ws, -1);
  const days = weekDays(ws);

  root.append(h('div', { class: 'week-nav' },
    h('button', { class: 'nav-btn', type: 'button', 'aria-label': 'Semana anterior', onclick: () => { offset--; refresh(); } }, '‹'),
    h('div', { class: 'week-label' }, h('strong', null, offset === 0 ? 'Esta semana' : offset === -1 ? 'Semana pasada' : 'Semana'), h('small', null, formatWeekRange(ws))),
    h('button', { class: 'nav-btn', type: 'button', 'aria-label': 'Semana siguiente', disabled: offset >= 0, onclick: () => { offset++; refresh(); } }, '›')));

  // Ranking
  const standing = S.weekStanding(ws); // el Rey de esa semana no compite y va aparte
  const rank = standing.ranking.map((r) => ({ c: S.getChild(r.id), pts: r.points })).filter((r) => r.c);
  const top = Math.max(1, ...rank.map((r) => Math.abs(r.pts)));
  const medals = ['🥇', '🥈', '🥉'];
  root.append(h('h3', { class: 'section-title' }, 'Ranking familiar'));
  const rc = h('section', { class: 'card' });
  rank.forEach((r, i) => rc.append(h('div', { class: 'rank-row' },
    h('span', { class: 'medal' }, medals[i] || String(i + 1)), avatar(r.c, 34),
    h('div', { class: 'grow' }, h('strong', null, r.c.name),
      h('div', { class: 'progress thin' }, h('i', { style: { width: Math.max(2, Math.round((Math.max(0, r.pts) / top) * 100)) + '%', background: r.c.color } }))),
    h('span', { class: 'pts' + (r.pts < 0 ? ' neg' : '') }, signed(r.pts)))));
  const kingM = standing.king && S.getChild(standing.king);
  if (kingM) rc.append(h('div', { class: 'rank-row king-row' }, h('span', { class: 'medal' }, '👑'), avatar(kingM, 34),
    h('div', { class: 'grow' }, h('strong', null, kingM.name), h('span', { class: 'king-tag' }, 'Rey · no compite'))));
  root.append(rc);

  // Selector de detalle
  root.append(h('h3', { class: 'section-title' }, 'Detalle'));
  root.append(h('div', { class: 'chips scroll' }, [{ id: 'all', avatar: '👨‍👩‍👧', name: 'Familia', color: null }, ...kids].map((c) => h('button', {
    class: 'chip' + (selChild === c.id ? ' on' : ''), style: selChild === c.id && c.color ? { background: c.color, borderColor: c.color, color: '#fff' } : null,
    onclick: () => { selChild = c.id; refresh(); },
  }, `${c.avatar} ${c.name}`))));

  const scope = selChild === 'all' ? null : selChild;
  const child = scope ? S.getChild(scope) : null;
  const color = child ? child.color : 'var(--accent)';
  const cur = S.pointsInRange(scope, ws, we), prev = S.pointsInRange(scope, pws, pwe);
  const perDay = days.map((d) => S.pointsInRange(scope, d, d));

  root.append(h('section', { class: 'card pad' },
    h('div', { class: 'big-stat' }, h('span', { class: 'sum-num' }, signed(cur)), h('span', { class: 'sum-lbl' }, 'puntos en la semana')),
    delta(cur, prev), barChart(days, perDay, color)));

  // Tareas más completadas
  const tally = new Map();
  for (const e of st.ledger) {
    if (e.type !== 'task' || !S.counts(e) || e.date < ws || e.date > we || (scope && e.childId !== scope)) continue;
    const k = e.refId || e.title;
    const t = tally.get(k) || { title: e.title, emoji: e.emoji, n: 0 };
    t.n++; tally.set(k, t);
  }
  const best = [...tally.values()].sort((a, b) => b.n - a.n).slice(0, 5);
  root.append(h('h3', { class: 'section-title' }, 'Tareas más completadas'));
  if (!best.length) root.append(h('p', { class: 'muted pad' }, 'Sin tareas completadas esta semana.'));
  else {
    const card = h('section', { class: 'card' });
    best.forEach((t) => card.append(h('div', { class: 'hist-row' }, h('span', { class: 'task-emoji' }, t.emoji), h('div', { class: 'grow' }, h('strong', null, t.title)), h('span', { class: 'count' }, '×' + t.n))));
    root.append(card);
  }

  // Rachas
  root.append(h('h3', { class: 'section-title' }, 'Rachas de hábitos'));
  const streakCard = h('section', { class: 'card' });
  (scope ? [child] : kids).forEach((c) => {
    const habits = st.tasks.filter((t) => t.isHabit && S.taskAppliesTo(t, c.id));
    streakCard.append(h('div', { class: 'child-head' }, avatar(c, 30), h('div', { class: 'grow' }, h('strong', null, c.name)),
      h('span', { class: 'count' }, `🔥 ${S.childStreak(c.id)} ${plural(S.childStreak(c.id), 'día', 'días')}`)));
    if (scope) {
      if (!habits.length) streakCard.append(h('p', { class: 'muted pad' }, 'No hay hábitos asignados. Marca una tarea como "hábito" para ver su racha.'));
      habits.forEach((t) => {
        const n = S.habitStreak(t, c.id);
        streakCard.append(h('div', { class: 'hist-row' }, h('span', { class: 'task-emoji' }, t.emoji), h('div', { class: 'grow' }, h('strong', null, t.title)),
          h('span', { class: 'count' }, `🔥 ${n} ${t.freq === 'weekly' ? plural(n, 'semana', 'semanas') : plural(n, 'día', 'días')}`)));
      });
    }
  });
  root.append(streakCard);

  // Hall de Reyes
  root.append(h('h3', { class: 'section-title' }, '👑 Hall de Reyes'));
  const hist = S.kingHistory();
  if (!hist.length) root.append(h('p', { class: 'muted pad' }, 'Aún no hay reyes. El ganador de cada semana será el Rey de la siguiente.'));
  else {
    const crowns = new Map();
    hist.forEach((k) => crowns.set(k.king, (crowns.get(k.king) || 0) + 1));
    const cc = h('section', { class: 'card' });
    [...crowns.entries()].sort((a, b) => b[1] - a[1]).forEach(([id, n]) => {
      const m = S.getChild(id);
      if (m) cc.append(h('div', { class: 'hist-row' }, avatar(m, 30, false), h('div', { class: 'grow' }, h('strong', null, m.name)), h('span', { class: 'count' }, '👑 ×' + n)));
    });
    root.append(cc);
    const lc = h('section', { class: 'card' });
    hist.forEach((k) => {
      const m = S.getChild(k.king);
      if (!m) return;
      lc.append(h('div', { class: 'hist-row' }, avatar(m, 30, false),
        h('div', { class: 'grow' }, h('strong', null, m.name), h('small', null, formatWeekRange(k.week) + (k.week === thisWs ? ' · esta semana' : ''))),
        h('span', { class: 'count' }, k.points != null ? `${k.points} pts` : '')));
    });
    root.append(lc);
  }
}
