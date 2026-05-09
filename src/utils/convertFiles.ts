import ffmpeg from "fluent-ffmpeg";
import path from "path";
import fs from "fs";
import logger from "./logger";

// Função para converter áudio para MP3
export const convertToMp3 = async (media: { path: string }): Promise<string> => {
  return new Promise((resolve, reject) => {
    const inputPath = media.path;
    const outputPath = inputPath.replace(/\.[^.]+$/, ".mp3");

    logger.info(`[ConvertFiles] Converting audio to MP3: ${inputPath} -> ${outputPath}`);

    ffmpeg(inputPath)
      .toFormat("mp3")
      .audioCodec("libmp3lame")
      .audioBitrate("128k")
      .on("end", () => {
        logger.info(`[ConvertFiles] Audio converted successfully: ${outputPath}`);
        resolve(outputPath);
      })
      .on("error", (err: Error) => {
        logger.error(`[ConvertFiles] Error converting audio to MP3: ${err.message}`);
        reject(err);
      })
      .save(outputPath);
  });
};

// Função para converter vídeo para MP4
export const convertToMp4 = async (media: { path: string; filename?: string }): Promise<string> => {
  return new Promise((resolve, reject) => {
    const inputPath = media.path;
    const outputPath = inputPath.replace(/\.[^.]+$/, ".mp4");

    logger.info(`[ConvertFiles] Converting video to MP4: ${inputPath} -> ${outputPath}`);

    ffmpeg(inputPath)
      .toFormat("mp4")
      .videoCodec("libx264")
      .audioCodec("aac")
      .outputOptions(["-movflags", "+faststart"])
      .on("end", () => {
        logger.info(`[ConvertFiles] Video converted successfully: ${outputPath}`);
        resolve(outputPath);
      })
      .on("error", (err: Error) => {
        logger.error(`[ConvertFiles] Error converting video to MP4: ${err.message}`);
        reject(err);
      })
      .save(outputPath);
  });
};

// Função para verificar e corrigir extensão do arquivo
export const verifyAndFixExtension = async (media: Express.Multer.File): Promise<void> => {
  try {
    // Importação dinâmica do file-type
    const { fileTypeFromFile } = await (eval('import("file-type")') as Promise<typeof import("file-type")>);
    const resultFile = await fileTypeFromFile(media.path);

    if (!resultFile) {
      logger.warn(`[ConvertFiles] Could not detect file type for: ${media.path}`);
      return;
    }

    const actualExtension = path.extname(media.filename).slice(1);
    const detectedExtension = resultFile.ext;

    if (actualExtension !== detectedExtension) {
      const newFilename = media.filename.replace(/\.[^.]+$/, `.${detectedExtension}`);
      const newPath = path.join(path.dirname(media.path), newFilename);
      
      fs.renameSync(media.path, newPath);
      
      media.path = newPath;
      media.filename = newFilename;
      media.originalname = newFilename;
      
      logger.info(`[ConvertFiles] Fixed extension: ${actualExtension} -> ${detectedExtension}`);
    }
  } catch (error: any) {
    logger.warn(`[ConvertFiles] Error verifying extension: ${error.message}`);
  }
};

// Função para obter tipo de mídia baseado no canal
export const getMediaTypeForChannel = (
  mimeType: string,
  channel: string
): "audio" | "image" | "video" | "document" => {
  const type = mimeType.split("/")[0];

  // Instagram e Facebook não suportam áudio direto
  if (type === "audio" && (channel === "instagram" || channel === "facebook")) {
    return "video"; // Será convertido para vídeo
  }

  if (type === "image") return "image";
  if (type === "video") return "video";
  if (type === "audio") return "audio";
  return "document";
};
