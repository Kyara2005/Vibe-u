import React from "react";
import "./Eventos.css";
import evento1 from '../../assets/grupo-eventos.png';
import evento2 from '../../assets/comparte-ideas.png';
import ThemeToggle from '../../components/theme/ThemeToggle';

const eventosData = [
    {
        title: "Eventos en tu U 🎉",
        description: "Descubre fiestas, charlas y actividades sociales en tu campus.",
        image: "https://tn.com.ar/resizer/v2/campus-party-arranco-el-festival-de-tecnologia-e-innovacion-XV7EPQJ66BMSEUULHQXOJV3D5Q.jpg?auth=d2e8bfc753a4e7b100bb79a5830a4d703294febde9fdd8e25ea7ed569258d001&width=767"
    },
    {
        title: "Conecta con otros 📱",
        description: "Encuentra personas con tus mismos intereses y haz match académico o social.",
        image: "https://rinconpsicologia.com/wp-content/uploads/2023/11/Amigas-conversando.webp"
    },
    {
        title: "Únete a grupos 🔗",
        description: "Explora clubes estudiantiles y comunidades dentro de tu universidad.",
        image: evento1
    },
    {
        title: "Comparte tu vibe 🔊",
        description: "Publica tus ideas, memes, consejos o experiencias universitarias.",
        image: evento2
    },
];

const Eventos = () => {
    // Duplicamos los datos para un scroll infinito sin saltos
    const sliderData = [...eventosData, ...eventosData];

    return (
        <section className="eventos-section">
            <ThemeToggle />
            <h2 className="slider-title">Descubre lo mejor de tu vida universitaria</h2>
            <p className="slider-subtitle">Vibe-U te mantiene al tanto de todo lo que sucede en tu campus. ¡Desplázate para ver!</p>
            <div className="slider-container">
                <div className="slider-inner">
                    {sliderData.map((item, index) => (
                        <div className="slide-card" key={index}>
                            <img src={item.image} alt={item.title} className="slide-image" loading="lazy"/>
                            <h3 className="slide-card-title">{item.title}</h3>
                            <p className="slide-description">{item.description}</p>
                        </div>
                    ))}
                </div>
            </div>
        </section>
    );
};

export default Eventos;