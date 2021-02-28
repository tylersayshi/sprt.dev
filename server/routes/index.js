import express from 'express';
import { table } from 'table';
import AnsiUp from 'ansi_up';
import { getBasketball } from '../sports/basketball';
import { capitalizeFirst } from './helpers';
import { getHockey } from '../sports/hockey';
// import { getFootball } from '../sports/football';
// import { getBaseball } from '../sports/baseball';

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
  let cell = [game.title, game.datetime];
  // if (game.home.score || game.away.score)
  //   cell.push(`${game.home.score}-${game.away.score}`);
  // cell.push(`Network: ${game.network}`);
  return cell.join('\n');
};

var router = express.Router();
router.get('/', async function (req, res) {
  //TODO dynamically get location
  const teamName = 'bos';
  // load three from mock
  // TODO consolidate helpers?
  const basketballGames = await getBasketball(teamName);
  const hockeyGames = await getHockey(teamName);
  // const footballGames = await getFootball(teamName);
  // const baseballGames = await getBaseball(teamName);

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

  const gamesTable = table(
    dataForTable.map((sport) => [
      `${emojiMap[sport.name]} ${capitalizeFirst(sport.name)}`,
      ...sport.games.map(formatGame)
    ]),
    { singleLine: true }
  );

  // Testing for presence of curl in user agent
  // goal of this is to test if the request is coming from a terminal vs a browser
  // Want to return ascii text for curl requests and html for the browser
  if (req.headers['user-agent'].includes('curl')) {
    res.send(gamesTable);
  } else {
    const ansi_up = new AnsiUp();
    const htmlTable = ansi_up.ansi_to_html(gamesTable);
    res.render('index', { table: htmlTable, location: 'Boston' });
  }
});

export default router;
