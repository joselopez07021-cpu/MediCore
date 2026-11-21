// atenciones.routes.js
import { Router } from "express";

import {
  obtenerServiciosHospitalarios,
  obtenerCatalogosAtencion,
  consultarCitaAtencion,
  obtenerPendientesAtencion,
  crearAtencion,
  obtenerAtencionesPaginadas,
  consultarDetalleAtencion,
  consultarResumenAtenciones
} from "../controllers/atenciones.controller.js";

import { autenticar } from "../middlewares/auth.middleware.js";
import { autorizar } from "../middlewares/roles.middleware.js";

const router = Router();

router.use(autenticar);
router.use(autorizar("ADMINISTRADOR", "MEDICO"));

// Datos para los formularios
router.get("/servicios", obtenerServiciosHospitalarios);
router.get("/catalogos", obtenerCatalogosAtencion);
router.get("/cita/:id", consultarCitaAtencion);

// Agenda y panel
router.get("/pendientes", obtenerPendientesAtencion);
router.get("/resumen", consultarResumenAtenciones);

// Historial y detalle
router.get("/paginados", obtenerAtencionesPaginadas);
router.get("/:id", consultarDetalleAtencion);

// Registro de atención
router.post("/", crearAtencion);

export default router;
