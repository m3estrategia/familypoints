// Capa de datos: estado único en localStorage ('fp:v1') + selectores derivados del ledger.
import { todayKey, addDays, dow, weekStart, diffDays } from './dates.js';
export const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 8);

export const APP_VERSION = '1.1.0';
export const STORAGE_KEY = 'fp:v1'; // se mantiene la clave para no perder datos de la v1
export const SCHEMA_VERSION = 2;

const defaults = () => ({
  schema: SCHEMA_VERSION,
  settings: {
    theme: 'auto', weekStart: 1, onboarded: false, aiJudge: false, lastChild: 'all',
    initialKing: null, initialKingWeek: null, lastCoronationShown: null,
  },
  children: [],
  tasks: [],
  rewards: [],
  ledger: [],
});

// Migraciones: migrations[n] convierte de la versión n a n+1.
const migrations = {
  // v1 -> v2: los perfiles pasan a ser miembros de la familia con rol (todo lo existente son niños).
  1: (s) => {
    (Array.isArray(s.children) ? s.children : []).forEach((c) => { if (!c.role) c.role = 'child'; });
    return s;
  },
};
export function migrate(raw) {
  let s = raw && typeof raw === 'object' ? raw : defaults();
  let v = Number(s.schema) || 1;
  while (v < SCHEMA_VERSION) { s = migrations[v] ? migrations[v](s) : s; v++; }
  const d = defaults();
  const out = { ...d, ...s, settings: { ...d.settings, ...(s.settings || {}) }, schema: SCHEMA_VERSION };
  for (const k of ['children', 'tasks', 'rewards', 'ledger']) if (!Array.isArray(out[k])) out[k] = [];
  out.children.forEach((c) => { if (c.role !== 'parent' && c.role !== 'child') c.role = 'child'; });
  repairMissingIds(out);
  return out;
}

// v1.0/v1.1 guardaban miembros, tareas y premios creados desde formulario sin id (bug en saveX).
// Se les asigna uno; los movimientos huérfanos se atribuyen al primer miembro reparado y,
// en tareas, a la tarea con el mismo título.
function repairMissingIds(s) {
  const fix = (list) => { let first = null; list.forEach((x) => { if (!x.id) { x.id = uid(); first = first || x.id; } }); return first; };
  const kid = fix(s.children);
  fix(s.tasks);
  fix(s.rewards);
  s.ledger.forEach((e) => {
    if (!e.id) e.id = uid();
    if (!e.childId && kid) e.childId = kid;
    const list = e.type === 'task' ? s.tasks : e.type === 'redeem' ? s.rewards : null;
    const match = list && !e.refId && list.find((x) => x.title === e.title);
    if (match) e.refId = match.id;
  });
}

let state;
let memo; // caché de cálculos derivados del rey; se invalida en cada cambio de estado
function resetMemo() { memo = { king: new Map(), standing: new Map(), first: undefined }; }
const listeners = new Set();

function load() {
  try {
    const txt = localStorage.getItem(STORAGE_KEY);
    state = migrate(txt ? JSON.parse(txt) : null);
    if (txt) save(); // persiste migraciones y reparaciones de ids para que sean estables
  } catch (e) {
    console.error('No se pudo leer el almacenamiento', e);
    state = defaults();
  }
  resetMemo();
}
function save() {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); }
  catch (e) { console.error('No se pudo guardar', e); }
}
load();

export const getState = () => state;
export const subscribe = (fn) => { listeners.add(fn); return () => listeners.delete(fn); };
function commit(fn) { const r = fn(state); resetMemo(); save(); listeners.forEach((l) => l()); return r; }


/* ---------- Ajustes ---------- */
export const setSetting = (k, v) => commit((s) => { s.settings[k] = v; });
// Rey inicial: solo vale para la semana en que se configura (id = null para ninguno).
export const setInitialKing = (id) => commit((s) => {
  s.settings.initialKing = id || null;
  s.settings.initialKingWeek = id ? weekStart(todayKey(), s.settings.weekStart) : null;
});

