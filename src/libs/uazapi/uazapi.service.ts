import axios, { AxiosInstance } from "axios";
import * as Sentry from "@sentry/node";
import logger from "../../utils/logger";
import Whatsapp from "../../models/Whatsapp";
import Setting from "../../models/Setting";
import { getIO } from "../socket";
import AppError from "../../errors/AppError";
import FormData from "form-data";
import fs from "fs";
import {
  IUAZApiConfig,
  IUAZApiMessage,
  IUAZApiContact,
  IUAZApiStatus
} from "./IUAZApi.interfaces";

class UAZApiClient {
  private api: AxiosInstance;
  private adminApi: AxiosInstance;
  private baseUrl: string;
  public id?: number;
  public instanceName: string;
  public instanceToken: string;
  public adminToken: string;
  private webhookUrl?: string;

  constructor(config: IUAZApiConfig, whatsappId?: number) {
    this.instanceName = config.instanceName;
    this.adminToken = config.adminToken;
    this.instanceToken = config.instanceToken || "";
    this.id = whatsappId;
    this.baseUrl = config.baseUrl || "https://free.uazapi.com";

    // API com token admin (para criar instância)
    this.adminApi = axios.create({
      baseURL: this.baseUrl,
      headers: {
        "Content-Type": "application/json",
        "admintoken": this.adminToken,
      },
      timeout: 60000,
    });

    // API com token de instância (para operações após criação)
    this.api = axios.create({
      baseURL: this.baseUrl,
      headers: {
        "Content-Type": "application/json",
        "token": this.instanceToken,
      },
      timeout: 60000,
    });

    // Interceptor para logs (admin API)
    this.adminApi.interceptors.response.use(
      response => {
        logger.info(`UAZApi AdminAPI Response status: ${response.status}`);
        return response;
      },
      error => {
        const status = error.response?.status;
        const data = error.response?.data;
        const message = error.message;
        logger.error(`UAZApi Admin Error: Status ${status}, Message: ${message}, Data:`, JSON.stringify(data));
        return Promise.reject(error);
      }
    );

    // Interceptor para logs (instance API)
    this.api.interceptors.response.use(
      response => {
        logger.info(`UAZApi InstanceAPI Response status: ${response.status}`);
        return response;
      },
      error => {
        const status = error.response?.status;
        const data = error.response?.data;
        const message = error.message;
        logger.error(`UAZApi Instance Error for ${this.instanceName}: Status ${status}, Message: ${message}, Data:`, JSON.stringify(data));
        
        // Se erro 401 (token inválido), marcar conexão como desconectada
        if (status === 401 && this.id) {
          logger.warn(`[UAZApi] Token expired for ${this.instanceName}, marking as DISCONNECTED`);
          // Executar atualização em background (não bloquear o interceptor)
          this.handleTokenExpired().catch(err => {
            logger.error(`[UAZApi] Error in handleTokenExpired: ${err.message}`);
          });
        }
        
        return Promise.reject(error);
      }
    );
  }
  
  // Método para lidar com token expirado
  private async handleTokenExpired(): Promise<void> {
    try {
      if (!this.id) return;
      
      const whatsapp = await Whatsapp.findByPk(this.id);
      if (whatsapp && whatsapp.status !== "DISCONNECTED") {
        await whatsapp.update({
          status: "DISCONNECTED",
          qrcode: "",
          retries: 0
        });
        
        // Emitir evento para o frontend atualizar
        const io = getIO();
        io.of(String(whatsapp.companyId)).emit(`company-${whatsapp.companyId}-whatsappSession`, {
          action: "update",
          session: whatsapp,
        });
        
        logger.info(`[UAZApi] Connection ${this.instanceName} marked as DISCONNECTED due to invalid token`);
      }
    } catch (updateErr: any) {
      logger.error(`[UAZApi] Error updating whatsapp status: ${updateErr.message}`);
    }
  }

  setInstanceToken(token: string): void {
    this.instanceToken = token;
    this.api.defaults.headers["token"] = token;
    logger.info(`UAZApi Instance token updated for ${this.instanceName}: ***${token.slice(-4)}`);
  }

