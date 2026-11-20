// app.js
import express from "express";
import cors from "cors";

import healthRoutes from "./routes/health.routes.js";
import authRoutes from "./routes/auth.routes.js";
import pacientesRoutes from "./routes/pacientes.routes.js";
import citasRoutes from "./routes/citas.routes.js";
import medicosRoutes from "./routes/medicos.routes.js";
import {
    insumosRoutes,
    categoriasInsumosRoutes
} from "./routes/insumos.routes.js";

import movimientosInventarioRoutes from "./routes/movimientos-inventario.routes.js";

const app = express();

app.disable("x-powered-by");

app.use(cors({
    origin: "http://localhost:4200"
}));

// app.use(express.json({ limit: "100kb" }));
app.use(express.json());

app.use("/api/health", healthRoutes);
app.use("/api/auth", authRoutes);
app.use("/api/pacientes", pacientesRoutes);
app.use("/api/citas", citasRoutes);
app.use("/api/medicos", medicosRoutes);

app.use("/api/insumos", insumosRoutes);
app.use("/api/categorias-insumos", categoriasInsumosRoutes);
app.use("/api/movimientos-inventario", movimientosInventarioRoutes);

export default app;
