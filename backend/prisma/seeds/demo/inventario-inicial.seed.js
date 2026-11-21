
 // prisma/seeds/demo/inventario-inicial.seed.js

export async function sembrarInventarioInicial(prisma) {
  const insumos = await prisma.insumos.findMany({
    orderBy: { codigo: "asc" },
  });

  const usuario = await prisma.usuarios.findUnique({
    where: { nombre_usuario: "inventario.demo" },
  });

  if (!usuario) {
    throw new Error("No existe el usuario de inventario.");
  }

  let creados = 0;
  let existentes = 0;

  for (const insumo of insumos) {
    const motivo = `DEMO-APERTURA-${insumo.codigo}`;

    await prisma.$transaction(async (tx) => {
      const existente = await tx.movimientos_inventario.findFirst({
        where: {
          id_insumo: insumo.id_insumo,
          tipo_movimiento: "ENTRADA",
          motivo,
        },
      });

      if (existente) {
        existentes++;
        return;
      }

      const salidas = await tx.movimientos_inventario.aggregate({
        where: {
          id_insumo: insumo.id_insumo,
          tipo_movimiento: "SALIDA",
        },
        _sum: {
          cantidad: true,
        },
      });

      const totalSalidas = salidas._sum.cantidad ?? 0;

      const cantidadInicial =
        Number(insumo.stock_actual) + Number(totalSalidas);

      if (cantidadInicial <= 0) {
        throw new Error(
          `Inventario inicial inválido para ${insumo.codigo}`,
        );
      }

      await tx.movimientos_inventario.create({
        data: {
          id_insumo: insumo.id_insumo,
          tipo_movimiento: "ENTRADA",
          cantidad: cantidadInicial,
          fecha_movimiento: new Date("2026-01-01T00:00:00.000Z"),
          motivo,
          registrado_por: usuario.id_usuario,
        },
      });

      // No incrementamos stock_actual:
      // ya contiene el inventario inicial menos los consumos.

      creados++;
    });
  }

  console.log(
    `Inventario inicial: ${creados} entradas creadas, ${existentes} existentes.`,
  );
}
