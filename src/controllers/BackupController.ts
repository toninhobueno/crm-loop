import { Request, Response } from "express";
import RunBackupService from "../services/BackupServices/RunBackupService";
import RestoreBackupService from "../services/BackupServices/RestoreBackupService";
import CleanupOldBackupsService from "../services/BackupServices/CleanupOldBackupsService";
import CompaniesSettings from "../models/CompaniesSettings";
import * as Yup from "yup";
import fs from "fs";
import path from "path";

// Executar backup manualmente
export const runBackup = async (
  req: Request,
  res: Response
): Promise<Response> => {
  const { companyId } = req.user;
  const force = (req.query.force === "true") || (req.body && req.body.force === true);

  try {
    const result = await RunBackupService({ companyId, force });

    return res.status(200).json(result);
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
};

// Listar backups existentes
export const listBackups = async (
  req: Request,
  res: Response
): Promise<Response> => {
  const { companyId } = req.user;

  try {
    const backupDir = path.join(
      __dirname,
      "..",
      "..",
      "backups",
      `company${companyId}`
    );

    if (!fs.existsSync(backupDir)) {
      return res.status(200).json({ database: [], files: [] });
    }

    const databaseDir = path.join(backupDir, "database");
    const filesDir = path.join(backupDir, "files");

    const databaseBackups: any[] = [];
    const filesBackups: any[] = [];

    // Listar backups de banco
    if (fs.existsSync(databaseDir)) {
      const files = fs.readdirSync(databaseDir);
      files.forEach((file) => {
        const filePath = path.join(databaseDir, file);
        const stats = fs.statSync(filePath);
        databaseBackups.push({
          fileName: file,
          size: stats.size,
          createdAt: stats.birthtime,
          modifiedAt: stats.mtime
        });
      });
    }

    // Listar backups de arquivos
    if (fs.existsSync(filesDir)) {
      const files = fs.readdirSync(filesDir);
      files.forEach((file) => {
        const filePath = path.join(filesDir, file);
        const stats = fs.statSync(filePath);
        filesBackups.push({
          fileName: file,
          size: stats.size,
          createdAt: stats.birthtime,
          modifiedAt: stats.mtime
        });
      });
    }

    return res.status(200).json({
      database: databaseBackups.sort((a, b) => b.createdAt - a.createdAt),
      files: filesBackups.sort((a, b) => b.createdAt - a.createdAt)
    });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
};

// Download de backup
export const downloadBackup = async (
  req: Request,
  res: Response
): Promise<void> => {
  const { companyId } = req.user;
  const { type, fileName } = req.params;

  try {
    const backupDir = path.join(
      __dirname,
      "..",
      "..",
      "backups",
      `company${companyId}`,
      type
    );

    const filePath = path.join(backupDir, fileName);

    if (!fs.existsSync(filePath)) {
      res.status(404).json({ error: "Backup file not found" });
      return;
    }

    // Obter informações do arquivo
    const stat = fs.statSync(filePath);
    const fileSize = stat.size;

    // Definir headers para download de arquivos grandes
    res.setHeader('Content-Type', 'application/octet-stream');
    res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
    res.setHeader('Content-Length', fileSize);
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    // Stream o arquivo em chunks para não sobrecarregar memória
    const fileStream = fs.createReadStream(filePath, { highWaterMark: 64 * 1024 }); // 64KB chunks
    
    fileStream.on('error', (error) => {
      console.error('[BACKUP] Erro ao fazer stream do arquivo:', error);
      if (!res.headersSent) {
        res.status(500).json({ error: 'Erro ao fazer download do arquivo' });
      }
    });

    fileStream.pipe(res);
  } catch (error) {
    console.error('[BACKUP] Erro no download:', error);
    if (!res.headersSent) {
      res.status(500).json({ error: error.message });
    }
  }
};

// Deletar backup
export const deleteBackup = async (
  req: Request,
  res: Response
): Promise<Response> => {
  const { companyId } = req.user;
  const { type, fileName } = req.params;

  try {
    const backupDir = path.join(
      __dirname,
      "..",
      "..",
      "backups",
      `company${companyId}`,
      type
    );

    const filePath = path.join(backupDir, fileName);

    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: "Backup file not found" });
    }

    fs.unlinkSync(filePath);

    return res.status(200).json({ success: true });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
};

