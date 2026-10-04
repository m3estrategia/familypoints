// Aviso diario con Web Push: suscripción, código de avisos y notificación de prueba.
export const VAPID_PUBLIC_KEY = 'BHlNIGh60Rd4bqVXEZbJztLh68NFXdRvsDgzRoUd0oEXGLHvc2_dmYLwbijZKuFELV2VkrD4ce8rrnS4oYR3Uy4';

export const NOTIFICATION = {
  title: '👑 ¡Hora de repartir los puntos!',
  options: { body: 'Abre FamilyPoints y reparte los puntos de hoy.', icon: 'icons/icon-192.png', badge: 'icons/icon-192.png', tag: 'daily-points', data: { url: './index.html#/hoy' } },
};

export function urlBase64ToUint8Array(b64) {
  const pad = '='.repeat((4 - (b64.length % 4)) % 4);
  const raw = atob((b64 + pad).replace(/-/g, '+').replace(/_/g, '/'));
  return Uint8Array.from(raw, (c) => c.charCodeAt(0));
}

export const isStandalone = () => !!navigator.standalone || (window.matchMedia && window.matchMedia('(display-mode: standalone)').matches);

// null si todo está disponible; si no, el motivo en español.
export function pushUnavailableReason() {
  if (!('PushManager' in window) || !('serviceWorker' in navigator) || !('Notification' in window)) {
    return 'Este navegador no admite avisos. En iPhone, abre la app desde el icono de la pantalla de inicio (iOS 16.4 o superior).';
  }
  if (!isStandalone()) return 'En iPhone hay que abrir la app desde el icono de la pantalla de inicio (iOS 16.4 o superior) para poder activar los avisos.';
  return null;
}

// Debe llamarse directamente desde un gesto del usuario (el primer await es requestPermission).
export async function enablePush() {
  const perm = await Notification.requestPermission();
  if (perm !== 'granted') throw new Error('Permiso de notificaciones denegado. Actívalo en los ajustes del dispositivo.');
  const reg = await navigator.serviceWorker.ready;
  const sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY) });
  return JSON.stringify(sub.toJSON());
}

export async function testNotification() {
  if (!('Notification' in window)) throw new Error('Este dispositivo no admite notificaciones.');
  if (Notification.permission !== 'granted') {
    const perm = await Notification.requestPermission();
    if (perm !== 'granted') throw new Error('Permiso de notificaciones denegado.');
  }
  const reg = await navigator.serviceWorker.ready;
  await reg.showNotification(NOTIFICATION.title, NOTIFICATION.options);
}
