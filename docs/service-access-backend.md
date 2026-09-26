# Cierre global y acceso del equipo: requisitos corregidos

Estado: frontend preparado, integración DESACTIVADA. No se ha cerrado producción, creado una cuenta ni cambiado el backend. Acordar este contrato antes de activar. Los endpoints siguientes son requisitos propuestos, no endpoints cuya existencia se haya verificado.

## Aclaración para enviar al backend

**No se solicita modificar el inicio de sesión de los usuarios. Google y usuario/contraseña deben seguir funcionando exactamente como ahora.** La solicitud es añadir una excepción de acceso durante el cierre para una cuenta del equipo, usando la autenticación existente. La redacción anterior sobre unificar identidades no es un requisito de esta tarea y queda sustituida por este documento.

Para el equipo se propone usuario/correo y contraseña porque el endpoint ya existe. No crear otro login ni un endpoint secreto. No es obligatorio que esa cuenta tenga Google vinculado; si se habilita Google más adelante, debe resolver el mismo permiso mediante la identidad verificada en servidor.

El frontend muestra un pequeño punto al pie de la pantalla de cierre. Al pulsarlo sin sesión se abre el login existente; con una sesión activa se ofrece cambiar de cuenta, sin cerrar sesión por el simple clic. El botón es discreto, pero puede descubrirse: la seguridad depende del permiso del backend.

## Comportamiento esperado

| Estado global | Cliente normal | Cuenta del equipo autorizada |
| --- | --- | --- |
| OPEN | Usa la aplicación y sus logins actuales | Usa la aplicación sin pantalla de cierre |
| CLOSED por horario | Ve la pantalla de cierre | Puede entrar tras iniciar sesión |
| MAINTENANCE | Ve mantenimiento | Puede entrar tras iniciar sesión |

La excepción es individual: entrar con la cuenta del equipo NO reabre el servicio para los demás ni cambia el modo global. Con OPEN se pueden desplegar cambios manteniendo el servicio abierto; con MAINTENANCE se despliega con usuarios bloqueados y el equipo puede revisar. Este control no implementa despliegues, recarga automática ni permite garantizar cero interrupciones durante un despliegue. No se realizarán cambios de configuración para desarrollo local en esta tarea.

## Lo encontrado

- `src/app/core/services/store/store-hours.service.ts`: horario fijo 00:02–23:55, America/Lima, calculado con el reloj del navegador.
- `src/app/core/guards/store-hours.guard.ts`: solo protegía food y liquor; no era un cierre global ni un control de seguridad.
- `src/app/features/service-status/components/closed-store/`: pantalla de la captura.
- El login actual usa POST `/api/v1/auth/login` y POST `/api/v1/auth/google` en platform. Ambos guardan el mismo token de aplicación; Google aporta un ID token para intercambiar. AuthResponse admite `token` o `accessToken` y varias formas de identificar al usuario. El frontend manda `role: ROLE_CUSTOMER` en el intercambio actual; ese campo nunca debe conceder privilegios.
- `authGuard` solo comprueba presencia del token. La validez y los permisos deben comprobarse en los servidores. No hay que considerar localStorage una fuente de autorización.

## Requisitos para backend

1. **Conservar los dos logins actuales de los usuarios sin cambios.** Mantener POST `/api/v1/auth/login` (credenciales) y POST `/api/v1/auth/google` (Google), sus contratos, cuentas y flujos actuales. NO eliminar métodos, fusionar cuentas, migrar usuarios ni cambiar proveedores por esta tarea. Para la cuenta del equipo, reutilizar el login por credenciales existente y la sesión JWT que ya emite. Todos los servicios deben poder validar esa sesión y consultar el permiso de acceso durante cierre. Si alguno no puede hacerlo, reportar esa incompatibilidad concreta antes de proponer cambios de arquitectura.
2. **Permiso de desarrollo administrado por servidor.** Crear mediante administración una cuenta interna nominativa con usuario/correo compatible con el login existente y contraseña almacenada con hash seguro (nunca en código o texto plano). Entregar la contraseña por un canal seguro. Asignarle `service:access:closed` mediante una operación administrativa auditada. Sin cuentas compartidas, contraseñas en código, listas de correos en frontend, parámetros de bypass ni selección de roles por el usuario. Ignorar/rechazar intentos de elevar roles en login/registro. Recomendado MFA para esta cuenta. Permitir revocar la excepción durante una sesión, sin esperar a que expire un JWT antiguo. La excepción permite entrar durante el cierre; no debe conceder permisos administrativos sobre pedidos, saldo o datos ajenos.
3. **Configuración central.** Persistir modo OPEN/CLOSED/MAINTENANCE, zona horaria IANA, horarios por día, excepciones y próxima apertura opcional. Mantenimiento debe prevalecer sobre el horario y mantenerse hasta una reapertura explícita o programada. Calcular con el reloj del servidor. Edición solo para administradores autorizados, con auditoría y propagación consistente entre servicios.
4. **Endpoint de decisión.** Implementar GET `/api/v1/service-access` en platform según el contrato de abajo. Acepta visitantes sin token y sesiones JWT válidas. Determina estado global y acceso efectivo en backend. No aceptar userId, correo ni rol del cliente para decidir. Devolver 401 para token inválido/expirado; nunca tratar un token inválido como desarrollador.
5. **Aplicación real del cierre.** Middleware/gateway en TODOS los endpoints de negocio, incluidas lecturas, escrituras y conexiones persistentes. Evaluar estado y permiso en cada petición. Cliente normal bloqueado: 503 con `{ "code": "SERVICE_MAINTENANCE" }` o `{ "code": "SERVICE_CLOSED" }`; `Retry-After` solo si se conoce. Conservar sesión del usuario ante cierre. 401 corresponde a sesión inválida y 403 a falta de permiso normal. No basta proteger este endpoint o las rutas de Angular.
6. **Excepciones limitadas.** Mantener disponibles autenticación, renovación/revocación/logout, decisión de acceso, recuperación de cuenta y recursos legales necesarios. El frontend deja accesibles `/auth/login`, `/auth/register`, `/closed`, `/privacy`, `/terms`, `/reclamaciones`. Los endpoints asociados deben tener sus propias reglas, límites de frecuencia y protección contra abuso. Mantener callbacks de pagos/webhooks necesarios para pedidos existentes sin exponerlos como acceso público general ni interrumpir operaciones ya pagadas.
7. **Sesión y transporte.** TLS, CORS con orígenes explícitos y soporte de Authorization y `ngsw-bypass`; `Cache-Control: no-store, private` y `Vary: Authorization` en la decisión. No guardar respuestas por usuario en caché compartida. Acordar expiración, renovación, revocación y logout comunes. Hoy el cliente almacena JWT en localStorage y no implementa renovación: no se migró a cookies a ciegas. Si se adoptan cookies HttpOnly/Secure, coordinar dominio, SameSite, CSRF y `withCredentials` antes del cambio.
8. **Auditoría y pruebas.** Registrar cambios de estado, asignación/revocación del permiso y acceso excepcional, sin tokens ni contraseñas. Verificar matriz de visitante/cliente/desarrollador, estados abierto/cerrado/mantenimiento, JWT caducado, falsificado y revocado, cambio de cuenta, caída del endpoint, múltiples servicios, horarios nocturnos, cambios de zona y clientes antiguos/PWA. Garantizar que el cliente no puede elevar privilegios enviando `role` o modificando almacenamiento.

