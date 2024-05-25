import { basketball } from '../data/basketball';
import { football } from '../data/football';
import { baseball } from '../data/baseball';
import { hockey } from '../data/hockey';
import { distance } from './helpers';
import type { GeoTeam, TeamWithLocation } from '../../types/sports';
import type { GeoSearchResponse } from '../../types/geoSearch';
import type { GoogleResponse } from '../../types/google';
import type { CityResponse, CityTeam } from '../../types/general';
import { fetchData } from './fetch-data';

const closeEnough = (a: number, b: number) => {
  const diff = a - b;
  return diff < 25;
};

const getClosest = (loc: GeoTeam, data: TeamWithLocation[]): CityTeam[] => {
  const closest = data.reduce(
    (mins, team) => {
      const d = distance({ point1: loc, point2: team });
      if (d < mins[0].d) {
        return [
          {
            abbr: team.abbr,
            name: team.name,
            d
          }
        ];
      } else if (closeEnough(d, mins[0].d)) {
        mins.push({
          abbr: team.abbr,
          name: team.name,
          d
        });
        return mins;
      } else {
        return mins;
      }
    },
    [
      {
        abbr: data[0].abbr,
        name: data[0].name,
        d: Infinity
      }
    ]
  );
  return closest.map(city => ({
    abbr: city.abbr,
    name: city.name
  }));
};

const getByAbbreviation = (
  abbr: string,
  data: TeamWithLocation[]
): CityTeam[] => {
  const foundTeam = data.find(team => team.abbr === abbr);
  if (!foundTeam) return [];
  return [
    {
      abbr: foundTeam.abbr,
      name: foundTeam.name
    }
  ];
};

const DEFAULT_CITY_RES: CityResponse = {
  name: 'Unable to detect location - Falling back to Boston',
  sports: {
    baseball: getByAbbreviation('bos', baseball),
    basketball: getByAbbreviation('bos', basketball),
    football: getByAbbreviation('ne', football),
    hockey: getByAbbreviation('bos', hockey)
  }
};

export const getCityByIp = async (): Promise<CityResponse> => {
  try {
    // lookup local public ip in development since express says localhost
    const data = await fetchData<{ ip: string }>(
      'https://api64.ipify.org?format=json'
    );
    const ipAddress = data.ip;

    const geoResponse = await fetchData<GeoSearchResponse>(
      'https://tools.keycdn.com/geo.json?host=' + ipAddress,
      {
        headers: { 'user-agent': 'keycdn-tools:https://sprt.dev' }
      }
    );

    console.log('ip:', ipAddress);

    if (geoResponse) {
      const apiGeo = geoResponse.data.geo;
      console.log('apiGeo:', apiGeo);
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

const GOOGLE_CACHE = new Map<string, GeoTeam>();

export const getCityBySearch = async (
  search: string
): Promise<CityResponse> => {
  let geo: GeoTeam | undefined;
  try {
    if (GOOGLE_CACHE.has(search)) {
      geo = GOOGLE_CACHE.get(search);
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
        GOOGLE_CACHE.set(search, geo);
      }
    }
  } catch {
    // no-op
  }

  return geo
    ? {
        name: geo.name,
        sports: {
          baseball: getClosest(geo, baseball),
          basketball: getClosest(geo, basketball),
          football: getClosest(geo, football),
          hockey: getClosest(geo, hockey)
        }
      }
    : DEFAULT_CITY_RES;
};
