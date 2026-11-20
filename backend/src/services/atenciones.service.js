import { Prisma } from "@prisma/client";
import prisma from "../config/prisma.js";

export class AtencionError extends Error {
  constructor(message, status = 400) {
    super(message);
    this.name = "AtencionError";
    this.status = status;
  }
}

const idValido = (valor, campo = "id") => {
  if (!/^[1-9]\d*$/.test(String(valor ?? ""))) {
    throw new AtencionError(`${campo} no válido`);
  }
  const id = BigInt(valor);
  if (id > 9223372036854775807n) {
    throw new AtencionError(`${campo} fuera de rango`);
  }
  return id;
};

const fechaValida = (valor) => {
  if (typeof valor !== "string" ||
      !/^\d{4}-\d{2}-\d{2}$/.test(valor)) {
    throw new AtencionError("Fecha inválida. Use YYYY-MM-DD");
  }
  const fecha = new Date(`${valor}T00:00:00.000Z`);
  if (Number.isNaN(fecha.getTime()) ||
      fecha.toISOString().slice(0, 10) !== valor) {
    throw new AtencionError("Fecha inválida");
  }
  return fecha;
};

const rangoFecha = (fecha) => {
  fechaValida(fecha);
  const inicio = new Date(`${fecha}T06:00:00.000Z`);
  const fin = new Date(inicio.getTime() + 86400000);
  return { gte: inicio, lt: fin };
};

const texto = (valor, campo, obligatorio = false) => {
  if (valor == null && !obligatorio) return null;
  if (typeof valor !== "string") {
    throw new AtencionError(`${campo} debe ser texto`);
  }
  const limpio = valor.trim();
  if (obligatorio && !limpio) {
    throw new AtencionError(`${campo} es obligatorio`);
  }
  return limpio || null;
};

const cantidadValida = (valor, campo, maxDecimales = 2) => {
  if (typeof valor !== "number" && typeof valor !== "string") {
    throw new AtencionError(`${campo} debe ser numérico`);
  }
  const cadena = String(valor);
  const expresion = maxDecimales === 2
    ? /^(?:\d+)(?:\.\d{1,2})?$/
    : /^(?:\d+)$/;

  if (!expresion.test(cadena)) {
    throw new AtencionError(`${campo} tiene formato inválido`);
  }

  const numero = new Prisma.Decimal(cadena);
  if (!numero.isFinite() || numero.lte(0)) {
    throw new AtencionError(`${campo} debe ser mayor que cero`);
  }
  return numero;
};

const relaciones = {
  citas: {
    include: {
      pacientes: true,
      medicos: true
    }
  },
  detalle_atencion_servicios: {
    include: { servicios_hospitalarios: true }
  },
  consumo_insumos_atencion: {
    include: { insumos: true }
  }
};

const serializarCita = (cita) => ({
  id_cita: String(cita.id_cita),
  id_paciente: String(cita.id_paciente),
  id_medico: String(cita.id_medico),
  paciente: `${cita.pacientes.nombre} ${cita.pacientes.apellido}`,
  medico: `${cita.medicos.nombre} ${cita.medicos.apellido}`,
  fecha_hora_inicio: cita.fecha_hora_inicio.toISOString(),
  fecha_hora_fin: cita.fecha_hora_fin.toISOString(),
  motivo: cita.motivo,
  estado: cita.estado
});

const serializarAtencion = (atencion) => ({
  id_atencion: String(atencion.id_atencion),
  referencia: `AT-${String(atencion.id_atencion).padStart(4, "0")}`,
  id_cita: String(atencion.id_cita),
  id_paciente: String(atencion.citas.id_paciente),
  id_medico: String(atencion.citas.id_medico),
  paciente: `${atencion.citas.pacientes.nombre} ${atencion.citas.pacientes.apellido}`,
  medico: `${atencion.citas.medicos.nombre} ${atencion.citas.medicos.apellido}`,
  fecha_atencion: atencion.fecha_atencion.toISOString(),
  motivo_atencion: atencion.motivo_atencion,
  diagnostico: atencion.diagnostico,
  notas: atencion.notas,
  estado: atencion.estado,
  total_servicios: atencion.detalle_atencion_servicios.length,
  servicios: atencion.detalle_atencion_servicios.map((detalle) => ({
    id_servicio: String(detalle.id_servicio),
    nombre: detalle.servicios_hospitalarios.nombre,
    cantidad: Number(detalle.cantidad),
    observaciones: detalle.observaciones
  })),
  insumos: atencion.consumo_insumos_atencion.map((consumo) => ({
    id_consumo: String(consumo.id_consumo),
    id_insumo: String(consumo.id_insumo),
    nombre: consumo.insumos.nombre,
    unidad_medida: consumo.insumos.unidad_medida,
    cantidad: Number(consumo.cantidad)
  }))
});

