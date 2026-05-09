import { writeFileSync } from "fs";
import fs from "fs";
import axios from "axios";
import moment from "moment";
import { join } from "path";
import Contact from "../../models/Contact";
import Ticket from "../../models/Ticket";
import CreateOrUpdateContactService from "../ContactServices/CreateOrUpdateContactService";
import CreateMessageService from "../MessageServices/CreateMessageService";
import FindOrCreateTicketService from "../TicketServices/FindOrCreateTicketService";
import { getProfile, profilePsid, sendText } from "./graphAPI";
import Whatsapp from "../../models/Whatsapp";
import UpdateTicketService from "../TicketServices/UpdateTicketService";
import { debounce } from "../../helpers/Debounce";
import ShowWhatsAppService from "../WhatsappService/ShowWhatsAppService";
import formatBody from "../../helpers/Mustache";
import Queue from "../../models/Queue";
import Chatbot from "../../models/Chatbot";
import Message from "../../models/Message";
import { sayChatbot } from "../WbotServices/ChatbotListenerFacebook";
import ListSettingsService from "../SettingServices/ListSettingsService";
import { isNil, isNull, head } from "lodash";
import FindOrCreateATicketTrakingService from "../TicketServices/FindOrCreateATicketTrakingService";
import { handleMessageIntegration, handleRating, verifyRating } from "../WbotServices/wbotMessageListener";
import CompaniesSettings from "../../models/CompaniesSettings";
import { sendFacebookMessage } from "./sendFacebookMessage";
import { Mutex } from "async-mutex";
import TicketTag from "../../models/TicketTag";
import Tag from "../../models/Tag";
import ShowQueueIntegrationService from "../QueueIntegrationServices/ShowQueueIntegrationService";
import { ActionsWebhookService } from "../WebhookService/ActionsWebhookService";
import { FlowBuilderModel } from "../../models/FlowBuilder";
import { FlowDefaultModel } from "../../models/FlowDefault";
import { FlowCampaignModel } from "../../models/FlowCampaign";
import { IConnections, INodes } from "../WebhookService/DispatchWebHookService";

import { differenceInMilliseconds } from "date-fns";
import { ActionsWebhookFacebookService } from "./WebhookFacebookServices/ActionsWebhookFacebookService";
import { get } from "http";
import { WebhookModel } from "../../models/Webhook";
import { is } from "bluebird";
import ShowTicketService from "../TicketServices/ShowTicketService";

interface IMe {
  name: string;
  // eslint-disable-next-line camelcase
  first_name: string;
  // eslint-disable-next-line camelcase
  last_name: string;
  // eslint-disable-next-line camelcase
  profile_pic: string;
  id: string;
}

export interface Root {
  object: string;
  entry: Entry[];
}

export interface Entry {
  id: string;
  time: number;
  messaging: Messaging[];
}

export interface Messaging {
  sender: Sender;
  recipient: Recipient;
  timestamp: number;
  message: MessageX;
}

export interface Sender {
  id: string;
}

export interface Recipient {
  id: string;
}

export interface MessageX {
  mid: string;
  text: string;
  reply_to: ReplyTo;
}

export interface ReplyTo {
  mid: string;
}

const verifyContact = async (msgContact: any, token: any, companyId: any) => {
  if (!msgContact) return null;

  let profilePicUrl = null;

  if (msgContact.profile_pic) {
    profilePicUrl = msgContact.profile_pic
  } else {
    profilePicUrl = `${process.env.FRONTEND_URL}/nopicture.png`;
  }

  const contactData = {
    name: msgContact?.name || `${msgContact?.first_name} ${msgContact?.last_name}`,
    number: msgContact.id,
    profilePicUrl,
    isGroup: false,
    companyId: companyId,
    channel: token.channel,
    whatsappId: token.id
  };

  const contact = CreateOrUpdateContactService(contactData);

  return contact;
};

export const verifyMessageFace = async (
  msg: any,
  body: any,
  ticket: Ticket,
  contact: Contact,
  fromMe: boolean = false
) => {
  const quotedMsg = await verifyQuotedMessage(msg);
  const messageData = {
    wid: msg?.mid || msg?.message_id,
    ticketId: ticket.id,
    contactId: fromMe ? undefined : msg?.is_echo ? undefined : contact.id,
    body: msg?.text || body,
    fromMe: fromMe ? fromMe : msg?.is_echo ? true : false,
    read: fromMe ? fromMe : msg?.is_echo,
    quotedMsgId: quotedMsg?.id,
    ack: 3,
    dataJson: JSON.stringify(msg),
    channel: ticket.channel
  };

  await CreateMessageService({ messageData, companyId: ticket.companyId });

  // Verificar e cancelar Floups se contato enviou mensagem e condições de parada estão ativas
  if (!fromMe && !msg?.is_echo && contact?.id) {
    try {
      const FloupService = (await import('../../plugins/floup/service')).default;
      await FloupService.verificarECancelarFloupsAoReceberMensagem(
        ticket.id,
        contact.id,
        ticket.companyId,
        msg?.text || body || ''
      );
    } catch (floupError) {
      // Log mas não interrompe o fluxo se houver erro na verificação de Floup
      console.warn(`[FLOUP] Erro ao verificar condições de parada (Facebook):`, floupError);
    }
  }

  // await ticket.update({
  //   lastMessage: msg.text
  // });
};

