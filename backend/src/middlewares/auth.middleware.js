import jwt from "jsonwebtoken";
import { obtenerUsuarioPorId } from "../services/auth.service.js";

export const autenticar = async (req, res, next) => {
    try {
        const authorization = req.headers.authorization;

        if (!authorization?.startsWith("Bearer ")) {
            return res.status(401).json({
                message: "Token de autenticación requerido"
            });
        }

        const token = authorization.slice(7);

        if (!token || !process.env.JWT_SECRET) {
            return res.status(401).json({
                message: "Token inválido"
            });
        }

        const payload = jwt.verify(
            token,
            process.env.JWT_SECRET,
            { algorithms: ["HS256"] }
        );

        if (
            typeof payload !== "object" ||
            !payload.sub ||
            !/^[0-9]+$/.test(payload.sub)
        ) {
            return res.status(401).json({
                message: "Token inválido"
            });
        }

        const usuario = await obtenerUsuarioPorId(payload.sub);

        if (!usuario || !usuario.activo || !usuario.roles.activo) {
            return res.status(401).json({
                message: "Usuario no autorizado"
            });
        }

        if (
            usuario.roles.nombre === "MEDICO" &&
            (!usuario.medicos || !usuario.medicos.activo)
        ) {
            return res.status(403).json({
                message: "Perfil médico deshabilitado"
            });
        }

        req.usuario = usuario;
        next();

    } catch (error) {
        if (error instanceof jwt.JsonWebTokenError) {
            return res.status(401).json({
                message: "Token inválido o expirado"
            });
        }

        console.error("Error de autenticación:", error);

        return res.status(500).json({
            message: "Error interno del servidor"
        });
    }
};