  async createInstance(name?: string, systemName?: string): Promise<any> {
    try {
      const instanceName = name || this.instanceName;
      const sysName = systemName || "whaticket";

      logger.info(`UAZApi: Creating instance: ${instanceName}, systemName: ${sysName}`);

      const response = await this.adminApi.post(`/instance/init`, {
        name: instanceName,
        systemName: sysName,
      });

      logger.info(`UAZApi: Instance created successfully!`);

      if (response.data && response.data.token) {
        this.setInstanceToken(response.data.token);
      }

      return response.data;
    } catch (error: any) {
      Sentry.captureException(error);
      if (error.response) {
        logger.error(`UAZApi: Error creating instance. Status: ${error.response.status}, Data:`, JSON.stringify(error.response.data));
      } else {
        logger.error(`UAZApi: Error creating instance: ${error.message}`);
      }
      throw error;
    }
  }

  async listInstances(): Promise<any[]> {
    try {
      const response = await this.adminApi.get(`/instance/all`);
      return response.data || [];
    } catch (error: any) {
      Sentry.captureException(error);
      logger.error(`UAZApi: Error listing instances: ${error.message}`);
      throw error;
    }
  }

  async findInstanceByName(name: string): Promise<any | null> {
    try {
      const instances = await this.listInstances();
      const found = instances.find((inst: any) => inst.name === name);
      if (found) {
        logger.info(`UAZApi: Found existing instance: ${name}, token: ***${found.token?.slice(-4)}`);
        return found;
      }
      return null;
    } catch (error: any) {
      logger.warn(`UAZApi: Could not list instances: ${error.message}`);
      return null;
    }
  }

  async connect(phone?: string): Promise<any> {
    try {
      if (!this.instanceToken) {
        throw new Error("Instance token not set. Create instance first.");
      }

      logger.info(`UAZApi: Connecting instance ${this.instanceName}...`);

      const payload: any = {};
      if (phone) {
        payload.phone = phone;
      }

      const response = await this.api.post(`/instance/connect`, payload);
      logger.info(`UAZApi: Connect response:`, JSON.stringify(response.data, null, 2));
      return response.data;
    } catch (error: any) {
      Sentry.captureException(error);
      logger.error(`UAZApi: Error connecting: ${error.message}`);
      throw error;
    }
  }

  async disconnect(): Promise<any> {
    try {
      if (!this.instanceToken) {
        throw new Error("Instance token not set.");
      }

      logger.info(`UAZApi: Disconnecting instance ${this.instanceName}...`);
      const response = await this.api.post(`/instance/disconnect`, {});
      return response.data;
    } catch (error: any) {
      Sentry.captureException(error);
      logger.error(`UAZApi: Error disconnecting: ${error.message}`);
      throw error;
    }
  }

  async getStatus(): Promise<IUAZApiStatus> {
    try {
      if (!this.instanceToken) {
        throw new Error("Instance token not set.");
      }

      const response = await this.api.get(`/instance/status`);

      const result = {
        instance: response.data?.instance || response.data,
        status: response.data?.status || {},
      };

      logger.info(`UAZApi: getStatus response:`, JSON.stringify(result, null, 2));

      return result.instance;
    } catch (error: any) {
      Sentry.captureException(error);
      logger.error(`UAZApi: Error getting status: ${error?.message} (${error?.response?.status})`);
      throw error;
    }
  }

  async deleteInstance(): Promise<any> {
    try {
      if (!this.instanceToken) {
        throw new Error("Instance token not set.");
      }

      logger.info(`UAZApi: Deleting instance ${this.instanceName}...`);
      const response = await this.api.delete(`/instance`);
      return response.data;
    } catch (error: any) {
      Sentry.captureException(error);
      logger.error(`UAZApi: Error deleting instance: ${error.message}`);
      throw error;
    }
  }

  async logout(): Promise<any> {
    try {
      if (!this.instanceToken) {
        throw new Error("Instance token not set.");
      }

      logger.info(`UAZApi: Disconnecting instance ${this.instanceName}...`);
      const response = await this.api.post(`/instance/disconnect`);
      return response.data;
    } catch (error: any) {
      Sentry.captureException(error);
      logger.error(`UAZApi: Error disconnecting: ${error.message}`);
      throw error;
    }
  }

  get instanceId(): string {
    return this.instanceName;
  }

