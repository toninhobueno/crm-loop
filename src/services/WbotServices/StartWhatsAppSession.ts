import { initWASocket } from "../../libs/wbot";
import Whatsapp from "../../models/Whatsapp";
import { wbotMessageListener } from "./wbotMessageListener";
import { getIO } from "../../libs/socket";
import wbotMonitor from "./wbotMonitor";
import logger from "../../utils/logger";
import * as Sentry from "@sentry/node";
import { redisGroupCache } from "../../utils/RedisGroupCache";
import { initUAZApiSession } from "../../libs/uazapi";

export const StartWhatsAppSession = async (
  whatsapp: Whatsapp,
  companyId: number
): Promise<void> => {
  await whatsapp.update({ status: "OPENING" });

  const io = getIO();
  io.of(String(companyId))
    .emit(`company-${companyId}-whatsappSession`, {
      action: "update",
      session: whatsapp
    });

  try {
    // DEBUG: Log do provider
    logger.info(`[DEBUG] StartWhatsAppSession - WhatsApp ID: ${whatsapp.id}, Provider: "${whatsapp.provider}", Channel: "${whatsapp.channel}"`);
    
    // Verificar provider
    if (whatsapp.provider === "uazapi") {
      // Iniciar sessão UAZApi
      logger.info(`[UAZApi] Starting UAZApi session for whatsapp ${whatsapp.id}`);
      await initUAZApiSession(whatsapp);
      logger.info(`[UAZApi] UAZApi session started for whatsapp ${whatsapp.id}`);
      return;
    }

    // DEBUG: Se chegou aqui, não é UAZApi
    logger.info(`[DEBUG] Provider "${whatsapp.provider}" não é UAZApi, usando Baileys`);
    

    // Provider padrão (Baileys) ou outros
    const wbot = await initWASocket(whatsapp);

    if (wbot.id) {

      const groups = await wbot.groupFetchAllParticipating()
      if (groups) {
        for (const [id, groupMetadata] of Object.entries(groups)) {
          //limpa os grupos existentes no cache
          await redisGroupCache.del(whatsapp.id, id);

          await redisGroupCache.set(whatsapp.id, id, groupMetadata);
        }
      }

      wbotMessageListener(wbot, companyId);
      wbotMonitor(wbot, whatsapp, companyId);
    }
  } catch (err) {
    Sentry.captureException(err);
    logger.error(err);
  }
};
