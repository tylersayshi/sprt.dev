import axios from 'axios';
import basketball from '../data/basketball.json';
import football from '../data/football.json';
import baseball from '../data/baseball.json';
import hockey from '../data/hockey.json';
import { distance } from './helpers';
import { Request } from 'express';
import { GeoTeam, TeamWithLocation, SportMap } from '../../types/sports';
import { GeoSearchResponse } from '../../types/geoSearch';
import { GoogleResponse } from '../../types/google';

export interface CityTeam {
  /**
   * name of the team in closest city
   */
  name: string;
  /**
   * teams abbreviation (used with espn search)
   */
  abbr: string;
}

interface CityResponse {
  /**
   * name of the city being searched with
   */
  name: string;
  /**
   * map of all sports returned for a given city
   */
  sports: SportMap<CityTeam[]>;
}

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
  return [
    {
      abbr: foundTeam.abbr,
      name: foundTeam.name
    }
  ];
};

const GOOGLE_CACHE = new Map<string, GeoTeam>();

export const getCity = async (req: Request): Promise<CityResponse> => {
  let geo: GeoTeam;
  try {
    if (req.baseUrl === '') {
      // remove ipv4 prefix
      let ip = req.headers['x-forwarded-for'] || req.ip.replace('::ffff:', '');

      console.log('before split', { ip });
      ip = Array.isArray(ip) ? ip[0] : ip.split(', ')[0];
      console.log('after split', { ip });

      if (ip === '127.0.0.1' || ip === '::1') {
        // lookup local public ip in development since express says localhost
        const { data } = await axios.get<string>(
          'http://bot.whatismyipaddress.com'
        );
        ip = data;
      }
      const geoResponse = await axios
        .get<GeoSearchResponse>(
          'https://tools.keycdn.com/geo.json?host=' + ip,
          {
            headers: { 'user-agent': 'keycdn-tools:https://sprt.dev' }
          }
        )
        .catch(err => console.log('Error getting geolocation from ip', err));

      if (geoResponse) {
        const apiGeo = geoResponse.data.data.geo;
        if (apiGeo.city) {
          geo = {
            name: [apiGeo.city, apiGeo.region_name, apiGeo.country_name].join(
              ', '
            ),
            city: apiGeo.city,
            lat: apiGeo.latitude,
            lon: apiGeo.longitude
          };
        }
      } else {
        throw Error;
      }
    } else {
      const search = req.baseUrl.substring(1);
      if (GOOGLE_CACHE.has(search)) {
        geo = GOOGLE_CACHE.get(search);
      } else {
        const googRes = await axios.get<GoogleResponse>(
          `https://maps.googleapis.com/maps/api/geocode/json?address=${search}&components=short_name:CA|short_name:US&region=us&key=${process.env.GOOGLE_API_KEY}`
        );
        const googSearchResults = googRes.data.results;
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
    }
  } catch {
    // no-op
  }

  return {
    name: geo ? geo.name : 'Unable to detect location - Falling back to Boston',
    sports: {
      baseball: geo
        ? getClosest(geo, baseball)
        : getByAbbreviation('bos', baseball),
      basketball: geo
        ? getClosest(geo, basketball)
        : getByAbbreviation('bos', basketball),
      football: geo
        ? getClosest(geo, football)
        : getByAbbreviation('ne', football),
      hockey: geo ? getClosest(geo, hockey) : getByAbbreviation('bos', hockey)
    }
  };
};
