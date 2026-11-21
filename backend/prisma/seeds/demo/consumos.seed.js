
 // prisma/seeds/demo/consumos.seed.js

const codigosInsumos = [
  "PRO-001",
  "PRO-002",
  "MAT-001",
  "MAT-002",
  "CUR-001",
  "CUR-003",
  "DES-001",
  "DES-002",
  "LAB-001",
  "LAB-003",
];

const TOTAL_CONSUMOS = 210;

export async function sembrarConsumos(prisma) {
  const atenciones = await prisma.atenciones.findMany({
    where: {
      estado: "COMPLETADA",
      citas: {
        motivo: {
          startsWith: "Consulta de demostración ",
        },
      },
    },
    include: {
      citas: true,
    },
    orderBy: {
      id_atencion: "asc",
    },
  });

  const usuarioInventario = await prisma.usuarios.findUnique({
    where: {
      nombre_usuario: "inventario.demo",
    },
  });

  if (!usuarioInventario || atenciones.length !== TOTAL_CONSUMOS) {
    throw new Error(
      "No están disponibles las 210 atenciones o el usuario de inventario.",
    );
  }

  let creados = 0;
  let existentes = 0;

  for (let i = 0; i < atenciones.length; i++) {
    const atencion = atenciones[i];
    const codigo = codigosInsumos[i % codigosInsumos.length];

    const cantidad = 1 + (i % 3);

    // Marcador determinista para identificar el consumo.
    const marcador = `DEMO-CONSUMO-${String(i + 1).padStart(4, "0")}`;

    await prisma.$transaction(async (tx) => {
      const existente = await tx.consumo_insumos_atencion.findFirst({
        where: {
          observaciones: marcador,
        },
      });

      if (existente) {
        existentes++;
        return;
      }

      const insumo = await tx.insumos.findUnique({
        where: { codigo },
      });

      if (!insumo) {
        throw new Error(`No existe el insumo ${codigo}`);
      }

      if (insumo.stock_actual.lessThan(cantidad)) {
        throw new Error(
          `Stock insuficiente para ${codigo}`,
        );
      }

      const consumo = await tx.consumo_insumos_atencion.create({
        data: {
          id_atencion: atencion.id_atencion,
          id_insumo: insumo.id_insumo,
          cantidad,
          fecha_consumo: atencion.fecha_atencion,
          registrado_por: usuarioInventario.id_usuario,
          observaciones: marcador,
        },
      });

      await tx.movimientos_inventario.create({
        data: {
          id_insumo: insumo.id_insumo,
          tipo_movimiento: "SALIDA",
          cantidad,
          fecha_movimiento: atencion.fecha_atencion,
          motivo: "Consumo clínico de demostración",
          id_atencion: atencion.id_atencion,
          id_consumo: consumo.id_consumo,
          registrado_por: usuarioInventario.id_usuario,
        },
      });

      await tx.insumos.update({
        where: { id_insumo: insumo.id_insumo },
        data: {
          stock_actual: {
            decrement: cantidad,
          },
        },
      });

      creados++;
    });
  }

  console.log(
    `Consumos: ${creados} creados, ${existentes} existentes.`,
  );
}
