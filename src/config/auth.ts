const nodeEnv = process.env.NODE_ENV;
const isProduction = nodeEnv === "production";

const secret = (process.env.JWT_SECRET || "").trim() || (!isProduction ? "mysecret" : "");
const refreshSecret =
  (process.env.JWT_REFRESH_SECRET || "").trim() ||
  (!isProduction ? "myanothersecret" : "");

if (isProduction && (!secret || !refreshSecret)) {
  throw new Error(
    "JWT_SECRET e JWT_REFRESH_SECRET são obrigatórios em produção (NODE_ENV=production). " +
      "Defina ambos no .env do servidor — valores longos e aleatórios."
  );
}

export default {
  secret,
  expiresIn: "8h",
  refreshSecret,
  refreshExpiresIn: "30d"
};
