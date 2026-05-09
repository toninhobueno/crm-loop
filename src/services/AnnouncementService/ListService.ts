// src/services/AnnouncementService/ListService.ts - Atualização
import { Op, fn, col, where } from "sequelize";
import { isEmpty } from "lodash";
import Announcement from "../../models/Announcement";
import Company from "../../models/Company";

interface Request {
  searchParam?: string;
  pageNumber?: string;
  userCompanyId?: number; // 🎯 NOVO PARÂMETRO
}

interface Response {
  records: Announcement[];
  count: number;
  hasMore: boolean;
}

const ListService = async ({
  searchParam = "",
  pageNumber = "1",
  userCompanyId
}: Request): Promise<Response> => {
  let whereCondition: any = {
    [Op.or]: [
      { expiresAt: null }, // Informativos sem expiração
      { expiresAt: { [Op.gt]: new Date() } } // Informativos não expirados
    ]
  };

  // 🎯 FILTRO POR EMPRESA
  if (userCompanyId) {
    whereCondition = {
      ...whereCondition,
      [Op.or]: [
        { targetCompanyId: null }, // Informativos globais
        { targetCompanyId: userCompanyId } // Informativos específicos da empresa
      ]
    };
  }

  if (!isEmpty(searchParam)) {
    whereCondition = {
      ...whereCondition,
      [Op.and]: [
        whereCondition,
        {
          [Op.or]: [
            {
              title: where(
                fn("LOWER", col("Announcement.title")),
                "LIKE",
                `%${searchParam.toLowerCase().trim()}%`
              )
            }
          ]
        }
      ]
    };
  }

  const limit = 20;
  const offset = limit * (+pageNumber - 1);

  const { count, rows: records } = await Announcement.findAndCountAll({
    where: whereCondition,
    limit,
    offset,
    order: [
      ['priority', 'ASC'],
      ['createdAt', 'DESC']
    ],
    include: [
      { model: Company, as: "company", attributes: ["id", "name"] },
      { model: Company, as: "targetCompany", attributes: ["id", "name"] }
    ]
  });

  const hasMore = count > offset + records.length;

  return {
    records,
    count,
    hasMore
  };
};

export default ListService;