// Service para processar mensagens recebidas via webhook UAZApi
// Baseado no UAZApiWebhookController original, adaptado para seguir padrão da pasta atual

import * as Sentry from "@sentry/node";
import logger from "../../utils/logger";
import Whatsapp from "../../models/Whatsapp";
import { getIO } from "../../libs/socket";
import Contact from "../../models/Contact";
import Ticket from "../../models/Ticket";
import Message from "../../models/Message";
import Queue from "../../models/Queue";
import QueueIntegrations from "../../models/QueueIntegrations";
import CreateMessageService from "../MessageServices/CreateMessageService";
import { Op } from "sequelize";
import { getUAZApi } from "../../libs/uazapi";
import fs from "fs";
import path, { join } from "path";
import axios from "axios";
import typebotListener from "../TypebotServices/typebotListener";
import { sayChatbot } from "../WbotServices/ChatBotListener";
import { FlowBuilderModel } from "../../models/FlowBuilder";
import { ActionsWebhookService } from "../WebhookService/ActionsWebhookService";
import { IConnections, INodes } from "../WebhookService/DispatchWebHookService";

// Extrair número de telefone ou ID do grupo do JID do WhatsApp
const getContactNumber = (jid: string): string => {
  if (!jid) return "";
  
  // Para grupos (@g.us), manter o ID completo sem o sufixo
  if (jid.includes("@g.us")) {
    return jid.replace(/@g\.us$/, "");
  }
  
  // Para contatos normais, extrair apenas números
  return jid.replace(/@.*$/, "").replace(/\D/g, "");
};

// Função para baixar e salvar a foto de perfil localmente
const downloadProfileImage = async (
  profilePicUrl: string,
  companyId: number
): Promise<string | null> => {
  if (!profilePicUrl || profilePicUrl.includes("nopicture")) {
    return null;
  }

  const publicFolder = path.resolve(__dirname, "..", "..", "..", "public");
  const folder = path.resolve(publicFolder, `company${companyId}`, "contacts");

  if (!fs.existsSync(folder)) {
    fs.mkdirSync(folder, { recursive: true });
    fs.chmodSync(folder, 0o777);
  }

  try {
    const response = await axios.get(profilePicUrl, {
      responseType: "arraybuffer",
      timeout: 10000,
    });

    const filename = `${new Date().getTime()}.jpeg`;
    fs.writeFileSync(join(folder, filename), response.data);
    logger.info(`[UAZApi] Profile image saved: ${filename}`);
    return filename;
  } catch (error: any) {
    logger.warn(`[UAZApi] Could not download profile image: ${error.message}`);
    return null;
  }
};

// Função auxiliar para encontrar ou criar ticket
const findOrCreateTicket = async (
  contact: Contact,
  whatsapp: Whatsapp,
  companyId: number
): Promise<Ticket> => {
  const isGroup = contact.isGroup || false;
  
  // Para grupos, buscar também tickets com status "group"
  const statusOptions = isGroup 
    ? ["open", "pending", "group"] 
    : ["open", "pending"];
  
  let ticket = await Ticket.findOne({
    where: {
      status: {
        [Op.or]: statusOptions
      },
      contactId: contact.id,
      whatsappId: whatsapp.id,
      companyId
    }
  });

  if (!ticket) {
    // Para grupos, o status inicial deve ser "group" para aparecer na aba de grupos
    // Para contatos normais, o status é "pending"
    const initialStatus = isGroup ? "group" : "pending";
    
    ticket = await Ticket.create({
      contactId: contact.id,
      status: initialStatus,
      isGroup: isGroup,
      unreadMessages: 1,
      whatsappId: whatsapp.id,
      companyId
    });

    ticket = await Ticket.findByPk(ticket.id, {
      include: [
        { model: Contact, as: "contact" },
        { model: Whatsapp, as: "whatsapp" }
      ]
    });

    const io = getIO();
    io.of(String(companyId))
      .emit(`company-${companyId}-ticket`, {
        action: "update",
        ticket
      });
      
    logger.info(`[UAZApi] Created new ticket ${ticket?.id} for ${isGroup ? 'group' : 'contact'} ${contact.number} with status: ${initialStatus}`);
  }

  return ticket;
};

