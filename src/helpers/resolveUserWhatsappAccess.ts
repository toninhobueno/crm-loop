import AppError from "../errors/AppError";
import User from "../models/User";

type UserWhatsappScope = Pick<User, "profile" | "whatsappId">;

export const canBypassWhatsappRestriction = (user: UserWhatsappScope): boolean =>
  user.profile === "admin";

/**
 * Define quais whatsappIds podem ser usados em filtros/listagens.
 * Usuário com conexão vinculada só enxerga a própria conexão.
 */
export const resolveWhatsappIdsForUser = (
  user: UserWhatsappScope,
  requestedIds?: number[]
): number[] | undefined => {
  if (canBypassWhatsappRestriction(user)) {
    return requestedIds?.length ? requestedIds : undefined;
  }

  if (!user.whatsappId) {
    return requestedIds?.length ? requestedIds : undefined;
  }

  const allowedId = user.whatsappId;

  if (requestedIds?.length) {
    const filtered = requestedIds.filter(id => id === allowedId);
    return filtered.length > 0 ? filtered : [allowedId];
  }

  return [allowedId];
};

export const assertUserCanAccessTicketWhatsapp = (
  user: UserWhatsappScope,
  ticketWhatsappId?: number | null
): void => {
  if (canBypassWhatsappRestriction(user)) {
    return;
  }

  if (!user.whatsappId || !ticketWhatsappId) {
    return;
  }

  if (ticketWhatsappId !== user.whatsappId) {
    throw new AppError(
      "ERR_NO_PERMISSION_WHATSAPP",
      403
    );
  }
};

export const assertUserCanUseWhatsappId = (
  user: UserWhatsappScope,
  whatsappId?: number | null
): void => {
  if (canBypassWhatsappRestriction(user)) {
    return;
  }

  if (!user.whatsappId) {
    return;
  }

  if (!whatsappId || whatsappId !== user.whatsappId) {
    throw new AppError(
      "ERR_NO_PERMISSION_WHATSAPP",
      403
    );
  }
};

export const filterWhatsappsForUser = <T extends { id: number }>(
  user: UserWhatsappScope,
  whatsapps: T[]
): T[] => {
  if (canBypassWhatsappRestriction(user) || !user.whatsappId) {
    return whatsapps;
  }

  return whatsapps.filter(w => w.id === user.whatsappId);
};
