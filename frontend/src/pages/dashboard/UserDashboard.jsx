import { useEffect, useMemo, useState } from "react";
import { Outlet, useLocation, useNavigate } from "react-router-dom";
import { FaBell, FaChartBar, FaHeart, FaPlus, FaRobot, FaSearch, FaUserShield, FaUsers } from "react-icons/fa";
import Sidebar from "../../components/Sidebar";
import CreatePostView from "./views/CreatePostView";
import storeNotifications from "../../context/storeNotifications";
import NotifBadge from "../../components/notifications/NotifBadge";
import "../../components/notifications/NotificationAlerts.css";
import {
  comentarPost,
  eliminarComentarioPost,
  eliminarPost,
  obtenerPosts,
  toggleLikePost,
} from "../../Services/posts";
import { searchRegisteredUsers } from "../../Services/users";
import { getTokenPayload } from "../../utils/authToken";
import { resolveAvatarUrl, resolveUploadUrl } from "../../utils/mediaUrl";
import "./Dashboard.css";

const titleMap = {
  "/dashboard/feed": "Feed",
  "/dashboard/chat": "Chat",
  "/dashboard/eventos": "Eventos U",
  "/dashboard/perfil": "Perfil",
  "/dashboard/notificaciones": "Notificaciones",
  "/dashboard/ajustes": "Ajustes",
};

const subtitleMap = {
  "/dashboard/feed": "Publicaciones recientes de la comunidad",
  "/dashboard/chat": "Tus conversaciones activas",
  "/dashboard/eventos": "Eventos y actividades del campus",
  "/dashboard/perfil": "Informacion visible de tu cuenta",
  "/dashboard/notificaciones": "Actividad y avisos",
  "/dashboard/ajustes": "Configuracion rapida",
};

