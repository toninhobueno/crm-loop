import { Request, Response } from "express";
import * as Sentry from "@sentry/node";
import logger from "../utils/logger";
import CompaniesSettings from "../models/CompaniesSettings";
import Whatsapp from "../models/Whatsapp";
import ConfigureNotificameHubTokens from "../services/NotificameHub/ConfigureNotificameHubTokens";
import {
  listNotificameHubChannels,
  validateNotificameHubToken,
  restartNotificameHubSession,
  hasNotificameHubSession
} from "../libs/notificamehub";

// Listar canais disponíveis usando o token geral da empresa
export const listChannels = async (
  req: Request,
  res: Response
): Promise<Response> => {
  try {
    const { companyId } = req.user;

    // Buscar configurações da empresa
    const settings = await CompaniesSettings.findOne({
      where: { companyId }
    });

    if (!settings?.notificamehubToken) {
      return res.status(400).json({
        error: "Token NotificameHub não configurado. Configure nas configurações da empresa."
      });
    }

    // Listar canais
    const channels = await listNotificameHubChannels(settings.notificamehubToken);

    logger.info(
      `[NotificameHub] Listed ${channels.length} channels for company ${companyId}`
    );

    return res.status(200).json(channels);
  } catch (error: any) {
    Sentry.captureException(error);
    logger.error(`[NotificameHub] Error listing channels: ${error.message}`);

    if (error.response?.status === 401) {
      return res.status(401).json({
        error: "Token NotificameHub inválido ou expirado"
      });
    }

    return res.status(500).json({ error: error.message });
  }
};

// Listar canais usando token fornecido (para teste/validação)
export const listChannelsWithToken = async (
  req: Request,
  res: Response
): Promise<Response> => {
  try {
    const { token } = req.body;

    if (!token) {
      return res.status(400).json({ error: "Token é obrigatório" });
    }

    // Listar canais
    const channels = await listNotificameHubChannels(token);

    logger.info(`[NotificameHub] Listed ${channels.length} channels with provided token`);

    return res.status(200).json(channels);
  } catch (error: any) {
    Sentry.captureException(error);
    logger.error(`[NotificameHub] Error listing channels: ${error.message}`);

    if (error.response?.status === 401) {
      return res.status(401).json({
        error: "Token NotificameHub inválido ou expirado"
      });
    }

    return res.status(500).json({ error: error.message });
  }
};

// Validar token NotificameHub
export const validateToken = async (
  req: Request,
  res: Response
): Promise<Response> => {
  try {
    const { token } = req.body;

    if (!token) {
      return res.status(400).json({ error: "Token é obrigatório" });
    }

    const isValid = await validateNotificameHubToken(token);

    return res.status(200).json({ valid: isValid });
  } catch (error: any) {
    Sentry.captureException(error);
    logger.error(`[NotificameHub] Error validating token: ${error.message}`);
    return res.status(500).json({ error: error.message });
  }
};

// Salvar token geral nas configurações da empresa
export const saveToken = async (
  req: Request,
  res: Response
): Promise<Response> => {
  try {
    const { companyId } = req.user;
    const { token } = req.body;

    if (!token) {
      return res.status(400).json({ error: "Token é obrigatório" });
    }

    // Validar token antes de salvar
    const isValid = await validateNotificameHubToken(token);

    if (!isValid) {
      return res.status(400).json({ error: "Token NotificameHub inválido" });
    }

    // Buscar ou criar configurações
    let settings = await CompaniesSettings.findOne({
      where: { companyId }
    });

    if (settings) {
      await settings.update({ notificamehubToken: token });
    } else {
      settings = await CompaniesSettings.create({
        companyId,
        notificamehubToken: token
      });
    }

    // AUTOMATICAMENTE CONFIGURAR TODAS AS CONEXÕES NOTIFICAMEHUB
    const whatsappsToUpdate = await Whatsapp.findAll({
      where: {
        companyId,
        provider: "notificamehub"
      }
    });

    for (const whatsapp of whatsappsToUpdate) {
      const updateData: any = {
        notificamehubToken: token
      };

      // Se for Instagram e não tiver channelId, usar o padrão
      if (whatsapp.channel === "instagram" && !whatsapp.notificamehubChannelId) {
        updateData.notificamehubChannelId = "282ed6e3-5587-4047-9dd2-29c49c902cff";
      }

      await whatsapp.update(updateData);
      logger.info(`[NotificameHub] Conexão ${whatsapp.id} (${whatsapp.name}) configurada automaticamente com token`);
    }

    logger.info(`[NotificameHub] Token saved for company ${companyId} and ${whatsappsToUpdate.length} connections updated`);

    return res.status(200).json({ 
      success: true,
      connectionsUpdated: whatsappsToUpdate.length
    });
  } catch (error: any) {
    Sentry.captureException(error);
    logger.error(`[NotificameHub] Error saving token: ${error.message}`);
    return res.status(500).json({ error: error.message });
  }
};

