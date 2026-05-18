import moment from "moment-timezone";

export const APP_TIMEZONE =
  process.env.APP_TIMEZONE || process.env.TZ || "America/Sao_Paulo";

const LOCAL_DATETIME_FORMATS = [
  "YYYY-MM-DD HH:mm:ss",
  "YYYY-MM-DD HH:mm",
  "YYYY-MM-DDTHH:mm:ss",
  "YYYY-MM-DDTHH:mm",
  "DD/MM/YYYY HH:mm:ss",
  "DD/MM/YYYY HH:mm"
];

const LOCAL_DATE_FORMATS = ["YYYY-MM-DD", "DD/MM/YYYY"];

/**
 * Converte data/hora enviada pelo frontend (horário de Brasília, sem offset)
 * para Date UTC correta para persistência no banco.
 */
export function parseLocalDateTime(
  value: string | Date | null | undefined
): Date | null {
  if (value == null || value === "") {
    return null;
  }

  if (value instanceof Date) {
    return moment(value).tz(APP_TIMEZONE).toDate();
  }

  const str = String(value).trim();
  if (!str) {
    return null;
  }

  if (/Z$/i.test(str) || /[+-]\d{2}:?\d{2}$/.test(str)) {
    const withOffset = moment.parseZone(str);
    if (withOffset.isValid()) {
      return withOffset.toDate();
    }
  }

  const parsed = moment.tz(str, LOCAL_DATETIME_FORMATS, true, APP_TIMEZONE);
  if (parsed.isValid()) {
    return parsed.toDate();
  }

  const fallback = moment.tz(str, APP_TIMEZONE);
  return fallback.isValid() ? fallback.toDate() : null;
}

/**
 * Converte data (sem hora) no fuso de São Paulo para Date UTC.
 */
export function parseLocalDate(
  value: string | Date | null | undefined
): Date | null {
  if (value == null || value === "") {
    return null;
  }

  if (value instanceof Date) {
    return moment(value).tz(APP_TIMEZONE).startOf("day").toDate();
  }

  const str = String(value).trim();
  if (!str) {
    return null;
  }

  const datePart = str.includes("T") ? str.split("T")[0] : str.split(" ")[0];
  const parsed = moment
    .tz(datePart, LOCAL_DATE_FORMATS, true, APP_TIMEZONE)
    .hour(12);

  if (parsed.isValid()) {
    return parsed.toDate();
  }

  return parseLocalDateTime(value);
}

export function nowInAppTimezone(): moment.Moment {
  return moment().tz(APP_TIMEZONE);
}
