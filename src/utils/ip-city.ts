import type { Geo } from '../../types/geoSearch';
import type { CityResponse } from '../../types/general';
import { DEFAULT_CITY_RES, getClosest } from 'db';

export const getCitySportsFromGeo = async (
  apiGeo: Geo | undefined
): Promise<CityResponse> => {
  try {
    if (apiGeo?.city) {
      const geo = {
        name: [apiGeo.city, apiGeo.region_name, apiGeo.country_name].join(', '),
        city: apiGeo.city,
        lat: apiGeo.latitude,
        lon: apiGeo.longitude
      };

      const getClosestFn = getClosest(geo);

      return {
        name: geo.name,
        sports: {
          baseball: await getClosestFn('baseball'),
          basketball: await getClosestFn('basketball'),
          football: await getClosestFn('football'),
          hockey: await getClosestFn('hockey')
        },
        timezone: apiGeo.timezone ?? (await DEFAULT_CITY_RES).timezone
      };
    }
  } catch (err) {
    console.error('Error getting geo data\n', err);
  }

  return DEFAULT_CITY_RES;
};
