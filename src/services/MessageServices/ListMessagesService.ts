import AppError from "../../errors/AppError";
import Message from "../../models/Message";
import Ticket from "../../models/Ticket";
import ShowTicketService from "../TicketServices/ShowTicketService";
import { Op } from "sequelize";
import { intersection } from "lodash";
import User from "../../models/User";
import isQueueIdHistoryBlocked from "../UserServices/isQueueIdHistoryBlocked";
import Contact from "../../models/Contact";
import Queue from "../../models/Queue";
import Whatsapp from "../../models/Whatsapp";

interface Request {
  ticketId: string;
  companyId: number;
  pageNumber?: string;
  queues?: number[];
  user?: User;
  loadRecentConversations?: string;
  conversationLimit?: number;
  messagesPerConversation?: number;
}

interface Response {
  messages: Message[];
  ticket: Ticket;
  count: number;
  hasMore: boolean;
}

const ListMessagesService = async ({
  pageNumber = "1",
  ticketId,
  companyId,
  queues = [],
  user,
  loadRecentConversations = "false",
  conversationLimit = 10,
  messagesPerConversation = 50
}: Request): Promise<Response> => {

  if (!isNaN(Number(ticketId))) {
    const uuid = await Ticket.findOne({
      where: {
        id: ticketId,
        companyId
      },
      attributes: ["uuid"]
    });
    ticketId = uuid.uuid;
  }
  const ticket = await Ticket.findOne({
    where: {
      uuid: ticketId,
      companyId
    }
  });

  const ticketsFilter: any[] | null = [];

  const isAllHistoricEnabled = await isQueueIdHistoryBlocked({ userRequest: user.id });

  let ticketIds = [];
  if (!isAllHistoricEnabled) {
    const queueIdFilter =
      queues.length > 0
        ? user.profile === "admin" ||
          user.allTicket === "enable" ||
          (ticket.isGroup && user.allowGroup)
          ? { [Op.or]: [queues, null] }
          : { [Op.in]: queues }
        : null;

    ticketIds = await Ticket.findAll({
      where:
      {
        id: { [Op.lte]: ticket.id },
        companyId: ticket.companyId,
        contactId: ticket.contactId,
        whatsappId: ticket.whatsappId,
        isGroup: ticket.isGroup,
        ...(queueIdFilter ? { queueId: queueIdFilter } : {}),
      },
      attributes: ["id"]
    });
  } else {
    ticketIds = await Ticket.findAll({
      where:
      {
        id: { [Op.lte]: ticket.id },
        companyId: ticket.companyId,
        contactId: ticket.contactId,
        whatsappId: ticket.whatsappId,
        isGroup: ticket.isGroup
      },
      attributes: ["id"]
    });
  }

  if (ticketIds) {
    ticketsFilter.push(ticketIds.map(t => t.id));
  }
  // }

  const tickets: number[] = intersection(...ticketsFilter);

  if (!tickets) {
    throw new AppError("ERR_NO_TICKET_FOUND", 404);
  }

  const includeByConversation = loadRecentConversations === "true" && +pageNumber === 1;

  // await setMessagesAsRead(ticket);
  const limit = 20;
  const offset = limit * (+pageNumber - 1);

  const includeConfig = [
    {
      model: Contact,
      as: "contact",
      attributes: ["id", "name"],
    },
    {
      model: Message,
      attributes: ["id", "wid", "fromMe", "mediaUrl", "body", "mediaType", "companyId"],
      as: "quotedMsg",
      include: [
        {
          model: Contact,
          as: "contact",
          attributes: ["id", "name"],
        }
      ],
      required: false
    },
    {
      model: Ticket,
      required: true,
      attributes: ["id", "whatsappId", "queueId"],
      include: [
        {
          model: Queue,
          as: "queue",
          attributes: ["id", "name", "color"]
        }
      ],
    }
  ];

  const isWhatsAppChannel = ["whatsapp", "whatsapp_oficial", "whatsappapi"].includes(ticket.channel);

  if (includeByConversation && isWhatsAppChannel) {
    const recentTicketIds = await Ticket.findAll({
      where: {
        companyId: ticket.companyId,
        contactId: ticket.contactId,
        channel: { [Op.in]: ["whatsapp", "whatsapp_oficial", "whatsappapi"] }
      },
      attributes: ["id"],
      order: [["updatedAt", "DESC"]],
      limit: Math.max(1, Math.min(conversationLimit, 20))
    });

    const messageChunks = await Promise.all(
      recentTicketIds.map(async t => {
        const { rows } = await Message.findAndCountAll({
          where: { ticketId: t.id, companyId },
          attributes: ["id", "wid", "fromMe", "mediaUrl", "body", "mediaType", "ack", "createdAt", "ticketId", "isDeleted", "queueId", "isForwarded", "isEdited", "isPrivate", "companyId"],
          limit: Math.max(1, Math.min(messagesPerConversation, 100)),
          include: includeConfig as any,
          distinct: true,
          subQuery: false,
          order: [["createdAt", "DESC"]]
        });

        return rows.reverse();
      })
    );

    const messages = messageChunks
      .flat()
      .sort((a, b) => +new Date(a.createdAt) - +new Date(b.createdAt));

    return {
      messages,
      ticket,
      count: messages.length,
      hasMore: false
    };
  }

  const { count, rows: messages } = await Message.findAndCountAll({
    where: { ticketId: tickets, companyId },
    attributes: ["id", "wid", "fromMe", "mediaUrl", "body", "mediaType", "ack", "createdAt", "ticketId", "isDeleted", "queueId", "isForwarded", "isEdited", "isPrivate", "companyId"],
    limit,
    include: includeConfig as any,
    distinct: true,
    offset,
    subQuery: false,
    order: [["createdAt", "DESC"]]
  });

  const hasMore = count > offset + messages.length;

  return {
    messages: messages.reverse(),
    ticket,
    count,
    hasMore
  };
};

export default ListMessagesService;