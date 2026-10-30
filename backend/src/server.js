import "dotenv/config";
import app from "./app.js";
import prisma from "./config/prisma.js";

const PORT = process.env.PORT || 3000;

const server = app.listen(PORT, () => {
    console.log(`MediCore API ejecutándose en http://localhost:${PORT}`);
});

const shutdown = async () => {
    console.log("Cerrando servidor...");

    server.close(async () => {
        await prisma.$disconnect();
        process.exit(0);
    });
};

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
