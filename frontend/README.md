# MediCore ERP — Frontend

Frontend Angular con Tailwind CSS para el Hospital Privado Boston Vida.
Proyecto académico IF-6201, Universidad de Costa Rica.

## Iniciar

```sh
npm install
npm start
```

Abrir http://localhost:4200 y elegir un perfil de demostración.
En PowerShell, usar `npm.cmd` si la política de ejecución bloquea `npm.ps1`.

La demostración funciona sin backend. Los datos ficticios se conservan en el navegador.

## Incluye

Acceso por perfiles, dashboard, pacientes, citas, agenda, directorio médico,
atenciones, catálogo de servicios, insumos, movimientos, reportes con exportación CSV,
usuarios de referencia y prototipos de Compras, Finanzas y Recursos Humanos.

El registro de atención actualiza la cita y el inventario de forma conjunta.
Power BI muestra un espacio de integración pendiente; no se han implementado cubos OLAP.

## Comprobar

```sh
npm run build
npm test -- --watch=false
```

Consulta [INTEGRACION.md](./INTEGRACION.md) para conocer la estructura,
los flujos, los límites de la demostración y la integración con la API.
