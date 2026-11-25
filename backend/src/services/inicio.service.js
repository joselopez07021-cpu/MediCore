// inicio.service.js
import prisma from "../config/prisma.js";
import { obtenerResumenCitas } from "./citas.service.js";

// Ajustar ambas rutas de importación a tu estructura real.

function fechaActualCostaRica() {
  const partes = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/Costa_Rica",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());

  const valores = Object.fromEntries(
    partes.map(({ type, value }) => [type, value]),
  );

  return `${valores.year}-${valores.month}-${valores.day}`;
}

function rangoDiaCostaRica(fecha) {
  const inicio = new Date(`${fecha}T06:00:00.000Z`);
  const fin = new Date(inicio.getTime() + 24 * 60 * 60 * 1000);

  return {
    gte: inicio,
    lt: fin,
  };
}

export async function obtenerResumenInicio(usuario) {
  const rol = usuario.roles.nombre;
  const medico = rol === "MEDICO" ? usuario.medicos?.id_medico : undefined;
  const puedeAgenda = ["ADMINISTRADOR", "ADMISION", "MEDICO"].includes(rol);
  const puedeInventario = ["ADMINISTRADOR", "INVENTARIO"].includes(rol);
  const filtroMedico = medico ? { id_medico: medico } : {};
  const fecha = fechaActualCostaRica();
  const rangoHoy = rangoDiaCostaRica(fecha);

  const filtroReposicion = {
    activo: true,
    stock_actual: {
      lte: prisma.insumos.fields.stock_minimo,
    },
  };

  const [
    pacientesRegistrados,
    citasHoy,
    atencionesRegistradas,
    insumosPorReponer,
    resumenCitas,
    citasAgenda,
    insumosReposicion,
  ] = await Promise.all([
    rol === "MEDICO"
      ? prisma.pacientes.count({ where: { citas: { some: filtroMedico } } })
      : rol === "INVENTARIO"
        ? 0
        : prisma.pacientes.count(),

    puedeAgenda
      ? prisma.citas.count({
          where: {
            fecha_hora_inicio: rangoHoy,
            ...filtroMedico,
          },
        })
      : 0,

    rol === "INVENTARIO"
      ? 0
      : prisma.atenciones.count({
          where: medico ? { citas: filtroMedico } : {},
        }),

    puedeInventario
      ? prisma.insumos.count({
          where: filtroReposicion,
        })
      : 0,

    puedeAgenda
      ? obtenerResumenCitas(medico ? { id_medico: String(medico) } : {})
      : { por_estado: {} },

    puedeAgenda
      ? prisma.citas.findMany({
          where: {
            fecha_hora_inicio: rangoHoy,
            ...filtroMedico,
          },
          select: {
            id_cita: true,
            fecha_hora_inicio: true,
            fecha_hora_fin: true,
            motivo: true,
            estado: true,

            pacientes: {
              select: {
                id_paciente: true,
                nombre: true,
                apellido: true,
              },
            },

            medicos: {
              select: {
                id_medico: true,
                nombre: true,
                apellido: true,
                especialidad: true,
              },
            },
          },
          orderBy: {
            fecha_hora_inicio: "asc",
          },
          take: 10,
        })
      : [],

    puedeInventario
      ? prisma.insumos.findMany({
          where: filtroReposicion,
          select: {
            id_insumo: true,
            codigo: true,
            nombre: true,
            unidad_medida: true,
            stock_actual: true,
            stock_minimo: true,
          },
          orderBy: {
            stock_actual: "asc",
          },
          take: 5,
        })
      : [],
  ]);

  return {
    fecha,

    indicadores: {
      pacientes_registrados: pacientesRegistrados,
      citas_hoy: citasHoy,
      atenciones_registradas: atencionesRegistradas,
      insumos_por_reponer: insumosPorReponer,
    },

    estados_citas: resumenCitas.por_estado,

    agenda_hoy: citasAgenda.map((cita) => ({
      id_cita: cita.id_cita.toString(),
      fecha_hora_inicio: cita.fecha_hora_inicio,
      fecha_hora_fin: cita.fecha_hora_fin,
      motivo: cita.motivo,
      estado: cita.estado,

      paciente: {
        id_paciente: cita.pacientes.id_paciente.toString(),
        nombre: cita.pacientes.nombre,
        apellido: cita.pacientes.apellido,
      },

      medico: {
        id_medico: cita.medicos.id_medico.toString(),
        nombre: cita.medicos.nombre,
        apellido: cita.medicos.apellido,
        especialidad: cita.medicos.especialidad,
      },
    })),

    reposicion: insumosReposicion.map((insumo) => ({
      id_insumo: insumo.id_insumo.toString(),
      codigo: insumo.codigo,
      nombre: insumo.nombre,
      unidad_medida: insumo.unidad_medida,
      stock_actual: insumo.stock_actual.toString(),
      stock_minimo: insumo.stock_minimo.toString(),
    })),
  };
}
