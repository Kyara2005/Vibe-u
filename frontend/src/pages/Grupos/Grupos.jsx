import React, { useState, useRef, useEffect, useCallback } from 'react';
import Cropper from 'react-easy-crop';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { 
    FaPlus, FaArrowLeft, FaThumbsUp, FaComment, FaSearch, FaTimes, FaEllipsisH, 
    FaGlobeAmericas, FaRegImage, FaUserFriends, FaUserCircle, FaTrash, FaSignOutAlt, FaRegFileAlt,
    FaRegBookmark, FaBookmark, FaPaperPlane, FaCheck, FaBell
} from 'react-icons/fa';
import './Grupos.css';
import { resolveAvatarUrl } from "../../utils/mediaUrl";
import { getInvitePeople, searchRegisteredUsers } from "../../Services/users";
import InterestChips from "../../components/interests/InterestChips";
import { sanitizeInterests } from "../../utils/interests";
import storeNotifications from "../../context/storeNotifications";
import NotifBadge from "../../components/notifications/NotifBadge";
import "../../components/notifications/NotificationAlerts.css";

const API_URL = `${import.meta.env.VITE_BACKEND_URL}/api/grupos`;
const DEFAULT_AVATAR = "/default-avatar.svg";

const Grupos = () => {
    const navigate = useNavigate();
    const unreadCount = storeNotifications((state) => state.unreadCount);
    // --- ESTADOS DE DATOS ---
    const [grupos, setGrupos] = useState([]);
    const [filtro, setFiltro] = useState("");
    const [pestana, setPestana] = useState("todos");
    const [menuAbiertoId, setMenuAbiertoId] = useState(null);
    const [loading, setLoading] = useState(false);

    // --- ESTADO DEL USUARIO ---
    const [userName, setUserName] = useState("Usuario");
    const [userRole, setUserRole] = useState(""); 
    const [avatar, setAvatar] = useState(null);
    const userEmail = localStorage.getItem("correo");

    // --- ESTADOS DE NAVEGACIÓN Y POSTS ---
    const [grupoActivo, setGrupoActivo] = useState(() => {
        const persistido = localStorage.getItem("ultimoGrupoVisitado");
        return persistido ? JSON.parse(persistido) : null;
    });
    const [nuevoPost, setNuevoPost] = useState("");
    const [fotoPost, setFotoPost] = useState(null);
    const [likes, setLikes] = useState({});
    const [guardados, setGuardados] = useState({});

    // --- ESTADOS DE COMENTARIOS (AUMENTADOS) ---
    const [comentarioTexto, setComentarioTexto] = useState({});
    const [comentariosAbiertos, setComentariosAbiertos] = useState({});

    // --- ESTADOS DE CREACIÓN Y RECORTE ---
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [nuevoGrupo, setNuevoGrupo] = useState({ nombre: "", imagen: "", tags: [], descripcion: "" });
    const [imageToCrop, setImageToCrop] = useState(null);
    const [crop, setCrop] = useState({ x: 0, y: 0 });
    const [zoom, setZoom] = useState(1);
    const [rotation, setRotation] = useState(0);
    const [croppedAreaPixels, setCroppedAreaPixels] = useState(null);
    const [inviteOpen, setInviteOpen] = useState(false);
    const [membersOpen, setMembersOpen] = useState(false);
    const [inviteQuery, setInviteQuery] = useState("");
    const [inviteResults, setInviteResults] = useState([]);
    const [inviteError, setInviteError] = useState("");
    const [inviteOk, setInviteOk] = useState("");
    const [inviteBusy, setInviteBusy] = useState(false);
    const [inviteConfirm, setInviteConfirm] = useState(null);
    const [invitePool, setInvitePool] = useState([]);
    const [miembros, setMiembros] = useState([]);
    const [membersError, setMembersError] = useState("");

    const fileInputRef = useRef(null);
    const postFotoRef = useRef(null);
    const token = localStorage.getItem("token");

    // --- LÓGICA DE DESPLIEGUE ---
    const toggleComentarios = (postId) => {
        setComentariosAbiertos(prev => ({
            ...prev,
            [postId]: !prev[postId]
        }));
    };

    // --- 1. CARGAR PERFIL ---
    useEffect(() => {
        const fetchUserInfo = async () => {
            try {
                const token = localStorage.getItem('token');
                if (!token) return;
                const response = await axios.get(
                    `${import.meta.env.VITE_BACKEND_URL}/api/usuarios/perfil`, 
                    { headers: { Authorization: `Bearer ${token}` } }
                );
                if (response.data?.nombre) setUserName(response.data.nombre);
                if (response.data?.avatar) setAvatar(response.data.avatar);
                if (response.data?.rol) setUserRole(response.data.rol);
            } catch (error) {
                console.error("Error al obtener el perfil:", error);
            }
        };
        fetchUserInfo();
    }, []);

    // --- 2. CARGAR GRUPOS ---
    const cargarGrupos = async () => {
        try {
            const res = await fetch(`${API_URL}/listar`);
            const data = await res.json();
            setGrupos(data);
        } catch (error) { console.error("Error al cargar grupos:", error); }
    };

    useEffect(() => { cargarGrupos(); }, []);

    useEffect(() => {
        const interval = setInterval(() => {
            cargarGrupos();
        }, 3000);
        return () => clearInterval(interval);
    }, []);

    // --- 3. PERSISTENCIA ---
    useEffect(() => {
        if (grupoActivo) {
            localStorage.setItem("ultimoGrupoVisitado", JSON.stringify(grupoActivo));
        } else {
            localStorage.removeItem("ultimoGrupoVisitado");
        }
    }, [grupoActivo]);

    // --- 4. LÓGICA DE RECORTE ---
    const onCropComplete = useCallback((_ , pixels) => {
        setCroppedAreaPixels(pixels);
    }, []);

    const handleConfirmCrop = async () => {
        try {
            const image = new Image();
            image.src = imageToCrop;
            await image.decode();
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            canvas.width = croppedAreaPixels.width;
            canvas.height = croppedAreaPixels.height;
            ctx.drawImage(
                image,
                croppedAreaPixels.x, croppedAreaPixels.y, croppedAreaPixels.width, croppedAreaPixels.height,
                0, 0, croppedAreaPixels.width, croppedAreaPixels.height
            );
            setNuevoGrupo((prev) => ({ ...prev, imagen: canvas.toDataURL('image/jpeg') }));
            setImageToCrop(null); 
        } catch (e) { console.error("Error al recortar", e); }
    };

    // --- 5. ACCIONES DE GRUPO ---
    const handleUnirseGrupo = async (grupo) => {
        try {
            if (!token) return navigate("/login");
            const res = await fetch(`${API_URL}/${grupo._id}/unirse`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`
                }
            });
            if (res.ok) { cargarGrupos(); }
        } catch (error) { console.error(error); }
    };

    const handleAbandonarGrupo = async (id) => {
        if (!window.confirm("¿Seguro que quieres abandonar el grupo?")) return;
        try {
            if (!token) return navigate("/login");
            const res = await fetch(`${API_URL}/${id}/abandonar`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`
                }
            });
            if (res.ok) { cargarGrupos(); setGrupoActivo(null); }
        } catch (error) { console.error(error); }
    };

    const handleEliminarGrupo = async (id) => {
        if (!window.confirm("¿Eliminar este grupo definitivamente?")) return;
        try {
            if (!token) return navigate("/login");
            const res = await fetch(`${API_URL}/${id}`, {
                method: 'DELETE',
                headers: { Authorization: `Bearer ${token}` },
            });
            if (res.ok) { cargarGrupos(); setGrupoActivo(null); }
        } catch (error) { console.error(error); }
    };

    const handleCrearGrupo = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            if (!token) return navigate("/login");
            const res = await fetch(`${API_URL}/crear`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`
                },
                body: JSON.stringify({
                    nombre: nuevoGrupo.nombre,
                    imagen: nuevoGrupo.imagen,
                    descripcion: nuevoGrupo.descripcion,
                    tags: sanitizeInterests(nuevoGrupo.tags),
                })
            });
            const data = await res.json();
            setGrupos([data, ...grupos]);
            setIsModalOpen(false);
            setNuevoGrupo({ nombre: "", imagen: "", tags: [], descripcion: "" });
        } catch (error) { console.error(error); }
        finally { setLoading(false); }
    };

    // --- 6. PUBLICACIONES Y COMENTARIOS (AUMENTADO) ---
    const handlePublicar = async (e) => {
        e.preventDefault();
        if (!nuevoPost.trim() && !fotoPost) return;
        setLoading(true);
        try {
            if (!token) return navigate("/login");
            const res = await fetch(`${API_URL}/${grupoActivo._id}/post`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`
                },
                body: JSON.stringify({ 
                    contenido: nuevoPost, 
                    foto: fotoPost 
                })
            });
            const postGuardado = await res.json();
            setGrupos(prev => prev.map(g => g._id === grupoActivo._id ? { ...g, posts: [postGuardado, ...g.posts] } : g));
            setNuevoPost(""); 
            setFotoPost(null);
        } catch (error) { console.error(error); }
        finally { setLoading(false); }
    };

    const handleComentar = async (e, postId) => {
        e.preventDefault();
        const texto = comentarioTexto[postId];
        if (!texto?.trim()) return;

        try {
            if (!token) return navigate("/login");
            const res = await fetch(`${API_URL}/${grupoActivo._id}/post/${postId}/comentar`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`
                },
                body: JSON.stringify({
                    contenido: texto
                })
            });

            if (res.ok) {
                const nuevoComentario = await res.json();
                setGrupos(prev => prev.map(g => {
                    if (g._id === grupoActivo._id) {
                        return {
                            ...g,
                            posts: g.posts.map(p => 
                                p._id === postId ? { ...p, comentarios: [...(p.comentarios || []), nuevoComentario] } : p
                            )
                        };
                    }
                    return g;
                }));
                setComentarioTexto(prev => ({ ...prev, [postId]: "" }));
            }
        } catch (error) {
            console.error("Error al comentar:", error);
        }
    };

    const handleEliminarPost = async (postId) => {
        if (!window.confirm("¿Eliminar esta publicación?")) return;
        try {
            if (!token) return navigate("/login");
            const res = await fetch(`${API_URL}/${grupoActivo._id}/post/${postId}`, {
                method: "DELETE",
                headers: { Authorization: `Bearer ${token}` },
            });
            if (!res.ok) return;

            setGrupos((prev) =>
                prev.map((g) =>
                    g._id === grupoActivo._id
                        ? { ...g, posts: (g.posts || []).filter((p) => p._id !== postId) }
                        : g
                )
            );
            setMenuAbiertoId(null);
        } catch (error) {
            console.error("Error al eliminar post:", error);
        }
    };

    const handleEliminarComentario = async (postId, comentarioId) => {
        if (!window.confirm("¿Eliminar este comentario?")) return;
        try {
            if (!token) return navigate("/login");
            const res = await fetch(`${API_URL}/${grupoActivo._id}/post/${postId}/comentario/${comentarioId}`, {
                method: "DELETE",
                headers: { Authorization: `Bearer ${token}` },
            });
            if (!res.ok) return;

            setGrupos((prev) =>
                prev.map((g) => {
                    if (g._id !== grupoActivo._id) return g;
                    return {
                        ...g,
                        posts: (g.posts || []).map((p) =>
                            p._id === postId
                                ? {
                                      ...p,
                                      comentarios: (p.comentarios || []).filter((c) => c._id !== comentarioId),
                                  }
                                : p
                        ),
                    };
                })
            );
        } catch (error) {
            console.error("Error al eliminar comentario:", error);
        }
    };

    const handleImagePreview = (e, destino) => {
        const file = e.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onloadend = () => {
            if (destino === 'grupo') setImageToCrop(reader.result);
            else if (destino === 'post') setFotoPost(reader.result);
        };
        reader.readAsDataURL(file);
    };

    const entrarAGrupo = (grupo) => setGrupoActivo(grupo);
    const salirDeGrupo = () => {
        setGrupoActivo(null);
        setInviteOpen(false);
        setMembersOpen(false);
        setInviteQuery("");
        setInviteResults([]);
        setMiembros([]);
    };
    const toggleLike = (postId) => setLikes(prev => ({ ...prev, [postId]: !prev[postId] }));
    const toggleGuardar = (postId) => setGuardados(prev => ({ ...prev, [postId]: !prev[postId] }));

    const cargarMiembros = async (grupoId) => {
        try {
            if (!token) return navigate("/login");
            setMembersError("");
            const res = await fetch(`${API_URL}/${grupoId}/miembros`, {
                headers: { Authorization: `Bearer ${token}` },
            });
            const data = await res.json();
            if (!res.ok) {
                setMembersError(data?.message || "No se pudieron cargar los miembros.");
                setMiembros([]);
                return [];
            }
            setMiembros(Array.isArray(data) ? data : []);
            return Array.isArray(data) ? data : [];
        } catch (error) {
            console.error(error);
            setMembersError("No se pudieron cargar los miembros.");
            return [];
        }
    };

    const abrirMiembros = async (grupoId) => {
        setMembersOpen(true);
        await cargarMiembros(grupoId);
    };

    const filterInvitePeople = (people = [], membersList = miembros) => {
        const memberIds = new Set(membersList.map((user) => String(user._id)));
        const emails = new Set((grupoActivo?.miembrosArray || []).map((email) => String(email).toLowerCase()));
        return people.filter((user) => {
            if (memberIds.has(String(user._id))) return false;
            const email = String(user.correoInstitucional || "").toLowerCase();
            return !email || !emails.has(email);
        });
    };

    const abrirInvitar = async () => {
        setInviteError("");
        setInviteOk("");
        setInviteQuery("");
        setInviteOpen(true);
        try {
            if (!token) return navigate("/login");
            const membersList = grupoActivo?._id ? await cargarMiembros(grupoActivo._id) : [];
            const { data } = await getInvitePeople();
            const pool = Array.isArray(data) ? data : [];
            setInvitePool(pool);
            setInviteResults(filterInvitePeople(pool, membersList || []));
            setInviteConfirm(null);
        } catch (error) {
            console.error(error);
            setInviteError("No se pudieron cargar las personas para invitar.");
            setInvitePool([]);
            setInviteResults([]);
        }
    };

    const handleInvitarUsuario = async (user) => {
        const userId = user?._id;
        if (!grupoActivo?._id || !userId || inviteBusy) return;
        try {
            if (!token) return navigate("/login");
            setInviteBusy(true);
            setInviteError("");
            setInviteOk("");
            const res = await fetch(`${API_URL}/${grupoActivo._id}/invitar`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({ userId }),
            });
            const data = await res.json();
            if (!res.ok) {
                setInviteError(data?.message || "No se pudo invitar.");
                return;
            }
            setInviteResults((prev) => prev.filter((item) => item._id !== userId));
            setInvitePool((prev) => prev.filter((item) => item._id !== userId));
            setInviteConfirm(null);
            setInviteOk(`Invitación enviada a ${user.nombre}. Podrá aceptarla desde Notificaciones.`);
        } catch (error) {
            console.error(error);
            setInviteError("No se pudo invitar.");
        } finally {
            setInviteBusy(false);
        }
    };

    useEffect(() => {
        if (!inviteOpen) return undefined;
        const query = inviteQuery.trim();
        const timeoutId = setTimeout(async () => {
            try {
                if (!query) {
                    setInviteResults(filterInvitePeople(invitePool));
                    return;
                }
                const { data } = await searchRegisteredUsers(query);
                setInviteResults(filterInvitePeople(Array.isArray(data) ? data : []));
            } catch (error) {
                console.error(error);
                setInviteError("No se pudieron buscar usuarios.");
            }
        }, 280);
        return () => clearTimeout(timeoutId);
    }, [inviteOpen, inviteQuery, grupoActivo, miembros, invitePool]);

    // --- RENDER MURO (GRUPO ACTIVO) ---
    if (grupoActivo) {
        const grupoData = grupos.find(g => g._id === grupoActivo._id) || grupoActivo;
        const esCreadorGrupo = grupoData.creadorEmail === userEmail;
        const esAdminGlobal = userRole === "administrador";
        return (
            <div className="fb-layout grupos-forum-style">
                <div className="fb-header-container">
                    <div className="fb-cover-photo" style={{ backgroundImage: `url(${grupoData.imagen})` }}>
                        <button className="fb-back-btn" onClick={salirDeGrupo}><FaArrowLeft /></button>
                    </div>
                    <div className="fb-profile-nav">
                        <div className="fb-avatar-section">
                            <div className="fb-avatar-wrapper" style={{ width: '150px', height: '150px', minWidth: '150px', minHeight: '150px', borderRadius: '20px', border: '3px solid white', overflow: 'hidden', backgroundColor: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, position: 'relative' }}>
                                <img src={grupoData.imagen || "https://via.placeholder.com/150"} alt="avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                            </div>
                            <div className="fb-name-stats">
                                <h1 className="grupo-active-title">{grupoData.nombre}</h1>
                                <p className="grupo-active-meta"><FaGlobeAmericas /> Grupo Público · <b>{grupoData.miembrosArray?.length || 1} miembros</b></p>
                            </div>
                            <div className="fb-header-btns">
                                {esCreadorGrupo || grupoData.miembrosArray?.includes(userEmail) || esAdminGlobal ? (
                                    <button className="btn-fb-blue" type="button" onClick={abrirInvitar}>
                                        <FaPlus /> Invitar
                                    </button>
                                ) : null}
                                <button className="btn-fb-gray" type="button" onClick={() => abrirMiembros(grupoData._id)}>
                                    <FaUserFriends /> Miembros
                                </button>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="fb-body-grid single-column">
                    <main className="fb-feed-center">
                        <div className="fb-card-white publish-area">
                            <div className="publish-input-row">
                                <div className="avatar-circle-wrapper">
                                    {avatar ? <img src={resolveAvatarUrl(avatar)} className="mini-avatar-fb" alt="yo" /> : <FaUserCircle size={40} color="#ccc" className="mini-avatar-fb" />}
                                </div>
                                <input className="publish-input-field" placeholder={`¿Qué compartes hoy, ${userName}?`} value={nuevoPost} onChange={(e) => setNuevoPost(e.target.value)} />
                            </div>
                            
                            {fotoPost && (
                                <div className="fb-post-preview-container" style={{ margin: '10px 15px', position: 'relative', width: 'fit-content' }}>
                                    <img src={fotoPost} alt="preview" style={{ maxWidth: '150px', maxHeight: '150px', borderRadius: '8px', display: 'block', border: '1px solid #ddd' }} />
                                    <button className="fb-remove-preview" onClick={() => setFotoPost(null)} style={{ position: 'absolute', top: '-10px', right: '-10px', background: '#f02849', color: 'white', border: 'none', borderRadius: '50%', width: '25px', height: '25px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><FaTimes /></button>
                                </div>
                            )}

                            <div className="publish-footer-fb">
                                <button onClick={() => postFotoRef.current.click()}><FaRegImage color="#45bd62" /> Foto/video</button>
                                <button onClick={handlePublicar} disabled={loading} className="btn-send-fb">Publicar</button>
                                <input type="file" ref={postFotoRef} style={{display: 'none'}} accept="image/*" onChange={(e) => handleImagePreview(e, 'post')} />
                            </div>
                        </div>

                        {grupoData.posts?.map(post => {
                            const esMiPost = post.autorEmail === userEmail || post.autor === userName;
                            const puedeEliminarPost = esMiPost || esCreadorGrupo || esAdminGlobal;
                            const estaAbierto = comentariosAbiertos[post._id];
                            const nComentarios = post.comentarios?.length || 0;
                            const nLikes = likes[post._id] ? 1 : 0;

                            return (
                                <div key={post._id} className="fb-card-white post-container">
                                    <div className="post-top-header">
                                        <div className="mini-avatar-fb avatar-circle-wrapper">
                                            {esMiPost ? (avatar ? <img src={resolveAvatarUrl(avatar)} alt="yo" className="round-img" /> : <FaUserCircle size={40} color="#ccc" />) : (post.autorFoto ? <img src={resolveAvatarUrl(post.autorFoto)} alt="autor" className="round-img" /> : <FaUserCircle size={40} color="#ccc" />)}
                                        </div>
                                        <div className="post-user-meta">
                                            <span className="author-fb">{esMiPost ? userName : (post.autor || "Usuario")}</span>
                                            <span className="time-fb">Ahora · <FaGlobeAmericas /> {grupoData.nombre}</span>
                                        </div>
                                        <div className="post-actions-right">
                                            <button className="btn-fb-options" onClick={() => setMenuAbiertoId(menuAbiertoId === post._id ? null : post._id)}><FaEllipsisH /></button>
                                            {menuAbiertoId === post._id && puedeEliminarPost ? (
                                                <div className="dropdown-fb-style post-dropdown-menu" style={{ display: "block" }}>
                                                    <button onClick={() => handleEliminarPost(post._id)} style={{ color: "red" }}>
                                                        <FaTrash /> Eliminar publicación
                                                    </button>
                                                </div>
                                            ) : null}
                                        </div>
                                    </div>
                                    {post.contenido ? <div className="post-body-text">{post.contenido}</div> : null}
                                    {post.foto && <div className="post-image-main"><img src={post.foto} className="img-full-post" alt="post" /></div>}

                                    {(nLikes > 0 || nComentarios > 0) ? (
                                    <div className="post-footer-metrics">
                                        <span className="post-metrics-left">
                                            {nLikes > 0 ? <><span className="reaction-pill" aria-hidden="true">👍</span> {nLikes}</> : null}
                                        </span>
                                        <span className="post-metrics-right">
                                            {nComentarios > 0 ? `${nComentarios} comentario${nComentarios === 1 ? "" : "s"}` : null}
                                        </span>
                                    </div>
                                    ) : null}
                                    
                                    <div className="post-action-buttons-fb">
                                        <button type="button" onClick={() => toggleLike(post._id)} className={likes[post._id] ? "liked" : ""}>
                                            <FaThumbsUp /> Me gusta
                                        </button>
                                        
                                        <button type="button" onClick={() => toggleComentarios(post._id)}>
                                            <FaComment /> Comentar
                                        </button>
                                        
                                        <button
                                            type="button"
                                            className={`btn-save-post ${guardados[post._id] ? "active" : ""}`}
                                            onClick={() => toggleGuardar(post._id)}
                                        >
                                            {guardados[post._id] ? <FaBookmark /> : <FaRegBookmark />} Guardar
                                        </button>
                                    </div>

                                    {/* SECCIÓN DE COMENTARIOS CON DESPLIEGUE Y BOTÓN DE ENVIAR A LA DERECHA */}
                                    {estaAbierto && (
                                        <div className="fb-comments-section">
                                            {post.comentarios?.map((com, index) => {
                                                const puedeEliminarComentario =
                                                    com.autorEmail === userEmail || esMiPost || esCreadorGrupo || esAdminGlobal;
                                                return (
                                                <div key={com._id || index} className="comment-item">
                                                    <img src={resolveAvatarUrl(com.autorFoto) || "https://via.placeholder.com/32"} alt="avatar" className="comment-mini-avatar" />
                                                    <div className="comment-bubble">
                                                        <span className="comment-author-name">{com.autor}</span>
                                                        <span className="comment-text">{com.contenido}</span>
                                                    </div>
                                                    {puedeEliminarComentario && com._id ? (
                                                        <button
                                                            type="button"
                                                            className="btn-delete-comment-mini"
                                                            onClick={() => handleEliminarComentario(post._id, com._id)}
                                                        >
                                                            <FaTrash />
                                                        </button>
                                                    ) : null}
                                                </div>
                                            )})}
                                            
                                            <form onSubmit={(e) => handleComentar(e, post._id)} className="comment-input-wrapper">
                                                <div className="avatar-circle-wrapper">
                                                    {avatar ? <img src={resolveAvatarUrl(avatar)} className="comment-mini-avatar" alt="yo" /> : <FaUserCircle size={32} color="#ccc" />}
                                                </div>
                                                <div className="comment-input-container-with-btn">
                                                    <input 
                                                        placeholder="Escribe un comentario..." 
                                                        className="comment-input-field"
                                                        value={comentarioTexto[post._id] || ""}
                                                        onChange={(e) => setComentarioTexto({...comentarioTexto, [post._id]: e.target.value})}
                                                    />
                                                    <button type="submit" className="btn-send-comment-icon" disabled={!comentarioTexto[post._id]?.trim()}>
                                                        <FaPaperPlane />
                                                    </button>
                                                </div>
                                            </form>
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </main>
                </div>

                {inviteOpen ? (
                    <div className="modal-overlay" role="dialog" aria-modal="true">
                        <div className="vibe-modal-container">
                            <div className="vibe-modal-header">
                                <button className="vibe-close-circle" type="button" onClick={() => { setInviteOpen(false); setInviteConfirm(null); }}><FaTimes /></button>
                                <h3 className="vibe-modal-title-main">Invitar al grupo</h3>
                            </div>
                            <div className="vibe-modal-content-body">
                                <input
                                    className="vibe-input-field"
                                    placeholder="Buscar por nombre..."
                                    value={inviteQuery}
                                    onChange={(e) => setInviteQuery(e.target.value)}
                                />
                                {inviteError ? <p className="grupo-action-error">{inviteError}</p> : null}
                                {inviteOk ? <p className="grupo-action-ok">{inviteOk}</p> : null}
                                <div className="grupo-people-list">
                                    {inviteResults.map((user) => (
                                        <button
                                            key={user._id}
                                            className="grupo-people-row"
                                            type="button"
                                            disabled={inviteBusy}
                                            onClick={() => { setInviteOk(""); setInviteConfirm(user); }}
                                        >
                                            <img
                                                src={resolveAvatarUrl(user.avatar) || DEFAULT_AVATAR}
                                                alt={user.nombre}
                                                className="grupo-people-avatar"
                                            />
                                            <div className="grupo-people-meta">
                                                <strong>{user.nombre}</strong>
                                                <span>{user.universidad || user.carrera || "Estudiante"}</span>
                                            </div>
                                            <span className="grupo-invite-plus" aria-hidden="true">
                                                <FaPlus />
                                            </span>
                                        </button>
                                    ))}
                                    {!inviteQuery.trim() && !inviteResults.length ? (
                                        <p>No hay personas disponibles para invitar.</p>
                                    ) : null}
                                    {inviteQuery.trim() && !inviteResults.length ? (
                                        <p>No hay resultados para invitar.</p>
                                    ) : null}
                                </div>
                                {inviteConfirm ? (
                                    <div className="invite-confirm-box" role="alertdialog" aria-modal="true">
                                        <p>¿Seguro quieres invitar a {inviteConfirm.nombre}?</p>
                                        <div className="invite-confirm-actions">
                                            <button
                                                type="button"
                                                className="invite-confirm-no"
                                                aria-label="Cancelar invitación"
                                                disabled={inviteBusy}
                                                onClick={() => setInviteConfirm(null)}
                                            >
                                                <FaTimes />
                                            </button>
                                            <button
                                                type="button"
                                                className="invite-confirm-yes"
                                                aria-label="Confirmar invitación"
                                                disabled={inviteBusy}
                                                onClick={() => handleInvitarUsuario(inviteConfirm)}
                                            >
                                                <FaCheck />
                                            </button>
                                        </div>
                                    </div>
                                ) : null}
                            </div>
                        </div>
                    </div>
                ) : null}

                {membersOpen ? (
                    <div className="modal-overlay" role="dialog" aria-modal="true">
                        <div className="vibe-modal-container">
                            <div className="vibe-modal-header">
                                <button className="vibe-close-circle" type="button" onClick={() => setMembersOpen(false)}><FaTimes /></button>
                                <h3 className="vibe-modal-title-main">Miembros</h3>
                            </div>
                            <div className="vibe-modal-content-body">
                                {membersError ? <p className="grupo-action-error">{membersError}</p> : null}
                                <div className="grupo-people-list">
                                    {miembros.map((user) => (
                                        <div key={user._id || user.correoInstitucional} className="grupo-people-row">
                                            <img
                                                src={resolveAvatarUrl(user.avatar) || DEFAULT_AVATAR}
                                                alt={user.nombre}
                                                className="grupo-people-avatar"
                                            />
                                            <div className="grupo-people-meta">
                                                <strong>{user.nombre}</strong>
                                                <span>{user.correoInstitucional}</span>
                                            </div>
                                        </div>
                                    ))}
                                    {!membersError && !miembros.length ? <p>Este grupo aún no tiene miembros visibles.</p> : null}
                                </div>
                            </div>
                        </div>
                    </div>
                ) : null}
            </div>
        );
    }

    // --- RENDER LISTA DE GRUPOS ---
    return (
        <section className="grupos-page">
            <div className="grupos-header-top">
                <div className="header-left-side">
                    <button className="btn-back-main-page" onClick={() => navigate("/dashboard/feed")}><FaArrowLeft /></button>
                    <h2 className="grupos-main-title">Comunidades</h2>
                </div>
                <div className="header-right-side">
                    <button
                        className="btn-crear-grupo btn-notif-grupo"
                        type="button"
                        onClick={() => navigate("/dashboard/notificaciones")}
                        aria-label="Notificaciones"
                    >
                        <FaBell />
                        <NotifBadge count={unreadCount} />
                    </button>
                    <button className="btn-crear-grupo" onClick={() => setIsModalOpen(true)}><FaPlus /></button>
                </div>
            </div>
            
            <div className="search-bar-pure-white">
                <FaSearch className="icon-s" />
                <input type="text" placeholder="Buscar grupos..." value={filtro} onChange={(e) => setFiltro(e.target.value)} />
            </div>

            <div className="tabs-vibe">
                <button className={pestana === "todos" ? "active" : ""} onClick={() => setPestana("todos")}>Todos</button>
                <button className={pestana === "mis-grupos" ? "active" : ""} onClick={() => setPestana("mis-grupos")}>Mis Grupos</button>
            </div>

            <div className="grupos-grid-moderno">
                {grupos
                .filter(g => {
                    const match = (g.nombre || "").toLowerCase().includes(filtro.toLowerCase())
                        || (g.descripcion || "").toLowerCase().includes(filtro.toLowerCase());
                    return pestana === "mis-grupos" ? (match && g.miembrosArray?.includes(userEmail)) : match;
                })
                .map(grupo => {
                    const esCreador = grupo.creadorEmail === userEmail;
                    const esMiembro = grupo.miembrosArray?.includes(userEmail);
                    const esAdminGlobal = userRole === "administrador" || userRole === "administradores";

                    return (
                        <div key={grupo._id} className="grupo-card-row">
                            <div className="grupo-card-top-content" onClick={() => entrarAGrupo(grupo)}>
                                <img src={grupo.imagen || "https://via.placeholder.com/150"} className="grupo-img-mini-square" alt={grupo.nombre} />
                                <div className="grupo-textos-info">
                                    <h3 className="grupo-nombre-bold">{grupo.nombre}</h3>
                                    {grupo.descripcion ? <p className="grupo-desc-text">{grupo.descripcion}</p> : null}
                                    <p className="grupo-miembros-text">{grupo.miembrosArray?.length || 1} miembros</p>
                                </div>
                            </div>
                            <div className="grupo-card-actions-row">
                                {!esMiembro ? (
                                    <button className="btn-ver-grupo-vibe-blue" onClick={() => handleUnirseGrupo(grupo)}>Unirse</button>
                                ) : (
                                    <button className="btn-ver-grupo-vibe-blue" onClick={() => entrarAGrupo(grupo)}>Ver</button>
                                )}
                                
                                <div className="grupo-card-menu-wrap">
                                    <button className="btn-dots-gray" onClick={() => setMenuAbiertoId(menuAbiertoId === grupo._id ? null : grupo._id)}><FaEllipsisH /></button>
                                    {menuAbiertoId === grupo._id && (
                                        <div className="dropdown-fb-style" style={{ display: 'block' }}>
                                            {(esCreador || esAdminGlobal) ? (
                                                <button onClick={() => handleEliminarGrupo(grupo._id)} style={{color: 'red'}}><FaTrash /> Eliminar Grupo</button>
                                            ) : (
                                                esMiembro ? (
                                                    <button onClick={() => handleAbandonarGrupo(grupo._id)}><FaSignOutAlt /> Abandonar Grupo</button>
                                                ) : (
                                                    <button onClick={() => handleUnirseGrupo(grupo)}><FaPlus /> Unirse</button>
                                                )
                                            )}
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* --- MODAL CREAR --- */}
            {isModalOpen && (
                <div className="modal-overlay">
                    <div className="vibe-modal-container">
                        <div className="vibe-modal-header">
                            <button className="vibe-close-circle" onClick={() => setIsModalOpen(false)}><FaTimes /></button>
                            <h3 className="vibe-modal-title-main">Nuevo Grupo</h3>
                        </div>
                        <form onSubmit={handleCrearGrupo}>
                            <div className="vibe-modal-content-body">
                                <input className="vibe-input-field" placeholder="Nombre del grupo" required value={nuevoGrupo.nombre} onChange={(e) => setNuevoGrupo((prev) => ({ ...prev, nombre: e.target.value }))} />
                                <textarea
                                    className="vibe-input-field vibe-textarea-field"
                                    placeholder="Descripción del grupo"
                                    rows={3}
                                    maxLength={400}
                                    value={nuevoGrupo.descripcion || ""}
                                    onChange={(e) => setNuevoGrupo((prev) => ({ ...prev, descripcion: e.target.value }))}
                                />
                                <InterestChips
                                    value={nuevoGrupo.tags || []}
                                    onChange={(tags) => setNuevoGrupo((prev) => ({ ...prev, tags }))}
                                    label="Intereses de la comunidad"
                                    hint="Así podemos recomendar este grupo a las personas indicadas."
                                />
                                <div className="vibe-upload-box" onClick={() => fileInputRef.current.click()}>
                                    {nuevoGrupo.imagen ? <img src={nuevoGrupo.imagen} className="vibe-img-fit" alt="preview" /> : <p>Subir foto de portada</p>}
                                </div>
                                <input type="file" ref={fileInputRef} style={{display: 'none'}} accept="image/*" onChange={(e) => handleImagePreview(e, 'grupo')} />
                            </div>
                            <div className="vibe-modal-footer">
                                <button type="submit" className="vibe-btn-primary-full">{loading ? "Creando..." : "Crear Grupo"}</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* --- MODAL CROPPER --- */}
            {imageToCrop && (
                <div className="modal-overlay cropper-overlay">
                    <div className="vibe-modal-container cropper-modal">
                        <div className="crop-area-container">
                            <Cropper image={imageToCrop} crop={crop} zoom={zoom} rotation={rotation} aspect={16 / 9} onCropChange={setCrop} onZoomChange={setZoom} onRotationChange={setRotation} onCropComplete={onCropComplete} />
                        </div>
                        <div className="cropper-footer">
                            <button onClick={() => setImageToCrop(null)}>Cancelar</button>
                            <button className="btn-confirm-vibe" onClick={handleConfirmCrop}>Cortar y Guardar</button>
                        </div>
                    </div>
                </div>
            )}
        </section>
    );
};

export default Grupos;
