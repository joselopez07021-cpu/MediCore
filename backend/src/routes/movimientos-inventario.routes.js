import { Router } from "express";

import {
    obtenerMovimientos,
    obtenerMovimientosPaginados,
    obtenerMovimientoPorId,
    crearMovimiento
} from "../controllers/movimientos-inventario.controller.js";

import { autenticar } from "../middlewares/auth.middleware.js";
import { autorizar } from "../middlewares/roles.middleware.js";

const router = Router();

router.use(autenticar);
router.use(autorizar("ADMINISTRADOR", "INVENTARIO"));

router.get("/", obtenerMovimientos);
router.get("/paginados", obtenerMovimientosPaginados);
router.get("/:id", obtenerMovimientoPorId);
router.post("/", crearMovimiento);

export default router;
