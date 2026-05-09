// Usar o SDK oficial do NotificameHub
import * as notificamehub from "notificamehubsdk";
import * as Sentry from "@sentry/node";
import axios from "axios";
import logger from "../../utils/logger";
import {
  INotificameHubConfig,
  INotificameHubMessageResponse
} from "./INotificameHub.interfaces";

const { Client, TextContent, FileContent, LocationContent, ContactsContent, TemplateContent } = notificamehub;

// URL base da API NotificameHub
const NOTIFICAMEHUB_API_URL = "https://api.notificame.com.br";

class NotificameHubClient {
  private client: any;
  private channel: any;
  private channelType: "whatsapp" | "instagram" | "facebook";
  private channelId: string;
  private token: string;
  public whatsappId: number;

  constructor(config: INotificameHubConfig) {
    this.channelType = config.channel;
    this.channelId = config.channelId;
    this.whatsappId = config.whatsappId;
    this.token = config.token;

    // Inicializar cliente com o token da API
    this.client = new Client(config.token);

    // Definir o canal
    this.channel = this.client.setChannel(this.channelType);

    logger.info(
      `NotificameHub SDK: Client initialized for channel ${this.channelType}, channelId: ${this.channelId}`
    );
  }

  async sendMessage(
    to: string,
    contents: any[]
  ): Promise<INotificameHubMessageResponse> {
    try {
      // O SDK usa: sendMessage(canalId, destinatario, conteudo)
      // O primeiro parametro é o ID do canal (SEU_CANAL_DA_API)
      // O segundo é o destinatario
      // O terceiro é o conteudo

      logger.info(
        `NotificameHub SDK: Sending message via ${this.channelType} - from: ${this.channelId}, to: ${to}`
      );

      // Processar o primeiro conteudo
      if (contents.length === 0) {
        throw new Error("No content to send");
      }

      const content = contents[0];
      let sdkContent: any;

      switch (content.type) {
        case "text":
          sdkContent = new TextContent(content.text);
          break;
        case "file":
          // FileContent(url, mimeType, caption, filename)
          sdkContent = new FileContent(
            content.fileUrl,
            content.fileMimeType,
            content.fileCaption || "",
            content.fileName || "file"
          );
          break;
        case "location":
          sdkContent = new LocationContent(
            content.latitude,
            content.longitude,
            content.name || "",
            content.address || ""
          );
          break;
        case "contacts":
          sdkContent = new ContactsContent(content.contacts);
          break;
        case "template":
          sdkContent = new TemplateContent(content.templateId, content.fields || {});
          break;
        default:
          // Fallback para texto
          sdkContent = new TextContent(content.text || JSON.stringify(content));
      }

      // Enviar usando o SDK: sendMessage(channelId, recipientId, content)
      const response = await this.channel.sendMessage(
        this.channelId,
        to,
        sdkContent
      );

      logger.info(
        `NotificameHub SDK: Message sent successfully: ${JSON.stringify(response)}`
      );

      return response;
    } catch (error: any) {
      logger.error(`NotificameHub SDK: Error sending message: ${error.message}`);
      Sentry.captureException(error);
      throw error;
    }
  }

  async sendText(to: string, text: string): Promise<INotificameHubMessageResponse> {
    try {
      logger.info(
        `NotificameHub SDK: Sending text to ${to} via ${this.channelType}`
      );
      logger.info(
        `NotificameHub SDK: channelId=${this.channelId}, text length=${text.length}`
      );

      const content = new TextContent(text);

      logger.info(
        `NotificameHub SDK: TextContent created, calling sendMessage...`
      );

      const response = await this.channel.sendMessage(
        this.channelId,
        to,
        content
      );

      logger.info(
        `NotificameHub SDK: Text sent - Full response: ${JSON.stringify(response, null, 2)}`
      );

      // Verificar se a resposta indica sucesso real
      if (response && response.id) {
        logger.info(
          `NotificameHub SDK: Message ID confirmed: ${response.id}, direction: ${response.direction}`
        );
      } else {
        logger.warn(
          `NotificameHub SDK: Response has no message ID - might indicate failure`
        );
      }

      return response;
    } catch (error: any) {
      logger.error(`NotificameHub SDK: Error sending text: ${error.message}`);
      logger.error(`NotificameHub SDK: Error details: ${JSON.stringify(error.response?.data || error)}`);
      Sentry.captureException(error);
      throw error;
    }
  }

