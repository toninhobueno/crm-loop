import { Request, Response } from "express";
import { verify } from "jsonwebtoken";
import * as Yup from "yup";
import authConfig from "../config/auth";
import AppError from "../errors/AppError";
import CalComIntegration from "../models/CalComIntegration";
import CalComApiService from "../services/CalComService/CalComApiService";

interface TokenPayload {
  id: string;
  username: string;
  profile: string;
  companyId: number;
  iat: number;
  exp: number;
}

// Configurar integração
export const configureIntegration = async (req: Request, res: Response): Promise<Response> => {
  const { apiKey, baseUrl, settings } = req.body;

  const schema = Yup.object().shape({
    apiKey: Yup.string().required("API Key é obrigatória"),
    baseUrl: Yup.string().url("URL inválida").default("https://api.cal.com/v2")
  });

  try {
    await schema.validate({ apiKey, baseUrl });
  } catch (err: any) {
    throw new AppError(err.message);
  }

  const authHeader = req.headers.authorization;
  const [, token] = authHeader.split(" ");
  const decoded = verify(token, authConfig.secret);
  const { companyId } = decoded as TokenPayload;

  try {
    // Testar a API key
    const calComApi = new CalComApiService({ apiKey, baseUrl });
    const result = await calComApi.getEventTypes();

    // Salvar ou atualizar configuração
    let integration;
    try {
      const [integrationResult, created] = await CalComIntegration.findOrCreate({
        where: { companyId },
        defaults: {
          companyId,
          apiKey,
          baseUrl: baseUrl || "https://api.cal.com/v2",
          active: true,
          settings: settings || {}
        }
      });
      
      integration = integrationResult;

      if (!created) {
        await integration.update({
          apiKey,
          baseUrl: baseUrl || "https://api.cal.com/v2",
          active: true,
          settings: settings || {}
        });
      }
    } catch (dbError) {
      throw dbError;
    }

    return res.status(200).json({
      message: "Integração configurada com sucesso",
      integration,
      eventTypesCount: result.eventTypes.length
    });
  } catch (error) {
    // Se o erro for específico da API, usar a mensagem original
    if (error.response?.status === 401) {
      throw new AppError("API Key inválida - verifique suas credenciais do Cal.com", 401);
    } else if (error.response?.status === 403) {
      throw new AppError("Acesso negado - verifique as permissões da API Key", 403);
    } else if (error.response?.status === 404) {
      throw new AppError("Endpoint não encontrado - verifique a URL base da API", 404);
    } else {
      throw new AppError(`Erro na conexão com Cal.com: ${error.message}`, 400);
    }
  }
};

// Listar tipos de evento
export const getEventTypes = async (req: Request, res: Response): Promise<Response> => {
  const authHeader = req.headers.authorization;
  const [, token] = authHeader.split(" ");
  const decoded = verify(token, authConfig.secret);
  const { companyId } = decoded as TokenPayload;

  const integration = await CalComIntegration.findOne({
    where: { companyId, active: true }
  });

  if (!integration) {
    throw new AppError("Integração Cal.com não configurada", 404);
  }

  try {
    const calComApi = new CalComApiService({
      apiKey: integration.apiKey,
      baseUrl: integration.baseUrl
    });

    const result = await calComApi.getEventTypes();

    return res.status(200).json({
      eventTypes: result.eventTypes,
      username: result.username,
      message: "Event types carregados com sucesso"
    });
  } catch (error) {
    throw new AppError("Erro ao buscar tipos de evento", 500);
  }
};

