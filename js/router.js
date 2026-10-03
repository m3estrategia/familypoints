// Router mínimo basado en hash: #/hoy, #/ajustes/hijos...
const routes = new Map();
let notFound = '/hoy';
let onChange = () => {};

export function register(path, handler) { routes.set(path, handler); }
export function current() {
  const p = location.hash.replace(/^#/, '') || '/hoy';
  return p.startsWith('/') ? p : '/' + p;
}
export function go(path) {
  if (current() === path) onChange(); else location.hash = '#' + path;
}
export function back(fallback = '/ajustes') {
  if (history.length > 1) history.back(); else go(fallback);
}
export function start(cb) {
  onChange = () => {
    let path = current();
    if (!routes.has(path)) { path = notFound; location.replace('#' + path); }
    cb(path, routes.get(path));
  };
  window.addEventListener('hashchange', onChange);
  onChange();
}
export const refresh = () => onChange();