const UserDashboard = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const currentPath = location.pathname;
  const title = currentPath.startsWith("/dashboard/usuario/")
    ? "Perfil publico"
    : (titleMap[currentPath] || "Dashboard");
  const subtitle = currentPath.startsWith("/dashboard/usuario/")
    ? "Revisa su perfil y gestiona amistad"
    : (subtitleMap[currentPath] || "Panel principal");
  const role = localStorage.getItem("rol");
  const isAdmin = role === "administrador";
  const [search, setSearch] = useState("");
  const [searchUsers, setSearchUsers] = useState([]);
  const [searchGroups, setSearchGroups] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [isMobileLayout, setIsMobileLayout] = useState(
    typeof window !== "undefined" ? window.innerWidth <= 770 : false
  );
  const [showMobileSearch, setShowMobileSearch] = useState(false);
  const unreadCount = storeNotifications((state) => state.unreadCount);

  useEffect(() => {
    const onResize = () => {
      const mobile = window.innerWidth <= 770;
      setIsMobileLayout(mobile);
      if (!mobile) setShowMobileSearch(false);
    };
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  useEffect(() => {
    const term = search.trim();
    if (!term) {
      setSearchUsers([]);
      setSearchGroups([]);
      setShowSuggestions(false);
      return;
    }

    const timer = setTimeout(async () => {
      try {
        const [usersRes, groupsRes] = await Promise.all([
          searchRegisteredUsers(term),
          fetch(`${import.meta.env.VITE_BACKEND_URL}/api/grupos/listar`),
        ]);

        const users = Array.isArray(usersRes?.data) ? usersRes.data : [];
        const groupsData = await groupsRes.json();
        const groups = Array.isArray(groupsData) ? groupsData : [];
        const normalizedTerm = term.toLowerCase();
        const similarityRank = (value = "") => {
          const v = value.toLowerCase();
          if (!v) return 99;
          if (v === normalizedTerm) return 0;
          if (v.startsWith(normalizedTerm)) return 1;
          if (v.includes(normalizedTerm)) return 2;
          return 99;
        };

        const similarUsers = users
          .map((u) => ({ ...u, __rank: similarityRank(u.nombre || "") }))
          .filter((u) => u.__rank < 99)
          .sort((a, b) => a.__rank - b.__rank || (a.nombre || "").localeCompare(b.nombre || ""));

        const similarGroups = groups
          .map((g) => ({ ...g, __rank: similarityRank(g.nombre || "") }))
          .filter((g) => g.__rank < 99)
          .sort((a, b) => a.__rank - b.__rank || (a.nombre || "").localeCompare(b.nombre || ""));

        setSearchUsers(similarUsers.slice(0, 7));
        setSearchGroups(similarGroups.slice(0, 5));
        setShowSuggestions(true);
      } catch {
        setSearchUsers([]);
        setSearchGroups([]);
        setShowSuggestions(false);
      }
    }, 250);

    return () => clearTimeout(timer);
  }, [search]);

  const hasSuggestions = useMemo(
    () => searchUsers.length > 0 || searchGroups.length > 0,
    [searchUsers, searchGroups]
  );

  const renderSearchBox = (isMobile = false) => (
    <div className={`search_box__dash ${isMobile ? "mobile_search_panel__dash" : ""}`}>
      <input
        className="input__dash"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        onFocus={() => {
          if (search.trim()) setShowSuggestions(true);
        }}
        onBlur={() => {
          setTimeout(() => setShowSuggestions(false), 120);
        }}
        placeholder="Buscar personas, grupos o eventos..."
      />
      {showSuggestions && hasSuggestions ? (
        <div className="search_suggestions__dash">
          {searchUsers.map((user) => (
            <button
              type="button"
              key={user._id}
              className="suggestion_item__dash"
              onClick={() => {
                setSearch(user.nombre);
                setShowSuggestions(false);
                if (isMobile) setShowMobileSearch(false);
                navigate(`/dashboard/usuario/${user._id}`);
              }}
            >
              <div className="suggestion_profile_row__dash">
                <img
                  src={resolveAvatarUrl(user.avatar)}
                  alt={user.nombre}
                  className="suggestion_avatar__dash"
                />
                <div className="suggestion_profile_meta__dash">
                  <strong>{user.nombre}</strong>
                  <span>
                    {user.perfilPublico === false
                      ? "Perfil privado"
                      : `${user.carrera || "Perfil"}${user.universidad ? ` • ${user.universidad}` : ""}`}
                  </span>
                </div>
              </div>
            </button>
          ))}
          {searchGroups.map((group) => (
            <button
              type="button"
              key={group._id}
              className="suggestion_item__dash"
              onClick={() => {
                setSearch(group.nombre);
                setShowSuggestions(false);
                if (isMobile) setShowMobileSearch(false);
                navigate("/grupos");
              }}
            >
              <strong>{group.nombre}</strong>
              <span>Grupo</span>
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );

  return (
    <div className="shell__dash">
      <Sidebar />

      <main className="content__dash">
        <header className="topbar__dash">
          <div>
            <h2>{title}</h2>
            {!isMobileLayout ? <p>{subtitle}</p> : null}
          </div>
          <div className="actions__dash">
            {isMobileLayout ? (
              <>
                <div className="mobile_actions__dash">
                  <button
                    type="button"
                    className="mobile_action_btn__dash"
                    onClick={() => navigate("/dashboard/notificaciones")}
                    aria-label="Notificaciones"
                    title="Notificaciones"
                  >
                    <FaBell />
                    <NotifBadge count={unreadCount} />
                  </button>
                  <button
                    type="button"
                    className="mobile_action_btn__dash"
                    onClick={() => setShowMobileSearch((prev) => !prev)}
                    aria-label="Buscar personas y grupos"
                    title="Buscar"
                  >
                    <FaSearch />
                  </button>
                  {isAdmin ? (
                    <>
                      <button
                        type="button"
                        className="mobile_action_btn__dash"
                        onClick={() => navigate("/gusuarios")}
                        aria-label="Gestion usuarios"
                        title="Gestion usuarios"
                      >
                        <FaUserShield />
                      </button>
                      <button
                        type="button"
                        className="mobile_action_btn__dash"
                        onClick={() => navigate("/gautomatizacion")}
                        aria-label="Automatizacion"
                        title="Automatizacion"
                      >
                        <FaChartBar />
                      </button>
                      <button
                        type="button"
                        className="mobile_action_btn__dash"
                        onClick={() => navigate("/gmoderacion")}
                        aria-label="Moderacion IA"
                        title="Moderacion IA"
                      >
                        <FaRobot />
                      </button>
                    </>
                  ) : (
                    <>
                      <button
                        type="button"
                        className="mobile_action_btn__dash"
                        onClick={() => navigate("/grupos")}
                        aria-label="Ir a grupos"
                        title="Grupos"
                      >
                        <FaUsers />
                      </button>
                      <button
                        type="button"
                        className="mobile_action_btn__dash"
                        onClick={() => navigate("/matches")}
                        aria-label="Ir a match"
                        title="Match"
                      >
                        <FaHeart />
                      </button>
                      <button
                        type="button"
                        className="mobile_action_btn__dash"
                        onClick={() => setShowCreateModal(true)}
                        aria-label="Nueva publicacion"
                        title="Nueva publicacion"
                      >
                        <FaPlus />
                      </button>
                    </>
                  )}
                </div>
                {showMobileSearch ? renderSearchBox(true) : null}
              </>
            ) : (
              <>
                {renderSearchBox()}
                <button
                  type="button"
                  className="topbar_bell__dash"
                  onClick={() => navigate("/dashboard/notificaciones")}
                  aria-label="Notificaciones"
                  title="Notificaciones"
                >
                  <FaBell />
                  <NotifBadge count={unreadCount} />
                </button>
                {isAdmin ? (
                  <>
                    <button className="button__dash" onClick={() => navigate("/gusuarios")}>Gestion usuarios</button>
                    <button className="button__dash" onClick={() => navigate("/gautomatizacion")}>Automatizacion</button>
                    <button className="button__dash" onClick={() => navigate("/gmoderacion")}>Moderacion IA</button>
                  </>
                ) : (
                  <button className="button__dash" onClick={() => setShowCreateModal(true)}>Nueva publicacion</button>
                )}
              </>
            )}
          </div>
        </header>

        <Outlet />
      </main>

      {!isAdmin && showCreateModal ? (
        <div className="create_modal_overlay__dash" role="dialog" aria-modal="true">
          <div className="create_modal__dash">
            <button
              type="button"
              className="create_modal_close__dash"
              onClick={() => setShowCreateModal(false)}
              aria-label="Cerrar modal"
            >
              x
            </button>
            <CreatePostView
              asModal
              onClose={() => setShowCreateModal(false)}
              onPublished={() => navigate("/dashboard/feed")}
            />
          </div>
        </div>
      ) : null}
    </div>
  );
};

export const PostCard = ({ post, onLike, onComment, onDeletePost, onDeleteComment, currentUserId }) => {
  const usuario = post?.usuario || {};
  const postOwnerId = usuario?._id?.toString?.() || "";
  const nombre = usuario.nombre || "Usuario";
  const avatar = resolveAvatarUrl(usuario.avatar);
  const postImage = resolveUploadUrl(post.imagen, "posts");
  const postVideo = resolveUploadUrl(post.video, "posts");
  const comentarios = Array.isArray(post.comentarios) ? post.comentarios.length : 0;
  const [commentText, setCommentText] = useState("");
  const [showComments, setShowComments] = useState(false);

  return (
    <article className="post_card__dash">
      <div className="post_meta__dash">
        <span style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <img src={avatar} alt={nombre} style={{ width: "28px", height: "28px", borderRadius: "50%" }} />
          <strong>@{nombre}</strong>
        </span>
        <span>Publicacion</span>
      </div>

      {post.texto && <p>{post.texto}</p>}
      {postImage ? (
        <div className="post_image_frame__dash">
          <img src={postImage} alt="post" className="post_image__dash" />
        </div>
      ) : null}
      {postVideo ? (
        <video controls className="post_video__dash">
          <source src={postVideo} />
          Tu navegador no soporta video.
        </video>
      ) : null}

      <div className="post_meta__dash">
        <span>{post.likes || 0} likes</span>
        <span>{comentarios} comentarios</span>
      </div>

      <div className="post_actions__dash">
        <button type="button" className="post_like_btn__dash" onClick={() => onLike?.(post._id)}>
          ❤️ Me gusta
        </button>
        {currentUserId && postOwnerId === currentUserId ? (
          <button type="button" className="post_delete_btn__dash" onClick={() => onDeletePost?.(post._id)}>
            🗑️ Eliminar post
          </button>
        ) : null}
        <button
          type="button"
          className="post_comment_btn__dash"
          onClick={() => setShowComments((prev) => !prev)}
        >
          💬 Comentarios ({comentarios})
        </button>
      </div>

      {showComments ? (
        <>
          <div className="post_comments__dash">
            {(post.comentarios || []).slice(-3).map((comment, index) => {
              const commentOwnerId = comment?.usuarioId?.toString?.() || "";
              const canDelete = Boolean(currentUserId && (commentOwnerId === currentUserId || postOwnerId === currentUserId));
              return (
                <div key={comment?._id || `${post._id}-c-${index}`} className="post_comment_item__dash">
                  <p>
                    <strong>{comment.usuario || "Usuario"}:</strong> {comment.texto}
                  </p>
                  {canDelete && comment?._id ? (
                    <button
                      type="button"
                      className="comment_delete_btn__dash"
                      onClick={() => onDeleteComment?.(post._id, comment._id)}
                    >
                      🗑️ Eliminar
                    </button>
                  ) : null}
                </div>
              );
            })}
          </div>

          <div className="chat_input__dash">
            <input
              className="input__dash"
              type="text"
              value={commentText}
              onChange={(e) => setCommentText(e.target.value)}
              placeholder="Escribe un comentario..."
            />
            <button
              className="button__dash"
              type="button"
              onClick={() => {
                const value = commentText.trim();
                if (!value) return;
                onComment?.(post._id, value);
                setCommentText("");
              }}
            >
              💬 Comentar
            </button>
          </div>
        </>
      ) : null}
    </article>
  );
};

export const Feed = ({ refreshKey = 0 }) => {
  const [posts, setPosts] = useState([]);
  const [loadingPosts, setLoadingPosts] = useState(true);
  const [feedError, setFeedError] = useState("");
  const [confirmModal, setConfirmModal] = useState({
    open: false,
    type: null,
    postId: null,
    commentId: null,
  });

  const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

  const cargarPostsConRetry = async () => {
    setLoadingPosts(true);
    setFeedError("");

    for (let attempt = 1; attempt <= 3; attempt += 1) {
      try {
        const res = await obtenerPosts({ page: 1, limit: 20 });
        setPosts(Array.isArray(res.data) ? res.data : []);
        setLoadingPosts(false);
        return;
      } catch (error) {
        if (attempt === 3) {
          setFeedError("No se pudo cargar el feed. Intenta nuevamente.");
          setLoadingPosts(false);
          return;
        }
        await wait(attempt * 450);
      }
    }
  };

  useEffect(() => {
    cargarPostsConRetry();

    const handlePostCreated = () => {
      cargarPostsConRetry();
    };
    window.addEventListener("dash:post-created", handlePostCreated);
    return () => window.removeEventListener("dash:post-created", handlePostCreated);
  }, [refreshKey]);

  const token = localStorage.getItem("token");
  const currentUserId = getTokenPayload(token)?.id || "";

  const replacePostInState = (updatedPost) => {
    setPosts((prev) => prev.map((post) => (post._id === updatedPost._id ? updatedPost : post)));
  };

  const handleLike = async (postId) => {
    try {
      if (!token) return;
      const res = await toggleLikePost(postId, token);
      replacePostInState(res.data);
    } catch (error) {
      console.error(error);
    }
  };

  const handleComment = async (postId, texto) => {
    try {
      if (!token) return;
      const res = await comentarPost(postId, texto, token);
      replacePostInState(res.data);
    } catch (error) {
      console.error(error);
    }
  };

  const handleDeletePost = async (postId) => {
    setConfirmModal({
      open: true,
      type: "post",
      postId,
      commentId: null,
    });
  };

  const handleDeleteComment = async (postId, commentId) => {
    setConfirmModal({
      open: true,
      type: "comment",
      postId,
      commentId,
    });
  };

  const closeConfirmModal = () => {
    setConfirmModal({
      open: false,
      type: null,
      postId: null,
      commentId: null,
    });
  };

  const confirmDeleteAction = async () => {
    try {
      if (!token) return;
      if (confirmModal.type === "post" && confirmModal.postId) {
        await eliminarPost(confirmModal.postId, token);
        setPosts((prev) => prev.filter((post) => post._id !== confirmModal.postId));
      }
      if (confirmModal.type === "comment" && confirmModal.postId && confirmModal.commentId) {
        const res = await eliminarComentarioPost(confirmModal.postId, confirmModal.commentId, token);
        replacePostInState(res.data);
      }
    } catch (error) {
      console.error(error);
    } finally {
      closeConfirmModal();
    }
  };

  return (
    <div>
      {loadingPosts ? <p className="chat_hint__dash">Cargando feed...</p> : null}
      {feedError ? (
        <div className="friend_actions__dash" style={{ marginBottom: "12px" }}>
          <p className="chat_error__dash" style={{ margin: 0 }}>{feedError}</p>
          <button className="button__dash" type="button" onClick={cargarPostsConRetry}>
            Reintentar
          </button>
        </div>
      ) : null}
      <div className="card_grid__dash">
        {posts.map((post) => (
          <PostCard
            key={post._id}
            post={post}
            onLike={handleLike}
            onComment={handleComment}
            onDeletePost={handleDeletePost}
            onDeleteComment={handleDeleteComment}
            currentUserId={currentUserId}
          />
        ))}
      </div>

      {confirmModal.open ? (
        <div className="confirm_modal_overlay__dash" role="dialog" aria-modal="true">
          <div className="confirm_modal__dash">
            <h4>Confirmar eliminacion</h4>
            <p>
              {confirmModal.type === "post"
                ? "Seguro de eliminar esta publicacion?"
                : "Seguro de eliminar este comentario?"}
            </p>
            <div className="confirm_modal_actions__dash">
              <button type="button" className="button__dash" onClick={closeConfirmModal}>
                Cancelar
              </button>
              <button type="button" className="post_delete_btn__dash" onClick={confirmDeleteAction}>
                Eliminar
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
};

export default UserDashboard;
