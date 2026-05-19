import { Mutex } from "async-mutex";
import { Op } from "sequelize";
import Contact from "../../models/Contact";
import CreateOrUpdateContactService, {
  updateContact
} from "../ContactServices/CreateOrUpdateContactService";
import Message from "../../models/Message";
import Ticket from "../../models/Ticket";
import WhatsappLidMap from "../../models/WhatsapplidMap";
// Importar o módulo inteiro para acessar a fila
import * as queues from "../../queues";
import logger from "../../utils/logger";
import { IMe } from "./wbotMessageListener";
import { Session } from "../../libs/wbot";
import axios from "axios";
import fs from "fs";
import path, { join } from "path";
import {
  extractPhoneFromJid,
  isInvalidContactName,
  isLikelyLidNumber,
  isLikelyPhoneNumber,
  resolveContactDisplayName,
  resolveWhatsappPhone,
  toWhatsAppUserJid
} from "../../helpers/resolveWhatsappPhone";
import { normalizeJid } from "../../utils";

const lidUpdateMutex = new Mutex();

// Função para baixar e salvar a foto de perfil localmente
const downloadProfileImage = async (
  profilePicUrl: string,
  companyId: number
): Promise<string | null> => {
  if (!profilePicUrl || profilePicUrl.includes("nopicture")) {
    return null;
  }

  const publicFolder = path.resolve(__dirname, "..", "..", "..", "public");
  const folder = path.resolve(publicFolder, `company${companyId}`, "contacts");

  if (!fs.existsSync(folder)) {
    fs.mkdirSync(folder, { recursive: true });
    fs.chmodSync(folder, 0o777);
  }

  try {
    console.log(`[VERIFY CONTACT] 💾 Baixando foto localmente: ${profilePicUrl.substring(0, 50)}...`);
    const response = await axios.get(profilePicUrl, {
      responseType: "arraybuffer",
      timeout: 15000,
    });

    const filename = `${new Date().getTime()}.jpeg`;
    fs.writeFileSync(join(folder, filename), response.data);
    console.log(`[VERIFY CONTACT] ✅ Foto salva localmente: ${filename}`);
    return filename;
  } catch (error: any) {
    console.log(`[VERIFY CONTACT] ❌ Erro ao baixar foto localmente: ${error.message}`);
    return null;
  }
};

export async function checkAndDedup(
  contact: Contact,
  lid: string
): Promise<void> {
  const lidContact = await Contact.findOne({
    where: {
      companyId: contact.companyId,
      number: {
        [Op.or]: [lid, lid.substring(0, lid.indexOf("@"))]
      }
    }
  });

  if (!lidContact) {
    return;
  }

  await Message.update(
    { contactId: contact.id },
    {
      where: {
        contactId: lidContact.id,
        companyId: contact.companyId
      }
    }
  );

  const allTickets = await Ticket.findAll({
    where: {
      contactId: lidContact.id,
      companyId: contact.companyId
    }
  });

  // Transfer all tickets to main contact instead of closing them
  await Ticket.update(
    { contactId: contact.id },
    {
      where: {
        contactId: lidContact.id,
        companyId: contact.companyId
      }
    }
  );

  if (allTickets.length > 0) {
    console.log(`[RDS CONTATO] Transferidos ${allTickets.length} tickets do contato ${lidContact.id} para ${contact.id}`);
  }

  // Delete the duplicate contact after transferring all data
  await lidContact.destroy();
}

