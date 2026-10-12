import Grupo from '../models/Grupos.js';
import Usuario from '../models/Usuario.js';
import { extractStoredFilename, toPublicUploadUrl } from "../utils/mediaUrl.js";
import { mergeTags } from "../utils/interests.js";

const mapCommentMedia = (req, comment = {}) => ({
    ...comment,
    autorFoto: toPublicUploadUrl(req, "avatars", comment.autorFoto),
});

const mapPostMedia = (req, post = {}) => ({
    ...post,
    autorFoto: toPublicUploadUrl(req, "avatars", post.autorFoto),
    comentarios: (post.comentarios || []).map((comment) => mapCommentMedia(req, comment)),
});

const mapGroupMedia = (req, grupo = {}) => ({
    ...grupo,
    posts: (grupo.posts || []).map((post) => mapPostMedia(req, post)),
});

// Listar grupos
export const listarGrupos = async (req, res) => {
    try {
        const grupos = await Grupo.find().sort({ createdAt: -1 });
        res.json(grupos.map((grupo) => mapGroupMedia(req, grupo.toObject())));
    } catch (error) {
        res.status(500).json({ message: "Error al listar grupos" });
    }
};

// Crear grupo
export const crearGrupo = async (req, res) => {
    try {
        const correoUsuario = req.usuario?.correoInstitucional;
        if (!correoUsuario) {
            return res.status(401).json({ message: "No autenticado" });
        }

        const nombre = String(req.body?.nombre || "").trim();
        const descripcion = String(req.body?.descripcion || "").trim().slice(0, 400);
        if (!nombre) {
            return res.status(400).json({ message: "El nombre del grupo es obligatorio" });
        }

        const nuevoGrupo = new Grupo({
            nombre,
            imagen: req.body?.imagen || "",
            descripcion,
            tags: mergeTags(req.body?.tags, nombre, descripcion),
            creadorEmail: correoUsuario,
            miembrosArray: [correoUsuario],
        });

        const grupoGuardado = await nuevoGrupo.save();
        res.status(201).json(mapGroupMedia(req, grupoGuardado.toObject()));
    } catch (error) {
        res.status(400).json({ message: "Error al crear el grupo" });
    }
};

// Unirse a un grupo
export const unirseGrupo = async (req, res) => {
    try {
        const correo = req.usuario?.correoInstitucional;
        if (!correo) {
            return res.status(401).json({ message: "No autenticado" });
        }

        const grupo = await Grupo.findById(req.params.id);
        if (!grupo) return res.status(404).json({ message: "Grupo no encontrado" });

        if (!grupo.miembrosArray.includes(correo)) {
            grupo.miembrosArray.push(correo);
            await grupo.save();
        }
        res.json({ message: "Unido con exito", grupo: mapGroupMedia(req, grupo.toObject()) });
    } catch (error) {
        res.status(400).json({ message: "Error al unirse" });
    }
};

// Abandonar grupo
export const abandonarGrupo = async (req, res) => {
    try {
        const correo = req.usuario?.correoInstitucional;
        if (!correo) {
            return res.status(401).json({ message: "No autenticado" });
        }

        const grupo = await Grupo.findById(req.params.id);
        if (!grupo) return res.status(404).json({ message: "Grupo no encontrado" });

        grupo.miembrosArray = grupo.miembrosArray.filter((m) => m !== correo);
        await grupo.save();
        res.json({ message: "Has abandonado el grupo" });
    } catch (error) {
        res.status(400).json({ message: "Error al abandonar" });
    }
};

const esMiembroDelGrupo = (grupo, correo, rol) =>
    rol === "administrador" || grupo.creadorEmail === correo || (grupo.miembrosArray || []).includes(correo);

export const listarMiembros = async (req, res) => {
    try {
        const grupo = await Grupo.findById(req.params.id);
        if (!grupo) return res.status(404).json({ message: "Grupo no encontrado" });

        const usuarios = await Usuario.find({
            correoInstitucional: { $in: grupo.miembrosArray || [] },
        }).select("_id nombre avatar correoInstitucional universidad carrera");

        const porCorreo = new Map(
            usuarios.map((user) => [user.correoInstitucional, {
                _id: user._id,
                nombre: user.nombre,
                avatar: toPublicUploadUrl(req, "avatars", user.avatar),
                correoInstitucional: user.correoInstitucional,
                universidad: user.universidad,
                carrera: user.carrera,
            }])
        );

        const miembros = (grupo.miembrosArray || []).map((correo) =>
            porCorreo.get(correo) || {
                _id: correo,
                nombre: correo.split("@")[0],
                avatar: "",
                correoInstitucional: correo,
                universidad: "",
                carrera: "",
            }
        );

        res.json(miembros);
    } catch (error) {
        res.status(400).json({ message: "Error al listar miembros" });
    }
};

