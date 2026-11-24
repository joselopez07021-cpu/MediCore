import { Router } from "express";
import { autenticar } from "../middlewares/auth.middleware.js";
import { autorizar } from "../middlewares/roles.middleware.js";
import {
  catalogoServicios,
  directorioUsuarios,
  reporteOperativo,
} from "../services/consultas.service.js";

export const consultasRoutes = Router();
consultasRoutes.use(autenticar);
consultasRoutes.get(
  "/servicios",
  autorizar("ADMINISTRADOR", "MEDICO"),
  async (req, res) => {
    res.json({
      message: "Catálogo obtenido correctamente",
      data: await catalogoServicios(req.usuario),
    });
  },
);
consultasRoutes.get(
  "/usuarios",
  autorizar("ADMINISTRADOR"),
  async (_req, res) => {
    res.json({
      message: "Usuarios obtenidos correctamente",
      data: await directorioUsuarios(),
    });
  },
);
consultasRoutes.get(
  "/reportes",
  autorizar("ADMINISTRADOR"),
  async (req, res) => {
    res.json({
      message: "Reporte obtenido correctamente",
      data: await reporteOperativo(req.query),
    });
  },
);
