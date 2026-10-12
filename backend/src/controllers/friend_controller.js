import mongoose from "mongoose";
import Usuario from "../models/Usuario.js";
import Post from "../models/Post.js";
import Grupo from "../models/Grupos.js";
import { mapAvatarToPublicUrl, mapPostMediaToPublicUrl } from "../utils/mediaUrl.js";

const PUBLIC_USER_FIELDS = "nombre avatar descripcion universidad carrera rol correoInstitucional perfilPublico";

const removeId = (arr = [], id) => arr.filter((item) => item.toString() !== id.toString());
const hasId = (arr = [], id) => (arr || []).some((item) => item.toString() === id.toString());
const pushUniqueId = (arr = [], id) => (hasId(arr, id) ? arr : [...arr, id]);
const trimNotifications = (arr = []) => arr.slice(0, 120);
const MATCH_REJECT_TTL_MS = 24 * 60 * 60 * 1000;

const rejectEntryId = (item) => {
  if (!item) return "";
  if (item.user) return item.user.toString();
  return item.toString();
};

const getActiveRejectedIds = (rechazados = [], now = Date.now()) => {
  const ids = new Set();
  for (const item of rechazados || []) {
    const id = rejectEntryId(item);
    if (!id) continue;
    const rejectedAt = item?.rejectedAt ? new Date(item.rejectedAt).getTime() : NaN;
    if (Number.isNaN(rejectedAt)) continue;
    if (now - rejectedAt < MATCH_REJECT_TTL_MS) ids.add(id);
  }
  return ids;
};

const upsertReject = (rechazados = [], userId) => {
  const id = userId.toString();
  const filtered = (rechazados || []).filter((item) => rejectEntryId(item) !== id);
  return [...filtered, { user: userId, rejectedAt: new Date() }];
};

const removeReject = (rechazados = [], userId) =>
  (rechazados || []).filter((item) => rejectEntryId(item) !== userId.toString());

const getFriendStatus = (viewer, targetId) => {
  const meId = viewer._id.toString();
  const tId = targetId.toString();
  if (meId === tId) return "self";
  if ((viewer.amigos || []).some((id) => id.toString() === tId)) return "friends";
  if ((viewer.solicitudesEnviadas || []).some((id) => id.toString() === tId)) return "pending_sent";
  if ((viewer.solicitudesRecibidas || []).some((id) => id.toString() === tId)) return "pending_received";
  return "none";
};

const searchUsers = async (req, res) => {
  try {
    const query = (req.query.query || "").trim();
    if (!query) return res.json([]);

    const users = await Usuario.find({
      _id: { $ne: req.usuario._id },
      confirmEmail: true,
      nombre: { $regex: `^${query}`, $options: "i" },
    })
      .select("_id nombre avatar universidad carrera perfilPublico")
      .limit(8)
      .lean();

    res.json(users.map((user) => {
      const mapped = mapAvatarToPublicUrl(req, user);
      if (mapped.perfilPublico === false) {
        return {
          _id: mapped._id,
          nombre: mapped.nombre,
          avatar: mapped.avatar,
          perfilPublico: false,
        };
      }
      return {
        _id: mapped._id,
        nombre: mapped.nombre,
        avatar: mapped.avatar,
        universidad: mapped.universidad,
        carrera: mapped.carrera,
        perfilPublico: true,
      };
    }));
  } catch {
    res.status(500).json({ msg: "Error al buscar usuarios" });
  }
};

