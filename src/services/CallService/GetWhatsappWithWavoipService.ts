import Whatsapp from "../../models/Whatsapp";
import { Op } from "sequelize";

const GetWhatsappWithWavoipService = async (companyId: number) => {
  const whatsapp = await Whatsapp.findOne({
    where: {
      companyId,
      [Op.and]: [
        { wavoip: { [Op.ne]: null } },
        { wavoip: { [Op.ne]: "" } }
      ]
    },
    attributes: ['id', 'name', 'number', 'wavoip'],
    order: [['createdAt', 'DESC']]
  });

  return whatsapp;
};

export default GetWhatsappWithWavoipService;

