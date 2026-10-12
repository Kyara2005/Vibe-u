const NotifBadge = ({ count = 0 }) => {
  if (!count) return null;
  return (
    <span className="notif_badge" aria-label={`${count} notificaciones nuevas`}>
      {count > 9 ? "9+" : count}
    </span>
  );
};

export default NotifBadge;
