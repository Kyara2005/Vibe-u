import express from "express";
import { verificarTokenJWT } from "../middlewares/JWT.js";
import {
  listAvailableUsers,
  listConversations,
  getMessagesByUser,
  sendMessage,
  getChatUnread,
} from "../controllers/chat_controller.js";

const router = express.Router();

router.use(verificarTokenJWT);

router.get("/users", listAvailableUsers);
router.get("/conversations", listConversations);
router.get("/unread", getChatUnread);
router.get("/messages/:userId", getMessagesByUser);
router.post("/messages", sendMessage);

export default router;
