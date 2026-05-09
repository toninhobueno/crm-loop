import path from "path";
import fs from "fs";
import Message from "../../models/Message";

import axios from "axios";
import FormData from "form-data";
import { Transcription } from "openai/resources/audio/transcriptions";

type Response = Transcription | string;

const TranscribeAudioMessageToText = async (wid: string, companyId: string): Promise<Response> => {
  try {
    // Busca a mensagem com os detalhes do arquivo de áudio
    const msg = await Message.findOne({
      where: {
        wid: wid,
        companyId: companyId,
      },
    });

    if (!msg) {
      throw new Error("Mensagem não encontrada");
    }

    const data = new FormData();
    let config;

    // Verifica se a mediaUrl é uma URL válida
    if (msg.mediaUrl.startsWith('http')) {
      // Se for uma URL, usa FormData (a API espera 'url' no form)
      data.append('url', msg.mediaUrl);
      config = {
        method: 'post',
        maxBodyLength: Infinity,
        url: `${process.env.TRANSCRIBE_URL}/transcrever`,
        headers: {
          // Não definir Content-Type manualmente - FormData define automaticamente com boundary
          // Removido Authorization pois a autenticação está desabilitada na API
          ...data.getHeaders(),
        },
        data: data,
      };
    } else {
      // Se não for URL, mantém o comportamento atual
      const urlParts = new URL(msg.mediaUrl);
      const pathParts = urlParts.pathname.split('/');
      const fileName = pathParts[pathParts.length - 1];

      const publicFolder = path.resolve(__dirname, "..", "..", "..", "public");
      const filePath = path.join(publicFolder, `company${companyId}`, fileName);

      if (!fs.existsSync(filePath)) {
        throw new Error(`Arquivo não encontrado: ${filePath}`);
      }

      data.append('audio', fs.createReadStream(filePath));
      config = {
        method: 'post',
        maxBodyLength: Infinity,
        url: `${process.env.TRANSCRIBE_URL}/transcrever`,
        headers: {
          // Não definir Content-Type manualmente - FormData define automaticamente com boundary
          // Removido Authorization pois a autenticação está desabilitada na API
          ...data.getHeaders(),
        },
        data: data,
      };
    }

    // Faz a requisição para o endpoint
    console.log(`[Transcrição] Fazendo requisição para: ${config.url}`);
    console.log(`[Transcrição] TRANSCRIBE_URL configurada: ${process.env.TRANSCRIBE_URL}`);
    
    const res = await axios.request(config);

    await msg.update({
      body: res.data,
      transcrito: true,
    });

    return res.data;
  } catch (error: any) {
    console.error("Erro durante a transcrição:", error);
    
    // Log detalhado do erro
    if (error.response) {
      // Erro de resposta do servidor
      const status = error.response.status;
      const errorData = error.response.data;
      const errorMessage = typeof errorData === 'object' && errorData.erro 
        ? errorData.erro 
        : (typeof errorData === 'string' ? errorData : JSON.stringify(errorData));
      
      console.error(`[Transcrição] Erro HTTP ${status}: ${errorMessage}`);
      console.error(`[Transcrição] URL da requisição: ${error.config?.url}`);
      console.error(`[Transcrição] Dados completos da resposta:`, errorData);
      
      // Retorna mensagem de erro mais específica
      return `Erro na transcrição (${status}): ${errorMessage}`;
    } else if (error.request) {
      // Requisição foi feita mas não houve resposta
      console.error("[Transcrição] Sem resposta do servidor. Verifique se a API está rodando.");
      console.error(`[Transcrição] URL tentada: ${error.config?.url}`);
      console.error("[Transcrição] Verifique se TRANSCRIBE_URL está configurada corretamente no .env");
      return "Erro: API de transcrição não respondeu. Verifique se está rodando.";
    } else {
      // Erro ao configurar a requisição
      console.error("[Transcrição] Erro ao configurar requisição:", error.message);
      return `Erro ao configurar requisição: ${error.message}`;
    }
  }
};

export default TranscribeAudioMessageToText;
