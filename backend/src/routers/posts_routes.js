import express from "express";
import {
  obtenerPosts,
  crearPost,
  toggleLikePost,
  comentarPost,
  uploadPostMedia,
  eliminarPost,
  eliminarComentarioPost,
} from "../controllers/posts.controller.js";
import { verificarTokenJWT } from "../middlewares/JWT.js";
import upload from "../middlewares/upload.js";

const router = express.Router();

router.get("/posts", obtenerPosts);
router.post("/posts", verificarTokenJWT, crearPost);
router.post("/posts/upload-media", verificarTokenJWT, (req, res, next) => {
  upload.single("media")(req, res, (err) => {
    if (err) {
      const isTooLarge = err.code === "LIMIT_FILE_SIZE";
      return res.status(400).json({
        message: isTooLarge
          ? "El archivo supera el limite permitido de 60MB"
          : (err.message || "No se pudo procesar el archivo"),
      });
    }
    next();
  });
}, uploadPostMedia);
router.post("/posts/:id/like", verificarTokenJWT, toggleLikePost);
router.post("/posts/:id/comentar", verificarTokenJWT, comentarPost);
router.delete("/posts/:id", verificarTokenJWT, eliminarPost);
router.delete("/posts/:id/comentarios/:commentId", verificarTokenJWT, eliminarComentarioPost);

export default router;