// Buscar links de agendamento
export const getBookingLinks = async (req: Request, res: Response): Promise<Response> => {
  const authHeader = req.headers.authorization;
  const [, token] = authHeader.split(" ");
  const decoded = verify(token, authConfig.secret);
  const { companyId } = decoded as TokenPayload;

  const integration = await CalComIntegration.findOne({
    where: { companyId, active: true }
  });

  if (!integration) {
    throw new AppError("Integração Cal.com não configurada", 404);
  }

  try {
    const calComApi = new CalComApiService({
      apiKey: integration.apiKey,
      baseUrl: integration.baseUrl
    });

    const result = await calComApi.getEventTypes();
    
    // Retornar apenas os links de agendamento
    const bookingLinks = result.eventTypes.map(eventType => ({
      id: eventType.id,
      title: eventType.title,
      slug: eventType.slug,
      duration: eventType.length,
      description: eventType.description,
      bookingLink: eventType.bookingLink
    }));

    return res.status(200).json({
      links: bookingLinks,
      count: bookingLinks.length
    });
  } catch (error) {
    throw new AppError("Erro ao buscar links de agendamento", 500);
  }
};

// Criar agendamento diretamente no Cal.com
export const createBooking = async (req: Request, res: Response): Promise<Response> => {
  const {
    eventTypeId,
    startTime,
    endTime,
    attendeeName,
    attendeeEmail,
    metadata
  } = req.body;

  const schema = Yup.object().shape({
    eventTypeId: Yup.number().required("Tipo de evento é obrigatório"),
    startTime: Yup.string().required("Data/hora de início é obrigatória"),
    endTime: Yup.string().required("Data/hora de fim é obrigatória"),
    attendeeName: Yup.string().required("Nome do participante é obrigatório"),
    attendeeEmail: Yup.string().email("Email inválido").required("Email é obrigatório")
  });

  try {
    await schema.validate(req.body);
  } catch (err: any) {
    throw new AppError(err.message);
  }

  const authHeader = req.headers.authorization;
  const [, token] = authHeader.split(" ");
  const decoded = verify(token, authConfig.secret);
  const { companyId } = decoded as TokenPayload;

  const integration = await CalComIntegration.findOne({
    where: { companyId, active: true }
  });

  if (!integration) {
    throw new AppError("Integração Cal.com não configurada", 404);
  }

  try {
    const calComApi = new CalComApiService({
      apiKey: integration.apiKey,
      baseUrl: integration.baseUrl
    });

    const booking = await calComApi.createBooking({
      eventTypeId,
      start: startTime,
      end: endTime,
      attendee: {
        name: attendeeName,
        email: attendeeEmail
      },
      metadata
    });

    return res.status(201).json(booking);
  } catch (error) {
    throw new AppError("Erro ao criar agendamento: " + error.message, 500);
  }
};

// Listar reservas diretamente do Cal.com
export const getCalComBookings = async (req: Request, res: Response): Promise<Response> => {
  const authHeader = req.headers.authorization;
  const [, token] = authHeader.split(" ");
  const decoded = verify(token, authConfig.secret);
  const { companyId } = decoded as TokenPayload;

  const integration = await CalComIntegration.findOne({
    where: { companyId, active: true }
  });

  if (!integration) {
    throw new AppError("Integração Cal.com não configurada", 404);
  }

  try {
    const calComApi = new CalComApiService({
      apiKey: integration.apiKey,
      baseUrl: integration.baseUrl
    });

    const bookings = await calComApi.getCalComBookings();

    return res.status(200).json({
      bookings,
      count: bookings.length,
      message: "Reservas carregadas diretamente do Cal.com"
    });
  } catch (error) {
    throw new AppError("Erro ao buscar reservas do Cal.com: " + error.message, 500);
  }
};

