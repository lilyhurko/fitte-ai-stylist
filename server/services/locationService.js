const hasValidCoordinates = (latitude, longitude) =>
  Number.isFinite(latitude) &&
  latitude >= -90 &&
  latitude <= 90 &&
  Number.isFinite(longitude) &&
  longitude >= -180 &&
  longitude <= 180;

const resolveEventWeatherLocation = (event, user) => {
  if (hasValidCoordinates(event?.latitude, event?.longitude)) {
    return {
      latitude: event.latitude,
      longitude: event.longitude,
      name: event.locationName || null,
      timezone: event.timezone || null,
      source: "EVENT",
    };
  }

  if (hasValidCoordinates(user?.defaultLatitude, user?.defaultLongitude)) {
    return {
      latitude: user.defaultLatitude,
      longitude: user.defaultLongitude,
      name: user.defaultLocationName || null,
      timezone: user.defaultTimezone || null,
      source: "USER",
    };
  }

  return null;
};

const createLocationKey = ({ latitude, longitude }) =>
  `${latitude.toFixed(4)},${longitude.toFixed(4)}`;

module.exports = {
  hasValidCoordinates,
  resolveEventWeatherLocation,
  createLocationKey,
};
