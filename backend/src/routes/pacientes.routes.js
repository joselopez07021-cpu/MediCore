import { Router } from "express";

import {
  crearPaciente,
  obtenerPacientes,
  obtenerPacientesPaginados,
  obtenerPacientePorId,
  editarPaciente,
  borrarPaciente,
  actualizarEstadoPaciente,
  consultarHistorialPaciente,
} from "../controllers/pacientes.controller.js";

import { autenticar } from "../middlewares/auth.middleware.js";
import { autorizar } from "../middlewares/roles.middleware.js";

const router = Router();

// Autenticación y autorización
router.use(autenticar);
router.use(autorizar("ADMINISTRADOR", "ADMISION"));

// CREATE
router.post("/", crearPaciente);

// READ
router.get("/", obtenerPacientes);
router.get("/paginados", obtenerPacientesPaginados);
router.get("/:id/citas", consultarHistorialPaciente);
router.get("/:id", obtenerPacientePorId);

// UPDATE
router.put("/:id", editarPaciente);

// DELETE lógico
router.delete("/:id", borrarPaciente);

// Activar / desactivar
router.patch("/:id/estado", actualizarEstadoPaciente);

export default router;
