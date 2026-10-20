# Sugerencias de las entrevistas de validación

Registro de lo que pidieron las personas entrevistadas, si la plataforma ya lo cubre y la mejora propuesta.
Estado: ✅ ya existe · 🟡 existe en parte · ❌ no existe. Nada de esto está implementado todavía: es el análisis previo.

## Entrevistados

| # | Nombre | Edad | Entrevistó |
| --- | --- | --- | --- |
| 1 | Alessandro Spilari | 53 | (pendiente) |
| 2 | Ana Garrido | 49 | (pendiente) |
| 3 | Gabriela Soler | 53 | (pendiente) |
| 4 | (nombre pendiente) | — | (pendiente) |

Lo que más valoraron: la confianza que transmite, poder ver el perfil antes de contratar, la garantía y que es "más completa que el boca a boca".

## Sugerencias y estado

La columna "Quién" indica cuántas personas lo pidieron (de 4 entrevistadas hasta ahora).

| Id | Sugerencia | Quién | Estado hoy | Propuesta |
| --- | --- | --- | --- | --- |
| S1 | Regionalizar, ampliar zonas y llegar a los departamentos | 4/4: Alessandro, Ana, Gabriela, #4 | 🟡 16 zonas del área metropolitana, escritas en el código | Zonas como datos editables por región → departamento → zona, activables desde administración. Las no activas aparecen como "Próximamente" y permiten anotarse en una lista de espera, para medir la demanda antes de expandirse |
| S2 | Elegir profesional por zona | Ana | 🟡 El directorio filtra por oficio y zona, pero la solicitud llega a todos | "Solicitar a este profesional" desde su perfil (invitación directa) y favoritos |
| S3 | Opiniones de otros clientes | Alessandro, #4 | ✅ Reseñas en el perfil y en cada cotización | Ya existe, pero dos personas lo pidieron: no se está viendo. Destacar reseñas recientes dentro de cada cotización |
| S4 | Precios aproximados / rango de precios | Alessandro, #4 | ❌ | "Precio de referencia" por oficio, calculado con órdenes reales (rango típico), en el catálogo y al crear la solicitud. Cada cotización indica si está por debajo, dentro o por encima del rango |
| S5 | Tiempo de respuesta para cotizar; atención rápida | Alessandro, #4 | 🟡 Solo como métrica global en el panel de administración | "Responde en ~X h" por profesional (perfil y cotizaciones) y tiempo esperado por oficio y zona al publicar la solicitud |
| S6 | Que administración acompañe y dé seguimiento hasta resolver; mediación | Alessandro, Ana, #4 | 🟡 Existe el caso y la resolución documentada, pero no hay conversación ni seguimiento visible | Centro de mediación por caso: hilo de mensajes entre cliente, profesional y un administrador asignado; línea de tiempo del caso; plazo de respuesta comprometido y visible; acuerdo final que ambas partes aceptan |
| S7 | Cartas de recomendación con teléfono, verificadas | Ana | 🟡 Se puede subir una carta como documento privado, sin estructura ni verificación | Referencias estructuradas (nombre, relación, trabajo, teléfono). Administración llama y marca cada una como verificada. El perfil público muestra "N referencias verificadas" sin exponer teléfonos |
| S8 | Supervisión de un experto al terminar | Gabriela | ❌ El plan lo dejó como decisión pendiente | Inspección de calidad opcional al contratar, hecha por un inspector verificado del oficio (precio demo), con un checklist por oficio e informe adjunto a la orden. Extiende la garantía. En una disputa, administración puede asignar un perito |
| S9 | Expandirse a los departamentos | Ana, Gabriela | ❌ | Se resuelve con S1 |
| S10 | Información del profesional más clara | #4 | 🟡 El perfil tiene todos los datos, pero dispersos | Bloque "Por qué confiar" al inicio del perfil y de cada cotización: identidad verificada, años, trabajos completados, calificación, tiempo de respuesta, referencias verificadas y garantía |
| S11 | Seguimiento en tiempo real y notificaciones del avance del trabajo | #4 | 🟡 Solo cambios de estado (en camino, llegó, en progreso, terminado) | Se une con E1 para el trayecto, y además "avances" durante el trabajo: el profesional publica actualizaciones cortas con foto (por ejemplo, "Se retiró la tubería dañada") y el cliente recibe la notificación |
| S12 | Contactar directamente al trabajador | #4 | 🟡 Antes de contratar hay preguntas y respuestas; después, el teléfono en la orden | Chat dentro de la orden, que queda como evidencia si hay un reclamo, y un botón de WhatsApp al número del profesional solo cuando la orden está activa |
| S13 | Más servicios: jardinería, electrodomésticos, mantenimiento eléctrico y de tuberías | #4 | 🟡 Jardinería, electricidad y plomería ya existen; electrodomésticos no | Crear "Instalación y reparación de electrodomésticos" (se hace desde el panel, sin código). Que pidiera servicios que ya existen indica un problema para encontrarlos: agregar palabras clave por oficio (lavadora, refri, fuga, apagador…) al buscador |
| S14 | Que otro trabajador corrija el problema sin volver a pagar | #4 | 🟡 La garantía puede aprobar una corrección, pero solo por el mismo profesional | Garantía de reemplazo: si el profesional original no corrige en un plazo (por ejemplo, 5 días) o el cliente no quiere que regrese, Handyman asigna a otro profesional verificado sin costo para el cliente, pagado con el pago retenido o con un fondo de garantía de la comisión |

### Otras sugerencias recogidas por el equipo

| Id | Sugerencia | Estado hoy | Propuesta |
| --- | --- | --- | --- |
| S15 | Equipo de soporte concreto, tipo call center, que dirija cuando hay fallas | 🟡 Solo existe el proceso de reclamo; el correo de soporte es ficticio y no hay canal humano visible | Centro de ayuda con canales visibles (WhatsApp de soporte, teléfono y horario), botón "Necesito ayuda" en cada orden que abre un caso con número y agente asignado, y tiempo de respuesta comprometido. Se integra con S6 |
| S16 | Página más visual y simple, que no agobie a quien le cuesta navegar | 🟡 La interfaz es limpia, pero la página de inicio tiene muchas secciones y bastante texto | Modo simple: inicio con botones grandes de "¿Qué necesitas?" con íconos, menos texto, asistente de una pregunta por pantalla, opción de letra grande y pasos explicados con imágenes en lugar de párrafos |
| — | Perfiles de los profesionales | ✅ La mayoría de entrevistados dijo que están bien | Sin cambios; solo agregar referencias verificadas (S7) y el bloque "Por qué confiar" (S10) |

## Ideas del equipo

| Id | Idea | Estado hoy | Propuesta |
| --- | --- | --- | --- |
| E1 | Saber cómo viene el profesional: notificaciones y ubicación en vivo | 🟡 Hay avisos de "en camino" y "llegó"; no hay mapa ni hora estimada | Seguimiento en vivo solo mientras está "en camino": mapa con su ubicación desde el teléfono del profesional, hora estimada de llegada y aviso automático al estar cerca. Se apaga al llegar, por privacidad. El plan original dejaba el GPS fuera del MVP. Respaldado por #4 (S11) |
| E2 | Materiales: si el cliente ya los tiene y, si no, cotización de materiales | 🟡 La cotización solo dice "incluidos / no incluidos" con una nota | En la solicitud, el cliente indica qué materiales ya tiene. En la cotización, mano de obra y materiales van por separado, con lista de materiales (cantidad, precio) y enlace al producto en una tienda en línea. El cliente elige quién compra, y si lo compra el profesional, entra en el precio acordado y en el pago retenido |
