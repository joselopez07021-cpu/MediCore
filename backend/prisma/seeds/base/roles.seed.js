export const rolesBase = [
  {
    nombre: "ADMINISTRADOR",
    descripcion: "Administra usuarios y configuración del sistema",
  },
  {
    nombre: "ADMISION",
    descripcion: "Registra pacientes y gestiona citas",
  },
  {
    nombre: "MEDICO",
    descripcion: "Consulta agenda y registra atenciones",
  },
  {
    nombre: "INVENTARIO",
    descripcion: "Administra insumos y movimientos de inventario",
  },
];

export async function sembrarRoles(prisma) {
  for (const rol of rolesBase) {
    await prisma.roles.upsert({
      where: { nombre: rol.nombre },
      update: {},
      create: {
        ...rol,
        activo: true,
      },
    });
  }

  console.log(`Roles verificados: ${rolesBase.length}`);
}
