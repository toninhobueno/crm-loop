import axios, { AxiosInstance } from 'axios';

interface CalComConfig {
  apiKey: string;
  baseUrl?: string;
}

interface EventType {
  id: number;
  title: string;
  slug: string;
  length: number;
  description?: string;
  bookingLink?: string;
}

interface EventTypesResult {
  eventTypes: EventType[];
  username: string;
}

interface BookingData {
  eventTypeId: number;
  start: string;
  end: string;
  attendee: {
    name: string;
    email: string;
    timeZone?: string;
  };
  metadata?: any;
}

interface Booking {
  id: number;
  uid: string;
  title: string;
  startTime: string;
  endTime: string;
  status: string;
  attendees: any[];
  meetingUrl?: string;
}

interface AvailabilitySlot {
  time: string;
  available: boolean;
}

class CalComApiService {
  private api: AxiosInstance;

  constructor(config: CalComConfig) {
    this.api = axios.create({
      baseURL: config.baseUrl || 'https://api.cal.com/v2',
      headers: {
        'Authorization': `Bearer ${config.apiKey}`,
        'Content-Type': 'application/json',
      },
      timeout: 10000,
    });
  }

  async getEventTypes(): Promise<EventTypesResult> {
    try {
      // Buscar username
      const meResponse = await this.api.get('/me');
      const username = meResponse.data?.data?.username || '';
      
      // Buscar event types
      const response = await this.api.get('/event-types');
      const eventTypeGroups = response.data?.data?.eventTypeGroups || [];
      
      // Extrair event types
      const eventTypes: EventType[] = [];
      for (const group of eventTypeGroups) {
        if (group.eventTypes && Array.isArray(group.eventTypes)) {
          for (const eventType of group.eventTypes) {
            eventTypes.push({
              ...eventType,
              bookingLink: `https://cal.com/${username}/${eventType.slug}`
            });
          }
        }
      }
      
      return { eventTypes, username };
    } catch (error) {
      throw error;
    }
  }

  async getAvailability(eventTypeId: number, date: string): Promise<AvailabilitySlot[]> {
    try {
      const response = await this.api.get(`/slots/available`, {
        params: {
          eventTypeId,
          startTime: date,
          endTime: date
        }
      });
      
      return response.data?.data?.slots || [];
    } catch (error) {
      throw error;
    }
  }

  async createBooking(bookingData: BookingData): Promise<Booking> {
    try {
      const response = await this.api.post('/bookings', {
        eventTypeId: bookingData.eventTypeId,
        start: bookingData.start,
        end: bookingData.end,
        attendee: bookingData.attendee,
        metadata: bookingData.metadata || {}
      });
      
      return response.data?.data;
    } catch (error) {
      throw error;
    }
  }

  async getBookings(filters: any = {}): Promise<Booking[]> {
    try {
      const response = await this.api.get('/bookings', {
        params: filters
      });
      
      return response.data?.data || [];
    } catch (error) {
      throw error;
    }
  }

  async getCalComBookings(): Promise<Booking[]> {
    try {
      // Buscar reservas diretamente do Cal.com
      const response = await this.api.get('/bookings');
      
      // Estrutura da API Cal.com v2: response.data.data.bookings
      const bookings = response.data?.data?.bookings || [];
      
      if (!Array.isArray(bookings)) {
        return [];
      }
      
      // Mapear para o formato esperado
      const mappedBookings = bookings.map((booking: any) => {
        // Extrair meetingUrl de múltiplas fontes possíveis
        let meetingUrl = null;
        
        // 1. Campo direto meetingUrl
        if (booking.meetingUrl) {
          meetingUrl = booking.meetingUrl;
        }
        // 2. Campo location se contém URL
        else if (booking.location && booking.location.includes('http')) {
          meetingUrl = booking.location;
        }
        // 3. videoCallData
        else if (booking.videoCallData?.url) {
          meetingUrl = booking.videoCallData.url;
        }
        // 4. references array (PRINCIPAL - onde está o Google Meet)
        else if (booking.references && Array.isArray(booking.references)) {
          const meetingRef = booking.references.find(ref => 
            ref.type === 'google_calendar' && ref.meetingUrl
          );
          if (meetingRef) {
            meetingUrl = meetingRef.meetingUrl;
          }
        }
        // 5. metadata
        else if (booking.metadata?.videoCallUrl) {
          meetingUrl = booking.metadata.videoCallUrl;
        }
        // 6. Procurar em responses (respostas do formulário)
        else if (booking.responses) {
          const meetingResponse = Object.values(booking.responses).find((response: any) => 
            typeof response === 'string' && response.includes('meet.google.com')
          );
          if (meetingResponse) {
            meetingUrl = meetingResponse as string;
          }
        }
        // 7. Verificar em eventType.locations
        else if (booking.eventType?.locations) {
          const meetingLocation = booking.eventType.locations.find((loc: any) => 
            loc.type === 'integrations:google:meet' && loc.link
          );
          if (meetingLocation) {
            meetingUrl = meetingLocation.link;
          }
        }

        return {
          id: booking.id,
          uid: booking.uid,
          title: booking.title || booking.eventType?.title || 'Agendamento',
          startTime: booking.startTime,
          endTime: booking.endTime,
          status: booking.status,
          attendees: booking.attendees || [],
          meetingUrl
        };
      });
      
      return mappedBookings;
    } catch (error) {
      throw error;
    }
  }
}

export default CalComApiService;