import { Sequelize, Op } from "sequelize";
import Queue from "../../models/Queue";
import Company from "../../models/Company";
import User from "../../models/User";
import Plan from "../../models/Plan";
import Ticket from "../../models/Ticket";

interface Request {
  searchParam?: string;
  pageNumber?: string | number;
  profile?: string;
  companyId?: number;
  /** Lista só usuários master (super); exige que o endpoint restrinja a quem pode ver. */
  superOnly?: boolean;
}

interface Response {
  users: User[];
  count: number;
  hasMore: boolean;
}

const ListUsersService = async ({
  searchParam = "",
  pageNumber = "1",
  companyId,
  superOnly = false
}: Request): Promise<Response> => {
  const companyWhere = { companyId: { [Op.eq]: companyId } };

  const searchOr =
    searchParam && searchParam.trim() !== ""
      ? {
          [Op.or]: [
            {
              "$User.name$": Sequelize.where(
                Sequelize.fn("LOWER", Sequelize.col("User.name")),
                "LIKE",
                `%${searchParam.toLowerCase()}%`
              )
            },
            { email: { [Op.like]: `%${searchParam.toLowerCase()}%` } }
          ]
        }
      : {};

  const whereCondition = {
    ...companyWhere,
    ...searchOr,
    ...(superOnly ? { super: true } : {})
  };

  const limit = 20;
  const offset = limit * (+pageNumber - 1);

  const { count, rows: users } = await User.findAndCountAll({
    where: whereCondition,
    attributes: [
      "name",
      "id",
      "email",
      "companyId",
      "profile",
      "online",
      "startWork",
      "endWork",
      "profileImage",
      "allowSeeMessagesInPendingTickets",
      "super"
    ],
    limit,
    offset,
    order: [["name", "ASC"]],
    include: [
      { model: Queue, as: "queues", attributes: ["id", "name", "color"] },
      {
        model: Company,
        as: "company",
        attributes: ["id", "name", "dueDate", "document"],
        // include: [
        //   {
        //     model: Plan, as: "plan",
        //     attributes: ["id",
        //       "name",
        //       "amount",
        //       "useWhatsapp",
        //       "useFacebook",
        //       "useInstagram",
        //       "useCampaigns",
        //       "useSchedules",
        //       "useInternalChat",
        //       "useExternalApi",
        //       "useIntegrations",
        //       "useOpenAi",
        //       "useKanban"
        //     ]
        //   },
        // ]
      }
    ]
  });

  const hasMore = count > offset + users.length;
  console.log(hasMore, count)
  return {
    users,
    count,
    hasMore
  };
};

export default ListUsersService;
