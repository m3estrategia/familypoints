// Formularios en hojas modales: hijos, tareas, premios y puntos manuales.
import * as S from '../store.js';
import { DAY_SHORT, DAY_NAMES, todayKey } from '../dates.js';
import {
  h, sheet, field, segmented, emojiPicker, colorPicker, childMultiSelect, toast, confirmDialog, vibrate, confetti,
  avatar, EMOJIS_AVATAR, EMOJIS_TASK, EMOJIS_REWARD, COLORS, signed,
} from '../ui.js';
import { suggestPoints } from '../ai-judge.js';

const num = (v, d = 0) => { const n = parseInt(v, 10); return Number.isFinite(n) ? n : d; };

/* ---------- Hijo ---------- */
export function childForm(child, onSaved) {
  const data = { name: child?.name || '', avatar: child?.avatar || EMOJIS_AVATAR[0], color: child?.color || COLORS[S.getState().children.length % COLORS.length], age: child?.age ?? '' };
  const name = h('input', { type: 'text', value: data.name, placeholder: 'Nombre', maxLength: 30, autocomplete: 'off' });
  const age = h('input', { type: 'number', inputMode: 'numeric', value: data.age, placeholder: 'Opcional', min: 0, max: 25 });
  const ep = emojiPicker(data.avatar, EMOJIS_AVATAR);
  const cp = colorPicker(data.color, (c) => { data.color = c; });
  const form = h('form', { class: 'form', onsubmit: (e) => {
    e.preventDefault();
    const n = name.value.trim();
    if (!n) { name.focus(); toast('Escribe un nombre'); return; }
    const id = S.saveChild({ id: child?.id, name: n, avatar: ep.get() || EMOJIS_AVATAR[0], color: data.color, age: age.value === '' ? '' : num(age.value) });
    sh.close();
    if (onSaved) onSaved(id);
  } },
  field('Nombre', name), ep.el, cp, field('Edad', age),
  h('button', { class: 'btn primary block', type: 'submit' }, child ? 'Guardar' : 'Añadir hijo'));
  const sh = sheet({ title: child ? 'Editar hijo' : 'Nuevo hijo', content: form });
  return sh;
}

/* ---------- Tarea ---------- */
export function taskForm(task, onSaved) {
  const kids = S.activeChildren();
  const d = {
    freq: task?.freq || 'daily', days: [...(task?.days || [])], isHabit: !!task?.isHabit, approval: !!task?.requiresApproval,
    sign: (task?.points ?? 1) < 0 ? -1 : 1,
  };
  const title = h('input', { type: 'text', value: task?.title || '', placeholder: 'Ej.: Hacer la cama', maxLength: 60, autocomplete: 'off' });
  const ep = emojiPicker(task?.emoji || '⭐', EMOJIS_TASK);
  const pts = h('input', { type: 'number', inputMode: 'numeric', value: Math.abs(task?.points ?? 1), min: 0, max: 1000 });
  const signSeg = segmented([{ value: 1, label: 'Suma (+)' }, { value: -1, label: 'Resta (−)' }], d.sign, (v) => { d.sign = v; });
  const who = childMultiSelect(kids, (task?.childIds || []).filter((id) => kids.some((k) => k.id === id)));
  const dateIn = h('input', { type: 'date', value: task?.date || '' });
  const daysRow = h('div', { class: 'chips wrap' });
  const dynamic = h('div');
  const renderDays = () => {
    daysRow.replaceChildren(...[1, 2, 3, 4, 5, 6, 0].map((i) => h('button', {
      type: 'button', class: 'chip round' + (d.days.includes(i) ? ' on' : ''), 'aria-label': DAY_NAMES[i], 'aria-pressed': String(d.days.includes(i)),
      onclick: () => { d.days = d.days.includes(i) ? d.days.filter((x) => x !== i) : [...d.days, i]; renderDays(); },
    }, DAY_SHORT[i])));
  };
  const renderDyn = () => {
    dynamic.replaceChildren();
    if (d.freq === 'weekdays') { renderDays(); dynamic.append(h('div', { class: 'field' }, h('span', { class: 'field-label' }, 'Días'), daysRow)); }
    if (d.freq === 'once') dynamic.append(field('Fecha (opcional)', dateIn, 'Si la dejas vacía, aparece hasta que se complete.'));
    if (d.freq === 'weekly') dynamic.append(h('p', { class: 'hint' }, 'Se puede hacer una vez por semana; se reinicia al empezar la semana.'));
  };
  const freqSel = h('select', { onchange: (e) => { d.freq = e.target.value; renderDyn(); } },
    [['daily', 'Cada día'], ['weekdays', 'Días concretos de la semana'], ['weekly', 'Semanal (una vez por semana)'], ['once', 'Puntual (una sola vez)']]
      .map(([v, l]) => h('option', { value: v, selected: v === d.freq }, l)));
  renderDyn();
  const toggle = (label, hint, key) => {
    const cb = h('input', { type: 'checkbox', checked: d[key], onchange: (e) => { d[key] = e.target.checked; } });
    return h('label', { class: 'switch-row' }, h('span', null, h('strong', null, label), h('small', null, hint)), h('span', { class: 'switch' }, cb, h('i')));
  };
  const form = h('form', { class: 'form', onsubmit: (e) => {
    e.preventDefault();
    const t = title.value.trim();
    if (!t) { title.focus(); toast('Escribe un título'); return; }
    if (d.freq === 'weekdays' && !d.days.length) { toast('Elige al menos un día'); return; }
    const id = S.saveTask({
      id: task?.id, title: t, emoji: ep.get() || '⭐', points: d.sign * Math.abs(num(pts.value)), childIds: who.get(),
      freq: d.freq, days: d.freq === 'weekdays' ? d.days : [], date: d.freq === 'once' ? (dateIn.value || null) : null,
      requiresApproval: d.approval, isHabit: d.isHabit,
    });
    sh.close();
    if (onSaved) onSaved(id);
  } },
  field('Título', title), ep.el,
  h('div', { class: 'field' }, h('span', { class: 'field-label' }, 'Puntos'), signSeg, pts, h('span', { class: 'hint' }, 'Usa "Resta" para penalizaciones (se pueden aplicar varias veces al día).')),
  who.el,
  field('Frecuencia', freqSel), dynamic,
  toggle('Requiere aprobación', 'Los puntos se suman cuando la apruebas', 'approval'),
  toggle('Es un hábito', 'Cuenta para la racha', 'isHabit'),
  h('button', { class: 'btn primary block', type: 'submit' }, task ? 'Guardar' : 'Crear tarea'));
  const sh = sheet({ title: task ? 'Editar tarea' : 'Nueva tarea', content: form, full: true });
  return sh;
}

