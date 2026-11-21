// prisma/seeds/demo/pacientes.seed.js

const nombres = [
  "María", "José", "Ana", "Luis", "Sofía",
  "Carlos", "Valeria", "Daniel", "Camila", "Andrés",
  "Lucía", "Diego", "Isabella", "Mateo", "Gabriela",
  "Fernando", "Paula", "Sebastián", "Natalia", "Javier",
];

const apellidos = [
  "Rodríguez", "González", "Vargas", "Mora",
  "Jiménez", "Castro", "Rojas", "Salazar",
  "Hernández", "Ramírez", "Sánchez", "Solano",
];

export async function sembrarPacientes(prisma) {
  const totalPacientes = 120;

  for (let i = 1; i <= totalPacientes; i++) {
    const nombre = nombres[(i - 1) % nombres.length];
    const apellido1 = apellidos[(i - 1) % apellidos.length];
    const apellido2 = apellidos[(i + 3) % apellidos.length];

    const identificacion = `PAC-DEMO-${String(i).padStart(4, "0")}`;

    const anio = 1950 + ((i * 7) % 65);
    const mes = (i * 3) % 12;
    const dia = 1 + ((i * 11) % 28);

    await prisma.pacientes.upsert({
      where: { identificacion },
      update: {},
      create: {
        identificacion,
        nombre,
        apellido: `${apellido1} ${apellido2}`,
        fecha_nacimiento: new Date(Date.UTC(anio, mes, dia)),
        telefono: `8888-${String(i).padStart(4, "0")}`,
        correo: `paciente${i}@medicore.test`,
        direccion: `Dirección ficticia ${i}, Costa Rica`,
        activo: true,
      },
    });
  }

  console.log(`Pacientes verificados: ${totalPacientes}`);
}