/* ---------- Miembros de la familia (en state.children por compatibilidad con v1) ---------- */
export const activeChildren = () => state.children.filter((c) => !c.archived);
export const getChild = (id) => state.children.find((c) => c.id === id);
export function saveChild(data) {
  return commit((s) => {
    if (data.id) { Object.assign(s.children.find((c) => c.id === data.id), data); return data.id; }
    const c = { archived: false, createdAt: Date.now(), ...data, id: uid() };
    s.children.push(c);
    return c.id;
  });
}
export const archiveChild = (id, v = true) => commit((s) => { s.children.find((c) => c.id === id).archived = v; });
export function deleteChild(id) {
  commit((s) => {
    s.children = s.children.filter((c) => c.id !== id);
    s.ledger = s.ledger.filter((e) => e.childId !== id);
    s.tasks.forEach((t) => { t.childIds = t.childIds.filter((x) => x !== id); });
    s.rewards.forEach((t) => { t.childIds = t.childIds.filter((x) => x !== id); });
  });
}

/* ---------- Tareas ---------- */
// task: {id,title,emoji,points,childIds([] = todos),freq:'daily'|'weekdays'|'weekly'|'once',days:[0-6],date,requiresApproval,isHabit}
export function saveTask(data) {
  return commit((s) => {
    if (data.id) { Object.assign(s.tasks.find((t) => t.id === data.id), data); return data.id; }
    const t = { createdAt: Date.now(), ...data, id: uid() };
    s.tasks.push(t);
    return t.id;
  });
}
export const getTask = (id) => state.tasks.find((t) => t.id === id);
export function duplicateTask(id) {
  const t = getTask(id);
  return saveTask({ ...t, id: undefined, title: t.title + ' (copia)', createdAt: Date.now() });
}
export const deleteTask = (id) => commit((s) => { s.tasks = s.tasks.filter((t) => t.id !== id); });
export const taskAppliesTo = (t, childId) => !t.childIds.length || t.childIds.includes(childId);

/* ---------- Premios ---------- */
export const saveReward = (data) => commit((s) => {
  if (data.id) { Object.assign(s.rewards.find((r) => r.id === data.id), data); return data.id; }
  const r = { ...data, id: uid() };
  s.rewards.push(r);
  return r.id;
});
export const deleteReward = (id) => commit((s) => { s.rewards = s.rewards.filter((r) => r.id !== id); });
export const rewardAppliesTo = (r, childId) => !r.childIds.length || r.childIds.includes(childId);

/* ---------- Ledger ---------- */
// entry: {id,ts,date,childId,type:'task'|'manual'|'redeem'|'reset',status:'done'|'pending'|'approved'|'rejected',
//         points,title,emoji,refId,habit}
export const counts = (e) => e.status === 'done' || e.status === 'approved';
const isEarning = (e) => (e.type === 'task' || e.type === 'manual') && counts(e);

function addEntry(e) {
  const entry = { id: uid(), ts: Date.now(), date: todayKey(), status: 'done', ...e };
  const king = (e.type === 'task' || e.type === 'manual') ? currentKingId() : null;
  if (king) entry.grantedBy = king;
  commit((s) => { s.ledger.push(entry); });
  return entry;
}

export function balance(childId) {
  return state.ledger.reduce((a, e) => a + (e.childId === childId && counts(e) ? e.points : 0), 0);
}
export function totalEarned(childId) {
  return state.ledger.reduce((a, e) => a + (e.childId === childId && isEarning(e) && e.points > 0 ? e.points : 0), 0);
}
// Puntos ganados (tareas y manuales) entre dos fechas incluidas. childId null = todos.
export function pointsInRange(childId, from, to) {
  return state.ledger.reduce((a, e) => {
    if (!isEarning(e) || (childId && e.childId !== childId) || e.date < from || e.date > to) return a;
    return a + e.points;
  }, 0);
}
export const pendingEntries = () => state.ledger.filter((e) => e.type === 'task' && e.status === 'pending')
  .sort((a, b) => a.ts - b.ts);

