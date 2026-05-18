import moment from "moment-timezone";
import {
  APP_TIMEZONE,
  formatDateTimeForApi,
  formatDateTimeToClient,
  formatDateToClient,
  parseApiDate
} from "../../utils/dateTimezone";

export function useDate() {
  function dateToClient(strDate) {
    return formatDateToClient(strDate);
  }

  function datetimeToClient(strDate) {
    return formatDateTimeToClient(strDate);
  }

  function dateToDatabase(strDate) {
    if (moment(strDate, "DD/MM/YYYY", true).isValid()) {
      return moment
        .tz(strDate, "DD/MM/YYYY", APP_TIMEZONE)
        .format("YYYY-MM-DD HH:mm:ss");
    }
    return formatDateTimeForApi(strDate);
  }

  function returnDays(date) {
    const data1 = moment().tz(APP_TIMEZONE).startOf("day");
    const parsed = parseApiDate(date);
    if (!parsed) {
      return 0;
    }
    const data2 = parsed.startOf("day");
    const days = data2.diff(data1, "days");
    return days === 0 ? 0 : days;
  }

  return {
    dateToClient,
    datetimeToClient,
    dateToDatabase,
    returnDays
  };
}
