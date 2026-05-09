import { exec } from "child_process";
import { promisify } from "util";
import path from "path";
import fs from "fs";
import archiver from "archiver";

const execAsync = promisify(exec);
const mkdirAsync = promisify(fs.mkdir);

interface BackupFilesRequest {
  companyId: number;
  companyName?: string;
}

interface BackupFilesResponse {
  success: boolean;
  filePath: string;
  fileName: string;
  fileSize: number;
  fileCount: number;
  timestamp: Date;
  error?: string;
}

const BackupFilesService = async ({
  companyId,
  companyName = `company${companyId}`
}: BackupFilesRequest): Promise<BackupFilesResponse> => {
  return new Promise(async (resolve, reject) => {
    try {
      const timestamp = new Date();
      const dateStr = timestamp.toISOString().replace(/[:.]/g, "-").split("T")[0];
      const timeStr = timestamp.toISOString().replace(/[:.]/g, "-").split("T")[1].substring(0, 8);

      // Nome do arquivo de backup
      const fileName = `backup_files_${companyName}_${dateStr}_${timeStr}.zip`;

      // Diretório de backups
      const backupDir = path.join(
        __dirname,
        "..",
        "..",
        "..",
        "backups",
        `company${companyId}`,
        "files"
      );

      // Criar diretório se não existir
      if (!fs.existsSync(backupDir)) {
        await mkdirAsync(backupDir, { recursive: true });
      }

      const filePath = path.join(backupDir, fileName);

      // Diretório da empresa para backup
      const companyDir = path.join(
        __dirname,
        "..",
        "..",
        "..",
        "public",
        `company${companyId}`
      );

      // Verificar se o diretório existe
      if (!fs.existsSync(companyDir)) {
        resolve({
          success: true,
          filePath: "",
          fileName: "",
          fileSize: 0,
          fileCount: 0,
          timestamp,
          error: "Company directory does not exist (no files to backup)"
        });
        return;
      }

      console.log(`[BACKUP_FILES] Starting files backup for company ${companyId}...`);
      console.log(`[BACKUP_FILES] Source: ${companyDir}`);
      console.log(`[BACKUP_FILES] Backup file: ${fileName}`);

      // Criar stream de saída
      const output = fs.createWriteStream(filePath);
      const archive = archiver("zip", {
        zlib: { level: 9 } // Compressão máxima
      });

      let fileCount = 0;

      // Event handlers
      output.on("close", () => {
        const fileSize = archive.pointer();
        console.log(`[BACKUP_FILES] Backup completed successfully`);
        console.log(`[BACKUP_FILES] Total bytes: ${fileSize}`);
        console.log(`[BACKUP_FILES] Total files: ${fileCount}`);
        console.log(`[BACKUP_FILES] File size: ${(fileSize / 1024 / 1024).toFixed(2)} MB`);

        resolve({
          success: true,
          filePath,
          fileName,
          fileSize,
          fileCount,
          timestamp
        });
      });

      archive.on("warning", (err) => {
        if (err.code === "ENOENT") {
          console.warn(`[BACKUP_FILES] Warning: ${err.message}`);
        } else {
          throw err;
        }
      });

      archive.on("error", (err) => {
        console.error(`[BACKUP_FILES] Error: ${err.message}`);
        reject({
          success: false,
          filePath: "",
          fileName: "",
          fileSize: 0,
          fileCount: 0,
          timestamp,
          error: err.message
        });
      });

      archive.on("entry", (entry) => {
        if (entry.stats?.isFile()) {
          fileCount++;
          if (fileCount % 100 === 0) {
            console.log(`[BACKUP_FILES] Archived ${fileCount} files...`);
          }
        }
      });

      // Pipe archive para o output
      archive.pipe(output);

      // Adicionar todos os arquivos do diretório
      archive.directory(companyDir, false);

      // Finalizar o arquivo
      await archive.finalize();

    } catch (error) {
      console.error(`[BACKUP_FILES] Error creating files backup: ${error.message}`);
      resolve({
        success: false,
        filePath: "",
        fileName: "",
        fileSize: 0,
        fileCount: 0,
        timestamp: new Date(),
        error: error.message
      });
    }
  });
};

export default BackupFilesService;

