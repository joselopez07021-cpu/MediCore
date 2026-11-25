// citas.service.js
import prisma from "../config/prisma.js";
import { obtenerPaginacion, construirPaginacion } from "./paginacion.utils.js";

export class CitaError extends Error {
  constructor(message, status = 400) {
    super(message);
    this.name = "CitaError";
    this.status = status;
  }
}

const DURACION_CITA_MINUTOS = 30;

const ESTADOS = ["PROGRAMADA", "CONFIRMADA", "CANCELADA", "NO_ASISTIO"];

const ESTADOS_OCUPADOS = ["PROGRAMADA", "CONFIRMADA"];

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
    throw new CitaError("Fecha y hora deben tener formato YYYY-MM-DD y HH:mm");
  }

  const [anio, mes, dia] = fecha.split("-").map(Number);
  const [horas, minutos] = hora.split(":").map(Number);

  const fechaBase = new Date(Date.UTC(anio, mes - 1, dia, horas, minutos));

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
  fecha_creacion: cita.fecha_creacion.toISOString(),
});

const incluirRelaciones = {
  pacientes: {
    select: {
      nombre: true,
      apellido: true,
    },
  },
  medicos: {
    select: {
      nombre: true,
      apellido: true,
    },
  },
};

export const registrarCita = async (datos, idUsuario) => {
  const { id_paciente, id_medico, fecha, hora, motivo, estado } = datos;

  const idPaciente = validarId(id_paciente, "id_paciente");
  const idMedico = validarId(id_medico, "id_medico");
  const idCreador = validarId(idUsuario, "creado_por");

  if (typeof motivo !== "string" || !motivo.trim()) {
    throw new CitaError("El motivo de la cita es obligatorio");
  }

  if (motivo.trim().length > 300) {
    throw new CitaError("El motivo no puede superar 300 caracteres");
  }

  if (!ESTADOS.includes(estado)) {
    throw new CitaError("Estado de cita no válido");
  }

  const inicio = convertirFechaHora(fecha, hora);

  if (inicio <= new Date()) {
    throw new CitaError("La fecha y hora de la cita deben ser futuras");
  }

  const fin = new Date(inicio.getTime() + DURACION_CITA_MINUTOS * 60 * 1000);

  return prisma.$transaction(async (tx) => {
    // Serializa las reservas de un mismo médico.
    /*
     * La transacción utiliza un bloqueo de PostgreSQL por identificador del médico (pg_advisory_xact_lock).
     * De esta manera, las solicitudes de creación que utilicen este servicio se procesarán secuencialmente
     * para un mismo médico. Esto evita esa carrera entre solicitudes de este endpoint.
     */
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(${-idPaciente}::bigint)`;
    await tx.$executeRaw`
            SELECT pg_advisory_xact_lock(${idMedico}::bigint)
        `;

    const paciente = await tx.pacientes.findUnique({
      where: { id_paciente: idPaciente },
      select: { activo: true },
    });

    if (!paciente || !paciente.activo) {
      throw new CitaError("El paciente no existe o está inactivo", 404);
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
                activo: true,
              },
            },
          },
        },
      },
    });

    if (
      !medico ||
      !medico.activo ||
      !medico.usuarios.activo ||
      !medico.usuarios.roles.activo ||
      medico.usuarios.roles.nombre !== "MEDICO"
    ) {
      throw new CitaError("El médico no existe o no está habilitado", 404);
    }

    // Dos citas se solapan si:
    // inicioExistente < finNuevo
    // y finExistente > inicioNuevo.
    if (ESTADOS_OCUPADOS.includes(estado)) {
      const conflicto = await tx.citas.findFirst({
        where: {
          OR: [{ id_medico: idMedico }, { id_paciente: idPaciente }],
          estado: {
            in: ESTADOS_OCUPADOS,
          },
          fecha_hora_inicio: {
            lt: fin,
          },
          fecha_hora_fin: {
            gt: inicio,
          },
        },
        select: {
          id_cita: true,
        },
      });

      if (conflicto) {
        throw new CitaError(
          "El médico o el paciente ya tiene una cita en ese horario",
          409,
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
        creado_por: idCreador,
      },
      include: incluirRelaciones,
    });

    return citaAJson(cita);
  });
};

export const listarCitas = async (idMedico) => {
  const citas = await prisma.citas.findMany({
    where: idMedico ? { id_medico: idMedico } : {},
    include: incluirRelaciones,
    orderBy: {
      fecha_hora_inicio: "desc",
    },
  });

  return citas.map(citaAJson);
};

export const listarCitasPaginadas = async (filtros = {}) => {
  const { pagina, limite, skip } = obtenerPaginacion(filtros.page ?? "1", 8);

  const where = filtros.id_medico
    ? { id_medico: validarId(filtros.id_medico, "id_medico") }
    : {};

  const [total, citas] = await Promise.all([
    prisma.citas.count({ where }),

    prisma.citas.findMany({
      where,
      include: incluirRelaciones,
      orderBy: [{ fecha_hora_inicio: "desc" }, { id_cita: "desc" }],
      skip,
      take: limite,
    }),
  ]);

  return {
    data: citas.map(citaAJson),
    paginacion: construirPaginacion(pagina, limite, total),
  };
};

export const obtenerCita = async (id) => {
  const idCita = validarId(id, "id_cita");

  const cita = await prisma.citas.findUnique({
    where: {
      id_cita: idCita,
    },
    include: incluirRelaciones,
  });

  if (!cita) {
    throw new CitaError("Cita no encontrada", 404);
  }

  return citaAJson(cita);
};

export const actualizarCita = async (id, datos) => {
  const idCita = validarId(id, "id_cita");

  const { id_paciente, id_medico, fecha, hora, motivo, estado } = datos;

  const idPaciente = validarId(id_paciente, "id_paciente");
  const idMedico = validarId(id_medico, "id_medico");

  if (typeof motivo !== "string" || !motivo.trim()) {
    throw new CitaError("El motivo es obligatorio");
  }

  if (motivo.trim().length > 300) {
    throw new CitaError("El motivo no puede superar 300 caracteres");
  }

  if (!ESTADOS.includes(estado)) {
    throw new CitaError("Estado de cita no válido");
  }

  const inicio = convertirFechaHora(fecha, hora);

  const fin = new Date(inicio.getTime() + DURACION_CITA_MINUTOS * 60 * 1000);

  return prisma.$transaction(async (tx) => {
    // Bloquear la cita mientras se actualiza
    await tx.$queryRaw`SELECT id_cita FROM public.citas WHERE id_cita = ${idCita} FOR UPDATE`;
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(${-idPaciente}::bigint)`;
    await tx.$executeRaw`
            SELECT pg_advisory_xact_lock(${idMedico}::bigint)
        `;

    const citaActual = await tx.citas.findUnique({
      where: { id_cita: idCita },
    });

    if (!citaActual) {
      throw new CitaError("Cita no encontrada", 404);
    }
    if (citaActual.estado === "ATENDIDA") {
      throw new CitaError(
        "No se puede editar una cita con atención registrada",
        409,
      );
    }
    if (
      inicio <= new Date() &&
      inicio.getTime() !== citaActual.fecha_hora_inicio.getTime()
    ) {
      throw new CitaError("La nueva fecha y hora deben ser futuras");
    }

    // Verificar paciente
    const paciente = await tx.pacientes.findUnique({
      where: { id_paciente: idPaciente },
      select: { activo: true },
    });

    if (!paciente || !paciente.activo) {
      throw new CitaError("El paciente no existe o está inactivo", 404);
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
                activo: true,
              },
            },
          },
        },
      },
    });

    if (
      !medico ||
      !medico.activo ||
      !medico.usuarios.activo ||
      !medico.usuarios.roles.activo ||
      medico.usuarios.roles.nombre !== "MEDICO"
    ) {
      throw new CitaError("El médico no existe o no está habilitado", 404);
    }

    if (ESTADOS_OCUPADOS.includes(estado)) {
      const conflicto = await tx.citas.findFirst({
        where: {
          id_cita: { not: idCita },
          OR: [{ id_medico: idMedico }, { id_paciente: idPaciente }],
          estado: {
            in: ESTADOS_OCUPADOS,
          },
          fecha_hora_inicio: { lt: fin },
          fecha_hora_fin: { gt: inicio },
        },
        select: { id_cita: true },
      });

      if (conflicto) {
        throw new CitaError(
          "El médico o el paciente ya tiene una cita en ese horario",
          409,
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
        estado,
      },
      include: incluirRelaciones,
    });

    return citaAJson(cita);
  });
};

