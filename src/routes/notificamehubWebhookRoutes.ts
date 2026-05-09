import { Router } from "express";
import {
  webhookNotificameHub,
  webhookNotificameHubGeneric,
  webhookHubEcosystem,
  verifyWebhook,
  verifyHubWebhook,
  testWebhook
} from "../controllers/NotificameHubWebhookController";

const notificamehubWebhookRoutes = Router();

// Endpoint de teste
notificamehubWebhookRoutes.get("/webhooks/notificamehub/test", testWebhook);

// Endpoint genérico (sem whatsappId na URL) - busca pelo subscriptionId do payload
notificamehubWebhookRoutes.post(
  "/webhooks/notificamehub",
  webhookNotificameHubGeneric
);

// Endpoint de verificação (GET)
notificamehubWebhookRoutes.get(
  "/webhooks/notificamehub/:whatsappId",
  verifyWebhook
);

// Endpoint principal de webhook (POST) com whatsappId na URL
notificamehubWebhookRoutes.post(
  "/webhooks/notificamehub/:whatsappId",
  webhookNotificameHub
);

// ===== Rotas compatíveis com HubEcosystem (formato /hub-webhook/:channelId) =====

// Endpoint de verificação HubEcosystem (GET) - responde com hub.challenge
notificamehubWebhookRoutes.get(
  "/hub-webhook/:channelId",
  verifyHubWebhook
);

// Endpoint principal HubEcosystem (POST) - busca pelo token do canal
notificamehubWebhookRoutes.post(
  "/hub-webhook/:channelId",
  webhookHubEcosystem
);

export default notificamehubWebhookRoutes;
