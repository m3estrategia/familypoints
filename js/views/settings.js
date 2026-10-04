// Ajustes y pantallas de gestión (familia y tareas)
import * as S from '../store.js';
import { todayKey, addDays, DAY_NAMES, DAY_ABBR } from '../dates.js';
import { h, avatar, signed, sheet, toast, confirmDialog, segmented, emptyState, pageHeader, applyTheme, plural } from '../ui.js';
import { go, back } from '../router.js';
import { childForm, taskForm, confirmDeleteChild } from './forms.js';

const link = (emoji, title, detail, onclick) => h('button', { class: 'list-row', type: 'button', onclick },
  h('span', { class: 'row-emoji' }, emoji), h('span', { class: 'grow left' }, h('strong', null, title), detail ? h('small', null, detail) : null), h('span', { class: 'chev' }, '›'));

/* ---------- Copia de seguridad ---------- */
async function exportBackup() {
  const text = S.exportJSON();
  const name = `familypoints-${todayKey()}.json`;
  const file = new File([text], name, { type: 'application/json' });
  if (navigator.canShare && navigator.canShare({ files: [file] })) {
    try { await navigator.share({ files: [file], title: 'Copia de seguridad FamilyPoints' }); return; }
    catch (e) { if (e && e.name === 'AbortError') return; }
  }
  const url = URL.createObjectURL(file);
  const a = h('a', { href: url, download: name });
  document.body.append(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
  toast('Copia descargada');
}
function importBackup() {
  const input = h('input', { type: 'file', accept: 'application/json,.json', style: { display: 'none' } });
  input.addEventListener('change', async () => {
    const file = input.files && input.files[0];
    input.remove();
    if (!file) return;
    try {
      const text = await file.text();
      JSON.parse(text);
      const ok = await confirmDialog({ title: '¿Restaurar copia?', message: 'Se reemplazarán TODOS los datos actuales por los de la copia.', confirmText: 'Restaurar', danger: true });
      if (!ok) return;
      S.importJSON(text);
      applyTheme(S.getState().settings.theme);
      toast('Copia restaurada');
    } catch (e) { toast(e.message && !(e instanceof SyntaxError) ? e.message : 'El archivo no es un JSON válido'); }
  });
  document.body.append(input);
  input.click();
}

async function resetFlow() {
  const ok = await confirmDialog({
    title: 'Reiniciar puntos', message: 'Se borrará todo el historial de puntos y las coronas volverán a empezar. Los miembros y las tareas se conservan.',
    confirmText: 'Reiniciar', danger: true,
  });
  if (!ok) return;
  const sure = await confirmDialog({ title: '¿Seguro?', message: 'Se borrará todo el historial de movimientos. No se puede deshacer.', confirmText: 'Sí, reiniciar', danger: true });
  if (!sure) return;
  S.resetPoints('all');
  toast('Puntos reiniciados');
}

/* ---------- Ajustes ---------- */
export function render(root) {
  const st = S.getState();
  root.append(pageHeader('Ajustes'));

  root.append(h('h3', { class: 'section-title' }, 'Gestionar'),
    h('section', { class: 'card' },
      link('👨‍👩‍👧', 'Familia', `${S.activeChildren().length} ${plural(S.activeChildren().length, 'activo', 'activos')}`, () => go('/ajustes/familia')),
      link('📝', 'Tareas y hábitos', `${st.tasks.length}`, () => go('/ajustes/tareas'))));

  root.append(h('h3', { class: 'section-title' }, 'Preferencias'),
    h('section', { class: 'card pad form' },
      h('div', { class: 'field' }, h('span', { class: 'field-label' }, 'Tema'),
        segmented([{ value: 'auto', label: 'Auto' }, { value: 'light', label: 'Claro' }, { value: 'dark', label: 'Oscuro' }], st.settings.theme,
          (v) => { S.setSetting('theme', v); applyTheme(v); })),
      h('label', { class: 'field' }, h('span', { class: 'field-label' }, 'La semana empieza el'),
        h('select', { onchange: (e) => S.setSetting('weekStart', Number(e.target.value)) },
          [1, 0, 6].map((d) => h('option', { value: d, selected: st.settings.weekStart === d }, DAY_NAMES[d]))),
        h('span', { class: 'hint' }, 'Afecta a las tareas semanales, a la corona y a las estadísticas.')),
      h('label', { class: 'field' }, h('span', { class: 'field-label' }, '👑 Rey o Reina inicial'),
        h('select', { onchange: (e) => S.setInitialKing(e.target.value || null) },
          h('option', { value: '' }, 'Ninguno'),
          S.activeChildren().map((c) => h('option', { value: c.id, selected: st.settings.initialKing === c.id && st.settings.initialKingWeek === S.currentWeek() }, `${c.avatar} ${c.name}`))),
        h('span', { class: 'hint' }, 'Rey o Reina de esta semana, cuando aún no hay una semana anterior con datos. Solo se aplica a la semana en que lo configuras.'))));

  root.append(h('h3', { class: 'section-title' }, 'Juez IA'),
    h('section', { class: 'card pad' },
      h('div', { class: 'switch-row' }, h('span', null, h('strong', null, '🤖 Juez IA'), h('small', null, 'Próximamente')),
        h('span', { class: 'switch disabled' }, h('input', { type: 'checkbox', disabled: true, checked: false, 'aria-label': 'Juez IA (próximamente)' }), h('i')))));

  root.append(h('h3', { class: 'section-title' }, 'Copia de seguridad'),
    h('section', { class: 'card pad form' },
      h('p', { class: 'hint' }, 'Los datos solo se guardan en este dispositivo. Haz copias de vez en cuando.'),
      h('button', { class: 'btn block', type: 'button', onclick: exportBackup }, '⬆️ Exportar copia'),
      h('button', { class: 'btn block', type: 'button', onclick: importBackup }, '⬇️ Importar copia')));

  root.append(h('h3', { class: 'section-title' }, 'Datos'),
    h('section', { class: 'card pad form' },
      h('button', { class: 'btn danger-soft block', type: 'button', onclick: resetFlow }, '🔄 Reiniciar puntos'),
      h('button', { class: 'btn danger-soft block', type: 'button', onclick: async () => {
        const ok = await confirmDialog({ title: '¿Borrar todos los datos?', message: 'Se eliminarán miembros, tareas e historial. Exporta una copia antes si la necesitas.', confirmText: 'Borrar todo', danger: true });
        if (ok) { S.wipeAll(); applyTheme('auto'); go('/hoy'); }
      } }, '🗑 Borrar todos los datos')));

  root.append(h('h3', { class: 'section-title' }, 'Acerca de'),
    h('section', { class: 'card pad about' },
      h('strong', null, '⭐ FamilyPoints'), h('small', null, `Versión ${S.APP_VERSION}`),
      h('small', null, 'Tareas y hábitos familiares que dan puntos. Todos los datos se guardan solo en este dispositivo.')));
}

const subHeader = (title, onAdd) => pageHeader(title, null, h('div', { class: 'header-actions' },
  h('button', { class: 'btn-text', type: 'button', onclick: () => back('/ajustes') }, '‹ Ajustes'),
  onAdd ? h('button', { class: 'btn small primary', type: 'button', onclick: onAdd }, '＋ Nuevo') : null));

const actionSheet = (title, actions) => {
  const sh = sheet({ title, content: h('div', { class: 'form' }, actions.map((a) => h('button', {
    class: 'btn block' + (a.danger ? ' danger-soft' : ''), type: 'button', onclick: () => { sh.close(); a.fn(); },
  }, a.label))) });
};

/* ---------- Familia ---------- */
export function renderChildren(root) {
  const kids = S.getState().children;
  root.append(subHeader('Familia', () => childForm(null)));
  if (!kids.length) { root.append(emptyState('👨‍👩‍👧', 'Sin miembros', 'Añade el primer miembro de la familia.')); return; }
  const card = h('section', { class: 'card' });
  kids.forEach((c) => card.append(h('button', { class: 'list-row' + (c.archived ? ' dead' : ''), type: 'button', onclick: () => actionSheet(`${c.avatar} ${c.name}`, [
    { label: '✏️ Editar', fn: () => childForm(c) },
    { label: c.archived ? '📤 Restaurar' : '📦 Archivar', fn: () => { S.archiveChild(c.id, !c.archived); toast(c.archived ? 'Restaurado' : 'Archivado'); } },
    { label: '🗑 Borrar', danger: true, fn: async () => { if (await confirmDeleteChild(c)) { S.deleteChild(c.id); toast('Perfil borrado'); } } },
  ]) },
  avatar(c, 40),
  h('span', { class: 'grow left' }, h('strong', null, c.name + (c.archived ? ' (archivado)' : '')),
    h('small', null, `${c.role === 'parent' ? (c.gender === 'f' ? 'Adulta' : 'Adulto') + ' · ' : ''}${c.age !== '' && c.age != null ? c.age + ' años · ' : ''}Esta semana ${signed(S.pointsInRange(c.id, S.currentWeek(), addDays(S.currentWeek(), 6)))}${S.crownCount(c.id) ? ` · 👑×${S.crownCount(c.id)}` : ''} · 🔥 ${S.childStreak(c.id)}`)),
  h('span', { class: 'chev' }, '›'))));
  root.append(card);
}

/* ---------- Tareas ---------- */
const freqLabel = (t) => ({
  daily: 'Cada día', weekly: 'Semanal', once: t.date ? 'Puntual · ' + t.date : 'Puntual',
  weekdays: (t.days || []).slice().sort((a, b) => ((a + 6) % 7) - ((b + 6) % 7)).map((d) => DAY_ABBR[d]).join(' '),
}[t.freq]);

export function renderTasks(root) {
  const tasks = S.getState().tasks;
  root.append(subHeader('Tareas', () => taskForm(null)));
  if (!tasks.length) { root.append(emptyState('📝', 'Sin tareas', 'Crea tu primera tarea o hábito.')); return; }
  const card = h('section', { class: 'card' });
  tasks.forEach((t) => {
    const who = t.childIds.length ? t.childIds.map((id) => S.getChild(id)?.name).filter(Boolean).join(', ') : 'Todos';
    card.append(h('button', { class: 'list-row', type: 'button', onclick: () => actionSheet(`${t.emoji} ${t.title}`, [
      { label: '✏️ Editar', fn: () => taskForm(t) },
      { label: '📄 Duplicar', fn: () => { S.duplicateTask(t.id); toast('Tarea duplicada'); } },
      { label: '🗑 Borrar', danger: true, fn: async () => { if (await confirmDialog({ title: `¿Borrar "${t.title}"?`, message: 'El historial se conserva.', confirmText: 'Borrar', danger: true })) { S.deleteTask(t.id); toast('Tarea borrada'); } } },
    ]) },
    h('span', { class: 'row-emoji' }, t.emoji),
    h('span', { class: 'grow left' }, h('strong', null, t.title),
      h('small', null, [freqLabel(t), who, t.requiresApproval ? '✋' : null, t.isHabit ? '🔥' : null].filter(Boolean).join(' · '))),
    h('span', { class: 'pts' + (t.points < 0 ? ' neg' : '') }, signed(t.points))));
  });
  root.append(card);
}

