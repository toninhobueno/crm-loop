import AppError from "../../errors/AppError";
import { WebhookModel } from "../../models/Webhook";
import { obterNomeEExtensaoDoArquivo, sendMessageFlow } from "../../controllers/MessageController";
import { IConnections, INodes } from "./DispatchWebHookService";
import { Request, Response } from "express";
import { ParamsDictionary } from "express-serve-static-core";
import { ParsedQs } from "qs";
import CreateContactService from "../ContactServices/CreateContactService";
import Contact from "../../models/Contact";
import CreateTicketService from "../TicketServices/CreateTicketService";
// import CreateTicketServiceWebhook from "../TicketServices/CreateTicketServiceWebhook";
import { SendMessage } from "../../helpers/SendMessage";
import GetDefaultWhatsApp from "../../helpers/GetDefaultWhatsApp";
import Ticket from "../../models/Ticket";
import Message from "../../models/Message";
import fs from "fs";
import GetWhatsappWbot from "../../helpers/GetWhatsappWbot";
import path from "path";
import SendWhatsAppMedia from "../WbotServices/SendWhatsAppMedia";
import SendWhatsAppMediaFlow, { typeSimulation } from "../WbotServices/SendWhatsAppMediaFlow";
import { randomizarCaminho } from "../../utils/randomizador";
// import { SendMessageFlow } from "../../helpers/SendMessageFlow";
import formatBody from "../../helpers/Mustache";
import SetTicketMessagesAsRead from "../../helpers/SetTicketMessagesAsRead";
import SendWhatsAppMessage from "../WbotServices/SendWhatsAppMessage";
import ShowTicketService from "../TicketServices/ShowTicketService";
import CreateMessageService, {
  MessageData
} from "../MessageServices/CreateMessageService";
import { randomString } from "../../utils/randomCode";
import ShowQueueService from "../QueueService/ShowQueueService";
import { getIO } from "../../libs/socket";
import UpdateTicketService from "../TicketServices/UpdateTicketService";
import FindOrCreateATicketTrakingService from "../TicketServices/FindOrCreateATicketTrakingService";
import ShowTicketUUIDService from "../TicketServices/ShowTicketFromUUIDService";
import logger from "../../utils/logger";
import CreateLogTicketService from "../TicketServices/CreateLogTicketService";
import CompaniesSettings from "../../models/CompaniesSettings";
import ShowWhatsAppService from "../WhatsappService/ShowWhatsAppService";
import SyncTags from "../TagServices/SyncTagsService";
import Tag from "../../models/Tag";
import ContactTag from "../../models/ContactTag";
import flowBuilderQueue from "./flowBuilderQueue";
import { proto } from "baileys";
import { getWbot } from "../../libs/wbot";
import SendWhatsAppOficialMessage from "../WhatsAppOficial/SendWhatsAppOficialMessage";
import Whatsapp from "../../models/Whatsapp";
import axios from "axios";
import https from "https";
import { flowbuilderIntegration } from "../WbotServices/wbotMessageListener";
import { handleOpenAiFlow } from "../IntegrationsServices/OpenAiService";
import { IOpenAi } from "../../@types/openai";
import { FlowBuilderModel } from "../../models/FlowBuilder";


declare global {
  namespace NodeJS {
    interface Global {
      flowVariables: Record<string, any>;
    }
  }
}

if (!global.flowVariables) {
  global.flowVariables = {};
}
interface IAddContact {
  companyId: number;
  name: string;
  phoneNumber: string;
  email?: string;
  dataMore?: any;
}

interface DataNoWebhook {
  nome: string;
  numero: string;
  email: string;
}

const processVariableValue = (text: string, dataWebhook: any, ticketId?: number): string => {
  if (!text) return "";


  if (text.includes("${")) {
    const regex = /\${([^}]+)}/g;
    let match;
    let processedText = text;

    while ((match = regex.exec(text)) !== null) {
      const variableName = match[1];


      let variableValue = null;

      if (ticketId) {
        const ticketSpecificVar = `${ticketId}_${variableName}`;
        variableValue = global.flowVariables[ticketSpecificVar];
      }


      if (variableValue === null || variableValue === undefined) {
        variableValue = global.flowVariables[variableName];
      }


      if (variableValue !== null && variableValue !== undefined) {
        processedText = processedText.replace(
          match[0],
          variableValue.toString()
        );
      }
    }

    return processedText;
  }

  return text;
};

const compareValues = (value1: string, value2: string, operator: string): boolean => {
  if (!value1 && operator !== "isEmpty" && operator !== "isNotEmpty") {
    value1 = "";
  }

  if (!value2 && operator !== "isEmpty" && operator !== "isNotEmpty") {
    value2 = "";
  }


  const strValue1 = String(value1 || "").toLowerCase();
  const strValue2 = String(value2 || "").toLowerCase();


  const numValue1 = parseFloat(value1);
  const numValue2 = parseFloat(value2);

  logger.info(`Comparing values: "${value1}" ${operator} "${value2}" (lowercase: "${strValue1}" ${operator} "${strValue2}")`);

  switch (operator) {
    case "contains":
      return strValue1.includes(strValue2);
    case "equals":
      return strValue1 === strValue2;
    case "notEquals":
      return strValue1 !== strValue2;
    case "greaterThan":
      return !isNaN(numValue1) && !isNaN(numValue2) && numValue1 > numValue2;
    case "lessThan":
      return !isNaN(numValue1) && !isNaN(numValue2) && numValue1 < numValue2;
    case "greaterOrEqual":
      return !isNaN(numValue1) && !isNaN(numValue2) && numValue1 >= numValue2;
    case "lessOrEqual":
      return !isNaN(numValue1) && !isNaN(numValue2) && numValue1 <= numValue2;
    case "startsWith":
      return strValue1.startsWith(strValue2);
    case "endsWith":
      return strValue1.endsWith(strValue2);
    case "isEmpty":
      return !strValue1 || strValue1.trim() === "";
    case "isNotEmpty":
      return strValue1 && strValue1.trim() !== "";
    default:
      logger.error(`Unknown operator: ${operator}`);
      return false;
  }
};

const finalizeTriggeredFlow = async (
  ticket: Ticket,
  nodeSelected: any,
  companyId: number,
  finalStatus: string = "open"
) => {
  try {
    // Verificar se o ticket está com status "open" (fluxo disparado manualmente)
    if (ticket.status === "open") {
      logger.info(`[TICKET UPDATE] Finalizando fluxo disparado manualmente para ticket ${ticket.id}`);

      // Determinar status final baseado no nó ou usar "pending" como padrão
      let targetStatus = finalStatus;

      // Se o nó tem configuração de status final, usar essa configuração
      if (nodeSelected?.data?.finalStatus) {
        targetStatus = nodeSelected.data.finalStatus;
        logger.info(`[TICKET UPDATE] Status final definido pelo nó: ${targetStatus}`);
      }

      logger.info(`[TICKET UPDATE] Ticket ${ticket.id} será alterado para status: ${targetStatus}`);

      // Atualizar ticket para o status final
      await UpdateTicketService({
        ticketData: {
          status: targetStatus,
          userId: ticket.userId,
          flowWebhook: false,
          lastFlowId: null,
          hashFlowId: null,
          flowStopped: null,
          dataWebhook: null,
          isBot: false,
          isTransfered: false
        },
        ticketId: ticket.id,
        companyId
      });

      logger.info(`[TICKET UPDATE] Ticket ${ticket.id} atualizado com sucesso - Status: ${targetStatus}, FlowWebhook: false, LastFlowId: null`);

      // Criar log da finalização
      await CreateLogTicketService({
        userId: ticket.userId,
        ticketId: ticket.id,
        type: "open",
        queueId: ticket.queueId
      });

      logger.info(`[TICKET UPDATE] Log criado para finalização do fluxo - Ticket ${ticket.id}`);
    }
    logger.info(`[TICKET UPDATE] Log criado para finalização do fluxo - Ticket ${ticket.id}`);

  } catch (error) {
    logger.error(`[TICKET UPDATE ERROR] Erro ao finalizar fluxo disparado manualmente para ticket ${ticket.id}:`, error);
  }
};

