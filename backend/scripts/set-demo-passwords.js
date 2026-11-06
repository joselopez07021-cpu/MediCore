import "dotenv/config";
import bcrypt from "bcrypt";
import prisma from "../src/config/prisma.js";

const usuariosDemo = [
    { nombre_usuario: "admin.demo", password: "Admin123!" },
    { nombre_usuario: "recepcion.demo", password: "Recepcion123!" },
    { nombre_usuario: "elena.soto", password: "Medico123!" },
    { nombre_usuario: "david.chen", password: "Medico123!" },
    { nombre_usuario: "inventario.demo", password: "Inventario123!" }
];

async function main() {
    for (const usuario of usuariosDemo) {
        const hash = await bcrypt.hash(usuario.password, 12);

        await prisma.usuarios.update({
            where: {
                nombre_usuario: usuario.nombre_usuario
            },
            data: {
                password_hash: hash
            }
        });

        console.log(`Contraseña actualizada: ${usuario.nombre_usuario}`);
    }

    console.log("Contraseñas de desarrollo configuradas correctamente.");
}

main()
    .catch((error) => {
        console.error("Error al configurar contraseñas:", error);
        process.exitCode = 1;
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
