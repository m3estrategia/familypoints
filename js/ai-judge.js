// Juez IA (desactivado). Interfaz preparada para conectar la API de Claude más adelante.
// suggestPoints(description, child) -> Promise<{ points: number, reason: string }>
// Mientras no esté configurado, lanza un Error con code 'AI_NOT_CONFIGURED'.

export const config = { enabled: false, apiKey: null, model: null };

export function isConfigured() {
  return Boolean(config.enabled && config.apiKey);
}

export async function suggestPoints(description, child) {
  if (!isConfigured()) {
    const err = new Error('El Juez IA no está configurado todavía.');
    err.code = 'AI_NOT_CONFIGURED';
    throw err;
  }
  // TODO: llamar a la API de Claude con `description` y datos de `child` (nombre, edad)
  // y devolver { points, reason }.
  throw new Error('No implementado');
}