export const ActionsWebhookService = async (
  whatsappId: number,
  idFlowDb: number,
  companyId: number,
  nodes: INodes[],
  connects: IConnections[],
  nextStage: string,
  dataWebhook: any,
  details: any,
  hashWebhookId: string,
  pressKey?: string,
  idTicket?: number,
  numberPhrase: "" | { number: string; name: string; email: string } = "",
  inputResponded: boolean = false,
  msg?: proto.IWebMessageInfo
): Promise<string> => {


  logger.info(`[ACTIONS WEBHOOK] ========== INICIANDO SERVIÇO ==========`);
  logger.info(`[ACTIONS WEBHOOK] WhatsApp ID: ${whatsappId}, Company ID: ${companyId}`);
  logger.info(`[ACTIONS WEBHOOK] Ticket ID: ${idTicket || 'N/A'}, Flow ID: ${idFlowDb}`);
  logger.info(`[ACTIONS WEBHOOK] Next Stage: ${nextStage}, PressKey: ${pressKey || 'N/A'}`);
  logger.info(`[ACTIONS WEBHOOK] Hash Webhook ID: ${hashWebhookId || 'N/A'}`);
  logger.info(`[ACTIONS WEBHOOK] Total de nós: ${nodes?.length || 0}, Total de conexões: ${connects?.length || 0}`);

  // ✅ VALIDAÇÃO DOS PARÂMETROS ESSENCIAIS
  if (!nodes || nodes.length === 0) {
    logger.error(`[ACTIONS WEBHOOK] ❌ Nenhum nó foi fornecido ao serviço!`);
    return "no_nodes";
  }

  if (!whatsappId || !companyId) {
    logger.error(`[ACTIONS WEBHOOK] ❌ WhatsApp ID ou Company ID não fornecidos!`);
    return "missing_ids";
  }

  try {
    const io = getIO()
    let next = nextStage;

    let createFieldJsonName = "";
    let ticket = null;
    const connectStatic = connects;
    if (numberPhrase === "") {
      const nameInput = details.inputs.find(item => item.keyValue === "nome");
      nameInput.data.split(",").map(dataN => {
        const lineToData = details.keysFull.find(item => item === dataN);
        let sumRes = "";
        if (!lineToData) {
          sumRes = dataN;
        } else {
          sumRes = constructJsonLine(lineToData, dataWebhook);
        }
        createFieldJsonName = createFieldJsonName + sumRes
      });
    } else {
      createFieldJsonName = numberPhrase.name;
    }


    if (idTicket) {
      const currentTicket = await Ticket.findByPk(idTicket);

      console.log(`[RDS-FLOW-DEBUG] Estado do ticket ${idTicket}: flowWebhook=${currentTicket?.flowWebhook}, lastFlowId=${currentTicket?.lastFlowId}, inputResponded=${inputResponded}, pressKey=${pressKey || 'undefined'}`);

      const isInitialStage = nextStage === "start" || nextStage === "1"; // normalmente o nó inicial é "start" ou "1"

      console.log(`[RDS-FLOW-DEBUG] Verificando início de fluxo: isInitialStage=${isInitialStage}, nextStage=${nextStage}`);

      if (!currentTicket?.flowWebhook || !currentTicket?.lastFlowId || isInitialStage || inputResponded || pressKey) {
        console.log(`[RDS-FLOW-DEBUG] Permitindo execução de fluxo para ticket ${idTicket}`);
      }
      else {
        console.log(`[FLOW SERVICE] Ticket ${idTicket} já em execução de fluxo, ignorando nova execução`);
        return "already_running";
      }

      if (pressKey) {
        console.log(`[FLOW SERVICE] Ticket ${idTicket} recebeu resposta do usuário: "${pressKey}", continuando fluxo`);
      } else if (isInitialStage) {
        console.log(`[FLOW SERVICE] Iniciando novo fluxo para o ticket ${idTicket} no estágio ${nextStage}`);
      }
    }

    ticket = await Ticket.findByPk(idTicket);
    if (ticket && !ticket.flowWebhook) {
      await ticket.update({
        flowWebhook: true,
        flowStopped: idFlowDb.toString(),
        hashFlowId: hashWebhookId
      });
    }



    let numberClient = "";

    if (numberPhrase === "") {
      const numberInput = details.inputs.find(
        item => item.keyValue === "celular"
      );

      numberInput.data.split(",").map(dataN => {
        const lineToDataNumber = details.keysFull.find(item => item === dataN);
        let createFieldJsonNumber = "";
        if (!lineToDataNumber) {
          createFieldJsonNumber = dataN;
        } else {
          createFieldJsonNumber = constructJsonLine(
            lineToDataNumber,
            dataWebhook
          );
        }

        numberClient = numberClient + createFieldJsonNumber;
      });
    } else {
      numberClient = numberPhrase.number;
    }

    numberClient = removerNaoLetrasNumeros(numberClient);

    if (numberClient.substring(0, 2) === "55") {
      if (parseInt(numberClient.substring(2, 4)) >= 31) {
        if (numberClient.length === 13) {
          numberClient =
            numberClient.substring(0, 4) + numberClient.substring(5, 13);
        }
      }
    }

    let createFieldJsonEmail = "";

    if (numberPhrase === "") {
      const emailInput = details.inputs.find(item => item.keyValue === "email");
      emailInput.data.split(",").map(dataN => {

        const lineToDataEmail = details.keysFull.find(item =>
          item.endsWith("email")
        );

        let sumRes = "";
        if (!lineToDataEmail) {
          sumRes = dataN;
        } else {
          sumRes = constructJsonLine(lineToDataEmail, dataWebhook);
        }

        createFieldJsonEmail = createFieldJsonEmail + sumRes;
      });
    } else {
      createFieldJsonEmail = numberPhrase.email;
    }

    const lengthLoop = nodes.length;

    const whatsapp = await Whatsapp.findByPk(whatsappId);

    if (whatsapp.status !== "CONNECTED") {
      return;
    }

    let execCount = 0;

    let execFn = "";



    let noAlterNext = false;

    for (var i = 0; i < lengthLoop; i++) {
      logger.info(`[FLOW LOOP] ========== Iteração ${i + 1}/${lengthLoop} - Next: ${next}, ExecCount: ${execCount} ==========`);

      // ✅ Verificar se ainda há próximo nó válido
      if (!next || next === "") {
        logger.warn(`[FLOW LOOP] Next está vazio na iteração ${i + 1} - finalizando loop`);
        break;
      }

      let nodeSelected: any;
      let ticketInit: Ticket;
      if (idTicket) {
        ticketInit = await Ticket.findOne({
          where: { id: idTicket, whatsappId }
        });

        if (ticketInit.status === "closed") {
          if (numberPhrase === "") {
            logger.info(`[FLOW LOOP] Ticket ${idTicket} está fechado - encerrando fluxo`);
            break;
          }
        }

      }

      if (pressKey) {
        logger.info(`[FLOW] ========== PROCESSANDO COM PRESSKEY ==========`);
        logger.info(`[FLOW] PressKey: ${pressKey}`);
        logger.info(`[FLOW] ExecFn: ${execFn || 'undefined'}`);
        logger.info(`[FLOW] Next: ${next}`);

        if (pressKey === "parar") {
          if (idTicket) {
            ticketInit = await Ticket.findOne({
              where: { id: idTicket, whatsappId }
            });

            logger.info(`[TICKET UPDATE] Parando fluxo para ticket ${ticketInit.id} - Status alterado para closed`);

            await ticket.update({
              status: "closed"
            });

            logger.info(`[TICKET UPDATE] Ticket ${ticketInit.id} fechado com sucesso`);
          }
          break;
        }

        // ✅ CORRIGIDO: Buscar o nó real ao invés de criar temporário
        if (execFn === "" || !execFn) {
          // Se execFn está vazio, significa que estamos no mesmo nó (menu aguardando resposta)
          // Buscar o nó usando 'next' que contém o ID do nó menu
          logger.info(`[FLOW] ExecFn vazio - buscando nó usando next: ${next}`);
          nodeSelected = nodes.filter(node => node.id === next)[0];

          if (nodeSelected) {
            logger.info(`[FLOW] ✅ Nó encontrado via next: ${nodeSelected.id} (tipo: ${nodeSelected.type})`);
          } else {
            logger.error(`[FLOW] ❌ Nó ${next} NÃO ENCONTRADO! Criando nó temporário`);
            nodeSelected = { type: "menu" };
          }
        } else {
          logger.info(`[FLOW] Buscando nó com ID: ${execFn}`);
          nodeSelected = nodes.filter(node => node.id === execFn)[0];
          if (nodeSelected) {
            logger.info(`[FLOW] ✅ Nó encontrado: ${nodeSelected.id} (tipo: ${nodeSelected.type})`);
          } else {
            logger.error(`[FLOW] ❌ Nó ${execFn} NÃO ENCONTRADO!`);
          }
        }
      } else {
        logger.info(`[FLOW] ========== PROCESSANDO SEM PRESSKEY ==========`);
        logger.info(`[FLOW] Buscando nó com ID: ${next}`);
        const otherNode = nodes.filter((node) => node.id === next)[0]
        if (otherNode) {
          nodeSelected = otherNode;
          logger.info(`[FLOW] ✅ Nó encontrado: ${nodeSelected.id} (tipo: ${nodeSelected.type})`);
        } else {
          logger.error(`[FLOW] ❌ Nó ${next} NÃO ENCONTRADO!`);
        }
      }

      // ✅ CORRIGIDO: Verificar se nodeSelected foi encontrado antes de continuar
      if (!nodeSelected) {
        logger.error(`[FLOW ERROR] Nó não encontrado - Next: ${next}, ExecFn: ${execFn}`);
        logger.error(`[FLOW ERROR] Nós disponíveis: ${nodes.map(n => n.id).join(', ')}`);
        break;
      }

      console.log(`[FLOW LOOP] Nó selecionado: ${nodeSelected?.id} (${nodeSelected?.type})`);

      let msg;

      // Função auxiliar para garantir que o ticket esteja disponível
      const ensureTicket = async () => {
        if (!ticket && idTicket) {
          console.log(`Recuperando ticket ${idTicket} para o nó tipo ${nodeSelected.type}`);
          ticket = await Ticket.findOne({
            where: { id: idTicket, whatsappId }
          });

          if (!ticket) {
            console.error(`Não foi possível encontrar o ticket ${idTicket} para o nó ${nodeSelected.type}`);
            return false;
          }
        }
        return true;
      };

      logger.info(`[FLOW NODE] Processando nó - ID: ${nodeSelected.id}, Tipo: ${nodeSelected.type}`);

      // ✅ Log adicional para debug de erros
      if (nodeSelected.type === "httpRequest") {
        logger.info(`[HTTP REQUEST NODE] Dados do nó: ${JSON.stringify({
          id: nodeSelected.id,
          url: nodeSelected.data?.url || 'undefined',
          method: nodeSelected.data?.method || 'undefined',
          hasHeaders: !!nodeSelected.data?.headersString,
          hasBody: !!nodeSelected.data?.requestBody
        })}`);
      }

      if (nodeSelected.type === "tag") {
        const tagFind = await Tag.findByPk(nodeSelected.data.tag.id);

        const teste = { contactId: ticket.contactId, tags: [tagFind], companyId: companyId }

        const tags = await SyncTags(teste);

        logger.info(`[TICKET TAG] Tag ${tagFind.name} adicionada ao contato ${ticket.contactId} do ticket ${ticket.id}`);
      }

      if (nodeSelected.type === "removeTag") {
        await ensureTicket();

        if (!ticket) {
          logger.error(`[REMOVE TAG NODE] Ticket não encontrado para processar remoção de tag`);
          return;
        }

        try {
          const tagFind = await Tag.findByPk(nodeSelected.data.tag.id);

          if (!tagFind) {
            logger.error(`[REMOVE TAG NODE] Tag com ID ${nodeSelected.data.tag.id} não encontrada`);
            return;
          }

          // Importar o serviço de remoção de tags
          const { RemoveTagsService } = await import("../TagServices/RemoveTagsService");

          // Remover a tag do contato
          await RemoveTagsService({
            contactId: ticket.contactId,
            tags: [tagFind],
            companyId: companyId
          });

          logger.info(`[REMOVE TAG NODE] Tag ${tagFind.name} removida do contato ${ticket.contactId} do ticket ${ticket.id}`);

        } catch (error) {
          logger.error(`[REMOVE TAG NODE] Erro ao remover tag do contato:`, error);
        }
      }

      if (nodeSelected.type === "message") {
        if (dataWebhook === "") {
          msg = {
            body: nodeSelected.data.label,
            number: numberClient,
            companyId: companyId
          };
        } else {
          const dataLocal = {
            nome: createFieldJsonName,
            numero: numberClient,
            email: createFieldJsonEmail
          };
          msg = {
            body: replaceMessages(
              nodeSelected.data.label,
              details,
              dataWebhook,
              dataLocal,
              idTicket
            ),
            number: numberClient,
            companyId: companyId
          };
        }

        console.log("msg", msg);

        if (whatsapp.channel === "whatsapp") {
          await SendWhatsAppMessage({
            body: msg.body,
            ticket: ticket,
            quotedMsg: null
          });
        }

        if (whatsapp.channel === "whatsapp_oficial") {
          await SendWhatsAppOficialMessage({
            body: msg.body,
            ticket: ticket,
            quotedMsg: null,
            type: 'text',
            media: null,
            vCard: null
          });
        }

        await intervalWhats("1");
      }

      if (nodeSelected.type === "openai" || nodeSelected.type === "gemini") {
        try {
          // ✅ CORRIGIDO: Verificar se o ticket foi aceito antes de ativar IA
          if (ticket.status === "open" && ticket.userId) {
            logger.info(`[${nodeSelected.type.toUpperCase()} NODE] Ticket ${ticket.id} já foi aceito por usuário ${ticket.userId} - pulando ativação de IA`);
            continue;
          }

          const {
            name = "",
            prompt = "",
            voice = "texto",
            voiceKey = "",
            voiceRegion = "",
            maxTokens = 1000,
            temperature = 0.7,
            apiKey = "",
            queueId = 0,
            maxMessages = 10,
            model = "",
            provider = nodeSelected.type,
            flowMode = "permanent",
            maxInteractions = 0,
            continueKeywords = ["continuar", "próximo", "avançar", "prosseguir"],
            completionTimeout = 0,
            objective = "",
            autoCompleteOnObjective = false
          } = nodeSelected.data.typebotIntegration as IOpenAi;

          if (!apiKey || !model) {
            logger.error(`[${provider.toUpperCase()} NODE] Configurações obrigatórias não encontradas`);
            continue;
          }

          const finalVoice = provider === "gemini" ? "texto" : voice;

          const aiSettings: IOpenAi = {
            name,
            prompt,
            voice: finalVoice,
            voiceKey: provider === "openai" ? voiceKey : "",
            voiceRegion: provider === "openai" ? voiceRegion : "",
            maxTokens: Number(maxTokens) || 1000,
            temperature: Number(temperature) || 0.7,
            apiKey,
            queueId: Number(queueId) || 0,
            maxMessages: Number(maxMessages) || 10,
            model,
            provider,
            flowMode,
            maxInteractions: Number(maxInteractions) || 0,
            continueKeywords,
            completionTimeout: Number(completionTimeout) || 0,
            objective,
            autoCompleteOnObjective
          };

          logger.info(`[${provider.toUpperCase()} NODE] Ativando modo ${provider.toUpperCase()} para ticket ${ticket.id} (${flowMode})`);

          if (flowMode === "permanent") {
            // MODO PERMANENTE: Para o fluxo e fica em IA
            await ticket.update({
              flowWebhook: false,
              lastFlowId: null,
              hashFlowId: null,
              flowStopped: null,
              useIntegration: true,
              isBot: true,
              status: "pending",
              dataWebhook: {
                type: provider,
                settings: aiSettings,
                mode: "permanent",
                awaitingUserResponse: true // ✅ AGUARDA PRIMEIRA RESPOSTA DO USUÁRIO
              }
            });

            logger.info(`[${provider.toUpperCase()} NODE] Modo permanente ativado`);

          } else {
            // MODO TEMPORÁRIO: Mantém informações do fluxo
            const nextConnection = connects.filter(
              connect => connect.source === nodeSelected.id && connect.sourceHandle === "a"
            )[0];

            await ticket.update({
              flowWebhook: true,
              lastFlowId: nodeSelected.id,
              hashFlowId: hashWebhookId,
              flowStopped: idFlowDb.toString(),
              useIntegration: true,
              isBot: true,
              dataWebhook: {
                type: provider,
                settings: aiSettings,
                mode: "temporary",
                awaitingUserResponse: true, // ✅ AGUARDA PRIMEIRA RESPOSTA DO USUÁRIO
                flowContinuation: {
                  nextNodeId: nextConnection?.target,
                  interactionCount: 0,
                  startTime: new Date().toISOString(),
                  originalDataWebhook: dataWebhook
                }
              }
            });

            logger.info(`[${provider.toUpperCase()} NODE] Modo temporário ativado`);
          }

          // ✅ ENVIAR MENSAGEM DE BOAS-VINDAS IMEDIATAMENTE
          if (name) {
            const welcomeMessage = objective
              ? `Olá! Sou ${name}. ${objective}`
              : flowMode === "temporary" && continueKeywords?.length > 0
                ? `Olá! Sou ${name}. Como posso ajudá-lo? (Digite "${continueKeywords[0]}" quando quiser prosseguir)`
                : `Olá! Sou ${name}. Como posso ajudá-lo?`;

            logger.info(`[${provider.toUpperCase()} NODE] Enviando boas-vindas para ticket ${ticket.id}`);

            if (whatsapp.channel === "whatsapp") {
              await SendWhatsAppMessage({ body: welcomeMessage, ticket, quotedMsg: null });
            }

            if (whatsapp.channel === "whatsapp_oficial") {
              await SendWhatsAppOficialMessage({
                body: welcomeMessage,
                ticket: ticket,
                quotedMsg: null,
                type: 'text',
                media: null,
                vCard: null
              });
            }
          }

          // ✅ PARAR FLUXO E AGUARDAR RESPOSTA DO USUÁRIO
          break;

        } catch (error) {
          logger.error(`[AI NODE] Erro ao processar nó ${nodeSelected.type}:`, error);
          continue;
        }
      }

      if (nodeSelected.type === "input") {
        try {
          // Garantir que o ticket esteja disponível
          if (!ticket && idTicket) {
            ticket = await Ticket.findOne({
              where: { id: idTicket, whatsappId }
            });

            if (!ticket) {
              continue;
            }
          }

          let question = nodeSelected.data.question || "";
          const variableName = nodeSelected.data.variableName || "";

          if (!variableName) {
            continue;
          }

          if (question.includes("${")) {
            const dataLocal = {
              nome: createFieldJsonName,
              numero: numberClient,
              email: createFieldJsonEmail
            };

            question = replaceMessages(
              question,
              details,
              dataWebhook,
              dataLocal,
              idTicket
            );
          }

          // Verifica se este input específico já foi respondido
          const inputIdentifier = `${ticket.id}_${variableName}`;
          const thisInputResponded = global.flowVariables[inputIdentifier];
          const alwaysAsk = nodeSelected.data?.alwaysAsk || false;

          logger.info(`[INPUT NODE] Debug - Ticket ${ticket.id}, Variable: ${variableName}, InputIdentifier: ${inputIdentifier}`);
          logger.info(`[INPUT NODE] Debug - inputResponded: ${inputResponded}, thisInputResponded: ${thisInputResponded}, alwaysAsk: ${alwaysAsk}`);

          // Se inputResponded é true E este input específico já foi respondido,
          // significa que estamos retomando o fluxo após uma resposta deste input específico
          if (inputResponded && thisInputResponded && !alwaysAsk) {
            logger.info(`[INPUT NODE] Retomando fluxo após resposta deste input específico - Ticket ${ticket.id}`);

            // Recuperar o valor do próximo nó salvo anteriormente
            const savedNext = global.flowVariables[`${inputIdentifier}_next`];
            logger.info(`[INPUT NODE] Próximo nó salvo: ${savedNext}`);

            if (savedNext) {
              next = savedNext;
              // Limpar a variável após uso
              delete global.flowVariables[`${inputIdentifier}_next`];
              logger.info(`[INPUT NODE] Continuando para próximo nó: ${next}`);
            } else {
              logger.warn(`[INPUT NODE] Nenhum próximo nó encontrado para ${inputIdentifier}`);
            }

            await ticket.update({
              dataWebhook: {
                ...ticket.dataWebhook,
                waitingInput: false
              }
            });

            // Pular para o próximo nó sem processar mais este nó
            continue;
          } else if (!inputResponded && thisInputResponded && !alwaysAsk) {
            // Se não estamos retomando o fluxo mas o input já foi respondido, pular
            // EXCETO se alwaysAsk estiver ativado
            logger.info(`[INPUT NODE] Input já respondido anteriormente - pulando - Ticket ${ticket.id}`);
            continue;
          } else {
            logger.info(`[INPUT NODE] Processando novo input - Ticket ${ticket.id}`);

            // ✅ CORRIGIDO: Verificar se o ticket está "open" antes de enviar mensagem do Input
            // Recarregar o ticket para obter o status mais atualizado
            if (idTicket) {
              const currentTicket = await Ticket.findByPk(idTicket);
              if (currentTicket && currentTicket.status === "open") {
                logger.info(`[INPUT NODE] ⚠️ Ticket ${idTicket} está OPEN - Parando fluxo e não enviando mensagem do Input`);
                // Limpar os dados do webhook relacionados ao Input
                await currentTicket.update({
                  dataWebhook: {
                    ...currentTicket.dataWebhook,
                    waitingInput: false,
                    inputVariableName: null,
                    inputIdentifier: null,
                    nextNodeId: null
                  }
                });
                return "stopped_by_open_ticket";
              }
              // Atualizar a referência do ticket
              ticket = currentTicket;
            }

            // Enviar a pergunta e aguardar resposta
            await intervalWhats("1");
            typeSimulation(ticket, "composing");

            if (whatsapp.channel === "whatsapp_oficial") {
              await SendWhatsAppOficialMessage({
                body: question,
                ticket: ticket,
                quotedMsg: null,
                type: 'text',
                media: null,
                vCard: null
              });
            }

            if (whatsapp.channel === "whatsapp") {
              await SendWhatsAppMessage({
                body: question,
                ticket: ticket,
                quotedMsg: null
              });
            } else {
              await SendMessage(whatsapp, {
                number: numberClient,
                body: question
              });
            }


            if (ticket) {
              // Salvar a conexão de saída para ser usada quando o fluxo for retomado
              const outputConnection = connects.filter(
                connect => connect.source === nodeSelected.id && connect.sourceHandle === "a"
              )[0];

              const nextNodeId = outputConnection ? outputConnection.target : next;

              logger.info(`[TICKET UPDATE] Preparando ticket ${ticket.id} para aguardar input - Status: pending, LastFlowId: ${nodeSelected.id}, WaitingInput: true`);

              await ticket.update({
                status: "pending",
                lastFlowId: nodeSelected.id,
                flowWebhook: true,
                hashFlowId: hashWebhookId,
                flowStopped: idFlowDb.toString(),
                dataWebhook: {
                  ...ticket.dataWebhook,
                  flowId: idFlowDb, // persistir flowId para retomadas resilientes
                  waitingInput: true,
                  inputVariableName: variableName,
                  inputIdentifier: inputIdentifier,
                  nextNodeId: nextNodeId // Salvar no dataWebhook também como backup
                }
              });

              logger.info(`[TICKET UPDATE] Ticket ${ticket.id} configurado para aguardar input - Variable: ${variableName}, NextNodeId: ${nextNodeId}`);

              global.flowVariables = global.flowVariables || {};
              global.flowVariables[`${inputIdentifier}_next`] = nextNodeId;

              break; // Parar o fluxo para aguardar a resposta
            }
          }
        } catch (error) {
        }
      }

      if (nodeSelected.type === "conditionCompare") {
        try {
          const leftValue = processVariableValue(
            nodeSelected.data.leftValue || "",
            dataWebhook,
            idTicket
          );

          const rightValue = nodeSelected.data.operator !== "isEmpty" &&
            nodeSelected.data.operator !== "isNotEmpty"
            ? processVariableValue(
              nodeSelected.data.rightValue || "",
              dataWebhook,
              idTicket
            )
            : "";

          const comparisonResult = compareValues(
            leftValue,
            rightValue,
            nodeSelected.data.operator
          );

          const condition = comparisonResult ? "true" : "false";

          const connectionSelect = connectStatic.filter(
            item => item.source === nodeSelected.id && item.sourceHandle === condition
          );

          if (connectionSelect && connectionSelect.length > 0) {
            next = connectionSelect[0].target;
            noAlterNext = true;
            logger.info(`[FLOW DEBUG] Condição ${condition} - próximo nó: ${next}`);
            continue;
          } else {
            logger.warn(`[FlowBuilder] No connection found for condition ${condition} on node ${nodeSelected.id}`);

            const allConnections = connectStatic.filter(
              item => item.source === nodeSelected.id
            );

            // ✅ CORRIGIDO: Se não encontrou conexão para a condição, tentar usar a primeira disponível
            if (allConnections && allConnections.length > 0) {
              next = allConnections[0].target;
              noAlterNext = true;
              logger.warn(`[FLOW DEBUG] Usando primeira conexão disponível: ${next}`);
              continue;
            }
          }
        } catch (error) {
          logger.error(`[FLOW ERROR] Erro ao processar condição: ${error}`);

          const connectionFalse = connectStatic.filter(
            item => item.source === nodeSelected.id && item.sourceHandle === "false"
          );

          if (connectionFalse && connectionFalse.length > 0) {
            next = connectionFalse[0].target;
            noAlterNext = true;
            logger.info(`[FLOW DEBUG] Erro na condição - usando saída false: ${next}`);
            continue;
          }
        }
      }

      if (nodeSelected.type === "variable") {
        try {
          const variableName = nodeSelected.data.variableName;
          let variableValue = nodeSelected.data.variableValue;

          if (variableName) {
            // Processar o valor da variável usando replaceMessages se contiver variáveis
            if (typeof variableValue === "string" && variableValue.includes("${")) {
              const dataLocal = {
                nome: createFieldJsonName,
                numero: numberClient,
                email: createFieldJsonEmail
              };

              variableValue = replaceMessages(
                variableValue,
                details,
                dataWebhook,
                dataLocal,
                idTicket
              );
            }

            global.flowVariables = global.flowVariables || {};

            // Salvar a variável globalmente
            global.flowVariables[variableName] = variableValue;

            // Se temos um ticketId, salvar também como variável específica do ticket
            if (idTicket) {
              const ticketSpecificVar = `${idTicket}_${variableName}`;
              global.flowVariables[ticketSpecificVar] = variableValue;
            }
          }
        } catch (error) {
        }
      }

      if (nodeSelected.type === "httpRequest") {
        try {
          const {
            url,
            method,
            requestBody,
            headersString,
            queryParams,
            saveVariables,
            responseVariables,
            timeout
          } = nodeSelected.data;

          // ✅ VALIDAÇÃO MELHORADA: Verificar se URL é válida antes de continuar
          if (!url || typeof url !== 'string' || url.trim().length === 0) {
            logger.warn(`[HTTP REQUEST NODE] URL vazia ou inválida no nó ${nodeSelected.id} - pulando execução`);
            continue;
          }

          // ✅ Verificar se URL contém variáveis não substituídas
          if (url.includes("${") && url.includes("}")) {
            const unresolvedVars = url.match(/\${([^}]+)}/g);
            if (unresolvedVars) {
              logger.warn(`[HTTP REQUEST NODE] URL contém variáveis não resolvidas: ${unresolvedVars.join(', ')} - pulando execução`);
              continue;
            }
          }

          let headers = {};
          try {
            if (headersString && typeof headersString === "string") {
              headers = JSON.parse(headersString);
            } else if (typeof headersString === "object") {
              headers = headersString;
            }
          } catch (err) {
            console.error(
              "[httpRequestNode] Erro ao parsear headers JSON:",
              err
            );
          }

          let body = null;
          if (
            ["POST", "PUT", "PATCH", "DELETE"].includes(
              method?.toUpperCase() || "GET"
            )
          ) {
            try {
              body =
                requestBody && typeof requestBody === "string"
                  ? requestBody.trim().startsWith("{")
                    ? JSON.parse(requestBody)
                    : requestBody
                  : null;
            } catch (err) {
              console.error(
                "[httpRequestNode] Erro ao parsear body JSON, usando como string:",
                err
              );
              body = requestBody;
            }
          }

          const requestTimeout = timeout || 10000;

          logger.info(`[HTTP REQUEST NODE] Executando requisição - URL: ${url}, Method: ${method || "GET"}`);

          const response = await makeHttpRequest(
            url,
            method || "GET",
            headers,
            body,
            queryParams,
            requestTimeout
          );

          // ✅ Verificar se houve erro na resposta
          if (response.error) {
            logger.error(`[HTTP REQUEST NODE] Requisição falhou: ${response.message} - Status: ${response.status}`);
            // Continuar o fluxo mesmo com erro
            global.flowVariables = global.flowVariables || {};
            global.flowVariables["apiResponse"] = null;
            global.flowVariables["apiError"] = response.message;
            continue;
          }

          logger.info(`[HTTP REQUEST NODE] Requisição bem-sucedida - Status: ${response.status}`);

          global.flowVariables = global.flowVariables || {};
          global.flowVariables["apiResponse"] = response.data;

          if (response.data) {
            let variablesToProcess = [];

            if (
              responseVariables &&
              Array.isArray(responseVariables) &&
              responseVariables.length > 0
            ) {
              variablesToProcess = responseVariables;
            } else if (
              saveVariables &&
              Array.isArray(saveVariables) &&
              saveVariables.length > 0
            ) {
              variablesToProcess = saveVariables.map(item => ({
                path: item.path,
                variableName: item.variable
              }));
            } else if (
              nodeSelected.data.responseVariables &&
              Array.isArray(nodeSelected.data.responseVariables)
            ) {
              variablesToProcess = nodeSelected.data.responseVariables;
            } else if (
              nodeSelected.data.saveVariables &&
              Array.isArray(nodeSelected.data.saveVariables)
            ) {
              variablesToProcess = nodeSelected.data.saveVariables.map(
                item => ({
                  path: item.path,
                  variableName: item.variable || item.variableName
                })
              );
            }

            if (variablesToProcess && variablesToProcess.length > 0) {
              for (let i = 0; i < variablesToProcess.length; i++) {
                const extractor = variablesToProcess[i];

                if (extractor && extractor.path && extractor.variableName) {
                  const parts = extractor.path.split(".");
                  let value = response.data;
                  let pathValid = true;

                  for (const part of parts) {
                    if (value && typeof value === "object" && part in value) {
                      value = value[part];
                    } else {
                      pathValid = false;
                      break;
                    }
                  }

                  if (pathValid && value !== undefined && value !== null) {
                    if (typeof setFlowVariable === "function") {
                      setFlowVariable(extractor.variableName, value);
                    } else {
                      global.flowVariables[extractor.variableName] = value;
                    }
                  }
                }
              }
            }
          }
        } catch (error) {
          logger.error(`[HTTP REQUEST NODE] Erro ao processar nó HTTP Request: ${error.message}`);
          logger.error(`[HTTP REQUEST NODE] Stack: ${error.stack}`);

          // ✅ Salvar informações do erro nas variáveis globais
          global.flowVariables = global.flowVariables || {};
          global.flowVariables["apiResponse"] = null;
          global.flowVariables["apiError"] = error.message;

          // ✅ Continuar o fluxo mesmo com erro (não quebrar o fluxo inteiro)
          logger.info(`[HTTP REQUEST NODE] Continuando fluxo apesar do erro no nó ${nodeSelected.id}`);
        }
      }

      if (nodeSelected.type === "ticket") {
        if (!(await ensureTicket())) continue;

        console.log('ticket.id', ticket?.id)
        console.log('queue.id', nodeSelected?.data?.queue?.id)
        console.log('companyId', companyId)
        console.log('nodeSelected.id', nodeSelected.id)
        console.log('hashWebhookId', hashWebhookId)
        console.log('idFlowDb', idFlowDb)
        console.log('ticket.userId', ticket?.userId)

        const queue = await ShowQueueService(nodeSelected?.data?.queue?.id, companyId)

        logger.info(`[TICKET UPDATE] Atualizando ticket ${ticket.id} para fila ${queue.id} (${queue.name}) - Status: pending, FlowWebhook: true`);

        await ticket.update({
          status: 'pending',
          queueId: queue.id,
          userId: ticket.userId,
          companyId: companyId,
          flowWebhook: true,
          lastFlowId: nodeSelected.id,
          hashFlowId: hashWebhookId,
          flowStopped: idFlowDb.toString()
        });

        logger.info(`[TICKET UPDATE] Ticket ${ticket.id} atualizado para fila ${queue.name} - LastFlowId: ${nodeSelected.id}, HashFlowId: ${hashWebhookId}`);

        await FindOrCreateATicketTrakingService({
          ticketId: ticket.id,
          companyId,
          whatsappId: ticket.whatsappId,
          userId: ticket.userId
        })

        await UpdateTicketService({
          ticketData: {
            status: "pending",
            queueId: queue.id
          },
          ticketId: ticket.id,
          companyId
        })

        logger.info(`[TICKET UPDATE] UpdateTicketService chamado para ticket ${ticket.id} - QueueId: ${queue.id}`);

        await CreateLogTicketService({
          ticketId: ticket.id,
          type: "queue",
          queueId: queue.id
        });

        logger.info(`[TICKET LOG] Log de fila criado para ticket ${ticket.id} - QueueId: ${queue.id}`);

        let settings = await CompaniesSettings.findOne({
          where: {
            companyId: companyId
          }
        })

        // const { queues, greetingMessage, maxUseBotQueues, timeUseBotQueues } = await ShowWhatsAppService(whatsappId, companyId);

        // if (greetingMessage.length > 1) {
        //   const body = formatBody(`${greetingMessage}`, ticket);

        //   const ticketDetails = await ShowTicketService(ticket.id, companyId);

        //   logger.info(`[TICKET UPDATE] Atualizando lastMessage do ticket ${ticket.id} com mensagem de saudação da fila`);

        //   await ticketDetails.update({
        //     lastMessage: formatBody(queue.greetingMessage, ticket.contact)
        //   });

        //   logger.info(`[TICKET UPDATE] LastMessage atualizada para ticket ${ticket.id}`);

        //   if (whatsapp.channel === "whatsapp") {
        //     await SendWhatsAppMessage({
        //       body,
        //       ticket: ticketDetails,
        //       quotedMsg: null
        //     });
        //   }

        //   if (whatsapp.channel === "whatsapp_oficial") {
        //     await SendWhatsAppOficialMessage({
        //       body: body,
        //       ticket: ticketDetails,
        //       quotedMsg: null,
        //       type: 'text',
        //       media: null,
        //       vCard: null
        //     });
        //   }

        //   SetTicketMessagesAsRead(ticketDetails);
        // }
      }

      if (nodeSelected.type === "singleBlock") {
        logger.info(`[SINGLE BLOCK] ========== PROCESSANDO NÓ SINGLEBLOCK ==========`);
        logger.info(`[SINGLE BLOCK] Node ID: ${nodeSelected.id}`);
        logger.info(`[SINGLE BLOCK] Ticket ID: ${ticket?.id}`);

        if (!(await ensureTicket())) {
          logger.warn(`[SINGLE BLOCK] ❌ Ticket não disponível, pulando bloco`);
          continue;
        }

        const publicFolder = path.resolve(__dirname, "..", "..", "..", "public");
        logger.info(`[SINGLE BLOCK] Public Folder: ${publicFolder}`);

        const sequence = nodeSelected.data.seq;
        logger.info(`[SINGLE BLOCK] Sequência de elementos: ${JSON.stringify(sequence)}`);
        logger.info(`[SINGLE BLOCK] Total de elementos: ${sequence?.length || 0}`);

        if (!sequence || sequence.length === 0) {
          logger.warn(`[SINGLE BLOCK] ⚠️ Nenhum elemento na sequência, pulando bloco`);
          continue;
        }

        for (var iLoc = 0; iLoc < sequence.length; iLoc++) {
          let elementNowSelected;
          try {
            elementNowSelected = sequence[iLoc];
            logger.info(`[SINGLE BLOCK] ========== Processando elemento ${iLoc + 1}/${sequence.length}: ${elementNowSelected} ==========`);

            if (elementNowSelected.includes("message")) {
              logger.info(`[SINGLE BLOCK - MESSAGE] Processando mensagem de texto`);

              try {
                const bodyFor = nodeSelected.data.elements.filter(
                  item => item.number === elementNowSelected
                )[0].value;

                logger.info(`[SINGLE BLOCK - MESSAGE] Corpo da mensagem: ${bodyFor?.substring(0, 100)}...`);

                const ticketDetails = await ShowTicketService(ticket.id, companyId);
                logger.info(`[SINGLE BLOCK - MESSAGE] Ticket Details obtido: ${ticketDetails.id}`);

                if (dataWebhook === "") {
                  msg = bodyFor;
                } else {
                  const dataLocal = {
                    nome: createFieldJsonName,
                    numero: numberClient,
                    email: createFieldJsonEmail
                  };
                  msg = replaceMessages(bodyFor, details, dataWebhook, dataLocal, idTicket);
                }

                logger.info(`[SINGLE BLOCK - MESSAGE] Mensagem processada (${msg?.length || 0} caracteres)`);
                logger.info(`[SINGLE BLOCK - MESSAGE] Canal: ${whatsapp.channel}`);

                if (whatsapp.channel === "whatsapp") {
                  logger.info(`[SINGLE BLOCK - MESSAGE] Enviando via Baileys`);
                  await SendMessage(whatsapp, {
                    number: numberClient,
                    body: msg,
                    mediaPath: null
                  });
                  logger.info(`[SINGLE BLOCK - MESSAGE] ✅ Enviado via Baileys`);
                }

                if (whatsapp.channel === "whatsapp_oficial") {
                  logger.info(`[SINGLE BLOCK - MESSAGE] Enviando via API Oficial`);
                  await SendWhatsAppOficialMessage({
                    body: msg,
                    ticket: ticketDetails,
                    quotedMsg: null,
                    type: 'text',
                    media: null,
                    vCard: null
                  });
                  logger.info(`[SINGLE BLOCK - MESSAGE] ✅ Enviado via API Oficial`);
                }

                SetTicketMessagesAsRead(ticketDetails);

                logger.info(`[SINGLE BLOCK - MESSAGE] Atualizando lastMessage do ticket ${ticket.id}`);

                await ticketDetails.update({
                  lastMessage: formatBody(bodyFor, ticket.contact)
                });

                logger.info(`[SINGLE BLOCK - MESSAGE] ✅ LastMessage atualizada`);

                await intervalWhats("1");
              } catch (error) {
                logger.error(`[SINGLE BLOCK - MESSAGE] ❌ Erro ao processar mensagem: ${error?.message || error}`);
                logger.error(`[SINGLE BLOCK - MESSAGE] Stack: ${error?.stack || 'N/A'}`);
                throw error; // Re-lançar para ser capturado pelo catch principal
              }
            }

            if (elementNowSelected.includes("interval")) {
              try {
                const intervalValue = nodeSelected.data.elements.filter(
                  item => item.number === elementNowSelected
                )[0].value;

                logger.info(`[SINGLE BLOCK - INTERVAL] Aguardando ${intervalValue} segundos`);
                await intervalWhats(intervalValue);
                logger.info(`[SINGLE BLOCK - INTERVAL] ✅ Intervalo concluído`);
              } catch (error) {
                logger.error(`[SINGLE BLOCK - INTERVAL] ❌ Erro no intervalo: ${error?.message || error}`);
                throw error;
              }
            }

            if (elementNowSelected.includes("img")) {
              logger.info(`[FLOW MEDIA - IMG] ========== PROCESSANDO ENVIO DE IMAGEM ==========`);

              const filePath = path.join(publicFolder, `company${companyId}/flow`, nodeSelected.data.elements.filter(item => item.number === elementNowSelected)[0].value);
              logger.info(`[FLOW MEDIA - IMG] FilePath: ${filePath}`);
              logger.info(`[FLOW MEDIA - IMG] Company ID: ${companyId}`);
              logger.info(`[FLOW MEDIA - IMG] WhatsApp Channel: ${whatsapp.channel}`);

              const ticketInt = await Ticket.findOne({ where: { id: ticket.id } });
              logger.info(`[FLOW MEDIA - IMG] Ticket ID: ${ticketInt?.id}`);

              if (whatsapp.channel === "whatsapp") {
                logger.info(`[FLOW MEDIA - IMG] Enviando via Baileys (WhatsApp Web)`);
                await SendWhatsAppMediaFlow({
                  media: filePath,
                  ticket: ticketInt,
                  whatsappId: whatsapp.id,
                  isRecord: nodeSelected.data.elements.filter(item => item.number === elementNowSelected)[0].record
                });
                logger.info(`[FLOW MEDIA - IMG] ✅ Imagem enviada com sucesso via Baileys`);
              }

              if (whatsapp.channel === "whatsapp_oficial") {
                logger.info(`[FLOW MEDIA - IMG] Enviando via API Oficial`);

                const fileName = obterNomeEExtensaoDoArquivo(filePath);
                logger.info(`[FLOW MEDIA - IMG] FileName: ${fileName}`);

                // Determinar mimetype pela extensão
                const lower = (fileName || "").toLowerCase();
                let mime = "image/jpeg";
                if (lower.endsWith(".png")) mime = "image/png";
                else if (lower.endsWith(".jpg") || lower.endsWith(".jpeg")) mime = "image/jpeg";
                else if (lower.endsWith(".gif")) mime = "image/gif";
                else if (lower.endsWith(".webp")) mime = "image/webp";

                logger.info(`[FLOW MEDIA - IMG] MimeType detectado: ${mime}`);

                // Verificar se arquivo existe antes de enviar
                try {
                  const fs = await import("fs");
                  if (!fs.existsSync(filePath)) {
                    logger.error(`[FLOW MEDIA - IMG] ❌ Arquivo de imagem não encontrado: ${filePath}`);
                  } else {
                    logger.info(`[FLOW MEDIA - IMG] ✅ Arquivo existe, preparando envio...`);

                    const mediaSrc = {
                      fieldname: 'medias',
                      originalname: fileName,
                      encoding: '7bit',
                      mimetype: mime,
                      filename: fileName,
                      path: filePath
                    } as Express.Multer.File

                    logger.info(`[FLOW MEDIA - IMG] MediaSrc: ${JSON.stringify(mediaSrc)}`);

                    await SendWhatsAppOficialMessage({
                      body: "",
                      ticket: ticketInt,
                      quotedMsg: null,
                      type: 'image',
                      media: mediaSrc,
                      vCard: null
                    });

                    logger.info(`[FLOW MEDIA - IMG] ✅ Imagem enviada com sucesso via API Oficial`);
                  }
                } catch (e) {
                  logger.error(`[FLOW MEDIA - IMG] ❌ Erro ao validar/enviar imagem ${filePath}: ${e?.message || e}`);
                  logger.error(`[FLOW MEDIA - IMG] Stack: ${e?.stack || 'N/A'}`);
                }
              }

              await intervalWhats("1");
            }

            if (elementNowSelected.includes("audio")) {
              logger.info(`[FLOW MEDIA - AUDIO] ========== PROCESSANDO ENVIO DE ÁUDIO ==========`);

              const filePath = path.join(publicFolder, `company${companyId}/flow`, nodeSelected.data.elements.filter(item => item.number === elementNowSelected)[0].value);
              logger.info(`[FLOW MEDIA - AUDIO] FilePath: ${filePath}`);
              logger.info(`[FLOW MEDIA - AUDIO] Company ID: ${companyId}`);
              logger.info(`[FLOW MEDIA - AUDIO] WhatsApp Channel: ${whatsapp.channel}`);

              const ticketInt = await Ticket.findOne({
                where: { id: ticket.id }
              });
              logger.info(`[FLOW MEDIA - AUDIO] Ticket ID: ${ticketInt?.id}`);

              if (whatsapp.channel === "whatsapp") {
                logger.info(`[FLOW MEDIA - AUDIO] Enviando via Baileys (WhatsApp Web)`);
                await SendWhatsAppMediaFlow({
                  media: filePath,
                  ticket: ticketInt,
                  whatsappId: whatsapp.id,
                  isRecord: nodeSelected.data.elements.filter(item => item.number === elementNowSelected)[0].record
                });
                logger.info(`[FLOW MEDIA - AUDIO] ✅ Áudio enviado com sucesso via Baileys`);
              }

              if (whatsapp.channel === "whatsapp_oficial") {
                logger.info(`[FLOW MEDIA - AUDIO] Enviando via API Oficial`);

                const fileName = obterNomeEExtensaoDoArquivo(filePath);
                logger.info(`[FLOW MEDIA - AUDIO] FileName: ${fileName}`);

                try {
                  const fs = await import("fs");
                  if (!fs.existsSync(filePath)) {
                    logger.error(`[FLOW MEDIA - AUDIO] ❌ Arquivo de áudio não encontrado: ${filePath}`);
                  } else {
                    logger.info(`[FLOW MEDIA - AUDIO] ✅ Arquivo existe, preparando envio...`);

                    const mediaSrc = {
                      fieldname: 'medias',
                      originalname: fileName,
                      encoding: '7bit',
                      mimetype: 'audio/mpeg',
                      filename: fileName,
                      path: filePath
                    } as Express.Multer.File

                    logger.info(`[FLOW MEDIA - AUDIO] MediaSrc: ${JSON.stringify(mediaSrc)}`);

                    await SendWhatsAppOficialMessage({
                      body: "",
                      ticket: ticket,
                      type: 'audio',
                      media: mediaSrc
                    });

                    logger.info(`[FLOW MEDIA - AUDIO] ✅ Áudio enviado com sucesso via API Oficial`);
                  }
                } catch (e) {
                  logger.error(`[FLOW MEDIA - AUDIO] ❌ Erro ao validar/enviar áudio ${filePath}: ${e?.message || e}`);
                  logger.error(`[FLOW MEDIA - AUDIO] Stack: ${e?.stack || 'N/A'}`);
                }
              }

              await intervalWhats("1");
            }

            if (elementNowSelected.includes("video")) {
              logger.info(`[FLOW MEDIA - VIDEO] ========== PROCESSANDO ENVIO DE VÍDEO ==========`);

              const filePath = path.join(publicFolder, `company${companyId}/flow`, nodeSelected.data.elements.filter(item => item.number === elementNowSelected)[0].value);
              logger.info(`[FLOW MEDIA - VIDEO] FilePath: ${filePath}`);
              logger.info(`[FLOW MEDIA - VIDEO] Company ID: ${companyId}`);
              logger.info(`[FLOW MEDIA - VIDEO] WhatsApp Channel: ${whatsapp.channel}`);

              const ticketInt = await Ticket.findOne({
                where: { id: ticket.id }
              });
              logger.info(`[FLOW MEDIA - VIDEO] Ticket ID: ${ticketInt?.id}`);

              if (whatsapp.channel === "whatsapp") {
                logger.info(`[FLOW MEDIA - VIDEO] Enviando via Baileys (WhatsApp Web)`);
                await SendWhatsAppMediaFlow({
                  media: filePath,
                  ticket: ticketInt,
                  whatsappId: whatsapp.id,
                });
                logger.info(`[FLOW MEDIA - VIDEO] ✅ Vídeo enviado com sucesso via Baileys`);
              }

              if (whatsapp.channel === "whatsapp_oficial") {
                logger.info(`[FLOW MEDIA - VIDEO] Enviando via API Oficial`);

                const fileName = obterNomeEExtensaoDoArquivo(filePath);
                logger.info(`[FLOW MEDIA - VIDEO] FileName: ${fileName}`);

                try {
                  const fs = await import("fs");
                  if (!fs.existsSync(filePath)) {
                    logger.error(`[FLOW MEDIA - VIDEO] ❌ Arquivo de vídeo não encontrado: ${filePath}`);
                  } else {
                    logger.info(`[FLOW MEDIA - VIDEO] ✅ Arquivo existe, preparando envio...`);

                    const mediaSrc = {
                      fieldname: 'medias',
                      originalname: fileName,
                      encoding: '7bit',
                      mimetype: 'video/mp4',
                      filename: fileName,
                      path: filePath
                    } as Express.Multer.File

                    logger.info(`[FLOW MEDIA - VIDEO] MediaSrc: ${JSON.stringify(mediaSrc)}`);

                    await SendWhatsAppOficialMessage({
                      body: "",
                      ticket: ticketInt,
                      type: 'video',
                      media: mediaSrc
                    });

                    logger.info(`[FLOW MEDIA - VIDEO] ✅ Vídeo enviado com sucesso via API Oficial`);
                  }
                } catch (e) {
                  logger.error(`[FLOW MEDIA - VIDEO] ❌ Erro ao validar/enviar vídeo ${filePath}: ${e?.message || e}`);
                  logger.error(`[FLOW MEDIA - VIDEO] Stack: ${e?.stack || 'N/A'}`);
                }
              }

              await intervalWhats("1");
            }

            if (elementNowSelected.includes("document")) {
              logger.info(`[FLOW MEDIA - DOCUMENT] ========== PROCESSANDO ENVIO DE DOCUMENTO ==========`);

              const filePath = path.join(publicFolder, `company${companyId}/flow`, nodeSelected.data.elements.filter(item => item.number === elementNowSelected)[0].value);
              logger.info(`[FLOW MEDIA - DOCUMENT] FilePath: ${filePath}`);
              logger.info(`[FLOW MEDIA - DOCUMENT] Company ID: ${companyId}`);
              logger.info(`[FLOW MEDIA - DOCUMENT] WhatsApp Channel: ${whatsapp.channel}`);

              const ticketInt = await Ticket.findOne({
                where: { id: ticket.id }
              });
              logger.info(`[FLOW MEDIA - DOCUMENT] Ticket ID: ${ticketInt?.id}`);

              if (whatsapp.channel === "whatsapp") {
                logger.info(`[FLOW MEDIA - DOCUMENT] Enviando via Baileys (WhatsApp Web)`);
                await SendWhatsAppMediaFlow({
                  media: filePath,
                  ticket: ticketInt,
                  whatsappId: whatsapp.id,
                });
                logger.info(`[FLOW MEDIA - DOCUMENT] ✅ Documento enviado com sucesso via Baileys`);
              }

              if (whatsapp.channel === "whatsapp_oficial") {
                logger.info(`[FLOW MEDIA - DOCUMENT] Enviando via API Oficial`);

                const fileName = obterNomeEExtensaoDoArquivo(filePath);
                logger.info(`[FLOW MEDIA - DOCUMENT] FileName: ${fileName}`);

                try {
                  const fs = await import("fs");
                  if (!fs.existsSync(filePath)) {
                    logger.error(`[FLOW MEDIA - DOCUMENT] ❌ Arquivo de documento não encontrado: ${filePath}`);
                  } else {
                    logger.info(`[FLOW MEDIA - DOCUMENT] ✅ Arquivo existe, preparando envio...`);

                    const mediaSrc = {
                      fieldname: 'medias',
                      originalname: fileName,
                      encoding: '7bit',
                      mimetype: 'application/pdf',
                      filename: fileName,
                      path: filePath
                    } as Express.Multer.File

                    logger.info(`[FLOW MEDIA - DOCUMENT] MediaSrc: ${JSON.stringify(mediaSrc)}`);

                    await SendWhatsAppOficialMessage({
                      body: "",
                      ticket: ticketInt,
                      type: 'document',
                      media: mediaSrc
                    });

                    logger.info(`[FLOW MEDIA - DOCUMENT] ✅ Documento enviado com sucesso via API Oficial`);
                  }
                } catch (e) {
                  logger.error(`[FLOW MEDIA - DOCUMENT] ❌ Erro ao validar/enviar documento ${filePath}: ${e?.message || e}`);
                  logger.error(`[FLOW MEDIA - DOCUMENT] Stack: ${e?.stack || 'N/A'}`);
                }
              }

              await intervalWhats("1");
            }

            if (elementNowSelected.includes("application")) {
              logger.info(`[FLOW MEDIA - APPLICATION] ========== PROCESSANDO ENVIO DE APLICAÇÃO/PDF ==========`);

              const filePath = path.join(publicFolder, `company${companyId}/flow`, nodeSelected.data.elements.filter(item => item.number === elementNowSelected)[0].value);
              logger.info(`[FLOW MEDIA - APPLICATION] FilePath: ${filePath}`);
              logger.info(`[FLOW MEDIA - APPLICATION] Company ID: ${companyId}`);
              logger.info(`[FLOW MEDIA - APPLICATION] WhatsApp Channel: ${whatsapp.channel}`);

              const ticketInt = await Ticket.findOne({
                where: { id: ticket.id }
              });
              logger.info(`[FLOW MEDIA - APPLICATION] Ticket ID: ${ticketInt?.id}`);

              if (whatsapp.channel === "whatsapp") {
                logger.info(`[FLOW MEDIA - APPLICATION] Enviando via Baileys (WhatsApp Web)`);
                await SendWhatsAppMediaFlow({
                  media: filePath,
                  ticket: ticketInt,
                  whatsappId: whatsapp.id,
                });
                logger.info(`[FLOW MEDIA - APPLICATION] ✅ Application enviado com sucesso via Baileys`);
              }

              if (whatsapp.channel === "whatsapp_oficial") {
                logger.info(`[FLOW MEDIA - APPLICATION] Enviando via API Oficial`);

                const fileName = obterNomeEExtensaoDoArquivo(filePath);
                logger.info(`[FLOW MEDIA - APPLICATION] FileName: ${fileName}`);

                try {
                  const fs = await import("fs");
                  if (!fs.existsSync(filePath)) {
                    logger.error(`[FLOW MEDIA - APPLICATION] ❌ Arquivo não encontrado: ${filePath}`);
                  } else {
                    logger.info(`[FLOW MEDIA - APPLICATION] ✅ Arquivo existe, preparando envio...`);

                    const mediaSrc = {
                      fieldname: 'medias',
                      originalname: fileName,
                      encoding: '7bit',
                      mimetype: 'application/pdf',
                      filename: fileName,
                      path: filePath
                    } as Express.Multer.File

                    logger.info(`[FLOW MEDIA - APPLICATION] MediaSrc: ${JSON.stringify(mediaSrc)}`);

                    await SendWhatsAppOficialMessage({
                      body: "",
                      ticket: ticketInt,
                      type: 'document',
                      media: mediaSrc
                    });

                    logger.info(`[FLOW MEDIA - APPLICATION] ✅ Application enviado com sucesso via API Oficial`);
                  }
                } catch (e) {
                  logger.error(`[FLOW MEDIA - APPLICATION] ❌ Erro ao validar/enviar application ${filePath}: ${e?.message || e}`);
                  logger.error(`[FLOW MEDIA - APPLICATION] Stack: ${e?.stack || 'N/A'}`);
                }
              }

              await intervalWhats("1");
            }
          } catch (elementError) {
            logger.error(`[SINGLE BLOCK] ❌ Erro ao processar elemento ${iLoc + 1}: ${elementNowSelected}`);
            logger.error(`[SINGLE BLOCK] Erro: ${elementError?.message || elementError}`);
            logger.error(`[SINGLE BLOCK] Stack: ${elementError?.stack || 'N/A'}`);
            // Re-lançar para ser capturado pelo catch principal
            throw elementError;
          }
        }

        logger.info(`[SINGLE BLOCK] ✅ SingleBlock processado com sucesso - ${sequence.length} elementos`);
      }

      let isRandomizer: boolean;
      if (nodeSelected.type === "randomizer") {
        const selectedRandom = randomizarCaminho(nodeSelected.data.percent / 100);

        const resultConnect = connects.filter(
          connect => connect.source === nodeSelected.id
        );
        if (selectedRandom === "A") {
          next = resultConnect.filter(item => item.sourceHandle === "a")[0]
            .target;
          noAlterNext = true;
        } else {
          next = resultConnect.filter(item => item.sourceHandle === "b")[0]
            .target;
          noAlterNext = true;
        }
        isRandomizer = true;
      }

      let isMenu: boolean;
      if (nodeSelected.type === "menu") {
        logger.info(`[MENU NODE] ========== PROCESSANDO NÓ MENU ==========`);
        logger.info(`[MENU NODE] ID do nó: ${nodeSelected.id}`);
        logger.info(`[MENU NODE] PressKey recebido: ${pressKey || 'undefined'}`);
        logger.info(`[MENU NODE] Next atual: ${next}`);
        logger.info(`[MENU NODE] Ticket ID: ${ticket?.id || idTicket}`);

        // ✅ CORRIGIDO: Verificar se o ticket está "open" antes de processar Menu
        // Recarregar o ticket para obter o status mais atualizado
        if (idTicket) {
          const currentTicket = await Ticket.findByPk(idTicket);
          if (currentTicket && currentTicket.status === "open") {
            logger.info(`[MENU NODE] ⚠️ Ticket ${idTicket} está OPEN - Parando fluxo e não processando Menu`);
            // Limpar os dados do webhook relacionados ao fluxo
            await currentTicket.update({
              flowWebhook: false,
              lastFlowId: null,
              hashFlowId: null,
              flowStopped: null,
              dataWebhook: null
            });
            return "stopped_by_open_ticket";
          }
          // Atualizar a referência do ticket
          ticket = currentTicket;
        }

        if (pressKey) {
          logger.info(`[MENU NODE] ========== USUÁRIO RESPONDEU MENU ==========`);
          logger.info(`[MENU NODE] Resposta do usuário: "${pressKey}"`);
          logger.info(`[MENU NODE] Opções disponíveis: ${JSON.stringify(nodeSelected.data.arrayOption?.map(o => ({ number: o.number, value: o.value })))}`);

          if (pressKey.toLowerCase() === "sair") {
            logger.info(`[MENU NODE] Usuário solicitou sair do fluxo com a palavra-chave: "${pressKey}"`);

            const ticketDetails = await ShowTicketService(ticket.id, companyId);

            const exitMessage = "Atendimento pelo chatbot finalizado. Em breve um atendente entrará em contato.";

            if (whatsapp.channel === "whatsapp") {
              await SendWhatsAppMessage({
                body: exitMessage,
                ticket: ticketDetails,
                quotedMsg: null
              });
            } else if (whatsapp.channel === "whatsapp_oficial") {
              await SendWhatsAppOficialMessage({
                body: exitMessage,
                ticket: ticketDetails,
                quotedMsg: null,
                type: 'text',
                media: null,
                vCard: null
              });
            }

            const messageData: MessageData = {
              wid: randomString(50),
              ticketId: ticket.id,
              body: exitMessage,
              fromMe: true,
              read: true
            };

            await CreateMessageService({ messageData, companyId });

            await ticketDetails.update({
              flowWebhook: false,
              flowStopped: null,
              lastFlowId: null,
              hashFlowId: null,
              dataWebhook: null,
              status: "pending"
            });

            return "flow_exited";
          }

          logger.info(`[MENU NODE] Buscando conexão - Source: ${next}, SourceHandle: a${pressKey}`);
          logger.info(`[MENU NODE] Total de conexões disponíveis: ${connectStatic.length}`);
          logger.info(`[MENU NODE] Conexões do nó atual (${next}): ${JSON.stringify(connectStatic.filter(c => c.source === next).map(c => ({ source: c.source, target: c.target, handle: c.sourceHandle })))}`);

          const filterOne = connectStatic.filter(confil => confil.source === next)
          logger.info(`[MENU NODE] FilterOne (conexões do source ${next}): ${filterOne.length} encontradas`);

          const filterTwo = filterOne.filter(filt2 => filt2.sourceHandle === "a" + pressKey)
          logger.info(`[MENU NODE] FilterTwo (handle a${pressKey}): ${filterTwo.length} encontradas`);

          if (filterTwo.length > 0) {
            execFn = filterTwo[0].target
            logger.info(`[MENU NODE] ✅ Conexão encontrada! Próximo nó (execFn): ${execFn}`);
          } else {
            execFn = undefined
            logger.warn(`[MENU NODE] ❌ NENHUMA CONEXÃO encontrada para handle a${pressKey}`);
          }

          if (execFn === undefined) {
            logger.error(`[MENU NODE] ========== OPÇÃO INVÁLIDA ==========`);
            logger.error(`[MENU NODE] PressKey: "${pressKey}" não tem conexão correspondente`);
            logger.error(`[MENU NODE] Handles disponíveis: ${filterOne.map(f => f.sourceHandle).join(', ')}`);

            let optionsText = "";
            nodeSelected.data.arrayOption.forEach(item => {
              optionsText += `[${item.number}] ${item.value}\n`;
            });

            const fallbackMessage = `Opção inválida. Por favor, escolha uma das opções abaixo ou digite *Sair* para finalizar o atendimento:\n\n${optionsText}`;

            const ticketDetails = await ShowTicketService(ticket.id, companyId);

            if (whatsapp.channel === "whatsapp") {
              await SendWhatsAppMessage({
                body: fallbackMessage,
                ticket: ticketDetails,
                quotedMsg: null
              });
            } else if (whatsapp.channel === "whatsapp_oficial") {
              await SendWhatsAppOficialMessage({
                body: fallbackMessage,
                ticket: ticketDetails,
                quotedMsg: null,
                type: 'text',
                media: null,
                vCard: null
              });
            }

            const messageData: MessageData = {
              wid: randomString(50),
              ticketId: ticket.id,
              body: fallbackMessage,
              fromMe: true,
              read: true
            };

            await CreateMessageService({ messageData, companyId });

            return "fallback_sent";
          }

          logger.info(`[MENU NODE] Definindo pressKey como "999" para continuar processamento`);
          pressKey = "999";

          const isNodeExist = nodes.filter(item => item.id === execFn);
          logger.info(`[MENU NODE] Verificando se nó ${execFn} existe: ${isNodeExist.length > 0 ? 'SIM' : 'NÃO'}`);

          if (isNodeExist.length > 0) {
            isMenu = isNodeExist[0].type === "menu" ? true : false;
            logger.info(`[MENU NODE] Próximo nó é do tipo: ${isNodeExist[0].type}, isMenu: ${isMenu}`);
          } else {
            isMenu = false;
            logger.warn(`[MENU NODE] ⚠️ Nó ${execFn} NÃO ENCONTRADO na lista de nós!`);
          }

          logger.info(`[MENU NODE] ========== FIM PROCESSAMENTO RESPOSTA ==========`);
        } else {
          // ✅ CORRIGIDO: Verificar se o ticket está "open" antes de enviar Menu
          // Recarregar o ticket para obter o status mais atualizado
          if (idTicket) {
            const currentTicket = await Ticket.findByPk(idTicket);
            if (currentTicket && currentTicket.status === "open") {
              logger.info(`[MENU NODE] ⚠️ Ticket ${idTicket} está OPEN - Parando fluxo e não enviando Menu`);
              // Limpar os dados do webhook relacionados ao fluxo
              await currentTicket.update({
                flowWebhook: false,
                lastFlowId: null,
                hashFlowId: null,
                flowStopped: null,
                dataWebhook: null
              });
              return "stopped_by_open_ticket";
            }
            // Atualizar a referência do ticket
            ticket = currentTicket;
          }

          logger.info(`[MENU NODE] ========== CRIANDO E ENVIANDO MENU ==========`);

          let optionsMenu = "";
          nodeSelected.data.arrayOption.map(item => {
            optionsMenu += `[${item.number}] ${item.value}\n`;
          });
          logger.info(`[MENU NODE] Opções do menu: ${optionsMenu.trim()}`);

          const menuCreate = `${nodeSelected.data.message}\n\n${optionsMenu}`;
          logger.info(`[MENU NODE] Menu completo criado com ${nodeSelected.data.arrayOption.length} opções`);

          let msg;
          if (dataWebhook === "") {
            msg = {
              body: menuCreate,
              number: numberClient,
              companyId: companyId
            };
          } else {
            const dataLocal = {
              nome: createFieldJsonName,
              numero: numberClient,
              email: createFieldJsonEmail
            };
            msg = {
              body: replaceMessages(menuCreate, details, dataWebhook, dataLocal, idTicket),
              number: numberClient,
              companyId: companyId
            };
          }

          logger.info(`[MENU NODE] Mensagem pronta para envio (${msg.body.length} caracteres)`);

          const ticketDetails = await ShowTicketService(ticket.id, companyId);

          const messageData: MessageData = {
            wid: randomString(50),
            ticketId: ticket.id,
            body: msg.body,
            fromMe: true,
            read: true
          };

          logger.info(`[MENU NODE] Enviando menu via ${whatsapp.channel}...`);

          if (whatsapp.channel === "whatsapp") {
            await SendWhatsAppMessage({
              body: msg.body,
              ticket: ticketDetails,
              quotedMsg: null
            });
          }

          if (whatsapp.channel === "whatsapp_oficial") {
            await SendWhatsAppOficialMessage({
              body: msg.body,
              ticket: ticketDetails,
              quotedMsg: null,
              type: 'text',
              media: null,
              vCard: null
            });
          }

          logger.info(`[MENU NODE] ✅ Menu enviado com sucesso!`);

          SetTicketMessagesAsRead(ticketDetails);

          logger.info(`[TICKET UPDATE] Atualizando lastMessage do ticket ${ticket.id} no menu`);

          await ticketDetails.update({
            lastMessage: formatBody(msg.body, ticket.contact)
          });

          logger.info(`[TICKET UPDATE] LastMessage atualizada para ticket ${ticket.id} no menu`);

          await intervalWhats("1");

          if (ticket) {
            ticket = await Ticket.findOne({
              where: { id: ticket.id, whatsappId: whatsappId, companyId: companyId }
            });
          } else {
            ticket = await Ticket.findOne({
              where: { id: idTicket, whatsappId: whatsappId, companyId: companyId }
            });
          }

          if (ticket) {
            logger.info(`[MENU NODE] ========== CONFIGURANDO TICKET PARA AGUARDAR RESPOSTA ==========`);
            logger.info(`[MENU NODE] Ticket ID: ${ticket.id}`);
            logger.info(`[MENU NODE] Status atual: ${ticket.status}`);
            logger.info(`[MENU NODE] LastFlowId será: ${nodeSelected.id}`);
            logger.info(`[MENU NODE] HashFlowId: ${hashWebhookId}`);
            logger.info(`[MENU NODE] FlowStopped: ${idFlowDb}`);

            const updateData = {
              status: "pending",
              queueId: ticket.queueId ? ticket.queueId : null,
              userId: null,
              companyId: companyId,
              flowWebhook: true,
              lastFlowId: nodeSelected.id,
              dataWebhook: dataWebhook,
              hashFlowId: hashWebhookId,
              flowStopped: idFlowDb.toString()
            };

            logger.info(`[MENU NODE] Dados que serão salvos: ${JSON.stringify(updateData)}`);

            try {
              const updateResult = await ticket.update(updateData);

              logger.info(`[MENU NODE] ✅ UPDATE EXECUTADO COM SUCESSO!`);
              logger.info(`[MENU NODE] Ticket após update - ID: ${updateResult.id}`);
              logger.info(`[MENU NODE] flowWebhook: ${updateResult.flowWebhook}`);
              logger.info(`[MENU NODE] lastFlowId: ${updateResult.lastFlowId}`);
              logger.info(`[MENU NODE] hashFlowId: ${updateResult.hashFlowId}`);
              logger.info(`[MENU NODE] flowStopped: ${updateResult.flowStopped}`);

              // Recarregar do banco para confirmar que foi salvo
              await ticket.reload();
              logger.info(`[MENU NODE] ========== VERIFICAÇÃO APÓS RELOAD ==========`);
              logger.info(`[MENU NODE] flowWebhook após reload: ${ticket.flowWebhook}`);
              logger.info(`[MENU NODE] lastFlowId após reload: ${ticket.lastFlowId}`);
              logger.info(`[MENU NODE] hashFlowId após reload: ${ticket.hashFlowId}`);
              logger.info(`[MENU NODE] flowStopped após reload: ${ticket.flowStopped}`);

            } catch (updateError) {
              logger.error(`[MENU NODE] ❌ ERRO AO FAZER UPDATE: ${updateError.message}`);
              logger.error(`[MENU NODE] Stack: ${updateError.stack}`);
            }
          }

          logger.info(`[MENU NODE] ========== FLUXO PAUSADO - AGUARDANDO RESPOSTA ==========`);
          break;
        }
      }

      let isSwitchFlow: boolean;
      if (nodeSelected.type === "switchFlow") {
        logger.info(`[SWITCH FLOW] ========== ACIONANDO OUTRO FLUXO ==========`);
        logger.info(`[SWITCH FLOW] Nó ID: ${nodeSelected.id}`);
        logger.info(`[SWITCH FLOW] Ticket ID: ${ticket?.id || idTicket}`);

        const data = nodeSelected.data?.flowSelected;

        logger.info(`[SWITCH FLOW] Dados do fluxo selecionado: ${JSON.stringify(data)}`);

        if (!data) {
          logger.error(`[SWITCH FLOW] ❌ Nenhum fluxo foi selecionado no nó!`);
          break;
        }

        if (ticket) {
          ticket = await Ticket.findOne({
            where: {
              id: ticket.id
            },
            include: [
              { model: Contact, as: "contact", attributes: ["id", "name"] }
            ]
          });
        } else {
          ticket = await Ticket.findOne({
            where: {
              id: idTicket
            },
            include: [
              { model: Contact, as: "contact", attributes: ["id", "name"] }
            ]
          });
        }

        if (!ticket) {
          logger.error(`[SWITCH FLOW] ❌ Ticket não encontrado!`);
          break;
        }

        logger.info(`[SWITCH FLOW] Fluxo de destino: ${data?.name || 'N/A'} (ID: ${data?.id || 'N/A'})`);
        logger.info(`[SWITCH FLOW] Resetando estado do ticket antes de mudar de fluxo`);

        // ✅ IMPORTANTE: Resetar o fluxo atual antes de iniciar o novo
        await ticket.update({
          flowWebhook: false,
          lastFlowId: null,
          hashFlowId: null,
          flowStopped: null,
          dataWebhook: null
        });

        logger.info(`[SWITCH FLOW] Ticket resetado - iniciando novo fluxo`);

        isSwitchFlow = true;

        try {
          await switchFlow(data, companyId, ticket);
          logger.info(`[SWITCH FLOW] ✅ Novo fluxo iniciado com sucesso!`);
        } catch (error) {
          logger.error(`[SWITCH FLOW] ❌ Erro ao iniciar novo fluxo: ${error.message}`);
          logger.error(`[SWITCH FLOW] Stack: ${error.stack}`);
        }

        break;
      };

      if (nodeSelected.type === "attendant") {

        const data = nodeSelected.data?.user?.id;

        if (ticket) {
          ticket = await Ticket.findOne({
            where: {
              id: ticket.id
            },
            include: [
              { model: Contact, as: "contact", attributes: ["id", "name"] }
            ]
          });
        } else {
          ticket = await Ticket.findOne({
            where: {
              id: idTicket
            },
            include: [
              { model: Contact, as: "contact", attributes: ["id", "name"] }
            ]
          });
        }

        logger.info(`[TICKET UPDATE] Atribuindo ticket ${ticket.id} ao atendente ${data}`);

        // ✅ CORRIGIDO: Desabilitar integração quando ticket é atribuído a atendente
        await ticket.update({
          userId: data,
          useIntegration: false,
          isBot: false,
          dataWebhook: null
        });

        logger.info(`[TICKET UPDATE] Ticket ${ticket.id} atribuído ao usuário ${data} com sucesso - integração desabilitada`);

        break;
      };

      let isContinue = false;

      logger.info(`[FLOW] ========== DETERMINANDO PRÓXIMO NÓ ==========`);
      logger.info(`[FLOW] PressKey: ${pressKey || 'undefined'}`);
      logger.info(`[FLOW] ExecCount: ${execCount}`);
      logger.info(`[FLOW] IsMenu: ${isMenu || false}`);
      logger.info(`[FLOW] ExecFn: ${execFn || 'undefined'}`);
      logger.info(`[FLOW] NoAlterNext: ${noAlterNext}`);

      if (pressKey === "999" && execCount > 0) {
        logger.info(`[FLOW] ========== PROCESSANDO RESPOSTA DO MENU (pressKey=999) ==========`);
        logger.info(`[FLOW] Buscando conexão a partir de execFn: ${execFn}`);

        pressKey = undefined;
        let result = connects.filter(connect => connect.source === execFn)[0];

        logger.info(`[FLOW] Conexões disponíveis de ${execFn}: ${JSON.stringify(connects.filter(c => c.source === execFn).map(c => ({ target: c.target, handle: c.sourceHandle })))}`);

        if (typeof result === "undefined") {
          logger.error(`[FLOW] ❌ Nenhuma conexão encontrada para execFn: ${execFn}`);
          next = "";
        } else {
          if (!noAlterNext) {
            next = result.target;
            logger.info(`[FLOW] ✅ Próximo nó definido: ${next} (de execFn: ${execFn})`);
          } else {
            logger.info(`[FLOW] NoAlterNext ativo - mantendo next: ${next}`);
          }
        }
      } else {
        logger.info(`[FLOW] Determinando próximo nó sem resposta de menu`);
        let result;

        if (isMenu) {
          logger.info(`[FLOW] ========== PRÓXIMO É OUTRO MENU ==========`);
          result = { target: execFn };
          isContinue = true;
          pressKey = undefined;
          logger.info(`[FLOW] Continuando para menu: ${execFn}`);
        } else if (isSwitchFlow) {
          logger.info(`[SWITCH FLOW] ========== CÓDIGO LEGADO DE SWITCHFLOW DETECTADO ==========`);
          logger.info(`[SWITCH FLOW] Este código NÃO deveria ser executado - o switchFlow já foi processado acima`);
          logger.info(`[SWITCH FLOW] Pulando esta execução para evitar duplicação`);

          // ✅ CORRIGIDO: O switchFlow já foi executado acima, não precisa executar novamente
          // Este código legado será mantido comentado para referência
          /*
          const wbot = await getWbot(whatsapp.id);
          const contact = await Contact.findOne({
            where: {
              id: ticket?.contactId,
              companyId: companyId
            }
          })
          flowBuilderQueue(ticket, msg, wbot, whatsapp, companyId, contact, null);
          */
          break;
        } else if (isRandomizer) {
          isRandomizer = false;
          result = { target: next }; // ✅ CORRIGIDO: Criar objeto com target
          logger.info(`[FLOW DEBUG] Randomizer - próximo nó: ${next}`);
        } else {
          // ✅ CORRIGIDO: Verificar se noAlterNext está ativo antes de buscar nova conexão
          if (noAlterNext) {
            logger.info(`[FLOW DEBUG] noAlterNext ativo - mantendo next: ${next}`);
            result = { target: next };
          } else {
            result = connects.filter(connect => connect.source === nodeSelected.id)[0];
            logger.info(`[FLOW DEBUG] Buscando conexão para nó: ${nodeSelected.id}, resultado: ${result ? result.target : 'undefined'}`);
          }
        }

        if (typeof result === "undefined" || !result) {
          logger.warn(`[FLOW DEBUG] Nenhuma conexão encontrada para nó: ${nodeSelected?.id}`);
          next = "";
        } else {
          if (!noAlterNext) {
            next = result.target;
          }
          logger.info(`[FLOW DEBUG] Próximo nó definido: ${next}`);
        }
      }

      let finalStatus;
      if (nodeSelected?.data?.finalStatus) {
        console.log("[FINAL STATUS] O status final será:", nodeSelected.data.finalStatus);
        finalStatus = nodeSelected.data.finalStatus;
      }

      // ✅ CORRIGIDO: Verificar se é realmente o fim do fluxo antes de finalizar
      if (!pressKey && !isContinue) {
        const nextNode = connects.filter(connect => connect.source === nodeSelected.id).length;

        logger.info(`[FLOW DEBUG] Verificando fim de fluxo - Nó: ${nodeSelected.id}, Conexões: ${nextNode}, Next: ${next}`);

        // ✅ Só finalizar se não há conexões E não há próximo nó definido
        if (nextNode === 0 && (!next || next === "")) {
          if (ticket) {
            ticket = await Ticket.findOne({
              where: { id: ticket.id, whatsappId, companyId: companyId }
            });

            logger.info(`[TICKET UPDATE] Finalizando fluxo - Ticket ${ticket.id} será resetado (LastFlowId: null, FlowWebhook: false)`);

            await ticket.update({
              lastFlowId: null,
              dataWebhook: null,
              hashFlowId: null,
              flowWebhook: false,
              flowStopped: idFlowDb.toString(),
              useIntegration: null,
              integrationId: null
            });

            logger.info(`[TICKET UPDATE] NO IF - Fluxo finalizado - Ticket ${ticket.id} resetado com sucesso`);

          } else {
            ticket = await Ticket.findOne({
              where: { id: idTicket, whatsappId, companyId: companyId }
            });

            await ticket.update({
              lastFlowId: null,
              dataWebhook: null,
              hashFlowId: null,
              flowWebhook: false,
              flowStopped: idFlowDb.toString(),
              useIntegration: null,
              integrationId: null
            });

            logger.info(`[TICKET UPDATE] NO ELSE - Fluxo finalizado - Ticket ${idTicket} resetado com sucesso`);
          }
          break;
        } else if (nextNode > 0 && (!next || next === "")) {
          // ✅ Se há conexões mas next não foi definido, buscar a conexão
          const nextConnection = connects.filter(connect => connect.source === nodeSelected.id)[0];
          if (nextConnection) {
            next = nextConnection.target;
            logger.info(`[FLOW DEBUG] Next não definido mas há conexões - usando: ${next}`);
          }
        }
      }

      isContinue = false;

      // ✅ CORRIGIDO: Verificar se realmente não há próximo nó antes de finalizar
      if (next === "" || !next) {
        logger.info(`[FLOW DEBUG] Next está vazio - verificando se deve finalizar fluxo`);

        // Tentar buscar conexão a partir do nó atual
        const possibleConnection = connects.filter(connect => connect.source === nodeSelected.id)[0];

        if (possibleConnection) {
          next = possibleConnection.target;
          logger.info(`[FLOW DEBUG] Conexão encontrada - continuando para: ${next}`);
        } else {
          // Realmente não há próximo nó - finalizar fluxo
          logger.info(`[FLOW DEBUG] Nenhuma conexão encontrada - finalizando fluxo`);

          if (ticket) {
            ticket = await Ticket.findOne({
              where: { id: ticket.id, whatsappId, companyId: companyId }
            });
          } else if (idTicket) {
            ticket = await Ticket.findOne({
              where: { id: idTicket, whatsappId, companyId: companyId }
            });
          }

          if (ticket) {
            logger.info(`[TICKET UPDATE] Finalizando fluxo disparado - Ticket ${ticket.id} com status final: ${finalStatus}`);
            await finalizeTriggeredFlow(ticket, nodeSelected, companyId, finalStatus);
          }

          break;
        }
      }

      console.log("UPDATE9...");
      if (idTicket) {
        console.log("UPDATE10...");
        ticket = await Ticket.findOne({
          where: { id: idTicket, whatsappId, companyId: companyId }
        });
      }

      console.log("UPDATE12...");

      logger.info(`[FLOW LOOP] Finalizando iteração - Próximo nó: ${next}, NoAlterNext: ${noAlterNext}`);
      logger.info(`[TICKET UPDATE] Continuando fluxo - Ticket ${ticket.id} - LastFlowId: ${nodeSelected.id}, HashFlowId: ${hashWebhookId}`);

      await ticket.update({
        whatsappId: whatsappId,
        queueId: ticket?.queueId,
        userId: ticket?.userId,
        companyId: companyId,
        flowWebhook: true,
        lastFlowId: nodeSelected.id,
        dataWebhook: dataWebhook,
        hashFlowId: hashWebhookId,
        flowStopped: idFlowDb.toString()
      });

      logger.info(`[TICKET UPDATE] Ticket ${ticket.id} atualizado para continuar fluxo - FlowStopped: ${idFlowDb}`);

      noAlterNext = false;
      execCount++;

      logger.info(`[FLOW LOOP] ========== Fim da iteração ${i + 1}/${lengthLoop} ==========`);
    }

    return "ds";
  } catch (error) {
    const errorMessage = error?.message || "Erro desconhecido";
    const errorStack = error?.stack || "";
    const errorName = error?.name || "UnknownError";

    // Log detalhado para diagnóstico futuro
    logger.error(`[RDS-ERROR-DEBUG] Erro no ActionsWebhookService - Nome: ${errorName}`);
    logger.error(`[RDS-ERROR-DEBUG] Mensagem: ${errorMessage}`);

    // Registrar stack trace apenas em situações não previstas
    if (errorName !== "ValidationError" && errorName !== "NotFoundError") {
      logger.error(`[RDS-ERROR-DEBUG] Stack: ${errorStack.split("\n")[0]}`);
    }

    // Registrar contexto da execução para ajudar na depuração
    logger.error(`[RDS-ERROR-DEBUG] Contexto: Ticket=${idTicket}, nextStage=${nextStage}, nodeType=${nodes.find(n => n.id === nextStage)?.type || "unknown"}`);

    // Manter o log original para compatibilidade
    logger.error("[ActionsWebhookService] Erro geral no serviço:", error);

    if (idTicket) {
      const ticket = await Ticket.findByPk(idTicket);
      if (ticket) {
        await ticket.update({
          flowWebhook: false,
          lastFlowId: null,
          hashFlowId: null,
          flowStopped: null
        });

        logger.info(`[RDS-ERROR-DEBUG] Estado do ticket ${idTicket} resetado após erro`);
      }
    }

  }
};

