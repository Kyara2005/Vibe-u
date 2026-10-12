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

export const getChatUsers = (search = "") =>
  axios.get(`/chat/users?search=${encodeURIComponent(search)}`, getAuthConfig());

export const getChatConversations = () =>
  axios.get("/chat/conversations", getAuthConfig());

export const getMessagesWithUser = (userId) =>
  axios.get(`/chat/messages/${userId}`, getAuthConfig());

export const sendMessageToUser = (toUserId, content) =>
  axios.post("/chat/messages", { toUserId, content }, getAuthConfig());

export const getChatUnread = () => axios.get("/chat/unread", getAuthConfig());
