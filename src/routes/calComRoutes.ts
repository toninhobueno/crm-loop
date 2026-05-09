import express from "express";
import isAuth from "../middleware/isAuth";
import * as CalComController from "../controllers/CalComController";

const calComRoutes = express.Router();

// Configuração da integração
calComRoutes.post("/calcom/configure", isAuth, CalComController.configureIntegration);
calComRoutes.get("/calcom/status", isAuth, CalComController.getIntegrationStatus);

// Tipos de evento
calComRoutes.get("/calcom/event-types", isAuth, CalComController.getEventTypes);

// Links de agendamento
calComRoutes.get("/calcom/booking-links", isAuth, CalComController.getBookingLinks);

// Agendamentos
calComRoutes.post("/calcom/bookings", isAuth, CalComController.createBooking);
calComRoutes.get("/calcom/calcom-bookings", isAuth, CalComController.getCalComBookings);

// Disponibilidade
calComRoutes.get("/calcom/availability", isAuth, CalComController.getAvailability);

// Webhook (sem autenticação pois vem do Cal.com)
calComRoutes.post("/calcom/webhook", CalComController.webhook);

export default calComRoutes;