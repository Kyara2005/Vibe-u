import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  getFriendNotifications,
  getMatchNotifications,
  getModerationNotifications,
  respondFriendRequest,
} from "../../../Services/users";
import { getEventNotifications } from "../../../Services/events";
import { getGroupInvites, respondGroupInvite } from "../../../Services/groups";
import storeNotifications from "../../../context/storeNotifications";

const HISTORY_KEY = "vibeu.notifications.history.v2";

const isSameLocalDay = (value, now = new Date()) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return false;
  return (
    date.getFullYear() === now.getFullYear() &&
    date.getMonth() === now.getMonth() &&
    date.getDate() === now.getDate()
  );
};

const notificationReceivedAt = (item = {}) =>
  item.receivedAt || item.createdAt || item.firstSeenAt || Date.now();

const readHistory = () => {
  try {
    const raw = localStorage.getItem(HISTORY_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

const writeHistory = (items) => {
  try {
    localStorage.setItem(HISTORY_KEY, JSON.stringify(items.slice(0, 300)));
  } catch {
    // ignore localStorage errors
  }
};

const NotificationsView = () => {
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState([]);
  const [historyNotifications, setHistoryNotifications] = useState(readHistory());
  const [error, setError] = useState("");
  const [tab, setTab] = useState("recent");
  const [loading, setLoading] = useState(true);

  const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

  const loadNotifications = async () => {
    setLoading(true);
    for (let attempt = 1; attempt <= 3; attempt += 1) {
      try {
        setError("");
        const [friendsRes, eventsRes, moderationRes, matchRes, groupInvitesRes] = await Promise.all([
          getFriendNotifications(),
          getEventNotifications(),
          getModerationNotifications(),
          getMatchNotifications(),
          getGroupInvites().catch(() => ({ data: [] })),
        ]);
        const friendItems = Array.isArray(friendsRes?.data) ? friendsRes.data : [];
        const eventItems = Array.isArray(eventsRes?.data) ? eventsRes.data : [];
        const moderationItems = Array.isArray(moderationRes?.data) ? moderationRes.data : [];
        const matchItems = Array.isArray(matchRes?.data) ? matchRes.data : [];
        const groupInviteItems = Array.isArray(groupInvitesRes?.data) ? groupInvitesRes.data : [];
        const merged = [...friendItems, ...eventItems, ...moderationItems, ...matchItems, ...groupInviteItems].sort(
          (a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0)
        );
        setNotifications(merged);

        const previous = readHistory();
        const map = new Map(previous.map((item) => [item._id, item]));
        const now = new Date().toISOString();
        merged.forEach((item) => {
          const prev = map.get(item._id);
          const receivedAt = prev?.receivedAt || item.createdAt || now;
          map.set(item._id, {
            ...prev,
            ...item,
            receivedAt,
            firstSeenAt: prev?.firstSeenAt || receivedAt,
            lastSeenAt: now,
          });
        });
        const history = [...map.values()].sort(
          (a, b) => new Date(notificationReceivedAt(b)) - new Date(notificationReceivedAt(a))
        );
        writeHistory(history);
        setHistoryNotifications(history);
        await storeNotifications.getState().refresh({ announce: false });
        setLoading(false);
        return;
      } catch (e) {
        if (attempt === 3) {
          setError(e?.response?.data?.msg || "No se pudieron cargar notificaciones");
          setLoading(false);
          return;
        }
        await wait(attempt * 450);
      }
    }
  };

  useEffect(() => {
    loadNotifications();
  }, []);

  const handleGroupInvite = async (grupoId, action) => {
    try {
      await respondGroupInvite(grupoId, action);
      await loadNotifications();
    } catch (e) {
      setError(e?.response?.data?.message || e?.response?.data?.msg || "No se pudo responder la invitación");
    }
  };

  const handleAction = async (fromUserId, action) => {
    try {
      await respondFriendRequest(fromUserId, action);
      await loadNotifications();
    } catch (e) {
      setError(e?.response?.data?.msg || "No se pudo responder solicitud");
    }
  };

  const notificationsToRender =
    tab === "history"
      ? historyNotifications
      : notifications
          .map((item) => {
            const stored = historyNotifications.find((h) => h._id === item._id);
            return { ...item, receivedAt: stored?.receivedAt || item.createdAt };
          })
          .filter((item) => isSameLocalDay(notificationReceivedAt(item)));

  return (
    <section className="panel__dash">
      <h3>Notificaciones</h3>
      <div className="friend_actions__dash" style={{ marginTop: "8px" }}>
        <button
          className="button__dash"
          type="button"
          onClick={() => setTab("recent")}
          style={{ opacity: tab === "recent" ? 1 : 0.75 }}
        >
          Recientes
        </button>
        <button
          className="button__dash"
          type="button"
          onClick={() => setTab("history")}
          style={{ opacity: tab === "history" ? 1 : 0.75 }}
        >
          Historial
        </button>
      </div>
      {error ? <p className="chat_error__dash">{error}</p> : null}
      {error ? (
        <div className="friend_actions__dash" style={{ marginBottom: "8px" }}>
          <button className="button__dash" type="button" onClick={loadNotifications}>
            Reintentar
          </button>
        </div>
      ) : null}

      {loading ? <p className="chat_hint__dash">Cargando notificaciones...</p> : null}

      {!loading && !notificationsToRender.length ? (
        <ul className="list__dash">
          <li>{tab === "history" ? "No hay historial de notificaciones." : "No tienes notificaciones de hoy."}</li>
        </ul>
      ) : (
        <div className="card_grid__dash">
          {notificationsToRender.map((item) => (
            <article key={item._id} className="post_card__dash">
              <p>{item.message}</p>
              {tab === "history" ? (
                <p style={{ margin: "6px 0 0", fontSize: "0.82rem", opacity: 0.85 }}>
                  Recibido: {new Date(notificationReceivedAt(item)).toLocaleString()}
                </p>
              ) : null}

              {item.type === "friend_request" && tab !== "history" ? (
                <div className="friend_actions__dash">
                  <button className="button__dash" type="button" onClick={() => navigate(`/dashboard/usuario/${item.fromUser._id}`)}>
                    Ver perfil
                  </button>
                  <button className="button__dash" type="button" onClick={() => handleAction(item.fromUser._id, "accept")}>
                    Aceptar
                  </button>
                  <button className="button__dash" type="button" onClick={() => handleAction(item.fromUser._id, "reject")}>
                    Rechazar
                  </button>
                </div>
              ) : null}

              {item.type === "group_invite" ? (
                <div className="group_invite_card__dash">
                  {item.grupo?.imagen ? (
                    <img src={item.grupo.imagen} alt="" className="group_invite_cover__dash" />
                  ) : null}
                  <strong>{item.grupo?.nombre || "Grupo"}</strong>
                  <p className="group_invite_desc__dash">
                    {item.grupo?.descripcion || "Este grupo no tiene descripción."}
                  </p>
                  {item.grupo?.tags?.length ? (
                    <span className="group_invite_meta__dash">
                      Intereses: {item.grupo.tags.join(", ")}
                    </span>
                  ) : null}
                  <span className="group_invite_meta__dash">
                    {item.grupo?.miembrosArray?.length || 0} miembros
                    {item.fromUser?.nombre ? ` · Te invitó ${item.fromUser.nombre}` : ""}
                  </span>
                  {tab !== "history" && item.grupo?._id ? (
                    <div className="friend_actions__dash">
                      <button className="button__dash" type="button" onClick={() => handleGroupInvite(item.grupo._id, "reject")}>
                        Rechazar
                      </button>
                      <button className="button__dash" type="button" onClick={() => handleGroupInvite(item.grupo._id, "accept")}>
                        Unirme
                      </button>
                    </div>
                  ) : null}
                </div>
              ) : null}

              {item.type === "event_reminder" ? (
                <div className="friend_actions__dash">
                  <button className="button__dash" type="button" onClick={() => navigate("/dashboard/eventos")}>
                    Ver evento
                  </button>
                </div>
              ) : null}

              {item.type === "moderation_alert" ? (
                <div className="friend_actions__dash">
                  <button className="button__dash" type="button" onClick={() => navigate("/dashboard/feed")}>
                    Ir al feed
                  </button>
                </div>
              ) : null}

              {item.type === "match_like" ? (
                <div className="friend_actions__dash">
                  {item.fromUser?._id ? (
                    <button
                      className="button__dash"
                      type="button"
                      onClick={() => navigate(`/dashboard/usuario/${item.fromUser._id}`)}
                    >
                      Ver perfil
                    </button>
                  ) : null}
                  <button className="button__dash" type="button" onClick={() => navigate("/matches")}>
                    Ir a matches
                  </button>
                </div>
              ) : null}

              {item.type === "match_success" ? (
                <div className="friend_actions__dash">
                  {item.withUser?._id ? (
                    <button
                      className="button__dash"
                      type="button"
                      onClick={() =>
                        navigate("/dashboard/chat", {
                          state: {
                            openUserId: item.withUser._id,
                            fromMatch: true,
                          },
                        })
                      }
                    >
                      Abrir chat
                    </button>
                  ) : null}
                </div>
              ) : null}
            </article>
          ))}
        </div>
      )}
    </section>
  );
};

export default NotificationsView;