  async sendTextMessage(to: string, message: string): Promise<IUAZApiMessage> {
    try {
      if (!this.instanceToken) {
        throw new Error("Instance token not set.");
      }

      const text = message?.trim() || "Mensagem";

      const payload = {
        number: to,
        text: text,
        linkPreview: false,
        delay: 1200,
        readchat: true,
      };

      logger.info(`UAZApi: Sending text message to ${to}`);

      const response = await this.api.post(`/send/text`, payload);

      logger.info(`UAZApi: Send text response: ${JSON.stringify(response.data)}`);
      return response.data;
    } catch (error: any) {
      Sentry.captureException(error);
      if (error.response) {
        logger.error(`UAZApi: Error sending text message: Status ${error.response.status}, Data: ${JSON.stringify(error.response.data)}`);
      } else {
        logger.error(`UAZApi: Error sending text message: ${error.message}`);
      }
      throw error;
    }
  }

  async sendContact(
    to: string,
    fullName: string,
    phoneNumber: string,
    organization?: string,
    email?: string,
    url?: string
  ): Promise<IUAZApiMessage> {
    try {
      if (!this.instanceToken) {
        throw new Error("Instance token not set.");
      }

      const payload: any = {
        number: to,
        fullName: fullName,
        phoneNumber: phoneNumber,
        delay: 1200,
        readchat: true,
      };

      if (organization) payload.organization = organization;
      if (email) payload.email = email;
      if (url) payload.url = url;

      logger.info(`UAZApi: Sending contact to ${to}`);

      const response = await this.api.post(`/send/contact`, payload);

      logger.info(`UAZApi: Send contact response: ${JSON.stringify(response.data)}`);
      return response.data;
    } catch (error: any) {
      Sentry.captureException(error);
      if (error.response) {
        logger.error(`UAZApi: Error sending contact: Status ${error.response.status}, Data: ${JSON.stringify(error.response.data)}`);
      } else {
        logger.error(`UAZApi: Error sending contact: ${error.message}`);
      }
      throw error;
    }
  }

  async sendMediaMessage(
    to: string,
    mediaUrl: string,
    type: string,
    caption?: string,
    fileName?: string
  ): Promise<IUAZApiMessage> {
    try {
      if (!this.instanceToken) {
        throw new Error("Instance token not set.");
      }

      logger.info(`UAZApi: Sending media message (${type}) to ${to}`);

      const response = await this.api.post(`/send/media`, {
        number: to,
        type: type,
        file: mediaUrl,
        text: caption || "",
        docName: fileName || "",
        delay: 1200,
        readchat: true,
      });
      return response.data;
    } catch (error: any) {
      Sentry.captureException(error);
      logger.error(`UAZApi: Error sending media message: ${error.message}`);
      throw error;
    }
  }

  async sendFileMessage(
    to: string,
    filePath: string,
    caption?: string,
    fileName?: string
  ): Promise<IUAZApiMessage> {
    try {
      if (!this.instanceToken) {
        throw new Error("Instance token not set.");
      }

      const formData = new FormData();
      formData.append("number", to);
      formData.append("file", fs.createReadStream(filePath));
      if (caption) formData.append("text", caption);
      if (fileName) formData.append("docName", fileName);
      formData.append("delay", "1200");

      const response = await this.api.post(
        `/send/media`,
        formData,
        {
          headers: {
            ...formData.getHeaders(),
            "token": this.instanceToken,
          },
        }
      );
      return response.data;
    } catch (error: any) {
      Sentry.captureException(error);
      logger.error(`UAZApi: Error sending file message: ${error.message}`);
      throw error;
    }
  }

  async sendAudioMessage(to: string, audioPath: string, ptt: boolean = false): Promise<IUAZApiMessage> {
    try {
      if (!this.instanceToken) {
        throw new Error("Instance token not set.");
      }

      const formData = new FormData();
      formData.append("number", to);
      formData.append("file", fs.createReadStream(audioPath));
      formData.append("type", ptt ? "ptt" : "audio");
      formData.append("delay", "1200");

      const response = await this.api.post(
        `/send/media`,
        formData,
        {
          headers: {
            ...formData.getHeaders(),
            "token": this.instanceToken,
          },
        }
      );
      return response.data;
    } catch (error: any) {
      Sentry.captureException(error);
      logger.error(`UAZApi: Error sending audio message: ${error.message}`);
      throw error;
    }
  }

  async checkNumber(numbers: string[]): Promise<any[]> {
    try {
      if (!this.instanceToken) {
        throw new Error("Instance token not set.");
      }

      logger.info(`UAZApi: Checking numbers: ${numbers.join(", ")}`);

      const response = await this.api.post(`/chat/check`, {
        numbers: numbers
      });

      logger.info(`UAZApi: Check number response: ${JSON.stringify(response.data)}`);
      return response.data;
    } catch (error: any) {
      Sentry.captureException(error);
      logger.error(`UAZApi: Error checking numbers: ${error.message}`);
      throw error;
    }
  }

