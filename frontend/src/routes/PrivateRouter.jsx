import { useEffect } from "react";
import { Navigate, Outlet } from "react-router-dom";
import storeAuth from "../context/storeAuth";
import NotificationAlerts from "../components/notifications/NotificationAlerts";
import { getSessionToken, isTokenExpired } from "../utils/authToken";

const PrivateRoute = () => {
  const tokenFromStore = storeAuth((state) => state.token);
  const setToken = storeAuth((state) => state.setToken);
  const clearToken = storeAuth((state) => state.clearToken);
  const tokenFromSession = getSessionToken();
  const token = tokenFromStore || tokenFromSession;
  const expired = isTokenExpired(token);

  useEffect(() => {
    if (!tokenFromStore && tokenFromSession) {
      setToken(tokenFromSession);
    }
  }, [tokenFromStore, tokenFromSession, setToken]);

  if (token && expired) {
    clearToken();
    localStorage.removeItem("token");
  }

  if (!token || expired) {
    return <Navigate to="/login" replace />;
  }

  return (
    <>
      <NotificationAlerts />
      <Outlet />
    </>
  );
};

export default PrivateRoute;
