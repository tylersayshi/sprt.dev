import express from 'express';
import { emojify } from 'node-emoji';
import { table } from 'table';
import { mockBBall } from '../mock';
// import { default as axios } from 'axios';

var router = express.Router();

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

const removeLeadingZero = (str) => (str[0] === '0' ? str[1] : str);

const formatGame = (game) => {
  // parsed iso string
  const [date] = game.date.split('T');
  const [year, month, day] = date.split('-').map(removeLeadingZero);
  const gameDateString = `${month}/${day}/${year} ${game.status}`;

  return [
    `${game.home_team.abbreviation} vs ${game.visitor_team.abbreviation}`,
    gameDateString
  ].join('\n');
};

router.get('/', async function (req, res) {
  // Testing for presence of curl in user agent
  // goal of this is to test if the request is coming from a terminal vs a browser
  // Want to return ascii text for curl requests and html for the browser
  if (req.headers['user-agent'].includes('curl')) {
    // TODO make team dynamic, 2 is for the celtics
    // const teamId = 2;

    let nextThreeBBall;
    // for real api call
    // const bballResponse = await getBBall(teamId);
    // const bballData = bballResponse.data;

    // nextThreeBBall = bballData.data.slice(0, 3);

    // load three from mock
    nextThreeBBall = mockBBall.data.slice(0, 3);

    const gamesTable = table([
      [emojify(':basketball: Basketball'), ...nextThreeBBall.map(formatGame)]
    ]);

    res.send(gamesTable);
  } else {
    res.render('index', { title: 'the end' });
  }
});

export default router;
