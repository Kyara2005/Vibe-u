import express from "express";
import Usuario from "../models/Usuario.js";
import jwt from "jsonwebtoken";
import { sendMailToRegister, sendMailToRecoveryPassword } from "../config/nodemailer.js";
import bcrypt from "bcryptjs";
import { verificarTokenJWT } from "../middlewares/JWT.js";
import { getModerationNotifications } from "../controllers/posts.controller.js";
import { perfil, actualizarUsuario, actualizarPassword } 
from "../controllers/usuario_controller.js";
import {
    listMatchCandidates,
    searchUsers,
    getPublicProfile,
    sendFriendRequest,
    respondFriendRequest,
    removeFriend,
    cancelFriendRequest,
    getFriendRequestNotifications,
    sendMatchLike,
    rejectMatchCandidate,
    getMatchNotifications,
    listInvitePeople
} from "../controllers/friend_controller.js";
import fetch from "node-fetch";
import { toPublicUploadUrl } from "../utils/mediaUrl.js";

const router = express.Router();
const FRASE_CACHE_MS = 10 * 60 * 1000;
let fraseCache = { value: null, expiresAt: 0 };
const FRASES_FALLBACK_ES = [
    { q: "La educación es el arma más poderosa que puedes usar para cambiar el mundo.", a: "Nelson Mandela" },
    { q: "La vida es aquello que te va sucediendo mientras te empeñas en hacer otros planes.", a: "John Lennon" },
    { q: "No hay caminos para la paz; la paz es el camino.", a: "Mahatma Gandhi" },
    { q: "El que tiene un porqué para vivir puede soportar casi cualquier cómo.", a: "Friedrich Nietzsche" },
    { q: "Nunca consideres el estudio como una obligación, sino como una oportunidad para penetrar en el bello y maravilloso mundo del saber.", a: "Albert Einstein" },
    { q: "La suerte favorece a la mente preparada.", a: "Louis Pasteur" },
    { q: "El éxito es la suma de pequeños esfuerzos repetidos día tras día.", a: "Robert Collier" },
    { q: "La imaginación es más importante que el conocimiento.", a: "Albert Einstein" }
];

const getRandomFallback = () =>
    FRASES_FALLBACK_ES[Math.floor(Math.random() * FRASES_FALLBACK_ES.length)];

const fetchJsonWithTimeout = async (url, timeoutMs = 4000) => {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
        const response = await fetch(url, { signal: controller.signal });
        if (!response.ok) return null;
        return await response.json();
    } catch {
        return null;
    } finally {
        clearTimeout(timer);
    }
};

