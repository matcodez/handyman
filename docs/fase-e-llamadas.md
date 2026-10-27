# Fase E: llamadas por línea telefónica

## Qué hace hoy el MVP

- **Orden activa:** en la orden y en su chat aparece el botón **Llamar** (enlace `tel:`), que abre el marcador del teléfono con el número del otro participante. Solo se muestra mientras la orden está activa (programada, en camino, en sitio, en progreso, por aprobar o en disputa).
- **Antes de contratar:** no hay botón de llamada. En el chat de cotización, los teléfonos y correos escritos se ocultan automáticamente (`[número oculto]`).
- **Soporte:** el botón **Llamar** de las conversaciones de soporte y de la sala de mediación marca a la línea de Handyman (`+502 2300 0000`, número de demostración). También aparece en el Centro de ayuda (`/ayuda`) y en la pantalla de espera de una emergencia.

## Cómo funcionaría en producción: números enmascarados

Objetivo: que cliente y profesional se puedan llamar sin ver el teléfono real del otro, y que Handyman tenga registro por si hay un reclamo.

1. **Proveedor de telefonía** con números locales de Guatemala (+502) y API de voz (por ejemplo Twilio Proxy o Vonage).
2. **Al crear la orden**, Handyman reserva una sesión de proxy: un número intermedio asignado a la pareja cliente–profesional.
3. **El botón Llamar** marca ese número intermedio. El proveedor reconoce quién llama y conecta con la otra parte, mostrando el número de Handyman en lugar del real.
4. **Al cerrar la orden** (aprobada, cancelada o fin de la garantía), la sesión expira y el número intermedio deja de conectar.
5. **Registro:** cada llamada guarda fecha, duración y participantes (sin grabar audio, salvo consentimiento). En una mediación, el agente puede ver el historial de llamadas de la orden.
6. **Línea de soporte:** número fijo con menú (1 emergencias 24 h, 2 casos abiertos, 3 consultas), conectado al centro de soporte para que el agente vea el caso de quien llama.

### Costos estimados (a validar)

- Número local: alrededor de USD 1 a 3 al mes por número del grupo de números intermedios (se reutilizan entre órdenes que no coinciden en el tiempo).
- Minutos de voz: alrededor de USD 0.02 a 0.05 por minuto por tramo.
- Con unas 300 órdenes al mes y 2 llamadas de 3 minutos por orden: menos de USD 100 al mes.

### Por qué no está en el MVP

Requiere un proveedor de pago, verificación de identidad de la empresa ante el proveedor y números reales. Para la demostración académica se usa el enlace `tel:` directo, que muestra el mismo flujo al usuario.
