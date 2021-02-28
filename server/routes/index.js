import express from 'express';
import { table } from 'table';
import { mockBBall } from '../mock';
import Convert from 'ansi-to-html';
// import axios from 'axios';

/**
 * data for a team
 * @typedef {Object} Team
 * @param {string} abbr - abbreviation for the team
 * @param {number} score - points for team
 */

/**
 * game object storing data for one scheduled game
 * @typedef {Object} Game
 * @param {Team} home - home team
 * @param {Team} away - away team
 * @param {string} datetime - date and time of game
 */

/**
 * Sport with games
 * @typedef {Object} Sport
 * @property {string} name - name of the sport
 * @property {Game[]} hasPower - Indicates whether the Power component is present.
 */

// helper to get the bball data from the api
// const getBBall = (teamId) => {
//   return axios.request({
//     method: 'GET',
//     url: 'https://www.balldontlie.io/api/v1/games',
//     params: {
//       'team_ids[]': teamId,
//       start_date: new Date().toISOString()
//     }
//   });
// };

/**
 * helper to remove leading zero from string
 * e.g. 02 -> 2
 * @param {string} str
 */
const removeLeadingZero = (str) => (str[0] === '0' ? str[1] : str);

/**
 * helper to normalize data from balldontlie api
 * @param {Object} game - game from balldontlie to standardize
 * @returns {Game}
 */
const translateBallDontLie = (game) => {
  // parsed iso string
  const [date] = game.date.split('T');
  const [year, month, day] = date.split('-').map(removeLeadingZero);
  const gameDateString = `${month}/${day}/${year} ${game.status}`;
  return {
    datetime: gameDateString,
    home: {
      abbr: game.home_team.abbreviation,
      score: game.home_team_score
    },
    away: {
      abbr: game.visitor_team.abbreviation,
      score: game.visitor_team_score
    }
  };
};

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
  return [`${game.home.abbr} vs ${game.away.abbr}`, game.datetime].join('\n');
};

var router = express.Router();
router.get('/', async function (req, res) {
  // Testing for presence of curl in user agent
  // goal of this is to test if the request is coming from a terminal vs a browser
  // Want to return ascii text for curl requests and html for the browser
  // TODO make team dynamic, 2 is for the celtics
  // const teamId = 2;

  let nextThreeBBall;
  // for real api call
  // const bballResponse = await getBBall(teamId);
  // const bballData = bballResponse.data;

  // nextThreeBBall = bballData.data.slice(0, 3);

  // load three from mock
  nextThreeBBall = mockBBall.data.slice(0, 3).map(translateBallDontLie);

  const dataForTable = [
    {
      name: 'basketball',
      games: nextThreeBBall
    }
  ];

  const gamesTable = table(
    dataForTable.map((sport) => [
      `${emojiMap[sport.name]} ${sport.name}`,
      ...sport.games.map(formatGame)
    ])
  );

  if (req.headers['user-agent'].includes('curl')) {
    res.send(gamesTable);
  } else {
    const convert = new Convert();
    const htmlTable = convert.toHtml(gamesTable);
    res.render('index', { table: htmlTable });
  }
});

export default router;
