import { basketball } from '../data/basketball';
import { football } from '../data/football';
import { baseball } from '../data/baseball';
import { hockey } from '../data/hockey';
import type { GeoTeam } from '../../types/sports';
import type { GoogleResponse } from '../../types/google';
import type { CityResponse } from '../../types/general';
import { fetchData } from './fetch-data';
import { getClosest, DEFAULT_CITY_RES } from './helpers';

import { createClient } from 'redis';

const REDIS_CLIENT = process.env['REDIS_URL']
  ? await createClient({
      url: process.env['REDIS_URL'],
      password: process.env['REDIS_PASSWORD']
    })
      .on('error', err => console.log('Redis Client Error\n', err))
      .connect()
  : null;

export const getCityBySearch = async (
  search: string,
  timezone: string | undefined
): Promise<CityResponse> => {
  let geo: GeoTeam | undefined;
  try {
    const redisEntry = await REDIS_CLIENT?.get(search);
    if (redisEntry) {
      geo = JSON.parse(redisEntry) as GeoTeam;
      console.log('Cache hit! 🥳', geo.city);
    } else {
      const googRes = await fetchData<GoogleResponse>(
        `https://maps.googleapis.com/maps/api/geocode/json?address=${search}&components=short_name:CA|short_name:US&region=us&key=${process.env['GOOGLE_API_KEY']}`
      );
      const googSearchResults = googRes.results;
      if (googSearchResults.length) {
        const res = googSearchResults[0];
        geo = {
          name: res.formatted_address,
          city: res.address_components.reduce(
            (acc, comp) =>
              comp.types.includes('locality') ? comp.long_name : acc,
            ''
          ),
          lat: res.geometry.location.lat,
          lon: res.geometry.location.lng
        };

        // set in redis - no need to block, so don't await
        void REDIS_CLIENT?.set(search, JSON.stringify(geo));
      }
    }
  } catch {
    // no-op
  }

  if (!geo) {
    return DEFAULT_CITY_RES;
  }

  const getClosestFn = getClosest(geo);

  return {
    name: geo.name,
    sports: {
      baseball: getClosestFn(baseball),
      basketball: getClosestFn(basketball),
      football: getClosestFn(football),
      hockey: getClosestFn(hockey)
    },
    timezone: timezone ?? DEFAULT_CITY_RES.timezone
  };
};
