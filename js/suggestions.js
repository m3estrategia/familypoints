// Catálogo de tareas sugeridas (sin dependencias de DOM). Positivas: 1..5 puntos, daily/weekly. Negativas: -1..-5, daily
// (las tareas con puntos negativos son repetibles, igual que "Pelea con hermanos" del pack de ejemplo).
const P = (category, emoji, title, points, freq = 'daily', isHabit = false) => ({ kind: 'pos', category, emoji, title, points, freq, isHabit });
const N = (category, emoji, title, points) => ({ kind: 'neg', category, emoji, title, points, freq: 'daily', isHabit: false });

export const POSITIVE_CATEGORIES = ['Casa', 'Higiene', 'Estudios', 'Actitud', 'Ayudar'];
export const NEGATIVE_CATEGORIES = ['Comportamiento', 'Orden', 'Pantallas', 'Comida'];

export const SUGGESTIONS = [
  P('Casa', '🛏️', 'Hacer la cama', 2, 'daily', true),
  P('Casa', '🍽️', 'Poner o quitar la mesa', 2),
  P('Casa', '🗑️', 'Sacar la basura', 2),
  P('Casa', '🧺', 'Poner la lavadora', 3, 'weekly'),
  P('Casa', '🧹', 'Ordenar la habitación', 3),
  P('Casa', '🌱', 'Regar las plantas', 1, 'weekly'),
  P('Higiene', '🚿', 'Ducharse sin que te lo pidan', 2, 'daily', true),
  P('Higiene', '🪥', 'Lavarse los dientes', 1, 'daily', true),
  P('Estudios', '📚', 'Hacer los deberes', 3, 'daily', true),
  P('Estudios', '📖', 'Leer 20 min', 3, 'daily', true),
  P('Estudios', '🎹', 'Practicar instrumento', 3, 'daily', true),
  P('Actitud', '⚽', 'Hacer deporte', 3, 'daily', true),
  P('Actitud', '💬', 'Decir algo bonito a alguien', 1),
  P('Ayudar', '🤝', 'Ayudar a un hermano', 3),
  P('Ayudar', '🍳', 'Cocinar la cena', 5, 'weekly'),
  P('Ayudar', '🐶', 'Pasear al perro', 2, 'daily', true),

  N('Comportamiento', '😠', 'Pelear o gritar', -3),
  N('Comportamiento', '😤', 'Contestar mal', -2),
  N('Comportamiento', '🤬', 'Decir palabrotas', -2),
  N('Comportamiento', '🤥', 'Mentir', -4),
  N('Comportamiento', '⏰', 'Llegar tarde', -1),
  N('Orden', '👕', 'Dejar la ropa tirada', -1),
  N('Orden', '🍽️', 'No recoger el plato', -1),
  N('Orden', '💡', 'Dejar luces encendidas', -1),
  N('Orden', '📚', 'No hacer los deberes', -3),
  N('Pantallas', '📺', 'Pasarse de tiempo de pantalla', -3),
  N('Pantallas', '📵', 'Móvil en la mesa', -2),
  N('Comida', '😖', 'Quejarse de la comida', -1),
];

export const normTitle = (t) => String(t || '').trim().toLowerCase();
export const hasTaskWithTitle = (tasks, title) => tasks.some((t) => normTitle(t.title) === normTitle(title));

// Datos de tarea listos para S.saveTask (para todos, sin aprobación).
export const suggestionToTask = (s) => ({
  title: s.title, emoji: s.emoji, points: s.points, childIds: [], freq: s.freq, days: [], date: null,
  requiresApproval: false, isHabit: !!s.isHabit,
});