const switchFlow = async (data: any, companyId: number, ticket: Ticket) => {
  logger.info(`[SWITCH FLOW FUNC] ========== FUNÇÃO switchFlow INICIADA ==========`);
  logger.info(`[SWITCH FLOW FUNC] Ticket ID: ${ticket?.id}`);
  logger.info(`[SWITCH FLOW FUNC] WhatsApp ID: ${ticket?.whatsappId}`);
  logger.info(`[SWITCH FLOW FUNC] Company ID: ${companyId}`);
  logger.info(`[SWITCH FLOW FUNC] Fluxo de destino: ${data?.name} (ID: ${data?.id})`);

  try {
    // Verificar se 'data' é o fluxo completo ou apenas o ID
    let flowData = data;

    // Se 'data' for um número ou string, buscar o fluxo
    if (typeof data === 'number' || typeof data === 'string') {
      logger.info(`[SWITCH FLOW FUNC] Buscando fluxo com ID: ${data}`);
      const flow = await FlowBuilderModel.findOne({
        where: {
          id: data,
          company_id: companyId
        }
      });

      if (!flow) {
        logger.error(`[SWITCH FLOW FUNC] ❌ Fluxo ${data} não encontrado!`);
        return;
      }

      flowData = flow;
    } else if (!data?.flow || !data?.flow?.nodes) {
      logger.error(`[SWITCH FLOW FUNC] ❌ Dados do fluxo inválidos!`);
      return;
    }

    const wbot = await getWbot(ticket?.whatsappId);
    logger.info(`[SWITCH FLOW FUNC] ✅ WBot obtido com sucesso`);

    const whatsapp = await ShowWhatsAppService(wbot.id!, companyId);
    logger.info(`[SWITCH FLOW FUNC] ✅ WhatsApp service obtido - Nome: ${whatsapp.name}`);

    const contact = await Contact.findOne({
      where: {
        id: ticket?.contactId,
        companyId: companyId
      }
    });

    if (!contact) {
      logger.error(`[SWITCH FLOW FUNC] ❌ Contato não encontrado! ContactId: ${ticket?.contactId}`);
      return;
    }

    logger.info(`[SWITCH FLOW FUNC] ✅ Contato obtido - Nome: ${contact.name}, Número: ${contact.number}`);

    const nodes: INodes[] = flowData.flow["nodes"];
    const connections: IConnections[] = flowData.flow["connections"];

    if (!nodes || nodes.length === 0) {
      logger.error(`[SWITCH FLOW FUNC] ❌ Fluxo não possui nós válidos!`);
      return;
    }

    const mountDataContact = {
      number: contact.number,
      name: contact.name,
      email: contact.email
    };

    logger.info(`[SWITCH FLOW FUNC] Chamando ActionsWebhookService para iniciar o novo fluxo...`);
    logger.info(`[SWITCH FLOW FUNC] Total de nós: ${nodes.length}, Primeiro nó: ${nodes[0].id}`);

    // ✅ CORRIGIDO: Chamar diretamente ActionsWebhookService para iniciar um NOVO fluxo
    // (flowBuilderQueue é apenas para CONTINUAR fluxos interrompidos)
    await ActionsWebhookService(
      whatsapp.id,
      flowData.id,
      companyId,
      nodes,
      connections,
      nodes[0].id, // Começar pelo primeiro nó
      null,
      "",
      "",
      null, // Sem pressKey pois não há mensagem do usuário
      ticket.id,
      mountDataContact,
      false // inputResponded = false
    );

    logger.info(`[SWITCH FLOW FUNC] ✅ Novo fluxo iniciado com sucesso!`);
  } catch (error) {
    logger.error(`[SWITCH FLOW FUNC] ❌ Erro na função switchFlow: ${error.message}`);
    logger.error(`[SWITCH FLOW FUNC] Stack: ${error.stack}`);
    throw error;
  }
};