// Obter configurações de backup
export const getBackupSettings = async (
  req: Request,
  res: Response
): Promise<Response> => {
  const { companyId } = req.user;

  try {
    const settings = await CompaniesSettings.findOne({
      where: { companyId },
      attributes: [
        "backupEnabled",
        "backupFrequency",
        "backupTime",
        "backupDatabase",
        "backupFiles",
        "backupRetentionDays",
        "backupCloudProvider",
        "backupCloudConfig",
        "backupLastRun",
        "backupLastStatus",
        "backupLastError"
      ]
    });

    return res.status(200).json(settings);
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
};

// Atualizar configurações de backup
export const updateBackupSettings = async (
  req: Request,
  res: Response
): Promise<Response> => {
  const { companyId } = req.user;
  const {
    backupEnabled,
    backupFrequency,
    backupTime,
    backupDatabase,
    backupFiles,
    backupRetentionDays,
    backupCloudProvider,
    backupCloudConfig
  } = req.body;

  try {
    // DEBUG: Log dos dados recebidos
    console.log('[BACKUP] ========================================');
    console.log('[BACKUP] Salvando configurações para companyId:', companyId);
    console.log('[BACKUP] Dados recebidos:', JSON.stringify(req.body, null, 2));
    console.log('[BACKUP] ========================================');

    // Validação mais flexível
    const schema = Yup.object().shape({
      backupEnabled: Yup.boolean().optional(),
      backupFrequency: Yup.string().oneOf(["daily", "weekly", "monthly"]).optional(),
      backupTime: Yup.string().optional(),
      backupDatabase: Yup.boolean().optional(),
      backupFiles: Yup.boolean().optional(),
      backupRetentionDays: Yup.number().optional(),
      backupCloudProvider: Yup.string().nullable().optional(),
      backupCloudConfig: Yup.mixed().nullable().optional()
    });

    try {
      await schema.validate(req.body);
      console.log('[BACKUP] ✅ Validação passou!');
    } catch (validationError) {
      console.error('[BACKUP] ❌ Erro na validação:', validationError.message);
      throw validationError;
    }

    let settings = await CompaniesSettings.findOne({
      where: { companyId }
    });

    if (!settings) {
      console.log('[BACKUP] Settings não encontrado para companyId:', companyId);
      console.log('[BACKUP] Criando novo registro de CompaniesSettings...');
      
      // Criar registro se não existir
      settings = await CompaniesSettings.create({
        companyId,
        backupEnabled,
        backupFrequency,
        backupTime,
        backupDatabase,
        backupFiles,
        backupRetentionDays,
        backupCloudProvider,
        backupCloudConfig
      });
      
      console.log('[BACKUP] Registro criado com sucesso!');
      return res.status(200).json(settings);
    }

    console.log('[BACKUP] Settings encontrado, atualizando...');

    await settings.update({
      backupEnabled,
      backupFrequency,
      backupTime,
      backupDatabase,
      backupFiles,
      backupRetentionDays,
      backupCloudProvider,
      backupCloudConfig
    });

    console.log('[BACKUP] ✅ Configurações salvas com sucesso!');
    console.log('[BACKUP] ========================================');
    return res.status(200).json(settings);
  } catch (error) {
    console.error('[BACKUP] ========================================');
    console.error('[BACKUP] ❌ ERRO ao salvar configurações:');
    console.error('[BACKUP] Mensagem:', error.message);
    console.error('[BACKUP] Stack:', error.stack);
    console.error('[BACKUP] ========================================');
    return res.status(400).json({ 
      error: error.message,
      details: error.errors || error.stack
    });
  }
};

// Restaurar backup
export const restoreBackup = async (
  req: Request,
  res: Response
): Promise<Response> => {
  const { companyId } = req.user;
  const { type, fileName } = req.params;
  const { updateCompanyId, oldCompanyId } = req.query;

  try {
    const result = await RestoreBackupService({
      companyId,
      type: type as "database" | "files",
      fileName,
      updateCompanyId: updateCompanyId !== "false", // Por padrão é true
      oldCompanyId: oldCompanyId ? parseInt(oldCompanyId as string) : undefined
    });

    return res.status(200).json(result);
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
};

// Upload e restaurar backup a partir de arquivo enviado
export const uploadAndRestoreBackup = async (
  req: Request,
  res: Response
): Promise<Response> => {
  const { companyId } = req.user;
  const file = req.file;

  if (!file) {
    return res.status(400).json({ error: "Nenhum arquivo enviado" });
  }

  try {
    const ext = path.extname(file.originalname).toLowerCase();

    // Determinar tipo de backup baseado na extensão
    let type: "database" | "files";
    if (ext === ".zip") {
      type = "files";
    } else if (ext === ".dump" || ext === ".sql") {
      type = "database";
    } else {
      // Remover arquivo inválido
      fs.unlinkSync(file.path);
      return res.status(400).json({ error: "Tipo de arquivo não suportado" });
    }

    // Mover arquivo para o diretório correto de backup
    const backupDir = path.join(
      __dirname,
      "..",
      "..",
      "backups",
      `company${companyId}`,
      type
    );

    if (!fs.existsSync(backupDir)) {
      fs.mkdirSync(backupDir, { recursive: true });
    }

    const newFileName = `uploaded_${Date.now()}_${file.originalname}`;
    const newPath = path.join(backupDir, newFileName);

    // Mover arquivo
    fs.renameSync(file.path, newPath);

    // Executar restauração (com atualização automática de companyId)
    const { updateCompanyId, oldCompanyId } = req.body;
    const result = await RestoreBackupService({
      companyId,
      type,
      fileName: newFileName,
      updateCompanyId: updateCompanyId !== false, // Por padrão é true
      oldCompanyId: oldCompanyId ? parseInt(oldCompanyId) : undefined
    });

    return res.status(200).json(result);
  } catch (error) {
    // Tentar limpar arquivo em caso de erro
    try {
      if (file.path && fs.existsSync(file.path)) {
        fs.unlinkSync(file.path);
      }
    } catch (cleanupError) {
      console.error("[BACKUP] Erro ao limpar arquivo temporário:", cleanupError);
    }

    return res.status(500).json({ error: error.message });
  }
};


// Limpeza manual de backups antigos
export const cleanupOldBackups = async (
  req: Request,
  res: Response
): Promise<Response> => {
  const { companyId } = req.user;

  try {
    const result = await CleanupOldBackupsService(companyId);
    return res.status(200).json(result);
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
};