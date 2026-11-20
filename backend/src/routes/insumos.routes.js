// insumos.routes.js
import { Router } from "express";

import {
    obtenerCategorias,
    obtenerInsumos,
    obtenerInsumoPorId,
    obtenerInsumosPaginados,
    registrarInsumo,
    editarInsumo,
    borrarInsumo,
    resumenInventario
} from "../controllers/insumos.controller.js";

import { autenticar } from "../middlewares/auth.middleware.js";
import { autorizar } from "../middlewares/roles.middleware.js";

export const insumosRoutes = Router();
export const categoriasInsumosRoutes = Router();

insumosRoutes.use(autenticar);
insumosRoutes.use(autorizar("ADMINISTRADOR", "INVENTARIO"));

insumosRoutes.get("/", obtenerInsumos);
insumosRoutes.get("/paginados", obtenerInsumosPaginados);
insumosRoutes.get("/resumen", resumenInventario);
insumosRoutes.get("/:id", obtenerInsumoPorId);
insumosRoutes.post("/", registrarInsumo);
insumosRoutes.put("/:id", editarInsumo);
insumosRoutes.delete("/:id", borrarInsumo);


categoriasInsumosRoutes.use(autenticar);
categoriasInsumosRoutes.use(
    autorizar("ADMINISTRADOR", "INVENTARIO")
);

categoriasInsumosRoutes.get("/", obtenerCategorias);
