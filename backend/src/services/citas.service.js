import prisma from "../config/prisma.js";

export class CitaError extends Error {
    constructor(message, status = 400) {
        super(message);
        this.name = "CitaError";
        this.status = status;
    }
}

const DURACION_CITA_MINUTOS = 30;

const ESTADOS = [
    "PROGRAMADA",
    "CONFIRMADA",
    "CANCELADA",
    "NO_ASISTIO"
];

const ESTADOS_OCUPADOS = [
    "PROGRAMADA",
    "CONFIRMADA"
];

const validarId = (valor, campo) => {
    if (!/^[1-9]\d*$/.test(String(valor ?? ""))) {
        throw new CitaError(`${campo} debe ser un ID válido`);
    }

    const id = BigInt(valor);

    if (id > 9223372036854775807n) {
        throw new CitaError(`${campo} está fuera de rango`);
    }

    return id;
};

// Convierte fecha y hora de Costa Rica a UTC.
const convertirFechaHora = (fecha, hora) => {
    if (
        typeof fecha !== "string" ||
        !/^\d{4}-\d{2}-\d{2}$/.test(fecha) ||
        typeof hora !== "string" ||
        !/^([01]\d|2[0-3]):[0-5]\d$/.test(hora)
    ) {
        throw new CitaError(
            "Fecha y hora deben tener formato YYYY-MM-DD y HH:mm"
        );
    }

    const [anio, mes, dia] = fecha.split("-").map(Number);
    const [horas, minutos] = hora.split(":").map(Number);

    const fechaBase = new Date(
        Date.UTC(anio, mes - 1, dia, horas, minutos)
    );

    if (
        fechaBase.getUTCFullYear() !== anio ||
        fechaBase.getUTCMonth() !== mes - 1 ||
        fechaBase.getUTCDate() !== dia
    ) {
        throw new CitaError("La fecha indicada no existe");
    }

    // Costa Rica utiliza UTC-06:00 todo el año.
    return new Date(fechaBase.getTime() + 6 * 60 * 60 * 1000);
};


const citaAJson = (cita) => ({
    id_cita: cita.id_cita.toString(),
    id_paciente: cita.id_paciente.toString(),
    id_medico: cita.id_medico.toString(),

    paciente: cita.pacientes
        ? `${cita.pacientes.nombre} ${cita.pacientes.apellido}`
        : null,

    medico: cita.medicos
        ? `${cita.medicos.nombre} ${cita.medicos.apellido}`
        : null,

    fecha_hora_inicio: cita.fecha_hora_inicio.toISOString(),
    fecha_hora_fin: cita.fecha_hora_fin.toISOString(),

    motivo: cita.motivo,
    estado: cita.estado,
    observaciones: cita.observaciones,
    creado_por: cita.creado_por?.toString() ?? null,
    fecha_creacion: cita.fecha_creacion.toISOString()
});

const incluirRelaciones = {
    pacientes: {
        select: {
            nombre: true,
            apellido: true
        }
    },
    medicos: {
        select: {
            nombre: true,
            apellido: true
        }
    }
};

