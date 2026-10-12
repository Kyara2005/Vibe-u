import Evento from "../models/Evento.js";
import Grupo from "../models/Grupos.js";
import { toPublicUploadUrl } from "../utils/mediaUrl.js";
import {
  carreraToken,
  collectUserTags,
  labelsForTags,
  mergeTags,
  normalizeText,
  sanitizeInterests,
} from "../utils/interests.js";

const toId = (value) => value?.toString?.() || "";

const uniqueById = (items = []) => {
  const seen = new Set();
  return items.filter((item) => {
    const id = toId(item?._id);
    if (!id || seen.has(id)) return false;
    seen.add(id);
    return true;
  });
};

const scoreItem = ({ userTags, itemTags, text = "", carrera = "", popularity = 0, soonBoost = 0 }) => {
  const matched = itemTags.filter((tag) => userTags.includes(tag));
  let score = matched.length * 5;
  const token = carreraToken(carrera);
  const carreraHit = Boolean(token && text.includes(token));
  if (carreraHit) score += 2;
  score += Math.min(Number(popularity) || 0, 12) * 0.2;
  score += soonBoost;
  return { score, matched, carreraHit };
};

const soonBoostFor = (fechaHora) => {
  const date = fechaHora ? new Date(fechaHora) : null;
  if (!date || Number.isNaN(date.getTime())) return 0;
  const days = (date.getTime() - Date.now()) / 86400000;
  if (days < 0) return 0;
  if (days <= 7) return 2.5;
  if (days <= 21) return 1.5;
  if (days <= 45) return 0.8;
  return 0.2;
};

const pickTop = (scored, limit = 6) => {
  const matched = scored.filter((item) => item.matched.length);
  const rest = scored.filter((item) => !item.matched.length);
  return uniqueById([...matched, ...rest]).slice(0, limit);
};

export const obtenerRecomendaciones = async (req, res) => {
  try {
    const user = req.usuario || {};
    const meId = toId(user._id);
    const email = user.correoInstitucional || "";
    const universidad = String(user.universidad || "").trim();
    const explicit = sanitizeInterests(user.intereses);
    const userTags = collectUserTags(user);
    const inferredFromProfile = userTags.filter((tag) => !explicit.includes(tag));

    const [grupos, eventos] = await Promise.all([
      Grupo.find().select("nombre imagen miembrosArray creadorEmail tags createdAt").sort({ createdAt: -1 }).lean(),
      universidad
        ? Evento.find({ universidad, fechaHora: { $gte: new Date() } })
            .populate("creador", "_id nombre avatar")
            .sort({ fechaHora: 1 })
            .lean()
        : [],
    ]);

    const scoredGrupos = grupos
      .filter((grupo) => !(grupo.miembrosArray || []).includes(email))
      .map((grupo) => {
        const itemTags = mergeTags(grupo.tags, grupo.nombre);
        const { score, matched, carreraHit } = scoreItem({
          userTags,
          itemTags,
          text: normalizeText(grupo.nombre),
          carrera: user.carrera,
          popularity: (grupo.miembrosArray || []).length,
        });
        const reasons = matched.length
          ? labelsForTags(matched)
          : carreraHit
            ? ["Relacionado con tu carrera"]
            : ["Comunidad activa"];
        return {
          _id: grupo._id,
          nombre: grupo.nombre,
          imagen: grupo.imagen || "",
          miembrosCount: (grupo.miembrosArray || []).length,
          miembrosArray: grupo.miembrosArray || [],
          creadorEmail: grupo.creadorEmail,
          tags: itemTags,
          reasons,
          score,
          matched,
        };
      })
      .sort((a, b) => b.score - a.score || b.miembrosCount - a.miembrosCount);

    const scoredEventos = eventos
      .filter((evento) => !(evento.asistentes || []).some((id) => toId(id) === meId))
      .map((evento) => {
        const itemTags = mergeTags(
          evento.tags,
          evento.nombreEvento,
          evento.descripcionEvento,
          evento.lugar
        );
        const { score, matched, carreraHit } = scoreItem({
          userTags,
          itemTags,
          text: normalizeText(`${evento.nombreEvento || ""} ${evento.descripcionEvento || ""} ${evento.lugar || ""}`),
          carrera: user.carrera,
          popularity: (evento.asistentes || []).length,
          soonBoost: soonBoostFor(evento.fechaHora),
        });
        const reasons = matched.length
          ? labelsForTags(matched)
          : carreraHit
            ? ["Relacionado con tu carrera"]
            : universidad
              ? ["Popular en tu universidad"]
              : ["Te puede interesar"];
        return {
          _id: evento._id,
          nombreEvento: evento.nombreEvento,
          portada: toPublicUploadUrl(req, "events", evento.portada),
          fechaHora: evento.fechaHora,
          lugar: evento.lugar,
          descripcionEvento: evento.descripcionEvento,
          costo: evento.costo,
          universidad: evento.universidad,
          asistentesCount: (evento.asistentes || []).length,
          tags: itemTags,
          reasons,
          score,
          matched,
        };
      })
      .sort((a, b) => b.score - a.score || new Date(a.fechaHora) - new Date(b.fechaHora));

    res.json({
      intereses: explicit,
      inferredFromProfile,
      hasInterests: explicit.length > 0,
      needsUniversity: !universidad,
      grupos: pickTop(scoredGrupos, 6),
      eventos: pickTop(scoredEventos, 6),
    });
  } catch {
    res.status(500).json({ msg: "Error al obtener recomendaciones" });
  }
};
