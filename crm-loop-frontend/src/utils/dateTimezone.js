import moment from "moment-timezone";

export const APP_TIMEZONE = "America/Sao_Paulo";

export function parseApiDate(value) {
  if (value == null || value === "") {
    return null;
  }
  const m = moment(value);
  if (!m.isValid()) {
    return null;
  }
  return m.tz(APP_TIMEZONE);
}

/** Campanhas / agendamentos: exibir no fuso de São Paulo (requer API com UTC correto). */
export function formatScheduledAtToClient(value) {
  return formatDateTimeToClient(value);
}

export function formatDateTimeToClient(value) {
  const m = parseApiDate(value);
  if (!m) {
    return value;
  }
  return m.format("DD/MM/YYYY HH:mm");
}

export function formatDateToClient(value) {
  const m = parseApiDate(value);
  if (!m) {
    return value;
  }
  return m.format("DD/MM/YYYY");
}

export function formatDateTimeForInput(value) {
  const m = parseApiDate(value);
  if (!m) {
    return "";
  }
  return m.format("YYYY-MM-DDTHH:mm");
}

export function formatDateForInput(value) {
  const m = parseApiDate(value);
  if (!m) {
    return "";
  }
  return m.format("YYYY-MM-DD");
}

/** Envia ao backend como horário de São Paulo (sem offset na string). */
export function formatDateTimeForApi(value) {
  if (value == null || value === "") {
    return value;
  }
  const m = moment.tz(
    value,
    [
      "YYYY-MM-DD HH:mm:ss",
      "YYYY-MM-DD HH:mm",
      "YYYY-MM-DDTHH:mm:ss",
      "YYYY-MM-DDTHH:mm"
    ],
    APP_TIMEZONE
  );
  if (!m.isValid()) {
    return value;
  }
  return m.format("YYYY-MM-DD HH:mm:ss");
}
