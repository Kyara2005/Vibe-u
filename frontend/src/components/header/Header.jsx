import { useEffect, useState } from "react";
import "./Header.css";
import { Link, useNavigate } from "react-router";
import logo from "../../assets/logo-vibe-u.webp";
import storeAuth from "../../context/storeAuth";
import ThemeToggle from "../theme/ThemeToggle";

const Header = () => {
    const navigate = useNavigate();
    const token = storeAuth((state) => state.token);
    const [menuOpen, setMenuOpen] = useState(false);

    const closeMenu = () => setMenuOpen(false);

    const handleLoginClick = () => {
        closeMenu();
        if (token) {
            navigate("/dashboard/micuenta");
            return;
        }
        navigate("/login");
    };

    const handleJoinNowClick = () => {
        closeMenu();
        navigate("/register");
    };

    useEffect(() => {
        const onResize = () => {
            if (window.innerWidth > 1080) closeMenu();
        };
        const onKey = (event) => {
            if (event.key === "Escape") closeMenu();
        };
        window.addEventListener("resize", onResize);
        window.addEventListener("keydown", onKey);
        return () => {
            window.removeEventListener("resize", onResize);
            window.removeEventListener("keydown", onKey);
        };
    }, []);

    useEffect(() => {
        document.body.classList.toggle("nav-open", menuOpen);
        return () => document.body.classList.remove("nav-open");
    }, [menuOpen]);

    const navLinks = (
        <>
            <a href="#que-es-vibe-u" onClick={closeMenu}>¿Qué es Vibe-U?</a>
            <a href="#como-funciona" onClick={closeMenu}>¿Cómo Funciona?</a>
            <a href="#explora-conecta" onClick={closeMenu}>Explora y Conecta</a>
            <Link to="/contacto" onClick={closeMenu}>Contacto</Link>
            <Link to="/beneficios" onClick={closeMenu}>Beneficios</Link>
            <Link to="/eventos" onClick={closeMenu}>Eventos</Link>
        </>
    );

    return (
        <header className="header">
            <div className="header-bar">
                <div className="logo-block">
                    <Link to="/" className="logo-link" onClick={closeMenu}>
                        <img src={logo} alt="Vibe-U Logo" className="logo" loading="lazy" />
                    </Link>
                    <a
                        href="https://play.google.com/store/games?hl=es_EC"
                        className="header-download"
                        target="_blank"
                        rel="noopener noreferrer"
                    >
                        Descarga la App
                    </a>
                </div>

                <nav className="nav-links">{navLinks}</nav>

                <div className="header-actions">
                    <button type="button" className="button__auth-button header-login-btn" onClick={handleLoginClick}>
                        {token ? "Mi cuenta" : "Iniciar sesión"}
                    </button>
                    <ThemeToggle placement="header" />
                    <button
                        type="button"
                        className={`header-menu-btn ${menuOpen ? "is-open" : ""}`}
                        aria-label={menuOpen ? "Cerrar menú" : "Abrir menú"}
                        aria-expanded={menuOpen}
                        onClick={() => setMenuOpen((open) => !open)}
                    >
                        <span />
                        <span />
                        <span />
                    </button>
                </div>
            </div>

            <button
                type="button"
                className={`header-drawer-backdrop ${menuOpen ? "is-open" : ""}`}
                aria-label="Cerrar menú"
                onClick={closeMenu}
            />

            <aside className={`header-drawer ${menuOpen ? "is-open" : ""}`} aria-hidden={!menuOpen}>
                <div className="header-drawer-head">
                    <img src={logo} alt="" className="header-drawer-logo" />
                    <button type="button" className="header-drawer-close" onClick={closeMenu} aria-label="Cerrar menú">
                        ×
                    </button>
                </div>
                <nav className="header-drawer-nav">{navLinks}</nav>
                <div className="header-drawer-actions">
                    <a
                        href="https://play.google.com/store/games?hl=es_EC"
                        className="btn btn-primary descarga-chica"
                        target="_blank"
                        rel="noopener noreferrer"
                    >
                        Descarga la App
                    </a>
                    <button type="button" className="button__auth-button" onClick={handleLoginClick}>
                        {token ? "Entrar a mi cuenta" : "Iniciar sesión"}
                    </button>
                </div>
            </aside>

            <div className="hero-text" data-aos="fade-down" data-aos-duration="1500">
                <p>La app que pone a la U en modo social</p>
                <div className="boton-descarga">
                    <button type="button" className="btn" onClick={handleJoinNowClick}>
                        Únete ahora
                    </button>
                    <a href="#como-funciona" className="btn-secondary">
                        ¿Cómo funciona?
                    </a>
                </div>
            </div>
        </header>
    );
};

export default Header;
