import { getESPN } from './espn';

// helper to get espn url given a team code
const url = (team) => `https://www.espn.com/mlb/team/schedule/_/name/${team}`;

export const getBaseball = async (teamName) => {
  return getESPN(url(teamName), teamName);
};
