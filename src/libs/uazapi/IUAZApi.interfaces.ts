// Interfaces para UAZApi - Baseado em IWhatsAppOficial.interfaces.ts

export interface ISendMessageUAZApi {
  type: 'text' | 'reaction' | 'audio' | 'document' | 'image' | 'sticker' | 'video' | 'contact';
  to: string;
  fileName?: string;
  quotedId?: string;
  body?: string;
  mediaUrl?: string;
  mediaType?: string;
  caption?: string;
  vCard?: string;
}

export interface IReceivedUAZApi {
  token: string;
  fromNumber: string;
  nameContact: string;
  companyId: number;
  message: IMessageReceivedUAZApi;
}

export interface IMessageReceivedUAZApi {
  type: 'text' | 'image' | 'audio' | 'document' | 'video' | 'contact' | 'sticker' | 'location';
  timestamp: number;
  idMessage: string;
  text?: string;
  file?: string; // Base64
  mimeType?: string;
  quoteMessageId?: string;
  fileUrl?: string;
  fileSize?: number;
  remoteJid?: string;
  fromMe?: boolean;
}

export interface IReturnMessageUAZApi {
  key?: {
    remoteJid: string;
    fromMe: boolean;
    id: string;
  };
  id?: string;
  messageid?: string;
  message?: any;
  messageTimestamp?: number;
}

// Alias para compatibilidade
export type IUAZApiMessage = IReturnMessageUAZApi;

export interface IUAZApiConfig {
  instanceName: string;
  adminToken: string;
  instanceToken?: string;
  baseUrl?: string;
}

export interface IUAZApiContact {
  id: string;
  name?: string;
  notify?: string;
}

export interface IUAZApiStatus {
  status: 'connected' | 'disconnected' | 'connecting';
  qrcode?: string;
  paircode?: string;
  profileName?: string;
  phone?: string;
  token?: string;
}

