export const autorizar = (...rolesPermitidos) => {
    return (req, res, next) => {
        if (!req.usuario) {
            return res.status(401).json({
                message: "Usuario no autenticado"
            });
        }

        const rolActual = req.usuario.roles.nombre;

        if (!rolesPermitidos.includes(rolActual)) {
            return res.status(403).json({
                message: "No tienes permisos para acceder a este recurso"
            });
        }

        next();
    };
};
