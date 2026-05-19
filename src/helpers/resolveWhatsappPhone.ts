import { Session } from "../libs/wbot";
import { normalizeJid } from "../utils";
import logger from "../utils/logger";

export function extractPhoneFromJid(jid: string): string {
  if (!jid) return "";
  return jid.split("@")[0].split(":")[0].replace(/\D/g, "");
}

/** Telefone WhatsApp típico (10–13 dígitos, ex: 41995455634 ou 5541995455634) */
export function isLikelyPhoneNumber(digits: string): boolean {
  if (!digits || !/^\d+$/.test(digits)) return false;
  const len = digits.length;
  return len >= 10 && len <= 13;
}

/** ID interno LID do WhatsApp (14+ dígitos) — não é número de telefone */
export function isLikelyLidNumber(digits: string): boolean {
  if (!digits || !/^\d+$/.test(digits)) return false;
  return digits.length >= 14;
}

/** Nome inválido: vazio, LID, ou sequência longa só com dígitos (ID interno WhatsApp) */
export function isInvalidContactName(
  rawName: string | null | undefined,
  phoneNumber?: string
): boolean {
  if (!rawName || !String(rawName).trim()) {
    return true;
  }

  const trimmed = String(rawName).trim();

  if (trimmed.includes("@lid")) {
    return true;
  }

  const digitsOnly = trimmed.replace(/\D/g, "");

  if (!digitsOnly) {
    return false;
  }

  if (isLikelyLidNumber(digitsOnly)) {
    return true;
  }

  if (/^\d+$/.test(trimmed.replace(/\s/g, "")) && digitsOnly.length >= 14) {
    return true;
  }

  if (phoneNumber) {
    const phoneDigits = phoneNumber.replace(/\D/g, "");
    if (
      digitsOnly === phoneDigits &&
      trimmed.replace(/\D/g, "") === digitsOnly &&
      /^\d[\d\s().+-]*$/.test(trimmed)
    ) {
      return false;
    }
  }

  return false;
}

export function formatPhoneDisplayName(number: string): string {
  const digits = number.replace(/\D/g, "");
  if (!digits) return "Contato";

  if (digits.length === 13 && digits.startsWith("55")) {
    const ddd = digits.slice(2, 4);
    const rest = digits.slice(4);
    if (rest.length === 9) {
      return `(${ddd}) ${rest.slice(0, 5)}-${rest.slice(5)}`;
    }
    if (rest.length === 8) {
      return `(${ddd}) ${rest.slice(0, 4)}-${rest.slice(4)}`;
    }
  }

  if (digits.length === 11) {
    const ddd = digits.slice(0, 2);
    const rest = digits.slice(2);
    if (rest.length === 9) {
      return `(${ddd}) ${rest.slice(0, 5)}-${rest.slice(5)}`;
    }
    return `(${ddd}) ${rest.slice(0, 4)}-${rest.slice(4)}`;
  }

  if (digits.length === 10) {
    const ddd = digits.slice(0, 2);
    const rest = digits.slice(2);
    return `(${ddd}) ${rest.slice(0, 4)}-${rest.slice(4)}`;
  }

  return digits;
}

/**
 * Nome para exibição: pushName quando válido; senão telefone formatado.
 * Nunca usa ID LID como nome.
 */
export function resolveContactDisplayName(
  rawName: string | null | undefined,
  phoneNumber: string,
  lid?: string | null
): string {
  const lidDigits = lid ? extractPhoneFromJid(lid) : "";

  if (
    rawName &&
    !isInvalidContactName(rawName, phoneNumber) &&
    (!lidDigits || rawName.replace(/\D/g, "") !== lidDigits)
  ) {
    return String(rawName).trim();
  }

  if (isLikelyPhoneNumber(phoneNumber)) {
    return formatPhoneDisplayName(phoneNumber);
  }

  const digits = phoneNumber.replace(/\D/g, "");
  return digits || "Contato";
}

export function toWhatsAppUserJid(digitsOrJid: string): string {
  if (!digitsOrJid) return "";
  if (digitsOrJid.includes("@")) {
    return normalizeJid(digitsOrJid);
  }
  const digits = digitsOrJid.replace(/\D/g, "");
  return normalizeJid(`${digits}@s.whatsapp.net`);
}

export interface ResolvedWhatsappContact {
  number: string;
  remoteJid: string;
  lid?: string | null;
}

export async function resolveWhatsappPhone(
  wbot: Session,
  opts: {
    jid?: string;
    lid?: string | null;
    senderPn?: string | null;
    number?: string;
  }
): Promise<ResolvedWhatsappContact | null> {
  const { jid, lid, senderPn, number } = opts;

  if (senderPn) {
    const pnJid = senderPn.includes("@")
      ? normalizeJid(senderPn)
      : toWhatsAppUserJid(senderPn);
    const pnNumber = extractPhoneFromJid(pnJid);
    if (isLikelyPhoneNumber(pnNumber)) {
      return {
        number: pnNumber,
        remoteJid: pnJid,
        lid: lid || null
      };
    }
  }

  const candidates: string[] = [];

  if (jid) candidates.push(jid);
  if (lid) candidates.push(lid.includes("@") ? lid : `${lid}@lid`);
  if (number) {
    if (number.includes("@")) {
      candidates.push(number);
    } else if (isLikelyPhoneNumber(number)) {
      candidates.push(toWhatsAppUserJid(number));
    } else if (isLikelyLidNumber(number)) {
      candidates.push(`${number}@lid`);
    }
  }

  const uniqueCandidates = [...new Set(candidates.filter(Boolean))];

  for (const lookup of uniqueCandidates) {
    try {
      const result = await wbot.onWhatsApp(normalizeJid(lookup));
      const entry = result?.[0];
      if (!entry?.exists || !entry.jid || entry.jid.includes("@lid")) {
        continue;
      }
      const resolvedNumber = extractPhoneFromJid(entry.jid);
      if (!isLikelyPhoneNumber(resolvedNumber)) {
        continue;
      }
      return {
        number: resolvedNumber,
        remoteJid: normalizeJid(entry.jid),
        lid: (entry.lid as string) || lid || null
      };
    } catch (error: any) {
      logger.warn(
        `[RDS-LID] resolveWhatsappPhone falhou para ${lookup}: ${error?.message}`
      );
    }
  }

  return null;
}
