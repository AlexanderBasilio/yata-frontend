# Actualizaciones PWA y analítica GA4

## Alcance y límites

Se mantiene Angular SPA/PWA, Firebase Hosting y el contrato actual de las APIs. No se borran carrito, sesión, direcciones ni caches por la fuerza. En `localStorage`, el código nuevo solo escribe la preferencia `zisify_analytics_consent_v1`; GA4 puede escribir sus cookies tras aceptar. El frontend usa el flujo web de Zisify con ID de medición `G-YEE37VXVQX` e ID de flujo `14933976642`; no se creó una propiedad nueva.

GA4 mide comportamiento, no es el registro contable de pedidos. Los usuarios que rechacen la analítica, los bloqueadores y las pérdidas de conexión producen datos parciales. No se registran retroactivamente acciones anteriores al consentimiento. No se añadieron grabaciones de sesión ni mapas de calor.

## Cómo se actualiza la aplicación

- `SwUpdate` busca después de estabilizar Angular, al volver a primer plano, al recuperar conexión y cada 15 minutos mientras la página esté visible. Se limita a una comprobación por minuto y una solicitud simultánea.
- Se muestra el botón solo cuando una versión completa está lista (`VERSION_READY`), o un aviso de recuperación cuando el worker informa un estado irrecuperable.
- “Más tarde” pospone el aviso hasta la siguiente navegación/comprobación. No se recarga automáticamente.
- “Actualizar ahora” pide confirmación y vuelve a comprobar versiones antes de recargar. Si no hay conexión, falla la comprobación o no responde en 30 segundos, se conserva la aplicación actual y se permite reintentar.
- No se permite recargar en carrito/checkout, con el modal de pago, con el modal de personalización de platillos, con el modal de autenticación o con artículos en el carrito antiguo de licores (ese carrito vive en memoria).
- La recarga no cambia `localStorage`; tampoco se llama a `activateUpdate`, `unregister` ni `caches.delete`.
- Se conservan los grupos de recursos y `prefetch` del service worker. No se agregó caché de respuestas de APIs, precios, pagos ni datos personales.

### Primera publicación

Los clientes que estén ejecutando la versión antigua todavía NO contienen este botón. Necesitan cargar esta primera versión al recargar/reabrir. No es posible insertar el aviso en una pestaña que sigue ejecutando código antiguo. Una vez adoptada esta versión, los despliegues siguientes ya tienen el mecanismo de aviso. Una PWA cerrada/suspendida tampoco puede prometer actualización inmediata; se comprueba al volver.

### Cabeceras

Las reglas son disjuntas y se aplican antes del rewrite de Firebase:

| Recurso | Política |
| --- | --- |
| `/`, rutas sin extensión e HTML | `no-cache, no-store, must-revalidate, max-age=0` |
| `ngsw.json`, worker, safety worker, manifest | La misma política sin caché HTTP |
| `main/chunk/polyfills/styles/scripts-XXXXXXXX.js/css` | Un año e `immutable` |
| Otros recursos | Comportamiento normal de Hosting y grupos existentes del worker |

No confundir Cache Storage (versiones PWA) con `localStorage` (estado de negocio). Angular añade un parámetro de cache-busting al solicitar `ngsw.json`; las cabeceras preventivas no sustituyen la gestión del ciclo de versiones.

## Configuración necesaria en Google Analytics antes de publicar

Esta parte está en la cuenta de Google, no en el repositorio. No fue modificada automáticamente.

