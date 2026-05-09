import CompaniesSettings from "../../models/CompaniesSettings";
import CleanupOldBackupsService from "./CleanupOldBackupsService";
import logger from "../../utils/logger";

const RunAutomaticCleanupService = async (): Promise<void> => {
  try {
    console.log(`[BACKUP_CLEANUP_CRON] ========================================`);
    console.log(`[BACKUP_CLEANUP_CRON] Starting automatic cleanup of old backups`);

    // Buscar TODAS as empresas com backup habilitado e retenção configurada
    const companiesWithBackup = await CompaniesSettings.findAll({
      where: {
        backupEnabled: true
      }
    });

    if (companiesWithBackup.length === 0) {
      console.log("[BACKUP_CLEANUP_CRON] No companies with backup enabled");
      console.log(`[BACKUP_CLEANUP_CRON] ========================================`);
      return;
    }

    console.log(`[BACKUP_CLEANUP_CRON] Found ${companiesWithBackup.length} company(ies) with backup enabled`);

    let processed = 0;
    let skipped = 0;
    let totalDeleted = 0;

    // Processar cada empresa
    for (const settings of companiesWithBackup) {
      console.log(`\n[BACKUP_CLEANUP_CRON] Company ${settings.companyId}:`);
      console.log(`  Retention days: ${settings.backupRetentionDays || 'not set'}`);

      // Verificar se tem política de retenção configurada
      if (!settings.backupRetentionDays || settings.backupRetentionDays <= 0) {
        console.log(`  ⏭️ Skipping (no retention policy)`);
        skipped++;
        continue;
      }

      console.log(`  🧹 Running cleanup...`);
      processed++;

      try {
        const result = await CleanupOldBackupsService(settings.companyId);
        
        const deletedCount = result.deletedFiles.database.length + result.deletedFiles.files.length;
        totalDeleted += deletedCount;

        if (result.success) {
          console.log(`  ✅ SUCCESS: ${deletedCount} files deleted`);
        } else {
          console.log(`  ⚠️ PARTIAL: ${deletedCount} files deleted, ${result.errors.length} errors`);
          result.errors.forEach(error => {
            console.log(`    - ${error}`);
          });
        }
      } catch (error) {
        console.error(`  ❌ ERROR: ${error.message}`);
      }
    }

    console.log(`\n[BACKUP_CLEANUP_CRON] ========================================`);
    console.log(`[BACKUP_CLEANUP_CRON] Total companies: ${companiesWithBackup.length}`);
    console.log(`[BACKUP_CLEANUP_CRON] Processed: ${processed} | Skipped: ${skipped}`);
    console.log(`[BACKUP_CLEANUP_CRON] Total files deleted: ${totalDeleted}`);
    console.log(`[BACKUP_CLEANUP_CRON] ========================================`);

  } catch (error) {
    logger.error(`[BACKUP_CLEANUP_CRON] Fatal error: ${error.message}`);
  }
};

export default RunAutomaticCleanupService;