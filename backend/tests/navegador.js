import { chromium } from "playwright-core";
import assert from "node:assert/strict";
import { mkdir } from "node:fs/promises";
import { fileURLToPath } from "node:url";

export async function comprobarNavegador({
  base,
  fecha,
  medico,
  insumo,
  prisma,
}) {
  const browser = await chromium.launch({
    ...(process.env.BROWSER_EXECUTABLE
      ? { executablePath: process.env.BROWSER_EXECUTABLE }
      : { channel: "msedge" }),
    headless: true,
  });
  const errores = [];
  const carpeta = new URL("../../docs/evidencias/", import.meta.url);
  await mkdir(carpeta, { recursive: true });
  const capturar = (page, nombre) =>
    page.screenshot({
      path: fileURLToPath(new URL(nombre, carpeta)),
      fullPage: true,
    });
  try {
    const context = await browser.newContext({
      viewport: { width: 1365, height: 900 },
    });
    // La UI real permanece en 4200; solo las peticiones API se dirigen a la base temporal.
    await context.route("http://localhost:3000/api/**", async (route) => {
      const response = await route.fetch({
        url: route.request().url().replace("http://localhost:3000/api", base),
      });
      await route.fulfill({ response });
    });
    const page = await context.newPage();
    page.on("pageerror", (e) => errores.push(e.message));
    async function login(usuario) {
      await page.goto("http://localhost:4200/login");
      await page.locator('[formcontrolname="username"]').fill(usuario);
      await page
        .locator('[formcontrolname="password"]')
        .fill("Integracion123!");
      await page
        .getByRole("button", { name: "Iniciar sesión", exact: true })
        .click();
      await page.waitForURL("**/inicio");
    }
    async function salir() {
      await page.getByRole("button", { name: "Salir ↗", exact: true }).click();
      await page.waitForURL("**/login");
    }
    await login("admin");
    await page.goto("http://localhost:4200/admision/pacientes");
    const form = page.locator("form");
    for (const [campo, valor] of Object.entries({
      nombre: "Paciente",
      apellido: "Navegador",
      identificacion: "NAVEGADOR-001",
      fecha_nacimiento: "2000-01-01",
      telefono: "88888888",
      correo: "navegador@example.com",
    }))
      await form.locator(`[formcontrolname="${campo}"]`).fill(valor);
    await page
      .getByRole("button", { name: "Guardar paciente", exact: true })
      .click();
    await page
      .getByText("Paciente registrado correctamente", { exact: true })
      .waitFor();
    await page
      .getByRole("textbox", { name: "Buscar pacientes", exact: true })
      .fill("NAVEGADOR-001");
    await page.getByRole("button", { name: "Editar", exact: true }).click();
    await form.locator('[formcontrolname="telefono"]').fill("77777777");
    await page
      .getByRole("button", { name: "Guardar cambios", exact: true })
      .click();
    await page
      .getByText("Paciente actualizado correctamente", { exact: true })
      .waitFor();
    await page.reload();
    await page
      .getByRole("textbox", { name: "Buscar pacientes", exact: true })
      .fill("NAVEGADOR-001");
    await page.getByText("77777777", { exact: true }).waitFor();
    await page.getByRole("button", { name: "Desactivar", exact: true }).click();
    await page.getByRole("button", { name: "Activar", exact: true }).waitFor();
    await page.getByRole("button", { name: "Activar", exact: true }).click();
    await page
      .getByRole("button", { name: "Desactivar", exact: true })
      .waitFor();
    await page.getByRole("button", { name: "Historial", exact: true }).click();
    await page
      .getByText("No hay citas registradas para este paciente.", {
        exact: true,
      })
      .waitFor();
    await page
      .getByRole("button", { name: "Cerrar historial", exact: true })
      .click();
    await capturar(page, "pacientes-desktop.png");
    const paciente = await prisma.pacientes.findUnique({
      where: { identificacion: "NAVEGADOR-001" },
    });
    assert.equal(paciente.telefono, "77777777");
    assert.equal(paciente.activo, true);
    await page.goto("http://localhost:4200/admision/citas");
    await page
      .getByRole("button", { name: "＋ Programar cita", exact: true })
      .click();
    let dialogo = page.getByRole("dialog");
    await dialogo
      .getByLabel(/^Paciente/)
      .selectOption(String(paciente.id_paciente));
    await dialogo.getByLabel(/^Médico/).selectOption(String(medico.id_medico));
    await dialogo.getByLabel(/^Fecha/).fill(fecha);
    await dialogo.getByLabel(/^Hora/).fill("16:00");
    await dialogo.getByLabel(/^Motivo/).fill("Recorrido navegador");
    await dialogo.getByRole("button", { name: "Guardar", exact: true }).click();
    await dialogo.waitFor({ state: "hidden" });
    await page
      .getByRole("textbox", { name: "Buscar citas", exact: true })
      .fill("Recorrido navegador");
    await page.getByRole("button", { name: "Confirmar", exact: true }).click();
    await page
      .locator("tbody")
      .getByText("CONFIRMADA", { exact: true })
      .waitFor();
    await salir();
    await login("medico");
    await page.goto("http://localhost:4200/admision/agenda");
    await page.locator('input[type="date"]').fill(fecha);
    await page
      .locator("article")
      .filter({ hasText: "Recorrido navegador" })
      .getByRole("link", { name: "Registrar atención →", exact: true })
      .click();
    dialogo = page.getByRole("dialog", {
      name: "Documentar atención médica",
      exact: true,
    });
    await dialogo
      .locator('[formcontrolname="diagnostico"]')
      .fill("Prueba de recorrido sintético");
    await dialogo.getByRole("checkbox").first().check();
    await dialogo
      .getByRole("button", { name: "＋ Agregar insumo", exact: true })
      .click();
    await dialogo
      .locator('[formcontrolname="insumoId"]')
      .selectOption(insumo.id_insumo);
    await dialogo.locator('[formcontrolname="cantidad"]').fill("0.25");
    await page.setViewportSize({ width: 390, height: 844 });
    await capturar(page, "atencion-mobile.png");
    await dialogo
      .getByRole("button", { name: "Guardar atención", exact: true })
      .click();
    await dialogo.waitFor({ state: "hidden" });
    const cita = await prisma.citas.findFirst({
      where: { motivo: "Recorrido navegador" },
      include: { atenciones: true },
    });
    assert.equal(cita.estado, "ATENDIDA");
    assert.ok(cita.atenciones);
    assert.equal(
      Number(
        (
          await prisma.insumos.findUnique({
            where: { id_insumo: BigInt(insumo.id_insumo) },
          })
        ).stock_actual,
      ),
      2.5,
    );
    await page
      .getByRole("button", { name: "Cerrar detalle", exact: true })
      .click();
    await page.setViewportSize({ width: 1365, height: 900 });
    await salir();
    await login("inventario");
    await page.goto("http://localhost:4200/inventario/movimientos");
    await page
      .getByRole("textbox", { name: "Buscar movimientos", exact: true })
      .fill("Consumo");
    await page.getByText("0.25", { exact: true }).waitFor();
    await salir();
    await login("admin");
    await page.goto("http://localhost:4200/reportes");
    await page
      .getByRole("button", { name: "Servicios hospitalarios", exact: true })
      .click();
    const descarga = page.waitForEvent("download");
    await page
      .getByRole("button", { name: "Exportar CSV", exact: true })
      .click();
    assert.equal(
      (await descarga).suggestedFilename(),
      "medicore-servicios.csv",
    );
    await capturar(page, "reportes-desktop.png");
    await page.getByRole("button", { name: "Power BI", exact: true }).click();
    await page
      .getByText("El equipo todavía debe publicar el informe", { exact: false })
      .waitFor();
    await page.goto("http://localhost:4200/administracion/usuarios");
    await page
      .locator("tbody")
      .getByText("inventario", { exact: true })
      .first()
      .waitFor();
    await page.reload();
    await page
      .getByRole("heading", { name: "Usuarios y roles", exact: true })
      .waitFor();
    assert.deepEqual(errores, []);
  } finally {
    await browser.close();
  }
}
