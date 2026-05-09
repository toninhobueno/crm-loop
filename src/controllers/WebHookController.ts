import { Request, Response } from "express";
import Whatsapp from "../models/Whatsapp";
import { handleMessage } from "../services/FacebookServices/facebookMessageListener";
// import { handleMessage } from "../services/FacebookServices/facebookMessageListener";

export const index = async (req: Request, res: Response): Promise<Response> => {
  const VERIFY_TOKEN = process.env.VERIFY_TOKEN || "whaticket";

  const mode = req.query["hub.mode"];
  const token = req.query["hub.verify_token"];
  const challenge = req.query["hub.challenge"];

  console.log("🔍 [WEBHOOK VALIDATION] Dados recebidos:");
  console.log("Mode:", mode);
  console.log("Token recebido:", token);
  console.log("Token esperado:", VERIFY_TOKEN);
  console.log("Challenge:", challenge);

  if (mode && token) {
    if (mode === "subscribe" && token === VERIFY_TOKEN) {
      console.log("✅ [WEBHOOK VALIDATION] Validação bem-sucedida!");
      return res.status(200).send(challenge);
    } else {
      console.log("❌ [WEBHOOK VALIDATION] Token não confere!");
      console.log(`Esperado: "${VERIFY_TOKEN}", Recebido: "${token}"`);
    }
  } else {
    console.log("❌ [WEBHOOK VALIDATION] Mode ou token ausentes!");
  }

  return res.status(403).json({
    message: "Forbidden - Token de verificação inválido"
  });
};

export const webHook = async (
  req: Request,
  res: Response
): Promise<Response> => {
  try {
    const { body } = req;
    
    console.log("📨 [WEBHOOK] Dados recebidos:", JSON.stringify(body, null, 2));
    
    if (body.object === "page" || body.object === "instagram") {
      let channel: string;

      if (body.object === "page") {
        channel = "facebook";
      } else {
        channel = "instagram";
      }

      console.log(`🔄 [WEBHOOK] Processando ${channel.toUpperCase()}`);

      if (!body.entry || !Array.isArray(body.entry)) {
        console.log("⚠️ [WEBHOOK] Nenhuma entrada encontrada no body");
        return res.status(200).json({ message: "No entries to process" });
      }

      for (const entry of body.entry) {
        console.log(`🔍 [WEBHOOK] Processando entrada para página ID: ${entry.id}`);
        
        const getTokenPage = await Whatsapp.findOne({
          where: {
            facebookPageUserId: entry.id,
            channel
          }
        });

        if (!getTokenPage) {
          console.log(`❌ [WEBHOOK] Página não encontrada: ${entry.id} (${channel})`);
          continue;
        }

        console.log(`✅ [WEBHOOK] Página encontrada: ${getTokenPage.name} (${channel})`);

        if (entry.messaging && Array.isArray(entry.messaging)) {
          for (const data of entry.messaging) {
            console.log(`📩 [WEBHOOK] Processando mensagem:`, JSON.stringify(data, null, 2));
            try {
              await handleMessage(getTokenPage, data, channel, getTokenPage.companyId);
              console.log(`✅ [WEBHOOK] Mensagem processada com sucesso`);
            } catch (error) {
              console.error(`❌ [WEBHOOK] Erro ao processar mensagem:`, error);
            }
          }
        } else {
          console.log(`⚠️ [WEBHOOK] Nenhuma mensagem encontrada na entrada`);
        }
      }

      return res.status(200).json({
        message: "EVENT_RECEIVED"
      });
    }

    console.log(`❌ [WEBHOOK] Objeto não reconhecido: ${body.object}`);
    return res.status(404).json({
      message: `Objeto não suportado: ${body.object}`
    });
  } catch (error) {
    console.error("💥 [WEBHOOK] Erro crítico:", error);
    return res.status(500).json({
      message: "Erro interno do servidor",
      error: error.message
    });
  }
};