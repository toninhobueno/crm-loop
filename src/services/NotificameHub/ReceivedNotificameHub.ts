// Service para processar mensagens recebidas via webhook NotificameHub
import * as Sentry from "@sentry/node";
import logger from "../../utils/logger";
import Whatsapp from "../../models/Whatsapp";
import { getIO } from "../../libs/socket";
import Contact from "../../models/Contact";
import Ticket from "../../models/Ticket";
import Message from "../../models/Message";
import CreateMessageService from "../MessageServices/CreateMessageService";
import { Op } from "sequelize";
import fs from "fs";
import path, { join, extname } from "path";
import axios from "axios";
import {
  INotificameHubWebhookPayload,
  INotificameHubWebhookMessage,
  INotificameHubWebhookStatus
} from "../../libs/notificamehub/INotificameHub.interfaces";
import { getOrInitNotificameHub } from "../../libs/notificamehub";
import { convertToMp3 } from "../../utils/convertFiles";

// Importação dinâmica do file-type (módulo ESM)
const getFileType = async () => {
  return await (eval('import("file-type")') as Promise<typeof import("file-type")>);
};

// Extrair número/ID do contato do NotificameHub
const getContactId = (from: string): string => {
  if (!from) return "";
  // Para WhatsApp, remover o sufixo @s.whatsapp.net ou similar
  // Para Instagram/Facebook, manter o ID como está
  return from.replace(/@.*$/, "").replace(/\D/g, "") || from;
};

// Função auxiliar para encontrar ou criar ticket
// Se createIfNotExists = false, apenas busca ticket existente (para mensagens enviadas)
const findOrCreateTicket = async (
  contact: Contact,
  whatsapp: Whatsapp,
  companyId: number,
  createIfNotExists: boolean = true
): Promise<Ticket | null> => {
  let ticket = await Ticket.findOne({
    where: {
      status: {
        [Op.or]: ["open", "pending"]
      },
      contactId: contact.id,
      whatsappId: whatsapp.id,
      companyId
    }
  });

  // Se não encontrar e não deve criar, retornar null
  if (!ticket && !createIfNotExists) {
    logger.info(`[NotificameHub] No open ticket found for contact ${contact.id}, skipping outgoing message`);
    return null;
  }

  if (!ticket) {
    ticket = await Ticket.create({
      contactId: contact.id,
      status: "pending",
      isGroup: contact.isGroup || false,
      unreadMessages: 1,
      whatsappId: whatsapp.id,
      companyId,
      channel: whatsapp.channel || "whatsapp"
    });

    ticket = await Ticket.findByPk(ticket.id, {
      include: [
        { model: Contact, as: "contact" },
        { model: Whatsapp, as: "whatsapp" }
      ]
    });

    const io = getIO();
    io.of(String(companyId)).emit(`company-${companyId}-ticket`, {
      action: "update",
      ticket
    });
  }

  return ticket;
};

// Função para baixar e salvar foto de perfil
const downloadProfilePicture = async (
  pictureUrl: string,
  companyId: number,
  contactId: string
): Promise<string | null> => {
  if (!pictureUrl || pictureUrl.includes("nopicture")) return null;

  const publicFolder = path.resolve(__dirname, "..", "..", "..", "public");
  const mediaFolder = path.resolve(publicFolder, `company${companyId}`);

  if (!fs.existsSync(mediaFolder)) {
    fs.mkdirSync(mediaFolder, { recursive: true });
    fs.chmodSync(mediaFolder, 0o777);
  }

  try {
    const response = await axios.get(pictureUrl, {
      responseType: "arraybuffer",
      timeout: 30000,
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"
      }
    });

    const data = Buffer.from(response.data);

    // Detectar tipo real do arquivo
    const { fileTypeFromBuffer } = await getFileType();
    const fileTypeResult = await fileTypeFromBuffer(data);
    const extension = fileTypeResult?.ext || "jpg";

    const filename = `profile_${contactId}_${Date.now()}.${extension}`;
    const filePath = join(mediaFolder, filename);

    fs.writeFileSync(filePath, data);
    fs.chmodSync(filePath, 0o666);

    logger.info(
      `[NotificameHub] Profile picture saved: ${filename} (${data.length} bytes)`
    );

    return filename;
  } catch (error: any) {
    logger.warn(
      `[NotificameHub] Could not download profile picture: ${error.message}`
    );
    return null;
  }
};

