// Test de la lógica del Rey con un localStorage simulado. Uso: node tools/test-king.mjs
import assert from 'node:assert/strict';

let n = 0;
async function load(data) {
  const mem = new Map();
  if (data) mem.set('fp:v1', JSON.stringify(data));
  globalThis.localStorage = { getItem: (k) => (mem.has(k) ? mem.get(k) : null), setItem: (k, v) => mem.set(k, String(v)), removeItem: (k) => mem.delete(k) };
  return import('../js/store.js?n=' + (n++));
}

const W1 = '2026-09-14', W2 = '2026-09-21', W3 = '2026-09-28'; // lunes
const kid = (id) => ({ id, name: id, avatar: '🙂', color: '#fff', archived: false, role: 'child' });
let eid = 0;
const task = (childId, date, points, ts, extra = {}) => ({ id: 'e' + (eid++), ts, date, childId, type: 'task', status: 'done', points, title: 't', emoji: '⭐', ...extra });
const manual = (childId, date, points, ts) => ({ ...task(childId, date, points, ts), type: 'manual' });
const base = (ledger, extra = {}) => ({ schema: 2, settings: { weekStart: 1, onboarded: true }, children: [kid('a'), kid('b'), kid('c')], tasks: [], rewards: [], ledger, ...extra });
const T = (d, h = 10) => new Date(`${d}T${String(h).padStart(2, '0')}:00:00`).getTime();

const tests = [];
const test = (name, fn) => tests.push([name, fn]);

test('semana sin datos: sin ganador ni rey', async () => {
  const S = await load(base([]));
  assert.equal(S.weekWinner(W1), null);
  assert.equal(S.kingOf(W1), null);
  assert.equal(S.kingOf(W3), null);
  assert.deepEqual(S.kingHistory(), []);
});

test('ganador simple y rey de la semana siguiente', async () => {
  const S = await load(base([task('a', W1, 3, T(W1)), task('b', '2026-09-15', 5, T('2026-09-15')), task('c', W1, -2, T(W1, 11))]));
  assert.equal(S.weekWinner(W1), 'b');
  assert.equal(S.kingOf(W1), null);
  assert.equal(S.kingOf(W2), 'b');
  assert.equal(S.kingOf('2026-09-24'), 'b'); // cualquier día de la semana W2
  assert.equal(S.kingOf(W3), null); // W2 sin datos -> sin ganador -> sin rey
});

test('nadie con puntos > 0: sin ganador', async () => {
  const S = await load(base([task('a', W1, -2, T(W1)), manual('b', W1, 0, T(W1))]));
  assert.equal(S.weekWinner(W1), null);
  assert.equal(S.kingOf(W2), null);
});

test('desempate por tareas completadas', async () => {
  // a: una tarea de 6; b: tres tareas de 2 -> mismos puntos, gana b por tareas
  const S = await load(base([
    task('a', W1, 6, T(W1, 8)),
    task('b', W1, 2, T(W1, 9)), task('b', W1, 2, T(W1, 10)), task('b', W1, 2, T(W1, 11)),
  ]));
  assert.equal(S.weekStanding(W1).ranking[0].points, 6);
  assert.equal(S.weekWinner(W1), 'b');
});

test('desempate por tiempo (quien llegó antes a su total)', async () => {
  const S = await load(base([
    task('b', W1, 2, T(W1, 9)), task('b', W1, 3, T('2026-09-15', 9)),
    task('a', W1, 2, T(W1, 8)), task('a', W1, 3, T('2026-09-15', 10)),
  ]));
  assert.equal(S.weekWinner(W1), 'b'); // 5 pts y 2 tareas ambos; b llegó a las 9:00, a a las 10:00
  const S2 = await load(base([
    task('a', W1, 5, T(W1, 9), {}), manual('a', W1, 0, T(W1, 23)), // los movimientos de 0 puntos no cuentan como llegada
    manual('b', W1, 5, T(W1, 8)),
  ]));
  // a: 5 pts 1 tarea; b: 5 pts 0 tareas -> gana a por tareas
  assert.equal(S2.weekWinner(W1), 'a');
  const S3 = await load(base([manual('a', W1, 5, T(W1, 9)), manual('b', W1, 5, T(W1, 8))]));
  assert.equal(S3.weekWinner(W1), 'b');
});

