import { useEffect, useMemo, useState } from "react";
import "./Gautomatizacion.css";

const Gautomatizacion = () => {
    const [reporte, setReporte] = useState([]);
    const [cargando, setCargando] = useState(false);
    const [error, setError] = useState("");
    const [generado, setGenerado] = useState(false);

    const solicitarAutomatizacion = async () => {
        const token = localStorage.getItem("token");
        setCargando(true);
        setError("");

        try {
            const response = await fetch(
                `${import.meta.env.VITE_BACKEND_URL}/api/automatizacion/reporte/grupos`,
                {
                    method: "GET",
                    headers: {
                        "Content-Type": "application/json",
                        Authorization: `Bearer ${token}`,
                    },
                }
            );

            if (!response.ok) {
                throw new Error("Error al generar la automatización");
            }

            const data = await response.json();
            setReporte(Array.isArray(data.reporte) ? data.reporte : []);
            setGenerado(true);
        } catch (err) {
            console.error("Error:", err);
            setError("No se pudo generar el reporte. Intenta de nuevo.");
        } finally {
            setCargando(false);
        }
    };

    useEffect(() => {
        solicitarAutomatizacion();
    }, []);

    const resumen = useMemo(() => {
        return reporte.reduce(
            (acc, grupo) => {
                acc.grupos += 1;
                acc.miembros += Number(grupo.totalUsuarios) || 0;
                acc.publicaciones += Number(grupo.totalPosts) || 0;
                return acc;
            },
            { grupos: 0, miembros: 0, publicaciones: 0 }
        );
    }, [reporte]);

    return (
        <section className="gauto-container">
            <header className="gauto-head">
                <div>
                    <p className="gauto-kicker">Comunidades</p>
                    <h2>Automatización del sistema</h2>
                    <p className="gauto-lead">
                        Resumen claro de cada grupo: miembros, publicaciones y quien lo creó.
                    </p>
                </div>
                <button
                    className="gauto-btn"
                    onClick={solicitarAutomatizacion}
                    disabled={cargando}
                >
                    {cargando ? "Actualizando..." : generado ? "Actualizar reporte" : "Generar reporte"}
                </button>
            </header>

            {error ? <p className="gauto-error">{error}</p> : null}

            {generado && reporte.length ? (
                <div className="gauto-summary">
                    <article>
                        <strong>{resumen.grupos}</strong>
                        <span>Grupos</span>
                    </article>
                    <article>
                        <strong>{resumen.miembros}</strong>
                        <span>Miembros</span>
                    </article>
                    <article>
                        <strong>{resumen.publicaciones}</strong>
                        <span>Publicaciones</span>
                    </article>
                </div>
            ) : null}

            {!generado && cargando ? (
                <div className="gauto-empty-card">
                    <strong>Preparando reporte</strong>
                    <p>Estamos reuniendo la información de las comunidades.</p>
                </div>
            ) : null}

            {generado && !reporte.length ? (
                <div className="gauto-empty-card">
                    <strong>Sin comunidades</strong>
                    <p>No hay grupos registrados para mostrar en este momento.</p>
                </div>
            ) : null}

            <div className="gauto-grid">
                {reporte.map((g, index) => (
                    <article className="gauto-card" key={`${g.grupo}-${index}`}>
                        <h3>{g.grupo || "Grupo"}</h3>
                        <dl className="gauto-rows">
                            <div>
                                <dt>Miembros</dt>
                                <dd>{g.totalUsuarios || 0}</dd>
                            </div>
                            <div>
                                <dt>Publicaciones</dt>
                                <dd>{g.totalPosts || 0}</dd>
                            </div>
                            <div>
                                <dt>Creador</dt>
                                <dd>{g.creadorEmail || "No disponible"}</dd>
                            </div>
                        </dl>
                    </article>
                ))}
            </div>
        </section>
    );
};

export default Gautomatizacion;
