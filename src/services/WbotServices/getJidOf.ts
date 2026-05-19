import Contact from "../../models/Contact";
import Ticket from "../../models/Ticket";
import { normalizeJid } from "../../utils";
import {
  isLikelyLidNumber,
  isLikelyPhoneNumber
} from "../../helpers/resolveWhatsappPhone";
import logger from "../../utils/logger";
import { ENABLE_LID_DEBUG } from "../../config/debug";

export function getJidOf(reference: string | Contact | Ticket): string {
  let address = reference;
  let isGroup = false;

  // Extrair endereço e flag de grupo com base no tipo da referência
  if (reference instanceof Contact) {
    isGroup = reference.isGroup;

    if (
      reference.remoteJid &&
      reference.remoteJid.includes("@s.whatsapp.net")
    ) {
      if (ENABLE_LID_DEBUG) {
        logger.info(`[RDS-LID] getJidOf - Usando remoteJid do contato: ${reference.remoteJid}`);
      }
      return normalizeJid(reference.remoteJid);
    }

    if (reference.lid && reference.lid.includes("@lid")) {
      if (ENABLE_LID_DEBUG) {
        logger.info(`[RDS-LID] getJidOf - Usando LID do contato: ${reference.lid}`);
      }
      return normalizeJid(reference.lid);
    }

    if (reference.number && isLikelyPhoneNumber(reference.number)) {
      address = reference.number;
    } else if (reference.remoteJid?.includes("@")) {
      address = reference.remoteJid;
    } else {
      address = reference.number;
    }
  } else if (reference instanceof Ticket) {
    isGroup = reference.isGroup;
    const contact = reference.contact;

    if (contact?.remoteJid && contact.remoteJid.includes("@s.whatsapp.net")) {
      if (ENABLE_LID_DEBUG) {
        logger.info(`[RDS-LID] getJidOf - Usando remoteJid do ticket.contact: ${contact.remoteJid}`);
      }
      return normalizeJid(contact.remoteJid);
    }

    if (contact?.lid && contact.lid.includes("@lid")) {
      return normalizeJid(contact.lid);
    }

    if (contact?.number && isLikelyPhoneNumber(contact.number)) {
      address = contact.number;
    } else if (contact?.remoteJid?.includes("@")) {
      address = contact.remoteJid;
    } else {
      address = contact?.number;
    }
  }

  if (typeof address !== "string") {
    throw new Error("Invalid reference type");
  }

  if (address.includes("@")) {
    return normalizeJid(address);
  }

  if (typeof address === "string" && isLikelyLidNumber(address.replace(/\D/g, ""))) {
    throw new Error(
      `Invalid contact address: ${address} looks like a WhatsApp LID, not a phone number`
    );
  }

  const jid =
    typeof address === "string" && address.includes("@")
      ? address
      : `${String(address).replace(/\D/g, "")}@${isGroup ? "g.us" : "s.whatsapp.net"}`;
  return normalizeJid(jid);
}