## Contrato exacto que espera el frontend

GET `${platformUrl}/api/v1/service-access`, Authorization Bearer de la sesión actual cuando exista. HTTP 200 incluso cuando la decisión sea DENIED:

```json
{
  "state": "MAINTENANCE",
  "access": "DENIED",
  "message": "Estamos realizando mantenimiento. Volveremos pronto.",
  "nextOpeningAt": null
}
```

- `state`: OPEN | CLOSED | MAINTENANCE.
- `access`: PUBLIC | DEVELOPER | DENIED. PUBLIC solo permite entrar con state OPEN; DEVELOPER requiere una sesión autenticada y permiso comprobado en servidor. Usar DENIED para visitantes y clientes durante cierre/mantenimiento.
- `message`: texto público sin información interna, obligatorio; Angular lo muestra como texto.
- `nextOpeningAt`: null o fecha ISO 8601 con offset/Z, obligatoria. Es una estimación informativa, nunca dispara apertura local. La pantalla la muestra en la zona del dispositivo.
- Ante error, timeout de 10 segundos, respuesta incompleta o cambio de token durante la consulta: el frontend bloquea el acceso. No utiliza el horario local como fallback cuando esta integración está activada.
- No devolver permisos, tokens o datos privados de otros usuarios en este endpoint.

## Activación coordinada

1. Implementar y probar backend y permisos en un entorno de prueba. Probar además pedidos en curso, webhooks y cuentas actuales; nunca activar primero el bloqueo de producción.
2. Configurar `path: '/api/v1/service-access'` en `src/app/core/services/store/service-access.config.ts` para el despliegue correspondiente. Vacío conserva el comportamiento antiguo sin llamadas nuevas. Este ajuste es de despliegue, no un control de autorización.
3. Probar que Google y credenciales siguen funcionando para los usuarios actuales sin migración. Probar también navegación directa y entre hijos, cuenta del equipo por credenciales, cambio de cuenta, pérdida de red, cierre con una pantalla abierta y reapertura. Confirmar que los APIs deniegan incluso desde un cliente manipulado.
4. Desplegar frontend y backend compatibles; activar mantenimiento en servidor después de validar. Desde la pantalla cerrada, el equipo pulsa el pequeño punto del pie de pantalla y continúa al login existente `/auth/login`. Si hay otra sesión, el panel permite cambiar de cuenta explícitamente. Tras autenticarse, solo el permiso del servidor autoriza saltarse el cierre; descubrir el botón no concede acceso.
5. Reabrir desde backend. El frontend vuelve a consultar en cada navegación y cada 60 segundos en pantallas activas, además del botón de actualización. Los 503 tipificados redirigen a cierre sin borrar sesión. No promete ocultamiento instantáneo de una pantalla ya cargada: hasta 60 segundos en primer plano, y los navegadores pueden ralentizar pestañas en segundo plano.

## Límites y arquitectura

No hace falta rehacer la arquitectura si los servicios pueden compartir identidad y aplicar la misma política. Si actualmente aceptan JWT incompatibles, es necesario unificar su validación o añadir un gateway antes de habilitar esta funcionalidad.

Los guards son experiencia de usuario, no seguridad. JavaScript y recursos públicos, incluso versiones en caché de una PWA, siguen descargables/inspeccionables. Para mantener código en desarrollo privado, usar staging protegido o restricciones del hosting/gateway, y no publicar ese código en el bundle de producción. La cuenta con excepción en producción sigue accediendo a datos reales: pruebas destructivas deben ir en staging.

Fuera de alcance: cambiar el login de clientes, vincular/fusionar sus cuentas, retirar Google o contraseña, crear un sistema de despliegue o configurar entornos locales. No se solicita ninguna de esas tareas.
