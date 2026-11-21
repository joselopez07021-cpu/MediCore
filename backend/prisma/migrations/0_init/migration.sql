-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateTable
CREATE TABLE "atenciones" (
    "id_atencion" BIGINT GENERATED ALWAYS AS IDENTITY NOT NULL,
    "id_cita" BIGINT NOT NULL,
    "fecha_atencion" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "motivo_atencion" TEXT,
    "diagnostico" TEXT,
    "notas" TEXT,
    "estado" VARCHAR(20) NOT NULL DEFAULT 'EN_PROCESO',
    "registrado_por" BIGINT,
    "fecha_creacion" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "atenciones_pkey" PRIMARY KEY ("id_atencion")
);

-- CreateTable
CREATE TABLE "categorias_insumos" (
    "id_categoria" BIGINT GENERATED ALWAYS AS IDENTITY NOT NULL,
    "nombre" VARCHAR(80) NOT NULL,
    "descripcion" TEXT,
    "activo" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "categorias_insumos_pkey" PRIMARY KEY ("id_categoria")
);

-- CreateTable
CREATE TABLE "citas" (
    "id_cita" BIGINT GENERATED ALWAYS AS IDENTITY NOT NULL,
    "id_paciente" BIGINT NOT NULL,
    "id_medico" BIGINT NOT NULL,
    "fecha_hora_inicio" TIMESTAMPTZ NOT NULL,
    "fecha_hora_fin" TIMESTAMPTZ NOT NULL,
    "motivo" VARCHAR(300),
    "estado" VARCHAR(20) NOT NULL DEFAULT 'PROGRAMADA',
    "observaciones" TEXT,
    "creado_por" BIGINT,
    "fecha_creacion" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "citas_pkey" PRIMARY KEY ("id_cita")
);

-- CreateTable
CREATE TABLE "consumo_insumos_atencion" (
    "id_consumo" BIGINT GENERATED ALWAYS AS IDENTITY NOT NULL,
    "id_atencion" BIGINT NOT NULL,
    "id_insumo" BIGINT NOT NULL,
    "cantidad" DECIMAL(12,2) NOT NULL,
    "fecha_consumo" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "registrado_por" BIGINT,
    "observaciones" TEXT,

    CONSTRAINT "consumo_insumos_atencion_pkey" PRIMARY KEY ("id_consumo")
);

-- CreateTable
CREATE TABLE "detalle_atencion_servicios" (
    "id_detalle" BIGINT GENERATED ALWAYS AS IDENTITY NOT NULL,
    "id_atencion" BIGINT NOT NULL,
    "id_servicio" BIGINT NOT NULL,
    "cantidad" DECIMAL(10,2) NOT NULL DEFAULT 1,
    "observaciones" TEXT,

    CONSTRAINT "detalle_atencion_servicios_pkey" PRIMARY KEY ("id_detalle")
);

-- CreateTable
CREATE TABLE "insumos" (
    "id_insumo" BIGINT GENERATED ALWAYS AS IDENTITY NOT NULL,
    "id_categoria" BIGINT NOT NULL,
    "codigo" VARCHAR(40) NOT NULL,
    "nombre" VARCHAR(150) NOT NULL,
    "descripcion" TEXT,
    "unidad_medida" VARCHAR(30) NOT NULL,
    "stock_actual" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "stock_minimo" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "activo" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "insumos_pkey" PRIMARY KEY ("id_insumo")
);

-- CreateTable
CREATE TABLE "medicos" (
    "id_medico" BIGINT GENERATED ALWAYS AS IDENTITY NOT NULL,
    "id_usuario" BIGINT NOT NULL,
    "identificacion" VARCHAR(40) NOT NULL,
    "nombre" VARCHAR(80) NOT NULL,
    "apellido" VARCHAR(100) NOT NULL,
    "especialidad" VARCHAR(100) NOT NULL,
    "telefono" VARCHAR(30),
    "correo" VARCHAR(254),
    "activo" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "medicos_pkey" PRIMARY KEY ("id_medico")
);

