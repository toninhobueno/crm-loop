import { WAMessage } from "baileys";
import delay from "../../utils/delay";
import * as Sentry from "@sentry/node";
import AppError from "../../errors/AppError";
import GetTicketWbot from "../../helpers/GetTicketWbot";
import Message from "../../models/Message";
import Ticket from "../../models/Ticket";
import Contact from "../../models/Contact";
import Whatsapp from "../../models/Whatsapp";
import { isNil } from "lodash";

import formatBody from "../../helpers/Mustache";
import logger from "../../utils/logger";
import { ENABLE_LID_DEBUG } from "../../config/debug";
import { normalizeJid } from "../../utils";

// Import UAZApi para redirecionamento
import SendUAZApiMessage from "../UAZApi/SendUAZApiMessage";
// Import NotificameHub para redirecionamento
import SendNotificameHubMessage from "../NotificameHub/SendNotificameHubMessage";

interface Request {
  body: string;
  ticket: Ticket;
  quotedMsg?: Message;
  msdelay?: number;
  vCard?: Contact;
  isForwarded?: boolean;
}

const SendWhatsAppMessage = async ({
  body,
  ticket,
  quotedMsg,
  msdelay,
  vCard,
  isForwarded = false
}: Request): Promise<WAMessage> => {

  // VERIFICAR PROVIDER - Se for UAZApi ou NotificameHub, redirecionar
  try {
    const whatsapp = await Whatsapp.findByPk(ticket.whatsappId);
    if (whatsapp?.provider === "uazapi") {
      logger.info(`[SendWhatsAppMessage] Redirecting to UAZApi for whatsappId ${ticket.whatsappId}`);
      return await SendUAZApiMessage({ body, ticket, quotedMsg, msdelay, vCard, isForwarded }) as any;
    }
    if (whatsapp?.provider === "notificamehub") {
      logger.info(`[SendWhatsAppMessage] Redirecting to NotificameHub for whatsappId ${ticket.whatsappId}`);
      return await SendNotificameHubMessage({ body, ticket, quotedMsg, msdelay, vCard, isForwarded }) as any;
    }
  } catch (providerError: any) {
    logger.warn(`[SendWhatsAppMessage] Error checking provider: ${providerError.message}`);
  }

  // BAILEYS - Código original
  let options = {};
  let mentions: string[] = [];
  let currMentions: string[] = [];

  const wbot = await GetTicketWbot(ticket);
  const contactNumber = await Contact.findByPk(ticket.contactId);
  if (!contactNumber) {
    throw new AppError("Contato do ticket não encontrado");
  }

  // Sempre envie para o JID tradicional
  let jid = `${contactNumber.number}@${ticket.isGroup ? "g.us" : "s.whatsapp.net"}`;
  jid = normalizeJid(jid);

  if (ENABLE_LID_DEBUG) {
    logger.info(
      `[RDS-LID] SendMessage - Enviando para JID tradicional: ${jid}`
    );
    logger.info(`[RDS-LID] SendMessage - Contact lid: ${contactNumber.lid}`);
    logger.info(
      `[RDS-LID] SendMessage - Contact remoteJid: ${contactNumber.remoteJid}`
    );
    logger.info(
      `[RDS-LID] SendMessage - QuotedMsg: ${quotedMsg ? "SIM" : "NÃO"}`
    );
  }

  if (quotedMsg) {
    // quotedMsg pode vir como objeto ou apenas um id/string
    const quotedId: any = (quotedMsg as any)?.id ?? quotedMsg;
    let chatMessages: Message | null = null;
    if (quotedId !== undefined && quotedId !== null && String(quotedId).trim() !== "") {
      chatMessages = await Message.findOne({
        where: {
          id: quotedId
        }
      });
    }

    if (chatMessages) {
      const msgFound = JSON.parse(chatMessages.dataJson);

      if (msgFound.message.extendedTextMessage !== undefined) {
        options = {
          quoted: {
            key: msgFound.key,
            message: {
              extendedTextMessage: msgFound.message.extendedTextMessage
            }
          }
        };
      } else {
        options = {
          quoted: {
            key: msgFound.key,
            message: {
              conversation: msgFound.message.conversation
            }
          }
        };
      }

      if (ENABLE_LID_DEBUG) {
        logger.info(
          `[RDS-LID] SendMessage - ContextInfo configurado para resposta`
        );
      }
    }
  }

  // GHOST MENTIONS
  let allMentions = body ? body.indexOf("@all") : -1;
  if (ticket.isGroup && allMentions > 0) {

    // Obtendo os dados do grupo e os participantes
    const groupMetadata = await wbot.groupMetadata(`${ticket.contact.number}@g.us`);
    const botJid = wbot.user.id.split(":")[0] + "@s.whatsapp.net"; // ID do bot
    const participants = groupMetadata.participants
      .filter((participant) => participant.id !== botJid)
      .map(({ id }) => id); // Filtrando os participantes e retirando o bot

    currMentions = participants.map((mention: any) => {
      const jid = mention;
      return jid;
    })

    const bodyMessage = body ? body.replace('@all ', '') : ''

    // send a ghost mentions message
    const sentMessage = await wbot.sendMessage(jid, { text: bodyMessage, mentions: currMentions })

    await ticket.update({ lastMessage: formatBody(body, ticket) });
    wbot.store(sentMessage);
    return sentMessage;
  };

  if (!isNil(vCard)) {
    const numberContact = vCard.number;
    const firstName = vCard.name.split(" ")[0];
    const lastName = String(vCard.name).replace(vCard.name.split(" ")[0], "");

    const vcard =
      `BEGIN:VCARD\n` +
      `VERSION:3.0\n` +
      `N:${lastName};${firstName};;;\n` +
      `FN:${vCard.name}\n` +
      `TEL;type=CELL;waid=${numberContact}:+${numberContact}\n` +
      `END:VCARD`;

    try {
      await delay(msdelay);
      const sentMessage = await wbot.sendMessage(jid, {
        contacts: {
          displayName: `${vCard.name}`,
          contacts: [{ vcard }]
        }
      });

      wbot.store(sentMessage);

      await ticket.update({
        lastMessage: formatBody(vcard, ticket),
        imported: null
      });

      // Log detalhado de vCard enviado com sucesso
      logger.info(
        `[RDS-BAILEYS] vCard enviado com sucesso para contato ID=${contactNumber.id}, number=${contactNumber.number}, jid=${jid}`
      );

      return sentMessage;
    } catch (err) {
      // Log detalhado do erro de envio de vCard
      logger.error(
        `[RDS-BAILEYS] ERRO ao enviar vCard para contato ID=${contactNumber.id}, number=${contactNumber.number}, jid=${jid}: ${err.message}`
      );

      Sentry.captureException(err);
      console.log(err);
      throw new AppError("ERR_SENDING_WAPP_MSG");
    }
  };
  
  try {
    await delay(msdelay);
    const sentMessage = await wbot.sendMessage(
      jid,
      {
        text: formatBody(body, ticket),
        contextInfo: {
          forwardingScore: isForwarded ? 2 : 0,
          isForwarded: isForwarded ? true : false
        }
      },
      {
        ...options,

      }
    );
    wbot.store(sentMessage);

    await ticket.update({
      lastMessage: formatBody(body, ticket),
      imported: null
    });

    // Log detalhado de mensagem enviada com sucesso
    logger.info(
      `[RDS-BAILEYS] Mensagem enviada com sucesso para contato ID=${contactNumber.id}, number=${contactNumber.number}, jid=${jid}`
    );

    return sentMessage;
  } catch (err) {
    // Log detalhado do erro de envio para facilitar diagnóstico
    logger.error(
      `[RDS-BAILEYS] ERRO ao enviar mensagem para contato ID=${contactNumber.id}, number=${contactNumber.number}, jid=${jid}: ${err.message}`
    );

    console.log(
      `erro ao enviar mensagem na company ${ticket.companyId} - `,
      body,
      ticket,
      quotedMsg,
      msdelay,
      vCard,
      isForwarded
    );

    if (ENABLE_LID_DEBUG) {
      logger.error(`[RDS-LID] Erro ao enviar mensagem para ${jid}: ${err.message}`);

      if (contactNumber.number?.includes("@lid")) {
        logger.error(`[RDS-LID] Contato com formato @lid detectado: ${contactNumber.number}`);

        try {
          const parts = contactNumber.number.split('@');
          if (parts.length > 0 && /^\d+$/.test(parts[0])) {
            const correctNumber = parts[0];
            logger.info(`[RDS-LID] Tentando corrigir número: ${contactNumber.number} -> ${correctNumber}`);

            await contactNumber.update({
              number: correctNumber,
              remoteJid: `${correctNumber}@s.whatsapp.net`
            });

            logger.info(`[RDS-LID] Contato atualizado com sucesso: ${correctNumber}`);
          }
        } catch (updateError) {
          logger.error(`[RDS-LID] Erro ao atualizar contato: ${updateError.message}`);
        }
      }
    }

    if (err.message && err.message.includes("senderMessageKeys")) {
      if (ENABLE_LID_DEBUG) {
        logger.error(
          `[RDS-LID] SendMessage - Erro de criptografia de grupo detectado: ${err.message}`
        );
      }

      try {
        if (ENABLE_LID_DEBUG) {
          logger.info(
            `[RDS-LID] SendMessage - Tentando envio sem criptografia para grupo ${jid}`
          );
        }

        const sentMessage = await wbot.sendMessage(jid, {
          text: formatBody(body, ticket)
        });

        if (ENABLE_LID_DEBUG) {
          logger.info(
            `[RDS-LID] SendMessage - Sucesso no envio sem criptografia para grupo ${jid}`
          );
        }
        wbot.store(sentMessage);
        await ticket.update({
          lastMessage: formatBody(body, ticket),
          imported: null
        });

        // Log detalhado de mensagem enviada com sucesso após retry (problema de criptografia)
        logger.info(
          `[RDS-BAILEYS] Mensagem enviada com sucesso após retry para contato ID=${contactNumber.id}, number=${contactNumber.number}, jid=${jid} (problema de criptografia resolvido)`
        );

        return sentMessage;
      } catch (finalErr) {
        if (ENABLE_LID_DEBUG) {
          logger.error(
            `[RDS-LID] SendMessage - Falha no envio sem criptografia: ${finalErr.message}`
          );
        }
        Sentry.captureException(finalErr);
        throw new AppError("ERR_SENDING_WAPP_MSG_GROUP_CRYPTO");
      }
    }

    Sentry.captureException(err);
    console.log(err);
    throw new AppError("ERR_SENDING_WAPP_MSG");
  }
};

export default SendWhatsAppMessage;
