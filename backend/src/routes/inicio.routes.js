// inicio.routes.js
import { Router } from "express";
import { resumenInicio } from "../controllers/inicio.controller.js";
import { autenticar } from "../middlewares/auth.middleware.js";

export const inicioRutas = Router();

inicioRutas.get("/resumen", autenticar, resumenInicio);
