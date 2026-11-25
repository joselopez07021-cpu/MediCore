// Validación estática y sin conexión: no abre Power BI ni consulta PostgreSQL.
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const report = path.join(root, "MediCore_OLAP.Report");
const model = path.join(root, "MediCore_OLAP.SemanticModel");
const read = (file) => fs.readFileSync(file, "utf8").replace(/^\uFEFF/, "");
const json = (file) => JSON.parse(read(file));
const check = (condition, message) => assert.ok(condition, message);
const tablesExpected = [
  "dim_fecha",
  "dim_insumos",
  "dim_medicos",
  "dim_servicios",
  "fact_atenciones",
  "fact_citas",
  "fact_consumos",
  "fact_movimientos",
  "fact_servicios",
];

function walk(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    if (entry.name === ".pbi") return [];
    const file = path.join(dir, entry.name);
    return entry.isDirectory() ? walk(file) : [file];
  });
}

function sourcePath(base, relative) {
  const target = path.resolve(base, relative);
  check(target.startsWith(root + path.sep), "Referencia fuera del proyecto");
  check(
    fs.existsSync(target),
    `Referencia inexistente: ${path.relative(root, target)}`,
  );
  return target;
}

try {
  const sources = walk(root).filter(
    (file) => !file.startsWith(path.join(root, "scripts") + path.sep),
  );
  const jsonFiles = sources.filter((file) =>
    /\.(json|pbip|pbir|pbism|platform)$/.test(file),
  );
  for (const file of jsonFiles) json(file);

  const project = json(path.join(root, "MediCore_OLAP.pbip"));
  assert.equal(
    project.artifacts.length,
    1,
    "Debe existir un informe con tres páginas",
  );
  assert.equal(sourcePath(root, project.artifacts[0].report.path), report);
  const reportDefinition = json(path.join(report, "definition.pbir"));
  assert.equal(
    sourcePath(report, reportDefinition.datasetReference.byPath.path),
    model,
  );
  json(path.join(model, "definition.pbism"));
  for (const [folder, type] of [
    [report, "Report"],
    [model, "SemanticModel"],
  ]) {
    assert.equal(json(path.join(folder, ".platform")).metadata.type, type);
  }

  const tables = new Map();
  const measures = new Map();
  for (const name of tablesExpected) {
    const tmdl = read(path.join(model, "definition", "tables", `${name}.tmdl`));
    check(tmdl.startsWith(`table ${name}`), `Tabla incorrecta: ${name}`);
    check(
      /mode: import/.test(tmdl),
      `La tabla debe conservar el modo Import: ${name}`,
    );
    check(
      tmdl.includes('PostgreSQL.Database("localhost:5433", "medicore")'),
      `Origen modificado: ${name}`,
    );
    check(
      tmdl.includes(`Schema="analitica",Item="${name}"`),
      `Vista incorrecta: ${name}`,
    );
    const columns = new Set(
      [...tmdl.matchAll(/^\tcolumn (\w+)/gm)].map((m) => m[1]),
    );
    const measureNames = new Set();
    for (const match of tmdl.matchAll(
      /^\tmeasure (?:'([^']+)'|(\w+)) =([^]*?)(?=^\t\t(?:formatString:|lineageTag:))/gm,
    )) {
      const measureName = match[1] || match[2];
      check(!measures.has(measureName), `Medida duplicada: ${measureName}`);
      measures.set(measureName, { table: name, dax: match[3].trim() });
      measureNames.add(measureName);
    }
    tables.set(name, { columns, measures: measureNames, tmdl });
  }
  assert.equal(
    fs
      .readdirSync(path.join(model, "definition", "tables"))
      .filter((f) => f.endsWith(".tmdl")).length,
    9,
  );
  assert.equal(
    measures.size,
    18,
    "Deben conservarse las dieciocho medidas DAX",
  );
  const modelDefinition = read(path.join(model, "definition", "model.tmdl"));
  assert.deepEqual(
    [...modelDefinition.matchAll(/^ref table (\w+)/gm)].map((m) => m[1]).sort(),
    [...tablesExpected].sort(),
  );
  const hierarchy = tables
    .get("dim_fecha")
    .tmdl.match(/\thierarchy Jerarquíatemporal([^]*?)(?=\n\tpartition)/);
  check(hierarchy, "Falta la jerarquía temporal original");
  assert.deepEqual(
    [...hierarchy[1].matchAll(/^\t\tlevel (\w+)/gm)].map((m) => m[1]),
    ["anio", "trimestre", "mes", "dia"],
  );

  const relationships = [
    ...read(path.join(model, "definition", "relationships.tmdl")).matchAll(
      /^relationship ([^\r\n]+)\r?\n\tfromColumn: (\w+)\.(\w+)\r?\n\ttoColumn: (\w+)\.(\w+)/gm,
    ),
  ];
  assert.equal(
    relationships.length,
    12,
    "Deben conservarse las doce relaciones",
  );
  for (const [, , fromTable, fromColumn, toTable, toColumn] of relationships) {
    check(
      tables.get(fromTable)?.columns.has(fromColumn),
      "Columna de origen de relación inexistente",
    );
    check(
      tables.get(toTable)?.columns.has(toColumn),
      "Columna de destino de relación inexistente",
    );
  }
  const expectedLinks = [
    ...[
      "fact_citas",
      "fact_atenciones",
      "fact_servicios",
      "fact_consumos",
      "fact_movimientos",
    ].map((f) => `${f}.fecha>dim_fecha.fecha`),
    ...["fact_citas", "fact_atenciones", "fact_servicios", "fact_consumos"].map(
      (f) => `${f}.id_medico>dim_medicos.id_medico`,
    ),
    "fact_consumos.id_insumo>dim_insumos.id_insumo",
    "fact_movimientos.id_insumo>dim_insumos.id_insumo",
    "fact_servicios.id_servicio>dim_servicios.id_servicio",
  ];
  assert.deepEqual(
    relationships.map((r) => `${r[2]}.${r[3]}>${r[4]}.${r[5]}`).sort(),
    expectedLinks.sort(),
  );

  // Comprueba referencias de columnas, medidas y jerarquías en el PBIR.
  function checkExpressions(value) {
    if (!value || typeof value !== "object") return;
    for (const kind of ["Column", "Measure", "Hierarchy"]) {
      const expression = value[kind];
      const entity = expression?.Expression?.SourceRef?.Entity;
      if (!entity) continue;
      const table = tables.get(entity);
      check(table, `Tabla no definida en un visual: ${entity}`);
      if (kind === "Column")
        check(
          table.columns.has(expression.Property),
          `Columna no definida: ${entity}.${expression.Property}`,
        );
      if (kind === "Measure")
        check(
          table.measures.has(expression.Property),
          `Medida no definida: ${entity}.${expression.Property}`,
        );
      if (kind === "Hierarchy")
        check(
          entity === "dim_fecha" &&
            expression.Hierarchy === "Jerarquíatemporal",
          "Jerarquía no definida",
        );
    }
    for (const child of Object.values(value)) checkExpressions(child);
  }

  const pagesRoot = path.join(report, "definition", "pages");
  const pagesMetadata = json(path.join(pagesRoot, "pages.json"));
  const expectedPages = [
    "Citas y atenciones",
    "Servicios hospitalarios",
    "Inventario e insumos",
  ];
  assert.equal(pagesMetadata.pageOrder.length, 3);
  assert.equal(
    fs
      .readdirSync(pagesRoot, { withFileTypes: true })
      .filter((e) => e.isDirectory()).length,
    3,
  );
  check(
    pagesMetadata.pageOrder.includes(pagesMetadata.activePageName),
    "Página activa inexistente",
  );
  let visualsCount = 0;
  const pages = [];
  for (const [index, id] of pagesMetadata.pageOrder.entries()) {
    const pageDir = sourcePath(pagesRoot, id);
    const page = json(path.join(pageDir, "page.json"));
    assert.equal(page.name, id);
    assert.equal(page.displayName, expectedPages[index]);
    const visualIds = new Set();
    for (const visualDir of fs
      .readdirSync(path.join(pageDir, "visuals"), { withFileTypes: true })
      .filter((e) => e.isDirectory())) {
      const visual = json(
        path.join(pageDir, "visuals", visualDir.name, "visual.json"),
      );
      assert.equal(visual.name, visualDir.name);
      checkExpressions(visual);
      visualIds.add(visual.name);
      visualsCount++;
    }
    for (const interaction of page.visualInteractions || []) {
      check(
        visualIds.has(interaction.source) && visualIds.has(interaction.target),
        "Interacción con visual inexistente",
      );
    }
    pages.push({ nombre: page.displayName, visuales: visualIds.size });
  }
  const reportJson = json(path.join(report, "definition", "report.json"));
  let resources = 0;
  for (const pack of reportJson.resourcePackages || []) {
    for (const item of pack.items) {
      sourcePath(path.join(report, "StaticResources", pack.name), item.path);
      resources++;
    }
  }
  check(resources > 0, "Faltan los recursos visuales del informe");
  const sql = read(
    path.resolve(
      root,
      "../backend/prisma/migrations/1_analitica/migration.sql",
    ),
  );
  assert.deepEqual(
    [...sql.matchAll(/CREATE VIEW analitica\.(\w+)/g)].map((m) => m[1]).sort(),
    [...tablesExpected].sort(),
  );
  const readme = read(path.join(root, "README.md"));
  for (const [name, measure] of measures) {
    check(readme.includes(`### ${name}`), `Medida sin documentar: ${name}`);
    const compact = (s) => s.replace(/\s/g, "");
    check(
      compact(readme).includes(compact(measure.dax)),
      `DAX no documentado fielmente: ${name}`,
    );
  }
  console.log(
    JSON.stringify(
      {
        resultado: "Correcto: sintaxis JSON y referencias estructurales",
        json: jsonFiles.length,
        tablas: tables.size,
        dimensiones: 4,
        hechos: 5,
        relaciones: relationships.length,
        medidasDax: measures.size,
        jerarquia: ["anio", "trimestre", "mes", "dia"],
        paginas: pages,
        visuales: visualsCount,
        recursos: resources,
        alcance:
          "No valida esquemas JSON oficiales ni ejecuta TMDL, DAX, Power BI Service o Gateway.",
      },
      null,
      2,
    ),
  );
} catch (error) {
  console.error("Validación fallida:", error.message);
  process.exitCode = 1;
}
