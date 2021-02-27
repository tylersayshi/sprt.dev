import express from 'express';
import { default as axios } from 'axios';
import { emojify } from 'node-emoji';
import { table } from 'table';

var router = express.Router();

const getBBall = (teamId) => {
  return axios.request({
    method: 'GET',
    url: 'https://www.balldontlie.io/api/v1/games',
    params: {
      'team_ids[]': teamId,
      start_date: new Date().toISOString()
    }
  });
};

const formatGame = (game) => {
  return [
    `${game.home_team.abbreviation} vs ${game.visitor_team.abbreviation}`,
    new Date(game.date).toLocaleDateString() + ' ' + game.status
  ].join('\n');
};

/* GET home page. */
router.get('/', async function (req, res) {
  // Testing for presence of curl in user agent
  // goal of this is to test if the request is coming from a terminal vs a browser
  // Want to return ascii text for curl requests and html for the browser
  if (req.headers['user-agent'].includes('curl')) {
    // TODO make team dynamic, 2 is for the celtics
    const teamId = 2;

    // let nextThreeBBall = await getBBall(teamId);
    let nextThreeBBall;
    // saved response by this last api call
    const mockGames = {
      data: [
        {
          date: '2021-02-28T00:00:00.000Z',
          home_team: {
            abbreviation: 'BOS',
            city: 'Boston',
            conference: 'East',
            division: 'Atlantic',
            full_name: 'Boston Celtics',
            id: 2,
            name: 'Celtics'
          },
          home_team_score: 0,
          id: 128027,
          period: 0,
          postseason: false,
          season: 2020,
          status: '7:00 PM ET',
          time: '',
          visitor_team: {
            abbreviation: 'WAS',
            city: 'Washington',
            conference: 'East',
            division: 'Southeast',
            full_name: 'Washington Wizards',
            id: 30,
            name: 'Wizards'
          },
          visitor_team_score: 0
        },
        {
          date: '2021-03-02T00:00:00.000Z',
          home_team: {
            abbreviation: 'BOS',
            city: 'Boston',
            conference: 'East',
            division: 'Atlantic',
            full_name: 'Boston Celtics',
            id: 2,
            name: 'Celtics'
          },
          home_team_score: 0,
          id: 128041,
          period: 0,
          postseason: false,
          season: 2020,
          status: '7:30 PM ET',
          time: '',
          visitor_team: {
            abbreviation: 'LAC',
            city: 'LA',
            conference: 'West',
            division: 'Pacific',
            full_name: 'LA Clippers',
            id: 13,
            name: 'Clippers'
          },
          visitor_team_score: 0
        },
        {
          date: '2021-03-04T00:00:00.000Z',
          home_team: {
            abbreviation: 'BOS',
            city: 'Boston',
            conference: 'East',
            division: 'Atlantic',
            full_name: 'Boston Celtics',
            id: 2,
            name: 'Celtics'
          },
          home_team_score: 0,
          id: 128059,
          period: 0,
          postseason: false,
          season: 2020,
          status: '7:00 PM ET',
          time: '',
          visitor_team: {
            abbreviation: 'TOR',
            city: 'Toronto',
            conference: 'East',
            division: 'Atlantic',
            full_name: 'Toronto Raptors',
            id: 28,
            name: 'Raptors'
          },
          visitor_team_score: 0
        }
      ],
      meta: {
        current_page: 1,
        next_page: null,
        per_page: 25,
        total_count: 3,
        total_pages: 1
      }
    };

    // nextThreeBBall = nextThreeBBall.data.data.slice(0, 3);
    nextThreeBBall = mockGames.data.slice(0, 3);

    const gamesTable = table([
      [emojify(`:basketball: Basketball`), ...nextThreeBBall.map(formatGame)]
    ]);

    res.send(gamesTable);
  } else {
    res.render('index', { title: 'the end' });
  }
});

export default router;
