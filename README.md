# Handyman — MVP

Plataforma web que conecta a clientes con profesionales verificados de mantenimiento, reparación, instalación y construcción en el área metropolitana de Ciudad de Guatemala.

Proyecto de *Gestión Empresarial y Fundamentos de Emprendimiento*, Universidad Rafael Landívar. Intraemprendimiento de Artefacto Creativo, S.A.

> **Entorno de demostración.** Todos los perfiles, teléfonos, direcciones, reseñas y montos son ficticios. Los pagos son **estados simulados**: no se cobra ni se custodia dinero, y nunca se piden datos de tarjeta.

---

## Inicio rápido

Requisitos: Node.js 20 o superior.

```bash
npm install
npm run dev
```

Abre http://localhost:3000. La primera vez se crea automáticamente la base de datos con el esquema y los datos de demostración (tarda unos segundos).

| Comando | Qué hace |
| --- | --- |
| `npm run dev` | Servidor de desarrollo |
| `npm run build` y `npm start` | Build y servidor de producción |
| `npm test` | Pruebas de reglas de negocio y validación (Vitest) |
| `npm run typecheck` | Verificación de tipos |
| `npm run db:reset` | Borra la base local y los archivos subidos. Al volver a iniciar la app se siembran los datos demo de nuevo. Detén el servidor antes de ejecutarlo. |

> **Importante en macOS con iCloud.** Si el Escritorio o Documentos se sincronizan con iCloud y el disco está casi lleno, macOS "evicta" archivos (incluidos los de `node_modules`) y la app se queda colgada al compilar. Por eso esta carpeta se llama `HNDYMN.nosync`: iCloud ignora las carpetas que terminan en `.nosync`. `Desktop/HNDYMN` es un acceso directo (symlink) a ella. No le quites el sufijo.

### Variables de entorno (opcionales)

Copia `.env.example` a `.env.local`.

| Variable | Uso |
| --- | --- |
| `AUTH_SECRET` | Secreto para firmar la cookie de sesión. Si falta, se genera uno en `.data/auth-secret`. **Obligatorio en producción.** |
| `HANDYMAN_DATA_DIR` | Carpeta de la base local y los archivos subidos (por defecto `./.data`). |
| `PAYMENT_PROVIDER` | Reservada. Solo existe `demo`. |

---

## Cuentas de demostración

Todas usan la contraseña `Handyman2026`. En la pantalla de acceso hay botones que rellenan el formulario.

| Rol | Correo | Para qué sirve |
| --- | --- | --- |
| Cliente | `cliente@handyman.demo` | Andrea: tiene solicitudes con cotizaciones, una orden programada, una pendiente de aprobar, completadas y garantías |
| Cliente | `cliente2@handyman.demo` | Roberto: tiene una orden en disputa, un reclamo de garantía y una orden en progreso |
| Profesional verificado | `electricista@handyman.demo` | Marvin: órdenes activas (programada y en progreso) |
| Profesional verificado | `plomero@handyman.demo` | Carlos: solicitudes por cotizar |
| Profesional verificado | `pintor@`, `carpintero@`, `jardin@`, `albanil@`, `multiservicios@handyman.demo` | Otros perfiles con historial y reseñas |
| Profesional pendiente | `pendiente@handyman.demo` | Diego: expediente enviado, **no puede cotizar** hasta que administración lo apruebe |
| Profesional rechazado | `rechazado@handyman.demo` | Óscar: verificación rechazada con motivo; puede volver a enviar |
| Profesional nuevo | `nuevo@handyman.demo` | Kevin: sin expediente (estado "No verificado") |
| Administración | `admin@handyman.demo` | Lucía: verificaciones, categorías, casos, usuarios y auditoría |

### Guion sugerido para la presentación (≈ 8 minutos)

1. **Visitante.** Recorre la página de inicio, `/servicios` y un perfil público de profesional.
2. **Cliente (Andrea).** En *Mis solicitudes* abre "Fuga de agua bajo el lavatrastos", compara las 3 cotizaciones y acepta una. Se crea la orden con el precio congelado y el pago aparece como "Retenido en demo".
3. En la orden, presiona **"Abrir verificación del profesional asignado"**, que es la misma página a la que apunta el QR, y confirma la identidad. Para usar el QR real, abre el panel del profesional en otra ventana y escanéalo con el teléfono conectado a la misma red; ver más abajo.
4. Abre la orden "Pintar apartamento", revisa la evidencia fotográfica y **aprueba**. Se emite la garantía escrita con fechas y términos. Califica al profesional.
5. **Profesional (Marvin).** Ve las solicitudes compatibles, que solo muestran la zona aproximada, y envía una cotización. En la orden de lámparas: "voy en camino", "llegué" y el carné con QR. Solicita una modificación de precio, que el cliente debe aprobar.
6. **Profesional pendiente (Diego).** Muestra que no puede ver solicitudes ni cotizar.
7. **Administración (Lucía).** Panel de indicadores. Aprueba a Diego, que queda registrado en la auditoría con autor, fecha y motivo. Resuelve la incidencia de la terraza y el caso de garantía de la chapa. Edita la duración de garantía de una categoría. Revisa la auditoría.

