// inicio.routes.js
import { Router } from "express";
import { resumenInicio } from "../controllers/inicio.controller.js";

export const inicioRutas = Router();

inicioRutas.get("/resumen", resumenInicio);
