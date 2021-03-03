import express from 'express';
import { table } from 'table';
import { capitalizeFirst } from '../utils/helpers';
import { getESPN } from '../utils/espn';
import { getCity } from '../utils/city';

// lookup table to hold emoji for each sport
const emojiMap = {
  hockey: '🏒',
  basketball: '🏀',
  baseball: '⚾',
  football: '🏈'
};

var router = express.Router();
router.get('/', async function (req, res) {
  const city = getCity();
  // load three from mock
  const basketballPromise = getESPN('basketball', city.sports.basketball);
  const hockeyPromise = getESPN('hockey', city.sports.hockey);
  const baseballPromise = getESPN('baseball', city.sports.baseball);
  const footballPromise = getESPN('football', city.sports.football);

  // TODO error check (use allSettled)
  const [
    basketballGames,
    hockeyGames,
    baseballGames,
    footballGames
  ] = await Promise.all([
    basketballPromise,
    hockeyPromise,
    baseballPromise,
    footballPromise
  ]);

  // TODO add empty cells when one sport in season gets close to end
  // TODO check what sports are in season

  const dataForTable = [
    {
      name: 'basketball',
      games: basketballGames
    },
    {
      name: 'hockey',
      games: hockeyGames
    },
    {
      name: 'baseball',
      games: baseballGames
    },
    {
      name: 'football',
      games: footballGames
    }
  ];

  const parsedDataForTable = dataForTable.reduce((acc, sport) => {
    if (sport.games) {
      acc.push([
        `${emojiMap[sport.name]} ${capitalizeFirst(sport.name)}`,
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
    '\nSee @tylerjlawson/sprt.dev on Github for sprt.dev updates\n';

  // Testing for presence of curl in user agent
  // goal of this is to test if the request is coming from a terminal vs a browser
  // Want to return ascii text for curl requests and html for the browser
  if (req.headers['user-agent'].includes('curl')) {
    res.send(response);
  } else {
    res.render('index', { table: response, location: city.name });
  }
});

export default router;