const constructJsonLine = (line: string, json: any) => {
  let valor = json
  const chaves = line.split(".")

  if (chaves.length === 1) {
    return valor[chaves[0]]
  }

  for (const chave of chaves) {
    valor = valor[chave]
  }
  return valor
};

function removerNaoLetrasNumeros(texto: string) {
  // Substitui todos os caracteres que não são letras ou números por vazio
  return texto.replace(/[^a-zA-Z0-9]/g, "");
}

const sendMessageWhats = async (
  whatsId: number,
  msg: any,
  req: Request<ParamsDictionary, any, any, ParsedQs, Record<string, any>>
) => {
  sendMessageFlow(whatsId, msg, req);
  return Promise.resolve();
};

const makeHttpRequest = async (
  url: string,
  method: string,
  headers: Record<string, string> = {},
  body: any = null,
  queryParams: Array<{ key: string; value: string }> = [],
  timeout: number = 10000
): Promise<any> => {
  try {
    // ✅ VALIDAÇÃO INICIAL MELHORADA DE URL
    if (!url || typeof url !== "string" || url.trim().length === 0) {
      logger.error(`[httpRequestNode] URL vazia ou indefinida. method=${method}`);
      return { error: true, message: "Empty URL", status: 400, data: null };
    }

    let processedUrl = url.trim();

    // ✅ Processar variáveis na URL
    if (global.flowVariables && processedUrl.includes("${")) {
      const regex = /\${([^}]+)}/g;
      processedUrl = processedUrl.replace(regex, (match, varName) => {
        const value = global.flowVariables[varName];
        return value !== undefined ? String(value) : match;
      });
    }

    // ✅ VALIDAÇÃO PÓS-PROCESSAMENTO: Verificar se ainda há variáveis não resolvidas
    if (processedUrl.includes("${") && processedUrl.includes("}")) {
      const unresolvedVars = processedUrl.match(/\${([^}]+)}/g);
      logger.error(`[httpRequestNode] URL contém variáveis não resolvidas: ${unresolvedVars?.join(', ')} - URL: ${processedUrl}`);
      return { error: true, message: "Unresolved variables in URL", status: 400, data: null };
    }

    // ✅ VALIDAÇÃO: Verificar se URL ficou vazia após substituição
    if (!processedUrl || processedUrl.trim().length === 0) {
      logger.error(`[httpRequestNode] URL vazia após substituição de variáveis`);
      return { error: true, message: "Empty URL after variable substitution", status: 400, data: null };
    }

    // Log de diagnóstico do httpRequest
    logger.info(`[httpRequestNode] Preparando requisição: method=${(method || '').toUpperCase()} url=${processedUrl}`);

    if (queryParams) {
      try {
        const paramsArray = Array.isArray(queryParams) ? queryParams : [];

        if (paramsArray.length > 0) {
          // Processar variáveis nos parâmetros de query
          const processedParams = paramsArray.map(param => {
            if (!param || typeof param !== "object") {
              return { key: "", value: "" };
            }

            const key = param.key || "";
            let value = param.value || "";

            if (
              global.flowVariables &&
              typeof value === "string" &&
              value.includes("${")
            ) {
              const regex = /\${([^}]+)}/g;
              value = value.replace(regex, (match, varName) => {
                const replacement = global.flowVariables[varName];

                return replacement !== undefined ? String(replacement) : match;
              });
            }

            return { key, value };
          });

          const queryString = processedParams
            .filter(param => param.key && param.value)
            .map(
              param =>
                `${encodeURIComponent(param.key)}=${encodeURIComponent(
                  param.value
                )}`
            )
            .join("&");

          if (queryString) {
            console.log(
              `[httpRequestNode] Query string gerada: ${queryString}`
            );
            processedUrl = processedUrl.includes("?")
              ? `${processedUrl}&${queryString}`
              : `${processedUrl}?${queryString}`;
          }
        }
      } catch (error) {
        logger.error(error);
      }
    }

    const processedHeaders: Record<string, string> = { ...headers };
    if (global.flowVariables) {
      Object.keys(processedHeaders).forEach(key => {
        if (processedHeaders[key] && processedHeaders[key].includes("${")) {
          const regex = /\${([^}]+)}/g;
          processedHeaders[key] = processedHeaders[key].replace(
            regex,
            (match, varName) => {
              return global.flowVariables[varName] !== undefined
                ? global.flowVariables[varName]
                : match;
            }
          );
        }
      });
    }

    let processedBody = body;
    try {
      if (
        ["POST", "PUT", "PATCH", "DELETE"].includes(
          method?.toUpperCase() || ""
        ) &&
        body
      ) {
        if (typeof body === "string") {
          if (global.flowVariables && body.includes("${")) {
            const regex = /\${([^}]+)}/g;
            processedBody = body.replace(regex, (match, varName) => {
              const value = global.flowVariables[varName];

              if (value !== undefined) {
                if (typeof value === "string") {
                  return value;
                } else {
                  return JSON.stringify(value);
                }
              }
              return match;
            });
          }

          if (
            processedBody &&
            typeof processedBody === "string" &&
            (processedBody.trim().startsWith("{") ||
              processedBody.trim().startsWith("["))
          ) {
            try {
              processedBody = JSON.parse(processedBody);
            } catch (e) { }
          }
        } else if (
          typeof body === "object" &&
          body !== null &&
          global.flowVariables
        ) {
          const processObject = (obj: any): any => {
            if (obj === null || typeof obj !== "object") {
              return obj;
            }

            if (Array.isArray(obj)) {
              return obj.map(item => processObject(item));
            }

            const result: any = {};
            Object.keys(obj).forEach(key => {
              if (typeof obj[key] === "string" && obj[key].includes("${")) {
                const regex = /\${([^}]+)}/g;
                result[key] = obj[key].replace(regex, (match, varName) => {
                  const value = global.flowVariables[varName];

                  return value !== undefined
                    ? typeof value === "object"
                      ? JSON.stringify(value)
                      : value
                    : match;
                });
              } else if (typeof obj[key] === "object") {
                result[key] = processObject(obj[key]);
              } else {
                result[key] = obj[key];
              }
            });
            return result;
          };

          processedBody = processObject(body);
        }
      }
    } catch (error) {
      logger.error(error);

      processedBody = body;
    }

    // Validação final da URL para evitar exception do axios/new URL
    try {
      // new URL lança se inválida
      // Aceitar apenas http/https
      const u = new URL(processedUrl);
      if (!/^https?:$/.test(u.protocol)) {
        logger.error(`[httpRequestNode] Protocolo não suportado em URL: ${processedUrl}`);
        return { error: true, message: "Unsupported protocol", status: 400 };
      }
    } catch (e) {
      logger.error(`[httpRequestNode] URL inválida: ${processedUrl}`);
      return { error: true, message: "Invalid URL", status: 400 };
    }

    const httpsAgent = new https.Agent({
      rejectUnauthorized: process.env.NODE_ENV === "production"
    });

    const limitedTimeout = Math.min(Math.max(1000, timeout), 45000);

    const config: any = {
      url: processedUrl,
      method: method.toUpperCase(),
      headers: {
        "Content-Type": "application/json",
        ...processedHeaders
      },
      httpsAgent,
      timeout: limitedTimeout
    };

    if (
      ["POST", "PUT", "PATCH", "DELETE"].includes(method.toUpperCase()) &&
      processedBody
    ) {
      config.data =
        typeof processedBody === "string"
          ? processedBody
          : JSON.stringify(processedBody);
    }

    const response = await axios(config);

    return {
      data: response.data,
      status: response.status,
      headers: response.headers
    };
  } catch (error) {
    logger.error(
      `Erro na requisição HTTP (${method} ${url}): ${error.message}`
    );

    if (error.response) {
      logger.error(`Resposta de erro com status ${error.response.status}`);
      return {
        data: error.response.data,
        status: error.response.status,
        headers: error.response.headers,
        error: true
      };
    }

    logger.error(`Erro sem resposta do servidor: ${error}`);
    return {
      error: true,
      message: error.message,
      status: 500
    };
  }
};

