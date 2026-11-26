import { Router } from "express";

import {
  obtenerMedicos,
  obtenerMedicoPorId,
  registrarMedico,
  editarMedico,
  cambiarEstado,
  desactivarMedico,
} from "../controllers/medicos.controller.js";

import { autenticar } from "../middlewares/auth.middleware.js";
import { autorizar } from "../middlewares/roles.middleware.js";

const router = Router();

router.use(autenticar);
router.use(autorizar("ADMINISTRADOR", "ADMISION", "MEDICO"));

router.get("/", obtenerMedicos);
router.get("/:id", obtenerMedicoPorId);
router.post("/", autorizar("ADMINISTRADOR"), registrarMedico);
router.put("/:id", autorizar("ADMINISTRADOR"), editarMedico);
router.patch("/:id/estado", autorizar("ADMINISTRADOR"), cambiarEstado);
router.delete("/:id", autorizar("ADMINISTRADOR"), desactivarMedico);

export default router;
