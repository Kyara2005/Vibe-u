import axios from "./axios";
import { getSessionToken, isTokenExpired } from "../utils/authToken";

const getAuthConfig = () => {
  const token = getSessionToken();
  if (!token || isTokenExpired(token)) {
    throw new Error("Sesion expirada");
  }
  return {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  };
};

export const searchRegisteredUsers = (query = "") =>
  axios.get(`/usuarios/buscar?query=${encodeURIComponent(query)}`, getAuthConfig());

export const getPublicUserProfile = (userId) =>
  axios.get(`/usuarios/publico/${userId}`, getAuthConfig());

export const sendFriendRequest = (toUserId) =>
  axios.post("/usuarios/amistad/solicitar", { toUserId }, getAuthConfig());

export const respondFriendRequest = (fromUserId, action) =>
  axios.post("/usuarios/amistad/responder", { fromUserId, action }, getAuthConfig());

export const removeFriend = (friendUserId) =>
  axios.post("/usuarios/amistad/eliminar", { friendUserId }, getAuthConfig());

export const cancelFriendRequest = (toUserId) =>
  axios.post("/usuarios/amistad/cancelar", { toUserId }, getAuthConfig());

export const getFriendNotifications = () =>
  axios.get("/usuarios/amistad/notificaciones", getAuthConfig());

export const getModerationNotifications = () =>
  axios.get("/usuarios/moderacion/notificaciones", getAuthConfig());

export const getInvitePeople = () =>
  axios.get("/usuarios/invitar-personas", getAuthConfig());

export const getMatchCandidates = () =>
  axios.get("/usuarios/match/candidatos", getAuthConfig());

export const sendMatchLike = (toUserId) =>
  axios.post("/usuarios/match/like", { toUserId }, getAuthConfig());

export const rejectMatchCandidate = (toUserId) =>
  axios.post("/usuarios/match/reject", { toUserId }, getAuthConfig());

export const getMatchNotifications = () =>
  axios.get("/usuarios/match/notificaciones", getAuthConfig());