// Função para baixar e salvar mídia localmente
// Usa SDK do NotificameHub para WhatsApp, fallback para axios para outros canais
const downloadMedia = async (
  fileUrl: string,
  mimeType: string,
  companyId: number,
  messageId: string,
  whatsapp: Whatsapp
): Promise<string | null> => {
  if (!fileUrl) return null;

  const publicFolder = path.resolve(__dirname, "..", "..", "..", "public");
  const mediaFolder = path.resolve(publicFolder, `company${companyId}`);

  if (!fs.existsSync(mediaFolder)) {
    fs.mkdirSync(mediaFolder, { recursive: true });
    fs.chmodSync(mediaFolder, 0o777);
  }

  try {
    let data: Buffer;
    let detectedMimeType = mimeType;
    const channel = whatsapp.channel || "whatsapp";

    // Tentar usar SDK do NotificameHub para download de mídia WhatsApp
    if (channel.includes("whatsapp")) {
      try {
        logger.info(`[NotificameHub] Trying SDK download for WhatsApp media`);
        const client = await getOrInitNotificameHub(whatsapp.id);
        const sdkData = await client.downloadMedia(fileUrl, mimeType);

        if (sdkData) {
          data = sdkData;
          logger.info(`[NotificameHub] SDK download successful (${data.length} bytes)`);
        } else {
          throw new Error("SDK download returned null");
        }
      } catch (sdkError: any) {
        logger.warn(`[NotificameHub] SDK download failed, falling back to axios: ${sdkError.message}`);
        // Fallback para axios
        const response = await axios.get(fileUrl, {
          responseType: "arraybuffer",
          timeout: 60000
        });
        data = Buffer.from(response.data);
      }
    } else {
      // Para outros canais (Instagram, Facebook), usar axios com headers especiais
      logger.info(`[NotificameHub] Downloading media from ${channel}: ${fileUrl.substring(0, 80)}...`);

      const response = await axios.get(fileUrl, {
        responseType: "arraybuffer",
        timeout: 120000, // Timeout maior para vídeos
        maxContentLength: 100 * 1024 * 1024, // Até 100MB
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
          "Accept": "*/*",
          "Accept-Language": "pt-BR,pt;q=0.9,en-US;q=0.8,en;q=0.7",
          "Accept-Encoding": "gzip, deflate, br",
          "Connection": "keep-alive",
          "Sec-Fetch-Dest": "document",
          "Sec-Fetch-Mode": "navigate",
          "Sec-Fetch-Site": "none"
        }
      });
      data = Buffer.from(response.data);
      logger.info(`[NotificameHub] Downloaded ${data.length} bytes from ${channel}`);
    }

    // Detectar tipo real do arquivo
    const { fileTypeFromBuffer } = await getFileType();
    const fileTypeResult = await fileTypeFromBuffer(data);
    if (fileTypeResult) {
      detectedMimeType = fileTypeResult.mime;
    }

    // Determinar extensão baseada no tipo detectado
    let extension = fileTypeResult?.ext || "bin";
    if (!extension || extension === "bin") {
      if (mimeType.includes("jpeg") || mimeType.includes("jpg")) extension = "jpg";
      else if (mimeType.includes("png")) extension = "png";
      else if (mimeType.includes("gif")) extension = "gif";
      else if (mimeType.includes("webp")) extension = "webp";
      else if (mimeType.includes("mp4")) extension = "mp4";
      else if (mimeType.includes("ogg") || mimeType.includes("opus")) extension = "ogg";
      else if (mimeType.includes("mp3") || mimeType.includes("mpeg")) extension = "mp3";
      else if (mimeType.includes("pdf")) extension = "pdf";
    }

    const safeMessageId = messageId.replace(/[^a-zA-Z0-9]/g, "_");
    let filename = `${safeMessageId}_${Date.now()}.${extension}`;
    let filePath = join(mediaFolder, filename);

    // Salvar arquivo
    fs.writeFileSync(filePath, data);
    fs.chmodSync(filePath, 0o666);

    logger.info(
      `[NotificameHub] Media saved: ${filename} (${data.length} bytes, type: ${detectedMimeType})`
    );

    // Converter áudio para MP3 se necessário (para melhor compatibilidade)
    if (detectedMimeType.includes("audio") && !detectedMimeType.includes("mp3")) {
      try {
        logger.info(`[NotificameHub] Converting audio to MP3: ${filename}`);
        const mp3Path = await convertToMp3({ path: filePath });
        const mp3Filename = `${safeMessageId}_${Date.now()}.mp3`;

        // Renomear arquivo convertido
        const finalPath = join(mediaFolder, mp3Filename);
        fs.renameSync(mp3Path, finalPath);
        fs.chmodSync(finalPath, 0o666);

        filename = mp3Filename;
        logger.info(`[NotificameHub] Audio converted to MP3: ${filename}`);
      } catch (convError: any) {
        logger.warn(`[NotificameHub] Audio conversion failed, keeping original: ${convError.message}`);
      }
    }

    return filename;
  } catch (error: any) {
    logger.warn(
      `[NotificameHub] Could not download media: ${error.message}`
    );
    return null;
  }
};

