import * as Sentry from "@sentry/node";
import fs from "fs";
import path from "path";
import mime from "mime-types";

import AppError from "../../errors/AppError";
import Ticket from "../../models/Ticket";
import Contact from "../../models/Contact";
import { getUAZApi } from "../../libs/uazapi";
import CreateMessageService from "../MessageServices/CreateMessageService";
import formatBody from "../../helpers/Mustache";
import logger from "../../utils/logger";

interface Request {
  media: Express.Multer.File;
  ticket: Ticket;
  companyId?: number;
  body?: string;
  isPrivate?: boolean;
  isForwarded?: boolean;
}

const publicFolder = path.resolve(__dirname, "..", "..", "..", "public");

// Mapear mimetype para tipo de mídia da UAZApi
const getUAZApiMediaType = (mimeType: string): string => {
  const type = mimeType.split("/")[0];
  const subtype = mimeType.split("/")[1];

  if (type === "image") {
    if (subtype === "webp") return "sticker";
    return "image";
  }
  if (type === "video") return "video";
  if (type === "audio") {
    if (mimeType.includes("ogg") || mimeType.includes("opus")) {
      return "ptt";
    }
    return "audio";
  }
  return "document";
};

const SendUAZApiMedia = async ({
  media,
  ticket,
  body = "",
  isPrivate = false,
  isForwarded = false
}: Request): Promise<any> => {
  try {
    const uazapi = getUAZApi(ticket.whatsappId);
    const companyId = ticket.companyId.toString();

    logger.info(`[UAZApi] SendUAZApiMedia: Sending media to ticket ${ticket.id}`);

    const contactNumber = await Contact.findByPk(ticket.contactId);

    if (!contactNumber) {
      throw new AppError("ERR_CONTACT_NOT_FOUND");
    }

    let number: string;
    const isGroup = contactNumber.isGroup || contactNumber.remoteJid?.includes("@g.us");
    
    if (contactNumber.remoteJid && contactNumber.remoteJid !== "" && contactNumber.remoteJid.includes("@")) {
      // Para grupos, manter o ID completo (sem @g.us)
      // Para contatos, extrair apenas o número
      if (isGroup) {
        number = contactNumber.remoteJid.replace(/@g\.us$/, "");
      } else {
        number = contactNumber.remoteJid.split("@")[0];
      }
    } else {
      number = contactNumber.number;
    }
    
    logger.info(`[UAZApi] SendUAZApiMedia: Sending to ${isGroup ? 'group' : 'contact'} ${number}`);

    const pathMedia = media.path;
    const mimeType = media.mimetype;

    // Garantir que body é string antes de formatar
    let bodyMedia = typeof body === 'string' ? body : String(body || '');
    if (bodyMedia && ticket) {
      try {
        bodyMedia = formatBody(bodyMedia, ticket);
      } catch (formatError) {
        logger.warn(`[UAZApi] Error formatting body: ${formatError}`);
      }
    }

    // Determinar tipo de mídia para UAZApi
    const mediaType = getUAZApiMediaType(mimeType);

    logger.info(`[UAZApi] SendUAZApiMedia: Type=${mediaType}, MimeType=${mimeType}, File=${media.originalname}`);

    // Para mensagem privada, apenas salvar no banco
    if (isPrivate === true) {
      const messageData = {
        wid: `PVT${companyId}${ticket.id}${Date.now()}`,
        ticketId: ticket.id,
        contactId: undefined,
        body: bodyMedia,
        fromMe: true,
        mediaUrl: media.filename,
        mediaType: mimeType.split("/")[0],
        read: true,
        quotedMsgId: null,
        ack: 2,
        remoteJid: null,
        participant: null,
        dataJson: null,
        ticketTrakingId: null,
        isPrivate
      };

      await CreateMessageService({ messageData, companyId: ticket.companyId });
      return { id: messageData.wid };
    }

    // Ler arquivo e converter para base64
    const fileBuffer = fs.readFileSync(pathMedia);
    const base64File = `data:${mimeType};base64,${fileBuffer.toString("base64")}`;

    // Enviar mídia via UAZApi
    const sentMessage = await uazapi.sendMediaMessage(
      number,
      base64File,
      mediaType,
      bodyMedia,
      media.originalname
    );

    logger.info(`[UAZApi] SendUAZApiMedia: Message sent successfully`);

    // Determinar descrição do tipo de mídia
    let bodyTicket = "📎 Anexo";
    if (mediaType === "video") bodyTicket = "🎥 Vídeo";
    else if (mediaType === "audio" || mediaType === "ptt") bodyTicket = "🎵 Áudio";
    else if (mediaType === "image") bodyTicket = "📷 Imagem";
    else if (mediaType === "sticker") bodyTicket = "🎭 Sticker";
    else if (mediaType === "document") bodyTicket = "📂 Documento";

    // Criar mensagem no banco de dados
    const messageId = (sentMessage as any)?.key?.id || (sentMessage as any)?.id || `UAZAPI_${Date.now()}`;
    const messageData = {
      wid: messageId,
      ticketId: ticket.id,
      contactId: undefined,
      body: bodyMedia || bodyTicket,
      fromMe: true,
      mediaUrl: media.filename,
      mediaType: mimeType.split("/")[0],
      read: true,
      quotedMsgId: null,
      ack: 2,
      remoteJid: contactNumber.remoteJid,
      participant: null,
      dataJson: JSON.stringify(sentMessage),
      ticketTrakingId: null,
      isPrivate: false
    };

    await CreateMessageService({ messageData, companyId: ticket.companyId });

    // Atualizar última mensagem do ticket
    await ticket.update({
      lastMessage: bodyMedia || bodyTicket,
      imported: null
    });

    return sentMessage;
  } catch (err: any) {
    logger.error(`[UAZApi] SendUAZApiMedia Error: ${err.message}`);
    Sentry.captureException(err);
    console.log(err);
    throw new AppError("ERR_SENDING_UAZAPI_MEDIA");
  }
};

export default SendUAZApiMedia;

