import { NavLink } from "react-router-dom";
import { useEffect, useState } from "react";
import {
  FaHome,
  FaPlusCircle,
  FaComments,
  FaCalendarAlt,
  FaUsers,
  FaHeart,
  FaUser,
  FaCog,
  FaBell,
  FaIdBadge,
  FaUserShield,
  FaChartBar,
  FaRobot,
  FaBars,
  FaTimes,
} from "react-icons/fa";
import { isMobileAccess } from "../utils/mobileAccess";
import storeNotifications from "../context/storeNotifications";
import NotifBadge from "./notifications/NotifBadge";
import "./notifications/NotificationAlerts.css";

const Sidebar = () => {
  const navClass = ({ isActive }) =>
    `menu_btn__dash ${isActive ? "menu_btn_active__dash" : ""}`;
  const adminNavClass = ({ isActive }) =>
    `admin_menu_btn__dash ${isActive ? "admin_menu_btn_active__dash" : ""}`;

  const rol = localStorage.getItem("rol");
  const isAdmin = rol === "administrador";

  const [isMobileUser, setIsMobileUser] = useState(isMobileAccess());
  const [isOpen, setIsOpen] = useState(false);
  const unreadCount = storeNotifications((state) => state.unreadCount);
  const chatUnreadCount = storeNotifications((state) => state.chatUnreadCount);

  useEffect(() => {
    const onResize = () => {
      setIsMobileUser(isMobileAccess());
      // Si pasa a escritorio, cerrar el menú para que no quede oculto
      if (window.innerWidth > 770) setIsOpen(false);
    };
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  // Cierra el menú al navegar en móvil
  const handleNavClick = () => {
    if (isMobileUser) setIsOpen(false);
  };

  if (isAdmin) {
    return (
      <aside className={`admin_sidebar__dash ${isOpen ? "is-open" : ""}`}>
        <div className="admin_sidebar_header__dash">
          <div className="admin_sidebar_brand__dash">
            <h1>Vibe-U</h1>
            <p>Vista de administracion</p>
          </div>

          <button
            className="admin_sidebar_toggle__dash"
            onClick={() => setIsOpen((prev) => !prev)}
            aria-label={isOpen ? "Cerrar menu" : "Abrir menu"}
          >
            {isOpen ? <FaTimes /> : <FaBars />}
            {!isOpen ? <NotifBadge count={unreadCount} /> : null}
          </button>
        </div>

        <div className="admin_sidebar_body__dash">
          <nav className="admin_menu__dash">
            <span className="admin_menu_label__dash">Panel Admin</span>
            <NavLink className={adminNavClass} to="/gusuarios" onClick={handleNavClick}>
              <FaUserShield /> Gestion usuarios
            </NavLink>
            <NavLink className={adminNavClass} to="/gautomatizacion" onClick={handleNavClick}>
              <FaChartBar /> Automatizacion
            </NavLink>
            <NavLink className={adminNavClass} to="/gmoderacion" onClick={handleNavClick}>
              <FaRobot /> Moderacion IA
            </NavLink>
            <NavLink className={adminNavClass} to="/dashboard/notificaciones" onClick={handleNavClick}>
              <span className="notif_icon_wrap">
                <FaBell />
                <NotifBadge count={unreadCount} />
              </span>
              Notificaciones
            </NavLink>
            <NavLink className={adminNavClass} to="/dashboard/micuenta" onClick={handleNavClick}>
              <FaIdBadge /> Mi cuenta
            </NavLink>
            <NavLink className={adminNavClass} to="/dashboard/ajustes" onClick={handleNavClick}>
              <FaCog /> Ajustes
            </NavLink>
          </nav>
        </div>
      </aside>
    );
  }

  return (
    <aside className={`sidebar__dash ${isOpen ? "is-open" : ""}`}>

      {/* Cabecera: siempre visible */}
      <div className="sidebar_header__dash">
        <div className="sidebar_brand__dash">
          <h1>Vibe-U</h1>
          <p>La app que pone a la U en modo social</p>
        </div>

        {/* Botón hamburguesa — solo visible en móvil vía CSS */}
        <button
          className="sidebar_toggle__dash"
          onClick={() => setIsOpen((prev) => !prev)}
          aria-label={isOpen ? "Cerrar menú" : "Abrir menú"}
        >
          {isOpen ? <FaTimes /> : <FaBars />}
          {!isOpen ? <NotifBadge count={unreadCount} /> : null}
        </button>
      </div>

      {/* Cuerpo: oculto en móvil hasta que isOpen sea true */}
      <div className="sidebar_body__dash">
        <nav className="menu__dash">
          <span className="menu_label__dash">Dashboard</span>
          <NavLink className={navClass} to="/dashboard/feed" onClick={handleNavClick}>
            <FaHome /> Feed
          </NavLink>
          <NavLink className={navClass} to="/dashboard/publicar" onClick={handleNavClick}>
            <FaPlusCircle /> Publicar
          </NavLink>
          <NavLink className={navClass} to="/dashboard/chat" onClick={handleNavClick}>
            <span className="notif_icon_wrap">
              <FaComments />
              <NotifBadge count={chatUnreadCount} />
            </span>
            Chat
          </NavLink>
          <NavLink className={navClass} to="/dashboard/eventos" onClick={handleNavClick}>
            <FaCalendarAlt /> Eventos U
          </NavLink>
          <NavLink className={navClass} to="/dashboard/perfil" onClick={handleNavClick}>
            <FaUser /> Perfil
          </NavLink>
          <NavLink className={navClass} to="/dashboard/micuenta" onClick={handleNavClick}>
            <FaIdBadge /> Mi cuenta
          </NavLink>
          <NavLink className={navClass} to="/dashboard/notificaciones" onClick={handleNavClick}>
            <span className="notif_icon_wrap">
              <FaBell />
              <NotifBadge count={unreadCount} />
            </span>
            Notificaciones
          </NavLink>
          <NavLink className={navClass} to="/dashboard/ajustes" onClick={handleNavClick}>
            <FaCog /> Ajustes
          </NavLink>
        </nav>

        <div className="quick_links__dash">
          {isMobileUser && (
            <>
              <span className="menu_label__dash">Comunidad</span>
              <NavLink className={navClass} to="/grupos" onClick={handleNavClick}>
                <FaUsers /> Grupos
              </NavLink>
              <NavLink className={navClass} to="/matches" onClick={handleNavClick}>
                <FaHeart /> Match
              </NavLink>
            </>
          )}

          {isAdmin && (
            <>
              <span className="menu_label__dash">Administracion</span>
              <NavLink className={navClass} to="/gusuarios" onClick={handleNavClick}>
                <FaUserShield /> Gestion usuarios
              </NavLink>
              <NavLink className={navClass} to="/gautomatizacion" onClick={handleNavClick}>
                <FaChartBar /> Automatizacion
              </NavLink>
            </>
          )}
        </div>
      </div>
    </aside>
  );
};

export default Sidebar;