export const verifyMessageMedia = async (
  msg: any,
  ticket: Ticket,
  contact: Contact,
  fromMe: boolean = false
): Promise<void> => {
  const { data } = await axios.get(msg.attachments[0].payload.url, {
    responseType: "arraybuffer"
  });

  // eslint-disable-next-line no-eval
  const { fileTypeFromBuffer } = await (eval('import("file-type")') as Promise<typeof import("file-type")>);

  const type = await fileTypeFromBuffer(data);

  const fileName = `${new Date().getTime()}.${type.ext}`;

  const folder = `public/company${ticket.companyId}`;
  if (!fs.existsSync(folder)) {
    fs.mkdirSync(folder);
    fs.chmodSync(folder, 0o777)
  }

  writeFileSync(
    join(__dirname, "..", "..", "..", folder, fileName),
    data,
    "base64"
  );

  const messageData = {
    wid: msg.mid,
    ticketId: ticket.id,
    contactId: fromMe ? undefined : msg.is_echo ? undefined : contact.id,
    body: msg.text || fileName,
    fromMe: fromMe ? fromMe : msg.is_echo ? true : false,
    mediaType: msg.attachments[0].type,
    mediaUrl: fileName,
    read: fromMe ? fromMe : msg.is_echo,
    quotedMsgId: null,
    ack: 3,
    dataJson: JSON.stringify(msg),
    channel: ticket.channel
  };

  await CreateMessageService({ messageData, companyId: ticket.companyId });

  // await ticket.update({
  //   lastMessage: msg.text
  // });
};

export const verifyQuotedMessage = async (msg: any): Promise<Message | null> => {
  if (!msg) return null;
  const quoted = msg?.reply_to?.mid;

  if (!quoted) return null;

  const quotedMsg = await Message.findOne({
    where: { wid: quoted }
  });

  if (!quotedMsg) return null;

  return quotedMsg;
};


const flowBuilderQueue = async (
  ticket: Ticket,
  message: any,
  getSession: Whatsapp,
  companyId: number,
  contact: Contact,
  isFirstMsg: Ticket,
) => {
  // ✅ CORRIGIDO: Se o ticket está "open" (aceito pelo atendente), parar o fluxo
  if (ticket.status === "open") {
    console.log(`[FLOW QUEUE - FACEBOOK] ⚠️ Ticket ${ticket.id} está OPEN - Parando fluxo`);
    return;
  }

  // Verificar se existe fluxo interrompido válido
  if (!ticket.flowStopped || !ticket.lastFlowId) {
    console.log("[FLOW QUEUE - FACEBOOK] Ticket sem fluxo interrompido ou ID de último fluxo");
    return;
  }

  try {
    const flow = await FlowBuilderModel.findOne({
      where: {
        id: ticket.flowStopped,
        company_id: companyId, // ✅ CORRIGIDO: Filtrar por company_id
        active: true // ✅ CORRIGIDO: Verificar se flow está ativo
      }
    });

    if (!flow) {
      console.error(`[FLOW QUEUE - FACEBOOK] ❌ Fluxo ${ticket.flowStopped} não encontrado, inativo ou não pertence à empresa ${companyId}`);
      return;
    }

    const nodes: INodes[] = flow.flow["nodes"];
    const connections: IConnections[] = flow.flow["connections"];

    // ✅ CORRIGIDO: Validar estrutura do flow
    if (!nodes || !Array.isArray(nodes) || nodes.length === 0) {
      console.error(`[FLOW QUEUE - FACEBOOK] ❌ Fluxo ${flow.id} não possui nós válidos`);
      return;
    }

    const mountDataContact = {
      number: contact.number,
      name: contact.name,
      email: contact.email
    };

    console.log("[FLOW QUEUE - FACEBOOK] ======================================");
    console.log("[FLOW QUEUE - FACEBOOK] |         flowBuilderQueue           |");
    console.log(`[FLOW QUEUE - FACEBOOK] Ticket: ${ticket.id}, Flow: ${flow.id}`);
    console.log("[FLOW QUEUE - FACEBOOK] ======================================");

    if (ticket.flowWebhook) {
      await ActionsWebhookFacebookService(
        getSession,
        parseInt(ticket.flowStopped),
        ticket.companyId,
        nodes,
        connections,
        ticket.lastFlowId,
        null,
        "",
        "",
        message.text,
        ticket.id,
        mountDataContact
      );
    }
  } catch (error) {
    console.error(`[FLOW QUEUE - FACEBOOK] ❌ Erro ao processar flowBuilderQueue para ticket ${ticket.id}:`, error);
  }
}