  /**
   * Envia mensagem de texto diretamente via HTTP (bypass SDK)
   * Usado para Facebook que tem problemas com o SDK (usa v1 ao invés de v2)
   */
  private async sendTextDirectHttp(to: string, text: string): Promise<INotificameHubMessageResponse> {
    try {
      // Usar API v2 para Facebook (mesma estrutura que Instagram)
      const url = `${NOTIFICAMEHUB_API_URL}/v2/channels/${this.channelType}/messages`;

      const payload = {
        from: this.channelId,
        to: to,
        contents: [
          {
            type: "text",
            text: text
          }
        ]
      };

      logger.info(
        `NotificameHub HTTP: Sending to ${url}`
      );
      logger.info(
        `NotificameHub HTTP: Payload: ${JSON.stringify(payload)}`
      );

      const response = await axios.post(url, payload, {
        headers: {
          "Content-Type": "application/json",
          "X-API-Token": this.token
        }
      });

      logger.info(
        `NotificameHub HTTP: Response status: ${response.status}`
      );
      logger.info(
        `NotificameHub HTTP: Response data: ${JSON.stringify(response.data, null, 2)}`
      );

      return response.data;
    } catch (error: any) {
      logger.error(`NotificameHub HTTP: Error: ${error.message}`);
      if (error.response) {
        logger.error(`NotificameHub HTTP: Status: ${error.response.status}`);
        logger.error(`NotificameHub HTTP: Response: ${JSON.stringify(error.response.data)}`);
      }
      Sentry.captureException(error);
      throw error;
    }
  }

  async sendFile(
    to: string,
    fileUrl: string,
    mimeType: "audio" | "image" | "video" | "document",
    caption?: string
  ): Promise<INotificameHubMessageResponse> {
    try {
      logger.info(
        `NotificameHub SDK: Sending file to ${to} via ${this.channelType}`
      );

      // FileContent(url, type, caption, filename)
      const content = new FileContent(
        fileUrl,
        mimeType,
        caption || "",
        `file.${mimeType}`
      );

      const response = await this.channel.sendMessage(
        this.channelId,
        to,
        content
      );

      logger.info(
        `NotificameHub SDK: File sent successfully: ${JSON.stringify(response)}`
      );

      return response;
    } catch (error: any) {
      logger.error(`NotificameHub SDK: Error sending file: ${error.message}`);
      Sentry.captureException(error);
      throw error;
    }
  }

  /**
   * Envia arquivo diretamente via HTTP (bypass SDK)
   * Usado para Facebook que tem problemas com o SDK
   */
  private async sendFileDirectHttp(
    to: string,
    fileUrl: string,
    mimeType: string,
    caption?: string
  ): Promise<INotificameHubMessageResponse> {
    try {
      const url = `${NOTIFICAMEHUB_API_URL}/v2/channels/${this.channelType}/messages`;

      const payload = {
        from: this.channelId,
        to: to,
        contents: [
          {
            type: "file",
            fileUrl: fileUrl,
            fileMimeType: mimeType,
            fileCaption: caption || "",
            fileName: `file.${mimeType}`
          }
        ]
      };

      logger.info(
        `NotificameHub HTTP: Sending file to ${url}`
      );
      logger.info(
        `NotificameHub HTTP: Payload: ${JSON.stringify(payload)}`
      );

      const response = await axios.post(url, payload, {
        headers: {
          "Content-Type": "application/json",
          "X-API-Token": this.token
        }
      });

      logger.info(
        `NotificameHub HTTP: File response status: ${response.status}`
      );
      logger.info(
        `NotificameHub HTTP: File response data: ${JSON.stringify(response.data, null, 2)}`
      );

      return response.data;
    } catch (error: any) {
      logger.error(`NotificameHub HTTP: Error sending file: ${error.message}`);
      if (error.response) {
        logger.error(`NotificameHub HTTP: Status: ${error.response.status}`);
        logger.error(`NotificameHub HTTP: Response: ${JSON.stringify(error.response.data)}`);
      }
      Sentry.captureException(error);
      throw error;
    }
  }