export function manualPoints({ childId, points, title, emoji }) {
  if (childId === currentKingId()) return null; // el Rey no gana ni pierde puntos en su semana
  return addEntry({ childId, type: 'manual', points, title, emoji: emoji || (points >= 0 ? '⭐' : '⚠️') });
}
export function redeem(rewardId, childId) {
  const r = state.rewards.find((x) => x.id === rewardId);
  const bal = balance(childId);
  if (bal < r.cost) return { ok: false, missing: r.cost - bal };
  addEntry({ childId, type: 'redeem', points: -r.cost, title: r.title, emoji: r.emoji, refId: r.id });
  return { ok: true };
}
export const removeEntry = (id) => commit((s) => { s.ledger = s.ledger.filter((e) => e.id !== id); });
export const setEntryStatus = (id, status) => commit((s) => { s.ledger.find((e) => e.id === id).status = status; });
export const approveEntry = (id) => commit((s) => {
  const e = s.ledger.find((x) => x.id === id);
  e.status = 'approved';
  const king = currentKingId();
  if (king) e.grantedBy = king; else delete e.grantedBy;
});
export const rejectEntry = (id) => setEntryStatus(id, 'rejected');

/* ---------- Rey de la semana (todo derivado del ledger; nada se almacena) ---------- */
// Semana W = clave de su día de inicio. Rey(W) = ganador(W-1), o el "Rey inicial" si se configuró para W.
// Ganador(W) = más puntos netos aprobados en W (sin contar a Rey(W)); desempates: más tareas, quien llegó antes.
const normWeek = (k) => weekStart(k, state.settings.weekStart);
export const currentWeek = () => normWeek(todayKey());
export const currentKingId = () => kingOf(currentWeek());

// Primera semana con datos (primer movimiento que suma) o semana del rey inicial; null si no hay nada.
function firstWeek() {
  if (memo.first !== undefined) return memo.first;
  let min = null;
  for (const e of state.ledger) if (isEarning(e) && (min === null || e.date < min)) min = e.date;
  let w = min === null ? null : normWeek(min);
  const iw = state.settings.initialKingWeek;
  if (state.settings.initialKing && iw && (w === null || iw < w)) w = iw;
  memo.first = w;
  return w;
}

// Clasificación de la semana W: {week, king, ranking:[{id,points,tasks,ts}], winner}. Solo miembros activos que compiten.
export function weekStanding(weekStartDate) {
  const W = normWeek(weekStartDate);
  if (memo.standing.has(W)) return memo.standing.get(W);
  const king = kingOf(W);
  const end = addDays(W, 6);
  const acc = new Map();
  for (const c of state.children) if (!c.archived && c.id !== king) acc.set(c.id, { id: c.id, points: 0, tasks: 0, ts: 0 });
  const es = state.ledger.filter((e) => isEarning(e) && e.date >= W && e.date <= end && acc.has(e.childId)).sort((a, b) => a.ts - b.ts);
  for (const e of es) {
    const r = acc.get(e.childId);
    r.points += e.points;
    if (e.type === 'task' && e.points > 0) r.tasks++;
    if (e.points !== 0) r.ts = e.ts; // movimiento con el que llegó a su total final
  }
  const ranking = [...acc.values()].sort((a, b) => b.points - a.points || b.tasks - a.tasks || a.ts - b.ts);
  const winner = ranking.length && ranking[0].points > 0 ? ranking[0] : null;
  const res = { week: W, king, ranking, winner };
  memo.standing.set(W, res);
  return res;
}
export const weekWinner = (weekStartDate) => weekStanding(weekStartDate).winner?.id ?? null;

