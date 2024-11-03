import { type TeamsInsert } from 'schema';
import type { CityResponse, CityTeam } from '../../types/general';
import type { GeoTeam } from '../../types/sports';
// import { Client } from 'pg';

// Test without redis and without postgres next
// Then test empty bun server

// const client = new Client({
//   connectionString: process.env['DATABASE_URL']
// });

// await client.connect();
// const db = drizzle(client, { schema });

export const getClosest =
  (_loc: GeoTeam) =>
  async (_sport: NonNullable<TeamsInsert['sport']>): Promise<CityTeam[]> => {
    // const close = await db
    //   .select({
    //     abbr: teams.abbr,
    //     name: teams.name,
    //     d: sql<number>`point(${loc.lon}, ${loc.lat}) <@>  (point(${teams.lon}, ${teams.lat})::point)`.as(
    //       'd'
    //     ),
    //     city: teams.city
    //   })
    //   .from(teams)
    //   .where(eq(teams.sport, sport))
    //   .orderBy(sql`d ASC`)
    //   .limit(5);
    const close = [] as any[];

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
  _abbr: string,
  _sport: NonNullable<TeamsInsert['sport']>
): Promise<CityTeam[]> => {
  // const [foundTeam] = await db
  //   .select({ name: teams.name, abbr: teams.abbr })
  //   .from(teams)
  //   .where(and(eq(teams.abbr, abbr), eq(teams.sport, sport)))
  //   .limit(1);
  const foundTeam = undefined;

  if (!foundTeam) return [];
  return [foundTeam];
};

export const DEFAULT_CITY_RES: CityResponse = await (async () => ({
  name: 'Unable to detect location - Falling back to Boston',
  sports: {
    baseball: await getByAbbreviation('bos', 'baseball'),
    basketball: await getByAbbreviation('bos', 'basketball'),
    football: await getByAbbreviation('ne', 'football'),
    hockey: await getByAbbreviation('bos', 'hockey')
  },
  timezone: 'America/New_York'
}))();
