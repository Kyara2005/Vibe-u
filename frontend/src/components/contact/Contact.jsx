import { useState } from 'react';
import './Contact.css';
import PrototipoCelular from '../../assets/prototipo-celular.png';

const WHATSAPP_NUMBER = '593963267963';

const Contact = () => {
    const [form, setForm] = useState({
        nombre: '',
        correo: '',
        celular: '',
        observaciones: '',
        terminos: false,
    });

    const handleChange = (e) => {
        const { name, value, type, checked } = e.target;
        setForm((prev) => ({
            ...prev,
            [name]: type === 'checkbox' ? checked : value,
        }));
    };

    const handleSubmit = (e) => {
        e.preventDefault();

        const message = [
            'Hola, tengo una consulta desde Vibe-U.',
            '',
            `Nombre: ${form.nombre}`,
            `Correo: ${form.correo}`,
            `Celular: ${form.celular}`,
            `Mensaje: ${form.observaciones.trim() || 'Sin observaciones'}`,
        ].join('\n');

        const url = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(message)}`;
        window.open(url, '_blank', 'noopener,noreferrer');
    };

    return (
        <section className="contact" id="contact">
            <h2 className="contact__title">¿Tienes preguntas? Escríbenos</h2>
            <div className="contact__form-container">
                <div className="contact__img">
                    <img src={PrototipoCelular} alt="Imagen de contacto" />
                </div>

                <form onSubmit={handleSubmit} className="contact__form">
                    <input
                        type="text"
                        name="nombre"
                        placeholder="Nombre"
                        value={form.nombre}
                        onChange={handleChange}
                        required
                    />
                    <input
                        type="email"
                        name="correo"
                        placeholder="Correo"
                        value={form.correo}
                        onChange={handleChange}
                        required
                    />
                    <input
                        type="tel"
                        name="celular"
                        placeholder="Celular"
                        value={form.celular}
                        onChange={handleChange}
                        required
                    />
                    <textarea
                        name="observaciones"
                        placeholder="Escribe tus dudas..."
                        rows="4"
                        value={form.observaciones}
                        onChange={handleChange}
                    />

                    <label className="checkbox__label">
                        <input
                            type="checkbox"
                            name="terminos"
                            checked={form.terminos}
                            onChange={handleChange}
                            required
                        />{' '}
                        Acepto términos y condiciones
                    </label>
                    <button type="submit" className="btn button">Enviar por WhatsApp</button>
                </form>
            </div>
        </section>
    );
};

export default Contact;