-- CreateTable
CREATE TABLE "movimientos_inventario" (
    "id_movimiento" BIGINT GENERATED ALWAYS AS IDENTITY NOT NULL,
    "id_insumo" BIGINT NOT NULL,
    "tipo_movimiento" VARCHAR(20) NOT NULL,
    "cantidad" DECIMAL(12,2) NOT NULL,
    "fecha_movimiento" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "motivo" VARCHAR(250) NOT NULL,
    "id_atencion" BIGINT,
    "id_consumo" BIGINT,
    "registrado_por" BIGINT,

    CONSTRAINT "movimientos_inventario_pkey" PRIMARY KEY ("id_movimiento")
);

-- CreateTable
CREATE TABLE "pacientes" (
    "id_paciente" BIGINT GENERATED ALWAYS AS IDENTITY NOT NULL,
    "identificacion" VARCHAR(40) NOT NULL,
    "nombre" VARCHAR(80) NOT NULL,
    "apellido" VARCHAR(100) NOT NULL,
    "fecha_nacimiento" DATE,
    "telefono" VARCHAR(30),
    "correo" VARCHAR(254),
    "direccion" VARCHAR(250),
    "fecha_registro" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "activo" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "pacientes_pkey" PRIMARY KEY ("id_paciente")
);

-- CreateTable
CREATE TABLE "roles" (
    "id_rol" BIGINT GENERATED ALWAYS AS IDENTITY NOT NULL,
    "nombre" VARCHAR(50) NOT NULL,
    "descripcion" VARCHAR(250),
    "activo" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "roles_pkey" PRIMARY KEY ("id_rol")
);

-- CreateTable
CREATE TABLE "servicios_hospitalarios" (
    "id_servicio" BIGINT GENERATED ALWAYS AS IDENTITY NOT NULL,
    "codigo" VARCHAR(30) NOT NULL,
    "nombre" VARCHAR(120) NOT NULL,
    "descripcion" TEXT,
    "duracion_estimada_minutos" INTEGER,
    "activo" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "servicios_hospitalarios_pkey" PRIMARY KEY ("id_servicio")
);

-- CreateTable
CREATE TABLE "usuarios" (
    "id_usuario" BIGINT GENERATED ALWAYS AS IDENTITY NOT NULL,
    "id_rol" BIGINT NOT NULL,
    "nombre_usuario" VARCHAR(60) NOT NULL,
    "correo" VARCHAR(254) NOT NULL,
    "password_hash" TEXT NOT NULL,
    "nombre_completo" VARCHAR(150) NOT NULL,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "fecha_creacion" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "usuarios_pkey" PRIMARY KEY ("id_usuario")
);

-- CreateIndex
ALTER TABLE "atenciones" ADD CONSTRAINT "atenciones_id_cita_key" UNIQUE ("id_cita");

-- CreateIndex
CREATE INDEX "idx_atenciones_fecha" ON "atenciones"("fecha_atencion");

-- CreateIndex
ALTER TABLE "categorias_insumos" ADD CONSTRAINT "categorias_insumos_nombre_key" UNIQUE ("nombre");

-- CreateIndex
CREATE INDEX "idx_citas_estado_fecha" ON "citas"("estado", "fecha_hora_inicio");

-- CreateIndex
CREATE INDEX "idx_citas_medico_fecha" ON "citas"("id_medico", "fecha_hora_inicio");

-- CreateIndex
CREATE INDEX "idx_citas_paciente_fecha" ON "citas"("id_paciente", "fecha_hora_inicio");

-- CreateIndex
CREATE INDEX "idx_consumo_atencion" ON "consumo_insumos_atencion"("id_atencion");

-- CreateIndex
CREATE INDEX "idx_detalle_servicios_atencion" ON "detalle_atencion_servicios"("id_atencion");

-- CreateIndex
ALTER TABLE "detalle_atencion_servicios" ADD CONSTRAINT "uq_atencion_servicio" UNIQUE ("id_atencion", "id_servicio");