/* ---------- Premio ---------- */
export function rewardForm(reward, onSaved) {
  const kids = S.activeChildren();
  const title = h('input', { type: 'text', value: reward?.title || '', placeholder: 'Ej.: Salida al parque', maxLength: 60, autocomplete: 'off' });
  const ep = emojiPicker(reward?.emoji || '🎁', EMOJIS_REWARD);
  const cost = h('input', { type: 'number', inputMode: 'numeric', value: reward?.cost ?? 10, min: 1, max: 100000 });
  const who = childMultiSelect(kids, (reward?.childIds || []).filter((id) => kids.some((k) => k.id === id)), 'Disponible para');
  const form = h('form', { class: 'form', onsubmit: (e) => {
    e.preventDefault();
    const t = title.value.trim();
    if (!t) { title.focus(); toast('Escribe un título'); return; }
    const id = S.saveReward({ id: reward?.id, title: t, emoji: ep.get() || '🎁', cost: Math.max(1, num(cost.value, 1)), childIds: who.get() });
    sh.close();
    if (onSaved) onSaved(id);
  } },
  field('Título', title), ep.el, field('Coste en puntos', cost), who.el,
  h('button', { class: 'btn primary block', type: 'submit' }, reward ? 'Guardar' : 'Crear premio'));
  const sh = sheet({ title: reward ? 'Editar premio' : 'Nuevo premio', content: form });
  return sh;
}

/* ---------- Puntos manuales ---------- */
export function manualForm(childId) {
  const kids = S.activeChildren();
  if (!kids.length) { toast('Primero añade un hijo'); return; }
  const d = { childId: childId && childId !== 'all' ? childId : kids[0].id, sign: 1 };
  const kidRow = h('div', { class: 'chips wrap' });
  const renderKids = () => kidRow.replaceChildren(...kids.map((c) => h('button', {
    type: 'button', class: 'chip' + (c.id === d.childId ? ' on' : ''), style: c.id === d.childId ? { background: c.color, borderColor: c.color, color: '#fff' } : null,
    onclick: () => { d.childId = c.id; renderKids(); },
  }, c.avatar + ' ' + c.name)));
  renderKids();
  const pts = h('input', { type: 'number', inputMode: 'numeric', value: 5, min: 1, max: 1000 });
  const reason = h('input', { type: 'text', placeholder: 'Ej.: Ha ayudado a su hermano', maxLength: 80, autocomplete: 'off' });
  const ep = emojiPicker('⭐', EMOJIS_TASK);
  const judge = h('button', { class: 'btn ghost block', type: 'button', onclick: async () => {
    try {
      const r = await suggestPoints(reason.value, S.getChild(d.childId));
      pts.value = Math.abs(r.points); d.sign = r.points < 0 ? -1 : 1;
    } catch { toast('Juez IA: próximamente'); }
  } }, '🤖 Pedir sugerencia al Juez IA');
  const signSeg = segmented([{ value: 1, label: 'Dar puntos (+)' }, { value: -1, label: 'Quitar puntos (−)' }], 1, (v) => { d.sign = v; });
  const form = h('form', { class: 'form', onsubmit: (e) => {
    e.preventDefault();
    const n = Math.abs(num(pts.value));
    if (!n) { pts.focus(); toast('Indica los puntos'); return; }
    const p = d.sign * n;
    S.manualPoints({ childId: d.childId, points: p, title: reason.value.trim() || (p > 0 ? 'Puntos extra' : 'Penalización'), emoji: ep.get() });
    vibrate(p > 0 ? [20, 30, 20] : 30);
    if (p > 0) confetti(60);
    toast(`${signed(p)} puntos para ${S.getChild(d.childId).name}`);
    sh.close();
  } },
  h('div', { class: 'field' }, h('span', { class: 'field-label' }, 'Hijo'), kidRow),
  signSeg, field('Puntos', pts), field('Motivo', reason), ep.el, judge,
  h('button', { class: 'btn primary block', type: 'submit' }, 'Guardar'));
  const sh = sheet({ title: 'Puntos manuales', content: form, full: true });
  return sh;
}

export async function confirmDeleteChild(child) {
  return confirmDialog({
    title: `¿Borrar a ${child.name}?`, message: 'Se borrarán también todos sus movimientos. No se puede deshacer. Si prefieres conservarlo, archívalo.',
    confirmText: 'Borrar', danger: true,
  });
}
export { avatar, todayKey };