export class ReceivedNotificameHub {
  // Handler para mensagens recebidas
  static async handleMessageEvent(
    whatsapp: Whatsapp,
    message: INotificameHubWebhookMessage,
    io: any
  ): Promise<void> {
    try {
      const messageId = message.id;
      const fromMe = message.direction === "OUT";

      // O campo "from" pode ser o remetente ou o destinatário dependendo da direção
      // Para mensagens recebidas (IN): from = contato
      // Para mensagens enviadas (OUT): to = contato, from = canal
      const rawContactId = fromMe ? (message as any).to : message.from;
      const contactId = getContactId(rawContactId);

      // Extrair dados do visitante/contato (pode vir como "visitor" ou "contact")
      const visitor = (message as any).visitor || (message as any).contact || {};
      const contactName =
        visitor.firstName ||
        visitor.name ||
        visitor.displayName ||
        contactId;
      const profilePicUrl =
        visitor.picture ||
        visitor.profilePicUrl ||
        visitor.avatar ||
        `${process.env.FRONTEND_URL}/nopicture.png`;

      logger.info(
        `[NotificameHub] Processing message: id=${messageId}, rawFrom=${message.from}, rawTo=${(message as any).to}, contactId=${contactId}, fromMe=${fromMe}, direction=${message.direction}, name=${contactName}`
      );

      if (!contactId) {
        logger.warn(
          `[NotificameHub] Could not determine contact ID from message. from=${message.from}, to=${(message as any).to}`
        );
        return;
      }

      // Criar ou atualizar contato
      let contact = await Contact.findOne({
        where: { number: contactId, companyId: whatsapp.companyId }
      });

      // Baixar e salvar foto de perfil localmente (para Instagram/Facebook as URLs expiram)
      let localProfilePicUrl = profilePicUrl;
      const channel = whatsapp.channel || "whatsapp";
      if (!fromMe && profilePicUrl && (channel === "instagram" || channel === "facebook")) {
        // Verificar se já temos uma foto local salva ou se a URL mudou
        const hasLocalPic = contact?.profilePicUrl?.includes(`company${whatsapp.companyId}`);
        if (!hasLocalPic || (contact?.profilePicUrl !== profilePicUrl && !profilePicUrl.includes("nopicture"))) {
          logger.info(`[NotificameHub] Downloading profile picture for ${contactName} (${channel})`);
          const savedPic = await downloadProfilePicture(
            profilePicUrl,
            whatsapp.companyId,
            contactId
          );
          if (savedPic) {
            localProfilePicUrl = savedPic;
          }
        } else if (hasLocalPic) {
          // Manter a foto local existente
          localProfilePicUrl = contact.profilePicUrl;
        }
      }

      if (!contact) {
        // Para mensagens enviadas (fromMe), não criar contato novo se não existir
        if (fromMe) {
          logger.info(`[NotificameHub] Outgoing message for unknown contact ${contactId}, skipping`);
          return;
        }

        logger.info(`[NotificameHub] Creating new contact: ${contactId} (${contactName})`);

        contact = await Contact.create({
          name: contactName,
          number: contactId,
          isGroup: false,
          companyId: whatsapp.companyId,
          profilePicUrl: localProfilePicUrl,
          channel: whatsapp.channel || "whatsapp"
        });
      } else {
        // Atualizar nome e foto se mudaram (apenas para mensagens recebidas)
        if (!fromMe) {
          const updates: any = {};
          if (contactName && contact.name !== contactName) {
            updates.name = contactName;
          }
          if (localProfilePicUrl && contact.profilePicUrl !== localProfilePicUrl) {
            updates.profilePicUrl = localProfilePicUrl;
          }
          if (Object.keys(updates).length > 0) {
            logger.info(`[NotificameHub] Updating contact ${contactId}: ${JSON.stringify(updates)}`);
            await contact.update(updates);
          }
        }
      }

      // Encontrar ou criar ticket
      // Para mensagens enviadas (fromMe), apenas buscar ticket existente, não criar novo
      const ticket = await findOrCreateTicket(
        contact,
        whatsapp,
        whatsapp.companyId,
        !fromMe // createIfNotExists = true apenas para mensagens recebidas
      );

      // Se não encontrou ticket e é mensagem enviada, ignorar
      if (!ticket) {
        logger.info(`[NotificameHub] No ticket for outgoing message to ${contactId}, skipping`);
        return;
      }

      // Processar conteúdo da mensagem
      let bodyText = "";
      let mediaUrl = "";
      let mediaType = "chat";

      // Verificar se contents existe e é um array
      const contents = message.contents || [];
      if (!Array.isArray(contents) || contents.length === 0) {
        logger.warn(`[NotificameHub] Message ${messageId} has no contents`);
        // Tentar extrair texto de campos alternativos
        bodyText = (message as any).text || (message as any).body || "Mensagem sem conteúdo";
      }

      for (const content of contents) {
        switch (content.type) {
          case "text":
            bodyText = (content as any).text || "";
            break;

          case "file":
            const fileContent = content as any;
            const mimeType = fileContent.fileMimeType || "";

            if (mimeType.includes("image")) mediaType = "image";
            else if (mimeType.includes("video")) mediaType = "video";
            else if (mimeType.includes("audio")) mediaType = "audio";
            else mediaType = "document";

            if (fileContent.fileUrl) {
              const savedMedia = await downloadMedia(
                fileContent.fileUrl,
                mimeType,
                whatsapp.companyId,
                messageId,
                whatsapp
              );
              if (savedMedia) {
                mediaUrl = savedMedia;
                logger.info(`[NotificameHub] VERSAO CORRIGIDA - Media saved successfully: ${savedMedia}`);
              }
            }

            bodyText = fileContent.fileCaption || `📎 ${mediaType}`;
            break;

          case "image":
          case "video":
          case "audio":
            const mediaContent = content as any;
            
            logger.info(`[NotificameHub] VERSAO CORRIGIDA - Processing ${content.type}: url=${mediaContent.fileUrl?.substring(0, 80)}...`);

            // Para Instagram, usar o contentType como prioridade
            if (content.type === "image") {
              mediaType = "image";
            } else if (content.type === "video") {
              mediaType = "video";
            } else if (content.type === "audio") {
              mediaType = "audio";
            }

            if (mediaContent.fileUrl) {
              try {
                const savedMedia = await downloadMedia(
                  mediaContent.fileUrl,
                  mediaContent.fileMimeType || "image/jpeg",
                  whatsapp.companyId,
                  messageId,
                  whatsapp
                );
                if (savedMedia) {
                  mediaUrl = savedMedia;
                  logger.info(`[NotificameHub] VERSAO CORRIGIDA - Media saved successfully: ${savedMedia}`);
                } else {
                  logger.warn(`[NotificameHub] VERSAO CORRIGIDA - downloadMedia returned null for ${mediaContent.fileUrl}`);
                }
              } catch (downloadError: any) {
                logger.error(`[NotificameHub] VERSAO CORRIGIDA - Error downloading media: ${downloadError.message}`);
                Sentry.captureException(downloadError);
              }
            }

            bodyText = mediaContent.fileCaption || mediaContent.fileName || `📎 ${mediaType}`;
            break;

          case "location":
            const locContent = content as any;
            bodyText = `📍 Localização: ${locContent.name || ""} (${
              locContent.latitude
            }, ${locContent.longitude})`;
            mediaType = "location";
            break;

          case "contacts":
            const contactsContent = content as any;
            if (contactsContent.contacts && contactsContent.contacts.length > 0) {
              const contactNames = contactsContent.contacts
                .map((c: any) => c.name?.formatted_name || "Contato")
                .join(", ");
              bodyText = `👤 Contato(s): ${contactNames}`;
            }
            mediaType = "vcard";
            break;

          case "interactive":
            const interactiveContent = content as any;
            bodyText =
              interactiveContent.interactive?.body?.text ||
              "Mensagem interativa";
            break;

          // Tipos específicos do Instagram
          case "ig_reel":
            const reelContent = content as any;
            logger.info(`[NotificameHub] Processing Instagram Reel: ${reelContent.fileUrl?.substring(0, 80)}...`);
            mediaType = "video";

            if (reelContent.fileUrl) {
              const savedReel = await downloadMedia(
                reelContent.fileUrl,
                reelContent.fileMimeType || "video/mp4",
                whatsapp.companyId,
                messageId,
                whatsapp
              );
              if (savedReel) {
                mediaUrl = savedReel;
                bodyText = "📹 Reel do Instagram";
              } else {
                // Se não conseguiu baixar, guardar URL como referência
                bodyText = `📹 Reel do Instagram\n🔗 ${reelContent.fileUrl}`;
              }
            } else {
              bodyText = "📹 Reel do Instagram compartilhado";
            }
            break;

          case "ig_post":
            const postContent = content as any;
            logger.info(`[NotificameHub] Processing Instagram Post: ${postContent.fileUrl?.substring(0, 80)}...`);

            // Posts podem ser imagens ou vídeos
            const postMimeType = postContent.fileMimeType || "";
            if (postMimeType.includes("video")) {
              mediaType = "video";
            } else {
              mediaType = "image";
            }

            if (postContent.fileUrl) {
              const savedPost = await downloadMedia(
                postContent.fileUrl,
                postMimeType || "image/jpeg",
                whatsapp.companyId,
                messageId,
                whatsapp
              );
              if (savedPost) {
                mediaUrl = savedPost;
                bodyText = "📷 Post do Instagram";
              } else {
                bodyText = `📷 Post do Instagram\n🔗 ${postContent.fileUrl}`;
              }
            } else {
              bodyText = "📷 Post do Instagram compartilhado";
            }
            break;

          case "share":
            const shareContent = content as any;
            logger.info(`[NotificameHub] Processing Instagram Share: ${shareContent.fileUrl?.substring(0, 80)}...`);

            // Compartilhamentos geralmente são links/previews
            const shareMimeType = shareContent.fileMimeType || "";

            if (shareMimeType.includes("video")) {
              mediaType = "video";
            } else if (shareMimeType.includes("image")) {
              mediaType = "image";
            } else {
              mediaType = "document";
            }

            if (shareContent.fileUrl) {
              const savedShare = await downloadMedia(
                shareContent.fileUrl,
                shareMimeType || "application/octet-stream",
                whatsapp.companyId,
                messageId,
                whatsapp
              );
              if (savedShare) {
                mediaUrl = savedShare;
                bodyText = "🔗 Conteúdo compartilhado";
              } else {
                bodyText = `🔗 Conteúdo compartilhado\n${shareContent.fileUrl}`;
              }
            } else {
              bodyText = "🔗 Conteúdo compartilhado";
            }
            break;

          case "story_mention":
            const storyContent = content as any;
            logger.info(`[NotificameHub] Processing Instagram Story Mention`);
            mediaType = "image";

            if (storyContent.fileUrl) {
              const savedStory = await downloadMedia(
                storyContent.fileUrl,
                storyContent.fileMimeType || "image/jpeg",
                whatsapp.companyId,
                messageId,
                whatsapp
              );
              if (savedStory) {
                mediaUrl = savedStory;
                bodyText = "📱 Menção em Story";
              } else {
                bodyText = `📱 Menção em Story\n🔗 ${storyContent.fileUrl}`;
              }
            } else {
              bodyText = "📱 Mencionou você em um Story";
            }
            break;

          case "story_reply":
            const storyReplyContent = content as any;
            bodyText = storyReplyContent.text || "💬 Resposta ao Story";
            break;
        }
      }

      // Verificar se mensagem já existe (evitar duplicatas de mensagens enviadas)
      const existingMessage = await Message.findOne({
        where: { wid: messageId, companyId: whatsapp.companyId }
      });

      if (existingMessage) {
        logger.info(
          `[NotificameHub] Message ${messageId} already exists, updating ACK if needed`
        );
        
        // Apenas atualizar ACK se for mensagem enviada
        if (fromMe) {
          await existingMessage.update({ ack: 2 });
        }
        
        // Emitir atualização via socket
        const io = getIO();
        io.of(String(whatsapp.companyId)).emit(
          `company-${whatsapp.companyId}-appMessage`,
          {
            action: "update",
            message: existingMessage
          }
        );
        
        return;
      }

      // Criar mensagem no sistema
      const msgData = {
        wid: messageId,
        ticketId: ticket.id,
        contactId: fromMe ? undefined : contact.id,
        body: bodyText,
        fromMe,
        mediaType,
        mediaUrl,
        read: fromMe,
        ack: fromMe ? 2 : 0
      };

      await CreateMessageService({
        messageData: msgData,
        companyId: whatsapp.companyId
      });

      if (!fromMe) {
        await ticket.update({
          unreadMessages: ticket.unreadMessages + 1,
          lastMessage: bodyText
        });
      }

      const updatedTicket = await Ticket.findByPk(ticket.id, {
        include: [
          { model: Contact, as: "contact" },
          { model: Whatsapp, as: "whatsapp" }
        ]
      });

      io.of(String(whatsapp.companyId)).emit(
        `company-${whatsapp.companyId}-ticket`,
        {
          action: "update",
          ticket: updatedTicket
        }
      );

      logger.info(
        `[NotificameHub] Message ${messageId} processed for ticket ${ticket.id}`
      );
    } catch (error: any) {
      Sentry.captureException(error);
      logger.error(
        `[NotificameHub] Error processing message: ${error.message}`,
        error.stack
      );
    }
  }