const flowbuilderIntegration = async (
  ticket: Ticket,
  companyId: any,
  isFirstMsg: Ticket,
  getSession: Whatsapp,
  contact: Contact,
  message: any,
) => {
  const body = message?.text || ticket.lastMessage || "";

  console.log("[FLOW BUILDER - FACEBOOK] ======================================");
  console.log("[FLOW BUILDER - FACEBOOK] |      flowbuilderIntegration        |");
  console.log(`[FLOW BUILDER - FACEBOOK] Ticket: ${ticket.id}, Mensagem: "${body}"`);
  console.log("[FLOW BUILDER - FACEBOOK] ======================================");

  // ✅ CORRIGIDO: Verificar se ticket está em estado válido
  if (ticket.status !== "pending") {
    console.log(`[FLOW BUILDER - FACEBOOK] Ticket ${ticket.id} não está em status "pending" (status: ${ticket.status}), ignorando flow`);
    return;
  }

  // ✅ CORRIGIDO: Verificar se já está em fluxo ativo
  if (ticket.flowWebhook && ticket.lastFlowId) {
    console.log(`[FLOW BUILDER - FACEBOOK] Ticket ${ticket.id} já está em fluxo ativo (lastFlowId: ${ticket.lastFlowId}), ignorando nova execução`);
    return;
  }

  await ticket.update({
    lastMessage: body,
  });

  // ✅ CORRIGIDO: Contar mensagens do cliente para verificar se é primeira interação
  const messageCount = await Message.count({
    where: {
      ticketId: ticket.id,
      fromMe: false // Apenas mensagens do cliente
    }
  });

  // ✅ CORRIGIDO: Verificar se o contato é novo na base
  const isNewContact = contact.createdAt && 
    Math.abs(new Date().getTime() - new Date(contact.createdAt).getTime()) < 5000; // 5 segundos de tolerância

  console.log(`[FLOW BUILDER - FACEBOOK] Ticket ${ticket.id} - Mensagens do cliente: ${messageCount}`);
  console.log(`[FLOW BUILDER - FACEBOOK] Contato ${contact.id} - Novo na base: ${isNewContact}, Criado em: ${contact.createdAt}`);

  // ✅ CORRIGIDO: Buscar campanhas para verificar se há match
  const listPhrase = await FlowCampaignModel.findAll({
    where: {
      companyId: ticket.companyId,
      status: true
    }
  });

  // ✅ CORRIGIDO: Verificar se alguma campanha faz match com a mensagem
  const matchingCampaign = listPhrase.find(campaign => {
    try {
      if (!campaign.status) {
        return false;
      }
      // Usar método que considera a conexão específica
      const matches = campaign.matchesMessage(body, getSession.id);
      if (matches) {
        console.log(`[FLOW BUILDER - FACEBOOK] ✅ MATCH encontrado! Campanha "${campaign.name}" (ID: ${campaign.id}) para mensagem: "${body}"`);
      }
      return matches;
    } catch (error) {
      console.error(`[FLOW BUILDER - FACEBOOK] Erro ao verificar match da campanha ${campaign.id}:`, error);
      return false;
    }
  });

  // ✅ CORRIGIDO: Se houver match de campanha, executar campanha (prioridade máxima)
  if (matchingCampaign) {
    console.log(`[FLOW BUILDER - FACEBOOK] 🚀 EXECUTANDO CAMPANHA! Campanha: ${matchingCampaign.name} (ID: ${matchingCampaign.id}) | Fluxo: ${matchingCampaign.flowId} | Conexão: ${getSession.id} | Ticket: ${ticket.id}`);

    try {
      const flow = await FlowBuilderModel.findOne({
        where: {
          id: matchingCampaign.flowId,
          company_id: companyId,
          active: true
        }
      });

      if (!flow) {
        console.error(`[FLOW BUILDER - FACEBOOK] ❌ Fluxo ${matchingCampaign.flowId} não encontrado, inativo ou não pertence à empresa ${companyId}`);
        return;
      }

      const nodes: INodes[] = flow.flow["nodes"];
      const connections: IConnections[] = flow.flow["connections"];

      if (!nodes || !Array.isArray(nodes) || nodes.length === 0) {
        console.error(`[FLOW BUILDER - FACEBOOK] ❌ Fluxo ${flow.id} não possui nós válidos`);
        return;
      }

      const mountDataContact = {
        number: contact.number,
        name: contact.name,
        email: contact.email
      };

      // Marcar ticket como em fluxo
      await ticket.update({
        flowWebhook: true,
        flowStopped: null,
        lastFlowId: null,
        hashFlowId: null,
        dataWebhook: null,
        isBot: true,
        status: "pending"
      });

      await ActionsWebhookFacebookService(
        getSession,
        matchingCampaign.flowId,
        ticket.companyId,
        nodes,
        connections,
        flow.flow["nodes"][0].id,
        null,
        "",
        "",
        null,
        ticket.id,
        mountDataContact
      );

      console.log(`[FLOW BUILDER - FACEBOOK] ✅ Campanha executada com sucesso!`);
      return;
    } catch (error) {
      console.error(`[FLOW BUILDER - FACEBOOK] ❌ Erro ao executar campanha:`, error);
      await ticket.update({
        flowWebhook: false,
        isBot: false
      });
      return;
    }
  }

  // ✅ CORRIGIDO: Função para verificar se tem match com alguma campanha
  const hasAnyPhraseMatch = (campaigns: typeof listPhrase, messageBody: string, whatsappId: number): boolean => {
    if (!campaigns || !Array.isArray(campaigns) || campaigns.length === 0) {
      return false;
    }

    return campaigns.some(campaign => {
      try {
        if (!campaign.status) {
          return false;
        }
        return campaign.matchesMessage(messageBody, whatsappId);
      } catch (error) {
        console.error(`[FLOW BUILDER - FACEBOOK] Erro ao verificar campanha ${campaign.id}:`, error);
        return false;
      }
    });
  };

  // ✅ CORRIGIDO: FLUXO flowIdWelcome: Para contatos que JÁ EXISTEM na base
  if (
    !hasAnyPhraseMatch(listPhrase, body, getSession.id) &&
    getSession.flowIdWelcome &&
    messageCount === 1 &&
    !isNewContact
  ) {
    console.log(`[FLOW BUILDER - FACEBOOK] 🚀 Iniciando flowIdWelcome (${getSession.flowIdWelcome}) - Contato existente na primeira mensagem`);

    try {
      const flow = await FlowBuilderModel.findOne({
        where: {
          id: getSession.flowIdWelcome,
          company_id: companyId,
          active: true
        }
      });

      if (!flow) {
        console.error(`[FLOW BUILDER - FACEBOOK] ❌ Fluxo flowIdWelcome ${getSession.flowIdWelcome} não encontrado, inativo ou não pertence à empresa ${companyId}`);
      } else {
        const nodes: INodes[] = flow.flow["nodes"];
        const connections: IConnections[] = flow.flow["connections"];

        if (!nodes || !Array.isArray(nodes) || nodes.length === 0) {
          console.error(`[FLOW BUILDER - FACEBOOK] ❌ Fluxo flowIdWelcome ${flow.id} não possui nós válidos`);
        } else {
          const mountDataContact = {
            number: contact.number,
            name: contact.name,
            email: contact.email
          };

          // Marcar ticket como em fluxo
          await ticket.update({
            flowWebhook: true,
            flowStopped: null,
            lastFlowId: null,
            hashFlowId: null,
            dataWebhook: null,
            isBot: true
          });

          await ActionsWebhookFacebookService(
            getSession,
            getSession.flowIdWelcome,
            ticket.companyId,
            nodes,
            connections,
            flow.flow["nodes"][0].id,
            null,
            "",
            "",
            null,
            ticket.id,
            mountDataContact
          );

          console.log(`[FLOW BUILDER - FACEBOOK] ✅ Fluxo flowIdWelcome executado com sucesso!`);
        }
      }
    } catch (error) {
      console.error("[FLOW BUILDER - FACEBOOK] ❌ Erro ao executar fluxo flowIdWelcome:", error);
      await ticket.update({
        flowWebhook: false,
        isBot: false
      });
    }
  } 
  // ✅ CORRIGIDO: FLUXO flowIdNotPhrase: Para contatos NOVOS na primeira mensagem SEM match de campanha
  else if (
    !hasAnyPhraseMatch(listPhrase, body, getSession.id) &&
    getSession.flowIdNotPhrase &&
    messageCount === 1 &&
    isNewContact
  ) {
    console.log(`[FLOW BUILDER - FACEBOOK] 🚀 Iniciando flowIdNotPhrase (${getSession.flowIdNotPhrase}) - Contato NOVO na primeira mensagem sem match de campanha`);

    try {
      const flow = await FlowBuilderModel.findOne({
        where: {
          id: getSession.flowIdNotPhrase,
          company_id: companyId,
          active: true
        }
      });

      if (!flow) {
        console.error(`[FLOW BUILDER - FACEBOOK] ❌ Fluxo flowIdNotPhrase ${getSession.flowIdNotPhrase} não encontrado, inativo ou não pertence à empresa ${companyId}`);
      } else {
        const nodes: INodes[] = flow.flow["nodes"];
        const connections: IConnections[] = flow.flow["connections"];

        if (!nodes || !Array.isArray(nodes) || nodes.length === 0) {
          console.error(`[FLOW BUILDER - FACEBOOK] ❌ Fluxo flowIdNotPhrase ${flow.id} não possui nós válidos`);
        } else {
          const mountDataContact = {
            number: contact.number,
            name: contact.name,
            email: contact.email
          };

          // Marcar ticket como em fluxo
          await ticket.update({
            flowWebhook: true,
            flowStopped: null,
            lastFlowId: null,
            hashFlowId: null,
            dataWebhook: null,
            isBot: true
          });

          await ActionsWebhookFacebookService(
            getSession,
            getSession.flowIdNotPhrase,
            ticket.companyId,
            nodes,
            connections,
            flow.flow["nodes"][0].id,
            null,
            "",
            "",
            null,
            ticket.id,
            mountDataContact
          );

          console.log(`[FLOW BUILDER - FACEBOOK] ✅ Fluxo flowIdNotPhrase executado com sucesso!`);
        }
      }
    } catch (error) {
      console.error("[FLOW BUILDER - FACEBOOK] ❌ Erro ao executar fluxo flowIdNotPhrase:", error);
      await ticket.update({
        flowWebhook: false,
        isBot: false
      });
    }
  } else {
    console.log(`[FLOW BUILDER - FACEBOOK] ℹ️ Nenhuma condição de flow atendida para ticket ${ticket.id}`);
  }


  /*
  if (ticketUpdate.flowWebhook) {
    const webhook = await WebhookModel.findOne({
      where: {
        company_id: ticketUpdate.companyId,
        hash_id: ticketUpdate.hashFlowId
      }
    });

    if (webhook && webhook.config["details"]) {
      const flow = await FlowBuilderModel.findOne({
        where: {
          id: webhook.config["details"].idFlow
        }
      });
      const nodes: INodes[] = flow.flow["nodes"];
      const connections: IConnections[] = flow.flow["connections"];

      // const worker = new Worker("./src/services/WebhookService/WorkerAction.ts");

      // console.log('DISPARO4')
      // // Enviar as variáveis como parte da mensagem para o Worker
      // const data = {
      //   idFlowDb: webhook.config["details"].idFlow,
      //   companyId: ticketUpdate.companyId,
      //   nodes: nodes,
      //   connects: connections,
      //   nextStage: ticketUpdate.lastFlowId,
      //   dataWebhook: ticketUpdate.dataWebhook,
      //   details: webhook.config["details"],
      //   hashWebhookId: ticketUpdate.hashFlowId,
      //   pressKey: body,
      //   idTicket: ticketUpdate.id,
      //   numberPhrase: ""
      // };
      // worker.postMessage(data);

      // worker.on("message", message => {
      //   console.log(`Mensagem do worker: ${message}`);
      // });

      await ActionsWebhookFacebookService(
        getSession,
        webhook.config["details"].idFlow,
        ticketUpdate.companyId,
        nodes,
        connections,
        ticketUpdate.lastFlowId,
        ticketUpdate.dataWebhook,
        webhook.config["details"],
        ticketUpdate.hashFlowId,
        message.text,
        ticketUpdate.id
      );
    } else {
      const flow = await FlowBuilderModel.findOne({
        where: {
          id: ticketUpdate.flowStopped
        }
      });

      const nodes: INodes[] = flow.flow["nodes"];
      const connections: IConnections[] = flow.flow["connections"];

      if (!ticketUpdate.lastFlowId) {
        return
      }

      const mountDataContact = {
        number: contact.number,
        name: contact.name,
        email: contact.email
      };

      // const worker = new Worker("./src/services/WebhookService/WorkerAction.ts");

      // console.log('DISPARO5')
      // // Enviar as variáveis como parte da mensagem para o Worker
      // const data = {
      //   idFlowDb: parseInt(ticketUpdate.flowStopped),
      //   companyId: ticketUpdate.companyId,
      //   nodes: nodes,
      //   connects: connections,
      //   nextStage: ticketUpdate.lastFlowId,
      //   dataWebhook: null,
      //   details: "",
      //   hashWebhookId: "",
      //   pressKey: body,
      //   idTicket: ticketUpdate.id,
      //   numberPhrase: mountDataContact
      // };
      // worker.postMessage(data);
      // worker.on("message", message => {
      //   console.log(`Mensagem do worker: ${message}`);
      // });

      await ActionsWebhookFacebookService(
        getSession,
        parseInt(ticketUpdate.flowStopped),
        ticketUpdate.companyId,
        nodes,
        connections,
        ticketUpdate.lastFlowId,
        null,
        "",
        "",
        message.text,
        ticketUpdate.id,
        mountDataContact
      );
    }
  }
  */
}