export function kingOf(weekStartDate) {
  const W = normWeek(weekStartDate);
  if (memo.king.has(W)) return memo.king.get(W);
  const start = firstWeek();
  if (start === null || W < start) return null;
  // Iterativo desde la primera semana con datos (sin recursión profunda); cada semana queda memoizada.
  const { initialKing, initialKingWeek } = state.settings;
  for (let w = start; w <= W; w = addDays(w, 7)) {
    if (memo.king.has(w)) continue;
    let k = null;
    if (initialKing && initialKingWeek === w && state.children.some((c) => c.id === initialKing && !c.archived)) k = initialKing;
    else if (w > start) k = weekWinner(addDays(w, -7));
    memo.king.set(w, k);
  }
  return memo.king.get(W);
}

// Semanas con rey, de la más reciente (la actual) a la más antigua: [{week, king, points}]
export function kingHistory() {
  const start = firstWeek(), cur = currentWeek(), out = [];
  if (start === null) return out;
  for (let w = cur; w >= start; w = addDays(w, -7)) {
    const k = kingOf(w);
    if (!k) continue;
    const prev = w > start ? weekStanding(addDays(w, -7)).winner : null;
    out.push({ week: w, king: k, points: prev && prev.id === k ? prev.points : null });
  }
  return out;
}
// Días que quedan de la semana en curso, contando hoy.
export const daysLeftInWeek = () => Math.max(0, diffDays(addDays(currentWeek(), 7), todayKey()));

/* ---------- Tareas del día (derivado del ledger) ---------- */
export const repeatable = (t) => t.points < 0; // las penalizaciones se pueden aplicar varias veces

function taskScheduled(t, dateKey) {
  if (t.freq === 'daily' || t.freq === 'weekly') return true;
  if (t.freq === 'weekdays') return (t.days || []).includes(dow(dateKey));
  if (t.freq === 'once') return !t.date || t.date <= dateKey;
  return true;
}
function periodRange(t, dateKey) {
  const ws = weekStart(dateKey, state.settings.weekStart);
  if (t.freq === 'weekly') return [ws, addDays(ws, 6)];
  if (t.freq === 'once') return ['0000-00-00', '9999-99-99'];
  return [dateKey, dateKey];
}
function taskEntries(t, childId, dateKey) {
  const [a, b] = periodRange(t, dateKey);
  return state.ledger.filter((e) => e.type === 'task' && e.refId === t.id && e.childId === childId
    && e.date >= a && e.date <= b && e.status !== 'rejected');
}

// Devuelve [{task, entry, count, last}] para el hijo en dateKey. entry = movimiento que completa la tarea en su periodo.
export function tasksForDay(childId, dateKey = todayKey()) {
  const out = [];
  for (const t of state.tasks) {
    if (!taskAppliesTo(t, childId) || !taskScheduled(t, dateKey)) continue;
    const es = taskEntries(t, childId, dateKey).sort((x, y) => x.ts - y.ts);
    const last = es.length ? es[es.length - 1] : null;
    if (t.freq === 'once' && last && last.date !== dateKey) continue;
    out.push({ task: t, entry: repeatable(t) ? null : last, count: repeatable(t) ? es.length : 0, last });
  }
  return out;
}

export function completeTask(taskId, childId) {
  const t = getTask(taskId);
  if (childId === currentKingId()) return null; // el Rey no compite en su semana
  return addEntry({
    childId, type: 'task', refId: t.id, title: t.title, emoji: t.emoji, points: t.points,
    status: t.requiresApproval ? 'pending' : 'done', habit: !!t.isHabit,
  });
}

