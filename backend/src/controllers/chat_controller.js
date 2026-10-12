import mongoose from "mongoose";
import Usuario from "../models/Usuario.js";
import ChatConversation from "../models/ChatConversation.js";
import ChatMessage from "../models/ChatMessage.js";
import { mapAvatarToPublicUrl } from "../utils/mediaUrl.js";

const CHAT_USER_FIELDS = "_id nombre correoInstitucional avatar universidad carrera";

const toIdString = (value) => value?.toString();

const toObjectId = (value) => {
  const id = toIdString(value);
  return mongoose.Types.ObjectId.isValid(id) ? new mongoose.Types.ObjectId(id) : null;
};

const buildHash = (a, b) => [toIdString(a), toIdString(b)].sort().join(":");

const mapMessage = (message) => ({
  _id: message._id,
  conversationId: message.conversation,
  sender: toIdString(message.sender),
  receiver: toIdString(message.receiver),
  content: message.content,
  createdAt: message.createdAt,
});

const listAvailableUsers = async (req, res) => {
  try {
    const search = (req.query.search || "").trim();
    const meId = req.usuario._id;
    const filter = {
      _id: { $ne: meId },
      confirmEmail: true,
    };

    if (search) {
      filter.$or = [
        { nombre: { $regex: search, $options: "i" } },
        { correoInstitucional: { $regex: search, $options: "i" } },
      ];
    }

    const users = await Usuario.find(filter)
      .select(CHAT_USER_FIELDS)
      .sort({ nombre: 1 })
      .limit(100)
      .lean();

    res.status(200).json(users.map((user) => mapAvatarToPublicUrl(req, user)));
  } catch (error) {
    res.status(500).json({ msg: "Error al listar usuarios para chat" });
  }
};

const listConversations = async (req, res) => {
  try {
    const meId = toIdString(req.usuario._id);
    const conversations = await ChatConversation.find({
      participants: req.usuario._id,
    })
      .populate("participants", CHAT_USER_FIELDS)
      .sort({ lastMessageAt: -1, updatedAt: -1 })
      .lean();

    const meObjectId = toObjectId(req.usuario._id);
    const unreadRows = meObjectId
      ? await ChatMessage.aggregate([
          { $match: { receiver: meObjectId, unreadForReceiver: true } },
          { $group: { _id: "$conversation", count: { $sum: 1 } } },
        ])
      : [];
    const unreadMap = new Map(unreadRows.map((row) => [toIdString(row._id), row.count]));

    const payload = conversations
      .map((conversation) => {
        const otherUser = (conversation.participants || []).find(
          (user) => toIdString(user._id) !== meId
        );
        if (!otherUser) return null;

        return {
          _id: conversation._id,
          otherUser: mapAvatarToPublicUrl(req, otherUser),
          lastMessage: conversation.lastMessage || "",
          lastMessageAt: conversation.lastMessageAt || conversation.updatedAt,
          updatedAt: conversation.updatedAt,
          unreadCount: unreadMap.get(toIdString(conversation._id)) || 0,
        };
      })
      .filter(Boolean);

    res.status(200).json(payload);
  } catch (error) {
    res.status(500).json({ msg: "Error al listar conversaciones" });
  }
};

const getMessagesByUser = async (req, res) => {
  try {
    const meId = toIdString(req.usuario._id);
    const { userId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({ msg: "Usuario destino invalido" });
    }

    if (userId === meId) {
      return res.status(400).json({ msg: "No puedes abrir chat contigo mismo" });
    }

    const otherUser = await Usuario.findById(userId)
      .select(`${CHAT_USER_FIELDS} confirmEmail`)
      .lean();
    if (!otherUser || !otherUser.confirmEmail) {
      return res.status(404).json({ msg: "Usuario no encontrado para chatear" });
    }

    const participantsHash = buildHash(meId, userId);
    const conversation = await ChatConversation.findOne({ participantsHash }).lean();

    if (!conversation) {
      return res.status(200).json({
        conversation: null,
        otherUser: mapAvatarToPublicUrl(req, otherUser),
        messages: [],
      });
    }

    await ChatMessage.updateMany(
      { conversation: conversation._id, receiver: meId, unreadForReceiver: true },
      { $set: { unreadForReceiver: false } }
    );

    const messages = await ChatMessage.find({ conversation: conversation._id })
      .sort({ createdAt: 1 })
      .limit(500)
      .lean();

    res.status(200).json({
      conversation: {
        _id: conversation._id,
        lastMessage: conversation.lastMessage || "",
        lastMessageAt: conversation.lastMessageAt || conversation.updatedAt,
      },
      otherUser: {
        _id: otherUser._id,
        nombre: otherUser.nombre,
        correoInstitucional: otherUser.correoInstitucional,
        avatar: mapAvatarToPublicUrl(req, otherUser).avatar,
        universidad: otherUser.universidad,
        carrera: otherUser.carrera,
      },
      messages: messages.map(mapMessage),
    });
  } catch (error) {
    res.status(500).json({ msg: "Error al obtener mensajes" });
  }
};

const sendMessage = async (req, res) => {
  try {
    const meId = toIdString(req.usuario._id);
    const { toUserId, content } = req.body;
    const text = (content || "").trim();

    if (!mongoose.Types.ObjectId.isValid(toUserId)) {
      return res.status(400).json({ msg: "Usuario destino invalido" });
    }
    if (!text) {
      return res.status(400).json({ msg: "El mensaje no puede ir vacio" });
    }
    if (toUserId === meId) {
      return res.status(400).json({ msg: "No puedes enviarte mensajes" });
    }

    const targetUser = await Usuario.findById(toUserId).select("_id confirmEmail").lean();
    if (!targetUser || !targetUser.confirmEmail) {
      return res.status(404).json({ msg: "Usuario destino no disponible" });
    }

    const participantsHash = buildHash(meId, toUserId);
    let conversation = await ChatConversation.findOne({ participantsHash });
    if (!conversation) {
      conversation = await ChatConversation.create({
        participants: [meId, toUserId],
      });
    }

    const message = await ChatMessage.create({
      conversation: conversation._id,
      sender: meId,
      receiver: toUserId,
      content: text,
      unreadForReceiver: true,
    });

    conversation.lastMessage = text;
    conversation.lastMessageAt = message.createdAt;
    await conversation.save();

    res.status(201).json({
      conversationId: conversation._id,
      message: mapMessage(message),
    });
  } catch (error) {
    res.status(500).json({ msg: "Error al enviar mensaje" });
  }
};

const getChatUnread = async (req, res) => {
  try {
    const meId = toObjectId(req.usuario._id);
    const unreadCount = await ChatMessage.countDocuments({
      receiver: meId,
      unreadForReceiver: true,
    });
    const latest = await ChatMessage.findOne({
      receiver: meId,
      unreadForReceiver: true,
    })
      .sort({ createdAt: -1 })
      .populate("sender", "nombre")
      .lean();

    res.status(200).json({
      unreadCount,
      latest: latest
        ? {
            _id: latest._id,
            content: latest.content,
            createdAt: latest.createdAt,
            fromUser: {
              _id: latest.sender?._id,
              nombre: latest.sender?.nombre || "Alguien",
            },
          }
        : null,
    });
  } catch (error) {
    res.status(500).json({ msg: "Error al obtener mensajes no leidos" });
  }
};

export { listAvailableUsers, listConversations, getMessagesByUser, sendMessage, getChatUnread };
