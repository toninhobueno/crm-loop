import path from "path";
import multer from "multer";
import fs from "fs";
import Whatsapp from "../models/Whatsapp";
import { isEmpty, isNil } from "lodash";

const publicFolder = path.resolve(__dirname, "..", "..", "public");

export default {
  directory: publicFolder,
  storage: multer.diskStorage({
    destination: async function (req, file, cb) {
      let companyId;
      companyId = req.user?.companyId;
      // Tentar ler typeArch do body primeiro, depois da query string
      const { typeArch, userId } = req.body || {};
      const typeArchFromQuery = req.query?.typeArch as string;
      const finalTypeArch = typeArch || typeArchFromQuery;

      console.log("🛠 Upload destination - Dados recebidos:", {
        companyId,
        typeArch: finalTypeArch,
        typeArchFromBody: typeArch,
        typeArchFromQuery: typeArchFromQuery,
        userId,
        fieldname: file.fieldname,
        originalname: file.originalname,
        mimetype: file.mimetype
      });

      if (companyId === undefined && isNil(companyId) && isEmpty(companyId)) {
        const authHeader = req.headers.authorization;
        const [, token] = authHeader.split(" ");
        const whatsapp = await Whatsapp.findOne({ where: { token } });
        companyId = whatsapp.companyId;
      }

      let folder;

      if (finalTypeArch === "user") {
        // Para usuários, criar pasta específica da empresa
        folder = path.resolve(publicFolder, `company${companyId}`, "user");
      } else if (finalTypeArch && finalTypeArch !== "announcements" && finalTypeArch !== "logo") {
        if (finalTypeArch === "fileList") {
          // Para fileList, usar fileId em vez de userId
          const { fileId } = req.body || {};
          folder = path.resolve(publicFolder, `company${companyId}`, finalTypeArch, fileId ? String(fileId) : "");
        } else {
          folder = path.resolve(publicFolder, `company${companyId}`, finalTypeArch, userId ? userId : "");
        }
      } else if (finalTypeArch && finalTypeArch === "announcements") {
        folder = path.resolve(publicFolder, finalTypeArch);
      } else if (finalTypeArch && finalTypeArch === "flow") {
        folder = path.resolve(publicFolder, `company${companyId}`, finalTypeArch);
      } else if (finalTypeArch && finalTypeArch === "chat") {
        // Para chat interno, usar fileId como chatId para criar pasta específica
        folder = path.resolve(publicFolder, `company${companyId}`, finalTypeArch);
      } else if (finalTypeArch && finalTypeArch === "groups") {
        folder = path.resolve(publicFolder, `company${companyId}`, finalTypeArch);
      } else if (finalTypeArch === "logo") {
        folder = path.resolve(publicFolder);
      } else if (finalTypeArch === "quickMessage") {
        folder = path.resolve(publicFolder, `company${companyId}`, finalTypeArch);
      } else if (finalTypeArch === "floup") {
        folder = path.resolve(publicFolder, `company${companyId}`, finalTypeArch);
      } else {
        folder = path.resolve(publicFolder, `company${companyId}`);
      }

      console.log("📂 Pasta de destino final:", folder);

      if (!fs.existsSync(folder)) {
        console.log("📁 Criando pasta:", folder);
        fs.mkdirSync(folder, { recursive: true });
        fs.chmodSync(folder, 0o777);
        console.log("✅ Pasta criada com sucesso");
      }

      return cb(null, folder);
    },
    
    filename(req, file, cb) {
      // Tentar ler typeArch do body primeiro, depois da query string
      const { typeArch } = req.body || {};
      const typeArchFromQuery = req.query?.typeArch as string;
      const finalTypeArch = typeArch || typeArchFromQuery;
      
      console.log("🏷️ Gerando nome do arquivo:", {
        fieldname: file.fieldname,
        originalname: file.originalname,
        mimetype: file.mimetype,
        typeArch: finalTypeArch
      });
      
      // Para imagens de perfil, gerar nome único
      if (finalTypeArch === "user" && file.mimetype.startsWith('image/')) {
        const timestamp = new Date().getTime();
        const extension = path.extname(file.originalname) || '.jpg';
        const fileName = `profile_${timestamp}${extension}`;
        console.log("🖼️ Nome gerado para imagem de perfil:", fileName);
        return cb(null, fileName);
      }
      
      // Para arquivos de áudio gravado, garantir extensão .ogg
      if (file.fieldname === 'audio') {
        const timestamp = new Date().getTime();
        const fileName = `audio_${timestamp}.ogg`;
        console.log("🎵 Nome gerado para áudio gravado:", fileName);
        return cb(null, fileName);
      }

      // Para outros arquivos de áudio, verificar se precisa converter extensão
      if (file.mimetype && file.mimetype.startsWith('audio/')) {
        const timestamp = new Date().getTime();
        let extension = '.ogg';
        
        if (file.originalname) {
          const originalExt = path.extname(file.originalname).toLowerCase();
          if (['.ogg', '.mp3', '.m4a', '.aac'].includes(originalExt)) {
            extension = originalExt;
          }
        }
        
        const fileName = finalTypeArch && !["chat", "announcements"].includes(finalTypeArch) 
          ? `${path.parse(file.originalname).name}_${timestamp}${extension}`
          : `audio_${timestamp}${extension}`;
        
        console.log("🎵 Nome gerado para arquivo de áudio:", fileName);
        return cb(null, fileName);
      }

      // Para outros tipos de arquivo
      const fileName = finalTypeArch && !["chat", "announcements"].includes(finalTypeArch) 
        ? file.originalname.replace('/', '-').replace(/ /g, "_") 
        : new Date().getTime() + '_' + file.originalname.replace('/', '-').replace(/ /g, "_");
      
      console.log("📄 Nome gerado para arquivo:", fileName);
      return cb(null, fileName);
    }
  }),

  // Limite de tamanho: 100MB geral
  limits: {
    fileSize: 100 * 1024 * 1024 // 100MB
  }
};