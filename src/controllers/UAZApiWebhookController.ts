import { Request, Response } from "express";
import * as Sentry from "@sentry/node";
import logger from "../utils/logger";
import Whatsapp from "../models/Whatsapp";
import { getIO } from "../libs/socket";
import { getUAZApi } from "../libs/uazapi";
import { ReceivedUAZApi } from "../services/UAZApi/ReceivedUAZApi";

// Handler principal para webhooks da UAZApi
export const uazapiWebhookHandler = async (
  req: Request,
  res: Response
): Promise<Response> => {
  try {
    const { whatsappId, event: urlEvent, messageType } = req.params;
    const webhookData = req.body;

    // O evento pode vir na URL (se addUrlEvents=true) ou no body
    const event = urlEvent || webhookData.event || webhookData.type;

    logger.info(`[UAZApi] === WEBHOOK RECEIVED ===`);
    logger.info(`[UAZApi] WhatsApp ID: ${whatsappId}`);
    logger.info(`[UAZApi] Event: ${event}`);
    logger.info(`[UAZApi] Message Type: ${messageType || 'N/A'}`);
    logger.info(`[UAZApi] Body: ${JSON.stringify(webhookData, null, 2)}`);

    const whatsapp = await Whatsapp.findByPk(whatsappId);

    if (!whatsapp) {
      logger.warn(`[UAZApi] Whatsapp ${whatsappId} not found`);
      return res.status(404).json({ error: "Whatsapp not found" });
    }

    if (whatsapp.provider !== "uazapi") {
      logger.warn(`[UAZApi] Whatsapp ${whatsappId} is not using UAZApi provider`);
      return res.status(400).json({ error: "Whatsapp is not using UAZApi provider" });
    }

    const io = getIO();

    // Processar eventos da UAZApi
    switch (event) {
      case "connection":
      case "connection.update":
        await ReceivedUAZApi.handleConnectionEvent(whatsapp, webhookData.data || webhookData, io);
        break;

      case "messages":
      case "message":
        await ReceivedUAZApi.handleMessageEvent(whatsapp, webhookData.data || webhookData, io);
        break;

      case "messages_update":
      case "message.update":
      case "message.status":
        await ReceivedUAZApi.handleMessageUpdateEvent(whatsapp, webhookData.data || webhookData, io);
        break;

      case "files":
      case "file":
      case "FileDownloaded":
        // Evento de arquivo baixado - contém mídia descriptografada
        logger.info("[UAZApi] File event received, processing...");
        await ReceivedUAZApi.handleMessageUpdateEvent(whatsapp, webhookData.data || webhookData, io);
        break;

      case "contacts":
        logger.info("[UAZApi] Contacts update:", webhookData);
        break;

      case "chats":
        logger.info("[UAZApi] Chats update:", webhookData);
        break;

      case "presence":
        logger.info("[UAZApi] Presence update:", webhookData);
        break;

      case "groups":
        logger.info("[UAZApi] Groups update:", webhookData);
        break;

      default:
        logger.info(`[UAZApi] Unhandled event [${event}]:`, JSON.stringify(webhookData));
    }

    return res.status(200).json({ success: true });
  } catch (error: any) {
    Sentry.captureException(error);
    logger.error("[UAZApi] Error processing webhook:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
};

