import CompaniesSettings from "../../models/CompaniesSettings";
import Whatsapp from "../../models/Whatsapp";
import logger from "../../utils/logger";

interface ConfigureTokensRequest {
  companyId: number;
  apiToken: string;
  channelId?: string;
}

const ConfigureNotificameHubTokens = async ({
  companyId,
  apiToken,
  channelId
}: ConfigureTokensRequest): Promise<void> => {
  try {
    logger.info(`[NotificameHub] Configurando tokens para empresa ${companyId}`);

    // 1. Salvar token da API nas configurações da empresa
    let companySettings = await CompaniesSettings.findOne({
      where: { companyId }
    });

    if (!companySettings) {
      companySettings = await CompaniesSettings.create({
        companyId,
        notificamehubToken: apiToken
      });
      logger.info(`[NotificameHub] Configurações criadas para empresa ${companyId}`);
    } else {
      await companySettings.update({
        notificamehubToken: apiToken
      });
      logger.info(`[NotificameHub] Token atualizado para empresa ${companyId}`);
    }

    // 2. Atualizar todas as conexões NotificameHub existentes sem token
    const whatsappsToUpdate = await Whatsapp.findAll({
      where: {
        companyId,
        provider: "notificamehub",
        notificamehubToken: null
      }
    });

    for (const whatsapp of whatsappsToUpdate) {
      const updateData: any = {
        notificamehubToken: apiToken
      };

      // Se for Instagram e não tiver channelId, usar o fornecido
      if (whatsapp.channel === "instagram" && !whatsapp.notificamehubChannelId && channelId) {
        updateData.notificamehubChannelId = channelId;
      }

      await whatsapp.update(updateData);
      logger.info(`[NotificameHub] Conexão ${whatsapp.id} (${whatsapp.name}) atualizada com tokens`);
    }

    logger.info(`[NotificameHub] Configuração concluída para empresa ${companyId}`);
  } catch (error: any) {
    logger.error(`[NotificameHub] Erro ao configurar tokens: ${error.message}`);
    throw error;
  }
};

export default ConfigureNotificameHubTokens;