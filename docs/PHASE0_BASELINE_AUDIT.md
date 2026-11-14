# Fase 0 — Saneamiento y auditoría de línea base

**Fecha:** 2026-11-13  
**Repositorio:** `AngelDanielC0des/monjes-rumberos`  
**Rama de trabajo:** `codex/monjes-rumberos-phase-0`  
**Rama base:** `main`  
**Commit base:** `2448be30dc88d4b58606f2f3cfd1d975d6dfecb6`

## 1. Alcance y protección de producción

Esta fase establece una línea de trabajo reproducible y documenta el estado real del repositorio antes de modificar animaciones, layout, navegación o música.

- La rama de trabajo se creó directamente desde el SHA indicado de `main`.
- No se ha fusionado, reescrito ni eliminado ninguna rama existente.
- No se han modificado archivos de `main`.
- No se ha invocado ninguna acción de Vercel ni se ha creado/promovido un deployment.
- El alcance de esta fase es documental y de saneamiento del flujo Git; no cambia el comportamiento de la web.

## 2. Arquitectura existente

La web es un sitio estático basado en HTML semántico, CSS y JavaScript nativo. No utiliza React, Next.js ni un framework de frontend.

Archivos principales:

| Área | Archivos |
|---|---|
| Documento y estructura | `index.html` |
| Estilos base y responsive | `styles.css`, `layout-fix.css` |
| Escenas, paleta y scroll | `scroll-scenes.js` |
| Estado de los personajes | `performer-motion.js` |
| Panel de ajustes | `performer-settings.js` |
| Interacciones generales | `app.js` |
| Build estático | `scripts/build-static.sh` |
| Pruebas | `tests/smoke-test.mjs`, `tests/browser-check.py` |
| CI | `.github/workflows/ci.yml` |

El build copia los recursos de runtime a `public/`. Vercel utiliza esa carpeta como salida estática.

## 3. Auditoría de `main`

### 3.1 Estructura HTML

Se han identificado seis secciones principales y seis perfiles de escena:

1. `inicio` — Hero.
2. `manifiesto` — Manifiesto.
3. `ritual` — El ritual.
4. `formatos` — Formatos.
5. Sección de sonido — perfil `data-scene="sound"`.
6. `booking` — Booking.

Hallazgo: la sección de sonido no tiene un identificador HTML propio (`id="sonido"`) y la navegación principal no ofrece un enlace directo a ella. Debe corregirse al abordar la navegación, no mediante una modificación aislada en esta fase.

El HTML de `main` no contiene marcadores de conflicto Git. En la auditoría estática no se detectaron IDs duplicados ni enlaces internos cuyo destino no exista.

### 3.2 Altura y composición

La corrección existente de layout resuelve principalmente el ancho completo (*full-bleed*), no la altura exacta del viewport.

Reglas representativas de `layout-fix.css`:

- Hero: `min-height: max(690px, min(980px, calc(100svh - 92px)))`.
- Secciones normales: padding vertical fluido con `clamp(72px, 7vw, 128px)` y `clamp(82px, 8vw, 144px)`.
- Sonido: padding vertical independiente.
- Las tarjetas de formatos conservan alturas mínimas propias.

No existe un sistema general de secciones basado en `100dvh`. La suite de navegador comprueba el ancho de las secciones, pero no exige que cada altura sea igual a la altura útil del viewport.

**Decisión de implementación:** adoptar `100dvh` como objetivo de composición, con fallback, Grid/Flexbox y medidas fluidas. Si el contenido real no cabe —por altura reducida, zoom, texto ampliado o controles— la sección debe poder crecer y permitir scroll. No se recortará contenido para satisfacer una igualdad geométrica artificial.

### 3.3 Animación de los monjes

El manifiesto `assets/monks/dance/manifest.json` declara:

| Propiedad | Monje izquierdo | Monje derecho |
|---|---:|---:|
| Fotogramas | 9 | 9 |
| Duración por fotograma | 280 ms | 280 ms |
| Duración del ciclo | 2.520 ms | 2.520 ms |
| WebP animado | 129.818 bytes | 157.672 bytes |
| GIF fallback | 296.096 bytes | 317.256 bytes |
| Póster WebP | 14.364 bytes | 19.044 bytes |

La cadencia declarada es aproximadamente **3,57 fotogramas por segundo** (1.000 / 280), insuficiente para una sensación de baile fluida. Aumentar la velocidad de reproducción de los mismos nueve fotogramas no resolvería la falta de muestras intermedias.

El controlador actual ya aporta una base útil:

- Estados `dancing`, `paused` y `hidden`.
- Póster estático para pausa.
- Pausa efectiva al ocultarse la pestaña.
- Respeto a `prefers-reduced-motion`.
- API pública `window.MonjesPerformers`.
- Ausencia de polling con `setInterval`.

Limitación de procedencia: el manifiesto referencia archivos fuente bajo `assets/source/`, pero ese directorio y los masters no están incluidos en el árbol de `main`. El repositorio sí contiene los WebP/GIF optimizados y los pósteres. La interpolación inicial tendrá que partir de los recursos disponibles, salvo que se recuperen masters externos.

**Decisión aprobada:** mantener el formato WebP interpolado como primera vía, apuntando a 25–30 FPS y ciclos sin saltos visibles. La aceptación dependerá de la calidad real de manos, máscara, cruces, túnicas, transparencia y continuidad del bucle. No se declarará alcanzado el objetivo solo por el número nominal de fotogramas.

### 3.4 Navegación y accesibilidad

En `main` no existe un controlador dedicado a la navegación entre secciones con flechas arriba/abajo. Tampoco hay un sistema general de scroll-snap para las secciones.