const listMatchCandidates = async (req, res) => {
  try {
    const me = await Usuario.findById(req.usuario._id)
      .select("amigos matchLikesEnviados matchRechazados matchLikesRecibidos")
      .lean();

    const meId = req.usuario._id.toString();
    const incomingIds = (me?.matchLikesRecibidos || []).map((id) => id.toString());
    const rejectedIds = getActiveRejectedIds(me?.matchRechazados);

    const excluded = new Set([
      meId,
      ...(me?.amigos || []).map((id) => id.toString()),
      ...(me?.matchLikesEnviados || []).map((id) => id.toString()),
      ...rejectedIds,
    ]);

    const visibleIncomingIds = incomingIds.filter((id) => !rejectedIds.has(id));
    const incomingUsers = visibleIncomingIds.length
      ? await Usuario.find({
          _id: { $in: visibleIncomingIds },
          confirmEmail: true,
        })
          .select("_id nombre avatar universidad carrera")
          .lean()
      : [];

    const restUsers = await Usuario.find({
      _id: { $nin: [...excluded] },
      confirmEmail: true,
    })
      .select("_id nombre avatar universidad carrera")
      .sort({ nombre: 1 })
      .limit(100)
      .lean();

    const incomingSet = new Set(incomingIds);
    const mappedIncoming = incomingUsers.map((user) => ({
      ...mapAvatarToPublicUrl(req, user),
      incomingLike: true,
    }));
    const mappedRest = restUsers
      .filter((user) => !incomingSet.has(user._id.toString()))
      .map((user) => ({
        ...mapAvatarToPublicUrl(req, user),
        incomingLike: false,
      }));

    res.json([...mappedIncoming, ...mappedRest]);
  } catch {
    res.status(500).json({ msg: "Error al listar candidatos de match" });
  }
};

const getPublicProfile = async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ msg: "Usuario invalido" });
    }

    const [viewer, user] = await Promise.all([
      Usuario.findById(req.usuario._id)
        .select("amigos solicitudesEnviadas solicitudesRecibidas")
        .lean(),
      Usuario.findById(id).select(PUBLIC_USER_FIELDS).lean(),
    ]);

    if (!user) return res.status(404).json({ msg: "Usuario no encontrado" });

    const viewerId = req.usuario._id?.toString?.() || "";
    const targetId = user._id?.toString?.() || "";
    const isSelf = viewerId === targetId;
    const isAdmin = req.usuario.rol === "administrador";
    const isFriend = (viewer?.amigos || []).some((id) => id?.toString?.() === targetId);
    const canSeeFull = user.perfilPublico !== false || isSelf || isAdmin || isFriend;

    if (!canSeeFull) {
      return res.json({
        user: {
          _id: user._id,
          nombre: user.nombre,
          avatar: mapAvatarToPublicUrl(req, user).avatar,
          perfilPublico: false,
        },
        isPrivate: true,
        friendStatus: getFriendStatus(viewer, user._id),
        posts: [],
        groups: [],
      });
    }

    const [posts, groups] = await Promise.all([
      Post.find({ usuario: id, "moderation.status": { $ne: "disabled" } })
        .populate("usuario", "nombre avatar")
        .sort({ createdAt: -1 })
        .limit(20)
        .lean(),
      Grupo.find({
        $or: [{ creadorEmail: user.correoInstitucional }, { miembrosArray: user.correoInstitucional }],
      })
        .select("_id nombre imagen creadorEmail miembrosArray")
        .sort({ updatedAt: -1 })
        .limit(20)
        .lean(),
    ]);

    const mappedPosts = posts.map((post) => mapPostMediaToPublicUrl(req, post));

    res.json({
      user: {
        _id: user._id,
        nombre: user.nombre,
        avatar: mapAvatarToPublicUrl(req, user).avatar,
        descripcion: user.descripcion,
        universidad: user.universidad,
        carrera: user.carrera,
        rol: user.rol,
      },
      friendStatus: getFriendStatus(viewer, user._id),
      posts: mappedPosts,
      groups,
    });
  } catch {
    res.status(500).json({ msg: "Error al obtener perfil publico" });
  }
};

const sendFriendRequest = async (req, res) => {
  try {
    const { toUserId } = req.body;
    if (!mongoose.Types.ObjectId.isValid(toUserId)) {
      return res.status(400).json({ msg: "Usuario invalido" });
    }
    if (toUserId === req.usuario._id.toString()) {
      return res.status(400).json({ msg: "No puedes enviarte solicitud" });
    }

    const [fromUser, toUser] = await Promise.all([
      Usuario.findById(req.usuario._id),
      Usuario.findById(toUserId),
    ]);

    if (!toUser) return res.status(404).json({ msg: "Usuario no encontrado" });

    const alreadyFriends = (fromUser.amigos || []).some((id) => id.toString() === toUserId);
    if (alreadyFriends) return res.status(400).json({ msg: "Ya son amigos" });

    const alreadySent = (fromUser.solicitudesEnviadas || []).some((id) => id.toString() === toUserId);
    if (alreadySent) return res.status(400).json({ msg: "Solicitud ya enviada" });

    fromUser.solicitudesEnviadas = [...(fromUser.solicitudesEnviadas || []), toUser._id];
    toUser.solicitudesRecibidas = [...(toUser.solicitudesRecibidas || []), fromUser._id];

    await Promise.all([fromUser.save(), toUser.save()]);
    res.json({ msg: "Solicitud enviada", friendStatus: "pending_sent" });
  } catch {
    res.status(500).json({ msg: "Error al enviar solicitud" });
  }
};