export const cambiarEstadoCita = async (id, estado) => {
  const idCita = validarId(id, "id_cita");

  if (!["CONFIRMADA", "CANCELADA"].includes(estado)) {
    throw new CitaError("Solo se permite CONFIRMADA o CANCELADA");
  }

  return prisma.$transaction(async (tx) => {
    await tx.$queryRaw`SELECT id_cita FROM public.citas WHERE id_cita = ${idCita} FOR UPDATE`;
    const citaActual = await tx.citas.findUnique({
      where: { id_cita: idCita },
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
      where: { id_cita: idCita },
    });

    if (!cita) {
      throw new CitaError("Cita no encontrada", 404);
    }

    if (cita.estado === estado) {
      throw new CitaError(`La cita ya está ${estado}`, 409);
    }

    if (
      cita.estado === "ATENDIDA" ||
      cita.estado === "CANCELADA" ||
      cita.estado === "NO_ASISTIO"
    ) {
      throw new CitaError(
        "No se puede cambiar el estado de una cita finalizada",
        409,
      );
    }

    const actualizada = await tx.citas.update({
      where: { id_cita: idCita },
      data: { estado },
      include: incluirRelaciones,
    });

    return citaAJson(actualizada);
  });
};

const construirFiltroAgenda = (fecha, id_medico) => {
  if (typeof fecha !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(fecha)) {
    throw new CitaError(
      "La fecha es obligatoria y debe tener formato YYYY-MM-DD",
    );
  }

  // Inicio del día en Costa Rica, convertido a UTC.
  const inicioDia = convertirFechaHora(fecha, "00:00");

  const finDia = new Date(inicioDia.getTime() + 24 * 60 * 60 * 1000);

  const where = {
    fecha_hora_inicio: {
      gte: inicioDia,
      lt: finDia,
    },
  };

  if (id_medico !== undefined) {
    where.id_medico = validarId(id_medico, "id_medico");
  }

  return where;
};