  // Handler para atualizações de status de mensagem
  static async handleStatusEvent(
    whatsapp: Whatsapp,
    status: INotificameHubWebhookStatus,
    io: any
  ): Promise<void> {
    try {
      const messageId = status.messageId;

      if (!messageId) {
        logger.warn(`[NotificameHub] Status event without messageId`);
        return;
      }

      // Mapear status para ACK interno
      let ack = 0;
      switch (status.status) {
        case "sent":
          ack = 1;
          break;
        case "delivered":
          ack = 2;
          break;
        case "read":
          ack = 3;
          break;
        case "failed":
          ack = -1;
          break;
      }

      // Atualizar mensagem no banco
      const [updateCount] = await Message.update(
        { ack },
        { where: { wid: messageId, companyId: whatsapp.companyId } }
      );

      if (updateCount === 0) {
        logger.warn(
          `[NotificameHub] Message with wid ${messageId} not found for status update`
        );
        return;
      }

      // Buscar mensagem atualizada para emitir via socket
      const message = await Message.findOne({
        where: { wid: messageId, companyId: whatsapp.companyId }
      });

      if (message) {
        io.of(String(whatsapp.companyId)).emit(
          `company-${whatsapp.companyId}-appMessage`,
          {
            action: "update",
            message
          }
        );
      }

      logger.info(
        `[NotificameHub] Message ${messageId} status updated to ${status.status} (ack=${ack})`
      );
    } catch (error: any) {
      Sentry.captureException(error);
      logger.error(
        `[NotificameHub] Error updating message status: ${error.message}`,
        error.stack
      );
    }
  }

