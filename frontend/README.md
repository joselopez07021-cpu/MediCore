# MediCore ERP — Frontend

Frontend Angular con Tailwind CSS para el Hospital Privado Boston Vida.
Proyecto académico IF-6201, Universidad de Costa Rica.

## Iniciar

```sh
npm install
npm start
```

Abrir http://localhost:4200 y elegir un perfil de demostración.
La contraseña de todos los perfiles es `demo123`; los usuarios son `admin`, `admision`,
`medico` e `inventario`, respectivamente. El formulario muestra las credenciales del perfil elegido.
Para el perfil médico también se debe seleccionar un profesional del directorio.

El login se solicita una vez por sesión. Después se puede navegar entre las secciones permitidas
por el perfil, salir y regresar a ellas o recargar la página sin volver a ingresar credenciales.
La sesión se mantiene en `sessionStorage` hasta pulsar «Salir» o cerrar la pestaña.
Los accesos por URL directa sin sesión llevan al login y, al ingresar, abren la página solicitada
si el perfil tiene permiso. Un perfil sin permiso vuelve al inicio.
Estas credenciales son públicas y la validación ocurre en el navegador: es una simulación
para presentar el flujo, pendiente de autenticación y autorización reales en el backend.
En PowerShell, usar `npm.cmd` si la política de ejecución bloquea `npm.ps1`.

La demostración funciona sin backend. Los datos ficticios se conservan en el navegador.

## Incluye

Acceso por perfiles, dashboard, pacientes, citas, agenda, directorio médico,
atenciones, catálogo de servicios, insumos, movimientos, reportes con exportación CSV,
usuarios de referencia y prototipos de Compras, Finanzas y Recursos Humanos.

Asistente flotante con ícono propio en todas las páginas, conversación de muestra y
adaptador reemplazable para el backend. Consulta [CHATBOT.md](./CHATBOT.md) para conectarlo.

El registro de atención actualiza la cita y el inventario de forma conjunta.
Power BI muestra un espacio de integración pendiente; no se han implementado cubos OLAP.

## Comprobar

```sh
npm run build
npm test -- --watch=false
```

Consulta [INTEGRACION.md](./INTEGRACION.md) para conocer la estructura,
los flujos, los límites de la demostración y la integración con la API.