Para repetir la demostración desde cero: detén el servidor, ejecuta `npm run db:reset` y vuelve a iniciar.

**QR desde el teléfono:** ejecuta `npm run dev -- -H 0.0.0.0` y abre la app desde `http://<IP-de-tu-computadora>:3000`. El QR usa el host con el que se abrió la página.

---

## Publicar en internet (Render, gratis)

El repositorio incluye un `Dockerfile` y un `render.yaml`.

1. Sube este repositorio a GitHub.
2. En https://dashboard.render.com elige **New → Blueprint**, conecta GitHub y selecciona el repositorio. Render crea el servicio `handyman` con un `AUTH_SECRET` aleatorio.
3. El primer build tarda unos minutos. La URL queda como `https://handyman-xxxx.onrender.com`.

En el plan gratuito, el servicio se "duerme" tras 15 minutos sin visitas: la siguiente carga tarda alrededor de un minuto. Además, sin disco persistente, al reiniciarse vuelve a los datos demo iniciales. Para conservar datos, monta un disco en `/data` (plan de pago) o usa Railway con un volumen (`railway.json` incluido).

---

## Arquitectura

| Capa | Implementación en el MVP | Camino a producción |
| --- | --- | --- |
| Frontend | Next.js 14 (App Router) + React + TypeScript | Igual |
| UI | Tailwind CSS con sistema propio (tokens, componentes accesibles), íconos Lucide | Igual |
| Backend | Server Actions y Route Handlers. Toda la lógica de negocio y la autorización viven en `src/lib/services/*` | Igual |
| Base de datos | **PostgreSQL real embebido (PGlite)** persistido en `.data/pg`. Migraciones SQL estándar en `db/migrations` | Supabase/PostgreSQL: el mismo SQL. Basta reemplazar `src/lib/db/client.ts` por un pool `pg` con la misma interfaz `Exec` |
| Autenticación | Sesión propia: contraseñas con bcrypt y cookie httpOnly firmada (JWT HS256) que solo guarda el id. El rol se lee de la base en cada request | Supabase Auth, enlazando `users.auth_id`. Mantener `getSession/requireUser` |
| Autorización | Verificación de rol y propiedad en cada servicio del servidor | Además, RLS: políticas de referencia en `db/supabase/rls_policies.sql` |
| Archivos | Adaptador local: `public/` (fotos, nombres UUID) y `private/` (documentos, servidos solo a admin o dueño), con validación por firma binaria y límite de 5 MB | Supabase Storage: bucket privado y URLs firmadas |
| Pagos | Interfaz `PaymentProvider` + `DemoPaymentProvider` (`src/lib/payments/provider.ts`) | Implementar la interfaz con una pasarela autorizada en Guatemala |
| Notificaciones | Centro de notificaciones en la app | Correo o SMS |

```
src/
  app/(public)        landing, servicios, cómo funciona, profesionales, verificar/[token], legal
  app/(auth)          login, registro
  app/(customer)      /cliente: panel, solicitudes, órdenes, garantías, perfil
  app/(professional)  /pro: panel, solicitudes, cotizaciones, órdenes, verificación, perfil, historial
  app/(admin)         /admin: panel, profesionales, casos, operaciones, categorías, usuarios, auditoría
  app/actions         server actions por rol (validan con zod y delegan en servicios)
  components/ui       primitivas (badges, formularios con estado, vacíos, carga)
  components/domain   tarjetas de profesional/orden/garantía, QR, línea de tiempo, fotos
  lib/services        lógica de negocio: requests, quotes, orders, professionals, admin, accounts
  lib/domain/states   estados, etiquetas y transiciones permitidas (módulo puro, con pruebas)
  lib/auth, lib/validation, lib/payments, lib/storage, lib/db
db/migrations         esquema PostgreSQL
db/supabase           políticas RLS de referencia
tests/                pruebas Vitest
```

### Reglas de negocio implementadas en el servidor

