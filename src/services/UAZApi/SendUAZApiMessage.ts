import * as Sentry from "@sentry/node";
import AppError from "../../errors/AppError";
import Message from "../../models/Message";
import Ticket from "../../models/Ticket";
import Contact from "../../models/Contact";
import formatBody from "../../helpers/Mustache";
import { getUAZApi } from "../../libs/uazapi";
import logger from "../../utils/logger";
import CreateMessageService from "../MessageServices/CreateMessageService";

// Função delay personalizada para substituir a do baileys
const delay = (ms: number): Promise<void> => {
  return new Promise(resolve => setTimeout(resolve, ms));
};

interface Request {
  body: string;
  ticket: Ticket;
  quotedMsg?: Message;
  msdelay?: number;
  vCard?: string | Contact;
  isForwarded?: boolean;
}

const SendUAZApiMessage = async ({
  body,
  ticket,
  quotedMsg,
  msdelay,
  vCard,
  isForwarded = false
}: Request): Promise<any> => {
  try {
    logger.info(`[UAZApi] SendUAZApiMessage: Getting session for whatsappId ${ticket.whatsappId}`);
    const uazapi = getUAZApi(ticket.whatsappId);

    logger.info(`[UAZApi] SendUAZApiMessage: Session found, instanceToken: ***${uazapi.instanceToken?.slice(-4) || 'NONE'}`);

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
      number = `${contactNumber.number}`;
    }

    logger.info(`[UAZApi] SendUAZApiMessage: Sending to ${isGroup ? 'group' : 'contact'} ${number}, hasVCard: ${!!vCard}`);

    if (msdelay) {
      await delay(msdelay);
    }

    // Verificar se é envio de vCard (contato)
    if (vCard) {
      let vCardString: string = "";
      
      // Se vCard é um objeto Contact, converter para string
      if (typeof vCard === 'object' && 'number' in vCard) {
        const contactObj = vCard as Contact;
        vCardString = `BEGIN:VCARD\nVERSION:3.0\nFN:${contactObj.name || 'Contato'}\nTEL:${contactObj.number || ''}\nEND:VCARD`;
      } else if (typeof vCard === 'string') {
        vCardString = vCard;
      }

      if (vCardString.length > 0) {
        logger.info(`[UAZApi] SendUAZApiMessage: Sending vCard`);

        // Extrair informações do vCard
        const fnMatch = vCardString.match(/FN[;:]([^\n\r]+)/i);
        const telMatch = vCardString.match(/TEL[^:]*:([^\n\r]+)/i);
        const orgMatch = vCardString.match(/ORG[;:]([^\n\r]+)/i);
        const emailMatch = vCardString.match(/EMAIL[^:]*:([^\n\r]+)/i);

        const fullName = fnMatch ? fnMatch[1].trim() : "Contato";
        const phoneNumber = telMatch ? telMatch[1].replace(/\D/g, "") : number;
        const organization = orgMatch ? orgMatch[1].trim() : undefined;
        const email = emailMatch ? emailMatch[1].trim() : undefined;

        const sentMessage = await uazapi.sendContact(
          number,
          fullName,
          phoneNumber,
          organization,
          email
        );

        logger.info(`[UAZApi] SendUAZApiMessage: vCard sent successfully`);

        // Criar mensagem no banco
        const messageId = (sentMessage as any)?.key?.id || (sentMessage as any)?.id || `UAZAPI_${Date.now()}`;
        const messageData = {
          wid: messageId,
          ticketId: ticket.id,
          contactId: undefined,
          body: fullName,
          fromMe: true,
          mediaType: 'contactMessage',
          read: true,
          quotedMsgId: quotedMsg?.id || null,
          ack: 2,
          remoteJid: contactNumber.remoteJid,
          participant: null,
          dataJson: JSON.stringify(sentMessage),
          ticketTrakingId: null,
          isPrivate: false
        };

        await CreateMessageService({ messageData, companyId: ticket.companyId });
        await ticket.update({ lastMessage: fullName });

        return sentMessage;
      }
    }

    // Garantir que body é string antes de formatar
    let messageBody = typeof body === 'string' ? body : String(body || '');

    // Só aplicar formatBody se tiver template válido
    if (messageBody && ticket) {
      try {
        messageBody = formatBody(messageBody, ticket);
      } catch (formatError) {
        logger.warn(`[UAZApi] Error formatting body: ${formatError}`);
      }
    }

    let sentMessage;

    // Se tiver quotedMsg, enviar com citação (reply)
    if (quotedMsg) {
      logger.info(`[UAZApi] SendUAZApiMessage: Attempting to send reply. quotedMsg.id: ${quotedMsg.id}`);

      const quotedMessage = await Message.findOne({
        where: { id: quotedMsg.id }
      });

      if (quotedMessage && quotedMessage.wid) {
        logger.info(`[UAZApi] SendUAZApiMessage: Found quoted message. wid: ${quotedMessage.wid}`);
        sentMessage = await uazapi.sendTextMessageWithQuote(number, messageBody, quotedMessage.wid);
        logger.info(`[UAZApi] SendUAZApiMessage: Reply sent successfully`);
      } else {
        logger.warn(`[UAZApi] SendUAZApiMessage: Quoted message not found or wid is empty. Sending without quote.`);
        sentMessage = await uazapi.sendTextMessage(number, messageBody);
        logger.info(`[UAZApi] SendUAZApiMessage: Message sent successfully (without quote)`);
      }
    } else {
      sentMessage = await uazapi.sendTextMessage(number, messageBody);
      logger.info(`[UAZApi] SendUAZApiMessage: Message sent successfully`);
    }

    // Criar mensagem no banco de dados
    const messageId = (sentMessage as any)?.key?.id || (sentMessage as any)?.id || `UAZAPI_${Date.now()}`;
    const messageData = {
      wid: messageId,
      ticketId: ticket.id,
      contactId: undefined,
      body: messageBody,
      fromMe: true,
      mediaType: 'conversation',
      read: true,
      quotedMsgId: quotedMsg?.id || null,
      ack: 2,
      remoteJid: contactNumber.remoteJid,
      participant: null,
      dataJson: JSON.stringify(sentMessage),
      ticketTrakingId: null,
      isPrivate: false
    };

    await CreateMessageService({ messageData, companyId: ticket.companyId });
    await ticket.update({ lastMessage: messageBody });

    return sentMessage;
  } catch (err: any) {
    Sentry.captureException(err);
    logger.error(`[UAZApi] Error sending message: ${err.message || err}`);

    // Verificar se é erro de token inválido
    if (err.response?.status === 403 || err.message?.includes("Invalid token")) {
      logger.error("[UAZApi] Token is invalid or expired. Session may need to be restarted.");
      throw new AppError("ERR_UAZAPI_TOKEN_INVALID");
    }

    throw new AppError("ERR_SENDING_UAZAPI_MSG");
  }
};

export default SendUAZApiMessage;

