// import axios from 'axios';
import { mockBBall } from '../mock';
import { removeLeadingZero } from './tools';

/**
 * helper to normalize data from balldontlie api
 * @param {Object} game - game from balldontlie to standardize
 * @returns {Game}
 */
const translate = (game) => {
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

export const getBasketball = () => {
  // TODO make team dynamic, 2 is for the celtics
  // const teamId = 2;

  //   return axios.request({
  //     method: 'GET',
  //     url: 'https://www.balldontlie.io/api/v1/games',
  //     params: {
  //       'team_ids[]': teamId,
  //       start_date: new Date().toISOString()
  //     }
  //   });
  return mockBBall.data.slice(0, 3).map(translate);
};
