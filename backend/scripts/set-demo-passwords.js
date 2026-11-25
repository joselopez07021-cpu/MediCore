import "dotenv/config";
import bcrypt from "bcrypt";
import prisma from "../src/config/prisma.js";

const usuariosDemo = [
    { nombre_usuario: "admin.demo", passwordEnv: "DEMO_ADMIN_PASSWORD" },
    { nombre_usuario: "recepcion.demo", passwordEnv: "DEMO_ADMISION_PASSWORD" },
    { nombre_usuario: "elena.soto", passwordEnv: "DEMO_MEDICO_PASSWORD" },
    { nombre_usuario: "david.chen", passwordEnv: "DEMO_MEDICO_PASSWORD" },
    { nombre_usuario: "inventario.demo", passwordEnv: "DEMO_INVENTARIO_PASSWORD" }
];

async function main() {
    if (process.env.NODE_ENV === "production") {
        throw new Error("El restablecimiento de contraseñas de demo no está permitido en producción.");
    }
    // Validar todo antes de actualizar el primer usuario.
    for (const usuario of usuariosDemo) {
        if (!process.env[usuario.passwordEnv]?.trim()) {
            throw new Error("Configura " + usuario.passwordEnv + " en backend/.env.");
        }
    }
    for (const usuario of usuariosDemo) {
        const hash = await bcrypt.hash(process.env[usuario.passwordEnv], 12);

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
