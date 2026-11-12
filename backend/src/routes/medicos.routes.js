import { Router } from "express";

import { obtenerMedicos } from "../controllers/medicos.controller.js";

import { autenticar } from "../middlewares/auth.middleware.js";
import { autorizar } from "../middlewares/roles.middleware.js";

const router = Router();

router.use(autenticar);
router.use(autorizar("ADMINISTRADOR", "ADMISION", "MEDICO"));

router.get("/", obtenerMedicos);

export default router;