export const getFlowVariable = (name: string): any => {
  if (!global.flowVariables) {
    global.flowVariables = {};
    return undefined;
  }

  const value = global.flowVariables[name];

  return value;
};

export const setFlowVariable = (name: string, value: any): any => {
  if (!global.flowVariables) {
    global.flowVariables = {};
  }

  global.flowVariables[name] = value;

  const savedValue = global.flowVariables[name];
  if (savedValue !== value && typeof value !== "object") {
  }

  return value;
};

const intervalWhats = (time: string) => {
  const seconds = parseInt(time) * 1000;
  return new Promise(resolve => setTimeout(resolve, seconds));
};

const replaceMessages = (
  message: string,
  details: any,
  dataWebhook: any,
  dataNoWebhook?: DataNoWebhook,
  ticketId?: number
) => {
  if (!message) return "";

  try {
    global.flowVariables = global.flowVariables || {};

    const regexNewFormat = /\$\{([^}]+)\}/g;
    let processedMessage = message.replace(regexNewFormat, (match, varName) => {
      let varValue = global.flowVariables[varName];

      // Se temos um ticketId, verificar primeiro a variável específica do ticket
      if (ticketId) {
        const ticketSpecificVar = `${ticketId}_${varName}`;
        const ticketSpecificValue = global.flowVariables[ticketSpecificVar];
        if (ticketSpecificValue !== undefined && ticketSpecificValue !== null) {
          varValue = ticketSpecificValue;
        }
      }

      if (varValue !== undefined) {
        return typeof varValue === "object"
          ? JSON.stringify(varValue)
          : String(varValue);
      }

      return match;
    });

    const matches = processedMessage.match(/\{([^}]+)\}/g);

    if (dataWebhook && dataNoWebhook) {
      let newTxt = processedMessage;
      if (dataNoWebhook.nome) {
        newTxt = newTxt.replace(/{+nome}+/g, dataNoWebhook.nome);
      }
      if (dataNoWebhook.numero) {
        newTxt = newTxt.replace(/{+numero}+/g, dataNoWebhook.numero);
      }
      if (dataNoWebhook.email) {
        newTxt = newTxt.replace(/{+email}+/g, dataNoWebhook.email);
      }

      return newTxt;
    }

    if (matches && matches.includes("inputs")) {
      const placeholders = matches.map(match => match.replace(/\{|\}/g, ""));
      let newText = processedMessage;
      placeholders.map(item => {
        const value = details["inputs"].find(
          itemLocal => itemLocal.keyValue === item
        );
        if (value) {
          const lineToData = details["keysFull"].find(itemLocal =>
            itemLocal.endsWith(`.${value.data}`)
          );
          if (lineToData) {
            const createFieldJson = constructJsonLine(lineToData, dataWebhook);
            newText = newText.replace(`{${item}}`, createFieldJson);
          }
        }
      });
      return newText;
    } else {
      return processedMessage;
    }
  } catch (error) {
    logger.error(`Erro ao processar variáveis: ${error}`);
    return message;
  }
};

export { finalizeTriggeredFlow };
