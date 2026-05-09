import * as Sentry from "@sentry/node";
import logger from "../../utils/logger";
import Whatsapp from "../../models/Whatsapp";
import Ticket from "../../models/Ticket";
import Contact from "../../models/Contact";
import { getOrInitNotificameHub } from "../../libs/notificamehub";
import formatBody from "../../helpers/Mustache";
import fs from "fs";
import path from "path";

interface Request {
  media: Express.Multer.File;
  ticket: Ticket;
  body?: string;
  isPrivate?: boolean;
  isForwarded?: boolean;
}

const SendNotificameHubMedia = async ({
  media,
  ticket,
  body,
  isPrivate = false,
  isForwarded = false
}: Request): Promise<any> => {
  try {
    logger.info(`[NotificameHub] FINAL - Sending media to ticket ${ticket.id}`);
    logger.info(`[NotificameHub] FINAL - Media object: ${JSON.stringify({
      filename: media.filename,
      originalname: media.originalname,
      path: media.path,
      mimetype: media.mimetype,
      size: media.size
    })}`);

    const whatsapp = await Whatsapp.findByPk(ticket.whatsappId);
    if (!whatsapp) {
      throw new Error("WhatsApp connection not found");
    }

    if (!whatsapp.notificamehubToken || !whatsapp.notificamehubChannelId) {
      throw new Error("NotificameHub token or channel ID not configured");
    }

    logger.info(`[NotificameHub] FINAL - Using token from Whatsapp table`);

    const contact = await Contact.findByPk(ticket.contactId);
    if (!contact) {
      throw new Error("Contact not found");
    }

    const notificameHub = await getOrInitNotificameHub(whatsapp.id);

    // Determinar tipo de mídia baseado no mimetype
    let mediaType: "image" | "video" | "audio" | "document" = "document";
    const mimeType = media.mimetype || "";

    if (mimeType.includes("image")) {
      mediaType = "image";
    } else if (mimeType.includes("video")) {
      mediaType = "video";
    } else if (mimeType.includes("audio")) {
      mediaType = "audio";
    }

    logger.info(`[NotificameHub] FINAL - Detected mediaType: ${mediaType} from mimeType: ${mimeType}`);

    // Ler o arquivo
    const mediaPath = media.path || media.filename;
    logger.info(`[NotificameHub] FINAL - Media path received: ${mediaPath}`);
    
    if (!mediaPath) {
      throw new Error("Media path not provided");
    }

    if (!fs.existsSync(mediaPath)) {
      throw new Error(`Media file not found at path: ${mediaPath}`);
    }

    const mediaBuffer = fs.readFileSync(mediaPath);
    const mediaBase64 = mediaBuffer.toString('base64');
    const dataUrl = `data:${mimeType};base64,${mediaBase64}`;

    logger.info(`[NotificameHub] FINAL - Media prepared: type=${mediaType}, size=${mediaBuffer.length} bytes, mimeType=${mimeType}`);
    logger.info(`[NotificameHub] FINAL - DataURL length: ${dataUrl.length} chars`);

    const caption = body ? formatBody(body, ticket) : undefined;

    // Enviar usando o método sendFile do SDK
    logger.info(`[NotificameHub] FINAL - Calling sendFile with contact: ${contact.number}, mediaType: ${mediaType}`);
    
    const response = await notificameHub.sendFile(
      contact.number,
      dataUrl,
      mediaType as "audio" | "image" | "video" | "document",
      caption
    );

    logger.info(`[NotificameHub] FINAL - Media sent successfully: ${response.id}`);

    const messageBody = body ? formatBody(body, ticket) : `📎 ${media.originalname || media.filename}`;
    
    await ticket.update({
      lastMessage: messageBody,
      imported: null
    });

    return {
      id: response.id,
      status: "sent",
      timestamp: new Date().toISOString(),
      mediaType,
      fileName: media.originalname || media.filename
    };

  } catch (error: any) {
    Sentry.captureException(error);
    logger.error(`[NotificameHub] FINAL - Error sending media: ${error.message}`);
    throw new Error(`NotificameHub media send error: ${error.message}`);
  }
};

export default SendNotificameHubMedia;