- Solo profesionales **aprobados** ven solicitudes compatibles (oficio + zona) y pueden cotizar o ser contratados.
- Antes de contratar, el profesional ve solo la zona aproximada. La dirección exacta solo aparece en la orden, para sus participantes.
- Una sola cotización aceptada por solicitud: restricción `unique` en `orders.request_id` y transacción.
- El precio y el alcance aceptados se copian en `orders.agreed_scope_snapshot`. Los cambios requieren una modificación aprobada por el cliente y quedan auditados.
- El QR solo contiene una URL con un token aleatorio. Escanearlo no cambia nada: la confirmación exige la sesión del cliente dueño de una orden activa con ese profesional, y el token debe coincidir.
- El trabajo no puede iniciarse sin la confirmación de identidad. Solo el cliente dueño aprueba o abre una incidencia.
- Al aprobar se emite la garantía con la duración y los términos vigentes de la categoría (30 a 90 días), y se guardan las fechas de aprobación, completado, inicio y vencimiento.
- Las reseñas solo se crean tras una orden completada y por su cliente. La reputación (promedio y número de trabajos) se calcula de datos reales.
- El estado de verificación solo lo cambia administración, con transiciones validadas y motivo obligatorio para rechazar o suspender.
- Auditoría de verificaciones, aceptaciones, cambios de precio, aprobaciones, reclamos, resoluciones y cambios de categorías o usuarios.
- Montos en `numeric(12,2)` y validados como texto decimal (sin `float`). Timestamps en UTC, mostrados en hora de Guatemala.
- Límite de intentos en login, registro, solicitudes, cotizaciones, mensajes y subidas. Las server actions incluyen protección de origen (CSRF) de Next.js.

---

## Estado de las funcionalidades

### Completas y funcionales (persisten datos)

- Sitio público: inicio, catálogo filtrable de 18 oficios, cómo funciona, directorio con filtros por oficio y zona, perfil público, páginas legales.
- Registro como cliente o profesional, inicio y cierre de sesión, paneles por rol con acceso protegido en el servidor.
- Solicitud por pasos con fotos, zona, dirección privada, fecha y ventana horaria. Listado por estado, detalle, cancelación y preguntas y respuestas.
- Cotizaciones con monto, alcance, materiales, duración, fecha y condiciones. Comparación lado a lado, aceptación única y retiro.
- Orden con línea de tiempo: en camino, llegada, confirmación por QR, inicio, evidencia final, aprobación o disputa. Modificación de precio con aprobación del cliente.
- Garantía escrita automática, reportes de garantía con fotos y estados de garantía completos.
- Reseñas por puntualidad, comunicación y limpieza.
- Centro de verificación: carga de documentos privados, envío de expediente, estados y motivo de rechazo.
- Perfil profesional editable: foto, oficios, zonas, disponibilidad y galería de trabajos.
- Administración: indicadores de la sección 13 del plan calculados en vivo, cola de verificación con documentos privados, decisión auditada, CRUD de categorías con plantilla y duración de garantía, operaciones, resolución documentada de casos, suspensión de usuarios y registro de auditoría.
- Notificaciones dentro de la app, diseño responsive (barra inferior tipo app en móvil), estados de carga, error y vacío, y confirmaciones en acciones importantes.

### Simuladas (claramente etiquetadas como DEMO)

- **Pagos:** "Pendiente", "Retenido en demo", "Liberado en demo", "Reembolso en revisión" y "Cancelado". No hay cobro ni custodia.
- **Verificación de antecedentes:** la decide un administrador revisando documentos; no hay conexión con registros oficiales.
- **Fotos de demostración:** ilustraciones generadas con la etiqueta "Foto demo". Las fotos que suben los usuarios sí son reales.
- **Términos legales** de garantía, privacidad y uso: textos de demostración.

### Pendientes para producción

- Conectar Supabase (Auth, PostgreSQL con RLS y Storage con URLs firmadas).
- Pasarela de pagos compatible con Guatemala para retención, liberación, disputas y reembolsos, más la validación legal.
- Verificación de antecedentes con proveedores externos.
- Notificaciones por correo o SMS, recuperación de contraseña y limitador de intentos compartido (Redis).
- Expiración automática de solicitudes y cotizaciones con un job programado. Hoy las cotizaciones vencidas se rechazan al intentar aceptarlas.
- Fuera del alcance del MVP: apps nativas, cotización por IA desde fotos, videollamadas de diagnóstico, membresías, contratos B2B y GPS en tiempo real.

---

## Inspiración y referencias de diseño

- **WPOS** (proyecto propio): paleta navy `#0b1020` y azul `#3154c8`, tipografías Poppins / IBM Plex Sans / Outfit, sistema de tokens y sidebar oscuro.
- **TaskRabbit:** titular grande con buscador y categorías con íconos.
- **Airtasker:** hero en panel navy redondeado con doble CTA y métricas de confianza.
- **Habitissimo, Pimer (Paraguay) y Tegu (Argentina):** flujo de publicar, recibir cotizaciones y comparar.
- **Clickie (Argentina):** verificación documental visible.
- **Guatemala:** no se identificó una plataforma equivalente activa; el mercado se resuelve con clasificados y recomendaciones en redes sociales, lo que refuerza el diferenciador de confianza.
