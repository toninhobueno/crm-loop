declare namespace Express {
  export interface Request {
    user: {
      id: string;
      profile: string;
      companyId: number;
      /** Preenchido pelo JWT quando emitido com campo master (`helpers/CreateTokens`). */
      super?: boolean;
    };
  }
}