  async setWebhook(webhookUrl: string): Promise<any> {
    try {
      if (!this.instanceToken) {
        throw new Error("Instance token not set.");
      }

      this.webhookUrl = webhookUrl;
      logger.info(`UAZApi: Setting webhook for ${this.instanceName}: ${webhookUrl}`);

      const response = await this.api.post(`/webhook`, {
        enabled: true,
        url: webhookUrl,
        events: [
          "connection",
          "messages",
          "messages_update",
          "files",
        ],
        excludeMessages: ["wasSentByApi"],
        addUrlEvents: true,
        addUrlTypesMessages: true,
      });

      logger.info(`UAZApi: Webhook configured:`, JSON.stringify(response.data, null, 2));
      return response.data;
    } catch (error: any) {
      Sentry.captureException(error);
      logger.error(`UAZApi: Error setting webhook: ${error.message}`);
      throw error;
    }
  }

  async getWebhook(): Promise<any> {
    try {
      if (!this.instanceToken) {
        throw new Error("Instance token not set.");
      }

      const response = await this.api.get(`/webhook`);
      return response.data;
    } catch (error: any) {
      Sentry.captureException(error);
      logger.error(`UAZApi: Error getting webhook: ${error.message}`);
      throw error;
    }
  }

  async downloadMedia(messageId: string): Promise<Buffer> {
    try {
      if (!this.instanceToken) {
        throw new Error("Instance token not set.");
      }

      // Tentar diferentes formatos de ID
      // O messageId pode vir como "557799087280:ACAF45F064924BB4A99F42C7853CF777"
      // A API pode precisar apenas da parte após os dois pontos
      const idVariants = [
        messageId,
        messageId.includes(":") ? messageId.split(":").pop() : null,
      ].filter(Boolean);

      let lastError: any = null;
      
      for (const id of idVariants) {
        try {
          logger.info(`UAZApi: Trying to download media with id: ${id}`);
          const response = await this.api.post(
            `/message/download`,
            {
              id: id,
              transcribe: false,
            },
            { responseType: "arraybuffer", timeout: 30000 }
          );
          
          if (response.data && response.data.length > 0) {
            logger.info(`UAZApi: Successfully downloaded media with id: ${id}, size: ${response.data.length}`);
            return Buffer.from(response.data);
          }
        } catch (err: any) {
          lastError = err;
          logger.warn(`UAZApi: Failed to download with id ${id}: ${err.message}`);
        }
      }
      
      throw lastError || new Error("Could not download media with any ID format");
    } catch (error: any) {
      Sentry.captureException(error);
      logger.error(`UAZApi: Error downloading media: ${error.message}`);
      throw error;
    }
  }

  async getChatDetails(number: string, preview: boolean = true): Promise<any> {
    try {
      if (!this.instanceToken) {
        throw new Error("Instance token not set.");
      }

      logger.info(`UAZApi: Getting chat details for: ${number}`);

      const response = await this.api.post(`/chat/details`, {
        number: number,
        preview: preview,
      });

      logger.info(`UAZApi: Chat details response: ${JSON.stringify(response.data)}`);
      return response.data;
    } catch (error: any) {
      Sentry.captureException(error);
      logger.error(`UAZApi: Error getting chat details: ${error.message}`);
      throw error;
    }
  }

  async getProfilePicUrl(number: string, preview: boolean = false): Promise<string> {
    try {
      const chatDetails = await this.getChatDetails(number, preview);

      const imageUrl = preview
        ? (chatDetails.imagePreview || chatDetails.image || "")
        : (chatDetails.image || chatDetails.imagePreview || "");

      logger.info(`UAZApi: Profile pic URL for ${number}: ${imageUrl ? imageUrl.substring(0, 50) + '...' : 'empty'}`);
      return imageUrl;
    } catch (error: any) {
      logger.warn(`UAZApi: Could not get profile pic for ${number}: ${error.message}`);
      return "";
    }
  }

