// inicio.controller.js
import { obtenerResumenInicio } from "../services/inicio.service.js";

export async function resumenInicio(req, res) {
  const data = await obtenerResumenInicio(req.usuario);

  return res.status(200).json({
    message: "Resumen principal obtenido correctamente",
    data,
  });
}
