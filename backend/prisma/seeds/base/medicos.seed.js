// prisma/seeds/base/medicos.seed.js

export const medicosBase = [
  {
    nombre_usuario: "elena.soto",
    identificacion: "MED-DEMO-001",
    nombre: "Elena",
    apellido: "Soto",
    especialidad: "Medicina General",
    telefono: "8888-1001",
    correo: "elena.soto@medicore.test",
  },
  {
    nombre_usuario: "david.chen",
    identificacion: "MED-DEMO-002",
    nombre: "David",
    apellido: "Chen",
    especialidad: "Medicina Interna",
    telefono: "8888-1002",
    correo: "david.chen@medicore.test",
  },
  {
    nombre_usuario: "sofia.mora",
    identificacion: "MED-DEMO-003",
    nombre: "Sofía",
    apellido: "Mora",
    especialidad: "Pediatría",
    telefono: "8888-1003",
    correo: "sofia.mora@medicore.test",
  },
  {
    nombre_usuario: "andres.vargas",
    identificacion: "MED-DEMO-004",
    nombre: "Andrés",
    apellido: "Vargas",
    especialidad: "Cardiología",
    telefono: "8888-1004",
    correo: "andres.vargas@medicore.test",
  },
  {
    nombre_usuario: "valeria.rojas",
    identificacion: "MED-DEMO-005",
    nombre: "Valeria",
    apellido: "Rojas",
    especialidad: "Ginecología",
    telefono: "8888-1005",
    correo: "valeria.rojas@medicore.test",
  },
  {
    nombre_usuario: "carlos.mendez",
    identificacion: "MED-DEMO-006",
    nombre: "Carlos",
    apellido: "Méndez",
    especialidad: "Traumatología",
    telefono: "8888-1006",
    correo: "carlos.mendez@medicore.test",
  },
];

export async function sembrarMedicos(prisma) {
  for (const medico of medicosBase) {
    const usuario = await prisma.usuarios.findUnique({
      where: {
        nombre_usuario: medico.nombre_usuario,
      },
      include: {
        roles: true,
      },
    });

    if (!usuario) {
      throw new Error(
        `No existe el usuario ${medico.nombre_usuario}`,
      );
    }

    if (usuario.roles.nombre !== "MEDICO") {
      throw new Error(
        `El usuario ${medico.nombre_usuario} no tiene el rol MEDICO`,
      );
    }

    const { nombre_usuario, ...datosMedico } = medico;

    await prisma.medicos.upsert({
      where: {
        id_usuario: usuario.id_usuario,
      },
      update: {},
      create: {
        ...datosMedico,
        id_usuario: usuario.id_usuario,
        activo: true,
      },
    });

    console.log(`Médico verificado: ${medico.nombre} ${medico.apellido}`);
  }
}
