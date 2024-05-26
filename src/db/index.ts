import { eq, sql } from 'drizzle-orm';
import { teams, type TeamsInsert } from 'schema';
import type { CityResponse, CityTeam } from '../../types/general';
import type { GeoTeam, TeamWithLocation } from '../../types/sports';
import { Client } from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';
import * as schema from 'schema';

const client = new Client({
  connectionString: process.env['DATABASE_URL']
});

await client.connect();
const db = drizzle(client, { schema });

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

export const getClosest =
  (loc: GeoTeam) =>
  async (sport: NonNullable<TeamsInsert['sport']>): Promise<CityTeam[]> => {
    const close = db
      .select({
        abbr: teams.abbr,
        name: teams.name,
        d: sql<number>`point(${loc.lon}, ${loc.lat}) <@>  (point(longitude, latitude)::point)`.as(
          'd'
        ),
        city: teams.city
      })
      .from(teams)
      .where(eq(teams.sport, sport))
      .orderBy(sql`d ASC`)
      .limit(5);

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
  },
  timezone: 'America/New_York'
};
