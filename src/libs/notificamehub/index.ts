import NotificameHubClient, {
  listNotificameHubChannels,
  validateNotificameHubToken,
  INotificameHubChannel
} from "./notificamehub.service";
import Whatsapp from "../../models/Whatsapp";
import { getIO } from "../socket";
import logger from "../../utils/logger";
import AppError from "../../errors/AppError";

export * from "./INotificameHub.interfaces";
export {
  NotificameHubClient,
  listNotificameHubChannels,
  validateNotificameHubToken,
  INotificameHubChannel
};

// Store das sessões NotificameHub ativas
const notificameHubSessions: Map<number, NotificameHubClient> = new Map();

export const getNotificameHub = (whatsappId: number): NotificameHubClient => {
  const session = notificameHubSessions.get(whatsappId);

  if (!session) {
    throw new AppError("ERR_NOTIFICAMEHUB_NOT_INITIALIZED");
  }

  return session;
};

// Versão assíncrona que tenta inicializar se necessário
export const getOrInitNotificameHub = async (
  whatsappId: number, 
  retryCount: number = 0
): Promise<NotificameHubClient> => {
  let session = notificameHubSessions.get(whatsappId);

  if (!session) {
    // Tentar inicializar a sessão
    const Whatsapp = (await import("../../models/Whatsapp")).default;
    const CompaniesSettings = (await import("../../models/CompaniesSettings")).default;
    let whatsapp = await Whatsapp.findByPk(whatsappId);

    if (!whatsapp) {
      throw new AppError("ERR_WHATSAPP_NOT_FOUND");
    }

    if (whatsapp.provider !== "notificamehub") {
      throw new AppError("ERR_NOT_NOTIFICAMEHUB_PROVIDER");
    }

    logger.info(
      `[NotificameHub] Whatsapp config - Token: ${whatsapp.notificamehubToken ? "present" : "missing"}, ChannelId: ${whatsapp.notificamehubChannelId ? "present" : "missing"}`
    );

    // Se não tiver token ou channelId no whatsapp, buscar das configurações da empresa
    if (!whatsapp.notificamehubToken || !whatsapp.notificamehubChannelId) {
      const settings = await CompaniesSettings.findOne({
        where: { companyId: whatsapp.companyId }
      });

      if (settings?.notificamehubToken) {
        logger.info(
          `[NotificameHub] Fetching token from company settings (companyId: ${whatsapp.companyId})`
        );
        // Update com valores da company settings
        const updateData: any = {};
        if (!whatsapp.notificamehubToken) {
          updateData.notificamehubToken = settings.notificamehubToken;
        }
        
        if (Object.keys(updateData).length > 0) {
          await whatsapp.update(updateData);
        }
        
        // Recarregar whatsapp do banco para pegar todos os campos atualizados
        whatsapp = await Whatsapp.findByPk(whatsappId);
        logger.info(
          `[NotificameHub] After reload - Token: ${whatsapp.notificamehubToken ? "present" : "missing"}, ChannelId: ${whatsapp.notificamehubChannelId ? "present" : "missing"}`
        );
      }
    }

    logger.info(`[NotificameHub] Auto-initializing session for whatsappId ${whatsappId}`);
    
    try {
      session = await initNotificameHubSession(whatsapp);
    } catch (error: any) {
      // Se for erro de autenticação e ainda não tentamos reconectar, tentar
      if (isAuthenticationError(error) && retryCount < 1) {
        logger.warn(
          `[NotificameHub] Authentication error on init, attempting reconnection (attempt ${retryCount + 1}/1)`
        );
        return await reconnectNotificameHub(whatsappId);
      }
      throw error;
    }
  }

  return session;
};

export const removeNotificameHub = async (whatsappId: number): Promise<void> => {
  try {
    const session = notificameHubSessions.get(whatsappId);

    if (session) {
      logger.info(`[NotificameHub] Removing session for whatsapp ${whatsappId}`);
      notificameHubSessions.delete(whatsappId);
    }
  } catch (err) {
    logger.error(`[NotificameHub] Error removing session: ${err}`);
  }
};

// Função para verificar se um erro é de autenticação/sessão
export const isAuthenticationError = (error: any): boolean => {
  if (!error) return false;
  
  // Verificar status HTTP
  if (error.response?.status === 401 || error.response?.status === 403) {
    return true;
  }
  
  // Verificar mensagem de erro
  if (error.message) {
    const authErrors = [
      'AUTHENTICATION_ERROR',
      'ERR_SESSION_EXPIRED',
      'ERR_NOTIFICAMEHUB_TOKEN_INVALID',
      'TOKEN_EXPIRED',
      'UNAUTHORIZED',
      'Invalid token',
      'Token expired',
      'No authorization'
    ];
    
    return authErrors.some(errMsg => 
      error.message.includes(errMsg) || 
      error.message.toUpperCase().includes(errMsg.toUpperCase())
    );
  }
  
  return false;
};

// Função para reconectar automaticamente uma sessão NotificameHub
export const reconnectNotificameHub = async (whatsappId: number): Promise<NotificameHubClient> => {
  try {
    logger.info(`[NotificameHub] Attempting to reconnect session for whatsappId ${whatsappId}`);
    
    // Remover sessão antiga
    await removeNotificameHub(whatsappId);
    
    // Aguardar um pouco antes de reconectar
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Buscar registro do whatsapp
    const Whatsapp = (await import("../../models/Whatsapp")).default;
    const whatsapp = await Whatsapp.findByPk(whatsappId);
    
    if (!whatsapp) {
      throw new AppError("ERR_WHATSAPP_NOT_FOUND");
    }
    
    if (whatsapp.provider !== "notificamehub") {
      throw new AppError("ERR_NOT_NOTIFICAMEHUB_PROVIDER");
    }
    
    logger.info(`[NotificameHub] Reinitializing session for ${whatsapp.name}`);
    
    // Reinicializar sessão
    const newSession = await initNotificameHubSession(whatsapp);
    
    logger.info(`[NotificameHub] Successfully reconnected session for ${whatsapp.name}`);
    
    return newSession;
  } catch (error: any) {
    logger.error(`[NotificameHub] Failed to reconnect session: ${error.message}`);
    throw error;
  }
};

