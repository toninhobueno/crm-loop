import fs from "fs";
import path from "path";
import CompaniesSettings from "../../models/CompaniesSettings";
import logger from "../../utils/logger";

interface CleanupResult {
  success: boolean;
  companyId: number;
  deletedFiles: {
    database: string[];
    files: string[];
  };
  errors: string[];
}

const CleanupOldBackupsService = async (companyId: number): Promise<CleanupResult> => {
  const result: CleanupResult = {
    success: false,
    companyId,
    deletedFiles: {
      database: [],
      files: []
    },
    errors: []
  };

  try {
    console.log(`[BACKUP_CLEANUP] Starting cleanup for company ${companyId}`);

    // Buscar configurações da empresa
    const settings = await CompaniesSettings.findOne({
      where: { companyId }
    });

    if (!settings) {
      throw new Error("Company settings not found");
    }

    if (!settings.backupRetentionDays || settings.backupRetentionDays <= 0) {
      console.log(`[BACKUP_CLEANUP] No retention policy set for company ${companyId}`);
      result.success = true;
      return result;
    }

    const retentionDays = settings.backupRetentionDays;
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - retentionDays);

    console.log(`[BACKUP_CLEANUP] Retention policy: ${retentionDays} days`);
    console.log(`[BACKUP_CLEANUP] Cutoff date: ${cutoffDate.toISOString()}`);

    const backupDir = path.join(__dirname, "..", "..", "backups", `company${companyId}`);

    if (!fs.existsSync(backupDir)) {
      console.log(`[BACKUP_CLEANUP] Backup directory does not exist: ${backupDir}`);
      result.success = true;
      return result;
    }

    // Limpar backups de banco de dados
    const databaseDir = path.join(backupDir, "database");
    if (fs.existsSync(databaseDir)) {
      const dbFiles = fs.readdirSync(databaseDir);
      
      for (const file of dbFiles) {
        const filePath = path.join(databaseDir, file);
        const stats = fs.statSync(filePath);
        
        if (stats.mtime < cutoffDate) {
          try {
            fs.unlinkSync(filePath);
            result.deletedFiles.database.push(file);
            console.log(`[BACKUP_CLEANUP] Deleted database backup: ${file} (created: ${stats.mtime.toISOString()})`);
          } catch (error) {
            const errorMsg = `Failed to delete database backup ${file}: ${error.message}`;
            result.errors.push(errorMsg);
            console.error(`[BACKUP_CLEANUP] ${errorMsg}`);
          }
        }
      }
    }

    // Limpar backups de arquivos
    const filesDir = path.join(backupDir, "files");
    if (fs.existsSync(filesDir)) {
      const fileBackups = fs.readdirSync(filesDir);
      
      for (const file of fileBackups) {
        const filePath = path.join(filesDir, file);
        const stats = fs.statSync(filePath);
        
        if (stats.mtime < cutoffDate) {
          try {
            fs.unlinkSync(filePath);
            result.deletedFiles.files.push(file);
            console.log(`[BACKUP_CLEANUP] Deleted files backup: ${file} (created: ${stats.mtime.toISOString()})`);
          } catch (error) {
            const errorMsg = `Failed to delete files backup ${file}: ${error.message}`;
            result.errors.push(errorMsg);
            console.error(`[BACKUP_CLEANUP] ${errorMsg}`);
          }
        }
      }
    }

    const totalDeleted = result.deletedFiles.database.length + result.deletedFiles.files.length;
    console.log(`[BACKUP_CLEANUP] Cleanup completed for company ${companyId}`);
    console.log(`[BACKUP_CLEANUP] Total files deleted: ${totalDeleted}`);
    console.log(`[BACKUP_CLEANUP] Database backups deleted: ${result.deletedFiles.database.length}`);
    console.log(`[BACKUP_CLEANUP] Files backups deleted: ${result.deletedFiles.files.length}`);

    if (result.errors.length > 0) {
      console.log(`[BACKUP_CLEANUP] Errors: ${result.errors.length}`);
      result.errors.forEach((error, idx) => {
        console.error(`[BACKUP_CLEANUP]   ${idx + 1}. ${error}`);
      });
    }

    result.success = result.errors.length === 0;
    return result;

  } catch (error) {
    const errorMsg = `Fatal error during cleanup: ${error.message}`;
    result.errors.push(errorMsg);
    logger.error(`[BACKUP_CLEANUP] ${errorMsg}`);
    
    result.success = false;
    return result;
  }
};

export default CleanupOldBackupsService;