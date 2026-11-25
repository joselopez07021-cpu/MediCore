import test from "node:test";
import assert from "node:assert/strict";
import { randomBytes } from "node:crypto";
import bcrypt from "bcrypt";
import {
  sembrarUsuarios,
  usuariosBase,
} from "../prisma/seeds/base/usuarios.seed.js";

function aislarEntorno(t) {
  const nombres = [...new Set(usuariosBase.map((u) => u.passwordEnv))];
  const anteriores = Object.fromEntries(
    nombres.map((n) => [n, process.env[n]]),
  );
  nombres.forEach((n) => delete process.env[n]);
  t.mock.method(console, "log", () => {});
  t.after(() => {
    for (const [nombre, valor] of Object.entries(anteriores)) {
      if (valor === undefined) delete process.env[nombre];
      else process.env[nombre] = valor;
    }
  });
}

test("semillas: conserva usuarios existentes sin exigir ni cambiar contraseñas", async (t) => {
  aislarEntorno(t);
  const crear = t.mock.fn();
  await sembrarUsuarios({
    roles: { findUnique: async () => ({ id_rol: "1" }) },
    usuarios: { findUnique: async () => ({ id_usuario: "1" }), create: crear },
  });
  assert.equal(crear.mock.callCount(), 0);
  assert.ok(
    usuariosBase.every((u) => !Object.hasOwn(u, "password") && u.passwordEnv),
  );
});

test("semillas: rechaza crear un usuario cuando falta su contraseña local", async (t) => {
  aislarEntorno(t);
  const crear = t.mock.fn();
  await assert.rejects(
    sembrarUsuarios({
      roles: { findUnique: async () => ({ id_rol: "1" }) },
      usuarios: { findUnique: async () => null, create: crear },
    }),
    /Configura DEMO_ADMIN_PASSWORD/,
  );
  assert.equal(crear.mock.callCount(), 0);
});

test("semillas: usa la variable local y persiste únicamente el hash bcrypt", async (t) => {
  aislarEntorno(t);
  const password = randomBytes(24).toString("hex");
  process.env.DEMO_ADMIN_PASSWORD = password;
  const crear = t.mock.fn(async () => ({}));
  await sembrarUsuarios({
    roles: { findUnique: async () => ({ id_rol: "1" }) },
    usuarios: {
      findUnique: async ({ where }) =>
        where.nombre_usuario === "admin.demo" ? null : { id_usuario: "2" },
      create: crear,
    },
  });
  assert.equal(crear.mock.callCount(), 1);
  const datos = crear.mock.calls[0].arguments[0].data;
  assert.ok(!Object.hasOwn(datos, "password"));
  assert.notEqual(datos.password_hash, password);
  assert.equal(await bcrypt.compare(password, datos.password_hash), true);
});
