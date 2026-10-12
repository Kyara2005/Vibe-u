import React from 'react';
import { Link } from 'react-router-dom';
import { IoArrowBack } from 'react-icons/io5';
import integrante2 from '../../assets/integrante2.jpeg';
import integrante1 from '../../assets/integrante1.jpeg';

import Grupo from '../../assets/equipo-vibe-u.png';
import ThemeToggle from '../../components/theme/ThemeToggle';
import './Contacto.css';

const stars = [
    { top: '6%', left: '8%', size: 10, delay: '0s', duration: '2.2s' },
    { top: '10%', left: '88%', size: 14, delay: '0.4s', duration: '2.8s' },
    { top: '18%', left: '4%', size: 8, delay: '1s', duration: '2.4s' },
    { top: '22%', left: '94%', size: 12, delay: '0.2s', duration: '3s' },
    { top: '32%', left: '12%', size: 16, delay: '0.8s', duration: '2.6s' },
    { top: '36%', left: '86%', size: 9, delay: '1.4s', duration: '2.1s' },
    { top: '44%', left: '3%', size: 11, delay: '0.6s', duration: '2.9s' },
    { top: '48%', left: '96%', size: 13, delay: '1.1s', duration: '2.5s' },
    { top: '56%', left: '9%', size: 8, delay: '0.3s', duration: '3.1s' },
    { top: '60%', left: '90%', size: 15, delay: '1.6s', duration: '2.3s' },
    { top: '68%', left: '5%', size: 12, delay: '0.9s', duration: '2.7s' },
    { top: '72%', left: '93%', size: 10, delay: '0.1s', duration: '2.4s' },
    { top: '80%', left: '14%', size: 9, delay: '1.3s', duration: '2.8s' },
    { top: '84%', left: '84%', size: 14, delay: '0.7s', duration: '3.2s' },
    { top: '14%', left: '48%', size: 8, delay: '1.8s', duration: '2.2s' },
    { top: '40%', left: '50%', size: 7, delay: '0.5s', duration: '2.6s' },
    { top: '90%', left: '46%', size: 11, delay: '1.2s', duration: '2.9s' },
    { top: '28%', left: '28%', size: 7, delay: '1.7s', duration: '2.1s' },
    { top: '28%', left: '72%', size: 8, delay: '0.15s', duration: '2.5s' },
    { top: '76%', left: '30%', size: 10, delay: '1.5s', duration: '2.7s' },
    { top: '76%', left: '70%', size: 8, delay: '0.35s', duration: '2.3s' },
];

const Contacto = () => {
    const teamMembers = [
        {
            name: 'Santiago Vargas',
            role: 'Backend',
            bio: 'Desarrollador back-end, encargado de la lógica del servidor y la gestión de la base de datos.',
            photo: integrante1
        },
        {
            name: 'Kyara Altamirano',
            role: 'Frontend',
            bio: 'Desarrolladora front-end, responsable del diseño de la interfaz y la experiencia de usuario.',
            photo: integrante2
        },
    ];

    return (
        <section id="contacto" className="contacto-section">
            <div className="contacto-stars" aria-hidden="true">
                {stars.map((star, index) => (
                    <span
                        key={index}
                        className="contacto-star"
                        style={{
                            top: star.top,
                            left: star.left,
                            width: `${star.size}px`,
                            height: `${star.size}px`,
                            animationDelay: star.delay,
                            animationDuration: star.duration,
                        }}
                    />
                ))}
            </div>
            <Link to="/" className="contacto-back-btn" aria-label="Volver a la página principal">
                <IoArrowBack size={22} />
            </Link>
            <ThemeToggle />
            <h2 className="contacto-title">Conoce al Equipo detrás de Vibe-U 🤝</h2>
            <p className="subtitulo">Somos un dúo de universitarios apasionados por crear conexiones auténticas.</p>

            <div className="imagen-grupal-container">
                {/* Imagen grupal con carga diferida y formato WebP */}
                <picture>
                    <source srcSet={Grupo} type="image/webp" />
                    <img
                        src={Grupo} // fallback a JPG
                        alt="Foto grupal del equipo Vibe-U"
                        className="imagen-grupal"
                        loading="lazy"
                    />
                </picture>
            </div>

            <div className="equipo-container">
                {teamMembers.map((member, index) => (
                    <div key={index} className="miembro-card">
                        <picture>
                            {/* Usamos el formato WebP para imágenes modernas, y JPG como fallback */}
                            <source srcSet={member.photo} type="image/webp" />
                            <img
                                src={member.photo} // fallback a JPG
                                alt={member.name}
                                className="miembro-foto"
                                loading="lazy" // Lazy loading para cada foto de miembro
                            />
                        </picture>
                        <h3>{member.name}</h3>
                        <span className="miembro-rol">{member.role}</span>
                        <p>{member.bio}</p>
                    </div>
                ))}
            </div>

            <div className="contacto-info">
                <h3>¡Contáctanos!</h3>
                <p>Si tienes alguna pregunta o sugerencia, no dudes en escribirnos:</p>
                <p>
                    Correo: <a href="mailto:kyaramaltamirano@gmail.com">vibeu.app@gmail.com</a>
                </p>
                <p>
                    WhatsApp: <a href="https://wa.me/593963267963">+593 963 267 963</a>
                </p>
            </div>
        </section>
    );
};

export default Contacto;