-- CreateIndex
ALTER TABLE "insumos" ADD CONSTRAINT "insumos_codigo_key" UNIQUE ("codigo");

-- CreateIndex
CREATE INDEX "idx_insumos_categoria" ON "insumos"("id_categoria");

-- CreateIndex
CREATE INDEX "idx_insumos_stock" ON "insumos"("stock_actual", "stock_minimo");

-- CreateIndex
ALTER TABLE "medicos" ADD CONSTRAINT "medicos_id_usuario_key" UNIQUE ("id_usuario");

-- CreateIndex
ALTER TABLE "medicos" ADD CONSTRAINT "medicos_identificacion_key" UNIQUE ("identificacion");

-- CreateIndex
ALTER TABLE "movimientos_inventario" ADD CONSTRAINT "movimientos_inventario_id_consumo_key" UNIQUE ("id_consumo");

-- CreateIndex
CREATE INDEX "idx_movimientos_insumo_fecha" ON "movimientos_inventario"("id_insumo", "fecha_movimiento" DESC);

-- CreateIndex
ALTER TABLE "pacientes" ADD CONSTRAINT "pacientes_identificacion_key" UNIQUE ("identificacion");

-- CreateIndex
ALTER TABLE "roles" ADD CONSTRAINT "roles_nombre_key" UNIQUE ("nombre");

-- CreateIndex
ALTER TABLE "servicios_hospitalarios" ADD CONSTRAINT "servicios_hospitalarios_codigo_key" UNIQUE ("codigo");

-- CreateIndex
ALTER TABLE "servicios_hospitalarios" ADD CONSTRAINT "servicios_hospitalarios_nombre_key" UNIQUE ("nombre");

-- CreateIndex
ALTER TABLE "usuarios" ADD CONSTRAINT "usuarios_nombre_usuario_key" UNIQUE ("nombre_usuario");

-- CreateIndex
ALTER TABLE "usuarios" ADD CONSTRAINT "usuarios_correo_key" UNIQUE ("correo");

-- AddForeignKey
ALTER TABLE "atenciones" ADD CONSTRAINT "atenciones_id_cita_fkey" FOREIGN KEY ("id_cita") REFERENCES "citas"("id_cita") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "atenciones" ADD CONSTRAINT "atenciones_registrado_por_fkey" FOREIGN KEY ("registrado_por") REFERENCES "usuarios"("id_usuario") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "citas" ADD CONSTRAINT "citas_creado_por_fkey" FOREIGN KEY ("creado_por") REFERENCES "usuarios"("id_usuario") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "citas" ADD CONSTRAINT "citas_id_medico_fkey" FOREIGN KEY ("id_medico") REFERENCES "medicos"("id_medico") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "citas" ADD CONSTRAINT "citas_id_paciente_fkey" FOREIGN KEY ("id_paciente") REFERENCES "pacientes"("id_paciente") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "consumo_insumos_atencion" ADD CONSTRAINT "consumo_insumos_atencion_id_atencion_fkey" FOREIGN KEY ("id_atencion") REFERENCES "atenciones"("id_atencion") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "consumo_insumos_atencion" ADD CONSTRAINT "consumo_insumos_atencion_id_insumo_fkey" FOREIGN KEY ("id_insumo") REFERENCES "insumos"("id_insumo") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "consumo_insumos_atencion" ADD CONSTRAINT "consumo_insumos_atencion_registrado_por_fkey" FOREIGN KEY ("registrado_por") REFERENCES "usuarios"("id_usuario") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "detalle_atencion_servicios" ADD CONSTRAINT "detalle_atencion_servicios_id_atencion_fkey" FOREIGN KEY ("id_atencion") REFERENCES "atenciones"("id_atencion") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "detalle_atencion_servicios" ADD CONSTRAINT "detalle_atencion_servicios_id_servicio_fkey" FOREIGN KEY ("id_servicio") REFERENCES "servicios_hospitalarios"("id_servicio") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "insumos" ADD CONSTRAINT "insumos_id_categoria_fkey" FOREIGN KEY ("id_categoria") REFERENCES "categorias_insumos"("id_categoria") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "medicos" ADD CONSTRAINT "medicos_id_usuario_fkey" FOREIGN KEY ("id_usuario") REFERENCES "usuarios"("id_usuario") ON DELETE RESTRICT ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "movimientos_inventario" ADD CONSTRAINT "movimientos_inventario_id_atencion_fkey" FOREIGN KEY ("id_atencion") REFERENCES "atenciones"("id_atencion") ON DELETE RESTRICT ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "movimientos_inventario" ADD CONSTRAINT "movimientos_inventario_id_consumo_fkey" FOREIGN KEY ("id_consumo") REFERENCES "consumo_insumos_atencion"("id_consumo") ON DELETE RESTRICT ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "movimientos_inventario" ADD CONSTRAINT "movimientos_inventario_id_insumo_fkey" FOREIGN KEY ("id_insumo") REFERENCES "insumos"("id_insumo") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "movimientos_inventario" ADD CONSTRAINT "movimientos_inventario_registrado_por_fkey" FOREIGN KEY ("registrado_por") REFERENCES "usuarios"("id_usuario") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "usuarios" ADD CONSTRAINT "usuarios_id_rol_fkey" FOREIGN KEY ("id_rol") REFERENCES "roles"("id_rol") ON DELETE NO ACTION ON UPDATE NO ACTION;


