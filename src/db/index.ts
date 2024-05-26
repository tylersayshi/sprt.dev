import { eq, sql } from 'drizzle-orm';
import { teams, type TeamsInsert } from 'schema';
import type { CityResponse, CityTeam } from '../../types/general';
import type { GeoTeam } from '../../types/sports';
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

// const closeEnough = (a: number, b: number) => {
//   const diff = a - b;
//   return diff < 25;
// };

export const getClosest =
  (loc: GeoTeam) =>
  async (sport: NonNullable<TeamsInsert['sport']>): Promise<CityTeam[]> => {
    const close = await db
      .select({
        abbr: teams.abbr,
        name: teams.name,
        d: sql<number>`point(${loc.lon}, ${loc.lat}) <@>  (point(${teams.lon}, ${teams.lat})::point)`.as(
          'd'
        ),
        city: teams.city
      })
      .from(teams)
      .where(eq(teams.sport, sport))
      .orderBy(sql`d ASC`)
      .limit(5);

    if (!close.length) return [];

    let result: typeof close = [close[0]];
    let i = 1;
    while (close[i].d - close[i - 1].d < 25 && i < close.length) {
      result.push(close[i]);
      i++;
    }

    return result;
  };

export const getByAbbreviation = async (
  abbr: string,
  sport: NonNullable<TeamsInsert['sport']>
): Promise<CityTeam[]> => {
  const foundTeam = await db.query.teams.findFirst({
    where: (teams, { eq }) => eq(teams.abbr, abbr) && eq(teams.sport, sport)
  });
  if (!foundTeam) return [];
  return [
    {
      abbr: foundTeam.abbr,
      name: foundTeam.name
    }
  ];
};

export const DEFAULT_CITY_RES: Promise<CityResponse> = (async () => ({
  name: 'Unable to detect location - Falling back to Boston',
  sports: {
    baseball: await getByAbbreviation('bos', 'baseball'),
    basketball: await getByAbbreviation('bos', 'basketball'),
    football: await getByAbbreviation('ne', 'football'),
    hockey: await getByAbbreviation('bos', 'hockey')
  },
  timezone: 'America/New_York'
}))();