1. Abrir la propiedad que contiene el flujo web de Zisify (`G-YEE37VXVQX`, flujo `14933976642`) y configurar su URL como `https://www.zisify.com/`. El dominio sin `www` redirige a este dominio canónico.
2. En **Administrador → Flujos de datos → flujo web → Medición mejorada**, desactivar la medición automática para este flujo. En particular las vistas por cambios del historial, interacciones con formularios y búsquedas automáticas. El frontend envía vistas manuales y acciones explícitas; dejar el seguimiento automático puede duplicar vistas o enviar parámetros no controlados. Si se reutiliza el mismo flujo en comercios/repartidores, revisar primero su instrumentación: el cambio de consola afecta al flujo completo.
3. No activar Google Signals, datos proporcionados por usuarios ni personalización publicitaria para esta implementación. La configuración cliente también desactiva Signals/personalización y deniega almacenamiento y uso de datos publicitarios.
4. Crear dimensiones personalizadas de **ámbito Evento**: `button_id`, `screen_name`, `checkout_step`, `payment_step`, `flow_stage`, `http_status` y `update_action`.
5. Si se necesitan conversiones, marcar `order_created` o `payment_reported` como eventos clave, etiquetándolos como **pedido creado** y **pago reportado**, nunca como pago aprobado.
6. Validar con DebugView/Tag Assistant en el dominio de producción tras aceptar cookies. Confirmar una vista por pantalla, nombres de botones, pasos, referrer y ausencia de información personal. No generar pedidos reales solo para probar; usar datos de pruebas autorizados si se prueba el flujo transaccional.

GA4 solo se carga en builds de producción con host `zisify.com` o `www.zisify.com` y consentimiento aceptado. No se envía desde localhost, builds development ni canales `web.app` de preview. Para habilitar un entorno de QA real de analítica, usar una propiedad separada mediante una configuración explícita, no reutilizar silenciosamente la propiedad productiva.

## Eventos y significado

| Evento | Cuándo se emite |
| --- | --- |
| `page_view` | Primera navegación completada y cambios de ruta; también pantalla actual al aceptar cookies |
| `ui_click` | Clic en un control etiquetado y permitido; `button_id` identifica la acción |
| `view_item` | Se abrió un platillo disponible y su detalle ya está cargado |
| `add_to_cart` | La API confirmó la adición de comida; en licores, después de agregar al carrito local |
| `view_cart` | Primera carga no vacía del carrito de comidas en esa visita |
| `begin_checkout` | Usuario continúa desde un carrito de comidas no vacío |
| `checkout_step_view` | `delivery`, `review` o `order_created`, al entrar al paso |
| `order_created` | Respuesta exitosa de la API de creación del pedido |
| `payment_step_view` | Paso 1, 2 o 3 del modal de transferencia manual |
| `payment_reported` | Respuesta exitosa de `reportPayment`; no indica aprobación |
| `flow_error` | Fallo en agregar comida, cotizar, crear pedido o reportar pago; solo etapa y status HTTP |
| `pwa_update` | Versión lista, aceptada, pospuesta o error de actualización |

Los clics son intentos, no éxitos de negocio. El registro de nombres está en `src/app/core/services/analytics/analytics-events.ts`; las etiquetas `data-analytics` están en las plantillas. No se leen textos de botones, href, formularios ni contraseñas. Nuevos controles deben recibir un nombre fijo en esa lista.

Las rutas se agrupan; por ejemplo, restaurantes → `/food/restaurant/:id`. Se eliminan query strings, fragments, parámetros de matriz e identificadores dinámicos. No se envían códigos de pedido, usuario, carrito, operaciones, datos de formularios, geolocalización ni errores crudos. Los eventos de productos solo incluyen ID de catálogo, cantidad y precio base. El `value` calculado es precio base × cantidad: **excluye extras, descuentos, delivery y tasas; no representa facturación**.

Se retiró la carga de Vercel Analytics para no añadir un segundo canal de medición ajeno al consentimiento. Su dependencia permanece instalada, pero no se importa ni se ejecuta.

## Reportes sugeridos

- **Páginas y pantallas:** usar título/path para saber qué pantallas visitan. La pantalla de checkout tiene subpasos, por eso requiere también sus eventos.
- **Exploración de rutas:** partir de Landing o Servicios y observar pantallas siguientes. El último evento es una aproximación al punto de salida, no una prueba de por qué se fue el usuario.
- **Embudo:** catálogo → detalle de restaurante → `add_to_cart` → `view_cart` → `begin_checkout` → checkout `review` → `order_created` → `payment_reported`.
- **Botones:** exploración de formato libre, filtro `event_name = ui_click`, filas `button_id` y `screen_name`, métricas número de eventos y usuarios totales. Ordenar por eventos y segmentar por dispositivo.
- **Fricción:** tabla de `flow_stage`/`http_status` y usuarios afectados. Un error de conexión se registra como status 0; no se envía el mensaje del servidor.

