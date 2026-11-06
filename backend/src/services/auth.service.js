import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import prisma from "../config/prisma.js";

const usuarioSelect = {
    id_usuario: true,
    nombre_usuario: true,
    correo: true,
    password_hash: true,
    nombre_completo: true,
    activo: true,
    roles: {
        select: {
            nombre: true,
            activo: true
        }
    },
    medicos: {
        select: {
            id_medico: true,
            activo: true
        }
    }
};

export const obtenerUsuarioPorId = async (idUsuario) => {
    return prisma.usuarios.findUnique({
        where: {
            id_usuario: BigInt(idUsuario)
        },
        select: usuarioSelect
    });
};

export const usuarioPublico = (usuario) => ({
    id_usuario: usuario.id_usuario.toString(),
    nombre_usuario: usuario.nombre_usuario,
    correo: usuario.correo,
    nombre_completo: usuario.nombre_completo,
    rol: usuario.roles.nombre,
    id_medico: usuario.medicos?.id_medico.toString() ?? null
});

export const iniciarSesion = async (nombreUsuario, password) => {
    const usuario = await prisma.usuarios.findUnique({
        where: {
            nombre_usuario: nombreUsuario
        },
        select: usuarioSelect
    });

    if (!usuario || !usuario.activo || !usuario.roles.activo) {
        return null;
    }

    const passwordValido = await bcrypt.compare(
        password,
        usuario.password_hash
    );

    if (!passwordValido) {
        return null;
    }

    if (usuario.roles.nombre === "MEDICO" &&
        (!usuario.medicos || !usuario.medicos.activo)) {
        return null;
    }

    if (!process.env.JWT_SECRET) {
        throw new Error("JWT_SECRET no está configurado");
    }

    const token = jwt.sign(
        {},
        process.env.JWT_SECRET,
        {
            subject: usuario.id_usuario.toString(),
            expiresIn: process.env.JWT_EXPIRES_IN || "1h",
            algorithm: "HS256"
        }
    );

    return {
        token,
        token_type: "Bearer",
        usuario: usuarioPublico(usuario)
    };
};