const respondFriendRequest = async (req, res) => {
  try {
    const { fromUserId, action } = req.body;
    if (!mongoose.Types.ObjectId.isValid(fromUserId)) {
      return res.status(400).json({ msg: "Usuario invalido" });
    }
    if (!["accept", "reject"].includes(action)) {
      return res.status(400).json({ msg: "Accion invalida" });
    }

    const [me, fromUser] = await Promise.all([
      Usuario.findById(req.usuario._id),
      Usuario.findById(fromUserId),
    ]);
    if (!fromUser) return res.status(404).json({ msg: "Usuario no encontrado" });

    const hadRequest = (me.solicitudesRecibidas || []).some((id) => id.toString() === fromUserId);
    if (!hadRequest) return res.status(400).json({ msg: "No existe esa solicitud" });

    me.solicitudesRecibidas = removeId(me.solicitudesRecibidas, fromUserId);
    fromUser.solicitudesEnviadas = removeId(fromUser.solicitudesEnviadas, me._id);

    if (action === "accept") {
      if (!(me.amigos || []).some((id) => id.toString() === fromUserId)) {
        me.amigos = [...(me.amigos || []), fromUser._id];
      }
      if (!(fromUser.amigos || []).some((id) => id.toString() === me._id.toString())) {
        fromUser.amigos = [...(fromUser.amigos || []), me._id];
      }
    }

    await Promise.all([me.save(), fromUser.save()]);
    res.json({
      msg: action === "accept" ? "Solicitud aceptada" : "Solicitud rechazada",
      friendStatus: action === "accept" ? "friends" : "none",
    });
  } catch {
    res.status(500).json({ msg: "Error al responder solicitud" });
  }
};

const removeFriend = async (req, res) => {
  try {
    const { friendUserId } = req.body;
    if (!mongoose.Types.ObjectId.isValid(friendUserId)) {
      return res.status(400).json({ msg: "Usuario invalido" });
    }

    const [me, friendUser] = await Promise.all([
      Usuario.findById(req.usuario._id),
      Usuario.findById(friendUserId),
    ]);

    if (!friendUser) return res.status(404).json({ msg: "Usuario no encontrado" });

    const areFriends = (me.amigos || []).some((id) => id.toString() === friendUserId);
    if (!areFriends) {
      return res.status(400).json({ msg: "No son amigos actualmente" });
    }

    me.amigos = removeId(me.amigos, friendUserId);
    friendUser.amigos = removeId(friendUser.amigos, me._id);

    me.solicitudesEnviadas = removeId(me.solicitudesEnviadas || [], friendUserId);
    me.solicitudesRecibidas = removeId(me.solicitudesRecibidas || [], friendUserId);
    friendUser.solicitudesEnviadas = removeId(friendUser.solicitudesEnviadas || [], me._id);
    friendUser.solicitudesRecibidas = removeId(friendUser.solicitudesRecibidas || [], me._id);

    await Promise.all([me.save(), friendUser.save()]);

    res.json({ msg: "Amistad eliminada", friendStatus: "none" });
  } catch {
    res.status(500).json({ msg: "Error al eliminar amigo" });
  }
};

const cancelFriendRequest = async (req, res) => {
  try {
    const { toUserId } = req.body;
    if (!mongoose.Types.ObjectId.isValid(toUserId)) {
      return res.status(400).json({ msg: "Usuario invalido" });
    }

    const [me, toUser] = await Promise.all([
      Usuario.findById(req.usuario._id),
      Usuario.findById(toUserId),
    ]);

    if (!toUser) return res.status(404).json({ msg: "Usuario no encontrado" });

    const hadSentRequest = (me.solicitudesEnviadas || []).some((id) => id.toString() === toUserId);
    if (!hadSentRequest) {
      return res.status(400).json({ msg: "No tienes una solicitud enviada a este usuario" });
    }

    me.solicitudesEnviadas = removeId(me.solicitudesEnviadas, toUserId);
    toUser.solicitudesRecibidas = removeId(toUser.solicitudesRecibidas, me._id);

    await Promise.all([me.save(), toUser.save()]);

    res.json({ msg: "Solicitud cancelada", friendStatus: "none" });
  } catch {
    res.status(500).json({ msg: "Error al cancelar solicitud" });
  }
};

