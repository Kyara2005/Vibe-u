import mongoose from "mongoose";

const eventoSchema = new mongoose.Schema(
  {
    nombreEvento: { type: String, required: true, trim: true },
    portada: { type: String, default: "" },
    fechaHora: { type: Date, required: true },
    lugar: { type: String, required: true, trim: true },
    descripcionEvento: { type: String, required: true, trim: true },
    costo: { type: String, required: true, trim: true },
    universidad: { type: String, required: true, trim: true, index: true },
    tags: { type: [String], default: [] },
    creador: { type: mongoose.Schema.Types.ObjectId, ref: "Usuario", required: true },
    asistentes: [{ type: mongoose.Schema.Types.ObjectId, ref: "Usuario" }],
    recordatoriosEnviados: [{ type: mongoose.Schema.Types.ObjectId, ref: "Usuario" }],
  },
  { timestamps: true }
);

export default mongoose.model("Evento", eventoSchema);
