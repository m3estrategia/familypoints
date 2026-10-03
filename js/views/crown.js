// Componentes del Rey de la semana: clasificación en vivo y hoja de coronación.
import * as S from '../store.js';
import { addDays, formatWeekRange } from '../dates.js';
import { h, avatar, signed, plural, sheet, confetti, vibrate } from '../ui.js';

const MEDALS = ['🥇', '🥈', '🥉'];

function rankRow(r, i, extra) {
  const c = S.getChild(r.id);
  if (!c) return null;
  return h('div', { class: 'rank-row' },
    h('span', { class: 'medal' }, r.points > 0 && MEDALS[i] ? MEDALS[i] : String(i + 1)), avatar(c, 34),
    h('div', { class: 'grow' }, h('strong', null, c.name), extra ? h('small', null, extra) : null),
    h('span', { class: 'pts' + (r.points < 0 ? ' neg' : '') }, signed(r.points)));
}

// Tarjeta "Clasificación de la semana" para la pantalla Hoy.
export function leagueCard() {
  const st = S.weekStanding(S.currentWeek());
  const left = S.daysLeftInWeek();
  const card = h('section', { class: 'card' },
    h('div', { class: 'league-head' }, h('strong', null, 'Clasificación de la semana'),
      h('small', null, `Quedan ${left} ${plural(left, 'día', 'días')}`)));
  st.ranking.forEach((r, i) => card.append(rankRow(r, i, i === 0 && r.points > 0 ? 'Va camino de ser el próximo Rey 👑' : null)));
  const king = st.king && S.getChild(st.king);
  if (king) {
    card.append(h('div', { class: 'rank-row king-row' },
      h('span', { class: 'medal' }, '👑'), avatar(king, 34),
      h('div', { class: 'grow' }, h('strong', null, king.name), h('span', { class: 'king-tag' }, 'Rey · no compite'))));
  }
  return card;
}

// Hoja de celebración con confeti y la clasificación final de la semana anterior.
export function coronationSheet(week = S.currentWeek()) {
  const kingId = S.kingOf(week);
  const king = kingId && S.getChild(kingId);
  if (!king) return null;
  const prev = S.weekStanding(addDays(week, -7));
  const won = prev.winner && prev.winner.id === kingId ? prev.winner.points : null;
  const content = h('div', { class: 'coronation' },
    h('div', { class: 'big-crown' }, '👑'), avatar(king, 72),
    h('h2', null, `¡${king.name} es el nuevo Rey!`),
    won != null ? h('p', { class: 'muted' }, `Ganó la semana con ${won} ${plural(won, 'punto', 'puntos')}`) : h('p', { class: 'muted' }, 'Rey de esta semana'),
    h('p', { class: 'muted' }, 'Esta semana no compite: le toca repartir los puntos.'),
    prev.ranking.length ? h('section', { class: 'card', style: { width: '100%' } },
      h('div', { class: 'league-head' }, h('strong', null, 'Clasificación final'), h('small', null, formatWeekRange(prev.week))),
      prev.ranking.map((r, i) => rankRow(r, i))) : null,
    h('button', { class: 'btn primary block', type: 'button', onclick: () => sh.close() }, '¡Viva el Rey!'));
  const sh = sheet({ title: '👑 Coronación', content });
  confetti(140); vibrate([30, 50, 30, 50, 60]);
  return sh;
}

// Muestra la coronación una sola vez por semana nueva que tenga rey.
export function maybeCoronation() {
  const st = S.getState();
  if (!st.settings.onboarded) return;
  const week = S.currentWeek();
  if (!S.kingOf(week) || st.settings.lastCoronationShown === week) return;
  S.setSetting('lastCoronationShown', week);
  coronationSheet(week);
}
