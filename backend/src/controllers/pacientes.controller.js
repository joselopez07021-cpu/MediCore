// pacientes.controller.js
import { Prisma } from "@prisma/client";

import {
    registrarPaciente,
    listarPacientes,
    listarPacientesPaginados,
    obtenerPaciente,
    actualizarPaciente,
    eliminarPaciente,
    cambiarEstadoPaciente,
    PacienteError
} from "../services/pacientes.service.js";

const manejarError = (error, res) => {

    if (
        error instanceof RangeError ||
        error.message === "El número de página debe ser un entero positivo" ||
        error.message === "Número de página inválido" ||
        error.message === "Número de página fuera de rango"
    ) {
        return res.status(400).json({
            message: error.message
        });
    }

    if (error instanceof PacienteError) {
        return res.status(error.status).json({
            message: error.message
        });
    }

    if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === "P2002"
    ) {
        return res.status(409).json({
            message: "Ya existe un paciente con esa identificación"
        });
    }

    if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === "P2025"
    ) {
        return res.status(404).json({
            message: "Paciente no encontrado"
        });
    }

    console.error("Error en módulo de pacientes:", error);

    return res.status(500).json({
        message: "Error interno del servidor"
    });
};

export const crearPaciente = async (req, res) => {
    try {
        const paciente = await registrarPaciente(req.body ?? {});

        return res.status(201).json({
            message: "Paciente registrado correctamente",
            data: paciente
        });
    } catch (error) {
        return manejarError(error, res);
    }
};

export const obtenerPacientes = async (req, res) => {
    try {
        const pacientes = await listarPacientes(req.query.activo);

        return res.status(200).json({
            message: "Pacientes obtenidos correctamente",
            data: pacientes
        });
    } catch (error) {
        return manejarError(error, res);
    }
};

export const obtenerPacientesPaginados = async (req, res) => {
    try {
        const resultado = await listarPacientesPaginados(
            req.query
        );

        return res.status(200).json({
            message: "Pacientes obtenidos correctamente",
            ...resultado
        });
    } catch (error) {
        return manejarError(error, res);
    }
};

export const obtenerPacientePorId = async (req, res) => {
    try {
        const paciente = await obtenerPaciente(req.params.id);

        return res.status(200).json({
            message: "Paciente obtenido correctamente",
            data: paciente
        });
    } catch (error) {
        return manejarError(error, res);
    }
};

export const editarPaciente = async (req, res) => {
    try {
        const paciente = await actualizarPaciente(
            req.params.id,
            req.body ?? {}
        );

        return res.status(200).json({
            message: "Paciente actualizado correctamente",
            data: paciente
        });
    } catch (error) {
        return manejarError(error, res);
    }
};

export const borrarPaciente = async (req, res) => {
    try {
        const paciente = await eliminarPaciente(req.params.id);

        return res.status(200).json({
            message: "Paciente desactivado correctamente",
            data: paciente
        });
    } catch (error) {
        return manejarError(error, res);
    }
};

export const actualizarEstadoPaciente = async (req, res) => {
    try {
        const paciente = await cambiarEstadoPaciente(
            req.params.id,
            req.body?.activo
        );

        return res.status(200).json({
            message: "Estado del paciente actualizado correctamente",
            data: paciente
        });
    } catch (error) {
        return manejarError(error, res);
    }
};
