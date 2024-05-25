import { basketball } from '../data/basketball';
import { football } from '../data/football';
import { baseball } from '../data/baseball';
import { hockey } from '../data/hockey';
import type { GeoSearchResponse } from '../../types/geoSearch';
import type { CityResponse } from '../../types/general';
import { fetchData } from './fetch-data';
import { DEFAULT_CITY_RES, getClosest } from './helpers';

export const getCityByIp = async (
  ip: string | null | undefined
): Promise<CityResponse> => {
  if (!ip) {
    return DEFAULT_CITY_RES;
  }

  try {
    // remove ipv4 prefix
    let ipAddress = ip;

    if (ipAddress === '127.0.0.1' || ipAddress === '::1') {
      // lookup local public ip in development since express says localhost
      const data = await fetchData<{ ip: string }>(
        'https://api64.ipify.org?format=json'
      );
      ipAddress = data.ip;
    }

    const geoResponse = await fetchData<GeoSearchResponse>(
      'https://tools.keycdn.com/geo.json?host=' + ipAddress,
      {
        headers: { 'user-agent': 'keycdn-tools:https://sprt.dev' }
      }
    );

    if (geoResponse) {
      const apiGeo = geoResponse.data.geo;
      if (apiGeo.city) {
        const geo = {
          name: [apiGeo.city, apiGeo.region_name, apiGeo.country_name].join(
            ', '
          ),
          city: apiGeo.city,
          lat: apiGeo.latitude,
          lon: apiGeo.longitude
        };

        console.log('ip:', ipAddress, 'city:', apiGeo.city);

        return {
          name: geo.name,
          sports: {
            baseball: getClosest(geo, baseball),
            basketball: getClosest(geo, basketball),
            football: getClosest(geo, football),
            hockey: getClosest(geo, hockey)
          }
        };
      }
    }
  } catch (err) {
    console.error('Error getting geo data', err);
  }

  return DEFAULT_CITY_RES;
};