export const initNotificameHubSession = async (
  whatsapp: Whatsapp
): Promise<NotificameHubClient> => {
  try {
    const io = getIO();
    const { id, name, notificamehubToken, notificamehubChannelId, channel, companyId } = whatsapp;

    logger.info(
      `[NotificameHub] initNotificameHubSession - whatsappId: ${id}, name: ${name}, provider: ${whatsapp.provider}, channel: ${channel}`
    );

    if (!notificamehubToken) {
      logger.error(
        `[NotificameHub] Missing token for whatsapp ${id} (${name}). companyId: ${companyId}. Check company NotificameHub settings.`
      );
      throw new AppError(
        "ERR_NOTIFICAMEHUB_CONFIG_REQUIRED: Token da API NotificameHub é obrigatório. Configure nas configurações da empresa."
      );
    }

    if (!notificamehubChannelId) {
      logger.error(
        `[NotificameHub] Missing channelId for whatsapp ${id} (${name}). companyId: ${companyId}. Check WhatsApp connection settings.`
      );
      throw new AppError(
        "ERR_NOTIFICAMEHUB_CONFIG_REQUIRED: Channel ID do NotificameHub é obrigatório. Configure na conexão WhatsApp."
      );
    }

    // Validar canal - aceitar variações do WhatsApp Business
    const validChannels = ["whatsapp", "instagram", "facebook", "whatsapp_business_account"];
    let notificameChannel = channel || "whatsapp";
    
    // Normalizar whatsapp_business_account para whatsapp
    if (notificameChannel === "whatsapp_business_account") {
      notificameChannel = "whatsapp";
    }

    // Validar usando o canal original (antes da normalização)
    const channelToValidate = channel || "whatsapp";
    if (!validChannels.includes(channelToValidate)) {
      throw new AppError(
        `ERR_NOTIFICAMEHUB_INVALID_CHANNEL: Canal inválido '${channelToValidate}'. Use: ${validChannels.join(", ")}`
      );
    }

    logger.info(
      `NotificameHub: Initializing session for ${name} (original: ${channelToValidate}, normalized: ${notificameChannel})`
    );

    // Criar cliente NotificameHub
    const client = new NotificameHubClient({
      token: notificamehubToken,
      channelId: notificamehubChannelId,
      channel: notificameChannel as "whatsapp" | "instagram" | "facebook",
      whatsappId: id
    });

    // Armazenar sessão
    notificameHubSessions.set(id, client);

    // Configurar webhook (formato HubEcosystem: /hub-webhook/:token)
    const backendUrl = process.env.BACKEND_URL
    // Usar o token do canal ao invés do whatsappId para compatibilidade com HubEcosystem
    const webhookUrl = `${backendUrl}/hub-webhook/${notificamehubChannelId}`;

    try {
      await client.createWebhookSubscription(webhookUrl);
      logger.info(`NotificameHub: Webhook configured: ${webhookUrl}`);
    } catch (webhookError: any) {
      logger.warn(
        `NotificameHub: Could not configure webhook (may already exist): ${webhookError.message}`
      );
      // Não falhar por causa do webhook - a conexão pode funcionar sem ele
    }

    // Atualizar status no banco - SEMPRE marcar como CONNECTED para NotificameHub
    // Mas respeitar se já estava CONNECTED
    const currentStatus = whatsapp.status;
    const newStatus = currentStatus === "CONNECTED" ? "CONNECTED" : "CONNECTED";
    
    await whatsapp.update({
      status: newStatus,
      qrcode: "",
      retries: 0
    });

    // Emitir evento via socket
    io.of(String(companyId)).emit(`company-${companyId}-whatsappSession`, {
      action: "update",
      session: whatsapp
    });

    logger.info(`NotificameHub: Session ${name} marked as ${newStatus} (was ${currentStatus})`);

    return client;
  } catch (error: any) {
    logger.error(`NotificameHub: Error initializing session: ${error.message}`);

    // Para NotificameHub, não marcar como DISCONNECTED automaticamente
    // Apenas se for erro crítico de configuração
    if (error.message.includes('ERR_NOTIFICAMEHUB_CONFIG_REQUIRED') || 
        error.message.includes('ERR_NOTIFICAMEHUB_INVALID_CHANNEL')) {
      
      const io = getIO();
      await whatsapp.update({
        status: "DISCONNECTED",
        qrcode: error.message
      });

      io.of(String(whatsapp.companyId)).emit(
        `company-${whatsapp.companyId}-whatsappSession`,
        {
          action: "update",
          session: whatsapp
        }
      );
    } else {
      // Para outros erros, manter como CONNECTED e apenas logar
      logger.warn(`NotificameHub: Keeping connection as CONNECTED despite error: ${error.message}`);
    }

    throw error;
  }
};

export const restartNotificameHubSession = async (
  whatsapp: Whatsapp
): Promise<NotificameHubClient> => {
  await removeNotificameHub(whatsapp.id);
  return initNotificameHubSession(whatsapp);
};

export const hasNotificameHubSession = (whatsappId: number): boolean => {
  return notificameHubSessions.has(whatsappId);
};
