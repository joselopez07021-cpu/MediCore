// atenciones.controller.js
import { Prisma } from "@prisma/client";

import {
  AtencionError,
  listarServiciosHospitalarios,
  listarCatalogosAtencion,
  obtenerCitaParaAtencion,
  listarPendientesAtencion,
  registrarAtencion,
  listarAtencionesPaginadas,
  obtenerDetalleAtencion,
  obtenerResumenAtenciones
} from "../services/atenciones.service.js";

const manejarError = (error, res) => {
  if (error instanceof AtencionError) {
    return res.status(error.status).json({
      message: error.message
    });
  }

  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    if (error.code === "P2002") {
      return res.status(409).json({
        message: "Ya existe un registro con estos datos"
      });
    }

    if (error.code === "P2025") {
      return res.status(404).json({
        message: "Registro no encontrado"
      });
    }
  }

  console.error("Error en atenciones:", error);

  return res.status(500).json({
    message: "Error interno del servidor"
  });
};

export const obtenerServiciosHospitalarios = async (req, res) => {
  try {
    const data = await listarServiciosHospitalarios(req.query);

    return res.status(200).json({
      message: "Servicios obtenidos correctamente",
      data,
    });
  } catch (error) {
    return manejarError(error, res);
  }
};

export const obtenerCatalogosAtencion = async (req, res) => {
  try {
    const data = await listarCatalogosAtencion();
    return res.status(200).json({
      message: "Catálogos obtenidos correctamente",
      data
    });
  } catch (error) {
    return manejarError(error, res);
  }
};

export const consultarCitaAtencion = async (req, res) => {
  try {
    const data = await obtenerCitaParaAtencion(
      req.params.id,
      req.usuario
    );
    return res.status(200).json({
      message: "Cita obtenida correctamente",
      data
    });
  } catch (error) {
    return manejarError(error, res);
  }
};

export const obtenerPendientesAtencion = async (req, res) => {
  try {
    const data = await listarPendientesAtencion(
      req.query,
      req.usuario
    );
    return res.status(200).json({
      message: "Citas pendientes obtenidas correctamente",
      data
    });
  } catch (error) {
    return manejarError(error, res);
  }
};

export const crearAtencion = async (req, res) => {
  try {
    const data = await registrarAtencion(
      req.body ?? {},
      req.usuario
    );

    return res.status(201).json({
      message: "Atención médica registrada correctamente",
      data
    });
  } catch (error) {
    return manejarError(error, res);
  }
};

export const obtenerAtencionesPaginadas = async (req, res) => {
  try {
    const resultado = await listarAtencionesPaginadas(
      req.query,
      req.usuario
    );

    return res.status(200).json({
      message: "Atenciones obtenidas correctamente",
      ...resultado
    });
  } catch (error) {
    return manejarError(error, res);
  }
};

export const consultarDetalleAtencion = async (req, res) => {
  try {
    const data = await obtenerDetalleAtencion(
      req.params.id,
      req.usuario
    );

    return res.status(200).json({
      message: "Detalle obtenido correctamente",
      data
    });
  } catch (error) {
    return manejarError(error, res);
  }
};

export const consultarResumenAtenciones = async (req, res) => {
  try {
    const data = await obtenerResumenAtenciones(
      req.query,
      req.usuario
    );

    return res.status(200).json({
      message: "Resumen obtenido correctamente",
      data
    });
  } catch (error) {
    return manejarError(error, res);
  }
};
