import prisma from "../config/prisma.js";

export async function catalogoServicios(usuario) {
  const medico =
    usuario.roles.nombre === "MEDICO" ? usuario.medicos?.id_medico : null;
  const servicios = await prisma.servicios_hospitalarios.findMany({
    where: { activo: true },
    orderBy: { nombre: "asc" },
    include: {
      _count: {
        select: {
          detalle_atencion_servicios: {
            where: medico
              ? { atenciones: { citas: { id_medico: medico } } }
              : {},
          },
        },
      },
    },
  });
  return servicios.map(({ _count, id_servicio, ...servicio }) => ({
    ...servicio,
    id_servicio: String(id_servicio),
    atenciones: _count.detalle_atencion_servicios,
  }));
}

export async function directorioUsuarios() {
  const usuarios = await prisma.usuarios.findMany({
    select: {
      id_usuario: true,
      nombre_usuario: true,
      nombre_completo: true,
      correo: true,
      activo: true,
      roles: { select: { nombre: true } },
    },
    orderBy: { nombre_completo: "asc" },
  });
  return usuarios.map(({ id_usuario, roles, ...usuario }) => ({
    ...usuario,
    id_usuario: String(id_usuario),
    rol: roles.nombre,
  }));
}

export function filtrosReporte(query) {
  const { fecha_desde, fecha_hasta, id_medico } = query;
  const fallo = (mensaje) => {
    const error = new Error(mensaje);
    error.status = 400;
    throw error;
  };
  for (const fecha of [fecha_desde, fecha_hasta]) {
    if (
      fecha !== undefined &&
      (typeof fecha !== "string" ||
        !/^\d{4}-\d{2}-\d{2}$/.test(fecha) ||
        Number.isNaN(Date.parse(`${fecha}T00:00:00Z`)) ||
        new Date(`${fecha}T00:00:00Z`).toISOString().slice(0, 10) !== fecha)
    )
      fallo("Fecha inválida");
  }
  if (fecha_desde && fecha_hasta && fecha_desde > fecha_hasta)
    fallo("El inicio no puede superar el final");
  let medico;
  if (id_medico !== undefined) {
    if (
      typeof id_medico !== "string" ||
      !/^[1-9]\d*$/.test(id_medico) ||
      BigInt(id_medico) > 9223372036854775807n
    )
      fallo("Médico inválido");
    medico = BigInt(id_medico);
  }
  const rango = {};
  if (fecha_desde) rango.gte = new Date(`${fecha_desde}T06:00:00Z`);
  if (fecha_hasta)
    rango.lt = new Date(
      new Date(`${fecha_hasta}T06:00:00Z`).getTime() + 86400000,
    );
  return { rango: Object.keys(rango).length ? rango : undefined, medico };
}

export async function reporteOperativo(query) {
  const { rango, medico } = filtrosReporte(query);
  const filtroCitas = { fecha_hora_inicio: rango, id_medico: medico };
  const filtroAtenciones = {
    fecha_atencion: rango,
    citas: medico ? { id_medico: medico } : undefined,
  };
  const [citas, atenciones, servicios, consumos, movimientos, reposicion] =
    await Promise.all([
      prisma.citas.findMany({
        where: filtroCitas,
        select: {
          estado: true,
          id_medico: true,
          medicos: { select: { nombre: true, apellido: true } },
        },
      }),
      prisma.atenciones.count({ where: filtroAtenciones }),
      prisma.detalle_atencion_servicios.findMany({
        where: { atenciones: filtroAtenciones },
        select: {
          id_servicio: true,
          cantidad: true,
          servicios_hospitalarios: { select: { nombre: true } },
        },
      }),
      prisma.consumo_insumos_atencion.findMany({
        where: { atenciones: filtroAtenciones },
        select: {
          id_insumo: true,
          cantidad: true,
          insumos: { select: { nombre: true, unidad_medida: true } },
        },
      }),
      prisma.movimientos_inventario.count({
        where: { fecha_movimiento: rango },
      }),
      prisma.insumos.count({
        where: {
          activo: true,
          stock_actual: { lte: prisma.insumos.fields.stock_minimo },
        },
      }),
    ]);
  const agrupar = (filas, clave, nombre, cantidad, unidad = () => "") => {
    const mapa = new Map();
    for (const fila of filas) {
      const id = String(clave(fila));
      const actual = mapa.get(id) ?? {
        id,
        nombre: nombre(fila),
        cantidad: 0,
        unidad: unidad(fila),
      };
      actual.cantidad += Number(cantidad(fila));
      mapa.set(id, actual);
    }
    return [...mapa.values()].sort((a, b) => b.cantidad - a.cantidad);
  };
  return {
    total_citas: citas.length,
    citas_atendidas: citas.filter((c) => c.estado === "ATENDIDA").length,
    total_atenciones: atenciones,
    total_servicios: servicios.reduce((n, s) => n + Number(s.cantidad), 0),
    total_movimientos: movimientos,
    insumos_por_reponer: reposicion,
    citas_por_medico: agrupar(
      citas,
      (c) => c.id_medico,
      (c) => `${c.medicos.nombre} ${c.medicos.apellido}`,
      () => 1,
    ),
    servicios: agrupar(
      servicios,
      (s) => s.id_servicio,
      (s) => s.servicios_hospitalarios.nombre,
      (s) => s.cantidad,
    ),
    consumos: agrupar(
      consumos,
      (c) => c.id_insumo,
      (c) => c.insumos.nombre,
      (c) => c.cantidad,
      (c) => c.insumos.unidad_medida,
    ),
  };
}
