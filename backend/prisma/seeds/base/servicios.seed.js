export const serviciosBase = [
  ["SRV-001", "Consulta de medicina general", 30],
  ["SRV-002", "Consulta de medicina interna", 40],
  ["SRV-003", "Consulta pediátrica", 30],
  ["SRV-004", "Consulta cardiológica", 45],
  ["SRV-005", "Consulta ginecológica", 40],
  ["SRV-006", "Consulta traumatológica", 40],
  ["SRV-007", "Electrocardiograma", 20],
  ["SRV-008", "Hemograma completo", 15],
  ["SRV-009", "Examen general de orina", 15],
  ["SRV-010", "Curación de heridas", 25],
  ["SRV-011", "Aplicación de medicamentos", 15],
  ["SRV-012", "Control de signos vitales", 10],
];

export async function sembrarServicios(prisma) {
  for (const [codigo, nombre, duracion] of serviciosBase) {
    await prisma.servicios_hospitalarios.upsert({
      where: { codigo },
      update: {},
      create: {
        codigo,
        nombre,
        duracion_estimada_minutos: duracion,
        activo: true,
      },
    });
  }

  console.log(`Servicios verificados: ${serviciosBase.length}`);
}
