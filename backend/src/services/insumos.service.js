// insumos.service.js
import { randomUUID } from "node:crypto";
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
    insumoAJson,
    estadoStock
} from "./inventario.utils.js";

const incluirCategoria = {
    categorias_insumos: {
        select: {
            nombre: true
        }
    }
};

const validarDatosInsumo = (datos) => ({
    nombre: validarTexto(datos.nombre, "nombre", 150),
    id_categoria: validarId(datos.id_categoria, "id_categoria"),
    unidad_medida: validarTexto(
        datos.unidad_medida,
        "unidad_medida",
        30
    ),
    stock_minimo: validarEntero(
        datos.stock_minimo,
        "stock_minimo"
    )
});

export const listarCategorias = async () => {
    const categorias = await prisma.categorias_insumos.findMany({
        where: { activo: true },
        orderBy: { nombre: "asc" }
    });

    return categorias.map((categoria) => ({
        id_categoria: categoria.id_categoria.toString(),
        nombre: categoria.nombre,
        descripcion: categoria.descripcion
    }));
};

export const listarInsumos = async (filtros = {}) => {
    const where = {
        activo: true
    };

    if (filtros.buscar !== undefined) {
        if (typeof filtros.buscar !== "string") {
            throw new InventarioError("Búsqueda inválida");
        }

        const buscar = filtros.buscar.trim();

        if (buscar) {
            where.OR = [
                {
                    nombre: {
                        contains: buscar,
                        mode: "insensitive"
                    }
                },
                {
                    categorias_insumos: {
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

    if (filtros.id_categoria !== undefined) {
        where.id_categoria = validarId(
            filtros.id_categoria,
            "id_categoria"
        );
    }

    const insumos = await prisma.insumos.findMany({
        where,
        include: incluirCategoria,
        orderBy: { nombre: "asc" }
    });

    let resultado = insumos.map(insumoAJson);

    if (filtros.existencias_bajas !== undefined) {
        if (
            filtros.existencias_bajas !== "true" &&
            filtros.existencias_bajas !== "false"
        ) {
            throw new InventarioError(
                "existencias_bajas debe ser true o false"
            );
        }

        const bajas = filtros.existencias_bajas === "true";

        resultado = resultado.filter((insumo) =>
            bajas
                ? insumo.estado !== "DISPONIBLE"
                : insumo.estado === "DISPONIBLE"
        );
    }

    return resultado;
};

export const listarInsumosPaginados = async (filtros = {}) => {
  const { pagina, limite, skip } = obtenerPaginacion(
    filtros.page ?? "1"
  );

  const where = {
    activo: true
  };

  if (filtros.buscar !== undefined) {
    if (typeof filtros.buscar !== "string") {
      throw new InventarioError("Búsqueda inválida");
    }

    const buscar = filtros.buscar.trim();

    if (buscar) {
      where.OR = [
        {
          nombre: {
            contains: buscar,
            mode: "insensitive"
          }
        },
        {
          categorias_insumos: {
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

  if (filtros.id_categoria !== undefined) {
    where.id_categoria = validarId(
      filtros.id_categoria,
      "id_categoria"
    );
  }

  if (filtros.existencias_bajas !== undefined) {
    if (
      filtros.existencias_bajas !== "true" &&
      filtros.existencias_bajas !== "false"
    ) {
      throw new InventarioError(
        "existencias_bajas debe ser true o false"
      );
    }

    // Comparación entre columnas de la misma tabla.
    if (filtros.existencias_bajas === "true") {
      where.stock_actual = {
        lte: prisma.insumos.fields.stock_minimo
      };
    } else {
      where.stock_actual = {
        gt: prisma.insumos.fields.stock_minimo
      };
    }
  }

  const [total, insumos] = await Promise.all([
    prisma.insumos.count({ where }),

    prisma.insumos.findMany({
      where,
      include: incluirCategoria,
      orderBy: [
        { nombre: "asc" },
        { id_insumo: "asc" }
      ],
      skip,
      take: limite
    })
  ]);

  return {
    data: insumos.map(insumoAJson),
    paginacion: construirPaginacion(pagina, limite, total)
  };
};

export const obtenerInsumo = async (id) => {
    const idInsumo = validarId(id, "id_insumo");

    const insumo = await prisma.insumos.findUnique({
        where: { id_insumo: idInsumo },
        include: incluirCategoria
    });

    if (!insumo || !insumo.activo) {
        throw new InventarioError("Insumo no encontrado", 404);
    }

    return insumoAJson(insumo);
};

export const crearInsumo = async (datos) => {
    const valores = validarDatosInsumo(datos);

    return prisma.$transaction(async (tx) => {
        const categoria = await tx.categorias_insumos.findUnique({
            where: { id_categoria: valores.id_categoria }
        });

        if (!categoria || !categoria.activo) {
            throw new InventarioError(
                "Categoría inexistente o inactiva",
                404
            );
        }

        // Código temporal único durante la creación.
        const temporal = `TMP-${randomUUID()}`;

        const creado = await tx.insumos.create({
            data: {
                ...valores,
                codigo: temporal,
                stock_actual: 0,
                activo: true
            }
        });

        const codigo = `INS-${creado.id_insumo.toString().padStart(4, "0")}`;

        const insumo = await tx.insumos.update({
            where: { id_insumo: creado.id_insumo },
            data: { codigo },
            include: incluirCategoria
        });

        return insumoAJson(insumo);
    });
};

export const actualizarInsumo = async (id, datos) => {
    const idInsumo = validarId(id, "id_insumo");
    const valores = validarDatosInsumo(datos);

    return prisma.$transaction(async (tx) => {
        const existente = await tx.insumos.findUnique({
            where: { id_insumo: idInsumo }
        });

        if (!existente || !existente.activo) {
            throw new InventarioError("Insumo no encontrado", 404);
        }

        const categoria = await tx.categorias_insumos.findUnique({
            where: { id_categoria: valores.id_categoria }
        });

        if (!categoria || !categoria.activo) {
            throw new InventarioError(
                "Categoría inexistente o inactiva",
                404
            );
        }

        const insumo = await tx.insumos.update({
            where: { id_insumo: idInsumo },
            data: valores,
            include: incluirCategoria
        });

        return insumoAJson(insumo);
    });
};

export const eliminarInsumo = async (id) => {
    const idInsumo = validarId(id, "id_insumo");

    const resultado = await prisma.insumos.updateMany({
        where: {
            id_insumo: idInsumo,
            activo: true
        },
        data: {
            activo: false
        }
    });

    if (resultado.count === 0) {
        throw new InventarioError("Insumo no encontrado", 404);
    }
};

export const obtenerResumenInventario = async () => {
  const [
    totalInsumos,
    categorias,
    requierenReposicion
  ] = await Promise.all([
    prisma.insumos.count({
      where: {
        activo: true
      }
    }),

    prisma.insumos.findMany({
      where: {
        activo: true
      },
      distinct: ["id_categoria"],
      select: {
        id_categoria: true
      }
    }),

    prisma.insumos.count({
      where: {
        activo: true,
        stock_actual: {
          lte: prisma.insumos.fields.stock_minimo
        }
      }
    })
  ]);

  return {
    total_insumos: totalInsumos,
    total_categorias: categorias.length,
    requieren_reposicion: requierenReposicion
  };
};