export const obtenerAgendaMedica = async (fecha, id_medico) => {
  const where = construirFiltroAgenda(fecha, id_medico);

  const citas = await prisma.citas.findMany({
    where,
    include: incluirRelaciones,
    orderBy: [{ fecha_hora_inicio: "asc" }, { id_cita: "asc" }],
  });

  return citas.map(citaAJson);
};

export const listarAgendaPaginada = async (filtros = {}) => {
  const { fecha, id_medico } = filtros;

  const { pagina, limite, skip } = obtenerPaginacion(filtros.page ?? "1", 8);

  const where = construirFiltroAgenda(fecha, id_medico);

  const [total, citas] = await Promise.all([
    prisma.citas.count({ where }),

    prisma.citas.findMany({
      where,
      include: incluirRelaciones,
      orderBy: [{ fecha_hora_inicio: "asc" }, { id_cita: "asc" }],
      skip,
      take: limite,
    }),
  ]);

  return {
    data: citas.map(citaAJson),
    paginacion: construirPaginacion(pagina, limite, total),
  };
};

const ESTADOS_CITA = [
  "PROGRAMADA",
  "CONFIRMADA",
  "ATENDIDA",
  "CANCELADA",
  "NO_ASISTIO",
];

function fechaValida(valor) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(valor)) return false;

  const fecha = new Date(`${valor}T00:00:00.000Z`);

  return (
    !Number.isNaN(fecha.getTime()) && fecha.toISOString().slice(0, 10) === valor
  );
}

// MediCore opera en horario de Costa Rica (UTC-06:00).
// Costa Rica no utiliza horario de verano.
function inicioDiaCostaRica(valor) {
  return new Date(`${valor}T06:00:00.000Z`);
}

function siguienteDiaCostaRica(valor) {
  const fecha = inicioDiaCostaRica(valor);
  fecha.setUTCDate(fecha.getUTCDate() + 1);
  return fecha;
}

function construirFiltrosResumen(query) {
  const { fecha_desde, fecha_hasta, id_medico } = query;
  const where = {};

  if (fecha_desde && !fechaValida(fecha_desde)) {
    const error = new Error("fecha_desde debe tener formato YYYY-MM-DD");
    error.status = 400;
    throw error;
  }

  if (fecha_hasta && !fechaValida(fecha_hasta)) {
    const error = new Error("fecha_hasta debe tener formato YYYY-MM-DD");
    error.status = 400;
    throw error;
  }

  if (fecha_desde && fecha_hasta && fecha_desde > fecha_hasta) {
    const error = new Error("fecha_desde no puede superar fecha_hasta");
    error.status = 400;
    throw error;
  }

  if (fecha_desde || fecha_hasta) {
    where.fecha_hora_inicio = {};

    if (fecha_desde) {
      where.fecha_hora_inicio.gte = inicioDiaCostaRica(fecha_desde);
    }

    if (fecha_hasta) {
      where.fecha_hora_inicio.lt = siguienteDiaCostaRica(fecha_hasta);
    }
  }

  if (id_medico !== undefined) {
    if (!/^[1-9]\d*$/.test(String(id_medico))) {
      const error = new Error("id_medico debe ser un ID válido");
      error.status = 400;
      throw error;
    }

    where.id_medico = BigInt(id_medico);
  }

  return where;
}

export async function obtenerResumenCitas(query = {}) {
  const where = construirFiltrosResumen(query);

  const resultados = await prisma.citas.groupBy({
    by: ["estado"],
    where,
    _count: {
      _all: true,
    },
  });

  const porEstado = Object.fromEntries(
    ESTADOS_CITA.map((estado) => [estado, 0]),
  );

  for (const resultado of resultados) {
    porEstado[resultado.estado] = resultado._count._all;
  }

  return {
    total: Object.values(porEstado).reduce(
      (total, cantidad) => total + cantidad,
      0,
    ),
    por_estado: porEstado,
  };
}