export const registrarCita = async (datos, idUsuario) => {
    const {
        id_paciente,
        id_medico,
        fecha,
        hora,
        motivo,
        estado
    } = datos;

    const idPaciente = validarId(id_paciente, "id_paciente");
    const idMedico = validarId(id_medico, "id_medico");
    const idCreador = validarId(idUsuario, "creado_por");

    if (typeof motivo !== "string" || !motivo.trim()) {
        throw new CitaError("El motivo de la cita es obligatorio");
    }

    if (motivo.trim().length > 300) {
        throw new CitaError(
            "El motivo no puede superar 300 caracteres"
        );
    }

    if (!ESTADOS.includes(estado)) {
        throw new CitaError("Estado de cita no válido");
    }

    const inicio = convertirFechaHora(fecha, hora);

    if (inicio <= new Date()) {
        throw new CitaError(
            "La fecha y hora de la cita deben ser futuras"
        );
    }

    const fin = new Date(
        inicio.getTime() + DURACION_CITA_MINUTOS * 60 * 1000
    );

    return prisma.$transaction(async (tx) => {
        // Serializa las reservas de un mismo médico.
        /*
         * La transacción utiliza un bloqueo de PostgreSQL por identificador del médico (pg_advisory_xact_lock).
         * De esta manera, las solicitudes de creación que utilicen este servicio se procesarán secuencialmente
         * para un mismo médico. Esto evita esa carrera entre solicitudes de este endpoint.
         */
        await tx.$executeRaw`
            SELECT pg_advisory_xact_lock(${idMedico}::bigint)
        `;

        const paciente = await tx.pacientes.findUnique({
            where: { id_paciente: idPaciente },
            select: { activo: true }
        });

        if (!paciente || !paciente.activo) {
            throw new CitaError(
                "El paciente no existe o está inactivo",
                404
            );
        }

        const medico = await tx.medicos.findUnique({
            where: { id_medico: idMedico },
            select: {
                activo: true,
                usuarios: {
                    select: {
                        activo: true,
                        roles: {
                            select: {
                                nombre: true,
                                activo: true
                            }
                        }
                    }
                }
            }
        });

        if (
            !medico ||
            !medico.activo ||
            !medico.usuarios.activo ||
            !medico.usuarios.roles.activo ||
            medico.usuarios.roles.nombre !== "MEDICO"
        ) {
            throw new CitaError(
                "El médico no existe o no está habilitado",
                404
            );
        }

        // Dos citas se solapan si:
        // inicioExistente < finNuevo
        // y finExistente > inicioNuevo.
        if (ESTADOS_OCUPADOS.includes(estado)) {
            const conflicto = await tx.citas.findFirst({
                where: {
                    id_medico: idMedico,
                    estado: {
                        in: ESTADOS_OCUPADOS
                    },
                    fecha_hora_inicio: {
                        lt: fin
                    },
                    fecha_hora_fin: {
                        gt: inicio
                    }
                },
                select: {
                    id_cita: true
                }
            });

            if (conflicto) {
                throw new CitaError(
                    "El médico ya tiene una cita en ese horario",
                    409
                );
            }
        }

        const cita = await tx.citas.create({
            data: {
                id_paciente: idPaciente,
                id_medico: idMedico,
                fecha_hora_inicio: inicio,
                fecha_hora_fin: fin,
                motivo: motivo.trim(),
                estado,
                creado_por: idCreador
            },
            include: incluirRelaciones
        });

        return citaAJson(cita);
    });
};


export const listarCitas = async () => {
    const citas = await prisma.citas.findMany({
        include: incluirRelaciones,
        orderBy: {
            fecha_hora_inicio: "desc"
        }
    });

    return citas.map(citaAJson);
};


export const obtenerCita = async (id) => {
    const idCita = validarId(id, "id_cita");

    const cita = await prisma.citas.findUnique({
        where: {
            id_cita: idCita
        },
        include: incluirRelaciones
    });

    if (!cita) {
        throw new CitaError(
            "Cita no encontrada",
            404
        );
    }

    return citaAJson(cita);
};

