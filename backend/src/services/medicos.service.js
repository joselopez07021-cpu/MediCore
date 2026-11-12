import prisma from "../config/prisma.js";

export class MedicoError extends Error {
    constructor(message, status = 400) {
        super(message);
        this.name = "MedicoError";
        this.status = status;
    }
}

export const listarMedicos = async (activo) => {
    const where = {};

    // Filtro opcional por estado
    if (activo !== undefined) {
        if (activo !== "true" && activo !== "false") {
            throw new MedicoError(
                "El parámetro activo debe ser true o false"
            );
        }

        where.activo = activo === "true";
    }

    const medicos = await prisma.medicos.findMany({
        where,
        select: {
            id_medico: true,
            identificacion: true,
            nombre: true,
            apellido: true,
            especialidad: true,
            telefono: true,
            correo: true,
            activo: true
        },
        orderBy: [
            { apellido: "asc" },
            { nombre: "asc" }
        ]
    });

    return medicos.map((medico) => ({
        id_medico: medico.id_medico.toString(),
        identificacion: medico.identificacion,
        nombre: medico.nombre,
        apellido: medico.apellido,
        nombre_completo: `${medico.nombre} ${medico.apellido}`,
        especialidad: medico.especialidad,
        telefono: medico.telefono,
        correo: medico.correo,
        activo: medico.activo
    }));
};
