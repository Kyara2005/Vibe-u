import { useEffect, useState } from "react";
import {
  applyTheme,
  DARK_THEME,
  getCurrentTheme,
  LIGHT_THEME,
} from "../../utils/theme";
import "./ThemeToggle.css";

const SunIcon = () => (
  <svg viewBox="0 0 24 24" aria-hidden="true">
    <circle cx="12" cy="12" r="4" fill="currentColor" />
    <path
      d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
    />
  </svg>
);

const MoonIcon = () => (
  <svg viewBox="0 0 24 24" aria-hidden="true">
    <path
      fill="currentColor"
      d="M21 14.3A8.5 8.5 0 0 1 9.7 3 7.2 7.2 0 1 0 21 14.3z"
    />
  </svg>
);

const ThemeToggle = ({ placement = "floating" }) => {
  const [theme, setTheme] = useState(getCurrentTheme());

  useEffect(() => {
    const syncTheme = () => setTheme(getCurrentTheme());
    window.addEventListener("storage", syncTheme);
    return () => window.removeEventListener("storage", syncTheme);
  }, []);

  const toggleTheme = () => {
    const nextTheme = theme === DARK_THEME ? LIGHT_THEME : DARK_THEME;
    setTheme(applyTheme(nextTheme));
  };

  const isDark = theme === DARK_THEME;

  return (
    <button
      type="button"
      className={`theme_toggle_global ${placement === "header" ? "is-header" : "is-floating"}`}
      onClick={toggleTheme}
      aria-label={isDark ? "Activar modo día" : "Activar modo noche"}
      title={isDark ? "Modo día" : "Modo noche"}
    >
      {isDark ? <SunIcon /> : <MoonIcon />}
    </button>
  );
};

export default ThemeToggle;
