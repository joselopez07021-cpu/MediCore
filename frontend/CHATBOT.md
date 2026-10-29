# Asistente flotante de MediCore

La interfaz está montada una sola vez en `aplicacion.ts`, junto al `router-outlet`.
Está disponible en todas las rutas, incluido el login. Abrir o minimizar el panel
no cambia la página. La conversación se conserva al navegar y al minimizar;
se limpia al cambiar de perfil, cerrar sesión o recargar la aplicación.
No se persisten mensajes en localStorage ni en sessionStorage.

## Archivos

- `src/aplicacion/compartidos/chatbot.ts`, `.html` y `.css`: panel adaptable,
  preguntas sugeridas, historial, envío, estado de espera, errores y reintentos.
- `public/asistente-medicore.png`: imagen del robot médico proporcionada para el asistente;
  se muestra como avatar circular en el botón flotante y el encabezado del chat.
- `src/aplicacion/servicios/servicio-chatbot.ts`: contratos y adaptador local de muestra.

La versión actual solo muestra respuestas predefinidas y no hace solicitudes HTTP.
El distintivo «Vista previa · respuestas de muestra» lo indica en el panel.
No hay un modelo, API externa, endpoint de chat ni credenciales de proveedor configurados.

## Conectar el backend

Implementar un servicio Angular que cumpla `ChatbotGateway` y registrar el proveedor
en `configuracion-aplicacion.ts`, conservando los proveedores existentes:

```ts
{ provide: CHATBOT_GATEWAY, useClass: BackendChatbotGateway }
```

El panel invoca `send(request)` y espera un `Observable<ChatbotReply>` con una respuesta
completa. El adaptador puede usar `HttpClient` y la base `API_CONFIG.baseUrl`; el equipo
debe acordar la ruta real y mapear su contrato al siguiente formato de interfaz.
No se ha supuesto un endpoint ni modificado Express.

Solicitud de ejemplo:

```json
{
  "message": "¿Dónde veo las citas?",
  "history": [
    { "role": "assistant", "content": "¡Hola! Soy el asistente de MediCore. ¿En qué puedo ayudarte hoy?" }
  ]
}
```

`history` contiene los mensajes anteriores, sin repetir `message`. La primera entrada
es el saludo de la interfaz, no un mensaje de sistema. Los roles son `user` y `assistant`.
El panel limita cada envío a 1000 caracteres e impide envíos simultáneos.

Respuesta esperada:

```json
{ "message": "Puedes encontrar las citas en la agenda médica." }
```

Los mensajes se muestran como texto, sin interpretar HTML. El panel maneja errores,
respuestas vacías y un tiempo de espera de 30 segundos. «Reintentar» repite la misma
solicitud sin duplicar el mensaje en pantalla. El adaptador debe propagar los errores
del servidor por el observable. El componente cancela solicitudes al destruirse
o al cambiar de identidad; al minimizar el panel sigue esperando la respuesta.

La respuesta actual no usa streaming. Si se requiere, adaptar el contrato y el renderizado.
El backend debe definir autenticación, permisos, manejo del historial y disponibilidad
de ayuda antes del login. Los perfiles de demostración del navegador no son credenciales
de servidor. El panel no envía automáticamente registros del hospital ni datos de pacientes.
Las claves de cualquier proveedor de IA deben permanecer en el servidor.

Antes de activar el servicio real, sustituir el distintivo de vista previa por un estado
coherente con el servicio conectado y revisar las preguntas sugeridas y el saludo.

## Verificación

`npm test -- --watch=false` cubre la presencia global, la conservación del historial
al navegar/minimizar, el cierre con Escape, envíos vacíos o repetidos, reintentos y
la cancelación y limpieza al cerrar sesión. `npm run build` verifica la compilación.
