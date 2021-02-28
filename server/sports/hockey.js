import { getESPN } from './espn';

// helper to get espn url given a team code
const url = (team) => `https://www.espn.com/nhl/team/schedule/_/name/${team}`;

export const getHockey = async (teamName) => {
  return getESPN(url(teamName), teamName);
};
