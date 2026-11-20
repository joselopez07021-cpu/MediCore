export const categoriasBase = [
  { nombre: "Medicamentos", descripcion: "Medicamentos de uso hospitalario" },
  { nombre: "Material médico", descripcion: "Materiales para procedimientos clínicos" },
  { nombre: "Protección personal", descripcion: "Equipos de protección para el personal" },
  { nombre: "Laboratorio", descripcion: "Insumos para análisis clínicos" },
  { nombre: "Curación", descripcion: "Materiales para limpieza y tratamiento de heridas" },
  { nombre: "Desinfección", descripcion: "Productos de limpieza y desinfección hospitalaria" },
];

export async function sembrarCategorias(prisma) {
  for (const categoria of categoriasBase) {
    await prisma.categorias_insumos.upsert({
      where: { nombre: categoria.nombre },
      update: {},
      create: { ...categoria, activo: true },
    });
  }

  console.log(`Categorías verificadas: ${categoriasBase.length}`);
}