// Webhook para receber eventos do Cal.com
export const webhook = async (req: Request, res: Response): Promise<Response> => {
  const { triggerEvent, payload } = req.body;

  try {
    switch (triggerEvent) {
      case 'BOOKING_CREATED':
        // Extrair informações do agendamento
        const { 
          eventType, 
          startTime, 
          endTime, 
          attendees, 
          organizer,
          location,
          meetingUrl,
          videoCallData,
          references,
          metadata
        } = payload;

        // Formatar a mensagem de agendamento
        const startDate = new Date(startTime);
        const endDate = new Date(endTime);
        const formattedDate = startDate.toLocaleDateString('pt-BR');
        const formattedStartTime = startDate.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
        const formattedEndTime = endDate.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

        const attendeeName = attendees?.[0]?.name || 'Participante';
        const attendeeEmail = attendees?.[0]?.email || '';
        const organizerName = organizer?.name || 'Organizador';

        // Extrair link do Meet de múltiplas fontes
        let extractedMeetingUrl = null;
        
        if (meetingUrl) {
          extractedMeetingUrl = meetingUrl;
        } else if (location && location.includes('http')) {
          extractedMeetingUrl = location;
        } else if (videoCallData?.url) {
          extractedMeetingUrl = videoCallData.url;
        } else if (references && Array.isArray(references)) {
          const meetingRef = references.find(ref => 
            ref.type === 'google_calendar' && ref.meetingUrl
          );
          if (meetingRef) {
            extractedMeetingUrl = meetingRef.meetingUrl;
          }
        } else if (metadata?.videoCallUrl) {
          extractedMeetingUrl = metadata.videoCallUrl;
        }

        // Criar mensagem com link do Meet
        let message = `Reservas do Cal.com\n\n`;
        message += `AGENDA between ${organizerName} and ${attendeeName}\n`;
        message += `Data: ${formattedDate}\n`;
        message += `Horário: ${formattedStartTime} - ${formattedEndTime}\n`;
        message += `Participante: ${attendeeName} (${attendeeEmail})\n`;
        
        // Adicionar link do Meet se disponível
        if (extractedMeetingUrl) {
          message += `\n🔗 Link da reunião: ${extractedMeetingUrl}`;
        }

        // Aqui você pode enviar a mensagem via WhatsApp
        // Exemplo: await sendWhatsAppMessage(attendeeEmail, message);
        
        break;
      
      case 'BOOKING_CANCELLED':
        // Agendamento cancelado
        break;
      
      case 'BOOKING_RESCHEDULED':
        // Agendamento reagendado
        break;
      
      default:
        // Evento não tratado
    }

    return res.status(200).json({ received: true });
  } catch (error) {
    return res.status(500).json({ error: 'Erro interno' });
  }
};

// Verificar disponibilidade
export const getAvailability = async (req: Request, res: Response): Promise<Response> => {
  const { eventTypeId, date } = req.query;

  if (!eventTypeId || !date) {
    throw new AppError("EventTypeId e date são obrigatórios", 400);
  }

  const authHeader = req.headers.authorization;
  const [, token] = authHeader.split(" ");
  const decoded = verify(token, authConfig.secret);
  const { companyId } = decoded as TokenPayload;

  const integration = await CalComIntegration.findOne({
    where: { companyId, active: true }
  });

  if (!integration) {
    throw new AppError("Integração Cal.com não configurada", 404);
  }

  try {
    const calComApi = new CalComApiService({
      apiKey: integration.apiKey,
      baseUrl: integration.baseUrl
    });

    const availability = await calComApi.getAvailability(
      Number(eventTypeId),
      date as string
    );

    return res.status(200).json({ slots: availability });
  } catch (error) {
    throw new AppError("Erro ao verificar disponibilidade", 500);
  }
};

// Status da integração
export const getIntegrationStatus = async (req: Request, res: Response): Promise<Response> => {
  const authHeader = req.headers.authorization;
  const [, token] = authHeader.split(" ");
  const decoded = verify(token, authConfig.secret);
  const { companyId } = decoded as TokenPayload;

  try {
    const integration = await CalComIntegration.findOne({
      where: { companyId }
    });

    if (!integration) {
      return res.status(200).json({
        configured: false,
        active: false
      });
    }

    return res.status(200).json({
      configured: true,
      active: integration.active,
      baseUrl: integration.baseUrl,
      lastSync: integration.updatedAt
    });
  } catch (error) {
    throw new AppError("Erro ao obter status da integração", 500);
  }
};