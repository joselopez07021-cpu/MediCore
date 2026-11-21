
export class InventarioError extends Error {
    constructor(message, status = 400) {
        super(message);
        this.name = "InventarioError";
        this.status = status;
    }
}

export const validarId = (valor, campo) => {
    if (
        typeof valor !== "string" &&
        typeof valor !== "number" &&
        typeof valor !== "bigint"
    ) {
        throw new InventarioError(`${campo} inválido`);
    }

    const texto = String(valor);

    if (!/^[1-9]\d*$/.test(texto)) {
        throw new InventarioError(`${campo} inválido`);
    }

    try {
        const id = BigInt(texto);

        if (id > 9223372036854775807n) {
            throw new Error("Fuera de rango");
        }

        return id;
    } catch {
        throw new InventarioError(`${campo} inválido`);
    }
};

export const validarEntero = (valor, campo, minimo = 0) => {
    if (
        valor === null ||
        valor === undefined ||
        typeof valor === "boolean" ||
        String(valor).trim() === ""
    ) {
        throw new InventarioError(`${campo} es obligatorio`);
    }

    const numero = Number(valor);

    if (
        !Number.isSafeInteger(numero) ||
        numero < minimo ||
        numero > 9999999999
    ) {
        throw new InventarioError(
            `${campo} debe ser un entero mayor o igual a ${minimo}`
        );
    }

    return numero;
};

export const validarTexto = (valor, campo, maximo) => {
    if (typeof valor !== "string" || !valor.trim()) {
        throw new InventarioError(`${campo} es obligatorio`);
    }

    const texto = valor.trim();

    if (texto.length > maximo) {
        throw new InventarioError(
            `${campo} no puede superar ${maximo} caracteres`
        );
    }

    return texto;
};

export const estadoStock = (stock, minimo) => {
    const actual = Number(stock);
    const limite = Number(minimo);

    if (actual === 0) return "AGOTADO";
    if (actual <= limite) return "REPOSICION";

    return "DISPONIBLE";
};

export const insumoAJson = (insumo) => ({
    id_insumo: insumo.id_insumo.toString(),
    id_categoria: insumo.id_categoria.toString(),
    codigo: insumo.codigo,
    nombre: insumo.nombre,
    descripcion: insumo.descripcion,
    categoria: insumo.categorias_insumos?.nombre ?? null,
    unidad_medida: insumo.unidad_medida,
    stock_actual: insumo.stock_actual.toString(),
    stock_minimo: insumo.stock_minimo.toString(),
    estado: estadoStock(
        insumo.stock_actual,
        insumo.stock_minimo
    ),
    activo: insumo.activo
});

export const movimientoAJson = (movimiento) => ({
    id_movimiento: movimiento.id_movimiento.toString(),
    referencia: `MOV-${movimiento.id_movimiento.toString().padStart(4, "0")}`,
    id_insumo: movimiento.id_insumo.toString(),
    insumo: movimiento.insumos?.nombre ?? null,
    tipo_movimiento: movimiento.tipo_movimiento,
    cantidad: movimiento.cantidad.toString(),
    fecha_movimiento: movimiento.fecha_movimiento.toISOString(),
    motivo: movimiento.motivo,
    id_atencion: movimiento.id_atencion?.toString() ?? null,
    id_consumo: movimiento.id_consumo?.toString() ?? null,
    registrado_por: movimiento.registrado_por?.toString() ?? null,
    origen: movimiento.id_consumo
        ? "CONSUMO_ATENCION"
        : "MANUAL"
});
