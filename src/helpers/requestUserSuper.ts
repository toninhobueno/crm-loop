import { Request } from "express";

import User from "../models/User";

/**
 * Confirma se o usuário da requisição tem flag `super` (master).
 * Tokens JWT antigos podem não carregar `super`; nesse caso consulta o banco uma vez por requisição.
 */
export const requestUserIsSuper = async (req: Request): Promise<boolean> => {
  const u = req.user as { id: number | string; super?: boolean };
  if (!u?.id) {
    return false;
  }
  if (u.super === true) {
    return true;
  }
  const row = await User.findByPk(u.id, { attributes: ["super"] });
  return row?.super === true;
};
