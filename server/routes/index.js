import express from 'express';
import { table } from 'table';
import { capitalizeFirst } from './helpers';
import { getESPN } from '../sports/espn';

// lookup table to hold emoji for each sport
const emojiMap = {
  hockey: '🏒',
  basketball: '🏀',
  baseball: '⚾',
  football: '🏈'
};

/**
 * helper function to format a game object for the table cells
 * @param {Game} game - game to format as a string
 */
const formatGame = (game) => {
  let cell = [game.title];
  if (game.datetime) cell.push(game.datetime);
  cell.push(game.network);
  return cell.join('\n');
};

var router = express.Router();
router.get('/', async function (req, res) {
  //TODO dynamically get location
  const teamName = 'bos';
  // load three from mock
  const basketballGames = await getESPN('basketball', teamName);
  const hockeyGames = await getESPN('hockey', teamName);
  // const footballGames = await getFootball(teamName);
  // const baseballGames = await getBaseball(teamName);

  // TODO add empty cells when one sport in season gets close to end

  const dataForTable = [
    {
      name: 'basketball',
      games: basketballGames
    },
    {
      name: 'hockey',
      games: hockeyGames
    }
    // {
    //   name: 'baseball',
    //   games: baseballGames
    // }
    // {
    //   name: 'football',
    //   games: footballGames
    // }
  ];

  const parsedDataForTable = dataForTable.map((sport) => [
    `${emojiMap[sport.name]} ${capitalizeFirst(sport.name)}`,
    ...sport.games.map(formatGame)
  ]);

  const gamesTable = table(parsedDataForTable);

  // Testing for presence of curl in user agent
  // goal of this is to test if the request is coming from a terminal vs a browser
  // Want to return ascii text for curl requests and html for the browser
  if (req.headers['user-agent'].includes('curl')) {
    res.send(gamesTable);
  } else {
    res.render('index', { table: gamesTable });
  }
});

export default router;
