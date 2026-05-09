import { Request, Response } from "express";
import * as Sentry from "@sentry/node";
import Whatsapp from "../models/Whatsapp";
import { ReceivedNotificameHub } from "../services/NotificameHub/ReceivedNotificameHub";
import logger from "../utils/logger";
import { INotificameHubWebhookPayload } from "../libs/notificamehub/INotificameHub.interfaces";

export const webhookNotificameHub = async (
  req: Request,
  res: Response
): Promise<Response> => {
  try {
    const { whatsappId } = req.params;
    const payload = req.body as INotificameHubWebhookPayload;

    logger.info(
      `[NotificameHub Webhook] Received for whatsappId ${whatsappId}: ${JSON.stringify(
        payload
      ).substring(0, 500)}...`
    );

    // Buscar whatsapp
    let whatsapp = await Whatsapp.findByPk(whatsappId);

    // Se não encontrar pelo ID, tentar pelo subscriptionId/notificamehubChannelId
    if (!whatsapp && payload.subscriptionId) {
      logger.info(
        `[NotificameHub Webhook] Trying to find by subscriptionId: ${payload.subscriptionId}`
      );
      whatsapp = await Whatsapp.findOne({
        where: {
          notificamehubChannelId: payload.subscriptionId,
          provider: "notificamehub"
        }
      });
    }

    if (!whatsapp) {
      logger.warn(
        `[NotificameHub Webhook] WhatsApp connection not found: ${whatsappId} (subscriptionId: ${payload.subscriptionId})`
      );
      return res.status(404).json({ error: "WhatsApp connection not found" });
    }

    if (whatsapp.provider !== "notificamehub") {
      logger.warn(
        `[NotificameHub Webhook] Invalid provider for whatsappId ${whatsappId}: ${whatsapp.provider}`
      );
      return res.status(400).json({ error: "Invalid provider" });
    }

    logger.info(
      `[NotificameHub Webhook] Found connection: id=${whatsapp.id}, name=${whatsapp.name}, channel=${whatsapp.channel}, status=${whatsapp.status}`
    );

    // Se a conexão não está CONNECTED, marcar como CONNECTED ao receber webhook
    if (whatsapp.status !== "CONNECTED") {
      logger.info(`[NotificameHub Webhook] Marking connection ${whatsapp.id} as CONNECTED (was ${whatsapp.status})`);
      await whatsapp.update({ status: "CONNECTED", qrcode: "", retries: 0 });
      
      // Emitir evento via socket para atualizar frontend
      const io = require("../libs/socket").getIO();
      io.of(String(whatsapp.companyId)).emit(`company-${whatsapp.companyId}-whatsappSession`, {
        action: "update",
        session: whatsapp
      });
    }

    // Processar webhook de forma assíncrona
    ReceivedNotificameHub.processWebhook(whatsapp, payload).catch(err => {
      Sentry.captureException(err);
      logger.error(
        `[NotificameHub Webhook] Error processing webhook: ${err.message}`,
        err.stack
      );
    });

    // Responder imediatamente
    return res.status(200).json({ success: true });
  } catch (error: any) {
    Sentry.captureException(error);
    logger.error(`[NotificameHub Webhook] Error: ${error.message}`, error.stack);
    return res.status(500).json({ error: error.message });
  }
};

// Endpoint genérico que busca pelo subscriptionId do payload
export const webhookNotificameHubGeneric = async (
  req: Request,
  res: Response
): Promise<Response> => {
  try {
    const payload = req.body as INotificameHubWebhookPayload;

    logger.info(
      `[NotificameHub Webhook Generic] Received: ${JSON.stringify(payload).substring(0, 500)}...`
    );

    // Buscar whatsapp pelo subscriptionId ou pelo channel "to"
    const subscriptionId = payload.subscriptionId || payload.message?.to;

    if (!subscriptionId) {
      logger.warn(`[NotificameHub Webhook Generic] No subscriptionId in payload`);
      return res.status(400).json({ error: "subscriptionId not found in payload" });
    }

    const whatsapp = await Whatsapp.findOne({
      where: {
        notificamehubChannelId: subscriptionId,
        provider: "notificamehub"
      }
    });

    if (!whatsapp) {
      logger.warn(
        `[NotificameHub Webhook Generic] WhatsApp connection not found for subscriptionId: ${subscriptionId}`
      );
      return res.status(404).json({ error: "WhatsApp connection not found" });
    }

    logger.info(
      `[NotificameHub Webhook Generic] Found connection: id=${whatsapp.id}, name=${whatsapp.name}, channel=${whatsapp.channel}, status=${whatsapp.status}`
    );

    // Se a conexão não está CONNECTED, marcar como CONNECTED ao receber webhook
    if (whatsapp.status !== "CONNECTED") {
      logger.info(`[NotificameHub Webhook Generic] Marking connection ${whatsapp.id} as CONNECTED (was ${whatsapp.status})`);
      await whatsapp.update({ status: "CONNECTED", qrcode: "", retries: 0 });
      
      // Emitir evento via socket para atualizar frontend
      const io = require("../libs/socket").getIO();
      io.of(String(whatsapp.companyId)).emit(`company-${whatsapp.companyId}-whatsappSession`, {
        action: "update",
        session: whatsapp
      });
    }

    // Processar webhook de forma assíncrona
    ReceivedNotificameHub.processWebhook(whatsapp, payload).catch(err => {
      Sentry.captureException(err);
      logger.error(
        `[NotificameHub Webhook Generic] Error processing webhook: ${err.message}`,
        err.stack
      );
    });

    // Responder imediatamente
    return res.status(200).json({ success: true });
  } catch (error: any) {
    Sentry.captureException(error);
    logger.error(`[NotificameHub Webhook Generic] Error: ${error.message}`, error.stack);
    return res.status(500).json({ error: error.message });
  }
};

