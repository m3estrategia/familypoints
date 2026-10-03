// Asistente de primer arranque
import * as S from '../store.js';
import { h, toast, emptyState } from '../ui.js';
import { childForm } from './forms.js';

export function render(root) {
  const packs = { tasks: true, rewards: true };
  const kids = S.getState().children;
  root.append(h('div', { class: 'onboarding' },
    h('div', { class: 'hero' }, h('div', { class: 'hero-emoji' }, '⭐'), h('h1', null, '¡Bienvenida a FamilyPoints!'),
      h('p', null, 'Tareas y hábitos que dan puntos a toda la familia. Vamos a prepararlo en un momento.')),
    h('h3', { class: 'section-title' }, '1. La familia'),
    kids.length ? h('section', { class: 'card' }, kids.map((c) => h('div', { class: 'list-row' }, h('span', { class: 'row-emoji' }, c.avatar), h('span', { class: 'grow left' }, h('strong', null, c.name))))) : null,
    h('p', { class: 'hint pad' }, 'Añade a los niños, ¡y también a papá y mamá! Toda la familia compite y cada semana habrá un Rey 👑.'),
    h('button', { class: 'btn block', type: 'button', onclick: () => childForm(null) }, kids.length ? '＋ Añadir otro miembro' : '＋ Añadir miembro'),
    h('h3', { class: 'section-title' }, '2. Ejemplos (opcional)'),
    h('section', { class: 'card' },
      ...[['tasks', '📝 Pack de tareas de ejemplo', 'Hacer la cama, lavarse los dientes, deberes, leer…'],
        ['rewards', '🎁 Pack de premios de ejemplo', '30 min de pantalla, elegir la cena, salida al parque…']].map(([k, t, d]) =>
        h('label', { class: 'switch-row pad' }, h('span', null, h('strong', null, t), h('small', null, d)),
          h('span', { class: 'switch' }, h('input', { type: 'checkbox', checked: true, onchange: (e) => { packs[k] = e.target.checked; } }), h('i'))))),
    h('button', { class: 'btn primary block', type: 'button', onclick: () => {
      if (!S.getState().children.length) { toast('Añade al menos un miembro para empezar'); return; }
      S.loadSamples(packs);
      S.setSetting('onboarded', true);
      location.hash = '#/hoy';
    } }, 'Empezar'),
    h('button', { class: 'btn-text block', type: 'button', onclick: () => { S.setSetting('onboarded', true); location.hash = '#/hoy'; } }, 'Saltar y configurar después')));
}
export { emptyState };
