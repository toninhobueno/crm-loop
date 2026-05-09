import express from "express";
import isAuth from "../middleware/isAuth";
import multer from "multer";
import path from "path";
import fs from "fs";
import * as BackupController from "../controllers/BackupController";

const backupRoutes = express.Router();

// Configuração do multer para upload de backup
const uploadStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    const { companyId } = (req as any).user;
    const uploadDir = path.join(__dirname, "..", "..", "backups", `company${companyId}`, "uploads");

    // Criar diretório se não existir
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }

    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const timestamp = Date.now();
    const ext = path.extname(file.originalname);
    cb(null, `upload_${timestamp}${ext}`);
  }
});

const uploadBackup = multer({
  storage: uploadStorage,
  limits: { fileSize: 1024 * 1024 * 500 }, // 500MB max
  fileFilter: (req, file, cb) => {
    const allowedTypes = [".zip", ".dump", ".sql"];
    const ext = path.extname(file.originalname).toLowerCase();
    if (allowedTypes.includes(ext)) {
      cb(null, true);
    } else {
      cb(new Error("Tipo de arquivo não permitido. Use .zip, .dump ou .sql"));
    }
  }
});

// Executar backup manualmente
backupRoutes.post("/backup/run", isAuth, BackupController.runBackup);

// Listar backups existentes
backupRoutes.get("/backup/list", isAuth, BackupController.listBackups);

// Download de backup
backupRoutes.get("/backup/download/:type/:fileName", isAuth, BackupController.downloadBackup);

// Deletar backup
backupRoutes.delete("/backup/delete/:type/:fileName", isAuth, BackupController.deleteBackup);

// Obter configurações de backup
backupRoutes.get("/backup/settings", isAuth, BackupController.getBackupSettings);

// Atualizar configurações de backup
backupRoutes.put("/backup/settings", isAuth, BackupController.updateBackupSettings);

// Restaurar backup
backupRoutes.post("/backup/restore/:type/:fileName", isAuth, BackupController.restoreBackup);

// Upload e restaurar backup a partir de arquivo
backupRoutes.post("/backup/restore/upload", isAuth, uploadBackup.single("file"), BackupController.uploadAndRestoreBackup);

// Limpeza manual de backups antigos
backupRoutes.post("/backup/cleanup", isAuth, BackupController.cleanupOldBackups);

export default backupRoutes;