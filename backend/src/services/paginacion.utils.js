export class PaginacionError extends Error {
  constructor(message) {
    super(message);
    this.name = "PaginacionError";
    this.status = 400;
  }
}

export const obtenerPaginacion = (page = "1", limite = 10) => {
  if (
    typeof page !== "string" ||
    !/^[1-9]\d*$/.test(page)
  ) {
    throw new PaginacionError("El número de página debe ser un entero positivo");
  }

  const pagina = Number(page);

  if (!Number.isSafeInteger(pagina)) {
    throw new PaginacionError("Número de página inválido");
  }

  const skip = (pagina - 1) * limite;

  if (!Number.isSafeInteger(skip)) {
    throw new PaginacionError("Número de página fuera de rango");
  }

  return {
    pagina,
    limite,
    skip
  };
};

export const construirPaginacion = (pagina, limite, total) => ({
  pagina_actual: pagina,
  elementos_por_pagina: limite,
  total_elementos: total,
  total_paginas: Math.ceil(total / limite),
  tiene_anterior: pagina > 1,
  tiene_siguiente: pagina * limite < total
});
