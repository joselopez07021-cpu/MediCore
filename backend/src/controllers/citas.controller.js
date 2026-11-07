import { Prisma } from "@prisma/client";

import {
    registrarCita,
    listarCitas,
    obtenerCita,
    actualizarCita,
    cambiarEstadoCita,
    CitaError
} from "../services/citas.service.js";

const manejarError = (error, res) => {
    if (error instanceof CitaError) {
        return res.status(error.status).json({
            message: error.message
        });
    }

    if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === "P2025"
    ) {
        return res.status(404).json({
            message: "Cita no encontrada"
        });
    }

    console.error("Error en módulo de citas:", error);

    return res.status(500).json({
        message: "Error interno del servidor"
    });
};

export const crearCita = async (req, res) => {
    try {
        const cita = await registrarCita(
            req.body ?? {},
            req.usuario.id_usuario
        );

        return res.status(201).json({
            message: "Cita registrada correctamente",
            data: cita
        });
    } catch (error) {
        return manejarError(error, res);
    }
};

export const obtenerCitas = async (req, res) => {
    try {
        const citas = await listarCitas();

        return res.status(200).json({
            message: "Citas obtenidas correctamente",
            data: citas
        });
    } catch (error) {
        return manejarError(error, res);
    }
};

export const obtenerCitaPorId = async (req, res) => {
    try {
        const cita = await obtenerCita(req.params.id);

        return res.status(200).json({
            message: "Cita obtenida correctamente",
            data: cita
        });
    } catch (error) {
        return manejarError(error, res);
    }
};

export const editarCita = async (req, res) => {
    try {
        const cita = await actualizarCita(
            req.params.id,
            req.body ?? {}
        );

        return res.status(200).json({
            message: "Cita actualizada correctamente",
            data: cita
        });
    } catch (error) {
        return manejarError(error, res);
    }
};

export const actualizarEstadoCita = async (req, res) => {
    try {
        const cita = await cambiarEstadoCita(
            req.params.id,
            req.body?.estado
        );

        return res.status(200).json({
            message: "Estado de la cita actualizado correctamente",
            data: cita
        });
    } catch (error) {
        return manejarError(error, res);
    }
};
