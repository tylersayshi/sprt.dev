import fs from 'fs';
import type { AnyObject, CityResponse, CityTeam } from '../../types/general';
import type { GeoTeam, TeamWithLocation } from '../../types/sports';
import { baseball } from '../data/baseball';
import { basketball } from '../data/basketball';
import { football } from '../data/football';
import { hockey } from '../data/hockey';

/**
 * helper to remove leading zero from string
 * e.g. 02 -> 2
 * @param {string} str
 */
export const removeLeadingZero = (str: string) =>
  str[0] === '0' ? str[1] : str;

export const capitalizeFirst = (str: string) => {
  const split = str.split('');
  return split[0].toUpperCase() + split.slice(1).join('');
};

/**
 * helper to stringify in JSON in a pretty way
 * @param {object} data to be prettified
 */
const prettyJSON = (data: AnyObject) => JSON.stringify(data, null, 2) + '\n';

/**
 * helper to save js object to a json file to view the data more easily
 * @param {string} name of file to save the data to
 * @param {object} data of js object to save as json
 */
export const writeToJson = (name: string, data: AnyObject) =>
  fs.writeFile(
    `tmp/${name}.json`,
    prettyJSON(data),
    err => err && console.log(err)
  );

type DistanceUnit = 'K' | 'N';

interface Point {
  lat: number;
  lon: number;
}

/**
 * Helper to get distance between two points
 * @see https://www.geodatasource.com/developers/javascript
 */
export const distance = (
  {
    point1: { lat: lat1, lon: lon1 },
    point2: { lat: lat2, lon: lon2 }
  }: {
    point1: Point;
    point2: Point;
  },
  unit?: DistanceUnit
) => {
  const radlat1 = (Math.PI * lat1) / 180;
  const radlat2 = (Math.PI * lat2) / 180;
  const theta = lon1 - lon2;
  const radtheta = (Math.PI * theta) / 180;
  let dist =
    Math.sin(radlat1) * Math.sin(radlat2) +
    Math.cos(radlat1) * Math.cos(radlat2) * Math.cos(radtheta);
  if (dist > 1) {
    dist = 1;
  }
  dist = Math.acos(dist);
  dist = (dist * 180) / Math.PI;
  dist = dist * 60 * 1.1515;
  if (unit == 'K') {
    dist = dist * 1.609344;
  }
  if (unit == 'N') {
    dist = dist * 0.8684;
  }
  return dist;
};

const closeEnough = (a: number, b: number) => {
  const diff = a - b;
  return diff < 25;
};

export const getClosest = (
  loc: GeoTeam,
  data: TeamWithLocation[]
): CityTeam[] => {
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

export const getByAbbreviation = (
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

export const DEFAULT_CITY_RES: CityResponse = {
  name: 'Unable to detect location - Falling back to Boston',
  sports: {
    baseball: getByAbbreviation('bos', baseball),
    basketball: getByAbbreviation('bos', basketball),
    football: getByAbbreviation('ne', football),
    hockey: getByAbbreviation('bos', hockey)
  }
};