const contextoUsuario = async (usuario) => {
  const idUsuario = idValido(usuario?.id_usuario, "id_usuario");

  const registro = await prisma.usuarios.findUnique({
    where: { id_usuario: idUsuario },
    include: { roles: true, medicos: true }
  });

  if (!registro?.activo || !registro.roles?.activo) {
    throw new AtencionError("Usuario no autorizado", 403);
  }

  const rol = registro.roles.nombre;
  if (!["ADMINISTRADOR", "MEDICO", "ADMISION"].includes(rol)) {
    throw new AtencionError("Rol no autorizado", 403);
  }

  if (rol === "MEDICO" && (!registro.medicos || !registro.medicos.activo)) {
    throw new AtencionError("No existe un perfil médico activo", 403);
  }

  return {
    idUsuario,
    rol,
    idMedico: registro.medicos?.id_medico ?? null
  };
};

const filtroMedico = (ctx, idMedico) => {
  if (ctx.rol === "MEDICO") {
    if (idMedico !== undefined &&
        idValido(idMedico, "id_medico") !== ctx.idMedico) {
      throw new AtencionError("No puede consultar otro médico", 403);
    }
    return ctx.idMedico;
  }

  return idMedico === undefined
    ? undefined
    : idValido(idMedico, "id_medico");
};

export const listarCatalogosAtencion = async () => {
  const [servicios, insumos] = await Promise.all([
    prisma.servicios_hospitalarios.findMany({
      where: { activo: true },
      orderBy: { nombre: "asc" }
    }),
    prisma.insumos.findMany({
      where: { activo: true },
      orderBy: { nombre: "asc" }
    })
  ]);

  return {
    servicios: servicios.map((s) => ({
      id_servicio: String(s.id_servicio),
      codigo: s.codigo,
      nombre: s.nombre,
      descripcion: s.descripcion,
      duracion_estimada_minutos: s.duracion_estimada_minutos
    })),
    insumos: insumos.map((i) => ({
      id_insumo: String(i.id_insumo),
      codigo: i.codigo,
      nombre: i.nombre,
      unidad_medida: i.unidad_medida,
      stock_actual: Number(i.stock_actual)
    }))
  };
};

export const listarServiciosHospitalarios = async () => {
  const catalogos = await listarCatalogosAtencion();
  return catalogos.servicios;
};

export const obtenerCitaParaAtencion = async (id, usuario) => {
  const ctx = await contextoUsuario(usuario);

  const cita = await prisma.citas.findUnique({
    where: { id_cita: idValido(id, "id_cita") },
    include: {
      pacientes: true,
      medicos: true,
      atenciones: true
    }
  });

  if (!cita) throw new AtencionError("Cita no encontrada", 404);

  if (ctx.rol === "MEDICO" && cita.id_medico !== ctx.idMedico) {
    throw new AtencionError("No puede acceder a esta cita", 403);
  }

  return {
    ...serializarCita(cita),
    puede_registrar: ["PROGRAMADA", "CONFIRMADA"].includes(cita.estado)
      && !cita.atenciones
  };
};

export const listarPendientesAtencion = async (filtros, usuario) => {
  const ctx = await contextoUsuario(usuario);
  const idMedico = filtroMedico(ctx, filtros.id_medico);

  const where = {
    estado: { in: ["PROGRAMADA", "CONFIRMADA"] },
    atenciones: { is: null }
  };

  if (idMedico !== undefined) where.id_medico = idMedico;
  if (filtros.fecha !== undefined) {
    where.fecha_hora_inicio = rangoFecha(filtros.fecha);
  }

  const citas = await prisma.citas.findMany({
    where,
    include: { pacientes: true, medicos: true },
    orderBy: [
      { fecha_hora_inicio: "asc" },
      { id_cita: "asc" }
    ]
  });

  return citas.map(serializarCita);
};