  async sendReaction(number: string, messageId: string, reaction: string): Promise<any> {
    try {
      if (!this.instanceToken) {
        throw new Error("Instance token not set.");
      }

      logger.info(`UAZApi: Sending reaction "${reaction}" to message ${messageId} in chat ${number}`);

      const response = await this.api.post(`/message/react`, {
        number: number,
        text: reaction,
        id: messageId,
      });

      logger.info(`UAZApi: Reaction sent successfully: ${JSON.stringify(response.data)}`);
      return response.data;
    } catch (error: any) {
      Sentry.captureException(error);
      if (error.response) {
        logger.error(`UAZApi: Error sending reaction: Status ${error.response.status}, Data: ${JSON.stringify(error.response.data)}`);
      } else {
        logger.error(`UAZApi: Error sending reaction: ${error.message}`);
      }
      throw error;
    }
  }

  async sendTextMessageWithQuote(to: string, message: string, quotedMessageId: string): Promise<IUAZApiMessage> {
    try {
      if (!this.instanceToken) {
        throw new Error("Instance token not set.");
      }

      const text = message?.trim() || "Mensagem";

      const payload = {
        number: to,
        text: text,
        replyid: quotedMessageId,
        linkPreview: false,
        delay: 1200,
        readchat: true,
      };

      logger.info(`UAZApi: Sending text message with reply to ${to}, replying to ${quotedMessageId}`);

      const response = await this.api.post(`/send/text`, payload);

      logger.info(`UAZApi: Send text with reply response: ${JSON.stringify(response.data)}`);
      return response.data;
    } catch (error: any) {
      Sentry.captureException(error);
      if (error.response) {
        logger.error(`UAZApi: Error sending text with reply: Status ${error.response.status}, Data: ${JSON.stringify(error.response.data)}`);
      } else {
        logger.error(`UAZApi: Error sending text with reply: ${error.message}`);
      }
      throw error;
    }
  }

  async sendMediaMessageWithQuote(
    to: string,
    mediaUrl: string,
    type: string,
    quotedMessageId: string,
    caption?: string,
    fileName?: string
  ): Promise<IUAZApiMessage> {
    try {
      if (!this.instanceToken) {
        throw new Error("Instance token not set.");
      }

      logger.info(`UAZApi: Sending media message (${type}) with reply to ${to}, replying to ${quotedMessageId}`);

      const response = await this.api.post(`/send/media`, {
        number: to,
        type: type,
        file: mediaUrl,
        text: caption || "",
        docName: fileName || "",
        replyid: quotedMessageId,
        delay: 1200,
        readchat: true,
      });

      return response.data;
    } catch (error: any) {
      Sentry.captureException(error);
      logger.error(`UAZApi: Error sending media with reply: ${error.message}`);
      throw error;
    }
  }
}

// Store das instâncias UAZApi ativas
const uazapiSessions: Map<number, UAZApiClient> = new Map();

export const getUAZApi = (whatsappId: number): UAZApiClient => {
  const session = uazapiSessions.get(whatsappId);

  if (!session) {
    throw new AppError("ERR_UAZAPI_NOT_INITIALIZED");
  }

  return session;
};

export const removeUAZApi = async (whatsappId: number): Promise<void> => {
  try {
    const session = uazapiSessions.get(whatsappId);

    if (session) {
      try {
        await session.disconnect();
      } catch (err: any) {
        logger.warn(`UAZApi: Error disconnecting session: ${err.message}`);
      }
      uazapiSessions.delete(whatsappId);
    }
  } catch (err) {
    logger.error(err);
  }
};