test('el rey queda excluido de la semana que reina', async () => {
  const S = await load(base([
    task('b', W1, 5, T(W1)), task('a', W1, 2, T(W1)),
    task('b', W2, 50, T(W2)), task('a', W2, 4, T(W2)), task('c', W2, 3, T(W2)), // b es rey en W2: sus puntos no cuentan
  ]));
  assert.equal(S.kingOf(W2), 'b');
  const st = S.weekStanding(W2);
  assert.equal(st.king, 'b');
  assert.ok(!st.ranking.some((r) => r.id === 'b'));
  assert.equal(S.weekWinner(W2), 'a');
  assert.equal(S.kingOf(W3), 'a');
  const hist = S.kingHistory();
  assert.deepEqual(hist.filter((k) => k.week <= W3).map((k) => [k.week, k.king]), [[W3, 'a'], [W2, 'b']]);
  assert.equal(hist.find((k) => k.week === W2).points, 5);
});

test('rey inicial: solo la semana configurada, antes de tener datos', async () => {
  const S = await load(base([task('a', W2, 3, T(W2))], { settings: { weekStart: 1, onboarded: true, initialKing: 'c', initialKingWeek: W1 } }));
  assert.equal(S.kingOf(W1), 'c');
  assert.equal(S.weekStanding(W1).ranking.some((r) => r.id === 'c'), false);
  assert.equal(S.weekWinner(W1), null);
  assert.equal(S.kingOf(W2), null); // el rey inicial no se arrastra
  const S2 = await load(base([]));
  S2.setInitialKing('b');
  assert.equal(S2.currentKingId(), 'b');
  assert.equal(S2.getState().settings.initialKingWeek, S2.currentWeek());
  S2.setInitialKing(null);
  assert.equal(S2.currentKingId(), null);
});

test('deshacer un movimiento cambia ganador y reyes en cascada', async () => {
  const big = task('a', W1, 10, T(W1, 12));
  const S = await load(base([
    big, task('b', W1, 6, T(W1)),
    task('b', W2, 4, T(W2)), task('c', W2, 1, T(W2)), task('a', W2, 99, T(W2)), // a es rey en W2 (no compite)
  ]));
  assert.equal(S.kingOf(W2), 'a');
  assert.equal(S.weekWinner(W2), 'b');
  assert.equal(S.kingOf(W3), 'b');
  S.removeEntry(big.id);
  assert.equal(S.weekWinner(W1), 'b');
  assert.equal(S.kingOf(W2), 'b');
  assert.equal(S.weekWinner(W2), 'a'); // ahora a (99) gana W2 porque ya no es rey
  assert.equal(S.kingOf(W3), 'a');
});

test('pendientes y rechazadas no cuentan', async () => {
  const S = await load(base([
    task('a', W1, 9, T(W1), { status: 'pending' }), task('c', W1, 9, T(W1), { status: 'rejected' }),
    task('b', W1, 1, T(W1), { status: 'approved' }),
  ]));
  assert.equal(S.weekWinner(W1), 'b');
});