/* ---------- Rachas ---------- */
function habitDates(childId, taskId) {
  const set = new Set();
  for (const e of state.ledger) {
    if (e.type === 'task' && e.childId === childId && counts(e) && e.habit && (!taskId || e.refId === taskId)) set.add(e.date);
  }
  return set;
}
function streakOverDays(has, scheduled = () => true) {
  const today = todayKey();
  let d = today, n = 0;
  for (let i = 0; i < 800; i++, d = addDays(d, -1)) {
    if (!scheduled(d)) continue;
    if (has(d)) n++;
    else if (d === today) continue; // hoy aún puede completarse
    else break;
  }
  return n;
}
// Racha del hijo: días consecutivos con al menos un hábito completado.
export function childStreak(childId) {
  const set = habitDates(childId);
  return streakOverDays((d) => set.has(d));
}
// Racha de un hábito concreto (días programados consecutivos, o semanas si es semanal).
export function habitStreak(task, childId) {
  const set = habitDates(childId, task.id);
  if (task.freq === 'weekly') {
    const ws = state.settings.weekStart;
    const weeks = new Set([...set].map((d) => weekStart(d, ws)));
    let w = weekStart(todayKey(), ws), n = 0;
    if (!weeks.has(w)) w = addDays(w, -7);
    while (weeks.has(w)) { n++; w = addDays(w, -7); }
    return n;
  }
  if (task.freq === 'once') return 0;
  return streakOverDays((d) => set.has(d), (d) => taskScheduled(task, d));
}

/* ---------- Reinicio y copias ---------- */
export function resetPoints(mode) {
  commit((s) => {
    if (mode === 'all') { s.ledger = []; return; }
    for (const c of s.children) {
      const b = s.ledger.reduce((a, e) => a + (e.childId === c.id && counts(e) ? e.points : 0), 0);
      if (b !== 0) {
        s.ledger.push({ id: uid(), ts: Date.now(), date: todayKey(), childId: c.id, type: 'reset', status: 'done',
          points: -b, title: 'Reinicio de puntos', emoji: '🔄' });
      }
    }
  });
}
export function exportJSON() {
  return JSON.stringify({ app: 'FamilyPoints', exportedAt: new Date().toISOString(), data: state }, null, 2);
}
export function importJSON(text) {
  const parsed = JSON.parse(text);
  const data = parsed && parsed.data ? parsed.data : parsed;
  if (!data || !Array.isArray(data.children) || !Array.isArray(data.tasks) || !Array.isArray(data.ledger)) {
    throw new Error('El archivo no es una copia de seguridad válida de FamilyPoints.');
  }
  commit(() => { state = migrate(data); });
}
export function wipeAll() { commit(() => { state = defaults(); }); }

/* ---------- Packs de ejemplo ---------- */
export const SAMPLE_TASKS = [
  { title: 'Hacer la cama', emoji: '🛏️', points: 2, freq: 'daily', isHabit: true },
  { title: 'Lavarse los dientes', emoji: '🪥', points: 1, freq: 'daily', isHabit: true },
  { title: 'Recoger los juguetes', emoji: '🧸', points: 2, freq: 'daily' },
  { title: 'Hacer los deberes', emoji: '📚', points: 3, freq: 'weekdays', days: [1, 2, 3, 4, 5], requiresApproval: true, isHabit: true },
  { title: 'Poner la mesa', emoji: '🍽️', points: 2, freq: 'daily' },
  { title: 'Leer 15 minutos', emoji: '📖', points: 3, freq: 'daily', isHabit: true },
  { title: 'Ayudar a recoger la cocina', emoji: '🧽', points: 2, freq: 'weekly', requiresApproval: true },
  { title: 'Pelea con hermanos', emoji: '😠', points: -3, freq: 'daily' },
];
export const SAMPLE_REWARDS = [
  { title: '30 min de pantalla', emoji: '📺', cost: 10 },
  { title: 'Elegir la cena', emoji: '🍕', cost: 20 },
  { title: 'Salida al parque', emoji: '🛝', cost: 25 },
  { title: 'Película en familia', emoji: '🎬', cost: 30 },
  { title: 'Helado', emoji: '🍦', cost: 15 },
  { title: 'Un juguete pequeño', emoji: '🎁', cost: 80 },
];
export function loadSamples({ tasks, rewards }) {
  commit((s) => {
    if (tasks) SAMPLE_TASKS.forEach((t) => s.tasks.push({ id: uid(), childIds: [], days: [], date: null,
      requiresApproval: false, isHabit: false, createdAt: Date.now(), ...t }));
    if (rewards) SAMPLE_REWARDS.forEach((r) => s.rewards.push({ id: uid(), childIds: [], ...r }));
  });
}
