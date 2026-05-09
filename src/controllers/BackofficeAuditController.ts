import { Request, Response } from "express";

import AppError from "../errors/AppError";
import Company from "../models/Company";
import User from "../models/User";
import Whatsapp from "../models/Whatsapp";
import { requestUserIsSuper } from "../helpers/requestUserSuper";

/**
 * Resumo só leitura para painel master: contagens globais na plataforma.
 */
export const auditSummary = async (
  req: Request,
  res: Response
): Promise<Response> => {
  if (!(await requestUserIsSuper(req))) {
    throw new AppError("ERR_NO_PERMISSION", 403);
  }

  const [totalCompanies, totalMasters, totalConnections, activeConnections] =
    await Promise.all([
      Company.count(),
      User.count({ where: { super: true } }),
      Whatsapp.count(),
      Whatsapp.count({ where: { status: "CONNECTED" } })
    ]);

  const inactiveConnections = Math.max(0, totalConnections - activeConnections);

  return res.status(200).json({
    totalCompanies,
    totalMasters,
    connections: {
      total: totalConnections,
      active: activeConnections,
      inactive: inactiveConnections
    },
    generatedAt: new Date().toISOString()
  });
};
