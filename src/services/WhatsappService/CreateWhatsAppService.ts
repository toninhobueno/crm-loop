import * as Yup from "yup";
import AppError from "../../errors/AppError";
import Whatsapp from "../../models/Whatsapp";
import Company from "../../models/Company";
import Plan from "../../models/Plan";
import CompaniesSettings from "../../models/CompaniesSettings";
import AssociateWhatsappQueue from "./AssociateWhatsappQueue";
import logger from "../../utils/logger";
import { initNotificameHubSession } from "../../libs/notificamehub";

interface Request {
  name: string;
  companyId: number;
  queueIds?: number[];
  greetingMessage?: string;
  complationMessage?: string;
  outOfHoursMessage?: string;
  ratingMessage?: string;
  status?: string;
  isDefault?: boolean;
  token?: string;
  provider?: string;
  facebookUserId?: string;
  facebookUserToken?: string;
  tokenMeta?: string;
  channel?: string;
  facebookPageUserId?: string;
  maxUseBotQueues?: string;
  timeUseBotQueues?: string;
  expiresTicket?: number;
  allowGroup?: boolean;
  sendIdQueue?: number;
  timeSendQueue?: number;
  timeInactiveMessage?: string;
  inactiveMessage?: string;
  maxUseBotQueuesNPS?: number;
  expiresTicketNPS?: number;
  whenExpiresTicket?: string;
  expiresInactiveMessage?: string;
  groupAsTicket?: string;
  importOldMessages?: string;
  importRecentMessages?: string;
  importOldMessagesGroups?: boolean;
  closedTicketsPostImported?: boolean;
  timeCreateNewTicket?: number;
  integrationId?: number;
  integrationTypeId?: number;
  schedules?: any[];
  promptId?: number;
  collectiveVacationMessage?: string;
  collectiveVacationStart?: string;
  collectiveVacationEnd?: string;
  queueIdImportMessages?: number;
  phone_number_id?: string;
  waba_id?: string;
  send_token?: string;
  business_id?: string;
  phone_number?: string;
  waba_webhook?: string;
  flowIdNotPhrase?: number;
  flowIdWelcome?: number;
  color?: string;
  flowIdInactiveTime?: number;
  flowInactiveTime?: number;
  maxUseInactiveTime?: number;
  timeToReturnQueue?: number;
  timeAwaitActiveFlowId?: number;
  timeAwaitActiveFlow?: number;
  triggerIntegrationOnClose?: boolean;
  wavoip?: string;
  notificamehubToken?: string;
  notificamehubChannelId?: string;
}

interface Response {
  whatsapp: Whatsapp;
  oldDefaultWhatsapp: Whatsapp | null;
}