export class ReceivedUAZApi {
  // Handler para eventos de conexão
  static async handleConnectionEvent(
    whatsapp: Whatsapp,
    data: any,
    io: any
  ): Promise<void> {
    // A estrutura pode variar: data.instance, data, ou diretamente no data
    const instance = data.instance || data;
    const status = instance.status || data.status;
    const profileName = data.profileName || instance.profileName;
    const phone = data.phone || instance.phone;
    const qrcode = instance.qrcode || data.qrcode;
    const paircode = instance.paircode || data.paircode;
    const token = data.token || instance.token;

    logger.info(`[UAZApi] Connection event for ${whatsapp.name}: status=${status}, hasToken=${!!token}, hasQrcode=${!!qrcode}, hasPaircode=${!!paircode}`);

    if (token && token !== whatsapp.token) {
      logger.info(`[UAZApi] Saving new token for ${whatsapp.name}: ***${token.slice(-4)}`);
      await whatsapp.update({ token });

      try {
        const uazapi = getUAZApi(whatsapp.id);
        if (uazapi) {
          uazapi.setInstanceToken(token);
          logger.info(`[UAZApi] Updated session token for ${whatsapp.name}`);
        }
      } catch (err) {
        // Sessão ainda não inicializada, ignora
      }
    }

    // Processar QR code ou paircode primeiro (pode vir mesmo quando status é "connecting" ou outro)
    if (qrcode || paircode) {
      let qrValue = qrcode || paircode;
      
      // Se o QR code vier como URL de imagem, converter para base64 ou manter como está
      // A UAZApi pode enviar como URL ou como string base64
      if (qrValue && qrValue.startsWith('http')) {
        logger.info(`[UAZApi] QR Code is a URL, will be used as-is: ${qrValue.substring(0, 50)}...`);
        // Manter como URL - o frontend pode lidar com isso
      } else if (qrValue && !qrValue.startsWith('data:') && qrValue.length > 100) {
        // Se parece ser base64 mas não tem prefixo, adicionar prefixo
        if (!qrValue.includes('base64')) {
          logger.info(`[UAZApi] QR Code appears to be base64, adding prefix`);
          qrValue = `data:image/png;base64,${qrValue}`;
        }
      }
      
      logger.info(`[UAZApi] QR Code/Paircode received for ${whatsapp.name}, length: ${qrValue?.length || 0}, type: ${qrValue?.substring(0, 20)}...`);
      
      await whatsapp.update({
        status: "qrcode",
        qrcode: qrValue,
        retries: 0,
      });

      // Recarregar whatsapp para garantir que tem os dados atualizados
      await whatsapp.reload();

      io.of(String(whatsapp.companyId)).emit(`company-${whatsapp.companyId}-whatsappSession`, {
        action: "update",
        session: whatsapp,
      });

      logger.info(`[UAZApi] QR Code updated and emitted for ${whatsapp.name}, status: ${whatsapp.status}`);
      return; // Retornar após processar QR code
    }

    if (status === "connected") {
      await whatsapp.update({
        status: "CONNECTED",
        qrcode: "",
        number: phone || "",
        retries: 0,
      });

      await whatsapp.reload();

      io.of(String(whatsapp.companyId)).emit(`company-${whatsapp.companyId}-whatsappSession`, {
        action: "update",
        session: whatsapp,
      });

      logger.info(`[UAZApi] WhatsApp ${whatsapp.name} is now CONNECTED!`);
    } else if (status === "disconnected") {
      await whatsapp.update({
        status: "DISCONNECTED",
        qrcode: "",
      });

      await whatsapp.reload();

      io.of(String(whatsapp.companyId)).emit(`company-${whatsapp.companyId}-whatsappSession`, {
        action: "update",
        session: whatsapp,
      });
    } else if (status === "connecting" || !status) {
      // Se está conectando mas não tem QR code ainda, manter status atual ou definir como OPENING
      if (whatsapp.status !== "qrcode") {
        await whatsapp.update({
          status: "OPENING",
        });

        await whatsapp.reload();

        io.of(String(whatsapp.companyId)).emit(`company-${whatsapp.companyId}-whatsappSession`, {
          action: "update",
          session: whatsapp,
        });
      }
    }
  }

