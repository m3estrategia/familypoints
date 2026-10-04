// Envía el aviso diario a las suscripciones de PUSH_SUBSCRIPTIONS.
// Variables: SCHEDULE (github.event.schedule; vacío = workflow_dispatch -> envía siempre), DRY_RUN=1 (no envía),
// PUSH_SUBSCRIPTIONS (JSON: array u objeto), VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY.
// Pruebas: DRY_RUN=1 FORCE_OFFSET=2 SCHEDULE='30 18 * * *' node send-push.mjs

const madridOffset = (date = new Date()) => {
  const part = new Intl.DateTimeFormat('en', { timeZone: 'Europe/Madrid', timeZoneName: 'shortOffset' })
    .formatToParts(date).find((p) => p.type === 'timeZoneName')?.value || '';
  const m = part.match(/^GMT([+-]\d+)/);
  return m ? Number(m[1]) : NaN; // "GMT+2" -> 2
};

const schedule = (process.env.SCHEDULE || '').trim();
const dry = process.env.DRY_RUN === '1';
const offset = process.env.FORCE_OFFSET ? Number(process.env.FORCE_OFFSET) : madridOffset();

let send, reason;
if (!schedule) { send = true; reason = 'ejecución manual: se envía siempre'; }
else if (schedule === '30 18 * * *') { send = offset === 2; reason = `cron 18:30 UTC, Madrid en UTC+${offset} (se envía solo con UTC+2)`; }
else if (schedule === '30 19 * * *') { send = offset === 1; reason = `cron 19:30 UTC, Madrid en UTC+${offset} (se envía solo con UTC+1)`; }
else { send = false; reason = `cron desconocido "${schedule}"`; }

let subs = [];
try {
  const raw = (process.env.PUSH_SUBSCRIPTIONS || '').trim();
  if (raw) { const parsed = JSON.parse(raw); subs = (Array.isArray(parsed) ? parsed : [parsed]).filter((s) => s && s.endpoint); }
} catch (e) {
  console.error('PUSH_SUBSCRIPTIONS no es un JSON válido:', e.message);
  process.exit(1);
}

console.log(`Decisión: ${send ? 'ENVIAR' : 'NO enviar'} (${reason}). Suscripciones: ${subs.length}.${dry ? ' [DRY_RUN]' : ''}`);
if (!send) process.exit(0);
if (!subs.length) { console.log('OK: no hay suscripciones, nada que enviar.'); process.exit(0); }
if (dry) { console.log('DRY_RUN: no se envía nada.'); process.exit(0); }

const { default: webpush } = await import('web-push');
webpush.setVapidDetails('https://m3estrategia.github.io/familypoints/', process.env.VAPID_PUBLIC_KEY, process.env.VAPID_PRIVATE_KEY);
const payload = JSON.stringify({
  title: '👑 ¡Hora de repartir los puntos!',
  body: 'Abre FamilyPoints y reparte los puntos de hoy.',
  url: './index.html#/hoy',
});
let ok = 0, gone = 0, failed = 0;
for (const [i, sub] of subs.entries()) {
  try {
    await webpush.sendNotification(sub, payload, { TTL: 4 * 60 * 60, urgency: 'high' });
    ok++;
  } catch (e) {
    if (e.statusCode === 404 || e.statusCode === 410) {
      gone++;
      console.log(`Suscripción #${i + 1} caducada (${e.statusCode}); hay que quitarla de PUSH_SUBSCRIPTIONS: ${String(sub.endpoint).slice(0, 60)}...`);
    } else { failed++; console.log(`Suscripción #${i + 1}: error ${e.statusCode || ''} ${e.message}`); }
  }
}
console.log(`Enviados: ${ok}, caducadas: ${gone}, con error: ${failed}.`);
if (failed && !ok) process.exit(1);