export const invitarMiembro = async (req, res) => {
    try {
        const correoInvitador = req.usuario?.correoInstitucional;
        if (!correoInvitador) {
            return res.status(401).json({ message: "No autenticado" });
        }

        const grupo = await Grupo.findById(req.params.id);
        if (!grupo) return res.status(404).json({ message: "Grupo no encontrado" });

        if (!esMiembroDelGrupo(grupo, correoInvitador, req.usuario?.rol)) {
            return res.status(403).json({ message: "Solo los miembros pueden invitar." });
        }

        const { userId, correo } = req.body || {};
        let email = typeof correo === "string" ? correo.trim().toLowerCase() : "";

        if (userId) {
            const usuario = await Usuario.findById(userId);
            if (!usuario?.correoInstitucional) {
                return res.status(404).json({ message: "Usuario no encontrado" });
            }
            email = usuario.correoInstitucional;

            if (grupo.miembrosArray.includes(email)) {
                return res.status(400).json({ message: "Esa persona ya es miembro del grupo." });
            }

            const alreadyInvited = (usuario.grupoInvitaciones || []).some(
                (item) => item.grupo?.toString() === grupo._id.toString()
            );
            if (alreadyInvited) {
                return res.status(400).json({ message: "Ya tiene una invitación pendiente." });
            }

            usuario.grupoInvitaciones = [
                ...(usuario.grupoInvitaciones || []),
                { grupo: grupo._id, fromUser: req.usuario._id, createdAt: new Date() },
            ];
            await usuario.save();
            return res.json({ message: `Invitación enviada a ${usuario.nombre}.` });
        }

        if (!email) {
            return res.status(400).json({ message: "Selecciona un usuario para invitar." });
        }

        if (grupo.miembrosArray.includes(email)) {
            return res.status(400).json({ message: "Esa persona ya es miembro del grupo." });
        }

        const usuarioPorCorreo = await Usuario.findOne({ correoInstitucional: email });
        if (!usuarioPorCorreo) {
            return res.status(404).json({ message: "Usuario no encontrado" });
        }
        const alreadyInvited = (usuarioPorCorreo.grupoInvitaciones || []).some(
            (item) => item.grupo?.toString() === grupo._id.toString()
        );
        if (alreadyInvited) {
            return res.status(400).json({ message: "Ya tiene una invitación pendiente." });
        }
        usuarioPorCorreo.grupoInvitaciones = [
            ...(usuarioPorCorreo.grupoInvitaciones || []),
            { grupo: grupo._id, fromUser: req.usuario._id, createdAt: new Date() },
        ];
        await usuarioPorCorreo.save();
        res.json({ message: `Invitación enviada a ${usuarioPorCorreo.nombre}.` });
    } catch (error) {
        res.status(400).json({ message: "Error al invitar" });
    }
};

export const listarInvitacionesGrupo = async (req, res) => {
    try {
        const me = await Usuario.findById(req.usuario._id)
            .select("grupoInvitaciones")
            .populate("grupoInvitaciones.grupo", "nombre imagen descripcion miembrosArray tags")
            .populate("grupoInvitaciones.fromUser", "nombre avatar")
            .lean();

        const items = (me?.grupoInvitaciones || [])
            .filter((item) => item.grupo?._id)
            .map((item) => {
                const grupo = mapGroupMedia(req, item.grupo);
                const fromUser = item.fromUser
                    ? {
                        _id: item.fromUser._id,
                        nombre: item.fromUser.nombre,
                        avatar: toPublicUploadUrl(req, "avatars", item.fromUser.avatar),
                    }
                    : null;
                return {
                    _id: `ginv-${grupo._id}`,
                    type: "group_invite",
                    grupo,
                    fromUser,
                    message: `${fromUser?.nombre || "Alguien"} te invitó al grupo ${grupo.nombre}`,
                    createdAt: item.createdAt || new Date(),
                };
            });

        res.json(items);
    } catch {
        res.status(500).json({ message: "Error al listar invitaciones" });
    }
};

export const responderInvitacionGrupo = async (req, res) => {
    try {
        const { grupoId } = req.params;
        const action = String(req.body?.action || "").toLowerCase();
        const correo = req.usuario?.correoInstitucional;
        if (!correo) return res.status(401).json({ message: "No autenticado" });
        if (!["accept", "reject"].includes(action)) {
            return res.status(400).json({ message: "Acción inválida." });
        }

        const me = await Usuario.findById(req.usuario._id);
        if (!me) return res.status(404).json({ message: "Usuario no encontrado" });

        const tieneInvitacion = (me.grupoInvitaciones || []).some(
            (item) => item.grupo?.toString() === String(grupoId)
        );
        if (!tieneInvitacion) {
            return res.status(404).json({ message: "No tienes una invitación pendiente." });
        }

        if (action === "accept") {
            const grupo = await Grupo.findById(grupoId);
            if (!grupo) {
                me.grupoInvitaciones = (me.grupoInvitaciones || []).filter(
                    (item) => item.grupo?.toString() !== String(grupoId)
                );
                await me.save();
                return res.status(404).json({ message: "El grupo ya no existe." });
            }
            if (!grupo.miembrosArray.includes(correo)) {
                grupo.miembrosArray.push(correo);
                await grupo.save();
            }
        }

        me.grupoInvitaciones = (me.grupoInvitaciones || []).filter(
            (item) => item.grupo?.toString() !== String(grupoId)
        );
        await me.save();
        res.json({
            message: action === "accept" ? "Te uniste al grupo." : "Invitación rechazada.",
        });
    } catch {
        res.status(400).json({ message: "Error al responder la invitación" });
    }
};

