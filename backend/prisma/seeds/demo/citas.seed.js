 // prisma/seeds/demo/citas.seed.js

const TOTAL_CITAS = 300;
const TOTAL_ATENDIDAS = 210;
const TOTAL_CANCELADAS = 30;
const TOTAL_NO_ASISTIO = 15;

function obtenerEstado(indice) {
  if (indice < TOTAL_ATENDIDAS) return "ATENDIDA";
  if (indice < TOTAL_ATENDIDAS + TOTAL_CANCELADAS) return "CANCELADA";
  if (
    indice <
    TOTAL_ATENDIDAS + TOTAL_CANCELADAS + TOTAL_NO_ASISTIO
  ) {
    return "NO_ASISTIO";
  }

  return indice % 2 === 0 ? "PROGRAMADA" : "CONFIRMADA";
}

function obtenerFecha(indice, idMedico, esFutura) {
  // Fechas deterministas y sin superposiciones entre
  // citas de un mismo médico.
  const posicion = Math.floor(indice / 6);

  if (esFutura) {
    const fecha = new Date(Date.UTC(2026, 11, 1));
    fecha.setUTCDate(fecha.getUTCDate() + posicion - 42);
    fecha.setUTCHours(14 + (idMedico % 3), 0, 0, 0);
    return fecha;
  }

  const fecha = new Date(Date.UTC(2026, 0, 5));
  fecha.setUTCDate(fecha.getUTCDate() + posicion * 6);
  fecha.setUTCHours(14 + (idMedico % 3), 0, 0, 0);

  return fecha;
}

export async function sembrarCitas(prisma) {
  const pacientes = await prisma.pacientes.findMany({
    where: {
      identificacion: { startsWith: "PAC-DEMO-" },
    },
    orderBy: { identificacion: "asc" },
  });

  const medicos = await prisma.medicos.findMany({
    where: { activo: true },
    orderBy: { id_medico: "asc" },
  });

  const recepcion = await prisma.usuarios.findUnique({
    where: { nombre_usuario: "recepcion.demo" },
  });

  if (pacientes.length < 120 || medicos.length < 6 || !recepcion) {
    throw new Error(
      "Faltan pacientes, médicos o el usuario de recepción.",
    );
  }

  const pacientesDemo = pacientes.slice(0, 120);
  const medicosDemo = medicos.slice(0, 6);

  for (let i = 0; i < TOTAL_CITAS; i++) {
    const medico = medicosDemo[i % 6];
    const paciente = pacientesDemo[(i * 7) % 120];
    const estado = obtenerEstado(i);
    const esFutura =
      estado === "PROGRAMADA" || estado === "CONFIRMADA";

    const inicio = obtenerFecha(i, i % 6, esFutura);
    const fin = new Date(inicio.getTime() + 30 * 60 * 1000);

    const motivo = `Consulta de demostración ${String(i + 1).padStart(3, "0")}`;

    // Evita duplicar la misma cita al repetir la semilla.
    const existente = await prisma.citas.findFirst({
      where: {
        id_medico: medico.id_medico,
        fecha_hora_inicio: inicio,
      },
    });

    if (existente) continue;

    await prisma.citas.create({
      data: {
        id_paciente: paciente.id_paciente,
        id_medico: medico.id_medico,
        fecha_hora_inicio: inicio,
        fecha_hora_fin: fin,
        motivo,
        estado,
        observaciones: "Cita ficticia para pruebas de MediCore",
        creado_por: recepcion.id_usuario,
      },
    });
  }

  console.log(`Citas de demostración verificadas: ${TOTAL_CITAS}`);
}