export const actualizarCita = async (id, datos) => {
    const idCita = validarId(id, "id_cita");

    const {
        id_paciente,
        id_medico,
        fecha,
        hora,
        motivo,
        estado
    } = datos;

    const idPaciente = validarId(id_paciente, "id_paciente");
    const idMedico = validarId(id_medico, "id_medico");

    if (typeof motivo !== "string" || !motivo.trim()) {
        throw new CitaError("El motivo es obligatorio");
    }

    if (motivo.trim().length > 300) {
        throw new CitaError(
            "El motivo no puede superar 300 caracteres"
        );
    }

    if (!ESTADOS.includes(estado)) {
        throw new CitaError("Estado de cita no válido");
    }

    const inicio = convertirFechaHora(fecha, hora);

    const fin = new Date(
        inicio.getTime() + DURACION_CITA_MINUTOS * 60 * 1000
    );

    return prisma.$transaction(async (tx) => {
        // Bloquear la cita mientras se actualiza
        await tx.$executeRaw`
            SELECT pg_advisory_xact_lock(${idMedico}::bigint)
        `;

        const citaActual = await tx.citas.findUnique({
            where: { id_cita: idCita }
        });

        if (!citaActual) {
            throw new CitaError("Cita no encontrada", 404);
        }

        // Verificar paciente
        const paciente = await tx.pacientes.findUnique({
            where: { id_paciente: idPaciente },
            select: { activo: true }
        });

        if (!paciente || !paciente.activo) {
            throw new CitaError(
                "El paciente no existe o está inactivo",
                404
            );
        }

        // Verificar médico
        const medico = await tx.medicos.findUnique({
            where: { id_medico: idMedico },
            select: {
                activo: true,
                usuarios: {
                    select: {
                        activo: true,
                        roles: {
                            select: {
                                nombre: true,
                                activo: true
                            }
                        }
                    }
                }
            }
        });

        if (
            !medico ||
            !medico.activo ||
            !medico.usuarios.activo ||
            !medico.usuarios.roles.activo ||
            medico.usuarios.roles.nombre !== "MEDICO"
        ) {
            throw new CitaError(
                "El médico no existe o no está habilitado",
                404
            );
        }

        if (ESTADOS_OCUPADOS.includes(estado)) {
            const conflicto = await tx.citas.findFirst({
                where: {
                    id_cita: { not: idCita },
                    id_medico: idMedico,
                    estado: {
                        in: ESTADOS_OCUPADOS
                    },
                    fecha_hora_inicio: { lt: fin },
                    fecha_hora_fin: { gt: inicio }
                },
                select: { id_cita: true }
            });

            if (conflicto) {
                throw new CitaError(
                    "El médico ya tiene una cita en ese horario",
                    409
                );
            }
        }

        const cita = await tx.citas.update({
            where: { id_cita: idCita },
            data: {
                id_paciente: idPaciente,
                id_medico: idMedico,
                fecha_hora_inicio: inicio,
                fecha_hora_fin: fin,
                motivo: motivo.trim(),
                estado
            },
            include: incluirRelaciones
        });

        return citaAJson(cita);
    });
};


export const cambiarEstadoCita = async (id, estado) => {
    const idCita = validarId(id, "id_cita");

    if (!["CONFIRMADA", "CANCELADA"].includes(estado)) {
        throw new CitaError(
            "Solo se permite CONFIRMADA o CANCELADA"
        );
    }

    return prisma.$transaction(async (tx) => {
        const citaActual = await tx.citas.findUnique({
            where: { id_cita: idCita }
        });

        if (!citaActual) {
            throw new CitaError("Cita no encontrada", 404);
        }

        await tx.$executeRaw`
            SELECT pg_advisory_xact_lock(
                ${citaActual.id_medico}::bigint
            )
        `;

        // Volver a leer dentro del bloqueo
        const cita = await tx.citas.findUnique({
            where: { id_cita: idCita }
        });

        if (!cita) {
            throw new CitaError("Cita no encontrada", 404);
        }

        if (cita.estado === estado) {
            throw new CitaError(
                `La cita ya está ${estado}`,
                409
            );
        }

        if (
            cita.estado === "CANCELADA" ||
            cita.estado === "NO_ASISTIO"
        ) {
            throw new CitaError(
                "No se puede cambiar el estado de una cita finalizada",
                409
            );
        }

        const actualizada = await tx.citas.update({
            where: { id_cita: idCita },
            data: { estado },
            include: incluirRelaciones
        });

        return citaAJson(actualizada);
    });
};