  // Handler principal para processar payload do webhook
  static async processWebhook(
    whatsapp: Whatsapp,
    payload: INotificameHubWebhookPayload
  ): Promise<void> {
    const io = getIO();

    // Normalizar tipo para lowercase
    const payloadType = (payload.type || "").toLowerCase();

    // Log detalhado do payload para debug
    const payloadKeys = Object.keys(payload);
    logger.info(
      `[NotificameHub] Processing webhook: type=${payload.type} (normalized: ${payloadType}), channel=${payload.channel}, keys=[${payloadKeys.join(", ")}]`
    );

    // Log completo do payload para debug (aumentado para 2000 chars)
    logger.info(
      `[NotificameHub] Full payload: ${JSON.stringify(payload).substring(0, 2000)}`
    );

    // Extrair dados da mensagem - pode estar em payload.message ou diretamente no payload
    const extractMessageData = (): any => {
      // Primeiro tentar payload.message
      if (payload.message && payload.message.id) {
        logger.info(`[NotificameHub] Message data found in payload.message`);
        return payload.message;
      }

      // Se não, verificar se os campos da mensagem estão diretamente no payload
      const p = payload as any;
      if (p.message && typeof p.message === "object") {
        logger.info(`[NotificameHub] Message data found in nested message object`);
        return p.message;
      }

      // Se o payload tem campos de mensagem diretamente
      if (p.from || p.contents || p.visitor) {
        logger.info(`[NotificameHub] Message data found directly in payload root`);
        return p;
      }

      return null;
    };

    switch (payloadType) {
      case "message":
        const messageData = extractMessageData();
        if (messageData) {
          logger.info(
            `[NotificameHub] Extracted message: id=${messageData.id}, from=${messageData.from}, to=${messageData.to}, direction=${messageData.direction}, hasContents=${!!messageData.contents}`
          );
          await this.handleMessageEvent(whatsapp, messageData, io);
        } else {
          logger.warn(`[NotificameHub] Message event without valid message data. Payload keys: ${payloadKeys.join(", ")}`);
        }
        break;

      case "status":
      case "message_status":
        if (payload.status) {
          await this.handleStatusEvent(whatsapp, payload.status, io);
        }
        break;

      default:
        // Tentar processar como mensagem se tiver os campos necessários
        const fallbackData = extractMessageData();
        if (fallbackData) {
          logger.info(`[NotificameHub] Processing unknown type "${payload.type}" as message`);
          await this.handleMessageEvent(whatsapp, fallbackData, io);
        } else {
          logger.warn(`[NotificameHub] Unknown webhook type: ${payload.type}, keys: ${payloadKeys.join(", ")}`);
        }
    }
  }
}

export default ReceivedNotificameHub;