export const handleMessage = async (
  token: Whatsapp,
  webhookEvent: any,
  channel: string,
  companyId: any
): Promise<any> => {
  try {
    if (webhookEvent.message) {
      let msgContact: any;

      const senderPsid = webhookEvent.sender.id;
      const recipientPsid = webhookEvent.recipient.id;
      const { message } = webhookEvent;
      const fromMe = message.is_echo;

      let bodyMessage = message.text;

      if (fromMe) {
        if (/\u200e/.test(bodyMessage)) return;

        msgContact = await profilePsid(recipientPsid, token.facebookUserToken);
      } else {
        msgContact = await profilePsid(senderPsid, token.facebookUserToken);
      }

      const contact = await verifyContact(msgContact, token, companyId);

      const unreadCount = fromMe ? 0 : 1;

      const getSession = await Whatsapp.findOne({
        where: {
          facebookPageUserId: token.facebookPageUserId
        },
        include: [
          {
            model: Queue,
            as: "queues",
            attributes: ["id", "name", "color", "greetingMessage"],
            include: [
              {
                model: Chatbot,
                as: "chatbots",
                attributes: ["id", "name", "greetingMessage"]
              }
            ]
          }
        ],
        order: [
          ["queues", "id", "ASC"],
          ["queues", "chatbots", "id", "ASC"]
        ]
      });

      const settings = await CompaniesSettings.findOne({
        where: { companyId }
      }
      )

      const isFirstMsg = await Ticket.findOne({
        where: {
          contactId: contact.id,
          companyId,
        },
        order: [["id", "DESC"]]
      });

      const mutex = new Mutex();
      const ticket = await mutex.runExclusive(async () => {
        const createTicket = await FindOrCreateTicketService(
          contact,
          getSession,
          unreadCount,
          companyId,
          0,
          0,
          null,
          channel,
          null,
          false,
          settings
        )
        return createTicket;
      });

      let bodyRollbackTag = "";
      let bodyNextTag = "";
      let rollbackTag;
      let nextTag;
      let ticketTag = undefined;
      // console.log(ticket.id)
      if (ticket?.company?.plan?.useKanban) {
        ticketTag = await TicketTag.findOne({
          where: {
            ticketId: ticket.id
          }
        })

        if (ticketTag) {
          const tag = await Tag.findByPk(ticketTag.tagId)

          if (tag.nextLaneId) {
            nextTag = await Tag.findByPk(tag.nextLaneId);

            bodyNextTag = nextTag.greetingMessageLane;
          }
          if (tag.rollbackLaneId) {
            rollbackTag = await Tag.findByPk(tag.rollbackLaneId);

            bodyRollbackTag = rollbackTag.greetingMessageLane;
          }
        }
      }

      const ticketTraking = await FindOrCreateATicketTrakingService({
        ticketId: ticket.id,
        companyId,
        whatsappId: getSession?.id,
        userId: ticket.userId
      });

      if (
        (getSession.farewellMessage &&
          formatBody(getSession.farewellMessage, ticket) === message.text) ||
        (getSession.ratingMessage &&
          formatBody(getSession.ratingMessage, ticket) === message.text)
      )
        return;

      if (rollbackTag && formatBody(bodyNextTag, ticket) !== bodyMessage && formatBody(bodyRollbackTag, ticket) !== bodyMessage) {
        await TicketTag.destroy({ where: { ticketId: ticket.id, tagId: ticketTag.tagId } });
        await TicketTag.create({ ticketId: ticket.id, tagId: rollbackTag.id });
      }

      await ticket.update({
        lastMessage: message.text
      });

      try {
        if (!fromMe) {
          /**
           * Tratamento para avaliação do atendente
           */
          if (ticket.status === "nps" && ticketTraking !== null && verifyRating(ticketTraking)) {

            if (!isNaN(parseFloat(bodyMessage))) {

              handleRating(parseFloat(bodyMessage), ticket, ticketTraking);

              await ticketTraking.update({
                ratingAt: moment().toDate(),
                finishedAt: moment().toDate(),
                rated: true
              });

              return;
            } else {

              if (ticket.amountUsedBotQueuesNPS < getSession.maxUseBotQueuesNPS) {
                let bodyErrorRating = `\u200eOpção inválida, tente novamente.\n`;
                const sentMessage = await sendText(
                  contact.number,
                  bodyErrorRating,
                  getSession.facebookUserToken
                );

                await verifyMessageFace(sentMessage, bodyErrorRating, ticket, contact);


                // await delay(1000);

                let bodyRatingMessage = `\u200e${getSession.ratingMessage}\n`;

                const msg = await sendText(contact.number, bodyRatingMessage, getSession.facebookUserToken);

                await verifyMessageFace(sentMessage, bodyRatingMessage, ticket, contact);

                await ticket.update({
                  amountUsedBotQueuesNPS: ticket.amountUsedBotQueuesNPS + 1
                })
              }
              return;
            }

          }

          const enableLGPD = settings.enableLGPD === "enabled";

          //TRATAMENTO LGPD
          if (enableLGPD && ticket.status === "lgpd") {
            if (isNil(ticket.lgpdAcceptedAt) && !isNil(ticket.lgpdSendMessageAt)) {
              let choosenOption: number | null = null;

              if (!isNaN(parseFloat(bodyMessage))) {
                choosenOption = parseFloat(bodyMessage);
              }

              //Se digitou opção numérica
              if (!Number.isNaN(choosenOption) && Number.isInteger(choosenOption) && !isNull(choosenOption) && choosenOption > 0) {
                //Se digitou 1, aceitou o termo e vai pro bot
                if (choosenOption === 1) {
                  await contact.update({
                    lgpdAcceptedAt: moment().toDate(),
                  });
                  await ticket.update({
                    lgpdAcceptedAt: moment().toDate(),
                    amountUsedBotQueues: 0
                  });
                  //Se digitou 2, recusou o bot e encerra chamado
                } else if (choosenOption === 2) {

                  if (getSession.complationMessage !== "" && getSession.complationMessage !== undefined) {

                    const sentMessage = await sendText(
                      contact.number,
                      `\u200e${getSession.complationMessage}`,
                      getSession.facebookUserToken
                    );

                    await verifyMessageFace(sentMessage, `\u200e${getSession.complationMessage}`, ticket, contact);
                  }

                  await ticket.update({
                    status: "closed",
                    amountUsedBotQueues: 0
                  })

                  await ticketTraking.destroy;

                  return
                  //se digitou qualquer opção que não seja 1 ou 2 limpa o lgpdSendMessageAt para 
                  //enviar de novo o bot respeitando o numero máximo de vezes que o bot é pra ser enviado
                } else {
                  if (ticket.amountUsedBotQueues < getSession.maxUseBotQueues) {
                    await ticket.update(
                      {
                        amountUsedBotQueues: ticket.amountUsedBotQueues + 1
                        , lgpdSendMessageAt: null
                      });
                  }
                }
                //se digitou qualquer opção que não número o lgpdSendMessageAt para 
                //enviar de novo o bot respeitando o numero máximo de vezes que o bot é pra ser enviado
              } else {
                if (ticket.amountUsedBotQueues < getSession.maxUseBotQueues) {
                  await ticket.update(
                    {
                      amountUsedBotQueues: ticket.amountUsedBotQueues + 1
                      , lgpdSendMessageAt: null
                    });
                }
              }
            }

            if ((contact.lgpdAcceptedAt === null || settings?.lgpdConsent === "enabled") &&
              !contact.isGroup && isNil(ticket.lgpdSendMessageAt) &&
              ticket.amountUsedBotQueues <= getSession.maxUseBotQueues && !isNil(settings?.lgpdMessage)
            ) {
              if (message.attachments) {
                await verifyMessageMedia(message, ticket, contact);
              } else {
                await verifyMessageFace(message, message.text, ticket, contact);
              }

              if (!isNil(settings?.lgpdMessage) && settings.lgpdMessage !== "") {
                const bodyMessageLGPD = formatBody(`\u200e${settings.lgpdMessage}`, ticket);

                const sentMessage = await sendText(
                  contact.number,
                  bodyMessageLGPD,
                  getSession.facebookUserToken
                );

                await verifyMessageFace(sentMessage, bodyMessageLGPD, ticket, contact);

              }
              // await delay(1000);

              if (!isNil(settings?.lgpdLink) && settings?.lgpdLink !== "") {
                const bodyLink = formatBody(`\u200e${settings.lgpdLink}`, ticket);
                const sentMessage = await sendText(
                  contact.number,
                  bodyLink,
                  getSession.facebookUserToken
                );

                await verifyMessageFace(sentMessage, bodyLink, ticket, contact);
              };

              // await delay(1000);

              const bodyBot = formatBody(
                `\u200eEstou ciente sobre o tratamento dos meus dados pessoais. \n\n*[1]* Sim\n*[2]* Não`,
                ticket
              );

              const sentMessageBot = await sendText(
                contact.number,
                bodyBot,
                getSession.facebookUserToken
              );

              await verifyMessageFace(sentMessageBot, bodyBot, ticket, contact);

              await ticket.update({
                lgpdSendMessageAt: moment().toDate(),
                amountUsedBotQueues: ticket.amountUsedBotQueues + 1
              });

              await ticket.reload();

              return;

            };

            if (!isNil(ticket.lgpdSendMessageAt) && isNil(ticket.lgpdAcceptedAt))
              return
          }
        }
      } catch (e) {
        throw new Error(e);
        console.log(e);
      }

      if (message.attachments) {
        await verifyMessageMedia(message, ticket, contact);
      } else {
        await verifyMessageFace(message, message.text, ticket, contact);
      }


      // ✅ CORRIGIDO: Verificar se ticket está aguardando resposta de Input node
      if (
        !fromMe &&
        ticket.flowWebhook &&
        ticket.flowStopped &&
        ticket.lastFlowId &&
        ticket.dataWebhook &&
        (ticket.dataWebhook as any).waitingInput === true
      ) {
        console.log(`[INPUT NODE - FACEBOOK] Processando resposta para nó de input - ticket ${ticket.id}`);
        
        try {
          const body = message.text || "";
          // @ts-ignore
          const inputVariableName = (ticket.dataWebhook as any).inputVariableName;
          // @ts-ignore
          const inputIdentifier = (ticket.dataWebhook as any).inputIdentifier || `${ticket.id}_${inputVariableName}`;

          global.flowVariables = global.flowVariables || {};
          global.flowVariables[inputVariableName] = body;
          global.flowVariables[inputIdentifier] = body; // Salvar com o identificador também

          const nextNode = global.flowVariables[`${inputIdentifier}_next`];
          // Fallback: se o ponteiro em memória não existir, usa o salvo no ticket
          // @ts-ignore
          const fallbackNextNode = (ticket.dataWebhook as any)?.nextNodeId;
          const resolvedNextNode = nextNode || fallbackNextNode;

          await ticket.update({
            dataWebhook: {
              ...ticket.dataWebhook,
              waitingInput: false,
              inputProcessed: true,
              inputVariableName: null,
              inputIdentifier: null,
              lastInputValue: body
            }
          });

          // Fallback de flowId: se flowStopped estiver ausente, tenta pegar de dataWebhook.flowId
          // @ts-ignore
          const resolvedFlowId = ticket.flowStopped || (ticket.dataWebhook as any)?.flowId;

          if (resolvedFlowId && resolvedNextNode) {
            const flow = await FlowBuilderModel.findOne({
              where: {
                id: parseInt(resolvedFlowId),
                company_id: companyId,
                active: true
              }
            });

            if (flow) {
              const nodes: INodes[] = flow.flow["nodes"];
              const connections: IConnections[] = flow.flow["connections"];

              const mountDataContact = {
                number: contact.number,
                name: contact.name,
                email: contact.email
              };

              console.log(`[INPUT NODE - FACEBOOK] Continuando fluxo após resposta do input - próximo nó: ${resolvedNextNode}`);

              await ActionsWebhookFacebookService(
                getSession,
                parseInt(resolvedFlowId),
                ticket.companyId,
                nodes,
                connections,
                resolvedNextNode, // Continuar a partir do próximo nó salvo
                ticket.dataWebhook,
                "",
                ticket.hashFlowId || "",
                body, // A resposta do usuário como pressKey
                ticket.id,
                mountDataContact
              );

              console.log(`[INPUT NODE - FACEBOOK] ✅ Fluxo continuado após resposta do input`);
              return; // Não processar mais nada
            } else {
              console.error(`[INPUT NODE - FACEBOOK] ❌ Fluxo ${resolvedFlowId} não encontrado ou inativo`);
            }
          } else {
            console.error(`[INPUT NODE - FACEBOOK] ❌ FlowId ou NextNode não encontrados: flowId=${resolvedFlowId}, nextNode=${resolvedNextNode}`);
          }
        } catch (error) {
          console.error(`[INPUT NODE - FACEBOOK] ❌ Erro ao processar resposta do input:`, error);
        }
      }

      // ✅ CORRIGIDO: Buscar flow com validações de company_id e active
      let isMenu = false;
      if (ticket.flowStopped) {
        try {
          const flow = await FlowBuilderModel.findOne({
            where: {
              id: ticket.flowStopped,
              company_id: companyId,
              active: true
            }
          });

          if (flow && flow.flow && flow.flow["nodes"]) {
            isMenu = flow.flow["nodes"].find((node: any) => node.id === ticket.lastFlowId)?.type === "menu";
          }
        } catch (error) {
          console.error(`[FLOW BUILDER - FACEBOOK] Erro ao verificar se é menu:`, error);
        }
      }

      if (
        !ticket.fromMe &&
        isMenu &&
        !isNaN(message.text)
      ) {

        await ticket.update({
          queueId: ticket.queueId ? ticket.queueId : null,
        });

        await flowBuilderQueue(ticket, message, getSession, companyId, contact, isFirstMsg)
      }

      // ✅ CORRIGIDO: Condições de entrada para flowbuilder - removidas restrições desnecessárias
      if (
        !ticket.imported &&
        !fromMe &&
        !ticket.isGroup &&
        !isMenu &&
        ticket.status === "pending" && // ✅ CORRIGIDO: Verificar status do ticket
        (!ticket.flowWebhook || !ticket.lastFlowId) && // ✅ CORRIGIDO: Só executar se não estiver em fluxo ativo
        !isNil(getSession.integrationId) &&
        !ticket.useIntegration
      ) {
        try {
          const integrations = await ShowQueueIntegrationService(getSession.integrationId, companyId);

          if (integrations && integrations.type === "flowbuilder") {
            console.log(`[FLOW BUILDER - FACEBOOK] Condições atendidas para executar flowbuilder no ticket ${ticket.id}`);

            // ✅ CORRIGIDO: Não atualizar dataWebhook aqui, isso será feito dentro do flowbuilderIntegration
            await flowbuilderIntegration(
              ticket,
              companyId,
              isFirstMsg,
              getSession,
              contact,
              message
            );
          }
        } catch (error) {
          console.error(`[FLOW BUILDER - FACEBOOK] ❌ Erro ao verificar integração ou executar flowbuilder:`, error);
        }
      }

      if (
        !ticket.queue &&
        !fromMe &&
        !ticket.userId &&
        getSession.queues.length >= 1
      ) {
        await verifyQueue(getSession, message, ticket, contact);
      }

      if (ticket.queue && ticket.queueId) {
        // ✅ CORRIGIDO: Executar ChatBot apenas se ticket não estiver "open" (aceito por atendente)
        if (ticket.status !== "open" && ticket.queue?.chatbots?.length > 0) {
          await sayChatbot(
            ticket.queueId,
            getSession,
            ticket,
            contact,
            message
          );
        }
      }
    }

    return;
  } catch (error) {
    throw new Error(error);
  }
};

