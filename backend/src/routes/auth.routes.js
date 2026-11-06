import { Router } from "express";

import { login, me } from "../controllers/auth.controller.js";
import { autenticar } from "../middlewares/auth.middleware.js";
import { autorizar } from "../middlewares/roles.middleware.js";

const router = Router();

router.post("/login", login);

router.get("/me", autenticar, me);

router.get(
    "/admin-test",
    autenticar,
    autorizar("ADMINISTRADOR"),
    (req, res) => {
        res.json({
            message: "Acceso autorizado para ADMINISTRADOR"
        });
    }
);

router.get(
    "/medical-test",
    autenticar,
    autorizar("MEDICO"),
    (req, res) => {
        res.json({
            message: "Acceso autorizado para MEDICO"
        });
    }
);

export default router;
