export const insumosBase = [
  // Medicamentos
  ["MED-001", "Paracetamol 500 mg", "Medicamentos", "tableta", 500, 100],
  ["MED-002", "Ibuprofeno 400 mg", "Medicamentos", "tableta", 400, 80],
  ["MED-003", "Amoxicilina 500 mg", "Medicamentos", "cápsula", 300, 60],
  ["MED-004", "Loratadina 10 mg", "Medicamentos", "tableta", 250, 50],
  ["MED-005", "Omeprazol 20 mg", "Medicamentos", "cápsula", 350, 70],

  // Material médico
  ["MAT-001", "Jeringa estéril 5 ml", "Material médico", "unidad", 600, 100],
  ["MAT-002", "Aguja hipodérmica", "Material médico", "unidad", 800, 150],
  ["MAT-003", "Catéter intravenoso", "Material médico", "unidad", 200, 40],
  ["MAT-004", "Equipo de venoclisis", "Material médico", "unidad", 150, 30],
  ["MAT-005", "Bajalenguas desechable", "Material médico", "unidad", 1000, 200],

  // Protección personal
  ["PRO-001", "Guantes de nitrilo", "Protección personal", "par", 1500, 300],
  ["PRO-002", "Mascarilla quirúrgica", "Protección personal", "unidad", 1200, 250],
  ["PRO-003", "Bata desechable", "Protección personal", "unidad", 300, 60],
  ["PRO-004", "Gorro quirúrgico", "Protección personal", "unidad", 400, 80],
  ["PRO-005", "Protector facial", "Protección personal", "unidad", 100, 20],

  // Laboratorio
  ["LAB-001", "Tubo de extracción EDTA", "Laboratorio", "unidad", 500, 100],
  ["LAB-002", "Tubo de extracción seco", "Laboratorio", "unidad", 500, 100],
  ["LAB-003", "Recipiente para muestra de orina", "Laboratorio", "unidad", 350, 70],
  ["LAB-004", "Lanceta estéril", "Laboratorio", "unidad", 600, 120],
  ["LAB-005", "Tira reactiva de glucosa", "Laboratorio", "unidad", 450, 90],

  // Curación
  ["CUR-001", "Gasa estéril", "Curación", "unidad", 1000, 200],
  ["CUR-002", "Venda elástica", "Curación", "unidad", 250, 50],
  ["CUR-003", "Apósito adhesivo", "Curación", "unidad", 600, 120],
  ["CUR-004", "Esparadrapo médico", "Curación", "rollo", 180, 35],
  ["CUR-005", "Solución salina 500 ml", "Curación", "frasco", 200, 40],

  // Desinfección
  ["DES-001", "Alcohol al 70 %", "Desinfección", "frasco", 300, 60],
  ["DES-002", "Gel antibacterial", "Desinfección", "frasco", 250, 50],
  ["DES-003", "Desinfectante de superficies", "Desinfección", "litro", 150, 30],
  ["DES-004", "Toallas desinfectantes", "Desinfección", "paquete", 200, 40],
  ["DES-005", "Jabón antiséptico", "Desinfección", "frasco", 180, 35],
];

export async function sembrarInsumos(prisma) {
  for (const [codigo, nombre, categoriaNombre, unidad, stock, minimo] of insumosBase) {
    const categoria = await prisma.categorias_insumos.findUnique({
      where: { nombre: categoriaNombre },
    });

    if (!categoria) {
      throw new Error(`Categoría inexistente: ${categoriaNombre}`);
    }

    await prisma.insumos.upsert({
      where: { codigo },
      update: {},
      create: {
        codigo,
        nombre,
        id_categoria: categoria.id_categoria,
        unidad_medida: unidad,
        stock_actual: stock,
        stock_minimo: minimo,
        activo: true,
      },
    });
  }

  console.log(`Insumos verificados: ${insumosBase.length}`);
}
