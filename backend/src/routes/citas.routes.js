import { Router } from "express";

import {
    crearCita,
    obtenerCitas,
    obtenerCitaPorId,
    editarCita,
    actualizarEstadoCita,
    consultarAgendaMedica
} from "../controllers/citas.controller.js";

import { autenticar } from "../middlewares/auth.middleware.js";
import { autorizar } from "../middlewares/roles.middleware.js";

const router = Router();

router.use(autenticar);
router.use(autorizar("ADMINISTRADOR", "ADMISION"));

// CREATE
router.post("/", crearCita);

// READ
router.get("/", obtenerCitas);
// Agenda médica: filtrar por fecha y opcionalmente por médico
router.get("/agenda", consultarAgendaMedica);
router.get("/:id", obtenerCitaPorId);

// UPDATE
router.put("/:id", editarCita);

// Cambiar estado
router.patch("/:id/estado", actualizarEstadoCita);


export default router;