const sendMatchLike = async (req, res) => {
  try {
    const { toUserId } = req.body;
    if (!mongoose.Types.ObjectId.isValid(toUserId)) {
      return res.status(400).json({ msg: "Usuario invalido" });
    }
    if (toUserId === req.usuario._id.toString()) {
      return res.status(400).json({ msg: "No puedes darte like a ti mismo" });
    }

    const [me, toUser] = await Promise.all([Usuario.findById(req.usuario._id), Usuario.findById(toUserId)]);
    if (!me || !toUser || !toUser.confirmEmail) {
      return res.status(404).json({ msg: "Usuario no encontrado" });
    }

    const meId = me._id.toString();
    const targetId = toUser._id.toString();
    const alreadyFriends = hasId(me.amigos || [], targetId);

    if (alreadyFriends) {
      return res.json({
        msg: "Ya son amigos",
        matched: true,
        withUser: mapAvatarToPublicUrl(req, {
          _id: toUser._id,
          nombre: toUser.nombre,
          avatar: toUser.avatar,
          universidad: toUser.universidad,
          carrera: toUser.carrera,
        }),
      });
    }

    const isMutualLike = hasId(toUser.matchLikesEnviados || [], meId);

    if (isMutualLike) {
      me.matchLikesEnviados = removeId(me.matchLikesEnviados || [], targetId);
      me.matchLikesRecibidos = removeId(me.matchLikesRecibidos || [], targetId);
      toUser.matchLikesEnviados = removeId(toUser.matchLikesEnviados || [], meId);
      toUser.matchLikesRecibidos = removeId(toUser.matchLikesRecibidos || [], meId);

      me.matchRechazados = removeReject(me.matchRechazados || [], targetId);
      toUser.matchRechazados = removeReject(toUser.matchRechazados || [], meId);

      me.matchNotificaciones = (me.matchNotificaciones || []).filter((item) => {
        if (item.type !== "match_like") return true;
        const from = item.fromUser?.toString();
        return from !== targetId;
      });
      toUser.matchNotificaciones = (toUser.matchNotificaciones || []).filter((item) => {
        if (item.type !== "match_like") return true;
        const from = item.fromUser?.toString();
        return from !== meId;
      });

      me.amigos = pushUniqueId(me.amigos || [], toUser._id);
      toUser.amigos = pushUniqueId(toUser.amigos || [], me._id);

      me.matchNotificaciones = trimNotifications([
        {
          type: "match_success",
          withUser: toUser._id,
          message: `Tienes match con ${toUser.nombre}. Ya pueden chatear.`,
          createdAt: new Date(),
        },
        ...(me.matchNotificaciones || []),
      ]);
      toUser.matchNotificaciones = trimNotifications([
        {
          type: "match_success",
          withUser: me._id,
          message: `Tienes match con ${me.nombre}. Ya pueden chatear.`,
          createdAt: new Date(),
        },
        ...(toUser.matchNotificaciones || []),
      ]);

      await Promise.all([me.save(), toUser.save()]);

      return res.json({
        msg: "Match exitoso",
        matched: true,
        withUser: mapAvatarToPublicUrl(req, {
          _id: toUser._id,
          nombre: toUser.nombre,
          avatar: toUser.avatar,
          universidad: toUser.universidad,
          carrera: toUser.carrera,
        }),
      });
    }

    if (!hasId(me.matchLikesEnviados || [], targetId)) {
      me.matchLikesEnviados = [...(me.matchLikesEnviados || []), toUser._id];
    }
    if (!hasId(toUser.matchLikesRecibidos || [], meId)) {
      toUser.matchLikesRecibidos = [...(toUser.matchLikesRecibidos || []), me._id];
    }
    me.matchRechazados = removeReject(me.matchRechazados || [], targetId);


    await Promise.all([me.save(), toUser.save()]);

    res.json({
      msg: "Like enviado",
      matched: false,
    });
  } catch {
    res.status(500).json({ msg: "Error al enviar like de match" });
  }
};

