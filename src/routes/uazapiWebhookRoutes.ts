import { Router } from "express";
import { uazapiWebhookHandler } from "../controllers/UAZApiWebhookController";
import logger from "../utils/logger";
import { getUAZApi } from "../libs/uazapi";
import Whatsapp from "../models/Whatsapp";

const uazapiWebhookRoutes = Router();

// Rota de teste para verificar se o webhook está acessível
uazapiWebhookRoutes.get(
  "/webhooks/uazapi/test",
  (req, res) => {
    logger.info("[UAZApi] Webhook test endpoint accessed");
    return res.status(200).json({
      status: "ok",
      message: "UAZApi webhook endpoint is working",
      timestamp: new Date().toISOString()
    });
  }
);

// Rota para configurar webhook manualmente
uazapiWebhookRoutes.get(
  "/webhooks/uazapi/setup/:whatsappId",
  async (req, res) => {
    try {
      const { whatsappId } = req.params;
      const { url } = req.query;

      if (!url) {
        return res.status(400).json({
          error: "URL is required",
          usage: "/webhooks/uazapi/setup/:whatsappId?url=https://seudominio.com"
        });
      }

      const whatsapp = await Whatsapp.findByPk(whatsappId);
      if (!whatsapp) {
        return res.status(404).json({ error: "WhatsApp not found" });
      }

      if (whatsapp.provider !== "uazapi") {
        return res.status(400).json({ error: "WhatsApp is not using UAZApi provider" });
      }

      const uazapi = getUAZApi(whatsapp.id);
      const webhookUrl = `${url}/webhooks/uazapi/${whatsappId}`;

      await uazapi.setWebhook(webhookUrl);

      // Salvar URL no banco
      await whatsapp.update({ webhookUrl });

      logger.info(`[UAZApi] Webhook configured for WhatsApp ${whatsappId}: ${webhookUrl}`);

      return res.status(200).json({
        success: true,
        message: "Webhook configured successfully",
        webhookUrl
      });
    } catch (error: any) {
      logger.error(`[UAZApi] Error setting up webhook: ${error.message}`);
      return res.status(500).json({ error: error.message });
    }
  }
);

// Rota para ver configuração atual do webhook
uazapiWebhookRoutes.get(
  "/webhooks/uazapi/info/:whatsappId",
  async (req, res) => {
    try {
      const { whatsappId } = req.params;

      const whatsapp = await Whatsapp.findByPk(whatsappId);
      if (!whatsapp) {
        return res.status(404).json({ error: "WhatsApp not found" });
      }

      if (whatsapp.provider !== "uazapi") {
        return res.status(400).json({ error: "WhatsApp is not using UAZApi provider" });
      }

      const uazapi = getUAZApi(whatsapp.id);
      const webhookConfig = await uazapi.getWebhook();

      return res.status(200).json({
        whatsappId: whatsapp.id,
        name: whatsapp.name,
        status: whatsapp.status,
        savedWebhookUrl: whatsapp.webhookUrl,
        uazapiWebhookConfig: webhookConfig
      });
    } catch (error: any) {
      logger.error(`[UAZApi] Error getting webhook info: ${error.message}`);
      return res.status(500).json({ error: error.message });
    }
  }
);

// Rota para receber webhooks da UAZApi
uazapiWebhookRoutes.post(
  "/webhooks/uazapi/:whatsappId",
  uazapiWebhookHandler
);

// Rota com evento na URL: /webhooks/uazapi/:whatsappId/:event
uazapiWebhookRoutes.post(
  "/webhooks/uazapi/:whatsappId/:event",
  uazapiWebhookHandler
);

// Rota com evento e tipo na URL: /webhooks/uazapi/:whatsappId/:event/:messageType
uazapiWebhookRoutes.post(
  "/webhooks/uazapi/:whatsappId/:event/:messageType",
  uazapiWebhookHandler
);

export default uazapiWebhookRoutes;

