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
  categoriasInsumosRoutes,
} from "./routes/insumos.routes.js";

import movimientosInventarioRoutes from "./routes/movimientos-inventario.routes.js";
import atencionesRoutes from "./routes/atenciones.routes.js";
import { inicioRutas } from "./routes/inicio.routes.js";
import { consultasRoutes } from "./routes/consultas.routes.js";
import { asistenteRoutes } from "./routes/asistente.routes.js";

const app = express();

app.disable("x-powered-by");

app.use(
  cors({
    origin: process.env.CORS_ORIGIN || "http://localhost:4200",
  }),
);

app.use(express.json());

// Rutas de la API
app.use("/api/health", healthRoutes);
app.use("/api/asistente", asistenteRoutes);
app.use("/api/auth", authRoutes);
app.use("/api/pacientes", pacientesRoutes);
app.use("/api/citas", citasRoutes);
app.use("/api/medicos", medicosRoutes);

app.use("/api/insumos", insumosRoutes);
app.use("/api/categorias-insumos", categoriasInsumosRoutes);
app.use("/api/movimientos-inventario", movimientosInventarioRoutes);
app.use("/api/atenciones", atencionesRoutes);

// Pantalla principal
app.use("/api/inicio", inicioRutas);
app.use("/api", consultasRoutes);

// Express 5 envía aquí también los rechazos de controladores async.
app.use((error, _req, res, _next) => {
  const status =
    Number.isInteger(error.status) && error.status >= 400 && error.status < 500
      ? error.status
      : 500;
  if (status === 500) console.error("Error de API:", error.message);
  res
    .status(status)
    .json({
      message: status === 500 ? "Error interno del servidor" : error.message,
    });
});

export default app;
