import prisma from "../config/prisma.js";

export class PacienteError extends Error {
  constructor(message, status = 400) {
    super(message);
    this.name = "PacienteError";
    this.status = status;
  }
}

const pacienteAJson = (paciente) => ({
  id_paciente: paciente.id_paciente.toString(),
  identificacion: paciente.identificacion,
  nombre: paciente.nombre,
  apellido: paciente.apellido,
  fecha_nacimiento: paciente.fecha_nacimiento
    ?.toISOString().slice(0, 10) ?? null,
  telefono: paciente.telefono,
  correo: paciente.correo,
  direccion: paciente.direccion,
  fecha_registro: paciente.fecha_registro.toISOString(),
  activo: paciente.activo
});

const validarIdPaciente = (id) => {
  if (!/^[1-9]\d*$/.test(String(id))) {
    throw new PacienteError(
      "El identificador del paciente no es válido",
      400
    );
  }

  try {
    const idPaciente = BigInt(id);

    if (idPaciente > 9223372036854775807n) {
      throw new Error("Fuera de rango");
    }

    return idPaciente;
  } catch {
    throw new PacienteError(
      "El identificador del paciente no es válido",
      400
    );
  }
};


export const registrarPaciente = async (datos) => {
  const {
    nombre,
    apellido,
    identificacion,
    fecha_nacimiento,
    telefono,
    correo
  } = datos;

  // Validar los seis campos obligatorios del formulario
  const campos = {
    nombre,
    apellido,
    identificacion,
    fecha_nacimiento,
    telefono,
    correo
  };

  for (const [campo, valor] of Object.entries(campos)) {
    if (typeof valor !== "string" || !valor.trim()) {
      throw new PacienteError(
        `El campo ${campo} es obligatorio`
      );
    }
  }

  // Limpiar espacios
  const nombreLimpio = nombre.trim();
  const apellidoLimpio = apellido.trim();
  const identificacionLimpia = identificacion.trim();
  const telefonoLimpio = telefono.trim();
  const correoLimpio = correo.trim();

  // Validar longitudes según el schema de Prisma
  if (
    nombreLimpio.length > 80 ||
    apellidoLimpio.length > 100 ||
    identificacionLimpia.length > 40 ||
    telefonoLimpio.length > 30 ||
    correoLimpio.length > 254
  ) {
    throw new PacienteError(
      "Uno o más campos exceden la longitud permitida"
    );
  }

  // Validar formato del correo
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(correoLimpio)) {
    throw new PacienteError(
      "El correo electrónico no tiene un formato válido"
    );
  }

  // Validar fecha YYYY-MM-DD
  if (!/^\d{4}-\d{2}-\d{2}$/.test(fecha_nacimiento)) {
    throw new PacienteError(
      "La fecha debe tener formato YYYY-MM-DD"
    );
  }

  const fecha = new Date(`${fecha_nacimiento}T00:00:00.000Z`);

  if (
    Number.isNaN(fecha.getTime()) ||
    fecha.toISOString().slice(0, 10) !== fecha_nacimiento
  ) {
    throw new PacienteError(
      "La fecha de nacimiento no es válida"
    );
  }

  if (fecha > new Date()) {
    throw new PacienteError(
      "La fecha de nacimiento no puede ser futura"
    );
  }

  // Comprobar identificación duplicada
  const existente = await prisma.pacientes.findUnique({
    where: {
      identificacion: identificacionLimpia
    },
    select: {
      id_paciente: true
    }
  });

  if (existente) {
    throw new PacienteError(
      "Ya existe un paciente con esa identificación",
      409
    );
  }

  // Registrar paciente
  const paciente = await prisma.pacientes.create({
    data: {
      nombre: nombreLimpio,
      apellido: apellidoLimpio,
      identificacion: identificacionLimpia,
      fecha_nacimiento: fecha,
      telefono: telefonoLimpio,
      correo: correoLimpio
    }
  });

  return pacienteAJson(paciente);
};

export const listarPacientes = async (activo) => {
  const where = {};

  if (activo !== undefined) {
    if (activo !== "true" && activo !== "false") {
      throw new PacienteError(
        "El parámetro activo debe ser true o false"
      );
    }

    where.activo = activo === "true";
  }

  const pacientes = await prisma.pacientes.findMany({
    where,
    orderBy: {
      id_paciente: "asc"
    }
  });

  return pacientes.map(pacienteAJson);
};


