import 'dotenv/config';
import gracefulShutdown from "http-graceful-shutdown";
import app from "./app";
import cron from "node-cron";
import { initIO } from "./libs/socket";
import logger from "./utils/logger";
import { StartAllWhatsAppsSessions } from "./services/WbotServices/StartAllWhatsAppsSessions";
import { initializeWhatsAppVersion } from "./libs/wbot";
import Company from "./models/Company";
import BullQueue from './libs/queue';

import { startQueueProcess } from "./queues";
// Importar diretamente do arquivo, não do index de jobs
import { startLidSyncJob } from "./jobs/LidSyncJob";
import RunAutomaticBackupsService from "./services/BackupServices/RunAutomaticBackupsService";
import RunAutomaticCleanupService from "./services/BackupServices/RunAutomaticCleanupService";
// import { ScheduledMessagesJob, ScheduleMessagesGenerateJob, ScheduleMessagesEnvioJob, ScheduleMessagesEnvioForaHorarioJob } from "./wbotScheduledMessages";

const server = app.listen(process.env.PORT, async () => {
  // ✅ Inicializar versão do WhatsApp Web ANTES de iniciar as sessões
  logger.info("🔄 Inicializando versão do WhatsApp Web...");
  await initializeWhatsAppVersion();
  
  const companies = await Company.findAll({
    where: { status: true },
    attributes: ["id"]
  });

  const allPromises: any[] = [];
  companies.map(async c => {
    const promise = StartAllWhatsAppsSessions(c.id);
    allPromises.push(promise);
  });

  Promise.all(allPromises).then(async () => {

    await startQueueProcess();
  });

  if (process.env.REDIS_URI_ACK && process.env.REDIS_URI_ACK !== '') {
    BullQueue.process();
  }

  // Iniciar job de sincronização de LIDs
  startLidSyncJob();

  logger.info(`Server started on port: ${process.env.PORT}`);
});

process.on("uncaughtException", err => {
  console.error(`${new Date().toUTCString()} uncaughtException:`, err.message);
  console.error(err.stack);
  process.exit(1);
});

process.on("unhandledRejection", (reason, p) => {
  console.error(
    `${new Date().toUTCString()} unhandledRejection:`,
    reason,
    p
  );
  process.exit(1);
});

// cron.schedule("* * * * * *", async () => {

//   try {
//     // console.log("Running a job at 5 minutes at America/Sao_Paulo timezone")
//     await ScheduledMessagesJob();
//     await ScheduleMessagesGenerateJob();
//   }
//   catch (error) {
//     logger.error(error);
//   }

// });

// cron.schedule("* * * * * *", async () => {

//   try {
//     // console.log("Running a job at 01:00 at America/Sao_Paulo timezone")
//     console.log("Running a job at 2 minutes at America/Sao_Paulo timezone")
//     await ScheduleMessagesEnvioJob();
//     await ScheduleMessagesEnvioForaHorarioJob()
//   }
//   catch (error) {
//     logger.error(error);
//   }

// });

// Cron job para backups automáticos
// Executa A CADA HORA no minuto 00 e verifica quais empresas devem fazer backup
// Permite que cada empresa configure seu próprio horário (respeita apenas a hora, não os minutos)
cron.schedule("0 * * * *", async () => {
  try {
    const now = new Date();
    const currentHour = now.getHours().toString().padStart(2, '0');
    console.log(`[CRON] Verificando backups agendados para ${currentHour}:00...`);
    await RunAutomaticBackupsService();
  } catch (error) {
    logger.error("[CRON] Erro no job de backups:", error);
  }
}, {
  scheduled: true,
  timezone: "America/Sao_Paulo"
});

// Cron job para limpeza automática de backups antigos
// Executa diariamente às 02:00 para limpar backups antigos baseado na política de retenção
cron.schedule("0 2 * * *", async () => {
  try {
    console.log(`[CRON] Executando limpeza automática de backups antigos...`);
    await RunAutomaticCleanupService();
  } catch (error) {
    logger.error("[CRON] Erro no job de limpeza de backups:", error);
  }
}, {
  scheduled: true,
  timezone: "America/Sao_Paulo"
});

initIO(server);
gracefulShutdown(server);