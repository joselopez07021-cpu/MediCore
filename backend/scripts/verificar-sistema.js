import "dotenv/config";
import assert from "node:assert/strict";
import { readdir } from "node:fs/promises";
import prisma from "../src/config/prisma.js";
import { usuariosBase } from "../prisma/seeds/base/usuarios.seed.js";

// Solo lectura: no siembra, no restablece contraseñas ni modifica registros.
const base = `http://localhost:${process.env.PORT || 3000}/api`;
const resultados = [];
async function comprobar(nombre, accion) {
  try {
    const detalle = await accion();
    resultados.push({ nombre, correcto: true, ...(detalle === undefined ? {} : { detalle }) });
    console.log(`OK: ${nombre}`);
  } catch {
    resultados.push({ nombre, correcto: false });
    // No imprimir errores de conexión que pudieran contener credenciales.
    console.error(`FALLO: ${nombre}`);
  }
}
async function pedir(ruta, token, datos) {
  const respuesta = await fetch(base + ruta, {
    method: datos ? "POST" : "GET",
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(datos ? { "Content-Type": "application/json" } : {}),
    },
    ...(datos ? { body: JSON.stringify(datos) } : {}),
    signal: AbortSignal.timeout(10000),
  });
  return { status: respuesta.status, body: await respuesta.json() };
}

