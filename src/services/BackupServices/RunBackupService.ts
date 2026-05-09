import CompaniesSettings from "../../models/CompaniesSettings";
import Company from "../../models/Company";
import BackupDatabaseService from "./BackupDatabaseService";
import BackupFilesService from "./BackupFilesService";
import CloudStorageService from "./CloudStorageService";
import CleanupOldBackupsService from "./CleanupOldBackupsService";
import logger from "../../utils/logger";

interface BackupRequest {
  companyId: number;
  force?: boolean; // allow manual run even if disabled
}

interface BackupResult {
  success: boolean;
  companyId: number;
  database?: {
    success: boolean;
    fileName?: string;
    fileSize?: number;
    cloudUpload?: boolean;
    error?: string;
  };
  files?: {
    success: boolean;
    fileName?: string;
    fileSize?: number;
    fileCount?: number;
    cloudUpload?: boolean;
    error?: string;
  };
  totalSize: number;
  duration: number;
  errors: string[];
}

const RunBackupService = async ({
  companyId,
  force = false
}: BackupRequest): Promise<BackupResult> => {
  const startTime = Date.now();
  const errors: string[] = [];
  let totalSize = 0;

  const result: BackupResult = {
    success: false,
    companyId,
    totalSize: 0,
    duration: 0,
    errors: []
  };

  try {
    console.log(`[BACKUP] ========== Starting backup for company ${companyId} ==========`);

    // Buscar configurações
    const settings = await CompaniesSettings.findOne({
      where: { companyId }
    });

    if (!settings) {
      throw new Error("Company settings not found");
    }

    if (!settings.backupEnabled && !force) {
      throw new Error("Backup is not enabled for this company");
    }

    // Buscar informações da empresa
    const company = await Company.findByPk(companyId);
    const companyName = company?.name?.replace(/[^a-z0-9]/gi, "_") || `company${companyId}`;

    // Atualizar status para "running"
    await settings.update({
      backupLastStatus: "running"
    });

    // 1. BACKUP DO BANCO DE DADOS
    if (settings.backupDatabase) {
      console.log(`[BACKUP] Starting database backup...`);
      const dbBackup = await BackupDatabaseService({
        companyId,
        companyName
      });

      result.database = {
        success: dbBackup.success,
        fileName: dbBackup.fileName,
        fileSize: dbBackup.fileSize,
        cloudUpload: false,
        error: dbBackup.error
      };

      if (dbBackup.success) {
        totalSize += dbBackup.fileSize;

        // Upload para cloud se configurado
        if (settings.backupCloudProvider && settings.backupCloudProvider !== "local") {
          console.log(`[BACKUP] Uploading database backup to ${settings.backupCloudProvider}...`);

          const uploadResult = await CloudStorageService.upload({
            filePath: dbBackup.filePath,
            fileName: dbBackup.fileName,
            config: {
              provider: settings.backupCloudProvider as any,
              ...settings.backupCloudConfig
            }
          });

          result.database.cloudUpload = uploadResult.success;

          if (!uploadResult.success) {
            errors.push(`Database cloud upload failed: ${uploadResult.error}`);
          }
        }
      } else {
        errors.push(`Database backup failed: ${dbBackup.error}`);
      }
    }

    // 2. BACKUP DE ARQUIVOS
    if (settings.backupFiles) {
      console.log(`[BACKUP] Starting files backup...`);
      const filesBackup = await BackupFilesService({
        companyId,
        companyName
      });

      result.files = {
        success: filesBackup.success,
        fileName: filesBackup.fileName,
        fileSize: filesBackup.fileSize,
        fileCount: filesBackup.fileCount,
        cloudUpload: false,
        error: filesBackup.error
      };

      if (filesBackup.success) {
        totalSize += filesBackup.fileSize;

        // Upload para cloud se configurado
        if (settings.backupCloudProvider && settings.backupCloudProvider !== "local") {
          console.log(`[BACKUP] Uploading files backup to ${settings.backupCloudProvider}...`);

          const uploadResult = await CloudStorageService.upload({
            filePath: filesBackup.filePath,
            fileName: filesBackup.fileName,
            config: {
              provider: settings.backupCloudProvider as any,
              ...settings.backupCloudConfig
            }
          });

          result.files.cloudUpload = uploadResult.success;

          if (!uploadResult.success) {
            errors.push(`Files cloud upload failed: ${uploadResult.error}`);
          }
        }
      } else {
        if (filesBackup.error && !filesBackup.error.includes("no files to backup")) {
          errors.push(`Files backup failed: ${filesBackup.error}`);
        }
      }
    }

    // Calcular duração
    const duration = Date.now() - startTime;

    // Determinar se foi bem-sucedido
    const success =
      (result.database?.success || !settings.backupDatabase) &&
      (result.files?.success || !settings.backupFiles || result.files?.error?.includes("no files"));

    // Atualizar configurações
    await settings.update({
      backupLastRun: new Date(),
      backupLastStatus: success ? "success" : "failed",
      backupLastError: errors.length > 0 ? errors.join("; ") : null
    });

    result.success = success;
    result.totalSize = totalSize;
    result.duration = duration;
    result.errors = errors;

    // 3. LIMPEZA DE BACKUPS ANTIGOS (apenas se o backup foi bem-sucedido)
    if (success && settings.backupRetentionDays && settings.backupRetentionDays > 0) {
      console.log(`[BACKUP] Starting cleanup of old backups...`);
      try {
        const cleanupResult = await CleanupOldBackupsService(companyId);
        
        if (cleanupResult.success) {
          const totalDeleted = cleanupResult.deletedFiles.database.length + cleanupResult.deletedFiles.files.length;
          console.log(`[BACKUP] Cleanup completed: ${totalDeleted} old backup files deleted`);
        } else {
          console.log(`[BACKUP] Cleanup completed with errors: ${cleanupResult.errors.join("; ")}`);
          // Não adicionar aos erros principais pois a limpeza é secundária
        }
      } catch (cleanupError) {
        console.error(`[BACKUP] Cleanup failed: ${cleanupError.message}`);
        // Não falhar o backup por causa da limpeza
      }
    }

    console.log(`[BACKUP] ========== Backup completed ==========`);
    console.log(`[BACKUP] Success: ${success}`);
    console.log(`[BACKUP] Total size: ${(totalSize / 1024 / 1024).toFixed(2)} MB`);
    console.log(`[BACKUP] Duration: ${(duration / 1000).toFixed(2)}s`);
    if (errors.length > 0) {
      console.log(`[BACKUP] Errors: ${errors.length}`);
      errors.forEach((err, idx) => console.error(`[BACKUP]   ${idx + 1}. ${err}`));
    }
    console.log(`[BACKUP] ==========================================`);

    return result;

  } catch (error) {
    const duration = Date.now() - startTime;
    logger.error(`[BACKUP] Fatal error: ${error.message}`);

    // Atualizar status para "failed"
    try {
      const settings = await CompaniesSettings.findOne({ where: { companyId } });
      if (settings) {
        await settings.update({
          backupLastStatus: "failed",
          backupLastError: error.message
        });
      }
    } catch (updateError) {
      logger.error(`[BACKUP] Failed to update settings: ${updateError.message}`);
    }

    return {
      success: false,
      companyId,
      totalSize,
      duration,
      errors: [error.message]
    };
  }
};

export default RunBackupService;