// Punto de entrada: shell, rutas, pestañas y registro del service worker.
import * as S from './store.js';
import * as router from './router.js';
import { h, clear, applyTheme } from './ui.js';
import * as today from './views/today.js';
import * as approvals from './views/approvals.js';
import * as rewards from './views/rewards.js';
import * as history from './views/history.js';
import * as stats from './views/stats.js';
import * as settings from './views/settings.js';
import * as onboarding from './views/onboarding.js';

applyTheme(S.getState().settings.theme);

const TABS = [
  { path: '/hoy', label: 'Hoy', icon: '☀️' },
  { path: '/recompensas', label: 'Premios', icon: '🎁' },
  { path: '/historial', label: 'Historial', icon: '🕘' },
  { path: '/estadisticas', label: 'Estadísticas', icon: '📊' },
  { path: '/ajustes', label: 'Ajustes', icon: '⚙️' },
];
const ROUTES = {
  '/hoy': { view: today, tab: '/hoy' },
  '/aprobaciones': { view: approvals, tab: '/hoy' },
  '/recompensas': { view: rewards, tab: '/recompensas' },
  '/historial': { view: history, tab: '/historial' },
  '/estadisticas': { view: stats, tab: '/estadisticas' },
  '/ajustes': { view: settings, tab: '/ajustes' },
  '/ajustes/hijos': { view: { render: settings.renderChildren }, tab: '/ajustes' },
  '/ajustes/tareas': { view: { render: settings.renderTasks }, tab: '/ajustes' },
  '/ajustes/premios': { view: { render: settings.renderRewards }, tab: '/ajustes' },
};
Object.keys(ROUTES).forEach((p) => router.register(p, ROUTES[p]));

const app = document.getElementById('app');
const main = h('main', { class: 'view', id: 'view' });
const tabbar = h('nav', { class: 'tabbar', 'aria-label': 'Navegación principal' });
app.append(main, tabbar);

let currentPath = null;

function renderTabs(activeTab) {
  const pending = S.pendingEntries().length;
  clear(tabbar);
  TABS.forEach((t) => tabbar.append(h('a', {
    href: '#' + t.path, class: 'tab' + (t.path === activeTab ? ' on' : ''), 'aria-current': t.path === activeTab ? 'page' : null,
  },
  h('span', { class: 'tab-icon' }, t.icon, t.path === '/hoy' && pending ? h('b', { class: 'badge', 'aria-label': `${pending} pendientes` }, String(pending)) : null),
  h('span', { class: 'tab-label' }, t.label))));
}

function draw(path, route, keepScroll) {
  const y = main.scrollTop, wy = window.scrollY;
  clear(main);
  const onboarding_ = !S.getState().settings.onboarded;
  app.classList.toggle('no-tabs', onboarding_);
  try {
    if (onboarding_) onboarding.render(main);
    else { route.view.render(main); renderTabs(route.tab); }
  } catch (e) {
    console.error(e);
    main.append(h('p', { class: 'muted pad' }, 'Ha ocurrido un error al mostrar esta pantalla.'));
  }
  if (keepScroll) { main.scrollTop = y; window.scrollTo(0, wy); } else { main.scrollTop = 0; window.scrollTo(0, 0); }
}

router.start((path, route) => {
  const changed = path !== currentPath;
  currentPath = path;
  draw(path, route, !changed);
});

S.subscribe(() => {
  applyTheme(S.getState().settings.theme);
  router.refresh();
});

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('service-worker.js').catch((e) => console.warn('SW no registrado', e));
  });
}