const stripQuoteMarkup = (text = "") =>
    String(text)
        .replace(/<[^>]*>/g, " ")
        .replace(/&nbsp;/gi, " ")
        .replace(/&quot;/gi, '"')
        .replace(/&#39;|&apos;/gi, "'")
        .replace(/&amp;/gi, "&")
        .replace(/\s+/g, " ")
        .trim();

const looksLikeMarkup = (text = "") => /<\s*(g|svg|path|div|span)\b/i.test(text);

const translateToSpanish = async (text) => {
    if (!text) return null;
    const url = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(text)}&langpair=en|es`;
    const data = await fetchJsonWithTimeout(url, 4500);
    const translated = data?.responseData?.translatedText;
    if (!translated || typeof translated !== "string") return null;
    const clean = stripQuoteMarkup(translated);
    if (!clean || looksLikeMarkup(translated) || looksLikeMarkup(clean)) return null;
    return clean;
};

const BLACKLISTED_DOMAINS = [
    "hotmail.com", "outlook.com", "yahoo.com",
    "aol.com", "live.com", "icloud.com", "mail.com", "gmail.com"
];

const domainCheck = (req, res, next) => {
    const { correoInstitucional } = req.body;
    if (correoInstitucional) {
        const dominio = correoInstitucional.split("@")[1];
        if (BLACKLISTED_DOMAINS.includes(dominio)) {
            console.log(`❌ Correo rechazado por restricción: ${correoInstitucional}`);
            return res.status(400).json({
                msg: "Solo se permiten correos institucionales o académicos."
            });
        }
    }
    next();
};

/* ---------------------------------------------------
   🟣 REGISTRO
---------------------------------------------------- */
router.post("/register", domainCheck, async (req, res) => {
    try {
        const { nombre, correoInstitucional, password } = req.body;

        if (!nombre || !correoInstitucional || !password) {
            return res.status(400).json({ msg: "Todos los campos son obligatorios" });
        }

        const usuarioExistente = await Usuario.findOne({ correoInstitucional });
        if (usuarioExistente) {
            return res.status(400).json({ msg: "El correo ya está registrado" });
        }

        const hashedPassword = await bcrypt.hash(password, 10);
        const nuevoUsuario = new Usuario({
            nombre,
            correoInstitucional,
            password: hashedPassword,
            rol: "estudiante"
        });

        const token = jwt.sign(
            { id: nuevoUsuario._id },
            process.env.JWT_SECRET,
            { expiresIn: "1h" }
        );

        nuevoUsuario.token = token;
        await nuevoUsuario.save();

        void sendMailToRegister(correoInstitucional, token);

        res.status(201).json({
            msg: "Usuario registrado correctamente. Revisa tu correo para confirmar tu cuenta."
        });
    } catch (error) {
        console.error("ERROR EN REGISTER:", error);
        res.status(500).json({ msg: "Error del servidor", error: error.message });
    }
});

/* ---------------------------------------------------
   🟣 CONFIRMAR CUENTA
---------------------------------------------------- */
router.get("/confirmar/:token", async (req, res) => {
  try {
    const { token } = req.params;

    const usuario = await Usuario.findOne({ token });

    if (!usuario) {
      return res.status(400).json({ msg: "Token inválido o expirado" });
    }

    usuario.token = null;
    usuario.confirmEmail = true;
    await usuario.save();

    res.json({ msg: "Cuenta confirmada correctamente" });

  } catch (error) {
    console.error("ERROR EN CONFIRMAR:", error);
    res.status(500).json({ msg: "Error del servidor" });
  }
});

/* ---------------------------------------------------
   REENVIAR CONFIRMACION
---------------------------------------------------- */
router.post("/reenviar-confirmacion", async (req, res) => {
    try {
        const { correoInstitucional } = req.body;

        if (!correoInstitucional) {
            return res.status(400).json({ msg: "El correo es obligatorio" });
        }

        const usuario = await Usuario.findOne({ correoInstitucional });
        if (!usuario) {
            return res.status(404).json({ msg: "Usuario no encontrado" });
        }

        if (usuario.confirmEmail) {
            return res.status(400).json({ msg: "La cuenta ya esta confirmada" });
        }

        const token = jwt.sign(
            { id: usuario._id },
            process.env.JWT_SECRET,
            { expiresIn: "1h" }
        );

        usuario.token = token;
        await usuario.save();

        void sendMailToRegister(correoInstitucional, token);

        res.json({ msg: "Correo de confirmacion reenviado correctamente" });
    } catch (error) {
        console.error("ERROR REENVIAR CONFIRMACION:", error);
        res.status(500).json({ msg: "Error del servidor" });
    }
});

/* ---------------------------------------------------
   🟣 LOGIN
---------------------------------------------------- */
router.post("/login", async (req, res) => {
    try {
        const { correoInstitucional, password } = req.body;

        if (!correoInstitucional || !password) {
            return res.status(400).json({ msg: "Todos los campos son obligatorios" });
        }

        const usuario = await Usuario.findOne({ correoInstitucional });
        if (!usuario)
            return res.status(400).json({ msg: "Usuario no encontrado" });

        const isMatch = await bcrypt.compare(password, usuario.password);
        if (!isMatch)
            return res.status(400).json({ msg: "Contraseña incorrecta" });

        if (!usuario.confirmEmail) {
            return res.status(400).json({
                msg: "Debes confirmar tu cuenta por correo antes de iniciar sesión."
            });
        }

        const token = jwt.sign(
            { id: usuario._id },
            process.env.JWT_SECRET,
            { expiresIn: "1h" }
        );

        res.json({
            token,
            nombre: usuario.nombre,
            correoInstitucional: usuario.correoInstitucional,
            rol: usuario.rol,
            fotoPerfil: toPublicUploadUrl(req, "avatars", usuario.avatar) || null
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ msg: "Error del servidor" });
    }
});

/* ---------------------------------------------------
   🟣 FORGOT PASSWORD (ENVIAR CORREO)
---------------------------------------------------- */
router.post("/olvide-password", async (req, res) => {
    try {
        const { correoInstitucional } = req.body;

        if (!correoInstitucional) {
            return res.status(400).json({ msg: "El correo es obligatorio" });
        }

        const usuario = await Usuario.findOne({ correoInstitucional });
        if (!usuario) {
            return res.status(400).json({ msg: "El correo no está registrado" });
        }

        const resetToken = jwt.sign(
            { id: usuario._id },
            process.env.JWT_SECRET,
            { expiresIn: "15m" }
        );

        usuario.resetToken = resetToken;
        usuario.resetTokenExpire = Date.now() + 15 * 60 * 1000;
        await usuario.save();

        void sendMailToRecoveryPassword(correoInstitucional, resetToken);

        res.json({ msg: "Hemos enviado un enlace para restablecer tu contraseña." });

    } catch (error) {
        console.error("ERROR EN FORGOT PASSWORD:", error);
        res.status(500).json({ msg: "Error del servidor" });
    }
});

/* ---------------------------------------------------
   🟣 RESET PASSWORD (GUARDAR NUEVA CONTRASEÑA)
---------------------------------------------------- */
router.post("/reset-password/:token", async (req, res) => {
    try {
        const { token } = req.params;
        const { password } = req.body;

        if (!password) {
            return res.status(400).json({ msg: "La nueva contraseña es obligatoria" });
        }

        const usuario = await Usuario.findOne({
            resetToken: token,
            resetTokenExpire: { $gt: Date.now() }
        });

        if (!usuario) {
            return res.status(400).json({ msg: "Token inválido o expirado." });
        }

        const hashedPassword = await bcrypt.hash(password, 10);

        usuario.password = hashedPassword;
        usuario.resetToken = null;
        usuario.resetTokenExpire = null;

        await usuario.save();

        res.json({ msg: "Contraseña restablecida correctamente." });

    } catch (error) {
        console.error("ERROR EN RESET PASSWORD:", error);
        res.status(500).json({ msg: "Error del servidor" });
    }
});

/* ---------------------------------------------------
   🟣 FRASE MOTIVADORA
---------------------------------------------------- */
router.get("/frase", async (req, res) => {
    try {
        if (fraseCache.value && Date.now() < fraseCache.expiresAt) {
            const cachedQuote = stripQuoteMarkup(fraseCache.value?.q || "");
            if (cachedQuote && !looksLikeMarkup(fraseCache.value?.q || "") && !looksLikeMarkup(cachedQuote)) {
                return res.json({
                    q: cachedQuote,
                    a: stripQuoteMarkup(fraseCache.value?.a || "") || "Autor desconocido",
                });
            }
            fraseCache = { value: null, expiresAt: 0 };
        }

        const zenData = await fetchJsonWithTimeout("https://zenquotes.io/api/random", 4000);
        const quote = Array.isArray(zenData) ? zenData[0] : null;
        const rawQuote = stripQuoteMarkup(typeof quote?.q === "string" ? quote.q : "");
        const author = stripQuoteMarkup(typeof quote?.a === "string" ? quote.a : "") || "Autor desconocido";

        let payload = null;
        if (rawQuote && !looksLikeMarkup(rawQuote)) {
            const translated = await translateToSpanish(rawQuote);
            payload = { q: translated || rawQuote, a: author };
        }

        if (!payload) {
            payload = getRandomFallback();
        }

        fraseCache = {
            value: payload,
            expiresAt: Date.now() + FRASE_CACHE_MS,
        };
        res.json(payload);

    } catch (error) {
        console.error("ERROR FRASE:", error);
        const payload = fraseCache.value || getRandomFallback();
        res.json(payload);
    }
});

router.get("/perfil", verificarTokenJWT, perfil);
router.put("/actualizar-perfil", verificarTokenJWT, actualizarUsuario);
router.put("/actualizar-password", verificarTokenJWT, actualizarPassword);
router.get("/buscar", verificarTokenJWT, searchUsers);
router.get("/match/candidatos", verificarTokenJWT, listMatchCandidates);
router.post("/match/like", verificarTokenJWT, sendMatchLike);
router.post("/match/reject", verificarTokenJWT, rejectMatchCandidate);
router.get("/match/notificaciones", verificarTokenJWT, getMatchNotifications);
router.get("/invitar-personas", verificarTokenJWT, listInvitePeople);
router.get("/publico/:id", verificarTokenJWT, getPublicProfile);
router.post("/amistad/solicitar", verificarTokenJWT, sendFriendRequest);
router.post("/amistad/responder", verificarTokenJWT, respondFriendRequest);
router.post("/amistad/eliminar", verificarTokenJWT, removeFriend);
router.post("/amistad/cancelar", verificarTokenJWT, cancelFriendRequest);
router.get("/amistad/notificaciones", verificarTokenJWT, getFriendRequestNotifications);
router.get("/moderacion/notificaciones", verificarTokenJWT, getModerationNotifications);

export default router;
