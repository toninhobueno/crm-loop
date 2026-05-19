import logger from "../utils/logger";
import { ENABLE_LID_DEBUG } from "../config/debug";

export function normalizeJid(jid: string): string {
  if (!jid) return jid;

  if (ENABLE_LID_DEBUG) {
    logger.info(`[RDS-LID] normalizeJid - Entrada: ${jid}`);
  }

  // Correção para contatos salvos incorretamente com @lid@s.whatsapp.net
  if (jid.includes('@lid@s.whatsapp.net')) {
    const parts = jid.split('@');
    if (parts.length >= 3 && /^\d+$/.test(parts[0])) {
      const normalized = parts[0] + '@s.whatsapp.net';
      if (ENABLE_LID_DEBUG) logger.info(`[RDS-LID] normalizeJid - Corrigido formato @lid@s.whatsapp.net: ${normalized}`);
      return normalized;
    }
  }

  if (jid.includes('@s.whatsapp.net@s.whatsapp.net')) {
    const normalized = jid.replace('@s.whatsapp.net@s.whatsapp.net', '@s.whatsapp.net');
    if (ENABLE_LID_DEBUG) logger.info(`[RDS-LID] normalizeJid - Corrigido duplicado: ${normalized}`);
    return normalized;
  }
  if (jid.includes('@g.us@g.us')) {
    const normalized = jid.replace('@g.us@g.us', '@g.us');
    if (ENABLE_LID_DEBUG) logger.info(`[RDS-LID] normalizeJid - Corrigido duplicado: ${normalized}`);
    return normalized;
  }

  if (jid.includes('@s.whatsapp.net') || jid.includes('@g.us')) {
    if (ENABLE_LID_DEBUG) logger.info(`[RDS-LID] normalizeJid - JID já normalizado: ${jid}`);
    return jid;
  }

  // LID (@lid) não é telefone — não converter para @s.whatsapp.net
  if (jid.includes('@lid')) {
    if (ENABLE_LID_DEBUG) {
      logger.info(`[RDS-LID] normalizeJid - Preservando JID @lid: ${jid}`);
    }
    return jid;
  }

  if (!jid.includes('@')) {
    const normalized = jid + '@s.whatsapp.net';
    if (ENABLE_LID_DEBUG) logger.info(`[RDS-LID] normalizeJid - Adicionado @s.whatsapp.net: ${normalized}`);
    return normalized;
  }

  if (ENABLE_LID_DEBUG) logger.info(`[RDS-LID] normalizeJid - Sem alteração: ${jid}`);
  return jid;
}
