// server.js
import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import usuarioRouter from "./routers/usuario_routes.js";
import gruposRouter from "./routers/grupos_routes.js";
import adminRoutes from './routers/admin_routes.js';
import automatizacionRouter from "./routers/automatizacion_routes.js";
import postsRouter from "./routers/posts.routes.js";
import chatRouter from "./routers/chat_routes.js";
import eventosRouter from "./routers/eventos_routes.js";
import recomendacionesRouter from "./routers/recomendaciones_routes.js";
import path from "path";
import { fileURLToPath } from "url";

dotenv.config();

const app = express();
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const allowedOrigins = [
    process.env.URL_FRONTEND,
    "https://vibeu-app.linkpc.net",
    "http://localhost:5173"
].filter(Boolean);

const corsOptions = {
    origin(origin, callback) {
        // Permite herramientas sin Origin (curl/postman/server-to-server)
        if (!origin) return callback(null, true);
        if (allowedOrigins.includes(origin)) return callback(null, true);
        return callback(new Error(`Origen no permitido por CORS: ${origin}`));
    },
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
    credentials: true
};

app.use(cors(corsOptions));
app.options(/.*/, cors(corsOptions));
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ limit: "50mb", extended: true }));
app.use("/uploads", express.static(path.join(__dirname, "..", "uploads")));

app.set("port", process.env.PORT || 3000);

app.get("/", (req, res) => res.send("Server on"));
app.use("/api/usuarios", usuarioRouter);
app.use("/api/grupos", gruposRouter);
app.use("/api/admins", adminRoutes);
app.use("/api/automatizacion", automatizacionRouter);
app.use("/api", postsRouter);
app.use("/api/chat", chatRouter);
app.use("/api/eventos", eventosRouter);
app.use("/api/recomendaciones", recomendacionesRouter);

app.use((req, res) => res.status(404).send("Endpoint no encontrado - 404"));

export default app;