export async function verifyContact(
  msgContact: IMe,
  wbot: Session,
  companyId: number
): Promise<Contact> {
  let profilePicUrl: string = `${process.env.FRONTEND_URL}/nopicture.png`;
  let urlPicture: string | null = null;

  // Tentar baixar a foto de perfil do contato
  try {
    console.log(`[VERIFY CONTACT] 📸 Baixando foto de perfil para: ${msgContact.id}`);
    const picUrl = await wbot.profilePictureUrl(msgContact.id);
    
    if (picUrl && typeof picUrl === 'string' && picUrl.length > 0) {
      profilePicUrl = picUrl;
      console.log(`[VERIFY CONTACT] ✅ Foto obtida: ${profilePicUrl.substring(0, 50)}...`);
      
      // Baixar e salvar a foto localmente
      urlPicture = await downloadProfileImage(profilePicUrl, companyId);
    } else {
      console.log(`[VERIFY CONTACT] ⚠️ Foto não disponível para ${msgContact.id}`);
    }
  } catch (e) {
    console.log(`[VERIFY CONTACT] ❌ Erro ao baixar foto para ${msgContact.id}: ${e.message}`);
    profilePicUrl = `${process.env.FRONTEND_URL}/nopicture.png`;
  }

  const isGroup = msgContact.id.includes("@g.us");
  const isLid = msgContact.id.includes("@lid") || false;
  let originalLid =
    msgContact.lid ||
    (msgContact.id.includes("@lid") ? msgContact.id : null);

  let number = extractPhoneFromJid(msgContact.id);
  let contactJid = normalizeJid(msgContact.id);

  if (!isGroup) {
    const resolved = await resolveWhatsappPhone(wbot, {
      jid: msgContact.id,
      lid: originalLid,
      senderPn: msgContact.senderPn,
      number
    });

    if (resolved) {
      number = resolved.number;
      contactJid = resolved.remoteJid;
      if (resolved.lid) {
        originalLid = resolved.lid;
      }
      logger.info(
        `[RDS-LID] Telefone resolvido: ${number} (jid: ${contactJid})`
      );
    } else if (isLikelyLidNumber(number) || isLid) {
      logger.warn(
        `[RDS-LID] Não foi possível resolver telefone real para ${msgContact.id}; contato pode falhar ao enviar`
      );
    }
  }

  if (!isGroup && !isLikelyPhoneNumber(number)) {
    const fallbackDigits = extractPhoneFromJid(contactJid);
    if (isLikelyPhoneNumber(fallbackDigits)) {
      number = fallbackDigits;
    }
  }

  const displayName = resolveContactDisplayName(
    msgContact?.name,
    number,
    originalLid
  );

  const contactData = {
    name: displayName,
    number,
    profilePicUrl,
    urlPicture: urlPicture || "nopicture.png",
    isGroup,
    companyId,
    lid: originalLid,
    remoteJid: !isGroup ? contactJid : undefined
  };

  if (isGroup) {
    return CreateOrUpdateContactService(contactData);
  }

  return lidUpdateMutex.runExclusive(async () => {
    let foundContact: Contact | null = null;
    if (isLid) {
      foundContact = await Contact.findOne({
        where: {
          companyId,
          [Op.or]: [
            { lid: originalLid ? originalLid : msgContact.id },
            { number: number },
            { remoteJid: originalLid ? originalLid : msgContact.id }],
        },
        include: ["tags", "extraInfo", "whatsappLidMap"]
      });
    } else {
      foundContact = await Contact.findOne({
        where: {
          companyId,
          number: number
        },
      });
    }
    if (isLid) {
      if (foundContact) {
        return updateContact(foundContact, {
          profilePicUrl: contactData.profilePicUrl,
          name: displayName,
          ...(isLikelyPhoneNumber(contactData.number)
            ? {
                number: contactData.number,
                remoteJid: contactData.remoteJid,
                lid: originalLid
              }
            : {})
        });
      }

      const foundMappedContact = await WhatsappLidMap.findOne({
        where: {
          companyId,
          lid: number
        },
        include: [
          {
            model: Contact,
            as: "contact",
            include: ["tags", "extraInfo"]
          }
        ]
      });

      if (foundMappedContact) {
        return updateContact(foundMappedContact.contact, {
          profilePicUrl: contactData.profilePicUrl
        });
      }

      const partialLidContact = await Contact.findOne({
        where: {
          companyId,
          number: number.substring(0, number.indexOf("@"))
        },
        include: ["tags", "extraInfo"]
      });

      if (partialLidContact) {
        return updateContact(partialLidContact, {
          number: contactData.number,
          profilePicUrl: contactData.profilePicUrl
        });
      }
    } else if (foundContact) {
      if (!foundContact.whatsappLidMap) {
        try {

          const ow = await wbot.onWhatsApp(msgContact.id);

          if (ow?.[0]?.exists) {
            const lid = ow?.[0]?.lid as string;


            if (lid) {
              await checkAndDedup(foundContact, lid);

              const lidMap = await WhatsappLidMap.findOne({
                where: {
                  companyId,
                  lid,
                  contactId: foundContact.id
                }
              });
              if (!lidMap) {
                await WhatsappLidMap.create({
                  companyId,
                  lid,
                  contactId: foundContact.id
                });
              }
              logger.info(`[RDS CONTATO] LID obtido para contato ${foundContact.id} (${msgContact.id}): ${lid}`);
            }
          } else {
            logger.warn(`[RDS CONTATO] Contato ${msgContact.id} não encontrado no WhatsApp, mas continuando processamento`);
          }
        } catch (error) {
          logger.error(`[RDS CONTATO] Erro ao verificar contato ${msgContact.id} no WhatsApp: ${error.message}`);

          try {
            await queues["lidRetryQueue"].add(
              "RetryLidLookup",
              {
                contactId: foundContact.id,
                whatsappId: wbot.id || null,
                companyId,
                number: msgContact.id,
                retryCount: 1,
                maxRetries: 5
              },
              {
                delay: 60 * 1000, // 1 minuto
                attempts: 1,
                removeOnComplete: true
              }
            );
            logger.info(`[RDS CONTATO] Agendada retentativa de obtenção de LID para contato ${foundContact.id} (${msgContact.id})`);
          } catch (queueError) {
            logger.error(`[RDS CONTATO] Erro ao adicionar contato ${foundContact.id} à fila de retentativa: ${queueError.message}`);
          }
        }
      }
      const updatePayload: Record<string, unknown> = {
        profilePicUrl: contactData.profilePicUrl,
        name:
          isInvalidContactName(foundContact.name, contactData.number) ||
          foundContact.name === foundContact.number
            ? displayName
            : foundContact.name
      };

      if (isLikelyPhoneNumber(contactData.number)) {
        updatePayload.number = contactData.number;
        updatePayload.remoteJid = contactData.remoteJid;
        updatePayload.lid = originalLid || foundContact.lid;
      }

      return updateContact(foundContact, updatePayload);
    } else if (!isGroup && !foundContact) {
      let newContact: Contact | null = null;

      try {



        const ow = await wbot.onWhatsApp(msgContact.id);




        if (!ow?.[0]?.exists) {



          if (originalLid && !contactData.lid) {

            contactData.lid = originalLid;
          }


          return CreateOrUpdateContactService(contactData);
        }




        let lid = ow?.[0]?.lid as string;


        if (!lid && originalLid) {
          lid = originalLid;

        }


        try {
          const firstItem = ow?.[0] as { jid?: string; lid?: string } | undefined;
          if (firstItem?.jid) {
            const owNumber = extractPhoneFromJid(firstItem.jid);
            if (isLikelyPhoneNumber(owNumber)) {
              number = owNumber;
              contactData.number = owNumber;
              contactData.remoteJid = normalizeJid(firstItem.jid);
            }
          }
        } catch (e) {
          logger.error(
            `[RDS-LID-FIX] Erro ao extrair número da resposta onWhatsApp: ${e.message}`
          );
        }



        if (lid) {

          const lidContact = await Contact.findOne({
            where: {
              companyId,
              number: {
                [Op.or]: [lid, lid.substring(0, lid.indexOf("@"))]
              }
            },
            include: ["tags", "extraInfo"]
          });

          if (lidContact) {
            // Atualiza o campo lid no contato além de criar o mapeamento
            await lidContact.update({
              lid: lid
            });

            await WhatsappLidMap.create({
              companyId,
              lid,
              contactId: lidContact.id
            });

            return updateContact(lidContact, {
              number: contactData.number,
              remoteJid: contactData.remoteJid || toWhatsAppUserJid(contactData.number),
              profilePicUrl: contactData.profilePicUrl
            });
          } else {
            const contactDataWithLid = {
              ...contactData,
              lid: lid
            };
            newContact = await CreateOrUpdateContactService(contactDataWithLid);


            if (newContact.lid !== lid) {
              await newContact.update({ lid: lid });

            }

            await WhatsappLidMap.create({
              companyId,
              lid,
              contactId: newContact.id
            });

            return newContact;
          }
        }
      } catch (error) {
        logger.error(`[RDS CONTATO] Erro ao verificar contato ${msgContact.id} no WhatsApp: ${error.message}`);

        newContact = await CreateOrUpdateContactService(contactData);
        logger.info(`[RDS CONTATO] Contato criado sem LID devido a erro: ${newContact.id}`);

        try {
          await queues["lidRetryQueue"].add(
            "RetryLidLookup",
            {
              contactId: newContact.id,
              whatsappId: wbot.id || null,
              companyId,
              number: msgContact.id,
              lid: originalLid ? originalLid : msgContact.id,
              retryCount: 1,
              maxRetries: 5
            },
            {
              delay: 60 * 1000, // 1 minuto
              attempts: 1,
              removeOnComplete: true
            }
          );
          logger.info(`[RDS CONTATO] Agendada retentativa de obtenção de LID para novo contato ${newContact.id} (${msgContact.id})`);
        } catch (queueError) {
          logger.error(`[RDS CONTATO] Erro ao adicionar contato ${newContact.id} à fila de retentativa: ${queueError.message}`);
        }

        return newContact;
      }
    }

    return CreateOrUpdateContactService(contactData);
  });
}
