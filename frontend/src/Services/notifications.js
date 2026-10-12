import { getEventNotifications } from "./events";
import { getGroupInvites } from "./groups";
import {
  getFriendNotifications,
  getMatchNotifications,
  getModerationNotifications,
} from "./users";

const ACTIVE_TYPES = new Set([
  "friend_request",
  "group_invite",
  "event_reminder",
  "moderation_alert",
  "match_like",
  "match_success",
]);

const asList = (payload) => (Array.isArray(payload) ? payload : []);

export const isSameLocalDay = (value, now = new Date()) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return false;
  return (
    date.getFullYear() === now.getFullYear() &&
    date.getMonth() === now.getMonth() &&
    date.getDate() === now.getDate()
  );
};

export const isActiveNotification = (item) =>
  Boolean(item?._id && item?.message && ACTIVE_TYPES.has(item.type));

export const isBadgeNotification = (item) =>
  isActiveNotification(item) && isSameLocalDay(item.createdAt);

export const fetchAllNotifications = async () => {
  const [friendsRes, eventsRes, moderationRes, matchRes, groupInvitesRes] = await Promise.all([
    getFriendNotifications().catch(() => ({ data: [] })),
    getEventNotifications().catch(() => ({ data: [] })),
    getModerationNotifications().catch(() => ({ data: [] })),
    getMatchNotifications().catch(() => ({ data: [] })),
    getGroupInvites().catch(() => ({ data: [] })),
  ]);

  return [
    ...asList(friendsRes?.data),
    ...asList(eventsRes?.data),
    ...asList(moderationRes?.data),
    ...asList(matchRes?.data),
    ...asList(groupInvitesRes?.data),
  ]
    .filter(isActiveNotification)
    .sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
};