// Eliminar grupo
export const eliminarGrupo = async (req, res) => {
    try {
        const grupo = await Grupo.findById(req.params.id);
        if (!grupo) return res.status(404).json({ message: "Grupo no encontrado" });

        const correo = req.usuario?.correoInstitucional;
        const rol = req.usuario?.rol;
        const puedeEliminar = rol === "administrador" || grupo.creadorEmail === correo;

        if (!puedeEliminar) {
            return res.status(403).json({ message: "No tienes permisos para eliminar este grupo" });
        }

        await grupo.deleteOne();
        res.json({ message: "Grupo eliminado" });
    } catch (error) {
        res.status(400).json({ message: "Error al eliminar" });
    }
};

// Publicar un post
export const crearPost = async (req, res) => {
    try {
        const { contenido, foto } = req.body;
        const grupo = await Grupo.findById(req.params.id);
        if (!grupo) return res.status(404).json({ message: "Grupo no encontrado" });

        const autor = req.usuario?.nombre || "Usuario";
        const autorFoto = extractStoredFilename(req.usuario?.avatar || "");
        const autorEmail = req.usuario?.correoInstitucional || "";

        const nuevoPost = {
            autor,
            autorFoto,
            autorEmail,
            contenido,
            foto,
        };

        grupo.posts.unshift(nuevoPost);
        await grupo.save();

        res.status(201).json(mapPostMedia(req, grupo.posts[0].toObject()));
    } catch (error) {
        res.status(400).json({ message: "Error al publicar post" });
    }
};

// Comentar un post
export const comentarPost = async (req, res) => {
    try {
        const { id, postId } = req.params;
        const { contenido } = req.body;

        const autor = req.usuario?.nombre || "Usuario";
        const autorFoto = extractStoredFilename(req.usuario?.avatar || "");
        const autorEmail = req.usuario?.correoInstitucional || "";

        const grupo = await Grupo.findById(id);
        if (!grupo) return res.status(404).json({ message: "Grupo no encontrado" });

        const post = grupo.posts.id(postId);
        if (!post) return res.status(404).json({ message: "Post no encontrado" });

        const nuevoComentario = {
            autor,
            autorFoto,
            autorEmail,
            contenido,
            fecha: new Date(),
        };

        post.comentarios.push(nuevoComentario);
        await grupo.save();

        res.status(201).json(mapCommentMedia(req, post.comentarios[post.comentarios.length - 1].toObject()));
    } catch (error) {
        console.error(error);
        res.status(400).json({ message: "Error al agregar comentario" });
    }
};

// Eliminar un post
export const eliminarPost = async (req, res) => {
    try {
        const { id, postId } = req.params;
        const grupo = await Grupo.findById(id);
        if (!grupo) return res.status(404).json({ message: "Grupo no encontrado" });

        const post = grupo.posts.id(postId);
        if (!post) return res.status(404).json({ message: "Post no encontrado" });

        const correo = req.usuario?.correoInstitucional || "";
        const rol = req.usuario?.rol || "";
        const esAdminGlobal = rol === "administrador";
        const puedeEliminar = post.autorEmail === correo || grupo.creadorEmail === correo || esAdminGlobal;

        if (!puedeEliminar) {
            return res.status(403).json({ message: "No tienes permisos para eliminar este post" });
        }

        post.deleteOne();
        await grupo.save();
        res.json({ message: "Post eliminado", postId });
    } catch (error) {
        res.status(400).json({ message: "Error al eliminar post" });
    }
};

// Eliminar un comentario
export const eliminarComentario = async (req, res) => {
    try {
        const { id, postId, comentarioId } = req.params;
        const grupo = await Grupo.findById(id);
        if (!grupo) return res.status(404).json({ message: "Grupo no encontrado" });

        const post = grupo.posts.id(postId);
        if (!post) return res.status(404).json({ message: "Post no encontrado" });

        const comentario = post.comentarios.id(comentarioId);
        if (!comentario) return res.status(404).json({ message: "Comentario no encontrado" });

        const correo = req.usuario?.correoInstitucional || "";
        const rol = req.usuario?.rol || "";
        const esAdminGlobal = rol === "administrador";
        const puedeEliminar =
            comentario.autorEmail === correo ||
            post.autorEmail === correo ||
            grupo.creadorEmail === correo ||
            esAdminGlobal;

        if (!puedeEliminar) {
            return res.status(403).json({ message: "No tienes permisos para eliminar este comentario" });
        }

        comentario.deleteOne();
        await grupo.save();
        res.json({ message: "Comentario eliminado", comentarioId });
    } catch (error) {
        res.status(400).json({ message: "Error al eliminar comentario" });
    }
};