Sí existen bases reutilizables:

- Enlace para saltar al contenido.
- Navegación HTML convencional por anclas.
- Estados ARIA en el menú móvil y el panel de personajes.
- Respeto a movimiento reducido en los sistemas actuales.
- Actualización de escenas mediante eventos de scroll y `requestAnimationFrame`.

La navegación nueva deberá preservar el scroll nativo y no interceptar teclas dentro de formularios, controles, reproductor, menú o paneles interactivos. Se evaluará `scroll-snap-type: y proximity` como ayuda, no como mecanismo obligatorio que bloquee el movimiento.

### 3.5 Pruebas existentes

La configuración actual incluye:

- `npm run check`: comprobaciones de sintaxis para los cuatro controladores JavaScript existentes.
- `npm run test:smoke`: estructura HTML, referencias, manifiestos, integridad de assets y reglas CSS.
- `npm run test:browser`: Chromium mediante Playwright.
- `npm run build`: generación del sitio estático en `public/`.

Viewports actuales de la prueba de navegador:

- 2048 × 1134
- 1440 × 900
- 1024 × 768
- 768 × 900
- 390 × 844
- 320 × 740

La suite comprueba, entre otros aspectos, ausencia de overflow horizontal, ancho de secciones, carga de escenas, control de personajes, reduced motion, menú móvil y formulario.

Huecos respecto al objetivo aprobado:

- No comprueba altura de sección igual a viewport.
- No comprueba navegación con flechas, PageUp/PageDown, Home y End.
- No mide fluidez visual/FPS de la animación.
- No comprueba un reproductor ni búsqueda de YouTube.
- No cubre de forma explícita el conjunto de resoluciones bajas y orientación horizontal que se añadirá a la matriz de regresión.

### 3.6 CI y build

El workflow `.github/workflows/ci.yml` ejecuta Node 22, Python 3.12, Playwright/Chromium, pruebas y build estático.

La ejecución más reciente disponible para el commit base fue:

- Run: `43386816104`
- Resultado: `success`
- Checkout, instalación, comprobaciones JS/smoke, regresión Chromium y build: todos completados correctamente.

El workflow actual se dispara en pushes a `main` y Pull Requests dirigidos a `main`. Un push aislado a esta rama no activa el workflow; el PR de revisión se utilizará para ejecutar la validación de CI sin integrar cambios en producción.

## 4. Auditoría de `mi-rama-trabajo`

La rama experimental no es una base segura para continuar:

- Head observado: `4004124b1c9fc229cd90dded037e316bf6742148`.
- Su commit padre es `1dfab2a2ca3c45429ed234583122bbdfb8f70f0e`, no el commit base de `main`.
- La comparación de GitHub entre `main` y `mi-rama-trabajo` responde: `No common ancestor between main and mi-rama-trabajo`.
- `index.html` contiene 27 líneas de marcadores de conflicto.
- `styles.css` contiene 15 líneas de marcadores de conflicto.
- La rama añade `section-navigation.js` (493 líneas), pero ese archivo no forma parte del build estático de `main`.
- El controlador experimental intercepta eventos globales de rueda/teclado y mantiene un motor de scroll animado propio. Aunque incorpora guardas, su complejidad no se justifica como primera opción para el comportamiento aprobado.

**Decisión:** no fusionar ni hacer cherry-pick masivo de esta rama. Recuperar únicamente ideas o fragmentos concretos después de revisarlos, implementándolos de forma limpia sobre la nueva rama.

## 5. Reproductor de YouTube

No existe actualmente un reproductor integrado ni un flujo de búsqueda musical en la aplicación.

Decisión aprobada:

- Integrar el reproductor oficial mediante YouTube IFrame Player API.
- Incorporar búsqueda de vídeos mediante YouTube Data API v3.
- Gestionar estados de carga, reproducción, pausa, error y resultados vacíos.
- Respetar la interacción voluntaria del usuario y las restricciones del reproductor.
- Configurar la API key con restricciones de origen/referrer y cuotas; no tratar una clave incluida en frontend como un secreto.
- Mantener el panel utilizable con teclado, lectores de pantalla y pantallas pequeñas.

La implementación y validación de la API se hará en su fase específica; esta auditoría no crea credenciales ni consume cuota.

## 6. Decisiones de diseño aprobadas

| Área | Decisión |
|---|---|
| Baile | WebP interpolado, objetivo 25–30 FPS |
| Música | Búsqueda con YouTube Data API v3 + reproducción IFrame oficial |
| Secciones | 100dvh cuando el contenido cabe; expansión accesible cuando sea necesario |
| Layout | CSS Grid para composición y Flexbox para alineación |
| Navegación | Scroll nativo, anclas, teclado y scroll-snap proximity como ayuda |
| Accesibilidad | Movimiento reducido, foco visible, controles semánticos y sin secuestro de teclado |
| Despliegue | Preview verificada antes de cualquier promoción |

## 7. Entrega y criterios de salida de Fase 0

- [x] Crear rama limpia directamente desde el SHA de `main`.
- [x] Mantener `main` y la rama experimental sin cambios.
- [x] Confirmar que la rama experimental no se puede fusionar de forma segura.
- [x] Auditar estructura, layout, animación, navegación, build, pruebas y CI.
- [x] Registrar decisiones aprobadas y riesgos de procedencia de assets.
- [ ] Ejecutar CI sobre el PR de esta entrega documental.
- [ ] Confirmar que el PR sigue sin fusionar.

**Siguiente fase:** Fase 1 — mejora de la animación de los monjes. La implementación empezará solo después de verificar la entrega documental y la ejecución de CI de esta fase.
