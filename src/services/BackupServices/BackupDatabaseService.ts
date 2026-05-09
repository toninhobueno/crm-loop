import { exec } from "child_process";
import { promisify } from "util";
import path from "path";
import fs from "fs";
import AppError from "../../errors/AppError";

const execAsync = promisify(exec);
const mkdirAsync = promisify(fs.mkdir);

interface BackupDatabaseRequest {
  companyId: number;
  companyName?: string;
}

interface BackupDatabaseResponse {
  success: boolean;
  filePath: string;
  fileName: string;
  fileSize: number;
  timestamp: Date;
  error?: string;
}

const BackupDatabaseService = async ({
  companyId,
  companyName = `company${companyId}`
}: BackupDatabaseRequest): Promise<BackupDatabaseResponse> => {
  try {
    const timestamp = new Date();
    const iso = timestamp.toISOString().replace(/[:.]/g, "-");
    const [dateStr, timeStrRaw] = iso.split("T");
    const timeStr = timeStrRaw.substring(0, 8);

    // Nome do arquivo de backup
    const fileName = `backup_db_${companyName}_${dateStr}_${timeStr}.dump`;

    // Diretório de backups
    const backupDir = path.join(
      __dirname,
      "..",
      "..",
      "..",
      "backups",
      `company${companyId}`,
      "database"
    );

    // Criar diretório se não existir
    if (!fs.existsSync(backupDir)) {
      await mkdirAsync(backupDir, { recursive: true });
    }

    const filePath = path.join(backupDir, fileName);

    // Configurações do banco de dados
    const dbHost = process.env.DB_HOST || "localhost";
    const dbPort = process.env.DB_PORT || "5432";
    const dbName = process.env.DB_NAME || "whaticket";
    const dbUser = process.env.DB_USER || "postgres";
    const dbPass = process.env.DB_PASS || "";

    console.log(`[BACKUP_DB] Starting database backup for company ${companyId}...`);
    console.log(`[BACKUP_DB] Backup file: ${fileName}`);

    // Comando pg_dump
    const pgDumpBase = `pg_dump -h ${dbHost} -p ${dbPort} -U ${dbUser} -F c -b -v -f "${filePath}" ${dbName}`;

    // Executar backup
    const { stdout, stderr } = await execAsync(pgDumpBase, {
      maxBuffer: 1024 * 1024 * 100, // 100MB buffer
      timeout: 300000, // 5 minutos timeout
      env: {
        ...process.env,
        PGPASSWORD: dbPass
      }
    });

    if (stderr && !stderr.includes("successfully")) {
      console.log(`[BACKUP_DB] pg_dump stderr: ${stderr}`);
    }

    // Verificar se o arquivo foi criado
    if (!fs.existsSync(filePath)) {
      throw new Error("Backup file was not created");
    }

    // Obter tamanho do arquivo
    const stats = fs.statSync(filePath);
    const fileSize = stats.size;

    console.log(`[BACKUP_DB] Backup completed successfully`);
    console.log(`[BACKUP_DB] File size: ${(fileSize / 1024 / 1024).toFixed(2)} MB`);

    return {
      success: true,
      filePath,
      fileName,
      fileSize,
      timestamp
    };

  } catch (error) {
    console.error(`[BACKUP_DB] Error creating database backup: ${error.message}`);

    return {
      success: false,
      filePath: "",
      fileName: "",
      fileSize: 0,
      timestamp: new Date(),
      error: error.message
    };
  }
};

export default BackupDatabaseService;

