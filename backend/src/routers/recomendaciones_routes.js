import express from "express";
import { verificarTokenJWT } from "../middlewares/JWT.js";
import { obtenerRecomendaciones } from "../controllers/recomendaciones_controller.js";

const router = express.Router();

router.use(verificarTokenJWT);
router.get("/", obtenerRecomendaciones);

export default router;
