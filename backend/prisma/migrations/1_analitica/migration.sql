-- Modelo de lectura para Power BI. No incluye nombres ni contacto de pacientes,
-- diagnósticos, notas clínicas, contraseñas ni tokens.
CREATE SCHEMA IF NOT EXISTS analitica;
REVOKE ALL ON SCHEMA analitica FROM PUBLIC;

CREATE VIEW analitica.dim_medicos AS
SELECT id_medico::text AS id_medico, nombre || ' ' || apellido AS medico,
       especialidad, activo
FROM public.medicos;

CREATE VIEW analitica.dim_servicios AS
SELECT id_servicio::text AS id_servicio, codigo, nombre, activo
FROM public.servicios_hospitalarios;

CREATE VIEW analitica.dim_insumos AS
SELECT i.id_insumo::text AS id_insumo, i.codigo, i.nombre, c.nombre AS categoria,
       i.unidad_medida, i.stock_actual, i.stock_minimo, i.activo
FROM public.insumos i JOIN public.categorias_insumos c USING (id_categoria);

CREATE VIEW analitica.fact_citas AS
SELECT id_cita::text AS id_cita, id_medico::text AS id_medico,
       (fecha_hora_inicio AT TIME ZONE 'America/Costa_Rica')::date AS fecha,
       estado, EXTRACT(EPOCH FROM (fecha_hora_fin - fecha_hora_inicio))/60 AS duracion_minutos
FROM public.citas;

CREATE VIEW analitica.fact_atenciones AS
SELECT a.id_atencion::text AS id_atencion, a.id_cita::text AS id_cita,
       c.id_medico::text AS id_medico,
       (a.fecha_atencion AT TIME ZONE 'America/Costa_Rica')::date AS fecha,
       a.estado
FROM public.atenciones a JOIN public.citas c USING (id_cita);

CREATE VIEW analitica.fact_servicios AS
SELECT d.id_detalle::text AS id_detalle, d.id_atencion::text AS id_atencion,
       d.id_servicio::text AS id_servicio, c.id_medico::text AS id_medico,
       (a.fecha_atencion AT TIME ZONE 'America/Costa_Rica')::date AS fecha, d.cantidad
FROM public.detalle_atencion_servicios d
JOIN public.atenciones a USING (id_atencion) JOIN public.citas c USING (id_cita);

CREATE VIEW analitica.fact_consumos AS
SELECT x.id_consumo::text AS id_consumo, x.id_atencion::text AS id_atencion,
       x.id_insumo::text AS id_insumo, c.id_medico::text AS id_medico,
       (a.fecha_atencion AT TIME ZONE 'America/Costa_Rica')::date AS fecha, x.cantidad
FROM public.consumo_insumos_atencion x
JOIN public.atenciones a USING (id_atencion) JOIN public.citas c USING (id_cita);

CREATE VIEW analitica.fact_movimientos AS
SELECT id_movimiento::text AS id_movimiento, id_insumo::text AS id_insumo,
       (fecha_movimiento AT TIME ZONE 'America/Costa_Rica')::date AS fecha,
       tipo_movimiento, cantidad,
       CASE WHEN id_consumo IS NULL THEN 'MANUAL' ELSE 'CONSUMO_ATENCION' END AS origen
FROM public.movimientos_inventario;

CREATE VIEW analitica.dim_fecha AS
WITH fechas AS (
  SELECT fecha FROM analitica.fact_citas UNION ALL
  SELECT fecha FROM analitica.fact_atenciones UNION ALL
  SELECT fecha FROM analitica.fact_movimientos
), limites AS (
  SELECT COALESCE(MIN(fecha), CURRENT_DATE) AS inicio,
         COALESCE(MAX(fecha), CURRENT_DATE) AS fin FROM fechas
)
SELECT d::date AS fecha, EXTRACT(YEAR FROM d)::int AS anio,
       EXTRACT(QUARTER FROM d)::int AS trimestre, EXTRACT(MONTH FROM d)::int AS mes,
       EXTRACT(DAY FROM d)::int AS dia
FROM limites, generate_series(inicio::timestamp, fin::timestamp, interval '1 day') d;
