import mongoose from 'mongoose';

// 1. Necesitamos definir qué datos lleva cada comentario
const ComentarioSchema = new mongoose.Schema({
    autor: String,
    autorFoto: String,
    autorEmail: String,
    contenido: String,
    fecha: { type: Date, default: Date.now }
});

// 2. Modificamos el PostSchema para que incluya los comentarios
const PostSchema = new mongoose.Schema({
    autor: String,
    autorFoto: String, 
    autorEmail: String,
    contenido: String,
    foto: String, 
    fecha: { type: Date, default: Date.now },
    // AUMENTO CRÍTICO: Aquí se guardarán los comentarios de cada post
    comentarios: [ComentarioSchema] 
});

const GrupoSchema = new mongoose.Schema({
    nombre: { type: String, required: true },
    imagen: { type: String },
    descripcion: { type: String, default: "" },
    creadorEmail: { type: String, required: true },
    miembrosArray: { type: [String], default: [] },
    tags: { type: [String], default: [] },
    posts: [PostSchema]
}, { timestamps: true });

const Grupo = mongoose.model('Grupo', GrupoSchema);
export default Grupo;
