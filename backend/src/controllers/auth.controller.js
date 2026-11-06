import {
    iniciarSesion,
    usuarioPublico
} from "../services/auth.service.js";

export const login = async (req, res) => {
    try {
        const { nombre_usuario, password } = req.body ?? {};

        if (
            typeof nombre_usuario !== "string" ||
            typeof password !== "string" ||
            !nombre_usuario.trim() ||
            !password
        ) {
            return res.status(400).json({
                message: "Nombre de usuario y contraseña son obligatorios"
            });
        }

        const resultado = await iniciarSesion(
            nombre_usuario.trim(),
            password
        );

        if (!resultado) {
            return res.status(401).json({
                message: "Credenciales inválidas o cuenta deshabilitada"
            });
        }

        return res.status(200).json({
            message: "Inicio de sesión exitoso",
            data: resultado
        });

    } catch (error) {
        console.error("Error en login:", error);

        return res.status(500).json({
            message: "Error interno del servidor"
        });
    }
};

export const me = (req, res) => {
    return res.status(200).json({
        message: "Usuario autenticado",
        data: usuarioPublico(req.usuario)
    });
};
