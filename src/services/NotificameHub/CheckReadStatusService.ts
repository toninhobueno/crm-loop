import Ticket from "../../models/Ticket";
import Message from "../../models/Message";
import logger from "../../utils/logger";

interface ReadStatusResponse {
  hasUnreadMessages: boolean;
  lastReadMessageId: string | null;
  lastReceivedMessageId: string | null;
  unreadCount: number;
}

/**
 * Verifica status de leitura para APIs oficiais baseado em lid/rid
 */
const CheckReadStatusService = async (ticketId: number): Promise<ReadStatusResponse> => {
  try {
    const ticket = await Ticket.findByPk(ticketId, {
      include: [
        {
          model: Message,
          as: "messages",
          where: { fromMe: true },
          required: false,
          order: [["createdAt", "DESC"]],
          limit: 50
        }
      ]
    });

    if (!ticket) {
      throw new Error("Ticket not found");
    }

    // Para APIs não-oficiais, usar contagem tradicional
    if (!["whatsapp", "instagram", "facebook"].includes(ticket.channel)) {
      return {
        hasUnreadMessages: ticket.unreadMessages > 0,
        lastReadMessageId: null,
        lastReceivedMessageId: null,
        unreadCount: ticket.unreadMessages
      };
    }

    const { lid, rid } = ticket;
    const sentMessages = ticket.messages || [];

    if (sentMessages.length === 0) {
      return {
        hasUnreadMessages: false,
        lastReadMessageId: lid,
        lastReceivedMessageId: rid,
        unreadCount: 0
      };
    }

    // Contar mensagens não lidas baseado no lid
    let unreadCount = 0;
    let hasUnreadMessages = false;

    if (!lid) {
      // Se não tem lid, todas as mensagens enviadas são não lidas
      unreadCount = sentMessages.length;
      hasUnreadMessages = unreadCount > 0;
    } else {
      // Contar mensagens enviadas após o lid
      const lidIndex = sentMessages.findIndex(msg => msg.wid === lid);
      
      if (lidIndex === -1) {
        // lid não encontrado, considerar todas não lidas
        unreadCount = sentMessages.length;
      } else {
        // Contar mensagens após o lid
        unreadCount = lidIndex;
      }
      
      hasUnreadMessages = unreadCount > 0;
    }

    logger.info(`[CheckReadStatus] Ticket ${ticketId}: lid=${lid}, rid=${rid}, unreadCount=${unreadCount}`);

    return {
      hasUnreadMessages,
      lastReadMessageId: lid,
      lastReceivedMessageId: rid,
      unreadCount
    };

  } catch (error: any) {
    logger.error(`[CheckReadStatus] Error checking read status for ticket ${ticketId}: ${error.message}`);
    throw error;
  }
};

export default CheckReadStatusService;