try {
  await comprobar("PostgreSQL responde", async () => { await prisma.$queryRaw`SELECT 1`; });
  await comprobar("Migraciones aplicadas", async () => {
    const carpetas = await readdir(new URL("../prisma/migrations/", import.meta.url), { withFileTypes: true });
    const filas = await prisma.$queryRaw`SELECT migration_name, finished_at, rolled_back_at FROM _prisma_migrations`;
    for (const carpeta of carpetas.filter((c) => c.isDirectory())) {
      assert.ok(filas.some((f) => f.migration_name === carpeta.name && f.finished_at && !f.rolled_back_at));
    }
    assert.ok(!filas.some((f) => !f.finished_at && !f.rolled_back_at));
  });
  await comprobar("API en ejecución conectada a PostgreSQL", async () => {
    const r = await pedir("/health");
    assert.equal(r.status, 200);
    assert.equal(r.body.data.database, "connected");
  });
  await comprobar("Frontend en ejecución", async () => {
    const r = await fetch("http://localhost:4200", { signal: AbortSignal.timeout(10000) });
    assert.equal(r.status, 200);
    assert.match(await r.text(), /<html/i);
  });
  await comprobar("CORS permite al frontend enviar credenciales Bearer", async () => {
    const r = await fetch(base + "/auth/me", {
      method: "OPTIONS",
      headers: { Origin: "http://localhost:4200", "Access-Control-Request-Method": "GET", "Access-Control-Request-Headers": "authorization" },
      signal: AbortSignal.timeout(10000),
    });
    assert.equal(r.status, 204);
    assert.equal(r.headers.get("access-control-allow-origin"), "http://localhost:4200");
    assert.match(r.headers.get("access-control-allow-headers") ?? "", /authorization/i);
  });
  await comprobar("Rutas protegidas sin sesión", async () => {
    for (const ruta of ["/pacientes", "/citas", "/atenciones/paginados", "/insumos", "/usuarios", "/reportes"]) {
      assert.equal((await pedir(ruta)).status, 401, ruta);
    }
  });

  const rutas = {
    ADMINISTRADOR: ["/pacientes", "/citas", "/medicos", "/atenciones/paginados", "/atenciones/catalogos", "/atenciones/pendientes", "/atenciones/resumen", "/insumos", "/insumos/resumen", "/categorias-insumos", "/movimientos-inventario", "/servicios", "/usuarios", "/reportes"],
    ADMISION: ["/pacientes", "/citas", "/medicos"],
    MEDICO: ["/citas", "/medicos", "/atenciones/paginados", "/atenciones/catalogos", "/atenciones/pendientes", "/atenciones/resumen", "/servicios"],
    INVENTARIO: ["/insumos", "/insumos/resumen", "/categorias-insumos", "/movimientos-inventario"],
  };
  for (const usuario of usuariosBase) {
    await comprobar(`Acceso y consultas: ${usuario.nombre_usuario}`, async () => {
      assert.ok(process.env[usuario.passwordEnv]);
      const login = await pedir("/auth/login", null, {
        nombre_usuario: usuario.nombre_usuario,
        password: process.env[usuario.passwordEnv],
      });
      assert.equal(login.status, 200);
      const { token, usuario: identidad } = login.body.data;
      assert.equal(identidad.rol, usuario.rol);
      for (const ruta of ["/auth/me", "/inicio/resumen", ...rutas[usuario.rol]]) {
        const r = await pedir(ruta, token);
        assert.equal(r.status, 200, ruta);
        if (usuario.rol === "MEDICO" && ["/citas", "/atenciones/paginados", "/atenciones/pendientes"].includes(ruta)) {
          assert.ok(r.body.data.every((fila) => fila.id_medico === identidad.id_medico));
        }
      }
      if (usuario.rol !== "ADMINISTRADOR") {
        assert.equal((await pedir("/usuarios", token)).status, 403);
        assert.equal((await pedir("/reportes", token)).status, 403);
      } else {
        // Compara datos de la API que está ejecutándose con DATABASE_URL.
        for (const [ruta, tabla] of [["/pacientes", "pacientes"], ["/citas", "citas"], ["/usuarios", "usuarios"], ["/medicos", "medicos"], ["/movimientos-inventario", "movimientos_inventario"]]) {
          assert.equal((await pedir(ruta, token)).body.data.length, await prisma[tabla].count(), ruta);
        }
        const reporte = (await pedir("/reportes", token)).body.data;
        assert.equal(reporte.total_citas, await prisma.citas.count());
        assert.equal(reporte.total_atenciones, await prisma.atenciones.count());
        assert.equal(reporte.total_movimientos, await prisma.movimientos_inventario.count());
        assert.equal((await pedir("/atenciones/paginados", token)).body.paginacion.total_elementos, await prisma.atenciones.count());
        for (const ruta of ["/insumos/paginados?page=0", "/movimientos-inventario/paginados?page=0", "/citas/paginados?page=9007199254740991", "/citas/resumen?id_medico=9223372036854775808"]) {
          assert.equal((await pedir(ruta, token)).status, 400, ruta);
        }
      }
      return { rol: identidad.rol, consultas: rutas[usuario.rol].length + 2 };
    });
  }

  const integridad = {
    "Existencias no negativas": "SELECT count(*)::int AS errores FROM insumos WHERE stock_actual < 0",
    "Existencias coinciden con movimientos": "SELECT count(*)::int AS errores FROM insumos i LEFT JOIN (SELECT id_insumo, SUM(CASE WHEN tipo_movimiento='ENTRADA' THEN cantidad ELSE -cantidad END) AS saldo FROM movimientos_inventario GROUP BY id_insumo) m USING(id_insumo) WHERE i.stock_actual <> COALESCE(m.saldo,0)",
    "Citas atendidas tienen atención": "SELECT count(*)::int AS errores FROM citas c LEFT JOIN atenciones a USING(id_cita) WHERE c.estado='ATENDIDA' AND a.id_atencion IS NULL",
    "Atenciones corresponden a citas atendidas": "SELECT count(*)::int AS errores FROM atenciones a JOIN citas c USING(id_cita) WHERE c.estado<>'ATENDIDA'",
    "Consumos tienen salida de inventario correspondiente": "SELECT count(*)::int AS errores FROM consumo_insumos_atencion c LEFT JOIN movimientos_inventario m USING(id_consumo) WHERE m.id_movimiento IS NULL OR m.cantidad<>c.cantidad OR m.id_insumo<>c.id_insumo OR m.id_atencion<>c.id_atencion OR m.tipo_movimiento<>'SALIDA'",
    "Médicos sin citas activas solapadas": "SELECT count(*)::int AS errores FROM citas a JOIN citas b ON a.id_cita<b.id_cita AND a.id_medico=b.id_medico AND a.fecha_hora_inicio<b.fecha_hora_fin AND b.fecha_hora_inicio<a.fecha_hora_fin WHERE a.estado IN ('PROGRAMADA','CONFIRMADA') AND b.estado IN ('PROGRAMADA','CONFIRMADA')",
    "Pacientes sin citas activas solapadas": "SELECT count(*)::int AS errores FROM citas a JOIN citas b ON a.id_cita<b.id_cita AND a.id_paciente=b.id_paciente AND a.fecha_hora_inicio<b.fecha_hora_fin AND b.fecha_hora_inicio<a.fecha_hora_fin WHERE a.estado IN ('PROGRAMADA','CONFIRMADA') AND b.estado IN ('PROGRAMADA','CONFIRMADA')",
  };
  for (const [nombre, sql] of Object.entries(integridad)) {
    await comprobar(nombre, async () => {
      // SQL constante del propio archivo, sin entrada del usuario.
      assert.equal((await prisma.$queryRawUnsafe(sql))[0].errores, 0);
    });
  }
  await comprobar("Vistas analíticas consultables y completas", async () => {
    const vistas = { dim_medicos: "medicos", dim_servicios: "servicios_hospitalarios", dim_insumos: "insumos", fact_citas: "citas", fact_atenciones: "atenciones", fact_servicios: "detalle_atencion_servicios", fact_consumos: "consumo_insumos_atencion", fact_movimientos: "movimientos_inventario" };
    for (const [vista, tabla] of Object.entries(vistas)) {
      const filas = await prisma.$queryRawUnsafe(`SELECT count(*)::int AS cantidad FROM analitica.${vista}`);
      assert.equal(filas[0].cantidad, await prisma[tabla].count(), vista);
    }
    const [calendario] = await prisma.$queryRaw`SELECT count(*)::int AS cantidad, count(DISTINCT fecha)::int AS distintas, (max(fecha)-min(fecha)+1)::int AS dias FROM analitica.dim_fecha`;
    assert.ok(calendario.cantidad > 0);
    assert.equal(calendario.cantidad, calendario.distintas);
    assert.equal(calendario.cantidad, calendario.dias);
    const [cobertura] = await prisma.$queryRaw`
      SELECT count(*)::int AS faltantes FROM (
        SELECT fecha FROM analitica.fact_citas UNION
        SELECT fecha FROM analitica.fact_atenciones UNION
        SELECT fecha FROM analitica.fact_movimientos
      ) hechos LEFT JOIN analitica.dim_fecha calendario USING (fecha)
      WHERE calendario.fecha IS NULL`;
    assert.equal(cobertura.faltantes, 0);
  });
  console.log(JSON.stringify({ resultados, correctas: resultados.filter((r) => r.correcto).length, fallidas: resultados.filter((r) => !r.correcto).length }, null, 2));
  if (resultados.some((r) => !r.correcto)) process.exitCode = 1;
} finally {
  await prisma.$disconnect();
}
