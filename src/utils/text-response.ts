import { table } from 'table';
import { getESPN } from '../utils/espn';
import { type SportMap, sportNames, type SportRow } from '../../types/sports';
import type { CityResponse } from '../../types/general';

// lookup table to hold emoji for each sport
const emojiMap: SportMap<string> = {
  hockey: '🏒',
  basketball: '🏀',
  baseball: '⚾',
  football: '🏈'
};

export const getTextResponse = async (
  city: CityResponse,
  isCurl: boolean,
  locale: string
) => {
  const responses = await Promise.allSettled(
    sportNames.reduce<Promise<SportRow | undefined>[]>((acc, sport) => {
      const cityTeams = city.sports[sport];
      cityTeams.forEach(team =>
        acc.push(
          getESPN({
            sport,
            teamName: team.abbr,
            fullName: team.name,
            timezone: city.timezone,
            locale
          })
        )
      );
      return acc;
    }, [])
  );

  const dataForTable = responses.reduce<SportRow[]>((acc, res) => {
    if (res.status === 'fulfilled' && res.value) acc.push(res.value);
    return acc;
  }, []);

  const parsedDataForTable = dataForTable.reduce<string[][]>((acc, sport) => {
    if (sport.games) {
      acc.push([
        isCurl ? `${emojiMap[sport.name]} ${sport.team}` : sport.team,
        ...sport.games
      ]);
    }
    return acc;
  }, []);

  const gamesTable = parsedDataForTable.length
    ? table(parsedDataForTable)
    : 'Error: Could not get any sports for schedule table, try again later.';

  const response =
    `Sport schedule: ${city.name}\n\n` +
    gamesTable +
    '\nSee this project @tylerlaws0n/sprt.dev on Github for more information\n';

  const query = new URLSearchParams({
    p: '48924da0-e9a3-4784-9897-3e7f50ab08af',
    i: '1'
  });

  // piratepx.com API to track requests
  fetch(`https://app.piratepx.com/ship?${query.toString()}`);

  // Testing for presence of curl in user agent
  // goal of this is to test if the request is coming from a terminal vs a browser
  // Want to return ascii text for curl requests and html for the browser

  return response;
};
