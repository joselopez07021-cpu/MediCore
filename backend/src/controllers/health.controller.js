import { checkDatabase } from "../services/health.service.js";

export const getHealth = async (req, res) => {
    try {
        const result = await checkDatabase();

        return res.status(200).json({
            status: 200,
            message: "MediCore API funcionando correctamente",
            data: result
        });

    } catch (error) {
        console.error("Health check error:", error);

        return res.status(503).json({
            status: 503,
            message: "No fue posible conectar con la base de datos",
            data: null
        });
    }
};
