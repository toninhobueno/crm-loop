import * as Sentry from "@sentry/node";
import logger from "../../utils/logger";
import Whatsapp from "../../models/Whatsapp";
import Message from "../../models/Message";
import Ticket from "../../models/Ticket";
import Contact from "../../models/Contact";
import { getOrInitNotificameHub } from "../../libs/notificamehub";
import formatBody from "../../helpers/Mustache";

interface Request {
  body: string;
  ticket: Ticket;
  quotedMsg?: Message;
  msdelay?: number;
  vCard?: Contact;
  isForwarded?: boolean;
}

const SendNotificameHubMessage = async ({
  body,
  ticket,
  quotedMsg,
  msdelay,
  vCard,
  isForwarded = false
}: Request): Promise<any> => {
  try {
    logger.info(`[NotificameHub] FINAL - Sending message to ticket ${ticket.id}`);

    const whatsapp = await Whatsapp.findByPk(ticket.whatsappId);
    if (!whatsapp) {
      throw new Error("WhatsApp connection not found");
    }

    if (!whatsapp.notificamehubToken || !whatsapp.notificamehubChannelId) {
      throw new Error("NotificameHub token or channel ID not configured");
    }

    const contact = await Contact.findByPk(ticket.contactId);
    if (!contact) {
      throw new Error("Contact not found");
    }

    const notificameHub = await getOrInitNotificameHub(whatsapp.id);

    let messageBody = formatBody(body, ticket);

    // Se for vCard, enviar como contato
    if (vCard) {
      const numberContact = vCard.number;
      const firstName = vCard.name.split(" ")[0];
      const lastName = String(vCard.name).replace(vCard.name.split(" ")[0], "");

      const contactData = {
        name: {
          formatted_name: vCard.name,
          first_name: firstName,
          last_name: lastName
        },
        phones: [{
          phone: `+${numberContact}`,
          type: "CELL",
          wa_id: numberContact
        }]
      };

      const response = await notificameHub.sendContacts(contact.number, [contactData]);

      logger.info(`[NotificameHub] FINAL - vCard sent successfully: ${response.id}`);
      
      await ticket.update({
        lastMessage: formatBody(messageBody, ticket),
        imported: null
      });

      return {
        id: response.id,
        status: "sent",
        timestamp: new Date().toISOString()
      };
    }

    // Mensagem de texto normal
    const response = await notificameHub.sendText(contact.number, messageBody);

    logger.info(`[NotificameHub] FINAL - Message sent successfully: ${response.id}`);

    await ticket.update({
      lastMessage: formatBody(messageBody, ticket),
      imported: null
    });

    return {
      id: response.id,
      status: "sent",
      timestamp: new Date().toISOString()
    };

  } catch (error: any) {
    Sentry.captureException(error);
    logger.error(`[NotificameHub] FINAL - Error sending message: ${error.message}`);
    throw new Error(`NotificameHub send error: ${error.message}`);
  }
};

export default SendNotificameHubMessage;