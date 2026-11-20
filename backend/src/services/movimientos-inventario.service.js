import prisma from "../config/prisma.js";

import {
  obtenerPaginacion,
  construirPaginacion
} from "./paginacion.utils.js";

import {
    InventarioError,
    validarId,
    validarEntero,
    validarTexto,
    movimientoAJson
} from "./inventario.utils.js";

const incluirInsumo = {
    insumos: {
        select: {
            nombre: true
        }
    }
};

export const listarMovimientosPaginados = async (filtros = {}) => {
  const { pagina, limite, skip } = obtenerPaginacion(
    filtros.page ?? "1"
  );

  const where = {};

  if (filtros.tipo !== undefined) {
    if (!["ENTRADA", "SALIDA"].includes(filtros.tipo)) {
      throw new InventarioError("Tipo de movimiento inválido");
    }

    where.tipo_movimiento = filtros.tipo;
  }

  if (filtros.buscar !== undefined) {
    if (typeof filtros.buscar !== "string") {
      throw new InventarioError("Búsqueda inválida");
    }

    const buscar = filtros.buscar.trim();

    if (buscar) {
      where.OR = [
        {
          motivo: {
            contains: buscar,
            mode: "insensitive"
          }
        },
        {
          insumos: {
            is: {
              nombre: {
                contains: buscar,
                mode: "insensitive"
              }
            }
          }
        }
      ];
    }
  }

  const [total, movimientos] = await Promise.all([
    prisma.movimientos_inventario.count({ where }),

    prisma.movimientos_inventario.findMany({
      where,
      include: incluirInsumo,
      orderBy: [
        { fecha_movimiento: "desc" },
        { id_movimiento: "desc" }
      ],
      skip,
      take: limite
    })
  ]);

  return {
    data: movimientos.map(movimientoAJson),
    paginacion: construirPaginacion(pagina, limite, total)
  };
};

export const listarMovimientos = async (filtros = {}) => {
    const where = {};

    if (filtros.tipo !== undefined) {
        if (!["ENTRADA", "SALIDA"].includes(filtros.tipo)) {
            throw new InventarioError("Tipo de movimiento inválido");
        }

        where.tipo_movimiento = filtros.tipo;
    }

    if (filtros.buscar !== undefined) {
        if (typeof filtros.buscar !== "string") {
            throw new InventarioError("Búsqueda inválida");
        }

        const buscar = filtros.buscar.trim();

        if (buscar) {
            where.OR = [
                {
                    motivo: {
                        contains: buscar,
                        mode: "insensitive"
                    }
                },
                {
                    insumos: {
                        is: {
                            nombre: {
                                contains: buscar,
                                mode: "insensitive"
                            }
                        }
                    }
                }
            ];
        }
    }

    const movimientos = await prisma.movimientos_inventario.findMany({
        where,
        include: incluirInsumo,
        orderBy: [
            { fecha_movimiento: "desc" },
            { id_movimiento: "desc" }
        ]
    });

    return movimientos.map(movimientoAJson);
};

export const obtenerMovimiento = async (id) => {
    const idMovimiento = validarId(id, "id_movimiento");

    const movimiento = await prisma.movimientos_inventario.findUnique({
        where: { id_movimiento: idMovimiento },
        include: incluirInsumo
    });

    if (!movimiento) {
        throw new InventarioError("Movimiento no encontrado", 404);
    }

    return movimientoAJson(movimiento);
};

export const registrarMovimiento = async (datos, idUsuario) => {
    const idInsumo = validarId(datos.id_insumo, "id_insumo");
    const idResponsable = validarId(idUsuario, "id_usuario");

    const tipo = datos.tipo_movimiento;

    if (!["ENTRADA", "SALIDA"].includes(tipo)) {
        throw new InventarioError(
            "Solo se permiten movimientos ENTRADA o SALIDA"
        );
    }

    const cantidad = validarEntero(
        datos.cantidad,
        "cantidad",
        1
    );

    const motivo = validarTexto(datos.motivo, "motivo", 250);

    return prisma.$transaction(async (tx) => {
        // Bloquear la fila del insumo hasta finalizar la transacción.
        // El SELECT se ejecuta sin devolver columnas de tipo void.
        const filas = await tx.$queryRaw`
            SELECT id_insumo
            FROM public.insumos
            WHERE id_insumo = ${idInsumo}
            FOR UPDATE
        `;

        if (filas.length === 0) {
            throw new InventarioError("Insumo no encontrado", 404);
        }

        const insumo = await tx.insumos.findUnique({
            where: { id_insumo: idInsumo }
        });

        if (!insumo.activo) {
            throw new InventarioError(
                "No se permiten movimientos de insumos inactivos",
                409
            );
        }

        if (
            tipo === "SALIDA" &&
            insumo.stock_actual.lessThan(cantidad)
        ) {
            throw new InventarioError(
                "Existencias insuficientes para realizar la salida",
                409
            );
        }

        await tx.insumos.update({
            where: { id_insumo: idInsumo },
            data: {
                stock_actual: tipo === "ENTRADA"
                    ? { increment: cantidad }
                    : { decrement: cantidad }
            }
        });

        const movimiento = await tx.movimientos_inventario.create({
            data: {
                id_insumo: idInsumo,
                tipo_movimiento: tipo,
                cantidad,
                motivo,
                registrado_por: idResponsable,
                id_atencion: null,
                id_consumo: null
            },
            include: incluirInsumo
        });

        return movimientoAJson(movimiento);
    });
};
