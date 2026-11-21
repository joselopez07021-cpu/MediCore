// insumos.controller.js
import {
  listarCategorias,
  listarInsumos,
  listarInsumosPaginados,
  obtenerInsumo,
  crearInsumo,
  actualizarInsumo,
  eliminarInsumo,
  obtenerResumenInventario
} from "../services/insumos.service.js";

import { InventarioError } from "../services/inventario.utils.js";

const manejarError = (error, res) => {
  if (error instanceof InventarioError) {
    return res.status(error.status).json({
      message: error.message
    });
  }

  console.error("Error de inventario:", error);

  return res.status(500).json({
    message: "Error interno de inventario"
  });
};

export const obtenerCategorias = async (req, res) => {
  try {
    const data = await listarCategorias();
    return res.status(200).json({ data });
  } catch (error) {
    return manejarError(error, res);
  }
};

export const obtenerInsumos = async (req, res) => {
  try {
    const data = await listarInsumos(req.query);
    return res.status(200).json({ data });
  } catch (error) {
    return manejarError(error, res);
  }
};

export const obtenerInsumosPaginados = async (req, res) => {
  try {
    const resultado = await listarInsumosPaginados(req.query);

    return res.status(200).json({
      message: "Insumos obtenidos correctamente",
      ...resultado
    });
  } catch (error) {
    return manejarError(error, res);
  }
};

export const obtenerInsumoPorId = async (req, res) => {
  try {
    const data = await obtenerInsumo(req.params.id);
    return res.status(200).json({ data });
  } catch (error) {
    return manejarError(error, res);
  }
};

export const registrarInsumo = async (req, res) => {
  try {
    const data = await crearInsumo(req.body ?? {});
    return res.status(201).json({
      message: "Insumo registrado correctamente",
      data
    });
  } catch (error) {
    return manejarError(error, res);
  }
};

export const editarInsumo = async (req, res) => {
  try {
    const data = await actualizarInsumo(
      req.params.id,
      req.body ?? {}
    );

    return res.status(200).json({
      message: "Insumo actualizado correctamente",
      data
    });
  } catch (error) {
    return manejarError(error, res);
  }
};

export const borrarInsumo = async (req, res) => {
  try {
    await eliminarInsumo(req.params.id);

    return res.status(200).json({
      message: "Insumo desactivado correctamente"
    });
  } catch (error) {
    return manejarError(error, res);
  }
};

export const resumenInventario = async (req, res) => {
  try {
    const data = await obtenerResumenInventario();
    return res.status(200).json({ data });
  } catch (error) {
    return manejarError(error, res);
  }
};