export const initUAZApiSession = async (whatsapp: Whatsapp): Promise<UAZApiClient> => {
  return new Promise(async (resolve, reject) => {
    try {
      const io = getIO();
      const { id, name, token, companyId, webhookUrl } = whatsapp;

      // Usar configurações do .env
      const baseUrl = process.env.UAZAPI_BASE_URL || "https://free.uazapi.com";
      const adminToken = process.env.UAZAPI_ADMIN_TOKEN || "";

      // O token do whatsapp pode ser o token da instância (já existente)
      const existingInstanceToken = token || "";

      if (!adminToken && !existingInstanceToken) {
        throw new AppError("ERR_UAZAPI_TOKEN_REQUIRED: Configure o admintoken nas configurações ou forneça o token da instância");
      }

      logger.info(`UAZApi: Starting session ${name} with URL: ${baseUrl}`);

      // Nome da instância para UAZApi (sem espaços, lowercase)
      const instanceName = name.replace(/\s+/g, "_").toLowerCase();

      // Criar cliente UAZApi
      const uazapi = new UAZApiClient(
        {
          instanceName,
          adminToken,
          instanceToken: existingInstanceToken,
          baseUrl,
        },
        id
      );

      let instanceReady = false;

      // FLUXO 1: Se já temos um token de instância, tentar usá-lo diretamente
      if (existingInstanceToken) {
        logger.info(`UAZApi: Using existing instance token for ${instanceName}: ***${existingInstanceToken.slice(-4)}`);
        uazapi.setInstanceToken(existingInstanceToken);

        try {
          const status = await uazapi.getStatus();
          instanceReady = true;
          logger.info(`UAZApi: Instance ${instanceName} exists with status: ${status.status}`);

          if (status.status === "connected") {
            logger.info(`UAZApi: Instance ${instanceName} already connected!`);

            await whatsapp.update({
              status: "CONNECTED",
              qrcode: "",
              retries: 0,
              number: status.phone || "",
            });

            io.of(String(companyId)).emit(`company-${companyId}-whatsappSession`, {
              action: "update",
              session: whatsapp,
            });

            uazapiSessions.set(id, uazapi);
            resolve(uazapi);
            return;
          }

          // Se tem QR code, já atualizamos
          if (status.qrcode) {
            await whatsapp.update({
              qrcode: status.qrcode,
              status: "qrcode",
              retries: 0,
            });

            io.of(String(companyId)).emit(`company-${companyId}-whatsappSession`, {
              action: "update",
              session: whatsapp,
            });
          }
        } catch (error: any) {
          logger.warn(`UAZApi: Instance token invalid or expired: ${error.message}`);
          instanceReady = false;
        }
      }

      // FLUXO 2: Se não temos token válido, criar nova instância com admintoken
      if (!instanceReady && adminToken) {
        logger.info(`UAZApi: Creating new instance ${instanceName} with admin token`);

        try {
          // Primeiro verificar se já existe instância com esse nome
          const existingInstance = await uazapi.findInstanceByName(instanceName);

          if (existingInstance && existingInstance.token) {
            logger.info(`UAZApi: Found existing instance ${instanceName}, using its token`);
            uazapi.setInstanceToken(existingInstance.token);

            // Salvar o token da instância no banco
            await whatsapp.update({ token: existingInstance.token });
            instanceReady = true;
          } else {
            // Criar nova instância
            const createResult = await uazapi.createInstance(instanceName);

            if (createResult && createResult.token) {
              logger.info(`UAZApi: Instance ${instanceName} created with token: ***${createResult.token.slice(-4)}`);

              // Salvar o token da instância no banco
              await whatsapp.update({ token: createResult.token });
              instanceReady = true;
            } else {
              throw new Error("No token returned from instance creation");
            }
          }
        } catch (error: any) {
          logger.error(`UAZApi: Error creating/finding instance: ${error.message}`);
          reject(error);
          return;
        }
      }

      if (!instanceReady || !uazapi.instanceToken) {
        reject(new Error("Could not initialize UAZApi instance - no valid token"));
        return;
      }

      // IMPORTANTE: Salvar a sessão no Map IMEDIATAMENTE
      uazapiSessions.set(id, uazapi);
      logger.info(`UAZApi: Session ${name} added to sessions map (awaiting connection)`);

      // Configurar webhook se temos URL
      const backendUrl = process.env.BACKEND_URL;
      const whatsappWebhookUrl = webhookUrl || `${backendUrl}/webhooks/uazapi/${id}`;

      try {
        await uazapi.setWebhook(whatsappWebhookUrl);
        logger.info(`UAZApi: Webhook configured for ${instanceName}: ${whatsappWebhookUrl}`);
      } catch (error: any) {
        logger.warn(`UAZApi: Error setting webhook (will retry later): ${error.message}`);
      }

      // Iniciar conexão (gera QR code)
      try {
        await uazapi.connect();
        logger.info(`UAZApi: Connection initiated for ${instanceName}`);
      } catch (error: any) {
        logger.warn(`UAZApi: Error initiating connection: ${error.message}`);
      }

      // Polling para QR Code e status
      let pollCount = 0;
      const maxPolls = 30; // 30 * 3s = 90 segundos

      const checkInterval = setInterval(async () => {
        try {
          pollCount++;

          // IMPORTANTE: Verificar se o webhook já atualizou o status para CONNECTED
          // Isso evita que o polling sobrescreva o status correto
          try {
            await whatsapp.reload();
          } catch (reloadError: any) {
            // Se a instância foi deletada, parar o polling
            clearInterval(checkInterval);
            logger.warn(`UAZApi: Session ${name} was deleted, stopping poll`);
            resolve(uazapi);
            return;
          }
          
          logger.info(`UAZApi: [POLL-CHECK] Session ${name} - DB status: "${whatsapp.status}" (poll ${pollCount}/${maxPolls})`);
          
          if (whatsapp.status === "CONNECTED") {
            clearInterval(checkInterval);
            logger.info(`UAZApi: Session ${name} already CONNECTED (updated by webhook), stopping poll`);
            resolve(uazapi);
            return;
          }
          
          // Se foi desconectado pelo webhook, parar o polling
          if (whatsapp.status === "DISCONNECTED") {
            clearInterval(checkInterval);
            logger.info(`UAZApi: Session ${name} was DISCONNECTED (updated by webhook), stopping poll`);
            resolve(uazapi);
            return;
          }

          if (pollCount > maxPolls) {
            clearInterval(checkInterval);
            logger.warn(`UAZApi: Session ${name} timeout after ${maxPolls} polls`);

            await whatsapp.update({
              status: "TIMEOUT",
              qrcode: "",
            });

            io.of(String(companyId)).emit(`company-${companyId}-whatsappSession`, {
              action: "update",
              session: whatsapp,
            });

            resolve(uazapi);
            return;
          }

          const currentStatus = await uazapi.getStatus();

          if (!currentStatus) {
            logger.warn(`UAZApi: Status is empty/null, retrying... (${pollCount}/${maxPolls})`);
            return;
          }

          // status pode ser: "connected", "disconnected", "connecting"
          if (currentStatus.status === "connected") {
            clearInterval(checkInterval);

            await whatsapp.update({
              status: "CONNECTED",
              qrcode: "",
              retries: 0,
              number: currentStatus.phone || "",
            });

            io.of(String(companyId)).emit(`company-${companyId}-whatsappSession`, {
              action: "update",
              session: whatsapp,
            });

            uazapiSessions.set(id, uazapi);
            logger.info(`UAZApi: Session ${name} connected successfully!`);

            resolve(uazapi);
          } else if (currentStatus.qrcode) {
            // QR code disponível
            let qrValue = currentStatus.qrcode;
            
            // Verificar se precisa adicionar prefixo base64
            if (qrValue && !qrValue.startsWith('data:') && !qrValue.startsWith('http') && qrValue.length > 100) {
              qrValue = `data:image/png;base64,${qrValue}`;
            }
            
            logger.info(`UAZApi: QR Code received for ${name}, length: ${qrValue.length}, preview: ${qrValue.substring(0, 50)}...`);

            await whatsapp.update({
              qrcode: qrValue,
              status: "qrcode",
              retries: 0,
            });

            // Recarregar para garantir dados atualizados
            await whatsapp.reload();

            io.of(String(companyId)).emit(`company-${companyId}-whatsappSession`, {
              action: "update",
              session: whatsapp,
            });
            
            logger.info(`UAZApi: QR Code emitted via socket for ${name}, status: ${whatsapp.status}`);
          } else if (currentStatus.paircode) {
            // Pairing code disponível
            logger.info(`UAZApi: Pairing code received for ${name}: ${currentStatus.paircode}`);

            await whatsapp.update({
              qrcode: currentStatus.paircode,
              status: "qrcode",
              retries: 0,
            });

            // Recarregar para garantir dados atualizados
            await whatsapp.reload();

            io.of(String(companyId)).emit(`company-${companyId}-whatsappSession`, {
              action: "update",
              session: whatsapp,
            });
            
            logger.info(`UAZApi: Pairing code emitted via socket for ${name}, status: ${whatsapp.status}`);
          } else {
            logger.info(`UAZApi: Instance ${name} status: ${currentStatus.status} (${pollCount}/${maxPolls})`);
          }
        } catch (error: any) {
          logger.error(`UAZApi: Error checking status: ${error.message}`);
        }
      }, 3000);

    } catch (err: any) {
      Sentry.captureException(err);
      logger.error(`UAZApi: Error starting session:`, err);
      reject(err);
    }
  });
};

export { UAZApiClient, IUAZApiMessage, IUAZApiContact };