export const registrarAtencion = async (datos, usuario) => {
  const ctx = await contextoUsuario(usuario);

  if (ctx.rol === "ADMISION") {
    throw new AtencionError("Admisión no puede registrar atenciones", 403);
  }

  const idCita = idValido(datos.id_cita, "id_cita");
  const diagnostico = texto(datos.diagnostico, "diagnostico", true);
  const notas = texto(datos.notas, "notas");

  if (!Array.isArray(datos.servicios) ||
      !Array.isArray(datos.insumos)) {
    throw new AtencionError("servicios e insumos deben ser arreglos");
  }

  const servicios = datos.servicios.map((s) => ({
    id: idValido(s?.id_servicio, "id_servicio"),
    cantidad: cantidadValida(s?.cantidad ?? 1, "cantidad servicio")
  }));

  const insumos = datos.insumos.map((i) => ({
    id: idValido(i?.id_insumo, "id_insumo"),
    cantidad: cantidadValida(i?.cantidad, "cantidad insumo")
  }));

  const idsServicios = servicios.map((s) => String(s.id));
  const idsInsumos = insumos.map((i) => String(i.id));

  if (new Set(idsServicios).size !== idsServicios.length ||
      new Set(idsInsumos).size !== idsInsumos.length) {
    throw new AtencionError("No se permiten servicios o insumos duplicados");
  }

  const registrar = async () => prisma.$transaction(async (tx) => {
    // Bloquear la cita evita registros simultáneos.
    await tx.$queryRaw`
      SELECT id_cita FROM citas
      WHERE id_cita = ${idCita}
      FOR UPDATE
    `;

    const cita = await tx.citas.findUnique({
      where: { id_cita: idCita },
      include: { atenciones: true }
    });

    if (!cita) throw new AtencionError("Cita no encontrada", 404);

    if (ctx.rol === "MEDICO" && cita.id_medico !== ctx.idMedico) {
      throw new AtencionError("La cita pertenece a otro médico", 403);
    }

    if (!["PROGRAMADA", "CONFIRMADA"].includes(cita.estado)) {
      throw new AtencionError("La cita no está pendiente de atención", 409);
    }

    if (cita.atenciones) {
      throw new AtencionError("Esta cita ya tiene una atención", 409);
    }

    for (const servicio of servicios) {
      const existe = await tx.servicios_hospitalarios.findFirst({
        where: { id_servicio: servicio.id, activo: true }
      });
      if (!existe) {
        throw new AtencionError(
          `Servicio ${servicio.id} no disponible`, 404
        );
      }
    }

    const atencion = await tx.atenciones.create({
      data: {
        id_cita: idCita,
        motivo_atencion: cita.motivo,
        diagnostico,
        notas,
        estado: "COMPLETADA",
        registrado_por: ctx.idUsuario
      }
    });

    for (const servicio of servicios) {
      await tx.detalle_atencion_servicios.create({
        data: {
          id_atencion: atencion.id_atencion,
          id_servicio: servicio.id,
          cantidad: servicio.cantidad
        }
      });
    }

    // Orden fijo para evitar bloqueos cruzados.
    insumos.sort((a, b) => a.id < b.id ? -1 : a.id > b.id ? 1 : 0);

    for (const item of insumos) {
      // Descuento condicional atómico: nunca deja stock negativo.
      const descuento = await tx.insumos.updateMany({
        where: {
          id_insumo: item.id,
          activo: true,
          stock_actual: { gte: item.cantidad }
        },
        data: {
          stock_actual: { decrement: item.cantidad }
        }
      });

      if (descuento.count !== 1) {
        throw new AtencionError(
          `Insumo ${item.id} no disponible o con stock insuficiente`,
          409
        );
      }

      const consumo = await tx.consumo_insumos_atencion.create({
        data: {
          id_atencion: atencion.id_atencion,
          id_insumo: item.id,
          cantidad: item.cantidad,
          registrado_por: ctx.idUsuario
        }
      });

      await tx.movimientos_inventario.create({
        data: {
          id_insumo: item.id,
          tipo_movimiento: "SALIDA",
          cantidad: item.cantidad,
          motivo: `Consumo atención AT-${atencion.id_atencion}`,
          id_atencion: atencion.id_atencion,
          id_consumo: consumo.id_consumo,
          registrado_por: ctx.idUsuario
        }
      });
    }

    await tx.citas.update({
      where: { id_cita: idCita },
      data: { estado: "ATENDIDA" }
    });

    return atencion.id_atencion;
  }, { timeout: 15000 });

  const idAtencion = await registrar();
  return obtenerDetalleAtencion(String(idAtencion), usuario);
};

