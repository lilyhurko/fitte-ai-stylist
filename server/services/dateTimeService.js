const { DateTime } = require("luxon");

const DEFAULT_TIMEZONE = "UTC";

const parseEventLocalDateTime = (
  localDateTime,
  timezone = DEFAULT_TIMEZONE,
) => {
  const parsed = DateTime.fromISO(localDateTime, {
    zone: timezone,
  });

  if (!parsed.isValid) {
    return null;
  }

  return parsed.toUTC().toJSDate();
};

const getDateKeyInTimezone = (
  date,
  timezone = DEFAULT_TIMEZONE,
) => {
  const parsed = DateTime.fromJSDate(date, {
    zone: "utc",
  }).setZone(timezone);

  if (!parsed.isValid) {
    return null;
  }

  return parsed.toISODate();
};

module.exports = {
  DEFAULT_TIMEZONE,
  parseEventLocalDateTime,
  getDateKeyInTimezone,
};