  // Handler para mensagens recebidas
  static async handleMessageEvent(
    whatsapp: Whatsapp,
    data: any,
    io: any
  ): Promise<void> {
    try {
      // Log completo dos dados recebidos para debug
      logger.info(`[UAZApi][DEBUG] Raw webhook data keys: ${Object.keys(data).join(', ')}`);
      logger.info(`[UAZApi][DEBUG] Raw webhook data: ${JSON.stringify(data).substring(0, 500)}...`);
      
      const messageData = data.message || data;
      const chatData = data.chat || {};
      
      // Log dos dados da mensagem
      logger.info(`[UAZApi][DEBUG] Message data keys: ${Object.keys(messageData).join(', ')}`);

      const messageId = messageData.id || messageData.messageid;
      const fromMe = messageData.fromMe || false;
      
      // Extrair texto e verificar se é JSON de mídia
      let text = messageData.text || messageData.content || messageData.caption || "";
      let mediaJsonData: any = null;
      
      // Se text é objeto, pode ser dados de mídia
      if (typeof text === "object") {
        mediaJsonData = text;
        text = text.caption || "";
      }
      
      // Se text é string que parece JSON de mídia (começa com image{, video{, audio{, etc)
      if (typeof text === "string" && text.match(/^(image|video|audio|document|sticker)\{/i)) {
        try {
          const jsonStr = text.replace(/^(image|video|audio|document|sticker)/i, "");
          mediaJsonData = JSON.parse(jsonStr);
          mediaJsonData._mediaType = text.match(/^(image|video|audio|document|sticker)/i)?.[1]?.toLowerCase();
          text = mediaJsonData.caption || "";
          logger.info(`[UAZApi] Detected media JSON in text field, type: ${mediaJsonData._mediaType}, URL: ${mediaJsonData.URL?.substring(0, 60) || 'N/A'}..., mimetype: ${mediaJsonData.mimetype || 'N/A'}`);
        } catch (e: any) {
          // Não é JSON válido, manter como texto
          logger.warn(`[UAZApi] Failed to parse media JSON: ${e.message}, text preview: ${text.substring(0, 100)}`);
        }
      }
      
      text = String(text || "");
      let messageType = messageData.messageType || messageData.type || "conversation";
      
      // Se detectamos mídia no JSON, ajustar o tipo
      if (mediaJsonData?._mediaType) {
        messageType = mediaJsonData._mediaType;
      }
      const senderName = messageData.senderName || "";
      const chatId = messageData.chatid || messageData.sender || chatData.wa_chatid || "";
      
      // Verificar se é grupo
      const isGroupMessage = chatId.includes("@g.us") || chatData.wa_isGroup || false;
      
      // Para grupos, o nome do grupo pode vir em diferentes campos
      // chatData.wa_name geralmente é o nome do grupo
      // messageData.groupName ou chatData.groupName também podem ter o nome
      const groupName = chatData.wa_name || chatData.groupName || messageData.groupName || chatData.name || "";

      logger.info(`[UAZApi] Processing message: id=${messageId}, chatId=${chatId}, fromMe=${fromMe}, isGroup=${isGroupMessage}`);
      logger.info(`[UAZApi][DEBUG] Group info: groupName="${groupName}", senderName="${senderName}", chatData.wa_name="${chatData.wa_name || 'N/A'}"`);

      if (isGroupMessage && !whatsapp.allowGroup) {
        logger.info(`[UAZApi] Ignoring group message for ${whatsapp.name}`);
        return;
      }

      const contactNumber = getContactNumber(chatId);
      // Para grupos, usar o nome do grupo; para contatos, usar o nome do remetente
      const contactName = isGroupMessage ? (groupName || `Grupo ${contactNumber}`) : (senderName || contactNumber);

      if (!contactNumber) {
        logger.warn(`[UAZApi] Could not determine contact number from chatId: ${chatId}`);
        return;
      }

      logger.info(`[UAZApi] Processing message from ${contactNumber} (${contactName})`);

      // Criar ou atualizar contato
      let contact = await Contact.findOne({
        where: { number: contactNumber, companyId: whatsapp.companyId }
      });

      if (!contact) {
        logger.info(`[UAZApi] Creating new contact: ${contactNumber}`);

        let profilePicUrl = `${process.env.FRONTEND_URL}/nopicture.png`;
        let urlPicture: string | null = null;

        try {
          const uazapi = getUAZApi(whatsapp.id);
          const picUrl = await uazapi.getProfilePicUrl(contactNumber);
          if (picUrl) {
            profilePicUrl = picUrl;
            urlPicture = await downloadProfileImage(picUrl, whatsapp.companyId);
          }
        } catch (err: any) {
          logger.warn(`[UAZApi] Could not get profile pic for new contact ${contactNumber}: ${err.message}`);
        }

        contact = await Contact.create({
          name: contactName,
          number: contactNumber,
          isGroup: isGroupMessage,
          companyId: whatsapp.companyId,
          profilePicUrl,
          urlPicture: urlPicture || "nopicture.png",
          pictureUpdated: urlPicture ? true : false,
        });
        
        logger.info(`[UAZApi] Created contact: name="${contactName}", number="${contactNumber}", isGroup=${isGroupMessage}`);
      } else {
        const updates: any = {};
        
        // Atualizar nome se:
        // 1. O nome atual é diferente do novo
        // 2. Para grupos: se o nome atual é apenas o número ou começa com "Grupo ", atualizar com nome real
        const currentName = contact.name || "";
        const shouldUpdateName = contactName && (
          contact.name !== contactName ||
          (isGroupMessage && (currentName === contactNumber || currentName.startsWith("Grupo ")))
        );
        
        if (shouldUpdateName && contactName !== contactNumber) {
          updates.name = contactName;
          logger.info(`[UAZApi] Updating contact name from "${currentName}" to "${contactName}"`);
        }
        
        // Garantir que isGroup está correto
        if (isGroupMessage && !contact.isGroup) {
          updates.isGroup = true;
          logger.info(`[UAZApi] Marking contact ${contactNumber} as group`);
        }

        const currentUrlPicture = contact.getDataValue("urlPicture");
        if (!currentUrlPicture || currentUrlPicture === "nopicture.png") {
          try {
            const uazapi = getUAZApi(whatsapp.id);
            const picUrl = await uazapi.getProfilePicUrl(contactNumber);
            if (picUrl) {
              const urlPicture = await downloadProfileImage(picUrl, whatsapp.companyId);
              if (urlPicture) {
                updates.profilePicUrl = picUrl;
                updates.urlPicture = urlPicture;
                updates.pictureUpdated = true;
              }
            }
          } catch (err: any) {
            logger.warn(`[UAZApi] Could not update profile pic for contact ${contactNumber}: ${err.message}`);
          }
        }

        if (Object.keys(updates).length > 0) {
          await contact.update(updates);
        }
      }

      // Encontrar ou criar ticket
      const ticket = await findOrCreateTicket(contact, whatsapp, whatsapp.companyId);

      // Determinar o tipo de mídia interno
      let internalMediaType = "chat";
      const msgType = messageType.toLowerCase();
      if (msgType.includes("image")) {
        internalMediaType = "image";
      } else if (msgType.includes("video")) {
        internalMediaType = "video";
      } else if (msgType.includes("audio") || msgType.includes("ptt")) {
        // Frontend espera "audio" para renderizar o player
        internalMediaType = "audio";
      } else if (msgType.includes("document")) {
        internalMediaType = "document";
      } else if (msgType.includes("sticker")) {
        // Stickers são tratados como imagens no frontend
        internalMediaType = "image";
      } else if (msgType.includes("contact")) {
        internalMediaType = "vcard";
      } else if (msgType.includes("location")) {
        internalMediaType = "location";
      }

      // Processar mídia se houver
      let mediaUrl = "";
      let mediaFileName = "";
      
      // Verificar se há URL de mídia diretamente no webhook ou no JSON de mídia
      let directMediaUrl = messageData.fileUrl || messageData.mediaUrl || messageData.url || messageData.file;
      
      // Se temos mediaJsonData com URL, usar ela
      if (mediaJsonData?.URL) {
        directMediaUrl = mediaJsonData.URL;
        logger.info(`[UAZApi] Media URL detected in JSON: ${directMediaUrl.substring(0, 50)}...`);
      }
      
      // Se temos mediaJsonData, ajustar o tipo de mídia
      if (mediaJsonData?._mediaType && internalMediaType === "chat") {
        const mt = mediaJsonData._mediaType;
        if (mt === "image") internalMediaType = "image";
        else if (mt === "video") internalMediaType = "video";
        else if (mt === "audio") internalMediaType = "audio";
        else if (mt === "document") internalMediaType = "document";
        else if (mt === "sticker") internalMediaType = "image";
      }
      
      // Tentar baixar mídia se houver
      if (internalMediaType !== "chat" && internalMediaType !== "vcard" && internalMediaType !== "location") {
        logger.info(`[UAZApi] Media message detected: type=${internalMediaType}, messageId=${messageId}`);
        
        // Criar pasta para mídias da empresa
        const publicFolder = path.resolve(__dirname, "..", "..", "..", "public");
        const mediaFolder = path.resolve(publicFolder, `company${whatsapp.companyId}`);
        
        if (!fs.existsSync(mediaFolder)) {
          fs.mkdirSync(mediaFolder, { recursive: true });
          fs.chmodSync(mediaFolder, 0o777);
        }
        
        // Determinar extensão baseada no mimeType
        const mimeType = mediaJsonData?.mimetype || mediaJsonData?.MimeType || messageData.mimeType || messageData.mimetype || "";
        let extension = ".bin";
        if (mimeType.includes("jpeg") || mimeType.includes("jpg")) extension = ".jpg";
        else if (mimeType.includes("png")) extension = ".png";
        else if (mimeType.includes("gif")) extension = ".gif";
        else if (mimeType.includes("webp")) extension = ".webp";
        else if (mimeType.includes("mp4")) extension = ".mp4";
        else if (mimeType.includes("ogg") || mimeType.includes("opus")) extension = ".ogg";
        else if (mimeType.includes("mp3") || mimeType.includes("mpeg")) extension = ".mp3";
        else if (mimeType.includes("pdf")) extension = ".pdf";
        else if (internalMediaType === "image") extension = ".jpg";
        else if (internalMediaType === "video") extension = ".mp4";
        else if (internalMediaType === "audio") extension = ".ogg";
        else if (internalMediaType === "document") extension = ".pdf";
        
        const safeMessageId = messageId.replace(/[^a-zA-Z0-9]/g, "_");
        mediaFileName = `${safeMessageId}_${Date.now()}${extension}`;
        const mediaPath = join(mediaFolder, mediaFileName);
        
        let mediaBuffer: Buffer | null = null;
        
        // 1. Tentar baixar via API da UAZApi (retorna mídia descriptografada)
        // Tentar até 3 vezes com delay, pois a mídia pode não estar pronta imediatamente
        const maxRetries = 3;
        const retryDelay = 2000; // 2 segundos
        
        for (let attempt = 1; attempt <= maxRetries && !mediaBuffer; attempt++) {
          try {
            const uazapi = getUAZApi(whatsapp.id);
            logger.info(`[UAZApi] Trying to download media via API (attempt ${attempt}/${maxRetries}) for message: ${messageId}`);
            mediaBuffer = await uazapi.downloadMedia(messageId);
            if (mediaBuffer && mediaBuffer.length > 0) {
              logger.info(`[UAZApi] Downloaded ${mediaBuffer.length} bytes via UAZApi API`);
              break;
            }
          } catch (apiErr: any) {
            logger.warn(`[UAZApi] Attempt ${attempt} failed: ${apiErr.message}`);
            if (attempt < maxRetries) {
              logger.info(`[UAZApi] Waiting ${retryDelay}ms before retry...`);
              await new Promise(resolve => setTimeout(resolve, retryDelay));
            }
          }
        }
        
        // 2. Se não conseguiu via API, tentar URL direta (se for da UAZApi, não do WhatsApp)
        if (!mediaBuffer && directMediaUrl) {
          // Só baixar se for URL da UAZApi (descriptografada) ou outra URL pública
          // NÃO baixar de mmg.whatsapp.net (criptografado)
          if (!directMediaUrl.includes('mmg.whatsapp.net') && !directMediaUrl.includes('media.whatsapp.net')) {
            logger.info(`[UAZApi] Trying direct URL download: ${directMediaUrl.substring(0, 80)}...`);
            try {
              const response = await axios.get(directMediaUrl, {
                responseType: "arraybuffer",
                timeout: 30000,
                headers: {
                  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
                }
              });
              mediaBuffer = Buffer.from(response.data);
              if (mediaBuffer && mediaBuffer.length > 0) {
                logger.info(`[UAZApi] Downloaded ${mediaBuffer.length} bytes from direct URL`);
              }
            } catch (urlErr: any) {
              logger.warn(`[UAZApi] Could not download from direct URL: ${urlErr.message}`);
            }
          } else {
            logger.info(`[UAZApi] Skipping encrypted WhatsApp URL, waiting for FileDownloaded event`);
          }
        }
        
        // Se conseguiu baixar, salvar o arquivo
        if (mediaBuffer && mediaBuffer.length > 0) {
          fs.writeFileSync(mediaPath, mediaBuffer);
          fs.chmodSync(mediaPath, 0o666);
          mediaUrl = mediaFileName;
          logger.info(`[UAZApi] Media saved: ${mediaFileName} (${mediaBuffer.length} bytes)`);
        } else {
          // Se não conseguiu, a mídia será baixada pelo evento FileDownloaded
          logger.info(`[UAZApi] Media not available yet, will be downloaded via FileDownloaded event`);
        }
      }

      // Criar a mensagem no sistema
      // Garantir que body seja sempre string
      let bodyText = text;
      if (typeof bodyText === "object") {
        bodyText = "";
      }
      if (!bodyText && internalMediaType !== "chat") {
        bodyText = `📎 ${internalMediaType}`;
      }
      bodyText = String(bodyText || "");
      
      const msgData = {
        wid: messageId,
        ticketId: ticket.id,
        contactId: fromMe ? undefined : contact.id,
        body: bodyText,
        fromMe,
        mediaType: internalMediaType,
        mediaUrl: mediaUrl,
        read: fromMe,
        ack: fromMe ? 2 : 0,
      };

      await CreateMessageService({
        messageData: msgData,
        companyId: whatsapp.companyId,
      });

      if (!fromMe) {
        await ticket.update({
          unreadMessages: ticket.unreadMessages + 1,
          lastMessage: text
        });
      }

      const updatedTicket = await Ticket.findByPk(ticket.id, {
        include: [
          { model: Contact, as: "contact" },
          { model: Whatsapp, as: "whatsapp" }
        ]
      });

      io.of(String(whatsapp.companyId))
        .emit(`company-${whatsapp.companyId}-ticket`, {
          action: "update",
          ticket: updatedTicket,
        });

      logger.info(`[UAZApi] Message ${messageId} processed successfully for ticket ${ticket.id}`);

      // ===== INTEGRATIONS: Typebot, FlowBuilder e ChatBot =====
      // Só processar integrações para mensagens recebidas (não enviadas)
      if (!fromMe && updatedTicket) {
        try {
          // Recarregar ticket com todas as associações necessárias
          const ticketWithRelations = await Ticket.findByPk(ticket.id, {
            include: [
              { model: Contact, as: "contact" },
              {
                model: Whatsapp,
                as: "whatsapp",
                include: [{ model: Queue, as: "queues" }]
              },
              {
                model: Queue,
                as: "queue",
                include: [
                  {
                    model: QueueIntegrations,
                    as: "queueIntegrations"
                  }
                ]
              }
            ]
          });

          if (ticketWithRelations) {
            // Criar objeto msg compatível com o formato esperado pelas integrações
            const msg = {
              key: {
                remoteJid: chatId,
                fromMe: false,
                id: messageId
              },
              message: {
                conversation: text,
                extendedTextMessage: { text }
              },
              messageTimestamp: Math.floor(Date.now() / 1000),
              pushName: contactName
            };

            // Verificar se o ticket tem integração Typebot configurada
            const queueIntegration = ticketWithRelations.queue?.queueIntegrations;

            logger.info(`[UAZApi][DEBUG] Ticket ${ticket.id} - Has queue: ${!!ticketWithRelations.queue}, Has queueIntegration: ${!!queueIntegration}, Type: ${queueIntegration?.type || 'N/A'}`);
            logger.info(`[UAZApi][DEBUG] Ticket queueId: ${ticketWithRelations.queueId || 'NULL'}, WhatsApp has queues: ${!!ticketWithRelations.whatsapp?.queues}, Queues count: ${ticketWithRelations.whatsapp?.queues?.length || 0}`);
            logger.info(`[UAZApi][DEBUG] WhatsApp integrationId: ${ticketWithRelations.whatsapp?.integrationId || 'NULL'}, flowIdWelcome: ${ticketWithRelations.whatsapp?.flowIdWelcome || 'NULL'}`);
            
            if (ticketWithRelations.queue) {
              logger.info(`[UAZApi][DEBUG] Queue ID: ${ticketWithRelations.queue.id}, QueueIntegrations:`, JSON.stringify(queueIntegration || {}).substring(0, 200));
            }
            
            // Avisar se não há filas configuradas
            if (!ticketWithRelations.queueId && (!ticketWithRelations.whatsapp?.queues || ticketWithRelations.whatsapp.queues.length === 0)) {
              logger.warn(`[UAZApi][WARNING] WhatsApp ${whatsapp.name} (ID: ${whatsapp.id}) não tem filas vinculadas. Configure filas nas configurações da conexão para usar FlowBuilder.`);
            }

            if (queueIntegration && queueIntegration.type === "typebot") {
              logger.info(`[UAZApi] Triggering Typebot integration for ticket ${ticket.id}`);
              await typebotListener({
                ticket: ticketWithRelations,
                msg,
                wbot: null, // UAZApi não usa wbot
                typebot: queueIntegration
              });
            } else if (queueIntegration && queueIntegration.type === "flowbuilder") {
              // ===== FLOWBUILDER INTEGRATION =====
              logger.info(`[UAZApi] Triggering FlowBuilder integration for ticket ${ticket.id}`);
              
              // Verificar se tem fluxo em andamento
              if (ticketWithRelations.flowStopped && ticketWithRelations.lastFlowId) {
                logger.info(`[UAZApi][FLOWBUILDER] Continuing flow ${ticketWithRelations.flowStopped} from node ${ticketWithRelations.lastFlowId}`);
                
                const flow = await FlowBuilderModel.findByPk(ticketWithRelations.flowStopped);
                if (flow && flow.flow) {
                  const nodes: INodes[] = flow.flow["nodes"];
                  const connections: IConnections[] = flow.flow["connections"];
                  
                  const mountDataContact = {
                    number: contact.number,
                    name: contact.name,
                    email: contact.email
                  };
                  
                  await ActionsWebhookService(
                    whatsapp.id,
                    parseInt(ticketWithRelations.flowStopped),
                    ticketWithRelations.companyId,
                    nodes,
                    connections,
                    ticketWithRelations.lastFlowId,
                    null,
                    "",
                    "",
                    text,
                    ticketWithRelations.id,
                    mountDataContact
                  );
                }
              } else if (queueIntegration.flowBuilderId) {
                // Iniciar novo fluxo
                logger.info(`[UAZApi][FLOWBUILDER] Starting new flow ${queueIntegration.flowBuilderId}`);
                
                const flow = await FlowBuilderModel.findByPk(queueIntegration.flowBuilderId);
                if (flow && flow.flow) {
                  const nodes: INodes[] = flow.flow["nodes"];
                  const connections: IConnections[] = flow.flow["connections"];
                  
                  // Encontrar o primeiro nó (nó que não tem conexões de entrada)
                  const firstNode = nodes.find(node => {
                    return !connections.some(conn => conn.target === node.id);
                  });
                  
                  if (firstNode) {
                    const mountDataContact = {
                      number: contact.number,
                      name: contact.name,
                      email: contact.email
                    };
                    
                    // Marcar ticket como usando fluxo
                    await ticketWithRelations.update({
                      flowStopped: String(flow.id),
                      lastFlowId: firstNode.id,
                      dataWebhook: { status: "process" }
                    });
                    
                    await ActionsWebhookService(
                      whatsapp.id,
                      flow.id,
                      ticketWithRelations.companyId,
                      nodes,
                      connections,
                      firstNode.id,
                      null,
                      "",
                      "",
                      null,
                      ticketWithRelations.id,
                      mountDataContact
                    );
                  } else {
                    logger.error(`[UAZApi][FLOWBUILDER] First node not found for flow ${flow.id}`);
                  }
                }
              }
            } else if (ticketWithRelations.queue && !queueIntegration) {
              // Se tem fila mas não tem integração typebot/flowbuilder, verificar chatbot
              logger.info(`[UAZApi] Checking ChatBot for ticket ${ticket.id}`);

              // Verificar se deve processar chatbot
              if (ticketWithRelations.isBot) {
                await sayChatbot(
                  ticketWithRelations.queueId,
                  null as any, // UAZApi não usa wbot - as funções internas verificam o provider
                  ticketWithRelations,
                  contact,
                  msg as any,
                  null as any // ticketTraking
                );
              }
            } else if (!ticketWithRelations.queueId) {
              // ===== TICKET SEM FILA: Verificar integração do WhatsApp ou FlowBuilder de boas-vindas =====
              logger.info(`[UAZApi] Ticket ${ticket.id} has no queue, checking WhatsApp integration`);

              // OPÇÃO 1: Verificar se o WhatsApp tem uma integração padrão (integrationId)
              if (ticketWithRelations.whatsapp?.integrationId) {
                logger.info(`[UAZApi] WhatsApp has integrationId: ${ticketWithRelations.whatsapp.integrationId}`);
                
                const whatsappIntegration = await QueueIntegrations.findByPk(ticketWithRelations.whatsapp.integrationId);
                
                if (whatsappIntegration && whatsappIntegration.type === "flowbuilder" && whatsappIntegration.flowBuilderId) {
                  logger.info(`[UAZApi][FLOWBUILDER] Starting WhatsApp integration flow ${whatsappIntegration.flowBuilderId}`);
                  
                  // Verificar se tem fluxo em andamento
                  if (ticketWithRelations.flowStopped && ticketWithRelations.lastFlowId) {
                    logger.info(`[UAZApi][FLOWBUILDER] Continuing flow ${ticketWithRelations.flowStopped} from node ${ticketWithRelations.lastFlowId}`);
                    
                    const flow = await FlowBuilderModel.findByPk(ticketWithRelations.flowStopped);
                    if (flow && flow.flow) {
                      const nodes: INodes[] = flow.flow["nodes"];
                      const connections: IConnections[] = flow.flow["connections"];
                      
                      const mountDataContact = {
                        number: contact.number,
                        name: contact.name,
                        email: contact.email
                      };
                      
                      await ActionsWebhookService(
                        whatsapp.id,
                        parseInt(ticketWithRelations.flowStopped),
                        ticketWithRelations.companyId,
                        nodes,
                        connections,
                        ticketWithRelations.lastFlowId,
                        null,
                        "",
                        "",
                        text,
                        ticketWithRelations.id,
                        mountDataContact
                      );
                    }
                  } else {
                    // Iniciar novo fluxo da integração do WhatsApp
                    const flow = await FlowBuilderModel.findByPk(whatsappIntegration.flowBuilderId);
                    if (flow && flow.flow) {
                      const nodes: INodes[] = flow.flow["nodes"];
                      const connections: IConnections[] = flow.flow["connections"];
                      
                      const firstNode = nodes.find(node => {
                        return !connections.some(conn => conn.target === node.id);
                      });
                      
                      if (firstNode) {
                        const mountDataContact = {
                          number: contact.number,
                          name: contact.name,
                          email: contact.email
                        };
                        
                        await ticketWithRelations.update({
                          flowStopped: String(flow.id),
                          lastFlowId: firstNode.id,
                          dataWebhook: { status: "process" }
                        });
                        
                        await ActionsWebhookService(
                          whatsapp.id,
                          flow.id,
                          ticketWithRelations.companyId,
                          nodes,
                          connections,
                          firstNode.id,
                          null,
                          "",
                          "",
                          null,
                          ticketWithRelations.id,
                          mountDataContact
                        );
                      } else {
                        logger.error(`[UAZApi][FLOWBUILDER] First node not found for flow ${flow.id}`);
                      }
                    }
                  }
                  
                  // Retornar para não processar outras integrações
                  return;
                } else if (whatsappIntegration && whatsappIntegration.type === "typebot") {
                  logger.info(`[UAZApi] Triggering Typebot integration from WhatsApp config`);
                  await typebotListener({
                    ticket: ticketWithRelations,
                    msg,
                    wbot: null,
                    typebot: whatsappIntegration
                  });
                  return;
                }
              }

              // OPÇÃO 2: Verificar flowIdWelcome (apenas se tiver filas configuradas no WhatsApp)
              if (ticketWithRelations.whatsapp?.queues?.length > 0 && ticketWithRelations.whatsapp.flowIdWelcome) {
                logger.info(`[UAZApi][FLOWBUILDER] Starting welcome flow ${ticketWithRelations.whatsapp.flowIdWelcome}`);
                
                const flow = await FlowBuilderModel.findOne({
                  where: {
                    id: ticketWithRelations.whatsapp.flowIdWelcome,
                    active: true,
                    company_id: whatsapp.companyId
                  }
                });
                
                if (flow && flow.flow) {
                  const nodes: INodes[] = flow.flow["nodes"];
                  const connections: IConnections[] = flow.flow["connections"];
                  
                  // Encontrar o primeiro nó
                  const firstNode = nodes.find(node => {
                    return !connections.some(conn => conn.target === node.id);
                  });
                  
                  if (firstNode) {
                    const mountDataContact = {
                      number: contact.number,
                      name: contact.name,
                      email: contact.email
                    };
                    
                    // Marcar ticket como usando fluxo
                    await ticketWithRelations.update({
                      flowStopped: String(flow.id),
                      lastFlowId: firstNode.id,
                      dataWebhook: { status: "process" }
                    });
                    
                    await ActionsWebhookService(
                      whatsapp.id,
                      flow.id,
                      ticketWithRelations.companyId,
                      nodes,
                      connections,
                      firstNode.id,
                      null,
                      "",
                      "",
                      null,
                      ticketWithRelations.id,
                      mountDataContact
                    );
                    
                    // Retornar para não processar outras integrações
                    return;
                  }
                }
              }

              // Verificar se a conexão tem integração padrão
              const defaultQueue = ticketWithRelations.whatsapp.queues[0];
              if (defaultQueue) {
                const defaultIntegration = await QueueIntegrations.findOne({
                  where: { queueId: defaultQueue.id }
                });

                if (defaultIntegration && defaultIntegration.type === "typebot") {
                  logger.info(`[UAZApi] Triggering default Typebot for ticket ${ticket.id}`);
                  await typebotListener({
                    ticket: ticketWithRelations,
                    msg,
                    wbot: null,
                    typebot: defaultIntegration
                  });
                }
              }
            }
          }
        } catch (integrationError: any) {
          logger.error(`[UAZApi] Error processing integrations: ${integrationError.message}`);
          Sentry.captureException(integrationError);
        }
      }

    } catch (error: any) {
      Sentry.captureException(error);
      logger.error(`[UAZApi] Error processing message: ${error.message}`, error.stack);
    }
  }

  // Handler para atualizações de status de mensagem
  static async handleMessageUpdateEvent(
    whatsapp: Whatsapp,
    data: any,
    io: any
  ): Promise<void> {
    try {
      const eventData = data.event || data;
      const eventType = eventData.Type || data.type || data.state;
      
      // Tratar evento FileDownloaded - atualizar mensagem com mídia
      if (eventType === "FileDownloaded" || data.type === "FileDownloadedMessage") {
        await this.handleFileDownloadedEvent(whatsapp, data, io);
        return;
      }
      
      // A estrutura pode variar: data.id, data.messageId, data.message.id, event.MessageIDs
      let messageId = data.id || data.messageId || data.message?.id;
      
      // Para eventos com MessageIDs array
      if (!messageId && eventData.MessageIDs && eventData.MessageIDs.length > 0) {
        messageId = eventData.MessageIDs[0];
      }

      if (!messageId) {
        logger.warn(`[UAZApi] Message update event without messageId:`);
        return;
      }

      const status = data.status || data.message?.status || eventData.Type;

      // Mapear status da UAZApi para ACK interno
      // UAZApi: pending, sent, delivered, read, failed
      let ack = 0;
      switch (status) {
        case "pending":
          ack = 0;
          break;
        case "sent":
          ack = 1;
          break;
        case "delivered":
          ack = 2;
          break;
        case "read":
          ack = 3;
          break;
        case "played":
          ack = 4;
          break;
        case "failed":
          ack = -1;
          break;
        default:
          // Não logar warning para tipos conhecidos que não são status
          if (!["FileDownloaded", "FileDownloadedMessage"].includes(status)) {
            logger.warn(`[UAZApi] Unknown status: ${status}`);
          }
      }

      // Atualizar mensagem no banco usando wid (WhatsApp ID)
      // Tentar com o messageId completo ou apenas a parte final
      const widVariants = [
        messageId,
        messageId.includes(":") ? messageId.split(":").pop() : null,
        `%${messageId}%`
      ].filter(Boolean);
      
      let updateCount = 0;
      for (const wid of widVariants) {
        if (wid?.includes("%")) {
          // Busca com LIKE
          const msg = await Message.findOne({
            where: { 
              wid: { [Op.like]: wid },
              companyId: whatsapp.companyId 
            }
          });
          if (msg) {
            await msg.update({ ack });
            updateCount = 1;
            break;
          }
        } else {
          const [count] = await Message.update(
            { ack },
            { where: { wid, companyId: whatsapp.companyId } }
          );
          if (count > 0) {
            updateCount = count;
            break;
          }
        }
      }

      if (updateCount === 0) {
        logger.warn(`[UAZApi] Message with wid ${messageId} not found for update`);
      }

      // Buscar mensagem atualizada para emitir via socket
      const message = await Message.findOne({
        where: { 
          [Op.or]: widVariants.filter(w => !w?.includes("%")).map(w => ({ wid: w })),
          companyId: whatsapp.companyId 
        }
      });

      if (message) {
        io.of(String(whatsapp.companyId))
          .emit(`company-${whatsapp.companyId}-appMessage`, {
            action: "update",
            message,
          });
      }

      logger.info(`[UAZApi] Message ${messageId} status updated to ${status} (ack=${ack})`);
    } catch (error: any) {
      Sentry.captureException(error);
      logger.error(`[UAZApi] Error updating message status: ${error.message}`, error.stack);
    }
  }
  
  // Handler para evento FileDownloaded - baixar e atualizar mídia na mensagem
  static async handleFileDownloadedEvent(
    whatsapp: Whatsapp,
    data: any,
    io: any
  ): Promise<void> {
    try {
      const eventData = data.event || data;
      const fileUrl = eventData.FileURL || eventData.fileUrl || data.FileURL;
      const mimeType = eventData.MimeType || eventData.mimeType || "";
      const messageIds = eventData.MessageIDs || [];
      const chatId = eventData.Chat || "";
      
      if (!fileUrl || messageIds.length === 0) {
        logger.warn(`[UAZApi] FileDownloaded event missing fileUrl or messageIds`);
        return;
      }
      
      const messageId = messageIds[0];
      logger.info(`[UAZApi] Processing FileDownloaded for message ${messageId}, URL: ${fileUrl.substring(0, 50)}...`);
      
      // Determinar extensão baseada no mimeType
      let extension = ".bin";
      if (mimeType.includes("jpeg") || mimeType.includes("jpg")) extension = ".jpg";
      else if (mimeType.includes("png")) extension = ".png";
      else if (mimeType.includes("gif")) extension = ".gif";
      else if (mimeType.includes("webp")) extension = ".webp";
      else if (mimeType.includes("mp4")) extension = ".mp4";
      else if (mimeType.includes("ogg") || mimeType.includes("opus")) extension = ".ogg";
      else if (mimeType.includes("mp3") || mimeType.includes("mpeg")) extension = ".mp3";
      else if (mimeType.includes("pdf")) extension = ".pdf";
      
      // Determinar mediaType
      let mediaType = "document";
      if (mimeType.includes("image")) mediaType = "image";
      else if (mimeType.includes("video")) mediaType = "video";
      else if (mimeType.includes("audio") || mimeType.includes("ogg")) mediaType = "audio";
      
      // Criar pasta para mídias (mesmo local que o Baileys usa)
      const publicFolder = path.resolve(__dirname, "..", "..", "..", "public");
      const mediaFolder = path.resolve(publicFolder, `company${whatsapp.companyId}`);
      
      if (!fs.existsSync(mediaFolder)) {
        fs.mkdirSync(mediaFolder, { recursive: true });
        fs.chmodSync(mediaFolder, 0o777);
      }
      
      // Baixar arquivo
      const safeMessageId = messageId.replace(/[^a-zA-Z0-9]/g, "_");
      const mediaFileName = `${safeMessageId}_${Date.now()}${extension}`;
      const mediaPath = join(mediaFolder, mediaFileName);
      
      try {
        const response = await axios.get(fileUrl, {
          responseType: "arraybuffer",
          timeout: 60000
        });
        
        fs.writeFileSync(mediaPath, response.data);
        fs.chmodSync(mediaPath, 0o666);
        
        logger.info(`[UAZApi] FileDownloaded: saved ${mediaFileName} (${response.data.length} bytes)`);
        
        // Buscar e atualizar a mensagem existente
        // Tentar encontrar pelo messageId completo ou parcial
        const widVariants = [
          messageId,
          `${whatsapp.number}:${messageId}`,
          `%${messageId}%`
        ];
        
        let message: Message | null = null;
        
        for (const wid of widVariants) {
          if (wid.includes("%")) {
            message = await Message.findOne({
              where: {
                wid: { [Op.like]: wid },
                companyId: whatsapp.companyId
              },
              include: [{ model: Ticket, as: "ticket" }]
            });
          } else {
            message = await Message.findOne({
              where: { wid, companyId: whatsapp.companyId },
              include: [{ model: Ticket, as: "ticket" }]
            });
          }
          if (message) break;
        }
        
        if (message) {
          const messageId = message.id;
          
          // Atualizar mensagem existente com a mídia
          await message.update({
            mediaUrl: mediaFileName,
            mediaType: mediaType
          });
          
          // Buscar a mensagem atualizada com ticket incluído para o frontend
          const updatedMessage = await Message.findByPk(messageId, {
            include: [
              { model: Ticket, as: "ticket" },
              { model: Contact, as: "contact" }
            ]
          });
          
          logger.info(`[UAZApi] Updated message ${messageId} with media: ${mediaFileName}`);
          
          // Emitir atualização via socket para o frontend atualizar em tempo real
          if (updatedMessage) {
            logger.info(`[UAZApi] Emitting update - ticket uuid: ${updatedMessage.ticket?.uuid}, mediaUrl: ${updatedMessage.mediaUrl}`);
            io.of(String(whatsapp.companyId))
              .emit(`company-${whatsapp.companyId}-appMessage`, {
                action: "update",
                message: updatedMessage,
              });
            logger.info(`[UAZApi] Emitted update event for message ${messageId}`);
          }
        } else {
          logger.warn(`[UAZApi] Message not found for FileDownloaded event: ${messageId}`);
          
          // Se não encontrou a mensagem, pode ser que ela ainda não foi criada
          // Vamos criar uma nova mensagem com a mídia
          const contactNumber = getContactNumber(chatId);
          if (contactNumber) {
            const contact = await Contact.findOne({
              where: { number: contactNumber, companyId: whatsapp.companyId }
            });
            
            if (contact) {
              const ticket = await findOrCreateTicket(contact, whatsapp, whatsapp.companyId);
              
              const msgData = {
                wid: messageId,
                ticketId: ticket.id,
                contactId: contact.id,
                body: `📎 ${mediaType}`,
                fromMe: false,
                mediaType: mediaType,
                mediaUrl: mediaFileName,
                read: false,
                ack: 0,
              };
              
              await CreateMessageService({
                messageData: msgData,
                companyId: whatsapp.companyId,
              });
              
              logger.info(`[UAZApi] Created new message with media from FileDownloaded: ${mediaFileName}`);
            }
          }
        }
      } catch (downloadErr: any) {
        logger.error(`[UAZApi] Error downloading file from ${fileUrl}: ${downloadErr.message}`);
      }
    } catch (error: any) {
      Sentry.captureException(error);
      logger.error(`[UAZApi] Error handling FileDownloaded: ${error.message}`, error.stack);
    }
  }
}

