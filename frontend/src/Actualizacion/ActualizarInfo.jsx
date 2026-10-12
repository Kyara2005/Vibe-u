import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import "./ActualizarInfo.css";
import { resolveAvatarUrl } from "../utils/mediaUrl";
import InterestChips from "../components/interests/InterestChips";
import { sanitizeInterests } from "../utils/interests";

// ➡️ Ruta correcta de tu AvatarCropperModal
import AvatarCropperModal from "../components/Avatar/AvatarCropperModal.jsx";

const ActualizarInfo = () => {
  const navigate = useNavigate();
  const fileInputRef = useRef(null);

  const [avatar, setAvatar] = useState(null);
  const [avatarModalOpen, setAvatarModalOpen] = useState(false);

  // ➡️ NUEVOS ESTADOS para el recorte
  const [imageToCrop, setImageToCrop] = useState(null);
  const [cropperModalOpen, setCropperModalOpen] = useState(false);

  const [userName, setUserName] = useState("");
  const [userPhone, setUserPhone] = useState("");
  const [userAddress, setUserAddress] = useState("");
  const [userCedula, setUserCedula] = useState("");
  const [userDescription, setUserDescription] = useState("");
  const [userUniversity, setUserUniversity] = useState("");
  const [userCareer, setUserCareer] = useState("");
  const [userInterests, setUserInterests] = useState([]);
  const [perfilPublico, setPerfilPublico] = useState(true);

  const avatarOptions = [
    "https://api.dicebear.com/6.x/bottts/svg?seed=Avatar1",
    "https://api.dicebear.com/6.x/bottts/svg?seed=Avatar2",
    "https://api.dicebear.com/6.x/bottts/svg?seed=Avatar3",
    "https://api.dicebear.com/6.x/bottts/svg?seed=Avatar4",
    "https://api.dicebear.com/6.x/bottts/svg?seed=Avatar5",
  ];

  useEffect(() => {
    const fetchUserInfo = async () => {
      const token = localStorage.getItem("token");
      if (!token) return;

      try {
        const res = await axios.get(
          `${import.meta.env.VITE_BACKEND_URL}/api/usuarios/perfil`,
          { headers: { Authorization: `Bearer ${token}` } }
        );

        setUserName(res.data.nombre || "");
        setAvatar(res.data.avatar || null);
        setUserPhone(res.data.telefono || "");
        setUserAddress(res.data.direccion || "");
        setUserCedula(res.data.cedula || "");
        setUserDescription(res.data.descripcion || "");
        setUserUniversity(res.data.universidad || "");
        setUserCareer(res.data.carrera || "");
        setUserInterests(sanitizeInterests(res.data.intereses));
        setPerfilPublico(res.data.perfilPublico !== false);
      } catch (err) {
        console.error(
          "Error al cargar datos del usuario, manteniendo la información actual:",
          err.response?.data || err
        );
        return;
      }
    };

    fetchUserInfo();
  }, [navigate]);

  const handleFileClick = () => fileInputRef.current.click();

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.addEventListener("load", () => {
      setImageToCrop(reader.result);
      setCropperModalOpen(true);
    });
    reader.readAsDataURL(file);
  };

  // Guardar imagen recortada en memoria para enviarla al backend
  const handleCroppedAvatar = async (croppedImageBlob) => {
    setCropperModalOpen(false);
    setImageToCrop(null);

    if (!croppedImageBlob) {
      toast.error("No se pudo obtener la imagen recortada.");
      return;
    }

    try {
      const avatarDataUrl = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result);
        reader.onerror = reject;
        reader.readAsDataURL(croppedImageBlob);
      });
      setAvatar(avatarDataUrl);
      toast.success("Avatar listo para guardar");
    } catch (err) {
      console.error("Error al procesar la imagen recortada:", err);
      toast.error("Error al procesar avatar");
    }
  };

  const handleUpdate = async () => {
    try {
      const token = localStorage.getItem("token");

      await axios.put(
        `${import.meta.env.VITE_BACKEND_URL}/api/usuarios/actualizar-perfil`,
        {
          nombre: userName,
          telefono: userPhone,
          direccion: userAddress,
          cedula: userCedula,
          descripcion: userDescription,
          universidad: userUniversity,
          carrera: userCareer,
          intereses: userInterests,
          perfilPublico,
          avatar: avatar,
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      toast.success("Información actualizada");
      setTimeout(() => navigate("/dashboard/ajustes"), 1200);
    } catch (err) {
      console.error("Error al actualizar la información:", err.response?.data || err);
      toast.error("Error al guardar la información.");
    }
  };

  return (
    <div className="actualizar-page">
    <div className="actualizar-container">
      <ToastContainer />

      <h2 className="titulo">Actualizar información de cuenta</h2>

      <div className="avatar-wrapper">
        <div className="avatar-circle" onClick={handleFileClick}>
          {avatar ? (
            <img src={resolveAvatarUrl(avatar)} alt="Avatar" className="avatar-img-preview" />
          ) : (
            <span className="default-avatar">👤</span>
          )}
        </div>

        <div className="btns-avatar">
          <button className="btn-upload" type="button" onClick={handleFileClick}>
            <img
              src="https://cdn-icons-png.flaticon.com/512/16462/16462616.png"
              alt="Galería"
            /> 
          </button>
          <button
            className="btn-select"
            type="button"
            onClick={() => setAvatarModalOpen(!avatarModalOpen)}
            title="Elegir avatar"
            aria-label="Elegir avatar"
          >
            🧑
          </button>
        </div>

        <input
          ref={fileInputRef}
          type="file"
          className="input-file-hidden"
          accept="image/*"
          onChange={handleFileChange}
        />
      </div>
      {avatarModalOpen && (
        <div className="avatar-modal-overlay">
          <div className="avatar-modal-content">
            <h3 className="modal-title">Seleccionar Avatar Predefinido</h3>
            <div className="avatar-options-grid">
              {avatarOptions.map((url, i) => (
                <img
                  key={i}
                  src={url}
                  className="avatar-option"
                  onClick={() => {
                    setAvatar(url);
                    setAvatarModalOpen(false);
                  }}
                  alt={`avatar-${i}`}
                />
              ))}
            </div>
            <button
              className="modal-close-btn"
              onClick={() => setAvatarModalOpen(false)}
            >
              Cerrar
            </button>
          </div>
        </div>
      )}

      {cropperModalOpen && imageToCrop && (
        <AvatarCropperModal
          imageSrc={imageToCrop}
          open={cropperModalOpen}
          onClose={() => setCropperModalOpen(false)}
          onCropComplete={handleCroppedAvatar}
        />
      )}

      <div className="form-section">
        <div className="field-row">
          <label className="field-label">Usuario</label>
          <input
            className="field-input"
            value={userName}
            onChange={(e) => setUserName(e.target.value)}
            placeholder="Nombre de usuario"
          />
        </div>

        <div className="field-row">
          <label className="field-label">Descripción</label>
          <textarea
            className="field-input textarea-input"
            value={userDescription}
            onChange={(e) => setUserDescription(e.target.value)}
            placeholder="Breve descripción"
          />
        </div>

        <div className="field-row">
          <label className="field-label">Teléfono</label>
          <input
            className="field-input"
            value={userPhone}
            onChange={(e) => setUserPhone(e.target.value)}
            placeholder="Ej: +593 9..."
          />
        </div>

        <div className="field-row">
          <label className="field-label">Dirección</label>
          <input
            className="field-input"
            value={userAddress}
            onChange={(e) => setUserAddress(e.target.value)}
            placeholder="Dirección"
          />
        </div>

        <div className="field-row">
          <label className="field-label">Cédula</label>
          <input
            className="field-input"
            value={userCedula}
            onChange={(e) => setUserCedula(e.target.value)}
            placeholder="No. de cédula"
          />
        </div>

        <div className="field-row">
          <label className="field-label">Universidad</label>
          <input
            className="field-input"
            value={userUniversity}
            onChange={(e) => setUserUniversity(e.target.value)}
            placeholder="Nombre de la universidad"
          />
        </div>

        <div className="field-row">
          <label className="field-label">Carrera</label>
          <input
            className="field-input"
            value={userCareer}
            onChange={(e) => setUserCareer(e.target.value)}
            placeholder="Tu carrera"
          />
        </div>

        <InterestChips
          value={userInterests}
          onChange={setUserInterests}
          label="Intereses"
          hint="Elige lo que te gusta para recomendarte comunidades y eventos."
        />

        <div className="privacy-box">
          <p className="field-label">Privacidad del perfil</p>
          <p className="privacy-hint">Si lo pones privado, en las búsquedas solo se verá tu nombre y foto.</p>
          <div className="privacy-options">
            <button
              type="button"
              className={`privacy-option${perfilPublico ? " is-on" : ""}`}
              onClick={() => setPerfilPublico(true)}
            >
              Público
            </button>
            <button
              type="button"
              className={`privacy-option${!perfilPublico ? " is-on" : ""}`}
              onClick={() => setPerfilPublico(false)}
            >
              Privado
            </button>
          </div>
        </div>

        <div className="btn-row">
          <button className="cancel-btn" onClick={() => navigate("/dashboard/ajustes")}>
            Cancelar
          </button>

          <button className="save-btn" onClick={handleUpdate}>
            Guardar cambios
          </button>
        </div>
      </div>
    </div>
    </div>
  );
};

export default ActualizarInfo;