test('el Rey no puede recibir puntos y grantedBy se guarda', async () => {
  const S = await load(base([]));
  S.setInitialKing('b');
  assert.equal(S.manualPoints({ childId: 'b', points: 3, title: 'x' }), null);
  const e = S.manualPoints({ childId: 'a', points: 3, title: 'x' });
  assert.equal(e.grantedBy, 'b');
  S.saveTask({ title: 't', emoji: '⭐', points: 2, childIds: [], freq: 'daily', requiresApproval: true });
  const t = S.getState().tasks[0];
  assert.equal(S.completeTask(t.id, 'b'), null);
  const p = S.completeTask(t.id, 'c');
  assert.equal(p.status, 'pending');
  assert.equal(p.grantedBy, 'b');
  S.approveEntry(p.id);
  assert.equal(S.getState().ledger.find((x) => x.id === p.id).grantedBy, 'b');
});

test('migración desde datos v1 sin pérdida', async () => {
  const v1 = {
    schema: 1, settings: { theme: 'dark', weekStart: 0, onboarded: true, aiJudge: false, lastChild: 'all' },
    children: [{ id: 'x', name: 'Ana', avatar: '🦊', color: '#f00', age: 7, archived: false, createdAt: 1 }, { id: 'y', name: 'Leo', avatar: '🐼', color: '#0f0', age: '', archived: true, createdAt: 2 }],
    tasks: [{ id: 't1', title: 'Cama', emoji: '🛏️', points: 2, childIds: [], freq: 'daily', days: [] }],
    rewards: [{ id: 'r1', title: 'Helado', emoji: '🍦', cost: 15, childIds: [] }],
    ledger: [task('x', W1, 4, T(W1))],
  };
  const copy = JSON.parse(JSON.stringify(v1));
  const S = await load(v1);
  const st = S.getState();
  assert.equal(st.schema, 4);
  assert.ok(st.children.every((c) => c.role === 'child'));
  assert.equal(st.children[0].name, 'Ana');
  assert.equal(st.children[1].archived, true);
  assert.deepEqual(st.tasks, copy.tasks.map((t, i) => ({ ...t, order: i })));
  assert.deepEqual(st.rewards, copy.rewards);
  assert.deepEqual(st.ledger, copy.ledger);
  assert.equal(st.settings.theme, 'dark');
  assert.equal(st.settings.weekStart, 0);
  assert.equal(st.settings.initialKing, null);
  assert.equal(st.settings.lastCoronationShown, null);
  assert.equal(S.balance('x'), 4);
  // Importar una copia v1 también migra
  S.importJSON(JSON.stringify({ app: 'FamilyPoints', data: copy }));
  assert.equal(S.getState().children[0].role, 'child');
  assert.equal(S.APP_VERSION, '1.3.0');
  assert.ok(S.getState().children.every((c) => c.gender === 'm' || c.gender === 'f'));
});

test('migración de gender: avatar y nombre', async () => {
  const mk = (id, name, avatar, extra = {}) => ({ id, name, avatar, color: '#fff', archived: false, role: 'child', ...extra });
  const S = await load({ schema: 2, settings: { weekStart: 1, onboarded: true }, tasks: [], rewards: [], ledger: [],
    children: [mk('p', 'Ana', '👸'), mk('l', 'Leo', '🦁'), mk('m', 'Mamá', '🙂', { role: 'parent' }), mk('a', 'abuela', '🙂'),
      mk('s', 'Sira', '🦸‍♀️'), mk('v', 'Eva', '🧜‍♀️'), mk('k', 'Kai', '🙂', { gender: 'f' })] });
  const g = Object.fromEntries(S.getState().children.map((c) => [c.id, c.gender]));
  assert.deepEqual(g, { p: 'f', l: 'm', m: 'f', a: 'f', s: 'f', v: 'f', k: 'f' });
  assert.equal(S.getState().schema, 4);
});

test('royal() devuelve las palabras según el género', async () => {
  await load(base([]));
  const { royal } = await import('../js/ui.js');
  assert.deepEqual(royal({ gender: 'f' }), { title: 'Reina', theNew: 'la nueva Reina', the: 'la Reina', viva: '¡Viva la Reina!' });
  assert.deepEqual(royal({ gender: 'm' }), { title: 'Rey', theNew: 'el nuevo Rey', the: 'el Rey', viva: '¡Viva el Rey!' });
  assert.equal(royal(undefined).title, 'Rey');
});

