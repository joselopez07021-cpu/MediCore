import {
  listarMedicos,
  obtenerMedico,
  crearMedico,
  actualizarMedico,
  cambiarEstadoMedico,
  MedicoError,
} from "../services/medicos.service.js";
import { InventarioError } from "../services/inventario.utils.js";

const manejarError = (error, res) => {
  if (error instanceof MedicoError || error instanceof InventarioError)
    return res.status(error.status).json({ message: error.message });
  if (error.code === "P2002")
    return res
      .status(409)
      .json({
        message:
          "La identificación, el usuario o el correo ya están registrados",
      });
  console.error("Error al gestionar médico:", error.code ?? error.name);
  return res.status(500).json({ message: "Error interno al gestionar médico" });
};
export const obtenerMedicoPorId = async (req, res) => {
  try {
    return res.json({ data: await obtenerMedico(req.params.id) });
  } catch (e) {
    return manejarError(e, res);
  }
};
export const registrarMedico = async (req, res) => {
  try {
    return res
      .status(201)
      .json({
        message: "Médico y cuenta registrados correctamente",
        data: await crearMedico(req.body ?? {}),
      });
  } catch (e) {
    return manejarError(e, res);
  }
};
export const editarMedico = async (req, res) => {
  try {
    return res.json({
      message: "Médico actualizado correctamente",
      data: await actualizarMedico(req.params.id, req.body ?? {}),
    });
  } catch (e) {
    return manejarError(e, res);
  }
};
export const cambiarEstado = async (req, res) => {
  try {
    return res.json({
      message: "Estado del médico actualizado",
      data: await cambiarEstadoMedico(req.params.id, req.body?.activo),
    });
  } catch (e) {
    return manejarError(e, res);
  }
};
export const desactivarMedico = async (req, res) => {
  try {
    return res.json({
      message: "Médico desactivado; su historial se conserva",
      data: await cambiarEstadoMedico(req.params.id, false),
    });
  } catch (e) {
    return manejarError(e, res);
  }
};

export const obtenerMedicos = async (req, res) => {
  try {
    const medicos = await listarMedicos(req.query.activo);

    return res.status(200).json({
      message: "Médicos obtenidos correctamente",
      data: medicos,
    });
  } catch (error) {
    if (error instanceof MedicoError) {
      return res.status(error.status).json({
        message: error.message,
      });
    }

    console.error("Error al obtener médicos:", error);

    return res.status(500).json({
      message: "Error interno al obtener médicos",
    });
  }
};
