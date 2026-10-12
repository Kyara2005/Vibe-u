import mongoose from "mongoose";
import Evento from "../models/Evento.js";
import { extractStoredFilename, toPublicUploadUrl } from "../utils/mediaUrl.js";
import { mergeTags } from "../utils/interests.js";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const EVENTS_UPLOAD_DIR = path.join(__dirname, "..", "..", "uploads", "events");

const toId = (value) => value?.toString?.() || "";

const savePortadaIfBase64 = (portada, userId) => {
  if (!portada || typeof portada !== "string") return "";
  if (!portada.startsWith("data:image/")) return extractStoredFilename(portada);

  const match = portada.match(/^data:image\/([a-zA-Z0-9+.-]+);base64,(.+)$/);
  if (!match) return "";

  const [, rawExt, base64Data] = match;
  const ext = rawExt === "jpeg" ? "jpg" : rawExt.toLowerCase();
  const allowed = new Set(["jpg", "png", "webp", "gif"]);
  const safeExt = allowed.has(ext) ? ext : "jpg";

  fs.mkdirSync(EVENTS_UPLOAD_DIR, { recursive: true });
  const filename = `event-${userId}-${Date.now()}.${safeExt}`;
  const fullPath = path.join(EVENTS_UPLOAD_DIR, filename);
  fs.writeFileSync(fullPath, Buffer.from(base64Data, "base64"));
  return filename;
};

const isEventoCaducado = (fechaHora, now = Date.now()) => {
  const fecha = fechaHora ? new Date(fechaHora) : null;
  return !fecha || Number.isNaN(fecha.getTime()) || fecha.getTime() < now;
};

const mapEvento = (req, evento, meId = "") => {
  const source = typeof evento?.toObject === "function" ? evento.toObject() : evento;
  const asistentes = Array.isArray(source?.asistentes) ? source.asistentes : [];

  return {
    ...source,
    portada: toPublicUploadUrl(req, "events", source?.portada),
    creador: source?.creador
      ? {
          ...source.creador,
          avatar: toPublicUploadUrl(req, "avatars", source.creador.avatar),
        }
      : null,
    asistentesCount: asistentes.length,
    isAttending: asistentes.some((id) => toId(id) === meId),
    isExpired: isEventoCaducado(source?.fechaHora),
  };
};

const getUniversidad = (req) => (req.usuario?.universidad || "").trim();

const listarEventosUniversidad = async (req, res) => {
  try {
    const universidad = getUniversidad(req);
    if (!universidad) {
      return res.status(400).json({ msg: "Debes completar tu universidad para ver eventos." });
    }

    const eventos = await Evento.find({ universidad })
      .populate("creador", "_id nombre avatar")
      .sort({ fechaHora: 1, createdAt: -1 });

    const meId = toId(req.usuario?._id);
    res.json(eventos.map((evento) => mapEvento(req, evento, meId)));
  } catch {
    res.status(500).json({ msg: "Error al listar eventos" });
  }
};

const crearEvento = async (req, res) => {
  try {
    const universidad = getUniversidad(req);
    if (!universidad) {
      return res.status(400).json({ msg: "Debes completar tu universidad para crear eventos." });
    }

    const {
      nombreEvento = "",
      portada = "",
      fechaHora = "",
      lugar = "",
      descripcionEvento = "",
      costo = "",
      tags = [],
    } = req.body || {};

    if (![nombreEvento, fechaHora, lugar, descripcionEvento, costo].every((v) => String(v).trim())) {
      return res.status(400).json({ msg: "Completa todos los campos del evento." });
    }

    const fecha = new Date(fechaHora);
    if (Number.isNaN(fecha.getTime())) {
      return res.status(400).json({ msg: "Fecha y hora invalidas." });
    }

    const evento = await Evento.create({
      nombreEvento: String(nombreEvento).trim(),
      portada: savePortadaIfBase64(portada, req.usuario._id),
      fechaHora: fecha,
      lugar: String(lugar).trim(),
      descripcionEvento: String(descripcionEvento).trim(),
      costo: String(costo).trim(),
      universidad,
      tags: mergeTags(tags, nombreEvento, descripcionEvento, lugar),
      creador: req.usuario._id,
      asistentes: [],
      recordatoriosEnviados: [],
    });

    await evento.populate("creador", "_id nombre avatar");
    res.status(201).json(mapEvento(req, evento, toId(req.usuario?._id)));
  } catch {
    res.status(500).json({ msg: "Error al crear evento" });
  }
};

