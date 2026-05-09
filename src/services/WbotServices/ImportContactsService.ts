import * as Sentry from "@sentry/node";
import GetDefaultWhatsApp from "../../helpers/GetDefaultWhatsApp";
import { getWbot } from "../../libs/wbot";
import Contact from "../../models/Contact";
import logger from "../../utils/logger";
import ShowBaileysService from "../BaileysServices/ShowBaileysService";
import CreateContactService from "../ContactServices/CreateContactService";
import { isString, isArray } from "lodash";
import path from "path";
import fs from 'fs';

const ImportContactsService = async (companyId: number): Promise<void> => {
  const defaultWhatsapp = await GetDefaultWhatsApp(companyId);
  const wbot = getWbot(defaultWhatsapp.id);

  let phoneContacts;

  try {
    const contactsString = await ShowBaileysService(wbot.id);
    phoneContacts = JSON.parse(JSON.stringify(contactsString.contacts));

    const publicFolder = path.resolve(__dirname, "..", "..", "..", "public");
    const beforeFilePath = path.join(publicFolder,`company${companyId}`, 'contatos_antes.txt');
    fs.writeFile(beforeFilePath, JSON.stringify(phoneContacts, null, 2), (err) => {
      if (err) {
        logger.error(`Failed to write contacts to file: ${err}`);
        throw err;
      }
      // console.log('O arquivo contatos_antes.txt foi criado!');
    });

  } catch (err) {
    Sentry.captureException(err);
    logger.error(`Could not get whatsapp contacts from phone. Err: ${err}`);
  }

  const publicFolder = path.resolve(__dirname, "..", "..", "..", "public");
  const afterFilePath = path.join(publicFolder,`company${companyId}`, 'contatos_depois.txt');
  fs.writeFile(afterFilePath, JSON.stringify(phoneContacts, null, 2), (err) => {
    if (err) {
      logger.error(`Failed to write contacts to file: ${err}`);
      throw err;
    }
    // console.log('O arquivo contatos_depois.txt foi criado!');
  });

  const phoneContactsList = isString(phoneContacts)
    ? JSON.parse(phoneContacts)
    : phoneContacts;

  if (isArray(phoneContactsList)) {
    phoneContactsList.forEach(async ({ id, name, notify }) => {
      if (id === "status@broadcast" || id.includes("g.us")) return;
      const number = id.replace(/\D/g, "");

      const existingContact = await Contact.findOne({
        where: { number, companyId }
      });

      // Tentar baixar a foto de perfil do contato
      let profilePicUrl = `${process.env.FRONTEND_URL}/nopicture.png`;
      try {
        profilePicUrl = await wbot.profilePictureUrl(id, "image");
      } catch (error) {
        logger.warn(`Could not get profile picture for ${id}: ${error.message}`);
      }

      if (existingContact) {
        // Atualiza o nome e foto do contato existente
        const updates: any = {};
        if (name || notify) {
          updates.name = name || notify;
        }
        if (profilePicUrl && profilePicUrl !== `${process.env.FRONTEND_URL}/nopicture.png`) {
          updates.profilePicUrl = profilePicUrl;
        }
        
        if (Object.keys(updates).length > 0) {
          await existingContact.update(updates);
        }
      } else {
        // Criar um novo contato com foto de perfil
        try {
          await CreateContactService({
            number,
            name: name || notify,
            companyId,
            profilePicUrl
          });
        } catch (error) {
          Sentry.captureException(error);
          logger.warn(
            `Could not create contact from phone import. Err: ${error}`
          );
        }
      }
    });
  }
};

export default ImportContactsService;