## Pruebas y publicación segura

1. `node scripts/verify-cache-config.cjs`: revisa rutas, controles y assets con hash sin publicar.
2. Ejecutar las pruebas focalizadas con `ng test --watch=false --browsers=ChromeHeadless --include="src/app/core/services/analytics/*.spec.ts" --include="src/app/core/services/app-update/*.spec.ts" --include="src/app/shared/components/app-notices/*.spec.ts" --include="src/app/app.spec.ts"`.
3. Compilar normalmente con el flujo `inject-token.js` existente para insertar el token público de Mapbox. El build `dist/codex-verification` generado durante la revisión es solo para pruebas; no se debe usar como artefacto de publicación porque no ejecutó la inyección de Mapbox.
4. Validar primero en un canal de preview de Firebase Hosting, no en producción. Probar Android Chrome y Safari/PWA iOS, conexión lenta, otra pestaña abierta, consentimiento, carrito/checkout y posterior publicación de una segunda versión sobre el mismo canal.
5. Publicar exclusivamente Hosting tras aprobación. Comprobar las cabeceras de `/zisify`, `/food/catalog`, `/ngsw.json`, `/ngsw-worker.js` y un bundle con hash. No basta comprobar `/index.html`.
6. Ante regresión, restaurar el release anterior de Hosting y comprobar detección. No usar limpieza masiva de almacenamiento del usuario como rollback.

### Simulación local del worker real

Compilar producción hacia `dist/codex-verification`, ejecutar `node scripts/serve-pwa-verification.cjs` y abrir `http://127.0.0.1:4301/privacy`. Una vez instalada la PWA, una solicitud POST local a `/__qa/release` incrementa solamente `appData` del manifiesto servido; no escribe los archivos ni toca Firebase. Una nueva navegación externa o comprobación del worker detecta la versión. Este servidor es solo de desarrollo y escucha exclusivamente en loopback. No sustituye la prueba con dos builds distintos en preview ni la validación de cabeceras reales de Hosting.

## Backend pendiente solo si se requieren ventas confirmadas

No se añadió `purchase`. Para hacerlo de forma fiable hace falta confirmar el contrato del backend: cuándo se aprueba una transferencia, qué evento/estado lo acredita y cuál es el identificador transaccional estable para deduplicar. No inferir aprobación a partir de crear un pedido o reportar un número de operación. No se necesita backend adicional para la medición UI/UX implementada.

## Verificación realizada (1 de septiembre de 2026)

- Compilación Angular de producción correcta en una carpeta separada del artefacto de despliegue.
- Suite disponible: 26 pruebas ejecutadas, todas correctas. Muchos archivos de pruebas antiguos tienen su contenido comentado; este resultado no equivale a cobertura completa de todos los procesos de negocio.
- TypeScript de aplicación/pruebas y verificación de reglas de caché correctos.
- Navegador local: avisos legibles a 390 × 844, rechazo/aceptación y reapertura de preferencias comprobados.
- Worker real 20.3.27 en estado NORMAL: se sirvieron dos revisiones de manifiesto, apareció el aviso en una pestaña abierta y se observó la adopción de la segunda versión, conservando la preferencia de cookies.
- Sin pedidos de prueba sobre las APIs productivas, sin despliegue Firebase y sin cambios en la consola GA4. Pendiente validar Safari/iOS, cabeceras de Firebase en preview y recepción real de eventos en DebugView tras configurar el flujo.

## Referencias oficiales

- [Angular: comunicación con el service worker](https://angular.dev/ecosystem/service-workers/communications)
- [Firebase: configuración de Hosting](https://firebase.google.com/docs/hosting/full-config)
- [GA4: vistas manuales](https://developers.google.com/analytics/devguides/collection/ga4/views)
- [GA4: medición SPA](https://developers.google.com/analytics/devguides/collection/ga4/single-page-applications)
