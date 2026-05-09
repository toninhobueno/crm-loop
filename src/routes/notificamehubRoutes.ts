import { Router } from "express";
import isAuth from "../middleware/isAuth";
import * as NotificameHubController from "../controllers/NotificameHubController";

const notificamehubRoutes = Router();

// Listar canais da empresa (usa token salvo)
notificamehubRoutes.get(
  "/notificamehub/channels",
  isAuth,
  NotificameHubController.listChannels
);

// Listar canais com token fornecido (para teste/validação)
notificamehubRoutes.post(
  "/notificamehub/channels",
  isAuth,
  NotificameHubController.listChannelsWithToken
);

// Validar token
notificamehubRoutes.post(
  "/notificamehub/validate-token",
  isAuth,
  NotificameHubController.validateToken
);

// Salvar token da empresa
notificamehubRoutes.post(
  "/notificamehub/token",
  isAuth,
  NotificameHubController.saveToken
);

// Obter status do token da empresa
notificamehubRoutes.get(
  "/notificamehub/token",
  isAuth,
  NotificameHubController.getToken
);

// Configurar tokens automaticamente
notificamehubRoutes.post(
  "/notificamehub/configure-tokens",
  isAuth,
  NotificameHubController.configureTokens
);

// Reconectar sessão e reconfigurar webhook
notificamehubRoutes.post(
  "/notificamehub/reconnect/:whatsappId",
  isAuth,
  NotificameHubController.reconnectSession
);

// Verificar status da sessão
notificamehubRoutes.get(
  "/notificamehub/session/:whatsappId",
  isAuth,
  NotificameHubController.getSessionStatus
);

export default notificamehubRoutes;
