import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { FaBell, FaComments } from "react-icons/fa";
import storeAuth from "../../context/storeAuth";
import storeNotifications from "../../context/storeNotifications";
import { unlockNotificationAudio } from "../../utils/notificationSound";
import "./NotificationAlerts.css";

const POLL_MS = 12000;

const NotificationAlerts = () => {
  const navigate = useNavigate();
  const token = storeAuth((state) => state.token);
  const toast = storeNotifications((state) => state.toast);
  const refresh = storeNotifications((state) => state.refresh);
  const clearToast = storeNotifications((state) => state.clearToast);
  const reset = storeNotifications((state) => state.reset);

  useEffect(() => {
    const unlock = () => unlockNotificationAudio();
    window.addEventListener("pointerdown", unlock, { once: true });
    reset();
    refresh({ announce: false });
    const timer = setInterval(() => {
      refresh({ announce: true });
    }, POLL_MS);
    return () => {
      window.removeEventListener("pointerdown", unlock);
      clearInterval(timer);
    };
  }, [token, refresh, reset]);

  useEffect(() => {
    if (!toast) return undefined;
    const hide = setTimeout(() => clearToast(), 5200);
    return () => clearTimeout(hide);
  }, [toast, clearToast]);

  if (!toast) return null;

  const goToToast = () => {
    clearToast();
    if (toast.type === "chat") {
      navigate("/dashboard/chat", {
        state: toast.fromUserId ? { openUserId: toast.fromUserId } : undefined,
      });
      return;
    }
    navigate("/dashboard/notificaciones");
  };

  return (
    <button type="button" className="notif_toast" onClick={goToToast}>
      <span className={`notif_toast_icon ${toast.type === "chat" ? "is-chat" : ""}`}>
        {toast.type === "chat" ? <FaComments /> : <FaBell />}
      </span>
      <span className="notif_toast_copy">
        <strong>{toast.type === "chat" ? "Nuevo mensaje" : "Nueva notificación"}</strong>
        <small>{toast.message}</small>
      </span>
    </button>
  );
};

export default NotificationAlerts;