export const listarAtencionesPaginadas = async (filtros, usuario) => {
  const ctx = await contextoUsuario(usuario);
  const idMedico = filtroMedico(ctx, filtros.id_medico);

  const pagina = Number(filtros.page ?? 1);
  if (!Number.isSafeInteger(pagina) || pagina < 1) {
    throw new AtencionError("page debe ser un entero positivo");
  }

  const limite = 10;
  const skip = (pagina - 1) * limite;

  if (!Number.isSafeInteger(skip)) {
    throw new AtencionError("Página fuera de rango");
  }

  const filtroCita = {};
  if (idMedico !== undefined) filtroCita.id_medico = idMedico;

  if (filtros.id_paciente !== undefined) {
    filtroCita.id_paciente = idValido(filtros.id_paciente, "id_paciente");
  }

  if (filtros.paciente) {
    const nombre = texto(filtros.paciente, "paciente");
    filtroCita.pacientes = {
      OR: [
        { nombre: { contains: nombre, mode: "insensitive" } },
        { apellido: { contains: nombre, mode: "insensitive" } }
      ]
    };
  }

  const where = { citas: { is: filtroCita } };

  if (filtros.diagnostico) {
    where.diagnostico = {
      contains: texto(filtros.diagnostico, "diagnostico"),
      mode: "insensitive"
    };
  }

  if (filtros.fecha_desde || filtros.fecha_hasta) {
    const desde = filtros.fecha_desde
      ? rangoFecha(filtros.fecha_desde).gte : undefined;
    const hasta = filtros.fecha_hasta
      ? rangoFecha(filtros.fecha_hasta).lt : undefined;

    if (desde && hasta && desde >= hasta) {
      throw new AtencionError("Rango de fechas inválido");
    }

    where.fecha_atencion = {
      ...(desde ? { gte: desde } : {}),
      ...(hasta ? { lt: hasta } : {})
    };
  }

  const [total, registros] = await Promise.all([
    prisma.atenciones.count({ where }),
    prisma.atenciones.findMany({
      where,
      include: relaciones,
      orderBy: [
        { fecha_atencion: "desc" },
        { id_atencion: "desc" }
      ],
      skip,
      take: limite
    })
  ]);

  return {
    data: registros.map(serializarAtencion),
    paginacion: {
      pagina_actual: pagina,
      elementos_por_pagina: limite,
      total_elementos: total,
      total_paginas: Math.ceil(total / limite),
      tiene_anterior: pagina > 1,
      tiene_siguiente: pagina * limite < total
    }
  };
};

export const obtenerDetalleAtencion = async (id, usuario) => {
  const ctx = await contextoUsuario(usuario);

  const atencion = await prisma.atenciones.findUnique({
    where: { id_atencion: idValido(id, "id_atencion") },
    include: relaciones
  });

  if (!atencion) {
    throw new AtencionError("Atención no encontrada", 404);
  }

  if (ctx.rol === "MEDICO" &&
      atencion.citas.id_medico !== ctx.idMedico) {
    throw new AtencionError("No puede consultar esta atención", 403);
  }

  return serializarAtencion(atencion);
};

export const obtenerResumenAtenciones = async (filtros, usuario) => {
  const ctx = await contextoUsuario(usuario);
  const idMedico = filtroMedico(ctx, filtros.id_medico);

  const citaWhere = {};
  if (idMedico !== undefined) citaWhere.id_medico = idMedico;

  const pendientesWhere = {
    ...citaWhere,
    estado: { in: ["PROGRAMADA", "CONFIRMADA"] },
    atenciones: { is: null }
  };

  const [total, completadas, pendientes] = await Promise.all([
    prisma.atenciones.count({
      where: { citas: { is: citaWhere } }
    }),
    prisma.atenciones.count({
      where: {
        estado: "COMPLETADA",
        citas: { is: citaWhere }
      }
    }),
    prisma.citas.count({ where: pendientesWhere })
  ]);

  return {
    total_atenciones: total,
    atenciones_completadas: completadas,
    citas_pendientes: pendientes
  };
};
