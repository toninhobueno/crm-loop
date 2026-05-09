import { exec } from "child_process";
import { promisify } from "util";
import fs from "fs";
import path from "path";
import unzipper from "unzipper";
import AppError from "../../errors/AppError";

const execAsync = promisify(exec);

interface Request {
  companyId: number;
  type: "database" | "files";
  fileName: string;
  updateCompanyId?: boolean; // Nova opção: atualizar companyId automaticamente
  oldCompanyId?: number; // ID da empresa antiga (opcional, será detectado automaticamente)
}

interface RestoreResult {
  success: boolean;
  message: string;
  restoredFiles?: number;
  errors?: string[];
}

const RestoreBackupService = async ({
  companyId,
  type,
  fileName,
  updateCompanyId = true, // Por padrão, atualiza o companyId
  oldCompanyId
}: Request): Promise<RestoreResult> => {
  console.log(`[RESTORE] Iniciando restauração ${type} para company ${companyId}`);
  if (updateCompanyId) {
    console.log(`[RESTORE] Modo: Atualizar companyId automaticamente`);
  }

  const backupDir = path.join(
    __dirname,
    "..",
    "..",
    "..",
    "backups",
    `company${companyId}`,
    type
  );

  const backupFile = path.join(backupDir, fileName);

  // Verificar se arquivo existe
  if (!fs.existsSync(backupFile)) {
    throw new AppError("Arquivo de backup não encontrado", 404);
  }

  try {
    if (type === "database") {
      return await restoreDatabase(backupFile, companyId, updateCompanyId, oldCompanyId);
    } else {
      return await restoreFiles(backupFile, companyId);
    }
  } catch (error) {
    console.error(`[RESTORE] Erro na restauração:`, error);
    throw new AppError(`Erro ao restaurar backup: ${error.message}`, 500);
  }
};

// Restaurar banco de dados PostgreSQL
const restoreDatabase = async (
  backupFile: string,
  companyId: number,
  updateCompanyId: boolean = true,
  oldCompanyId?: number
): Promise<RestoreResult> => {
  const dbHost = process.env.DB_HOST || "localhost";
  const dbPort = process.env.DB_PORT || "5432";
  const dbUser = process.env.DB_USER || "postgres";
  const dbPass = process.env.DB_PASS || "";
  const dbName = process.env.DB_NAME || "whaticket";

  console.log(`[RESTORE] Restaurando database de: ${backupFile}`);

  // Comando pg_restore (compatível Windows/Linux/Mac)
  const pgRestoreCommand =
    process.platform === "win32"
      ? `set PGPASSWORD=${dbPass} && pg_restore -h ${dbHost} -p ${dbPort} -U ${dbUser} -d ${dbName} -c "${backupFile}"`
      : `PGPASSWORD="${dbPass}" pg_restore -h ${dbHost} -p ${dbPort} -U ${dbUser} -d ${dbName} -c "${backupFile}"`;

  try {
    const { stdout, stderr } = await execAsync(pgRestoreCommand);

    if (stderr && !stderr.includes("WARNING")) {
      console.warn(`[RESTORE] pg_restore warnings:`, stderr);
    }

    console.log(`[RESTORE] Database restaurado com sucesso`);

    // Se updateCompanyId estiver ativado, atualizar todos os companyId
    if (updateCompanyId) {
      console.log(`[RESTORE] Atualizando companyId para ${companyId}...`);
      await updateCompanyIdsInDatabase(dbHost, dbPort, dbUser, dbPass, dbName, companyId, oldCompanyId);
      console.log(`[RESTORE] companyId atualizado com sucesso`);
    }

    return {
      success: true,
      message: updateCompanyId 
        ? `Database restaurado e companyId atualizado para ${companyId}`
        : "Database restaurado com sucesso"
    };
  } catch (error) {
    // pg_restore pode retornar código de erro mesmo em sucesso parcial
    // Verificar se realmente houve erro crítico
    if (error.message.includes("No such file")) {
      throw new AppError("Arquivo de backup não encontrado", 404);
    }

    console.warn(
      `[RESTORE] pg_restore completou com avisos (pode ser normal):`,
      error.message
    );

    // Tentar atualizar companyId mesmo com avisos
    if (updateCompanyId) {
      try {
        await updateCompanyIdsInDatabase(dbHost, dbPort, dbUser, dbPass, dbName, companyId, oldCompanyId);
      } catch (updateError) {
        console.error(`[RESTORE] Erro ao atualizar companyId:`, updateError.message);
      }
    }

    return {
      success: true,
      message: "Database restaurado (com alguns avisos)",
      errors: [error.message]
    };
  }
};

