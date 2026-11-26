import prisma from "../config/prisma.js";
import bcrypt from "bcrypt";
import { validarId, validarTexto } from "./inventario.utils.js";

export class MedicoError extends Error {
  constructor(message, status = 400) {
    super(message);
    this.name = "MedicoError";
    this.status = status;
  }
}

const publico = (m) => ({
  id_medico: String(m.id_medico),
  identificacion: m.identificacion,
  nombre: m.nombre,
  apellido: m.apellido,
  nombre_completo: `${m.nombre} ${m.apellido}`,
  especialidad: m.especialidad,
  telefono: m.telefono,
  correo: m.correo,
  activo: m.activo,
});

const validarPerfil = (datos) => {
  const correo = validarTexto(datos.correo, "correo", 254);
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(correo))
    throw new MedicoError("Correo inválido");
  const nombre = validarTexto(datos.nombre, "nombre", 80);
  const apellido = validarTexto(datos.apellido, "apellido", 100);
  if (`${nombre} ${apellido}`.length > 150)
    throw new MedicoError("El nombre completo no puede superar 150 caracteres");
  return {
    nombre,
    apellido,
    correo,
    identificacion: validarTexto(datos.identificacion, "identificacion", 40),
    especialidad: validarTexto(datos.especialidad, "especialidad", 100),
    telefono:
      datos.telefono == null || datos.telefono === ""
        ? null
        : validarTexto(datos.telefono, "telefono", 30),
  };
};

export const obtenerMedico = async (id) => {
  const medico = await prisma.medicos.findUnique({
    where: { id_medico: validarId(id, "id_medico") },
  });
  if (!medico) throw new MedicoError("Médico no encontrado", 404);
  return publico(medico);
};

export const crearMedico = async (datos) => {
  const perfil = validarPerfil(datos);
  const nombre_usuario = validarTexto(
    datos.nombre_usuario,
    "nombre_usuario",
    60,
  );
  if (!/^[a-zA-Z0-9._-]+$/.test(nombre_usuario))
    throw new MedicoError(
      "El usuario solo admite letras, números, punto, guion y guion bajo",
    );
  if (
    typeof datos.password !== "string" ||
    datos.password.trim().length < 8 ||
    Buffer.byteLength(datos.password, "utf8") > 72
  ) {
    throw new MedicoError(
      "La contraseña debe tener al menos 8 caracteres y no superar 72 bytes",
    );
  }
  const password_hash = await bcrypt.hash(datos.password, 12);
  return prisma.$transaction(async (tx) => {
    const rol = await tx.roles.findUnique({ where: { nombre: "MEDICO" } });
    if (!rol?.activo)
      throw new MedicoError("El rol Médico no está habilitado", 409);
    const usuario = await tx.usuarios.create({
      data: {
        id_rol: rol.id_rol,
        nombre_usuario,
        password_hash,
        correo: perfil.correo,
        nombre_completo: `${perfil.nombre} ${perfil.apellido}`,
        activo: true,
      },
    });
    return publico(
      await tx.medicos.create({
        data: { ...perfil, id_usuario: usuario.id_usuario },
      }),
    );
  });
};

export const actualizarMedico = async (id, datos) => {
  const id_medico = validarId(id, "id_medico");
  const perfil = validarPerfil(datos);
  return prisma.$transaction(async (tx) => {
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(${id_medico}::bigint)`;
    const actual = await tx.medicos.findUnique({ where: { id_medico } });
    if (!actual) throw new MedicoError("Médico no encontrado", 404);
    await tx.usuarios.update({
      where: { id_usuario: actual.id_usuario },
      data: {
        nombre_completo: `${perfil.nombre} ${perfil.apellido}`,
        correo: perfil.correo,
      },
    });
    return publico(
      await tx.medicos.update({ where: { id_medico }, data: perfil }),
    );
  });
};

export const cambiarEstadoMedico = async (id, activo) => {
  const id_medico = validarId(id, "id_medico");
  if (typeof activo !== "boolean")
    throw new MedicoError("activo debe ser booleano");
  return prisma.$transaction(async (tx) => {
    // Mismo bloqueo que la reserva de citas para impedir nuevas reservas durante la baja.
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(${id_medico}::bigint)`;
    const actual = await tx.medicos.findUnique({
      where: { id_medico },
      include: { usuarios: { include: { roles: true } } },
    });
    if (!actual) throw new MedicoError("Médico no encontrado", 404);
    if (
      activo &&
      (!actual.usuarios.roles.activo ||
        actual.usuarios.roles.nombre !== "MEDICO")
    ) {
      throw new MedicoError(
        "La cuenta debe tener el rol Médico habilitado",
        409,
      );
    }
    if (
      !activo &&
      (await tx.citas.count({
        where: { id_medico, estado: { in: ["PROGRAMADA", "CONFIRMADA"] } },
      }))
    ) {
      throw new MedicoError(
        "Cancela o reasigna las citas pendientes antes de desactivar al médico",
        409,
      );
    }
    await tx.usuarios.update({
      where: { id_usuario: actual.id_usuario },
      data: { activo },
    });
    return publico(
      await tx.medicos.update({ where: { id_medico }, data: { activo } }),
    );
  });
};

export const listarMedicos = async (activo) => {
  const where = {};

  // Filtro opcional por estado
  if (activo !== undefined) {
    if (activo !== "true" && activo !== "false") {
      throw new MedicoError("El parámetro activo debe ser true o false");
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
      activo: true,
    },
    orderBy: [{ apellido: "asc" }, { nombre: "asc" }],
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
    activo: medico.activo,
  }));
};
