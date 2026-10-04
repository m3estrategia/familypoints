# FamilyPoints

Web app instalable (PWA) para tareas y hábitos familiares que dan puntos a toda la familia. HTML + CSS + JavaScript vanilla (módulos ES), sin build ni dependencias. Los datos se guardan solo en el dispositivo (`localStorage`, clave `fp:v1`).

## Probar en local

Desde esta carpeta:

```
python -m http.server 8080
```

(o `npx serve .`) y abre http://localhost:8080. Los módulos ES y el service worker necesitan http(s); no funcionan abriendo `index.html` con doble clic.

## Publicar en GitHub Pages

1. Crea un repositorio en GitHub (p. ej. `familypoints`).
2. Sube el **contenido** de esta carpeta a la raíz del repositorio (`index.html` debe quedar en la raíz).
3. En el repositorio: Settings -> Pages -> Source: "Deploy from a branch" -> Branch `main` y carpeta `/ (root)` -> Save.
4. Espera uno o dos minutos. La app estará en `https://TU-USUARIO.github.io/familypoints/`.

Todas las rutas son relativas, así que funciona bajo `/<repo>/`.

### Publicar cambios
Cambia `CACHE_VERSION` en `service-worker.js` (y `APP_VERSION` en `js/store.js`) para que los móviles descarguen la nueva versión. Si añades archivos, inclúyelos en la lista `ASSETS` del service worker.

## Instalar en el iPhone

1. Abre la URL de GitHub Pages en **Safari**.
2. Toca **Compartir** (cuadrado con flecha).
3. **Añadir a pantalla de inicio** -> Añadir.
4. Ábrela desde el icono: funciona a pantalla completa y sin conexión.

## Copias de seguridad

Ajustes -> Exportar copia (abre el menú de compartir o descarga un `.json`) e Importar copia. Los datos viven solo en el iPhone: si se borran los datos de Safari o se desinstala la app, se pierden. Exporta de vez en cuando.

## Estructura

- `index.html`, `manifest.webmanifest`, `service-worker.js`
- `css/styles.css`
- `js/app.js` (arranque), `store.js` (datos, ledger, migraciones), `router.js`, `dates.js` (fechas locales), `ui.js`, `ai-judge.js` (Juez IA, sin configurar)
- `js/views/*.js` pantallas
- `icons/` y `tools/make-icons.mjs` (regenerar iconos: `node tools/make-icons.mjs`)

## Notas de diseño

- Cada semana hay un Rey o una Reina (según el género del miembro). La clasificación y las coronas se derivan siempre a partir del ledger de movimientos; deshacer = borrar o cambiar el estado del movimiento.
- Las tareas "se reinician" de forma derivada (diarias por fecha, semanales por semana según el día de inicio configurado).
- Las tareas con puntos negativos (penalizaciones) se pueden aplicar varias veces al día.
