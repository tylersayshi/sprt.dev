import { getESPN } from './espn';

// helper to get espn url given a team code
const url = (team) => `https://www.espn.com/nfl/team/schedule/_/name/${team}`;

export const getFootball = async (teamName) => {
  return getESPN(url(teamName), teamName);
};
