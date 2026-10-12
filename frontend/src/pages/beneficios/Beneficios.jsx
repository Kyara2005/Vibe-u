import React from 'react';
import './Beneficios.css';
import { useNavigate } from 'react-router';
import ThemeToggle from '../../components/theme/ThemeToggle';

const Beneficios = () => {
    const navigate = useNavigate();
    const handleJoinNowClick = () => {
        navigate("/register");
    };
    return (
        <section className="beneficios-section">
            <ThemeToggle />
            <h2 className="beneficios-title">Beneficios de Unirte a Vibe-U 🎓</h2>
            <p className="beneficios-subtitulo">
                Conéctate con tu comunidad universitaria de una manera segura y auténtica.
            </p>
            
            <div className="beneficios-container">
                <div className="beneficio-card" data-aos="fade-up" data-aos-duration="1000">
                    <h4><span role="img" aria-label="icono de chat">💬</span> Encuentra tu Match Perfecto</h4>
                    <p>Olvídate de las aplicaciones de citas genéricas. Vibe-U te conecta con personas que comparten tus intereses y pasiones dentro de tu mismo campus.</p>
                </div>
                <div className="beneficio-card" data-aos="fade-up" data-aos-duration="1200">
                    <h4><span role="img" aria-label="icono de calendario">🗓️</span> No te Pierdas Ningún Evento</h4>
                    <p>Accede a un calendario exclusivo con todos los eventos de tu universidad y de otras asociadas, desde conferencias hasta fiestas y conciertos.</p>
                </div>
                <div className="beneficio-card" data-aos="fade-up" data-aos-duration="1400">
                    <h4><span role="img" aria-label="icono de grupo">🤝</span> Únete a tu Tribu</h4>
                    <p>¿Buscas compañeros para un proyecto o un club de lectura? Crea o únete a grupos y comunidades para encontrar a tus futuros colaboradores y amigos.</p>
                </div>
            </div>
            <section className="beneficios-section">
                <h2 className="beneficios-title">Seguridad y Exclusividad en tu Campus 🔒</h2>
                <p className="beneficios-subtitulo">
                    Con Vibe-U, tu seguridad y privacidad son nuestra prioridad.
                </p>

                <div className="beneficios-container">
                    <div className="beneficio-card" data-aos="fade-up" data-aos-duration="1000">
                        <h4><span role="img" aria-label="icono de candado">✅</span> Verificación de Identidad</h4>
                        <p>Cada perfil es verificado para asegurar que solo estudiantes, docentes y personal de universidades asociadas puedan unirse.</p>
                    </div>
                    <div className="beneficio-card" data-aos="fade-up" data-aos-duration="1200">
                        <h4><span role="img" aria-label="icono de escudo">🛡️</span> Privacidad y Control</h4>
                        <p>Tu información está protegida. Tú decides qué compartes y con quién, permitiéndote explorar la vida universitaria sin preocupaciones.</p>
                    </div>
                    <div className="beneficio-card" data-aos="fade-up" data-aos-duration="1400">
                        <h4><span role="img" aria-label="icono de estrella">🌟</span> Comunidad Exclusiva</h4>
                        <p>Forma parte de una red única de estudiantes de élite. Encontrarás a personas con metas similares a las tuyas en Vibe-U.</p>
                    </div>
                </div>
                <div className="join-btn-container">
                    <button className="join-now-btn" onClick={handleJoinNowClick}>¡Unirse Ahora!</button>
                </div>
            </section>
        </section>);
};

export default Beneficios;