  async sendLocation(
    to: string,
    latitude: number,
    longitude: number,
    name?: string,
    address?: string
  ): Promise<INotificameHubMessageResponse> {
    if (this.channelType !== "whatsapp") {
      throw new Error("Location messages are only supported on WhatsApp");
    }

    try {
      const content = new LocationContent(latitude, longitude, name || "", address || "");
      const response = await this.channel.sendMessage(
        this.channelId,
        to,
        content
      );
      return response;
    } catch (error: any) {
      logger.error(`NotificameHub SDK: Error sending location: ${error.message}`);
      throw error;
    }
  }

  async sendContacts(
    to: string,
    contacts: any[]
  ): Promise<INotificameHubMessageResponse> {
    if (this.channelType !== "whatsapp") {
      throw new Error("Contact messages are only supported on WhatsApp");
    }

    try {
      const content = new ContactsContent(contacts);
      const response = await this.channel.sendMessage(
        this.channelId,
        to,
        content
      );
      return response;
    } catch (error: any) {
      logger.error(`NotificameHub SDK: Error sending contacts: ${error.message}`);
      throw error;
    }
  }

  async sendTemplate(
    to: string,
    templateId: string,
    fields?: Record<string, string>
  ): Promise<INotificameHubMessageResponse> {
    if (this.channelType !== "whatsapp") {
      throw new Error("Template messages are only supported on WhatsApp");
    }

    try {
      const content = new TemplateContent(templateId, fields || {});
      const response = await this.channel.sendMessage(
        this.channelId,
        to,
        content
      );
      return response;
    } catch (error: any) {
      logger.error(`NotificameHub SDK: Error sending template: ${error.message}`);
      throw error;
    }
  }

  async sendButtons(
    to: string,
    bodyText: string,
    buttons: Array<{ id: string; title: string }>,
    headerText?: string,
    footerText?: string
  ): Promise<INotificameHubMessageResponse> {
    // Para botoes interativos, usar TemplateContent com formato especifico
    try {
      const templateData = {
        template_type: "button",
        text: bodyText,
        buttons: buttons.map(btn => ({
          type: "postback",
          title: btn.title,
          payload: btn.id
        }))
      };

      const content = new TemplateContent(templateData);
      const response = await this.channel.sendMessage(
        this.channelId,
        to,
        content
      );
      return response;
    } catch (error: any) {
      logger.error(`NotificameHub SDK: Error sending buttons: ${error.message}`);
      throw error;
    }
  }

  async sendList(
    to: string,
    bodyText: string,
    buttonText: string,
    sections: Array<{
      title: string;
      rows: Array<{ id: string; title: string; description?: string }>;
    }>,
    headerText?: string,
    footerText?: string
  ): Promise<INotificameHubMessageResponse> {
    if (this.channelType !== "whatsapp") {
      throw new Error("List messages are only supported on WhatsApp");
    }

    // Enviar como texto simples como fallback
    try {
      let listText = bodyText + "\n\n";
      sections.forEach(section => {
        listText += `*${section.title}*\n`;
        section.rows.forEach(row => {
          listText += `- ${row.title}${row.description ? `: ${row.description}` : ""}\n`;
        });
        listText += "\n";
      });

      return this.sendText(to, listText);
    } catch (error: any) {
      logger.error(`NotificameHub SDK: Error sending list: ${error.message}`);
      throw error;
    }
  }

  async createWebhookSubscription(webhookUrl: string): Promise<any> {
    try {
      logger.info(
        `NotificameHub SDK: Creating webhook subscription for ${this.channelId}: ${webhookUrl}`
      );

      // Usar o SDK para criar subscription
      const MessageSubscription = (notificamehub as any).MessageSubscription;

      if (MessageSubscription) {
        const subscription = new MessageSubscription({
          url: webhookUrl,
          channel: this.channelId
        });

        const response = await this.client.createSubscription(subscription);

        logger.info(
          `NotificameHub SDK: Webhook subscription created: ${JSON.stringify(response)}`
        );

        return response;
      } else {
        logger.warn("NotificameHub SDK: MessageSubscription not available");
        return { success: true, url: webhookUrl };
      }
    } catch (error: any) {
      logger.error(
        `NotificameHub SDK: Error creating webhook subscription: ${error.message}`
      );
      throw error;
    }
  }

