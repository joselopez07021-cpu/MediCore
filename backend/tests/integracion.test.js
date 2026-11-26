import "dotenv/config";
import test from "node:test";
import assert from "node:assert/strict";
import { Client } from "pg";
import { readFile, readdir } from "node:fs/promises";
import bcrypt from "bcrypt";

// Siempre crea una base aislada. Nunca vacía ni siembra DATABASE_URL.
test(
  "API y PostgreSQL: pacientes, citas, atenciones, inventario, permisos y reportes",
  { timeout: 120000 },
  async (t) => {
    assert.ok(
      process.env.DATABASE_URL,
      "Configura DATABASE_URL en backend/.env",
    );
    const original = new URL(process.env.DATABASE_URL);
    const nombre = `medicore_test_${process.pid}_${Date.now()}`;
    assert.match(nombre, /^medicore_test_\d+_\d+$/);
    const admin = new Client({ connectionString: original.href });
    let bd, prisma, servidor;
    await admin.connect();
    try {
      await admin.query(`CREATE DATABASE "${nombre}"`);
      const url = new URL(original);
      url.pathname = `/${nombre}`;
      bd = new Client({ connectionString: url.href });
      await bd.connect();
      const migraciones = await readdir(
        new URL("../prisma/migrations/", import.meta.url),
        { withFileTypes: true },
      );
      for (const entrada of migraciones
        .filter((e) => e.isDirectory())
        .sort((a, b) => a.name.localeCompare(b.name))) {
        await bd.query(
          await readFile(
            new URL(
              `../prisma/migrations/${entrada.name}/migration.sql`,
              import.meta.url,
            ),
            "utf8",
          ),
        );
      }
      process.env.DATABASE_URL = url.href;
      process.env.JWT_SECRET = "secreto-aislado-de-integracion-no-produccion";
      prisma = (await import("../src/config/prisma.js")).default;
      const app = (await import("../src/app.js")).default;
      const roles = {};
      for (const nombreRol of [
        "ADMINISTRADOR",
        "ADMISION",
        "MEDICO",
        "INVENTARIO",
      ])
        roles[nombreRol] = await prisma.roles.create({
          data: { nombre: nombreRol },
        });
      const password = "Integracion123!";
      const hash = await bcrypt.hash(password, 4);
      const usuarios = {};
      for (const [login, rol] of [
        ["admin", "ADMINISTRADOR"],
        ["admision", "ADMISION"],
        ["medico", "MEDICO"],
        ["otro", "MEDICO"],
        ["inventario", "INVENTARIO"],
      ]) {
        usuarios[login] = await prisma.usuarios.create({
          data: {
            id_rol: roles[rol].id_rol,
            nombre_usuario: login,
            nombre_completo: login,
            correo: `${login}@example.com`,
            password_hash: hash,
          },
        });
      }
      const medico = await prisma.medicos.create({
        data: {
          id_usuario: usuarios.medico.id_usuario,
          identificacion: "MED-1",
          nombre: "Medico",
          apellido: "Uno",
          especialidad: "General",
        },
      });
      const otro = await prisma.medicos.create({
        data: {
          id_usuario: usuarios.otro.id_usuario,
          identificacion: "MED-2",
          nombre: "Medico",
          apellido: "Dos",
          especialidad: "General",
        },
      });
      const categoria = await prisma.categorias_insumos.create({
        data: { nombre: "Prueba" },
      });
      const servicio = await prisma.servicios_hospitalarios.create({
        data: {
          codigo: "SER-1",
          nombre: "Consulta",
          duracion_estimada_minutos: 30,
        },
      });
      servidor = await new Promise((resolve) => {
        const s = app.listen(0, "127.0.0.1", () => resolve(s));
      });
      const base = `http://127.0.0.1:${servidor.address().port}/api`;
      async function pedir(ruta, token, metodo = "GET", body) {
        const res = await fetch(base + ruta, {
          method: metodo,
          headers: {
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
            ...(body ? { "Content-Type": "application/json" } : {}),
          },
          body: body ? JSON.stringify(body) : undefined,
        });
        return { status: res.status, body: await res.json() };
      }
      const tokens = {};
      await t.test("autenticación, directorios y permisos", async () => {
        assert.equal(
          (
            await pedir("/asistente", null, "POST", {
              message: "¿Dónde veo pacientes?",
            })
          ).status,
          200,
        );
        assert.equal(
          (await pedir("/asistente", null, "POST", { message: "" })).status,
          400,
        );
        assert.equal((await pedir("/pacientes")).status, 401);
        assert.equal((await pedir("/inicio/resumen")).status, 401);
        assert.equal(
          (
            await pedir("/auth/login", null, "POST", {
              nombre_usuario: "admin",
              password: "incorrecta",
            })
          ).status,
          401,
        );
        for (const login of Object.keys(usuarios)) {
          const r = await pedir("/auth/login", null, "POST", {
            nombre_usuario: login,
            password,
          });
          assert.equal(r.status, 200);
          tokens[login] = r.body.data.token;
        }
        assert.equal(
          (await pedir("/auth/me", tokens.medico)).body.data.id_medico,
          String(medico.id_medico),
        );
        const lista = await pedir("/usuarios", tokens.admin);
        assert.equal(lista.status, 200);
        assert.equal(lista.body.data.length, 5);
        assert.equal("password_hash" in lista.body.data[0], false);
        assert.equal((await pedir("/usuarios", tokens.admision)).status, 403);
        assert.equal(
          (await pedir("/medicos", tokens.admision)).body.data.length,
          2,
        );
        assert.equal((await pedir("/reportes", tokens.medico)).status, 403);
      });
      await t.test("paginación y filtros inválidos devuelven 400 sin fallos internos", async () => {
        for (const ruta of [
          "/pacientes/paginados",
          "/citas/paginados",
          "/citas/agenda/paginados?fecha=2030-01-01",
          "/insumos/paginados",
          "/movimientos-inventario/paginados",
          "/atenciones/paginados",
        ]) {
          for (const pagina of ["0", "abc", "1.5", "9007199254740991", "9007199254740992"]) {
            const r = await pedir(`${ruta}${ruta.includes("?") ? "&" : "?"}page=${pagina}`, tokens.admin);
            assert.equal(r.status, 400, `${ruta}, página ${pagina}`);
          }
        }
        for (const filtro of [
          "id_medico=9223372036854775808",
          "id_medico=1&id_medico=1",
          "fecha_desde=",
          "fecha_hasta=",
          "fecha_desde=2030-02-30",
          "fecha_desde=2030-02-01&fecha_hasta=2030-01-01",
        ]) {
          assert.equal((await pedir(`/citas/resumen?${filtro}`, tokens.admin)).status, 400, filtro);
        }
        for (const ruta of ["/pacientes/paginados", "/citas/paginados", "/insumos/paginados", "/movimientos-inventario/paginados", "/atenciones/paginados"]) {
          const r = await pedir(`${ruta}?page=1`, tokens.admin);
          assert.equal(r.status, 200, ruta);
          assert.ok(Array.isArray(r.body.data), ruta);
        }
      });
      let paciente;
      const datosPaciente = {
        nombre: "Paciente",
        apellido: "Temporal",
        identificacion: "TEST-1",
        fecha_nacimiento: "2000-01-01",
        telefono: "88888888",
        correo: "paciente@example.com",
      };
      await t.test(
        "paciente: validación, duplicado, edición, estado y BigInt",
        async () => {
          assert.equal(
            (await pedir("/pacientes", tokens.admision, "POST", {})).status,
            400,
          );
          let r = await pedir(
            "/pacientes",
            tokens.admision,
            "POST",
            datosPaciente,
          );
          assert.equal(r.status, 201);
          paciente = r.body.data;
          assert.equal(
            (await pedir("/pacientes", tokens.admision, "POST", datosPaciente))
              .status,
            409,
          );
          r = await pedir(
            `/pacientes/${paciente.id_paciente}`,
            tokens.admision,
            "PUT",
            { ...datosPaciente, telefono: "77777777" },
          );
          assert.equal(r.status, 200);
          assert.equal(r.body.data.telefono, "77777777");
          assert.equal(
            (
              await pedir(
                `/pacientes/${paciente.id_paciente}/estado`,
                tokens.admision,
                "PATCH",
                { activo: false },
              )
            ).body.data.activo,
            false,
          );
          assert.equal(
            (
              await pedir(
                `/pacientes/${paciente.id_paciente}/estado`,
                tokens.admision,
                "PATCH",
                { activo: true },
              )
            ).body.data.activo,
            true,
          );
          await bd.query(
            `INSERT INTO pacientes (id_paciente, identificacion, nombre, apellido) OVERRIDING SYSTEM VALUE VALUES (9007199254740993, 'BIGINT', 'ID', 'Grande')`,
          );
          assert.equal(
            (await pedir("/pacientes/9007199254740993", tokens.admin)).body.data
              .id_paciente,
            "9007199254740993",
          );
          assert.equal(
            (await pedir("/pacientes", tokens.inventario)).status,
            403,
          );
        },
      );
      let cita, citaOtra, datosCita;
      const fecha = new Date(Date.now() + 2 * 86400000)
        .toISOString()
        .slice(0, 10);
      await t.test(
        "citas: horario CR, solapamiento y aislamiento del médico",
        async () => {
          datosCita = {
            id_paciente: paciente.id_paciente,
            id_medico: String(medico.id_medico),
            fecha,
            hora: "09:00",
            motivo: "Prueba",
            estado: "PROGRAMADA",
          };
          let r = await pedir("/citas", tokens.admision, "POST", datosCita);
          assert.equal(r.status, 201);
          cita = r.body.data;
          assert.equal(cita.fecha_hora_inicio, `${fecha}T15:00:00.000Z`);
          assert.equal(
            (
              await pedir("/citas", tokens.admision, "POST", {
                ...datosCita,
                hora: "09:15",
              })
            ).status,
            409,
          );
          assert.equal(
            (
              await pedir("/citas", tokens.admision, "POST", {
                ...datosCita,
                id_medico: String(otro.id_medico),
                hora: "09:15",
              })
            ).status,
            409,
          );
          r = await pedir("/citas", tokens.admision, "POST", {
            ...datosCita,
            id_medico: String(otro.id_medico),
            hora: "10:00",
          });
          assert.equal(r.status, 201);
          citaOtra = r.body.data;
          r = await pedir(`/citas/${cita.id_cita}`, tokens.admision, "PUT", {
            ...datosCita,
            motivo: "Editada",
          });
          assert.equal(r.status, 200);
          assert.equal(
            (
              await pedir(
                `/citas/${cita.id_cita}/estado`,
                tokens.admision,
                "PATCH",
                { estado: "CONFIRMADA" },
              )
            ).status,
            200,
          );
          const agenda = await pedir(
            `/citas/agenda?fecha=${fecha}`,
            tokens.medico,
          );
          assert.equal(agenda.body.data.length, 1);
          assert.equal(
            (
              await pedir(
                `/citas/agenda?fecha=${fecha}&id_medico=${otro.id_medico}`,
                tokens.medico,
              )
            ).status,
            403,
          );
          assert.equal(
            (await pedir("/citas", tokens.medico)).body.data.length,
            1,
          );
          assert.equal(
            (
              await pedir(
                "/citas/paginados?id_medico=" + otro.id_medico,
                tokens.medico,
              )
            ).body.data.length,
            1,
          );
          assert.equal(
            (await pedir(`/citas/${citaOtra.id_cita}`, tokens.medico)).status,
            403,
          );
          assert.equal(
            (await pedir("/citas", tokens.medico, "POST", datosCita)).status,
            403,
          );
          const historial = await pedir(
            `/pacientes/${paciente.id_paciente}/citas`,
            tokens.admision,
          );
          assert.equal(historial.status, 200);
          assert.equal(historial.body.data.length, 2);
        },
      );
      let insumo;
      await t.test(
        "inventario: creación en cero, entradas, salidas y rechazo sin stock",
        async () => {
          let r = await pedir("/insumos", tokens.inventario, "POST", {
            nombre: "Insumo temporal",
            id_categoria: String(categoria.id_categoria),
            unidad_medida: "ml",
            stock_minimo: 2,
          });
          assert.equal(r.status, 201);
          insumo = r.body.data;
          assert.equal(Number(insumo.stock_actual), 0);
          const mover = (tipo, cantidad) =>
            pedir("/movimientos-inventario", tokens.inventario, "POST", {
              id_insumo: insumo.id_insumo,
              tipo_movimiento: tipo,
              cantidad,
              motivo: "Prueba",
            });
          assert.equal((await mover("ENTRADA", 10)).status, 201);
          assert.equal((await mover("SALIDA", 11)).status, 409);
          assert.equal((await mover("SALIDA", 1.5)).status, 400);
          assert.equal((await mover("SALIDA", 1)).status, 201);
          assert.equal(
            Number(
              (await pedir("/insumos/" + insumo.id_insumo, tokens.inventario))
                .body.data.stock_actual,
            ),
            9,
          );
          assert.equal(
            (await pedir("/movimientos-inventario", tokens.inventario)).body
              .data.length,
            2,
          );
        },
      );
      let atencion;
      await t.test(
        "atención: rollback completo, descuento decimal, duplicados y cita inmutable",
        async () => {
          const datos = {
            id_cita: cita.id_cita,
            diagnostico: "Prueba sintética",
            notas: "",
            servicios: [
              { id_servicio: String(servicio.id_servicio), cantidad: 1 },
            ],
            insumos: [{ id_insumo: insumo.id_insumo, cantidad: 100 }],
          };
          assert.equal(
            (await pedir("/atenciones", tokens.medico, "POST", datos)).status,
            409,
          );
          assert.equal(await prisma.atenciones.count(), 0);
          assert.equal(await prisma.detalle_atencion_servicios.count(), 0);
          assert.equal(await prisma.consumo_insumos_atencion.count(), 0);
          assert.equal(await prisma.movimientos_inventario.count(), 2);
          assert.equal(
            (
              await prisma.citas.findUnique({
                where: { id_cita: BigInt(cita.id_cita) },
              })
            ).estado,
            "CONFIRMADA",
          );
          datos.insumos[0].cantidad = 1.25;
          assert.equal(
            (await pedir("/atenciones", tokens.otro, "POST", datos)).status,
            403,
          );
          const r = await pedir("/atenciones", tokens.medico, "POST", datos);
          assert.equal(r.status, 201);
          atencion = r.body.data;
          assert.equal(
            (await pedir("/atenciones", tokens.medico, "POST", datos)).status,
            409,
          );
          assert.equal(
            Number(
              (await pedir("/insumos/" + insumo.id_insumo, tokens.inventario))
                .body.data.stock_actual,
            ),
            7.75,
          );
          assert.equal(
            (
              await pedir(
                `/citas/${cita.id_cita}`,
                tokens.admision,
                "PUT",
                datosCita,
              )
            ).status,
            409,
          );
          assert.equal(
            (
              await pedir(
                `/citas/${cita.id_cita}/estado`,
                tokens.admision,
                "PATCH",
                { estado: "CANCELADA" },
              )
            ).status,
            409,
          );
          assert.equal(
            (await pedir("/atenciones/" + atencion.id_atencion, tokens.otro))
              .status,
            403,
          );
          const movimientos = (
            await pedir("/movimientos-inventario", tokens.inventario)
          ).body.data;
          assert.equal(movimientos.length, 3);
          assert.equal(movimientos[0].id_atencion, atencion.id_atencion);
        },
      );
      await t.test(
        "catálogo, inicio por rol y reportes con filtros validados",
        async () => {
          const catalogo = await pedir("/servicios", tokens.medico);
          assert.equal(catalogo.status, 200);
          assert.equal(catalogo.body.data[0].atenciones, 1);
          const r = await pedir("/reportes", tokens.admin);
          assert.equal(r.status, 200);
          assert.equal(r.body.data.total_atenciones, 1);
          assert.equal(r.body.data.total_movimientos, 3);
          assert.equal(r.body.data.consumos[0].cantidad, 1.25);
          assert.equal(
            (await pedir("/reportes?fecha_desde=2026-02-30", tokens.admin))
              .status,
            400,
          );
          assert.equal(
            (await pedir("/reportes?id_medico=" + otro.id_medico, tokens.admin))
              .body.data.total_atenciones,
            0,
          );
          const medicoInicio = await pedir("/inicio/resumen", tokens.medico);
          assert.equal(medicoInicio.status, 200);
          assert.equal(
            medicoInicio.body.data.indicadores.atenciones_registradas,
            1,
          );
          assert.deepEqual(medicoInicio.body.data.reposicion, []);
          const inventarioInicio = await pedir(
            "/inicio/resumen",
            tokens.inventario,
          );
          assert.equal(inventarioInicio.status, 200);
          assert.deepEqual(inventarioInicio.body.data.agenda_hoy, []);
          assert.equal(
            (await pedir("/inicio/resumen", tokens.admin)).status,
            200,
          );
          const hechos = await bd.query(
            "SELECT * FROM analitica.fact_consumos",
          );
          assert.equal(hechos.rows.length, 1);
          assert.equal(Number(hechos.rows[0].cantidad), 1.25);
          const columnas = await bd.query(
            "SELECT column_name FROM information_schema.columns WHERE table_schema = 'analitica'",
          );
          assert.equal(
            columnas.rows.some((c) =>
              /diagnostico|password|correo|telefono/.test(c.column_name),
            ),
            false,
          );
        },
      );
      await t.test(
        "concurrencia: no duplica reservas ni permite sobreventa",
        async () => {
          const reservas = await Promise.all(
            [1, 2].map(() =>
              pedir("/citas", tokens.admision, "POST", {
                ...datosCita,
                hora: "13:00",
              }),
            ),
          );
          assert.deepEqual(reservas.map((r) => r.status).sort(), [201, 409]);
          const salidas = await Promise.all(
            [1, 2].map(() =>
              pedir("/movimientos-inventario", tokens.inventario, "POST", {
                id_insumo: insumo.id_insumo,
                tipo_movimiento: "SALIDA",
                cantidad: 5,
                motivo: "Concurrencia",
              }),
            ),
          );
          assert.deepEqual(salidas.map((r) => r.status).sort(), [201, 409]);
          assert.equal(
            Number(
              (await pedir("/insumos/" + insumo.id_insumo, tokens.inventario))
                .body.data.stock_actual,
            ),
            2.75,
          );
        },
      );
      if (process.env.BROWSER_CHECK === "1") {
        await t.test(
          "navegador: paciente → cita → agenda → atención → inventario → reportes",
          { timeout: 90000 },
          async () => {
            const { comprobarNavegador } = await import("./navegador.js");
            await comprobarNavegador({ base, fecha, medico, insumo, prisma });
          },
        );
      }
    } finally {
      if (servidor) await new Promise((resolve) => servidor.close(resolve));
      if (prisma) await prisma.$disconnect();
      if (bd) await bd.end();
      // El nombre se generó y validó aquí; nunca se toma de DATABASE_URL.
      await admin.query(`DROP DATABASE IF EXISTS "${nombre}" WITH (FORCE)`);
      await admin.end();
    }
  },
);
