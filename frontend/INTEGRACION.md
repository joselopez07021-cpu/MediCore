# MediCore: guía de frontend e integración

## Ejecutar

Desde `frontend`, ejecutar `npm install` y `npm start` (en PowerShell con políticas restrictivas: `npm.cmd install` y `npm.cmd start`). Abrir `http://localhost:4200`.

El frontend funciona sin levantar Node/Express. Elegir un perfil en la pantalla de acceso. La sesión se mantiene en sessionStorage y los datos compartidos en localStorage con la clave `medicore-demo-v1`. Para reiniciar la demostración se puede quitar únicamente esa clave desde las herramientas del navegador. No registrar datos de personas reales.

## Organización

- `src/aplicacion/nucleo/modelos.ts`: modelos de presentación para la demo; no son contratos confirmados del backend.
- `src/aplicacion/nucleo/datos-demostracion.ts`: carga inicial ficticia, con citas del día local de apertura.
- `src/aplicacion/nucleo/almacen-demostracion.ts`: consultas y operaciones compartidas; persistencia y transacción local de atención/consumo.
- `src/aplicacion/nucleo/autenticacion.ts`: sesión y permisos simulados; guards de navegación.
- `src/aplicacion/nucleo/configuracion-api.ts`: URL base centralizada de la API.
- `src/aplicacion/servicios/servicio-api.ts`: servicio original de comprobación de conexión con el único endpoint disponible, `GET /api`. No es necesario para la demo.
- `src/aplicacion/estructura`: encabezado, navegación superior y pie de página.
- `src/aplicacion/compartidos`: cabecera de páginas, estado de cita, editor reactivo y página 404.
- `src/aplicacion/modulos/autenticacion`: acceso de demostración.
- `src/aplicacion/modulos/inicio`: resumen operativo calculado desde los datos compartidos.
- `src/aplicacion/modulos/admision`: pacientes, citas, agenda y directorio médico.
- `src/aplicacion/modulos/servicios`: catálogo y registro/consulta de atenciones.
- `src/aplicacion/modulos/inventario`: insumos, entradas, salidas y trazabilidad de consumos.
- `src/aplicacion/modulos/administracion`: tres prototipos visuales y consulta de perfiles.
- `src/aplicacion/modulos/reportes`: indicadores filtrables, gráficos, exportación CSV y espacio para Power BI.
- `src/estilos.css`: Tailwind CSS y estilos compartidos mediante `@apply`. No hay biblioteca visual externa ni fuentes remotas.

Los componentes son standalone y las páginas se cargan de manera diferida desde `rutas-aplicacion.ts`. Los formularios usan Reactive Forms. Se utilizan signals/computed para propagar cambios entre módulos.

## Flujos disponibles

1. Registrar/editar un paciente y consultar su ficha administrativa e historial de citas.
2. Programar/editar/confirmar/cancelar una cita. Cambiar a NO_ASISTIO mediante edición. Se rechaza un mismo horario exacto para médico o paciente. La demo no define duración de cita: el backend deberá confirmar esa regla.
3. Consultar agenda por fecha/médico; al elegir el perfil Médico se selecciona un profesional del directorio. Su identidad se conserva en sessionStorage y filtra las citas del inicio, agenda y atenciones.
4. Desde agenda, abrir una atención con la cita seleccionada; registrar diagnóstico, observaciones, varios servicios e insumos opcionales.
5. Al guardar una atención, marcar la cita ATENDIDA, descontar todos los insumos y agregar movimientos de SALIDA vinculados. Si falla el stock de cualquier insumo, no se modifica ningún registro. Las atenciones guardadas son de consulta, sin edición ni eliminación.
6. Crear/editar insumos. Un insumo nuevo comienza en cero; para cargar existencias se registra una ENTRADA. Las existencias no son un campo de edición libre.
7. Registrar ENTRADA/SALIDA manual con cantidad entera positiva y motivo. Las salidas no permiten stock negativo.
8. Analizar datos por período y médico y descargar CSV.

Los movimientos iniciales se generan a partir de la existencia inicial de cada insumo y el consumo de atención precargado. Los datos de la demo son pequeños y no sustituyen el script SQL anual previsto.

## Conectar el backend

No se crearon endpoints nuevos ni se asumió que existe autenticación real. Antes de integrar, acordar los contratos con el equipo:

- Identificadores, nombres de campos, tipos, fechas/horas y zona horaria del hospital (Boston).
- Validaciones y transiciones permitidas de citas; duración y disponibilidad médica.
- Relación del usuario autenticado con el médico, roles y permisos.
- Operación transaccional de registro de atención, servicios, consumos y movimientos.
- Manejo de errores, paginación y filtros en servidor.

Reemplazar las operaciones de `DemoStore` por servicios HttpClient por dominio; mapear DTOs reales a los modelos de pantalla y agregar estados de carga mientras se esperan respuestas. El editor conserva el formulario ante errores. Quitar la persistencia local de los registros clínicos y el selector de roles cuando exista autenticación. El backend debe validar permisos, relaciones, duplicados y existencias dentro de una transacción PostgreSQL: los guards y validaciones de Angular no son seguridad del servidor.

`API_CONFIG` es la única URL base. El servicio original `Api` conserva el endpoint real de prueba y no se invoca al entrar al frontend. Para autenticación, acordar primero si se usarán cookies o tokens; no hay credenciales ni tokens ficticios implementados.

## Alcance y pendientes externos

Compras, Finanzas y Recursos Humanos son prototipos: solo búsqueda de registros ilustrativos. No generan operaciones ni afectan los tres módulos principales. Usuarios y roles muestra perfiles de referencia, sin crear cuentas.

Power BI está identificado como pendiente, sin iframe vacío o URL inventada. El backend, PostgreSQL, la carga anual de SQL, cubos/modelo analítico y la publicación/incrustación de Power BI quedan a cargo de la siguiente fase. Las gráficas locales no se presentan como cubos OLAP.

## Verificación

- `npm run build`: compilación de producción, templates y presupuesto de tamaño.
- `npm test -- --watch=false`: tests de operaciones integradas, stock, duplicados, guardas y renderizado de páginas.

Tailwind se configura con PostCSS siguiendo la guía oficial: https://tailwindcss.com/docs/installation/framework-guides/angular
