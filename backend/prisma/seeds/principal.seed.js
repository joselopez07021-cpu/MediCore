import prisma from "../../src/config/prisma.js";

import { sembrarRoles } from "./base/roles.seed.js";
import { sembrarUsuarios } from "./base/usuarios.seed.js";
import { sembrarMedicos } from "./base/medicos.seed.js";
import { sembrarCategorias } from "./base/categorias.seed.js";
import { sembrarServicios } from "./base/servicios.seed.js";
import { sembrarInsumos } from "./base/insumos.seed.js";
import { sembrarPacientes } from "./demo/pacientes.seed.js";
import { sembrarCitas } from "./demo/citas.seed.js";
import { sembrarAtenciones } from "./demo/atenciones.seed.js";
import { sembrarConsumos } from "./demo/consumos.seed.js";
import { sembrarInventarioInicial } from "./demo/inventario-inicial.seed.js";

async function main() {
  if (process.env.NODE_ENV === "production") {
    throw new Error(
      "Las semillas de demostración no deben ejecutarse en producción.",
    );
  }

  console.log("Iniciando semillas de MediCore...");

  await sembrarRoles(prisma);
  await sembrarUsuarios(prisma);
  await sembrarMedicos(prisma);
  await sembrarCategorias(prisma);
  await sembrarServicios(prisma);
  await sembrarInsumos(prisma);
  await sembrarPacientes(prisma);
  await sembrarCitas(prisma);
  await sembrarAtenciones(prisma);
  await sembrarConsumos(prisma);
  await sembrarInventarioInicial(prisma);

  console.log("Semillas base completadas.");
}

main()
  .catch((error) => {
    console.error("Error al ejecutar semillas:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