const toggleAsistire = async (req, res) => {
  try {
    const universidad = getUniversidad(req);
    if (!universidad) {
      return res.status(400).json({ msg: "Debes completar tu universidad para asistir eventos." });
    }

    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ msg: "Evento invalido." });
    }

    const evento = await Evento.findById(id).populate("creador", "_id nombre avatar");
    if (!evento) return res.status(404).json({ msg: "Evento no encontrado." });
    if (evento.universidad !== universidad) {
      return res.status(403).json({ msg: "Solo puedes asistir eventos de tu universidad." });
    }
    if (isEventoCaducado(evento.fechaHora)) {
      return res.status(400).json({ msg: "Este evento ya caducó y no admite asistencia." });
    }

    const meId = toId(req.usuario._id);
    const already = (evento.asistentes || []).some((userId) => toId(userId) === meId);

    if (already) {
      evento.asistentes = (evento.asistentes || []).filter((userId) => toId(userId) !== meId);
      evento.recordatoriosEnviados = (evento.recordatoriosEnviados || []).filter((userId) => toId(userId) !== meId);
    } else {
      evento.asistentes = [...(evento.asistentes || []), req.usuario._id];
    }

    await evento.save();

    res.json({
      msg: already ? "Ya no asistirás a este evento." : "Marcaste que asistirás.",
      isAttending: !already,
      evento: mapEvento(req, evento, meId),
    });
  } catch {
    res.status(500).json({ msg: "Error al actualizar asistencia" });
  }
};

const eliminarEvento = async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ msg: "Evento invalido." });
    }

    const evento = await Evento.findById(id);
    if (!evento) return res.status(404).json({ msg: "Evento no encontrado." });

    if (toId(evento.creador) !== toId(req.usuario?._id)) {
      return res.status(403).json({ msg: "Solo el creador puede eliminar este evento." });
    }

    await Evento.findByIdAndDelete(id);
    res.json({ msg: "Evento eliminado correctamente.", id });
  } catch {
    res.status(500).json({ msg: "Error al eliminar evento" });
  }
};

const actualizarEvento = async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ msg: "Evento invalido." });
    }

    const evento = await Evento.findById(id);
    if (!evento) return res.status(404).json({ msg: "Evento no encontrado." });

    if (toId(evento.creador) !== toId(req.usuario?._id)) {
      return res.status(403).json({ msg: "Solo el creador puede editar este evento." });
    }

    const {
      nombreEvento,
      portada,
      fechaHora,
      lugar,
      descripcionEvento,
      costo,
      tags,
    } = req.body || {};

    if (typeof nombreEvento === "string" && nombreEvento.trim()) evento.nombreEvento = nombreEvento.trim();
    if (typeof lugar === "string" && lugar.trim()) evento.lugar = lugar.trim();
    if (typeof descripcionEvento === "string" && descripcionEvento.trim()) evento.descripcionEvento = descripcionEvento.trim();
    if (typeof costo === "string" && costo.trim()) evento.costo = costo.trim();
    if (typeof portada === "string" && portada.trim()) evento.portada = savePortadaIfBase64(portada, req.usuario._id);

    if (typeof fechaHora === "string" && fechaHora.trim()) {
      const fecha = new Date(fechaHora);
      if (Number.isNaN(fecha.getTime())) {
        return res.status(400).json({ msg: "Fecha y hora invalidas." });
      }
      evento.fechaHora = fecha;
    }

    evento.tags = mergeTags(
      tags,
      evento.nombreEvento,
      evento.descripcionEvento,
      evento.lugar
    );

    await evento.save();
    await evento.populate("creador", "_id nombre avatar");
    res.json(mapEvento(req, evento, toId(req.usuario?._id)));
  } catch {
    res.status(500).json({ msg: "Error al actualizar evento" });
  }
};

const notificacionesEventos = async (req, res) => {
  try {
    const universidad = getUniversidad(req);
    if (!universidad) return res.json([]);

    const meId = req.usuario._id;
    const now = new Date();
    const nextDay = new Date(now.getTime() + 24 * 60 * 60 * 1000);

    const eventos = await Evento.find({
      universidad,
      asistentes: meId,
      fechaHora: { $gt: now, $lte: nextDay },
    })
      .populate("creador", "_id nombre avatar")
      .sort({ fechaHora: 1 })
      .lean();

    if (!eventos.length) return res.json([]);

    const notifications = eventos.map((evento) => ({
      _id: `ev-${evento._id}-${toId(meId)}`,
      type: "event_reminder",
      eventId: evento._id,
      event: mapEvento(req, evento, toId(meId)),
      message: `Recordatorio: "${evento.nombreEvento}" es dentro de menos de 24 horas.`,
      createdAt: now.toISOString(),
    }));

    res.json(notifications);
  } catch {
    res.status(500).json({ msg: "Error al obtener recordatorios de eventos" });
  }
};

export {
  listarEventosUniversidad,
  crearEvento,
  actualizarEvento,
  toggleAsistire,
  eliminarEvento,
  notificacionesEventos,
};
