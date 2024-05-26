import type { GeoTeam } from '../../types/sports';
import type { GoogleResponse } from '../../types/google';
import type { CityResponse } from '../../types/general';
import { fetchData } from './fetch-data';
import { getClosest, DEFAULT_CITY_RES } from 'db';

import { createClient } from 'redis';

const NO_RESULTS = 'no-results';

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
      if (redisEntry === NO_RESULTS) {
        console.log('Cache hit! 🥳 - No results for:', search);

        return DEFAULT_CITY_RES;
      }

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
      } else {
        console.log('No results found for:', search);
        // set in redis as miss - no need to block, so don't await
        void REDIS_CLIENT?.set(search, NO_RESULTS);
      }
    }
  } catch (err) {
    console.error('Error getting geo data from google for search:', search);
    if (err instanceof Error) {
      console.error(err.message);
    }
  }

  if (!geo) {
    return DEFAULT_CITY_RES;
  }

  const getClosestFn = getClosest(geo);

  return {
    name: geo.name,
    sports: {
      baseball: await getClosestFn('baseball'),
      basketball: await getClosestFn('basketball'),
      football: await getClosestFn('football'),
      hockey: await getClosestFn('hockey')
    },
    timezone: timezone ?? DEFAULT_CITY_RES.timezone
  };
};