export const obtenerPaciente = async (id) => {
    const idPaciente = validarIdPaciente(id);

    const paciente = await prisma.pacientes.findUnique({
        where: {
            id_paciente: idPaciente
        }
    });

    if (!paciente) {
        throw new PacienteError(
            "Paciente no encontrado",
            404
        );
    }

    return pacienteAJson(paciente);
};



export const actualizarPaciente = async (id, datos) => {
    const idPaciente = validarIdPaciente(id);

    const {
        nombre,
        apellido,
        identificacion,
        fecha_nacimiento,
        telefono,
        correo
    } = datos;

    const campos = {
        nombre,
        apellido,
        identificacion,
        fecha_nacimiento,
        telefono,
        correo
    };

    for (const [campo, valor] of Object.entries(campos)) {
        if (typeof valor !== "string" || !valor.trim()) {
            throw new PacienteError(
                `El campo ${campo} es obligatorio`
            );
        }
    }

    const nombreLimpio = nombre.trim();
    const apellidoLimpio = apellido.trim();
    const identificacionLimpia = identificacion.trim();
    const telefonoLimpio = telefono.trim();
    const correoLimpio = correo.trim();

    if (
        nombreLimpio.length > 80 ||
        apellidoLimpio.length > 100 ||
        identificacionLimpia.length > 40 ||
        telefonoLimpio.length > 30 ||
        correoLimpio.length > 254
    ) {
        throw new PacienteError(
            "Uno o más campos exceden la longitud permitida"
        );
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(correoLimpio)) {
        throw new PacienteError(
            "El correo electrónico no tiene un formato válido"
        );
    }

    if (!/^\d{4}-\d{2}-\d{2}$/.test(fecha_nacimiento)) {
        throw new PacienteError(
            "La fecha debe tener formato YYYY-MM-DD"
        );
    }

    const fecha = new Date(`${fecha_nacimiento}T00:00:00.000Z`);

    if (
        Number.isNaN(fecha.getTime()) ||
        fecha.toISOString().slice(0, 10) !== fecha_nacimiento ||
        fecha > new Date()
    ) {
        throw new PacienteError(
            "Fecha de nacimiento inválida"
        );
    }

    const pacienteActual = await prisma.pacientes.findUnique({
        where: {
            id_paciente: idPaciente
        }
    });

    if (!pacienteActual) {
        throw new PacienteError(
            "Paciente no encontrado",
            404
        );
    }

    const paciente = await prisma.pacientes.update({
        where: {
            id_paciente: idPaciente
        },
        data: {
            nombre: nombreLimpio,
            apellido: apellidoLimpio,
            identificacion: identificacionLimpia,
            fecha_nacimiento: fecha,
            telefono: telefonoLimpio,
            correo: correoLimpio
        }
    });

    return pacienteAJson(paciente);
};


export const eliminarPaciente = async (id) => {
    const idPaciente = validarIdPaciente(id);

    const paciente = await prisma.pacientes.findUnique({
        where: {
            id_paciente: idPaciente
        }
    });

    if (!paciente) {
        throw new PacienteError(
            "Paciente no encontrado",
            404
        );
    }

    if (!paciente.activo) {
        throw new PacienteError(
            "El paciente ya se encuentra inactivo",
            409
        );
    }

    const actualizado = await prisma.pacientes.update({
        where: {
            id_paciente: idPaciente
        },
        data: {
            activo: false
        }
    });

    return pacienteAJson(actualizado);
};


export const cambiarEstadoPaciente = async (id, activo) => {
    const idPaciente = validarIdPaciente(id);

    if (typeof activo !== "boolean") {
        throw new PacienteError(
            "El campo activo debe ser true o false"
        );
    }

    const paciente = await prisma.pacientes.findUnique({
        where: {
            id_paciente: idPaciente
        }
    });

    if (!paciente) {
        throw new PacienteError(
            "Paciente no encontrado",
            404
        );
    }

    const actualizado = await prisma.pacientes.update({
        where: {
            id_paciente: idPaciente
        },
        data: {
            activo
        }
    });

    return pacienteAJson(actualizado);
};
