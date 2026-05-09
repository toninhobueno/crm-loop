import fs from "fs";
import path from "path";
import mime from "mime-types";
import Whatsapp from "../models/Whatsapp";
import GetWhatsappWbot from "./GetWhatsappWbot";
import formatBody from "./Mustache";
import logger from "../utils/logger";
import { getMessageOptions } from "../services/WbotServices/SendWhatsAppMedia";
import { getUAZApi } from "../libs/uazapi";

export type MessageData = {
  number: number | string;
  body: string;
  mediaPath?: string;
  companyId?: number;
  mediaName?: string;
  ticketId?: number;
  contactId?: number;
};

// Helper to get UAZApi media type
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

export const SendMessage = async (
  whatsapp: Whatsapp,
  messageData: MessageData,
  isGroup: boolean = false
): Promise<any> => {
  try {
    // Resolve companyId upfront
    const resolvedCompanyId = messageData?.companyId || whatsapp.companyId;
    const companyId = resolvedCompanyId ? resolvedCompanyId.toString() : null;

    // Check provider type
    const isUAZApi = whatsapp.provider === "uazapi";

    // UAZApi provider
    if (isUAZApi) {
      logger.info(`[SendMessage] Using UAZApi for whatsapp ${whatsapp.id}`);
      const uazapi = getUAZApi(whatsapp.id);

      if (messageData.mediaPath && fs.existsSync(messageData.mediaPath)) {
        const mimeType = mime.lookup(messageData.mediaPath) || "application/octet-stream";
        const mediaType = getUAZApiMediaType(mimeType as string);
        const mediaFileName = messageData.mediaName || path.basename(messageData.mediaPath);
        const fileBuffer = fs.readFileSync(messageData.mediaPath);
        const base64File = `data:${mimeType};base64,${fileBuffer.toString("base64")}`;

        const result = await uazapi.sendMediaMessage(
          String(messageData.number),
          base64File,
          mediaType,
          messageData.body || "",
          mediaFileName
        );
        logger.info(`[SendMessage] UAZApi media sent to ${messageData.number}`);

        // Salvar mensagem no banco se houver ticket
        if (messageData.ticketId) {
          const CreateMessageService = (await import("../services/MessageServices/CreateMessageService")).default;
          const messageId = (result as any)?.messageid || (result as any)?.id || `uazapi_media_${Date.now()}_${Math.floor(Math.random() * 1e6)}`;

          const msgData = {
            wid: messageId,
            ticketId: messageData.ticketId,
            contactId: messageData.contactId,
            body: messageData.body || mediaFileName,
            fromMe: true,
            read: true,
            mediaType: (mimeType as string).split("/")[0],
            mediaUrl: mediaFileName,
            ack: 2,
            remoteJid: `${messageData.number}@s.whatsapp.net`,
            participant: null,
            dataJson: null,
            ticketTrakingId: undefined,
            isPrivate: false
          };

          await CreateMessageService({ messageData: msgData, companyId: resolvedCompanyId });
          logger.info(`[SendMessage] UAZApi message saved to database for ticket ${messageData.ticketId}`);
        }

        return result;
      } else {
        const body = formatBody(`${messageData.body}`);
        const result = await uazapi.sendTextMessage(String(messageData.number), body);
        logger.info(`[SendMessage] UAZApi text message sent to ${messageData.number}`);
        return result;
      }
    }

    // Baileys (default)
    const wbot = await GetWhatsappWbot(whatsapp);
    const chatId = `${messageData.number}@${!!isGroup ? 'g.us' : 's.whatsapp.net'}`;

    let message;

    if (messageData.mediaPath && companyId) {
      const options = await getMessageOptions(
        messageData.mediaName || "",
        messageData.mediaPath,
        companyId,
        messageData.body,
      );
      if (options) {
        message = await wbot.sendMessage(chatId, {
          ...options
        });
      }
    } else {
      const body = formatBody(`${messageData.body}`);
      message = await wbot.sendMessage(chatId, { text: body });
    }

    return message;
  } catch (err: any) {
    logger.error(`[SendMessage] Error: ${err.message}`);
    throw new Error(err);
  }
};
