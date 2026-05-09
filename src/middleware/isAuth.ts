import { verify } from "jsonwebtoken";
import { Request, Response, NextFunction } from "express";

import AppError from "../errors/AppError";
import authConfig from "../config/auth";

import { getIO } from "../libs/socket";
import ShowUserService from "../services/UserServices/ShowUserService";
import { updateUser } from "../helpers/updateUser";
// import { moment} from "moment-timezone"

interface TokenPayload {
  id: string | number;
  username?: string;
  profile: string;
  companyId: number;
  super?: boolean;
  iat?: number;
  exp?: number;
}

const isAuth = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  const authHeader = req.headers.authorization;

  if (!authHeader) {
    throw new AppError("ERR_SESSION_EXPIRED", 401);
  }

  // const check = await verifyHelper();

  // if (!check) {
  //   throw new AppError("ERR_SYSTEM_INVALID", 401);
  // }

  const [, token] = authHeader.split(" ");

  try {
    const decoded = verify(token, authConfig.secret);
    const { id: decodedId, profile, companyId, super: superMaster } =
      decoded as TokenPayload;
    const id = String(decodedId);

    updateUser(id, companyId);

    req.user = {
      id,
      profile,
      companyId,
      super: superMaster === true
    };
  } catch (err: any) {
    if (err.message === "ERR_SESSION_EXPIRED" && err.statusCode === 401) {
      throw new AppError(err.message, 401);
    } else {
      throw new AppError(
        "Invalid token. We'll try to assign a new one on next request",
        403
      );
    }
  }

  return next();
};

export default isAuth;