// Endpoint de verificação para configuração de webhook
export const verifyWebhook = async (
  req: Request,
  res: Response
): Promise<Response> => {
  const { whatsappId } = req.params;

  logger.info(`[NotificameHub Webhook] Verification request for ${whatsappId}`);

  // O NotificameHub pode enviar um GET para verificar o endpoint
  // Simplesmente responder com sucesso
  return res.status(200).json({
    status: "ok",
    whatsappId,
    timestamp: new Date().toISOString()
  });
};

// Endpoint de teste
export const testWebhook = async (
  req: Request,
  res: Response
): Promise<Response> => {
  logger.info(`[NotificameHub Webhook] Test endpoint called`);

  return res.status(200).json({
    status: "ok",
    message: "NotificameHub webhook is working",
    timestamp: new Date().toISOString()
  });
};

// ===== Rotas compatíveis com HubEcosystem =====

// Verificação de webhook no formato HubEcosystem (responde com hub.challenge)
export const verifyHubWebhook = async (
  req: Request,
  res: Response
): Promise<Response> => {
  const { channelId } = req.params;

  logger.info(`[HubEcosystem Webhook] Verification request for channelId: ${channelId}`);
  logger.info(`[HubEcosystem Webhook] Query params: ${JSON.stringify(req.query)}`);

  // O NotificameHub envia hub.challenge na query para verificação
  const challenge = req.query["hub.challenge"];

  if (challenge) {
    logger.info(`[HubEcosystem Webhook] Responding with challenge: ${challenge}`);
    return res.send(challenge);
  }

  return res.status(200).json({
    status: "ok",
    channelId,
    timestamp: new Date().toISOString()
  });
};

// Webhook no formato HubEcosystem (busca pelo token do canal)
export const webhookHubEcosystem = async (
  req: Request,
  res: Response
): Promise<Response> => {
  try {
    const { channelId } = req.params;
    const payload = req.body as INotificameHubWebhookPayload;

    logger.info(
      `[HubEcosystem Webhook] Received for channelId ${channelId}: ${JSON.stringify(
        payload
      ).substring(0, 500)}...`
    );

    // Buscar whatsapp pelo token do canal (notificamehubChannelId)
    const whatsapp = await Whatsapp.findOne({
      where: {
        notificamehubChannelId: channelId,
        provider: "notificamehub"
      }
    });

    if (!whatsapp) {
      logger.warn(
        `[HubEcosystem Webhook] WhatsApp connection not found for channelId: ${channelId}`
      );
      return res.status(404).json({ error: "WhatsApp connection not found" });
    }

    logger.info(
      `[HubEcosystem Webhook] Found connection: id=${whatsapp.id}, name=${whatsapp.name}, channel=${whatsapp.channel}, status=${whatsapp.status}`
    );

    // Se a conexão não está CONNECTED, marcar como CONNECTED ao receber webhook
    if (whatsapp.status !== "CONNECTED") {
      logger.info(`[HubEcosystem Webhook] Marking connection ${whatsapp.id} as CONNECTED (was ${whatsapp.status})`);
      await whatsapp.update({ status: "CONNECTED", qrcode: "", retries: 0 });
      
      // Emitir evento via socket para atualizar frontend
      const io = require("../libs/socket").getIO();
      io.of(String(whatsapp.companyId)).emit(`company-${whatsapp.companyId}-whatsappSession`, {
        action: "update",
        session: whatsapp
      });
    }

    // Processar webhook de forma assíncrona
    ReceivedNotificameHub.processWebhook(whatsapp, payload).catch(err => {
      Sentry.captureException(err);
      logger.error(
        `[HubEcosystem Webhook] Error processing webhook: ${err.message}`,
        err.stack
      );
    });

    // Responder imediatamente
    return res.status(200).json({ message: "Webhook received" });
  } catch (error: any) {
    Sentry.captureException(error);
    logger.error(`[HubEcosystem Webhook] Error: ${error.message}`, error.stack);
    return res.status(500).json({ error: error.message });
  }
};