// Obter token da empresa
export const getToken = async (
  req: Request,
  res: Response
): Promise<Response> => {
  try {
    const { companyId } = req.user;

    const settings = await CompaniesSettings.findOne({
      where: { companyId }
    });

    const hasToken = !!settings?.notificamehubToken;

    // Por segurança, não retornamos o token completo, apenas se existe
    return res.status(200).json({
      hasToken,
      // Mascarar token para exibição
      token: hasToken
        ? `${settings.notificamehubToken.substring(0, 8)}...${settings.notificamehubToken.slice(-4)}`
        : null
    });
  } catch (error: any) {
    Sentry.captureException(error);
    logger.error(`[NotificameHub] Error getting token: ${error.message}`);
    return res.status(500).json({ error: error.message });
  }
};

// Reconectar sessão NotificameHub e reconfigurar webhook
export const reconnectSession = async (
  req: Request,
  res: Response
): Promise<Response> => {
  try {
    const { whatsappId } = req.params;
    const { companyId } = req.user;

    // Buscar conexão
    const whatsapp = await Whatsapp.findByPk(whatsappId);

    if (!whatsapp) {
      return res.status(404).json({ error: "Conexão não encontrada" });
    }

    if (whatsapp.companyId !== companyId) {
      return res.status(403).json({ error: "Acesso não autorizado" });
    }

    if (whatsapp.provider !== "notificamehub") {
      return res.status(400).json({ error: "Conexão não é do tipo NotificameHub" });
    }

    logger.info(`[NotificameHub] Reconnecting session for whatsappId ${whatsappId}`);

    // Reiniciar sessão (isso reconfigura o webhook)
    await restartNotificameHubSession(whatsapp);

    logger.info(`[NotificameHub] Session reconnected successfully`);

    return res.status(200).json({
      success: true,
      message: "Sessão reconectada e webhook reconfigurado"
    });
  } catch (error: any) {
    Sentry.captureException(error);
    logger.error(`[NotificameHub] Error reconnecting session: ${error.message}`);
    return res.status(500).json({ error: error.message });
  }
};

// Configurar tokens automaticamente para todas as conexões NotificameHub
export const configureTokens = async (
  req: Request,
  res: Response
): Promise<Response> => {
  try {
    const { companyId } = req.user;
    const { apiToken, channelId } = req.body;

    if (!apiToken) {
      return res.status(400).json({ error: "Token da API é obrigatório" });
    }

    // Validar token antes de configurar
    const isValid = await validateNotificameHubToken(apiToken);

    if (!isValid) {
      return res.status(400).json({ error: "Token NotificameHub inválido" });
    }

    // Configurar tokens
    await ConfigureNotificameHubTokens({
      companyId,
      apiToken,
      channelId
    });

    logger.info(`[NotificameHub] Tokens configurados para empresa ${companyId}`);

    return res.status(200).json({
      success: true,
      message: "Tokens configurados com sucesso para todas as conexões NotificameHub"
    });
  } catch (error: any) {
    Sentry.captureException(error);
    logger.error(`[NotificameHub] Erro ao configurar tokens: ${error.message}`);
    return res.status(500).json({ error: error.message });
  }
};

// Verificar status da sessão
export const getSessionStatus = async (
  req: Request,
  res: Response
): Promise<Response> => {
  try {
    const { whatsappId } = req.params;
    const { companyId } = req.user;

    // Buscar conexão
    const whatsapp = await Whatsapp.findByPk(whatsappId);

    if (!whatsapp) {
      return res.status(404).json({ error: "Conexão não encontrada" });
    }

    if (whatsapp.companyId !== companyId) {
      return res.status(403).json({ error: "Acesso não autorizado" });
    }

    const hasSession = hasNotificameHubSession(Number(whatsappId));
    const webhookUrl = `${process.env.BACKEND_URL}/webhooks/notificamehub/${whatsappId}`;

    return res.status(200).json({
      whatsappId: whatsapp.id,
      name: whatsapp.name,
      status: whatsapp.status,
      provider: whatsapp.provider,
      channel: whatsapp.channel,
      hasActiveSession: hasSession,
      webhookUrl
    });
  } catch (error: any) {
    Sentry.captureException(error);
    logger.error(`[NotificameHub] Error getting session status: ${error.message}`);
    return res.status(500).json({ error: error.message });
  }
};
