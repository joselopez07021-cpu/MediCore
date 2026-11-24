import test from "node:test";
import assert from "node:assert/strict";
import { filtrosReporte } from "../src/services/consultas.service.js";

test("reportes: período inclusivo en Costa Rica y BigInt sin pérdida", () => {
  const r = filtrosReporte({
    fecha_desde: "2026-01-01",
    fecha_hasta: "2026-01-31",
    id_medico: "9007199254740993",
  });
  assert.equal(r.rango.gte.toISOString(), "2026-01-01T06:00:00.000Z");
  assert.equal(r.rango.lt.toISOString(), "2026-02-01T06:00:00.000Z");
  assert.equal(r.medico, 9007199254740993n);
});
test("reportes: rechaza fechas imposibles, rangos invertidos e IDs fuera de rango", () => {
  for (const query of [
    { fecha_desde: "2026-02-30" },
    { fecha_desde: "2026-02-01", fecha_hasta: "2026-01-01" },
    { id_medico: "9223372036854775808" },
    { id_medico: [] },
  ]) {
    assert.throws(
      () => filtrosReporte(query),
      (e) => e.status === 400,
    );
  }
});
