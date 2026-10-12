import { create } from "zustand";
import { fetchAllNotifications, isBadgeNotification } from "../Services/notifications";
import { getChatUnread } from "../Services/chat";
import { playNotificationSound } from "../utils/notificationSound";
import { getSessionToken, getTokenPayload } from "../utils/authToken";

const currentUserId = () => {
  const payload = getTokenPayload(getSessionToken());
  return String(payload?.id || payload?._id || "");
};

const knownKey = (userId) => `vibeu.alerts.known.${userId || "anon"}`;

const readIdSet = (userId) => {
  try {
    const raw = localStorage.getItem(knownKey(userId));
    const parsed = raw ? JSON.parse(raw) : [];
    return new Set(Array.isArray(parsed) ? parsed.map(String) : []);
  } catch {
    return new Set();
  }
};

const writeIdSet = (userId, ids) => {
  try {
    localStorage.setItem(knownKey(userId), JSON.stringify([...ids].slice(-400)));
  } catch {
    // ignore
  }
};

const storeNotifications = create((set, get) => ({
  userId: "",
  items: [],
  unreadCount: 0,
  chatUnreadCount: 0,
  toast: null,
  requestSeq: 0,

  clearToast: () => set({ toast: null }),

  reset: () =>
    set({
      userId: currentUserId(),
      items: [],
      unreadCount: 0,
      chatUnreadCount: 0,
      toast: null,
    }),

  refresh: async ({ announce = false } = {}) => {
    const userId = currentUserId();
    if (!userId) {
      get().reset();
      return;
    }
    if (get().userId && get().userId !== userId) {
      get().reset();
    }

    const seq = get().requestSeq + 1;
    set({ userId, requestSeq: seq });

    try {
      const [items, chatRes] = await Promise.all([
        fetchAllNotifications(),
        getChatUnread().catch(() => ({ data: { unreadCount: 0, latest: null } })),
      ]);
      if (get().requestSeq !== seq || currentUserId() !== userId) return;

      const chatUnreadCount = Number(chatRes?.data?.unreadCount) || 0;
      const chatLatest = chatRes?.data?.latest || null;
      const known = readIdSet(userId);
      const isFirstSnapshot = known.size === 0;

      const newNotifs = items.filter((item) => !known.has(String(item._id)));
      items.forEach((item) => known.add(String(item._id)));

      let toast = null;
      const chatLatestId = chatLatest?._id ? String(chatLatest._id) : "";
      const isNewChat = Boolean(chatLatestId && !known.has(`chat-${chatLatestId}`));
      if (chatLatestId) known.add(`chat-${chatLatestId}`);

      writeIdSet(userId, known);

      if (announce && !isFirstSnapshot) {
        if (isNewChat && chatLatest) {
          toast = {
            id: chatLatestId,
            type: "chat",
            fromUserId: chatLatest.fromUser?._id,
            message: `${chatLatest.fromUser?.nombre || "Alguien"}: ${chatLatest.content || "Nuevo mensaje"}`,
          };
        } else if (newNotifs.length) {
          const latest = newNotifs[0];
          toast = {
            id: latest._id,
            type: latest.type || "notice",
            message: latest.message,
          };
        }
        if (toast) playNotificationSound();
      }

      set({
        items,
        unreadCount: items.filter(isBadgeNotification).length,
        chatUnreadCount,
        ...(toast ? { toast } : {}),
      });
    } catch {
      if (get().requestSeq !== seq) return;
      set({
        items: [],
        unreadCount: 0,
      });
    }
  },

  refreshChat: async () => {
    try {
      const chatRes = await getChatUnread();
      set({ chatUnreadCount: Number(chatRes?.data?.unreadCount) || 0 });
    } catch {
      set({ chatUnreadCount: 0 });
    }
  },
}));

export default storeNotifications;
