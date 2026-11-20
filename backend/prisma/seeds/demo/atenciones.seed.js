// prisma/seeds/demo/atenciones.seed.js

const diagnosticos = [
  {
    motivo: "Control médico general",
    diagnostico: "Evaluación general sin hallazgos relevantes",
    notas: "Se recomienda seguimiento preventivo.",
  },
  {
    motivo: "Dolor de cabeza",
    diagnostico: "Cefalea tensional",
    notas: "Se brindan recomendaciones generales.",
  },
  {
    motivo: "Control de presión arterial",
    diagnostico: "Seguimiento de presión arterial",
    notas: "Continuar controles periódicos.",
  },
  {
    motivo: "Malestar respiratorio",
    diagnostico: "Infección respiratoria leve",
    notas: "Se indican medidas generales de cuidado.",
  },
  {
    motivo: "Dolor muscular",
    diagnostico: "Molestia musculoesquelética",
    notas: "Se recomienda seguimiento según evolución.",
  },
  {
    motivo: "Consulta preventiva",
    diagnostico: "Control preventivo de salud",
    notas: "Paciente evaluado satisfactoriamente.",
  },
];

const servicioPorEspecialidad = {
  "Medicina General": "SRV-001",
  "Medicina Interna": "SRV-002",
  Pediatría: "SRV-003",
  Cardiología: "SRV-004",
  Ginecología: "SRV-005",
  Traumatología: "SRV-006",
};

export async function sembrarAtenciones(prisma) {
  const citas = await prisma.citas.findMany({
    where: {
      estado: "ATENDIDA",
      motivo: {
        startsWith: "Consulta de demostración ",
      },
    },
    include: {
      medicos: {
        include: {
          usuarios: true,
        },
      },
    },
    orderBy: {
      id_cita: "asc",
    },
  });

  const servicios = await prisma.servicios_hospitalarios.findMany();

  const serviciosPorCodigo = new Map(
    servicios.map((servicio) => [servicio.codigo, servicio]),
  );

  let creadas = 0;
  let existentes = 0;

  for (let i = 0; i < citas.length; i++) {
    const cita = citas[i];
    const datos = diagnosticos[i % diagnosticos.length];

    const codigoServicio =
      servicioPorEspecialidad[cita.medicos.especialidad];

    const servicio = serviciosPorCodigo.get(codigoServicio);

    if (!servicio) {
      throw new Error(
        `No existe el servicio ${codigoServicio}`,
      );
    }

    const atencionExistente = await prisma.atenciones.findUnique({
      where: {
        id_cita: cita.id_cita,
      },
    });

    const fechaAtencion = new Date(cita.fecha_hora_inicio);

    if (!atencionExistente) {
      await prisma.atenciones.create({
        data: {
          id_cita: cita.id_cita,
          fecha_atencion: fechaAtencion,
          motivo_atencion: datos.motivo,
          diagnostico: datos.diagnostico,
          notas: datos.notas,
          estado: "COMPLETADA",
          registrado_por: cita.medicos.id_usuario,

          detalle_atencion_servicios: {
            create: {
              id_servicio: servicio.id_servicio,
              cantidad: 1,
              observaciones: "Servicio realizado durante la atención",
            },
          },
        },
      });

      creadas++;
    } else {
      existentes++;
    }
  }

  console.log(
    `Atenciones: ${creadas} creadas, ${existentes} existentes.`,
  );
}
