import { Router } from "express";
export const asistenteRoutes = Router();
// Ayuda determinista de navegación, disponible también antes del login.
// No consulta datos hospitalarios, no guarda conversaciones y no llama a un modelo de IA.
asistenteRoutes.post("/", (req, res) => {
  const mensaje = req.body?.message;
  if (typeof mensaje !== "string" || !mensaje.trim() || mensaje.length > 1000) {
    return res
      .status(400)
      .json({ message: "Escribe una pregunta de entre 1 y 1000 caracteres." });
  }
  const texto = mensaje
    .toLocaleLowerCase("es")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
  let respuesta =
    "Puedo orientarte sobre pacientes, citas, agenda, atenciones, inventario, reportes y acceso. Indica qué pantalla necesitas encontrar.";
  if (/cita|agenda/.test(texto))
    respuesta =
      "En Admisión encontrarás Citas para programar, editar, confirmar o cancelar. En Agenda médica puedes consultar por fecha. Cada médico ve únicamente su agenda.";
  else if (/paciente/.test(texto))
    respuesta =
      "En Admisión → Pacientes puedes buscar, registrar, editar y activar o desactivar pacientes. Necesitas un perfil de Admisión o Administrador.";
  else if (/inventario|insumo|stock/.test(texto))
    respuesta =
      "En Inventario → Insumos consulta las existencias. Para aumentarlas o reducirlas usa Movimientos. Las atenciones descuentan sus consumos automáticamente. Necesitas Inventario o Administrador.";
  else if (/atencion|servicio/.test(texto))
    respuesta =
      "En Servicios → Atenciones selecciona una cita pendiente y registra diagnóstico, servicios e insumos. Solo el médico asignado o un administrador puede registrar la atención.";
  else if (/reporte|power bi|powerbi/.test(texto))
    respuesta =
      "En Reportes puedes aplicar fechas y médico, consultar indicadores y exportar CSV. El acceso es de Administrador. La pestaña Power BI necesita el enlace del informe publicado por el equipo.";
  else if (/sesion|acceso|entrar|clave|contrasena/.test(texto))
    respuesta =
      "En Acceso introduce el usuario y la contraseña asignados por el equipo. El servidor determina tu rol. Para cambiar de cuenta utiliza Salir. Si no recuerdas tu contraseña, contacta al administrador.";
  return res.json({ message: respuesta });
});