const rejectMatchCandidate = async (req, res) => {
  try {
    const { toUserId } = req.body;
    if (!mongoose.Types.ObjectId.isValid(toUserId)) {
      return res.status(400).json({ msg: "Usuario invalido" });
    }
    if (toUserId === req.usuario._id.toString()) {
      return res.status(400).json({ msg: "No puedes rechazarte a ti mismo" });
    }

    const [me, otherUser] = await Promise.all([Usuario.findById(req.usuario._id), Usuario.findById(toUserId)]);
    if (!me || !otherUser) {
      return res.status(404).json({ msg: "Usuario no encontrado" });
    }

    me.matchRechazados = upsertReject(me.matchRechazados || [], otherUser._id);
    me.matchLikesRecibidos = removeId(me.matchLikesRecibidos || [], otherUser._id);
    me.matchLikesEnviados = removeId(me.matchLikesEnviados || [], otherUser._id);

    otherUser.matchLikesEnviados = removeId(otherUser.matchLikesEnviados || [], me._id);
    otherUser.matchLikesRecibidos = removeId(otherUser.matchLikesRecibidos || [], me._id);

    me.matchNotificaciones = (me.matchNotificaciones || []).filter((item) => {
      if (item.type !== "match_like") return true;
      return item.fromUser?.toString() !== otherUser._id.toString();
    });

    await Promise.all([me.save(), otherUser.save()]);
    res.json({ msg: "Perfil rechazado" });
  } catch {
    res.status(500).json({ msg: "Error al rechazar perfil" });
  }
};

const getFriendRequestNotifications = async (req, res) => {
  try {
    const me = await Usuario.findById(req.usuario._id)
      .populate("solicitudesRecibidas", "_id nombre avatar universidad carrera")
      .lean();

    const notifications = (me?.solicitudesRecibidas || []).map((user) => ({
      _id: `fr-${user._id}`,
      type: "friend_request",
      fromUser: mapAvatarToPublicUrl(req, user),
      message: `${user.nombre} te envio una solicitud de amistad`,
      createdAt: new Date().toISOString(),
    }));

    res.json(notifications);
  } catch {
    res.status(500).json({ msg: "Error al obtener notificaciones" });
  }
};

const getMatchNotifications = async (req, res) => {
  try {
    const me = await Usuario.findById(req.usuario._id)
      .populate("matchNotificaciones.fromUser", "_id nombre avatar universidad carrera")
      .populate("matchNotificaciones.withUser", "_id nombre avatar universidad carrera")
      .lean();

    const notifications = (me?.matchNotificaciones || [])
      .map((item, index) => {
        const fromUser = item.fromUser ? mapAvatarToPublicUrl(req, item.fromUser) : null;
        const withUser = item.withUser ? mapAvatarToPublicUrl(req, item.withUser) : null;
        return {
          _id: `match-${index}-${item.createdAt || Date.now()}`,
          type: item.type,
          fromUser,
          withUser,
          message: item.message,
          createdAt: item.createdAt || new Date().toISOString(),
        };
      })
      .sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));

    res.json(notifications);
  } catch {
    res.status(500).json({ msg: "Error al obtener notificaciones de match" });
  }
};

const listInvitePeople = async (req, res) => {
  try {
    const me = await Usuario.findById(req.usuario._id).select("amigos").lean();
    const friendIds = (me?.amigos || []).map((id) => id.toString());
    const friends = friendIds.length
      ? await Usuario.find({
          _id: { $in: friendIds },
          confirmEmail: true,
        })
          .select("_id nombre avatar universidad carrera correoInstitucional")
          .lean()
      : [];

    const excluded = new Set([req.usuario._id.toString(), ...friendIds]);
    const others = await Usuario.find({
      _id: { $nin: [...excluded] },
      confirmEmail: true,
    })
      .select("_id nombre avatar universidad carrera correoInstitucional")
      .sort({ nombre: 1 })
      .limit(30)
      .lean();

    res.json([...friends, ...others].map((user) => mapAvatarToPublicUrl(req, user)));
  } catch {
    res.status(500).json({ msg: "Error al listar personas para invitar" });
  }
};

export {
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
  listInvitePeople,
};