const verifyQueue = async (
  getSession: Whatsapp,
  msg: any,
  ticket: Ticket,
  contact: Contact
) => {
  // console.log("VERIFYING QUEUE", ticket.whatsappId, getSession.id)
  const { queues, greetingMessage } = await ShowWhatsAppService(getSession.id!, ticket.companyId);



  if (queues.length === 1) {
    const firstQueue = head(queues);
    let chatbot = false;
    if (firstQueue?.chatbots) {
      chatbot = firstQueue?.chatbots?.length > 0;
    }
    await UpdateTicketService({
      ticketData: { queueId: queues[0].id, isBot: chatbot },
      ticketId: ticket.id,
      companyId: ticket.companyId
    });

    return;
  }

  let selectedOption = "";

  if (ticket.status !== "lgpd") {
    selectedOption = msg.text;
  } else {
    if (!isNil(ticket.lgpdAcceptedAt))
      await ticket.update({
        status: "pending"
      });

    await ticket.reload();
  }

  const choosenQueue = queues[+selectedOption - 1];

  if (choosenQueue) {

    await UpdateTicketService({
      ticketData: { queueId: choosenQueue.id },
      ticketId: ticket.id,
      companyId: ticket.companyId
    });

    if (choosenQueue.chatbots.length > 0) {
      let options = "";
      choosenQueue.chatbots.forEach((chatbot, index) => {
        options += `[${index + 1}] - ${chatbot.name}\n`;
      });

      const body =
        `${choosenQueue.greetingMessage}\n\n${options}\n[#] Voltar para o menu principal`;

      const sentMessage = await sendFacebookMessage({
        ticket,
        body: body
      })

      // const debouncedSentChatbot = debounce(
      //   async () => {
      //     await sendText(
      //   contact.number,
      //   formatBody(body, ticket),
      //   ticket.whatsapp.facebookUserToken
      // );
      //   },
      //   3000,
      //   ticket.id
      // );
      // debouncedSentChatbot();

      // return await verifyMessage(msg, body, ticket, contact);
    }

    if (!choosenQueue.chatbots.length) {
      const body = `${choosenQueue.greetingMessage}`;

      const sentMessage = await sendFacebookMessage({
        ticket,
        body: body
      })
      // const debouncedSentChatbot = debounce(
      //   async () => { await sendText(
      //   contact.number,
      //   formatBody(body, ticket),
      //   ticket.whatsapp.facebookUserToken
      // );

      //   },
      //   3000,
      //   ticket.id
      // );
      // debouncedSentChatbot();
      // return await verifyMessage(msg, body, ticket, contact);
    }
  } else {
    let options = "";

    queues.forEach((queue, index) => {
      options += `[${index + 1}] - ${queue.name}\n`;
    });

    const body = `${greetingMessage}\n\n${options}`;

    const sentMessage = await sendFacebookMessage({
      ticket,
      body: body
    })
    // const debouncedSentChatbot = debounce(
    //   async () => { await 
    //     sendText(
    //       contact.number,
    //       formatBody(body, ticket),
    //       ticket.whatsapp.facebookUserToken
    //     );
    //   },
    //   3000,
    //   ticket.id
    // );
    // debouncedSentChatbot();

    // return verifyMessage(msg, body, ticket, contact);



  }
};