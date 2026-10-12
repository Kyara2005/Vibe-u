import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { IoArrowBack } from "react-icons/io5";
import { FaBell } from "react-icons/fa";
import storeNotifications from "../../context/storeNotifications";
import NotifBadge from "../../components/notifications/NotifBadge";
import "../../components/notifications/NotificationAlerts.css";
import {
  getMatchCandidates,
  rejectMatchCandidate,
  sendMatchLike,
} from "../../Services/users";
import { resolveAvatarUrl } from "../../utils/mediaUrl";
import "./Matches.css";

const DEFAULT_AVATAR = "/default-avatar.svg";
const TEMP_REJECT_STORAGE_KEY = "matches_temp_reject_until_by_user";
const SWIPE_RESHOW_DELAY_MS = 24 * 60 * 60 * 1000;

const cleanExpiredRejects = (rejects = {}) => {
  const now = Date.now();
  return Object.entries(rejects).reduce((acc, [userId, expiresAt]) => {
    const parsed = Number(expiresAt);
    if (parsed > now) acc[userId] = parsed;
    return acc;
  }, {});
};

const loadTempRejects = () => {
  if (typeof window === "undefined") return {};
  try {
    const raw = localStorage.getItem(TEMP_REJECT_STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") return {};
    return cleanExpiredRejects(parsed);
  } catch {
    return {};
  }
};

const filterAvailableCandidates = (candidates = [], tempRejects = {}) => {
  const activeRejects = cleanExpiredRejects(tempRejects);
  return candidates.filter((user) => !activeRejects[user?._id]);
};

const Matches = () => {
  const [allCandidates, setAllCandidates] = useState([]);
  const [suggestedUsers, setSuggestedUsers] = useState([]);
  const [tempRejects, setTempRejects] = useState(() => loadTempRejects());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [isMobile, setIsMobile] = useState(
    typeof window !== "undefined" ? window.innerWidth <= 768 : false
  );
  const [currentIndex, setCurrentIndex] = useState(0);
  const [dragX, setDragX] = useState(0);
  const [touchStartX, setTouchStartX] = useState(null);
  const [swipeHint, setSwipeHint] = useState("");
  const [processing, setProcessing] = useState(false);
  const [matchModalOpen, setMatchModalOpen] = useState(false);
  const [matchedUserId, setMatchedUserId] = useState("");
  const navigate = useNavigate();
  const unreadCount = storeNotifications((state) => state.unreadCount);

  useEffect(() => {
    const onResize = () => setIsMobile(window.innerWidth <= 768);
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  const fetchSuggestedUsers = async () => {
    try {
      setLoading(true);
      setError("");
      const { data } = await getMatchCandidates();
      const candidates = Array.isArray(data) ? data : [];
      setAllCandidates(candidates);
      setSuggestedUsers(filterAvailableCandidates(candidates, tempRejects));
    } catch (requestError) {
      console.error("Error al cargar matches:", requestError);
      setError("No se pudieron cargar los usuarios registrados.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSuggestedUsers();
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const cleaned = cleanExpiredRejects(tempRejects);
    localStorage.setItem(TEMP_REJECT_STORAGE_KEY, JSON.stringify(cleaned));
    setSuggestedUsers(filterAvailableCandidates(allCandidates, cleaned));
  }, [tempRejects, allCandidates]);

  useEffect(() => {
    const intervalId = setInterval(() => {
      setTempRejects((prev) => {
        const cleaned = cleanExpiredRejects(prev);
        return JSON.stringify(cleaned) === JSON.stringify(prev) ? prev : cleaned;
      });
    }, 15000);

    return () => clearInterval(intervalId);
  }, []);

  useEffect(() => {
    if (currentIndex > suggestedUsers.length - 1) {
      setCurrentIndex(Math.max(0, suggestedUsers.length - 1));
    }
  }, [suggestedUsers, currentIndex]);

  const handleReject = async (userId) => {
    if (processing || !userId) return;
    const expiresAt = Date.now() + SWIPE_RESHOW_DELAY_MS;
    setTempRejects((prev) => ({
      ...cleanExpiredRejects(prev),
      [userId]: expiresAt,
    }));
    setSwipeHint("Lo verás de nuevo en 1 día");
    setTimeout(() => {
      setSwipeHint("");
    }, 900);
    try {
      await rejectMatchCandidate(userId);
    } catch {
      // El perfil se oculta localmente y reaparece al cumplirse el día.
    }
  };

  const closeMatchModal = () => {
    setMatchModalOpen(false);
    setMatchedUserId("");
  };

  const openMatchedChat = () => {
    const userId = matchedUserId;
    closeMatchModal();
    if (!userId) return;
    navigate("/dashboard/chat", {
      state: {
        openUserId: userId,
        fromMatch: true,
      },
    });
  };

  const handleLike = async (userId) => {
    if (processing || !userId) return;
    try {
      setProcessing(true);
      const { data } = await sendMatchLike(userId);
      if (data?.matched) {
        setSwipeHint("Match!");
        setMatchedUserId(userId);
        setMatchModalOpen(true);
      } else {
        setSwipeHint("Like enviado");
        setTimeout(() => {
          setSwipeHint("");
        }, 120);
      }
      setTempRejects((prev) => {
        const next = { ...prev };
        delete next[userId];
        return next;
      });
      setAllCandidates((prev) => prev.filter((item) => item._id !== userId));
    } catch (requestError) {
      setError(requestError?.response?.data?.msg || "No se pudo enviar like.");
    } finally {
      setProcessing(false);
    }
  };

  const handleTouchStart = (event) => {
    if (!isMobile) return;
    setTouchStartX(event.touches[0].clientX);
    setSwipeHint("");
  };

  const handleTouchMove = (event) => {
    if (!isMobile || touchStartX === null || processing) return;
    const currentX = event.touches[0].clientX;
    const delta = currentX - touchStartX;
    setDragX(delta);
    if (delta > 35) setSwipeHint("Like");
    else if (delta < -35) setSwipeHint("Rechazar");
    else setSwipeHint("");
  };

  const handleTouchEnd = (userId) => {
    if (!isMobile || processing) return;
    const threshold = 90;
    if (dragX >= threshold) {
      handleLike(userId);
    } else if (dragX <= -threshold) {
      handleReject(userId);
    }
    setDragX(0);
    setTouchStartX(null);
    setTimeout(() => setSwipeHint(""), 200);
  };

  const currentUser = suggestedUsers[currentIndex];

  return (
    <section className="matches-section">
      <header className="matches-topbar">
        <button className="matches-back-btn" type="button" onClick={() => navigate(-1)} aria-label="Volver">
          <IoArrowBack size={22} />
        </button>
        <div className="matches-heading">
          <h2 className="matches-title">Tus posibles matches</h2>
          <p className="matches-subtitle">
            Desliza a la derecha para dar like. Si es mutuo, se abre el chat.
          </p>
        </div>
        <button
          className="matches-back-btn"
          type="button"
          onClick={() => navigate("/dashboard/notificaciones")}
          aria-label="Notificaciones"
          style={{ position: "relative" }}
        >
          <FaBell />
          <NotifBadge count={unreadCount} />
        </button>
      </header>

      {loading ? <p className="matches-state">Cargando usuarios...</p> : null}
      {error ? <p className="matches-state matches-error">{error}</p> : null}
      {!loading && !error && suggestedUsers.length === 0 ? (
        <p className="matches-state">No hay usuarios disponibles por ahora.</p>
      ) : null}

      {isMobile ? (
        <div className="matches-swipe-wrapper">
          {!loading && !error && !currentUser ? (
            <p className="matches-state">Ya no hay mas perfiles por hoy.</p>
          ) : null}

          {currentUser ? (
            <div
              key={currentUser._id}
              className="match-card match-card-swipe"
              style={{
                transform: `translateX(${dragX}px) rotate(${dragX * 0.03}deg)`,
                transition: touchStartX === null ? "transform 0.2s ease" : "none",
              }}
              onTouchStart={handleTouchStart}
              onTouchMove={handleTouchMove}
              onTouchEnd={() => handleTouchEnd(currentUser._id)}
            >
              {swipeHint ? <div className="swipe-hint">{swipeHint}</div> : null}
              <img
                src={resolveAvatarUrl(currentUser.avatar) || DEFAULT_AVATAR}
                alt={currentUser.nombre || "Usuario"}
                className="match-avatar"
                onError={(event) => {
                  event.currentTarget.src = DEFAULT_AVATAR;
                }}
              />
              <h4>{currentUser.nombre || "Usuario"}</h4>
              {currentUser.incomingLike ? <span className="match-pill-like">Le interesas</span> : null}
              <p>{currentUser.universidad || currentUser.carrera || "Estudiante registrado"}</p>
            </div>
          ) : null}

          {currentUser ? (
            <div className="swipe-mobile-actions">
                <button
                  className="swipe-reject-btn"
                  type="button"
                  onClick={() => handleReject(currentUser._id)}
                  disabled={processing}
                >
                  No
              </button>
              <button
                className="swipe-like-btn"
                type="button"
                onClick={() => handleLike(currentUser._id)}
                disabled={processing}
              >
                Like
              </button>
            </div>
          ) : null}
        </div>
      ) : (
        <div className="matches-grid">
          {suggestedUsers.map((user) => (
            <div key={user._id} className="match-card">
              <img
                src={resolveAvatarUrl(user.avatar) || DEFAULT_AVATAR}
                alt={user.nombre || "Usuario"}
                className="match-avatar"
                onError={(event) => {
                  event.currentTarget.src = DEFAULT_AVATAR;
                }}
              />
              <h4>{user.nombre || "Usuario"}</h4>
              {user.incomingLike ? <span className="match-pill-like">Le interesas</span> : null}
              <p>{user.universidad || user.carrera || "Estudiante registrado"}</p>
              <div className="match-card-actions">
                <button className="connect-btn reject" type="button" onClick={() => handleReject(user._id)}>
                  Rechazar
                </button>
                <button className="connect-btn" type="button" onClick={() => handleLike(user._id)}>
                  Like
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {matchModalOpen ? (
        <div className="match-modal-overlay" role="dialog" aria-modal="true" aria-labelledby="match-modal-title">
          <div className="match-modal-card">
            <h3 id="match-modal-title">Compartaan gustos e intereses!!</h3>
            <p>Haz match para conversar y conocerse mejor.</p>
            <div className="match-modal-actions">
              <button type="button" className="connect-btn reject" onClick={closeMatchModal}>
                Luego
              </button>
              <button type="button" className="connect-btn" onClick={openMatchedChat}>
                Ir al chat
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
};

export default Matches;
