// citas.routes.js
import { Router } from "express";

import {
  crearCita,
  obtenerCitas,
  obtenerCitaPorId,
  editarCita,
  obtenerCitasPaginadas,
  obtenerAgendaPaginada,
  actualizarEstadoCita,
  consultarAgendaMedica,
  resumenCitas,
} from "../controllers/citas.controller.js";

import { autenticar } from "../middlewares/auth.middleware.js";
import { autorizar } from "../middlewares/roles.middleware.js";

const router = Router();

router.use(autenticar);
router.use(autorizar("ADMINISTRADOR", "ADMISION", "MEDICO"));

// CREATE
router.post("/", autorizar("ADMINISTRADOR", "ADMISION"), crearCita);

// READ - Citas
router.get("/", obtenerCitas);
router.get("/paginados", obtenerCitasPaginadas);

// READ - Agenda médica
router.get("/agenda", consultarAgendaMedica);
router.get("/agenda/paginados", obtenerAgendaPaginada);
router.get("/resumen", resumenCitas);

// READ - Cita individual
router.get("/:id", obtenerCitaPorId);

// UPDATE
router.put("/:id", autorizar("ADMINISTRADOR", "ADMISION"), editarCita);

// Cambiar estado
router.patch(
  "/:id/estado",
  autorizar("ADMINISTRADOR", "ADMISION"),
  actualizarEstadoCita,
);

export default router;
