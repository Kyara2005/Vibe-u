import { Routes, Route, BrowserRouter, Navigate } from "react-router-dom";
import { useEffect } from "react";
import AOS from "aos";
import "aos/dist/aos.css";

import Landing from "./pages/Landing";
import Register from "./pages/register/Register";
import Login from "./pages/login/Login";
import Contacto from "./pages/contacto/Contacto";
import Eventos from "./pages/eventos/Eventos";
import Beneficios from "./pages/beneficios/Beneficios";
import ForgotPassword from "./pages/forgot-password/ForgotPassword";
import ResetPassword from "./pages/ResetPassword";
import { Confirm } from "./pages/confirm";

import UserDashboard from "./pages/dashboard/UserDashboard";
import FeedView from "./pages/dashboard/views/FeedView";
import CreatePostView from "./pages/dashboard/views/CreatePostView";
import ChatView from "./pages/dashboard/views/ChatView";
import EventsView from "./pages/dashboard/views/EventsView";
import ProfileView from "./pages/dashboard/views/ProfileView";
import UserPublicProfileView from "./pages/dashboard/views/UserPublicProfileView";
import NotificationsView from "./pages/dashboard/views/NotificationsView";
import SettingsView from "./pages/dashboard/views/SettingsView";
import Perfil from "./pages/perfil/Perfil";
import Matches from "./pages/Matches/Matches";
import MUsuario from "./pages/MUsuario/MUsuario";
import ActualizarInfo from "./Actualizacion/ActualizarInfo.jsx";
import ChangePasswordForm from "./pages/Password/ActualizarPass.jsx";
import Grupos from "./pages/Grupos/Grupos.jsx";
import Gusuario from "./pages/gusuarios/Gusuarios.jsx";
import Gautomatizacion from "./pages/Gautomatizacion/Gautomatizacion.jsx";
import Gmoderacion from "./pages/Gmoderacion/Gmoderacion.jsx";

import PublicRoute from "./routes/PublicRouter.jsx";
import PrivateRoute from "./routes/PrivateRouter.jsx";
import MobileOnlyRoute from "./routes/MobileOnlyRoute.jsx";
import AdminRoute from "./routes/AdminRoute.jsx";
import AdminLayout from "./routes/AdminLayout.jsx";

import storeProfile from "./context/storeProfile";
import storeAuth from "./context/storeAuth";
import { getSessionToken, isTokenExpired } from "./utils/authToken";
import { applyTheme, getInitialTheme } from "./utils/theme";

function App() {
  const profile = storeProfile((state) => state.profile);
  const tokenFromStore = storeAuth((state) => state.token);
  const setToken = storeAuth((state) => state.setToken);
  const clearToken = storeAuth((state) => state.clearToken);
  const token = tokenFromStore || getSessionToken();

  useEffect(() => {
    if (!token) return;
    if (!tokenFromStore && token) {
      setToken(token);
    }
    if (isTokenExpired(token)) {
      clearToken();
      localStorage.removeItem("token");
      return;
    }
    profile();
  }, [token, tokenFromStore, setToken, profile, clearToken]);

  useEffect(() => {
    AOS.init({ once: true, duration: 800 });
  }, []);

  useEffect(() => {
    applyTheme(getInitialTheme());
  }, []);

  return (
    <BrowserRouter>
      <Routes>
        <Route element={<PublicRoute />}>
          <Route path="/" element={<Landing />} />
          <Route path="login" element={<Login />} />
          <Route path="register" element={<Register />} />
          <Route path="confirmar/:token" element={<Confirm />} />
          <Route path="forgot-password" element={<ForgotPassword />} />
          <Route path="recuperarpassword/:token" element={<ResetPassword />} />
        </Route>

        <Route element={<PrivateRoute />}>
          <Route path="dashboard" element={<UserDashboard />}>
            <Route index element={<Navigate to="feed" replace />} />
            <Route path="feed" element={<FeedView />} />
            <Route path="publicar" element={<CreatePostView />} />
            <Route path="chat" element={<ChatView />} />
            <Route path="eventos" element={<EventsView />} />
            <Route path="perfil" element={<ProfileView />} />
            <Route path="usuario/:id" element={<UserPublicProfileView />} />
            <Route path="micuenta" element={<MUsuario />} />
            <Route path="notificaciones" element={<NotificationsView />} />
            <Route path="ajustes" element={<SettingsView />} />
          </Route>
          <Route path="perfil" element={<Perfil />} />
          <Route path="musuario" element={<Navigate to="/dashboard/micuenta" replace />} />
          <Route path="actualizar-info" element={<ActualizarInfo />} />
          <Route path="actualizar-pass" element={<ChangePasswordForm />} />
          <Route element={<AdminRoute />}>
            <Route element={<AdminLayout />}>
              <Route path="gusuarios" element={<Gusuario />} />
              <Route path="gautomatizacion" element={<Gautomatizacion />} />
              <Route path="gmoderacion" element={<Gmoderacion />} />
            </Route>
          </Route>

          <Route element={<MobileOnlyRoute />}>
            <Route path="grupos" element={<Grupos />} />
            <Route path="matches" element={<Matches />} />
          </Route>
        </Route>

        <Route path="contacto" element={<Contacto />} />
        <Route path="eventos" element={<Eventos />} />
        <Route path="beneficios" element={<Beneficios />} />
        <Route path="*" element={<div>Pagina no encontrada</div>} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
