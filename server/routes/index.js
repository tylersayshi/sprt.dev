import express from 'express';
import { table } from 'table';
import Convert from 'ansi-to-html';
import { getBasketball } from '../sports/basketball';
import { capitalizeFirst } from './helpers';

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
  // load three from mock
  let nextThreeBBall = await getBasketball();

  const dataForTable = [
    {
      name: 'basketball',
      games: nextThreeBBall
    }
  ];

  const gamesTable = table(
    dataForTable.map((sport) => [
      `${emojiMap[sport.name]} ${capitalizeFirst(sport.name)}`,
      ...sport.games.map(formatGame)
    ])
  );

  // Testing for presence of curl in user agent
  // goal of this is to test if the request is coming from a terminal vs a browser
  // Want to return ascii text for curl requests and html for the browser
  if (req.headers['user-agent'].includes('curl')) {
    res.send(gamesTable);
  } else {
    const convert = new Convert();
    const htmlTable = convert.toHtml(gamesTable);
    res.render('index', { table: htmlTable, location: 'Boston' });
  }
});

export default router;
