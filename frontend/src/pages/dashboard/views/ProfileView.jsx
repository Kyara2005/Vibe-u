import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { PostCard } from "../UserDashboard";
import { resolveAvatarUrl } from "../../../utils/mediaUrl";
import { INTEREST_CATALOG, sanitizeInterests } from "../../../utils/interests";

const ProfileView = () => {
  const navigate = useNavigate();
  const [perfil, setPerfil] = useState(null);
  const [posts, setPosts] = useState([]);
  const [groups, setGroups] = useState([]);

  useEffect(() => {
    const fetchPerfil = async () => {
      try {
        const token = localStorage.getItem("token");
        if (!token) return;
        const res = await fetch(`${import.meta.env.VITE_BACKEND_URL}/api/usuarios/perfil`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await res.json();
        setPerfil(data);

        if (!data?._id) return;

        const publicRes = await fetch(`${import.meta.env.VITE_BACKEND_URL}/api/usuarios/publico/${data._id}`, {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (!publicRes.ok) return;

        const publicData = await publicRes.json();
        setPosts(Array.isArray(publicData?.posts) ? publicData.posts : []);
        setGroups(Array.isArray(publicData?.groups) ? publicData.groups : []);
      } catch (error) {
        console.error(error);
      }
    };
    fetchPerfil();
  }, []);

  return (
    <section className="view__dash">
      <section className="panel__dash profile__dash">
        <img
          src={resolveAvatarUrl(perfil?.avatar) || "https://plus.unsplash.com/premium_photo-1677252438425-e4125f74fbbe?q=80&w=1160&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D"}
          alt="avatar"
        />
        <div>
          <h3>{perfil?.nombre || "Usuario"}</h3>
          <p>{perfil?.descripcion || "Sin descripcion por ahora."}</p>
          {sanitizeInterests(perfil?.intereses).length ? (
            <div className="profile_interests__dash">
              {sanitizeInterests(perfil?.intereses).map((id) => (
                <span key={id}>
                  {INTEREST_CATALOG.find((item) => item.id === id)?.label || id}
                </span>
              ))}
            </div>
          ) : null}
          <div className="stats__dash">
            <span>{perfil?.universidad || "Universidad"}</span>
            <span>{perfil?.carrera || "Carrera"}</span>
            <span>{perfil?.rol || "estudiante"}</span>
            <span>Amigos: {perfil?.amigos?.length || 0}</span>
            <button
              className="boton_editar"
              type="button"
              onClick={() => navigate("/actualizar-info")}
              aria-label="Editar perfil"
              title="Editar perfil"
            >
              ✏️
            </button>
          </div>
        </div>
      </section>
      <section className="panel__dash">
        <h3>Grupos</h3>
        <ul className="list__dash">
          {groups.map((group) => (
            <li key={group._id}>
              <strong>{group.nombre}</strong>
              <span> - Miembros: {group.miembrosArray?.length || 0}</span>
            </li>
          ))}
          {!groups.length ? <li>No perteneces a grupos visibles.</li> : null}
        </ul>
      </section>

      <section className="panel__dash">
        <h3>Publicaciones</h3>
        <div className="card_grid__dash">
          {posts.map((post) => (
            <PostCard key={post._id} post={post} />
          ))}
          {!posts.length ? <p className="chat_hint__dash">Sin publicaciones todavia.</p> : null}
        </div>
      </section>
    </section>
  );
};

export default ProfileView;
