import {
    listarMovimientos,
    listarMovimientosPaginados,
    obtenerMovimiento,
    registrarMovimiento
} from "../services/movimientos-inventario.service.js";

import { InventarioError } from "../services/inventario.utils.js";

const manejarError = (error, res) => {
    if (error instanceof InventarioError) {
        return res.status(error.status).json({
            message: error.message
        });
    }

    console.error("Error en movimientos:", error);

    return res.status(500).json({
        message: "Error interno al procesar movimientos"
    });
};

export const obtenerMovimientos = async (req, res) => {
    try {
        const data = await listarMovimientos(req.query);
        return res.status(200).json({ data });
    } catch (error) {
        return manejarError(error, res);
    }
};

export const obtenerMovimientosPaginados = async (req, res) => {
    try {
        const resultado = await listarMovimientosPaginados(req.query);

        return res.status(200).json({
            message: "Movimientos obtenidos correctamente",
            ...resultado
        });
    } catch (error) {
        return manejarError(error, res);
    }
};

export const obtenerMovimientoPorId = async (req, res) => {
    try {
        const data = await obtenerMovimiento(req.params.id);
        return res.status(200).json({ data });
    } catch (error) {
        return manejarError(error, res);
    }
};

export const crearMovimiento = async (req, res) => {
    try {
        const data = await registrarMovimiento(
            req.body ?? {},
            req.usuario.id_usuario
        );

        return res.status(201).json({
            message: "Movimiento registrado correctamente",
            data
        });
    } catch (error) {
        return manejarError(error, res);
    }
};
