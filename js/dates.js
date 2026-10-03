// Helpers de fechas en hora LOCAL. Las fechas se representan como claves 'YYYY-MM-DD'.
const pad = (n) => String(n).padStart(2, '0');

export function toKey(d = new Date()) {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}
export function fromKey(k) {
  const [y, m, d] = k.split('-').map(Number);
  return new Date(y, m - 1, d, 12, 0, 0); // mediodía: evita problemas de cambio horario
}
export const todayKey = () => toKey(new Date());
export function addDays(k, n) {
  const d = fromKey(k);
  d.setDate(d.getDate() + n);
  return toKey(d);
}
export const dow = (k) => fromKey(k).getDay(); // 0 = domingo
export function diffDays(a, b) {
  return Math.round((fromKey(a) - fromKey(b)) / 86400000);
}
// Inicio de la semana que contiene k. startDow: 1 = lunes, 0 = domingo, 6 = sábado
export function weekStart(k, startDow = 1) {
  return addDays(k, -((dow(k) - startDow + 7) % 7));
}
export const weekDays = (startKey) => Array.from({ length: 7 }, (_, i) => addDays(startKey, i));

export const DAY_NAMES = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
export const DAY_SHORT = ['D', 'L', 'M', 'X', 'J', 'V', 'S'];
export const DAY_ABBR = ['dom', 'lun', 'mar', 'mié', 'jue', 'vie', 'sáb'];

export function formatLong(k) {
  return new Intl.DateTimeFormat('es-ES', { weekday: 'long', day: 'numeric', month: 'long' }).format(fromKey(k));
}
export function formatShort(k) {
  return new Intl.DateTimeFormat('es-ES', { day: 'numeric', month: 'short' }).format(fromKey(k));
}
export function formatRelativeDay(k) {
  const t = todayKey();
  if (k === t) return 'Hoy';
  if (k === addDays(t, -1)) return 'Ayer';
  return formatLong(k);
}
export function formatWeekRange(startKey) {
  return `${formatShort(startKey)} – ${formatShort(addDays(startKey, 6))}`;
}
export function formatTime(ts) {
  return new Intl.DateTimeFormat('es-ES', { hour: '2-digit', minute: '2-digit' }).format(new Date(ts));
}