const CreateWhatsAppService = async ({
  name,
  status = "OPENING",
  queueIds = [],
  greetingMessage,
  complationMessage,
  outOfHoursMessage,
  isDefault = false,
  companyId,
  token = "",
  provider = "beta",
  facebookUserId,
  facebookUserToken,
  facebookPageUserId,
  tokenMeta,
  channel = "whatsapp",
  maxUseBotQueues,
  timeUseBotQueues,
  expiresTicket,
  allowGroup = false,
  timeSendQueue,
  sendIdQueue,
  timeInactiveMessage,
  inactiveMessage,
  ratingMessage,
  maxUseBotQueuesNPS,
  expiresTicketNPS,
  whenExpiresTicket,
  expiresInactiveMessage,
  groupAsTicket,
  importOldMessages,
  importRecentMessages,
  closedTicketsPostImported,
  importOldMessagesGroups,
  timeCreateNewTicket,
  integrationId,
  integrationTypeId,
  schedules,
  promptId,
  collectiveVacationEnd,
  collectiveVacationMessage,
  collectiveVacationStart,
  queueIdImportMessages,
  phone_number_id,
  waba_id,
  send_token,
  business_id,
  phone_number,
  waba_webhook,
  flowIdNotPhrase,
  flowIdWelcome,
  flowIdInactiveTime,
  flowInactiveTime,
  maxUseInactiveTime,
  color,
  timeToReturnQueue,
  timeAwaitActiveFlowId,
  timeAwaitActiveFlow,
  triggerIntegrationOnClose,
  wavoip,
  notificamehubToken,
  notificamehubChannelId
}: Request): Promise<Response> => {
  const company = await Company.findOne({
    where: {
      id: companyId
    },
    include: [{ model: Plan, as: "plan" }]
  });

  if (company !== null) {
    const whatsappCount = await Whatsapp.count({
      where: {
        companyId,
        channel: channel
      }
    });

    if (whatsappCount >= company.plan.connections) {
      throw new AppError(
        `Número máximo de conexões já alcançado: ${whatsappCount}`
      );
    }
  }

  const schema = Yup.object().shape({
    name: Yup.string()
      .required("ERR_WAPP_NAME_REQUIRED")
      .min(2, "ERR_WAPP_INVALID_NAME")
      .test(
        "Check-name",
        "Esse nome já está sendo utilizado por outra conexão",
        async value => {
          if (!value) return false;
          const nameExists = await Whatsapp.findOne({
            where: { name: value, channel: channel, companyId }
          });
          return !nameExists;
        }
      ),
    isDefault: Yup.boolean().required()
  });

  try {
    await schema.validate({ name, status, isDefault });
  } catch (err: any) {
    throw new AppError(err.message);
  }

  const whatsappFound = await Whatsapp.findOne({ where: { companyId } });

  isDefault = channel === "whatsapp" ? !whatsappFound : false;

  let oldDefaultWhatsapp: Whatsapp | null = null;

  if (channel === "whatsapp" && isDefault) {
    oldDefaultWhatsapp = await Whatsapp.findOne({
      where: { isDefault: true, companyId, channel: channel }
    });
    if (oldDefaultWhatsapp) {
      await oldDefaultWhatsapp.update({ isDefault: false, companyId });
    }
  }

  if (queueIds.length > 1 && !greetingMessage) {
    throw new AppError("ERR_WAPP_GREETING_REQUIRED");
  }

  if (token !== null && token !== "") {
    const tokenSchema = Yup.object().shape({
      token: Yup.string()
        .required()
        .min(2)
        .test(
          "Check-token",
          "This whatsapp token is already used.",
          async value => {
            if (!value) return false;
            const tokenExists = await Whatsapp.findOne({
              where: { token: value, channel: channel }
            });
            return !tokenExists;
          }
        )
    });

    try {
      await tokenSchema.validate({ token });
    } catch (err: any) {
      throw new AppError(err.message);
    }
  }

  // DEBUG: Log para verificar o provider antes de salvar
  logger.info(`🔍 DEBUG CreateWhatsAppService - Provider: "${provider}", Name: "${name}"`);

  // Se for NotificameHub, configurar valores padrão se necessário
  let finalNotificamehubToken = notificamehubToken;
  let finalNotificamehubChannelId = notificamehubChannelId;

  if (provider === "notificamehub") {
    // Para Instagram, usar o channelId padrão se não fornecido
    if (channel === "instagram" && !finalNotificamehubChannelId) {
      finalNotificamehubChannelId = "282ed6e3-5587-4047-9dd2-29c49c902cff";
      logger.info(`[NotificameHub] ChannelId padrão configurado para Instagram`);
    }

    logger.info(`[NotificameHub] Criando conexão ${name} com token: ${finalNotificamehubToken ? 'presente' : 'ausente'}`);
  }

  const whatsapp = await Whatsapp.create(
    {
      name,
      status,
      greetingMessage,
      complationMessage,
      outOfHoursMessage,
      ratingMessage,
      isDefault,
      companyId,
      token,
      provider,
      channel,
      facebookUserId,
      facebookUserToken,
      facebookPageUserId,
      tokenMeta,
      maxUseBotQueues,
      timeUseBotQueues,
      expiresTicket,
      allowGroup,
      timeSendQueue,
      sendIdQueue,
      timeInactiveMessage,
      inactiveMessage,
      maxUseBotQueuesNPS,
      expiresTicketNPS,
      whenExpiresTicket,
      expiresInactiveMessage,
      groupAsTicket,
      importOldMessages,
      importRecentMessages,
      closedTicketsPostImported,
      importOldMessagesGroups,
      timeCreateNewTicket,
      integrationId,
      integrationTypeId,
      schedules,
      promptId,
      collectiveVacationEnd,
      collectiveVacationMessage,
      collectiveVacationStart,
      queueIdImportMessages,
      phone_number_id,
      waba_id,
      send_token,
      business_id,
      phone_number,
      waba_webhook,
      flowIdNotPhrase,
      flowIdWelcome,
      flowIdInactiveTime,
      flowInactiveTime,
      maxUseInactiveTime,
      color,
      timeToReturnQueue,
      timeAwaitActiveFlowId,
      timeAwaitActiveFlow,
      triggerIntegrationOnClose,
      wavoip,
      notificamehubToken: finalNotificamehubToken,
      notificamehubChannelId: finalNotificamehubChannelId
    },
    { include: ["queues", "company"] }
  );

  await AssociateWhatsappQueue(whatsapp, queueIds);

  // Se for NotificameHub, buscar token da empresa e inicializar sessão
  if (provider === "notificamehub") {
    try {
      // Recarregar whatsapp para garantir que temos todos os dados salvos
      await whatsapp.reload();
      logger.info(`[NotificameHub] Creating connection - whatsappId: ${whatsapp.id}, channelId from param: ${notificamehubChannelId}, channelId from DB: ${whatsapp.notificamehubChannelId}`);

      // Validar que Channel ID foi fornecido ou salvo
      if (!whatsapp.notificamehubChannelId && !notificamehubChannelId) {
        logger.error(`[NotificameHub] Channel ID is required for NotificameHub provider`);
        await whatsapp.update({ 
          status: "DISCONNECTED",
          qrcode: "ERR_NOTIFICAMEHUB_CHANNEL_ID_REQUIRED"
        });
        throw new AppError("ERR_NOTIFICAMEHUB_CHANNEL_ID_REQUIRED: Channel ID é obrigatório para NotificameHub");
      }

      // Se o channelId não foi salvo, salvar agora
      if (!whatsapp.notificamehubChannelId && notificamehubChannelId) {
        logger.info(`[NotificameHub] Updating connection with channelId: ${notificamehubChannelId}`);
        await whatsapp.update({ notificamehubChannelId });
        await whatsapp.reload();
      }

      // Buscar o token geral da empresa se não foi fornecido
      let finalToken = notificamehubToken;
      if (!finalToken) {
        const settings = await CompaniesSettings.findOne({
          where: { companyId }
        });
        finalToken = settings?.notificamehubToken || "";
        logger.info(`[NotificameHub] Token fetched from company settings: ${finalToken ? "found" : "not found"}`);
      }

      if (!finalToken) {
        logger.error(`[NotificameHub] No token available for connection ${whatsapp.id}. Configure in Company Settings.`);
        await whatsapp.update({ 
          status: "DISCONNECTED",
          qrcode: "ERR_NOTIFICAMEHUB_TOKEN_REQUIRED"
        });
        throw new AppError("ERR_NOTIFICAMEHUB_TOKEN_REQUIRED: Configure NotificameHub token in Company Settings");
      }

      // Gerar a URL do webhook
      const backendUrl = process.env.BACKEND_URL || "http://localhost:8080";
      const webhookUrl = `${backendUrl}/webhooks/notificamehub/${whatsapp.id}`;

      // Atualizar o whatsapp com todos os dados necessários de uma vez
      await whatsapp.update({ 
        notificamehubToken: finalToken,
        notificamehubChannelId: whatsapp.notificamehubChannelId || notificamehubChannelId,
        webhookUrl: webhookUrl
      });

      logger.info(`[NotificameHub] Initializing session for new connection ${whatsapp.id} (channelId: ${whatsapp.notificamehubChannelId})`);

      // Recarregar o whatsapp com os dados atualizados
      await whatsapp.reload();
      logger.info(`[NotificameHub] After final reload - Token: ${whatsapp.notificamehubToken ? "present" : "missing"}, ChannelId: ${whatsapp.notificamehubChannelId ? whatsapp.notificamehubChannelId : "missing"}`);

      // Para NotificameHub, usar o status fornecido ou marcar como CONNECTED
      const finalStatus = status === "CONNECTED" ? "CONNECTED" : "CONNECTED";
      await whatsapp.update({ status: finalStatus, qrcode: "", retries: 0 });
      
      logger.info(`[NotificameHub] Connection ${whatsapp.id} marked as ${finalStatus}`);
      
      // Inicializar a sessão NotificameHub (isso também pode configurar o webhook via API)
      try {
        await initNotificameHubSession(whatsapp);
        logger.info(`[NotificameHub] Session initialized successfully for ${whatsapp.name}`);
      } catch (sessionError: any) {
        logger.warn(`[NotificameHub] Session init warning (keeping ${finalStatus}): ${sessionError.message}`);
        // Manter como CONNECTED mesmo se houver erro na inicialização da sessão
        // O webhook pode funcionar independentemente
      }
      logger.info(`[NotificameHub] Connection ${whatsapp.id} created successfully. Webhook URL: ${webhookUrl}`);

    } catch (err: any) {
      logger.error(`[NotificameHub] Error initializing session: ${err.message}`);
      // Não lançar erro, apenas logar - a conexão foi criada mas não inicializada
      // Isso permite que o usuário tente corrigir a configuração depois
    }
  }

  return { whatsapp, oldDefaultWhatsapp };
};

export default CreateWhatsAppService;