  async deleteWebhookSubscription(subscriptionId: string): Promise<void> {
    try {
      logger.info(
        `NotificameHub SDK: Deleting webhook subscription: ${subscriptionId}`
      );
      // SDK pode nao ter metodo de delete, ignorar
    } catch (error: any) {
      logger.error(
        `NotificameHub SDK: Error deleting webhook subscription: ${error.message}`
      );
    }
  }

  async getChannelInfo(): Promise<any> {
    try {
      logger.info(`NotificameHub SDK: Getting channel info for ${this.channelId}`);
      // Retornar info basica
      return {
        id: this.channelId,
        type: this.channelType
      };
    } catch (error: any) {
      logger.error(
        `NotificameHub SDK: Error getting channel info: ${error.message}`
      );
      throw error;
    }
  }

  /**
   * Download de mídia via SDK do NotificameHub
   * Usado para baixar arquivos do WhatsApp que requerem autenticação
   */
  async downloadMedia(
    fileUrl: string,
    mimeType: string
  ): Promise<Buffer | null> {
    try {
      logger.info(
        `NotificameHub SDK: Downloading media from ${fileUrl.substring(0, 50)}...`
      );

      // Usar o SDK para download de mídia do WhatsApp
      const FileContent = (notificamehub as any).FileContent;

      if (FileContent && this.channelType === "whatsapp") {
        const content = new FileContent(fileUrl, mimeType);

        // O SDK tem método downloadMedia para WhatsApp
        const data = await this.channel.downloadMedia(
          this.channelId,
          "whatsapp",
          content
        );

        if (data) {
          logger.info(
            `NotificameHub SDK: Media downloaded successfully (${data.length} bytes)`
          );
          return Buffer.from(data, "binary");
        }
      }

      logger.warn(
        `NotificameHub SDK: downloadMedia not available for channel ${this.channelType}`
      );
      return null;
    } catch (error: any) {
      logger.error(
        `NotificameHub SDK: Error downloading media: ${error.message}`
      );
      // Não lançar erro, retornar null para fallback para axios
      return null;
    }
  }

  getChannel(): string {
    return this.channelType;
  }

  getChannelId(): string {
    return this.channelId;
  }

  /**
   * Obter o cliente SDK raw para operações avançadas
   */
  getRawClient(): any {
    return this.client;
  }

  /**
   * Obter o canal SDK raw
   */
  getRawChannel(): any {
    return this.channel;
  }
}

// Interface para canais retornados pela API
export interface INotificameHubChannel {
  id: string;
  name: string;
  type: "whatsapp" | "instagram" | "facebook" | "telegram" | "email" | "webchat";
  phone?: string;
  status?: string;
  token?: string;
}

// Funcao estatica para listar canais com token geral
export async function listNotificameHubChannels(
  generalToken: string
): Promise<INotificameHubChannel[]> {
  try {
    logger.info(`NotificameHub SDK: Listing channels with general token`);

    const client = new Client(generalToken);
    const response = await client.listChannels();

    logger.info(
      `NotificameHub SDK: Raw channels response: ${JSON.stringify(response).substring(0, 500)}`
    );

    const rawChannels = response || [];

    // Normalizar os dados para garantir campos consistentes
    const normalizedChannels: INotificameHubChannel[] = rawChannels.map((ch: any) => ({
      id: ch.id || ch.channelId || ch.channel_id,
      name: ch.name || ch.displayName || ch.display_name || `Canal ${ch.id}`,
      type: ch.type || ch.channel || ch.channelType || ch.channel_type || "whatsapp",
      phone: ch.phone || ch.phoneNumber || ch.phone_number || ch.identifier,
      status: ch.status || "active",
      token: ch.token || ch.apiToken || ch.api_token || ""
    }));

    logger.info(
      `NotificameHub SDK: Found ${normalizedChannels.length} channels`
    );

    return normalizedChannels;
  } catch (error: any) {
    logger.error(`NotificameHub SDK: Error listing channels: ${error.message}`);
    Sentry.captureException(error);
    throw error;
  }
}

// Funcao para validar token geral
export async function validateNotificameHubToken(
  generalToken: string
): Promise<boolean> {
  try {
    const client = new Client(generalToken);
    await client.listChannels();
    return true;
  } catch (error: any) {
    logger.warn(`NotificameHub SDK: Token validation failed: ${error.message}`);
    return false;
  }
}

export default NotificameHubClient;
