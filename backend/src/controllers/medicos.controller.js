import {
    listarMedicos,
    MedicoError
} from "../services/medicos.service.js";

export const obtenerMedicos = async (req, res) => {
    try {
        const medicos = await listarMedicos(
            req.query.activo
        );

        return res.status(200).json({
            message: "Médicos obtenidos correctamente",
            data: medicos
        });

    } catch (error) {
        if (error instanceof MedicoError) {
            return res.status(error.status).json({
                message: error.message
            });
        }

        console.error("Error al obtener médicos:", error);

        return res.status(500).json({
            message: "Error interno al obtener médicos"
        });
    }
};