const tk = (id, extra = {}) => ({ id, title: id, emoji: '⭐', points: 1, childIds: [], freq: 'daily', days: [], ...extra });
const order = (S) => S.sortedTasks().map((t) => t.id);

test('migración v3 -> v4: order según el array, sin perder datos', async () => {
  const tasks = [tk('x'), tk('y'), tk('z')];
  const S = await load(base([], { schema: 3, tasks: JSON.parse(JSON.stringify(tasks)) }));
  const st = S.getState();
  assert.equal(st.schema, 4);
  assert.deepEqual(st.tasks.map((t) => [t.id, t.order, t.title]), [['x', 0, 'x'], ['y', 1, 'y'], ['z', 2, 'z']]);
  assert.deepEqual(S.tasksForDay('a').map((r) => r.task.id), ['x', 'y', 'z']);
  assert.equal(JSON.parse(globalThis.localStorage.getItem('fp:v1')).schema, 4); // persistida
});

test('reorderTasks, tareas nuevas al final y duplicado tras la original', async () => {
  const S = await load(base([], { schema: 4, tasks: [tk('x', { order: 0 }), tk('y', { order: 1 }), tk('z', { order: 2 })] }));
  S.reorderTasks(['z', 'x', 'y']);
  assert.deepEqual(order(S), ['z', 'x', 'y']);
  assert.deepEqual(S.tasksForDay('a').map((r) => r.task.id), ['z', 'x', 'y']);
  assert.deepEqual(S.getState().tasks.map((t) => t.order), [0, 1, 2]);
  S.reorderTasks(['y']); // ids parciales: el resto conserva su orden relativo
  assert.deepEqual(order(S), ['y', 'z', 'x']);
  const n = S.saveTask({ title: 'nueva', emoji: '⭐', points: 1, childIds: [], freq: 'daily' });
  assert.equal(order(S).at(-1), n);
  const d = S.duplicateTask('z');
  assert.deepEqual(order(S), ['y', 'z', d, 'x', n]);
  assert.deepEqual(S.sortedTasks().map((t) => t.order), [0, 1, 2, 3, 4]);
});

test('añadir una propuesta como tarea (y detectar duplicado por título)', async () => {
  const S = await load(base([]));
  const { SUGGESTIONS, suggestionToTask, hasTaskWithTitle } = await import('../js/suggestions.js');
  const pos = SUGGESTIONS.filter((x) => x.kind === 'pos'), neg = SUGGESTIONS.filter((x) => x.kind === 'neg');
  assert.ok(pos.length >= 12 && pos.length <= 18 && neg.length >= 12 && neg.length <= 18);
  assert.ok(pos.every((x) => x.points >= 1 && x.points <= 5) && neg.every((x) => x.points <= -1 && x.points >= -5));
  const sug = neg.find((x) => x.title === 'Pelear o gritar');
  assert.equal(hasTaskWithTitle(S.getState().tasks, sug.title), false);
  const id = S.saveTask(suggestionToTask(sug));
  const t = S.getTask(id);
  assert.ok(t.id && t.id === id && t.order === 0);
  assert.deepEqual([t.title, t.points, t.freq, t.childIds], [sug.title, sug.points, 'daily', []]);
  assert.ok(S.repeatable(t));
  assert.equal(hasTaskWithTitle(S.getState().tasks, ' pelear o gritar '), true);
  S.deleteTask(id); // deshacer
  assert.equal(S.getState().tasks.length, 0);
});

let fail = 0;
for (const [name, fn] of tests) {
  try { await fn(); console.log('ok   ', name); } catch (e) { fail++; console.log('FALLA', name, '\n', e.message); }
}
console.log(fail ? `${fail} fallos` : 'Todos los tests pasan');
process.exit(fail ? 1 : 0);