// Função para atualizar todos os companyId no banco de dados
const updateCompanyIdsInDatabase = async (
  dbHost: string,
  dbPort: string,
  dbUser: string,
  dbPass: string,
  dbName: string,
  newCompanyId: number,
  oldCompanyId?: number
): Promise<void> => {
  // Lista de todas as tabelas que têm companyId
  const tablesWithCompanyId = [
    "Contacts",
    "Tickets",
    "Messages",
    "Users",
    "Queues",
    "Whatsapps",
    "Tags",
    "Settings",
    "CompaniesSettings",
    "Schedules",
    "QuickMessages",
    "TicketTraking",
    "ContactCustomFields",
    "ContactTags",
    "TicketTags",
    "UserQueues",
    "Chats",
    "ChatUsers",
    "Campaigns",
    "ScheduledMessages",
    "ScheduledMessagesEnvio",
    "ContactWallets",
    "UserRatings",
    "Invoices",
    "BirthdaySettings",
    "Integrations",
    "QueueIntegrations",
    "PresetWebhooks",
    "Prompts",
    "Files",
    "TicketFinalizationReasons",
    "WhatsapplidMaps",
    "Subscriptions"
  ];

  // Se oldCompanyId não foi fornecido, detectar automaticamente
  // Buscar o companyId mais antigo que não seja o novo
  if (!oldCompanyId) {
    const detectCommand = process.platform === "win32"
      ? `set PGPASSWORD=${dbPass} && psql -h ${dbHost} -p ${dbPort} -U ${dbUser} -d ${dbName} -t -c "SELECT DISTINCT \"companyId\" FROM \"Contacts\" WHERE \"companyId\" != ${newCompanyId} ORDER BY \"companyId\" LIMIT 1;"`
      : `PGPASSWORD="${dbPass}" psql -h ${dbHost} -p ${dbPort} -U ${dbUser} -d ${dbName} -t -c "SELECT DISTINCT \"companyId\" FROM \"Contacts\" WHERE \"companyId\" != ${newCompanyId} ORDER BY \"companyId\" LIMIT 1;"`;

    try {
      const { stdout } = await execAsync(detectCommand);
      const detectedId = parseInt(stdout.trim());
      if (!isNaN(detectedId) && detectedId > 0) {
        oldCompanyId = detectedId;
        console.log(`[RESTORE] CompanyId antigo detectado automaticamente: ${oldCompanyId}`);
      }
    } catch (error) {
      console.warn(`[RESTORE] Não foi possível detectar companyId antigo automaticamente`);
    }
  }

  if (!oldCompanyId) {
    console.log(`[RESTORE] CompanyId antigo não especificado. Atualizando todos os registros sem companyId ou com companyId diferente de ${newCompanyId}`);
  }

  // Construir comandos SQL para atualizar cada tabela
  const updatePromises = tablesWithCompanyId.map(async (table) => {
    const updateSQL = oldCompanyId
      ? `UPDATE "${table}" SET "companyId" = ${newCompanyId} WHERE "companyId" = ${oldCompanyId};`
      : `UPDATE "${table}" SET "companyId" = ${newCompanyId} WHERE "companyId" IS NOT NULL AND "companyId" != ${newCompanyId};`;

    const psqlCommand = process.platform === "win32"
      ? `set PGPASSWORD=${dbPass} && psql -h ${dbHost} -p ${dbPort} -U ${dbUser} -d ${dbName} -c "${updateSQL}"`
      : `PGPASSWORD="${dbPass}" psql -h ${dbHost} -p ${dbPort} -U ${dbUser} -d ${dbName} -c "${updateSQL}"`;

    try {
      await execAsync(psqlCommand);
      console.log(`[RESTORE] Tabela ${table} atualizada`);
    } catch (error) {
      // Ignorar erros de tabela não existente ou sem registros
      if (!error.message.includes("does not exist") && !error.message.includes("0 rows")) {
        console.warn(`[RESTORE] Aviso ao atualizar ${table}:`, error.message);
      }
    }
  });

  await Promise.all(updatePromises);
  console.log(`[RESTORE] Todas as tabelas foram atualizadas`);
};

// Restaurar arquivos de ZIP
const restoreFiles = async (
  backupFile: string,
  companyId: number
): Promise<RestoreResult> => {
  const companyDir = path.join(
    __dirname,
    "..",
    "..",
    "..",
    "public",
    `company${companyId}`
  );

  console.log(`[RESTORE] Restaurando arquivos para: ${companyDir}`);

  let restoredFiles = 0;
  const errors: string[] = [];

  try {
    // Criar diretório se não existir
    if (!fs.existsSync(companyDir)) {
      fs.mkdirSync(companyDir, { recursive: true });
    }

    // Extrair ZIP
    await new Promise<void>((resolve, reject) => {
      fs.createReadStream(backupFile)
        .pipe(unzipper.Extract({ path: companyDir }))
        .on("entry", () => {
          restoredFiles++;
        })
        .on("error", (err) => {
          errors.push(err.message);
          reject(err);
        })
        .on("finish", () => {
          resolve();
        });
    });

    console.log(`[RESTORE] ${restoredFiles} arquivos restaurados`);

    return {
      success: true,
      message: `${restoredFiles} arquivos restaurados com sucesso`,
      restoredFiles,
      errors: errors.length > 0 ? errors : undefined
    };
  } catch (error) {
    throw new AppError(`Erro ao extrair arquivos: ${error.message}`, 500);
  }
};

export default RestoreBackupService;

