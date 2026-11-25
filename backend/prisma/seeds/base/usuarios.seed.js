import bcrypt from "bcrypt";

export const usuariosBase = [
  {
    nombre_usuario: "admin.demo",
    correo: "admin.demo@medicore.test",
    nombre_completo: "Administrador Demo",
    rol: "ADMINISTRADOR",
    passwordEnv: "DEMO_ADMIN_PASSWORD",
  },
  {
    nombre_usuario: "recepcion.demo",
    correo: "recepcion.demo@medicore.test",
    nombre_completo: "Recepción Demo",
    rol: "ADMISION",
    passwordEnv: "DEMO_ADMISION_PASSWORD",
  },
  {
    nombre_usuario: "elena.soto",
    correo: "elena.soto@medicore.test",
    nombre_completo: "Elena Soto",
    rol: "MEDICO",
    passwordEnv: "DEMO_MEDICO_PASSWORD",
  },
  {
    nombre_usuario: "david.chen",
    correo: "david.chen@medicore.test",
    nombre_completo: "David Chen",
    rol: "MEDICO",
    passwordEnv: "DEMO_MEDICO_PASSWORD",
  },
  {
    nombre_usuario: "inventario.demo",
    correo: "inventario.demo@medicore.test",
    nombre_completo: "Inventario Demo",
    rol: "INVENTARIO",
    passwordEnv: "DEMO_INVENTARIO_PASSWORD",
  },
  {
    nombre_usuario: "sofia.mora",
    correo: "sofia.mora@medicore.test",
    nombre_completo: "Sofía Mora",
    rol: "MEDICO",
    passwordEnv: "DEMO_MEDICO_PASSWORD",
  },
  {
    nombre_usuario: "andres.vargas",
    correo: "andres.vargas@medicore.test",
    nombre_completo: "Andrés Vargas",
    rol: "MEDICO",
    passwordEnv: "DEMO_MEDICO_PASSWORD",
  },
  {
    nombre_usuario: "valeria.rojas",
    correo: "valeria.rojas@medicore.test",
    nombre_completo: "Valeria Rojas",
    rol: "MEDICO",
    passwordEnv: "DEMO_MEDICO_PASSWORD",
  },
  {
    nombre_usuario: "carlos.mendez",
    correo: "carlos.mendez@medicore.test",
    nombre_completo: "Carlos Méndez",
    rol: "MEDICO",
    passwordEnv: "DEMO_MEDICO_PASSWORD",
  },
];

export async function sembrarUsuarios(prisma) {
  for (const usuario of usuariosBase) {
    const rol = await prisma.roles.findUnique({
      where: { nombre: usuario.rol },
    });

    if (!rol) {
      throw new Error(`No existe el rol ${usuario.rol}`);
    }

    const existente = await prisma.usuarios.findUnique({
      where: { nombre_usuario: usuario.nombre_usuario },
    });

    if (existente) {
      console.log(`Usuario existente: ${usuario.nombre_usuario}`);
      continue;
    }

    const password = process.env[usuario.passwordEnv];
    if (!password?.trim()) {
      throw new Error(
        "Configura " +
          usuario.passwordEnv +
          " en backend/.env para crear usuarios de demo.",
      );
    }
    const hash = await bcrypt.hash(password, 12);

    await prisma.usuarios.create({
      data: {
        nombre_usuario: usuario.nombre_usuario,
        correo: usuario.correo,
        nombre_completo: usuario.nombre_completo,
        password_hash: hash,
        id_rol: rol.id_rol,
        activo: true,
      },
    });

    console.log(`Usuario creado: ${usuario.nombre_usuario}`);
  }
}
