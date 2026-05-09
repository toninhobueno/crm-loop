import CompaniesSettings from "../../models/CompaniesSettings";
import RunBackupService from "./RunBackupService";
import logger from "../../utils/logger";

const RunAutomaticBackupsService = async (): Promise<void> => {
  try {
    const now = new Date();
    const currentHour = now.getHours().toString().padStart(2, '0');
    const currentTime = `${currentHour}:00`;
    
    console.log(`[BACKUP_CRON] ========================================`);
    console.log(`[BACKUP_CRON] Verificando backups para ${currentTime}`);

    // Buscar TODAS as empresas com backup habilitado
    const companiesWithBackup = await CompaniesSettings.findAll({
      where: {
        backupEnabled: true
      }
    });

    if (companiesWithBackup.length === 0) {
      console.log("[BACKUP_CRON] Nenhuma empresa com backup habilitado");
      console.log(`[BACKUP_CRON] ========================================`);
      return;
    }

    console.log(`[BACKUP_CRON] Encontradas ${companiesWithBackup.length} empresa(s) com backup habilitado`);

    let executed = 0;
    let skipped = 0;

    // Processar cada empresa
    for (const settings of companiesWithBackup) {
      const configHour = settings.backupTime.split(':')[0];
      
      console.log(`\n[BACKUP_CRON] Empresa ${settings.companyId}:`);
      console.log(`  Horário config: ${settings.backupTime} | Horário atual: ${currentTime}`);
      console.log(`  Comparando: ${configHour} === ${currentHour}`);

      // Verificar se é a hora desta empresa
      if (configHour === currentHour) {
        console.log(`  ✅ HORÁRIO BATE! Executando backup...`);
        executed++;

        try {
          const result = await RunBackupService({ companyId: settings.companyId });
          
          if (result.success) {
            console.log(`  ✅ SUCESSO: ${(result.totalSize / 1024 / 1024).toFixed(2)} MB`);
          } else {
            console.log(`  ❌ FALHOU: ${result.errors.join(", ")}`);
          }
        } catch (error) {
          console.error(`  ❌ ERRO: ${error.message}`);
        }
      } else {
        console.log(`  ⏭️ Pulando (não é o horário)`);
        skipped++;
      }
    }

    console.log(`\n[BACKUP_CRON] ========================================`);
    console.log(`[BACKUP_CRON] Total: ${companiesWithBackup.length} | Executados: ${executed} | Pulados: ${skipped}`);
    console.log(`[BACKUP_CRON] ========================================`);

  } catch (error) {
    logger.error(`[BACKUP_CRON] Erro fatal: ${error.message}`);
  }
};

export default RunAutomaticBackupsService;