-- ============================================================
-- Restricciones CHECK originales de MediCore
-- ============================================================

ALTER TABLE "pacientes"
ADD CONSTRAINT "chk_paciente_fecha_nacimiento"
CHECK (fecha_nacimiento IS NULL OR fecha_nacimiento <= CURRENT_DATE);

ALTER TABLE "servicios_hospitalarios"
ADD CONSTRAINT "chk_servicio_duracion"
CHECK (duracion_estimada_minutos IS NULL OR duracion_estimada_minutos > 0);

ALTER TABLE "insumos"
ADD CONSTRAINT "chk_insumo_stock_actual"
CHECK (stock_actual >= 0);

ALTER TABLE "insumos"
ADD CONSTRAINT "chk_insumo_stock_minimo"
CHECK (stock_minimo >= 0);

ALTER TABLE "citas"
ADD CONSTRAINT "chk_cita_estado"
CHECK (estado IN (
    'PROGRAMADA',
    'CONFIRMADA',
    'ATENDIDA',
    'CANCELADA',
    'NO_ASISTIO'
));

ALTER TABLE "citas"
ADD CONSTRAINT "chk_cita_horario"
CHECK (fecha_hora_fin > fecha_hora_inicio);

ALTER TABLE "atenciones"
ADD CONSTRAINT "chk_atencion_estado"
CHECK (estado IN (
    'EN_PROCESO',
    'COMPLETADA',
    'ANULADA'
));

ALTER TABLE "consumo_insumos_atencion"
ADD CONSTRAINT "chk_consumo_cantidad"
CHECK (cantidad > 0);

ALTER TABLE "detalle_atencion_servicios"
ADD CONSTRAINT "chk_detalle_servicio_cantidad"
CHECK (cantidad > 0);

ALTER TABLE "movimientos_inventario"
ADD CONSTRAINT "chk_movimiento_cantidad"
CHECK (cantidad > 0);

ALTER TABLE "movimientos_inventario"
ADD CONSTRAINT "chk_movimiento_tipo"
CHECK (tipo_movimiento IN (
    'ENTRADA',
    'SALIDA',
    'AJUSTE_POSITIVO',
    'AJUSTE_NEGATIVO'
));

ALTER TABLE "movimientos_inventario"
ADD CONSTRAINT "chk_movimiento_consumo"
CHECK (
    (
        tipo_movimiento = 'SALIDA'
        AND (
            (id_consumo IS NULL AND id_atencion IS NULL)
            OR
            (id_consumo IS NOT NULL AND id_atencion IS NOT NULL)
        )
    )
    OR
    (
        tipo_movimiento <> 'SALIDA'
        AND id_consumo IS NULL
        AND id_atencion IS NULL
    )
);

