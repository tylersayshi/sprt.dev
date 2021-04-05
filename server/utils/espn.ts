import axios from 'axios';
import { Sport, sportsLeagueMap, SportRow } from '../../types/sports';
import { ScheduleResponse } from '../../types/espn';

// helper to get espn url given a team code
const scheduleURL = (sport: Sport, team: string) =>
  `https://site.api.espn.com/apis/site/v2/sports/${sport}/${sportsLeagueMap[sport]}/teams/${team}/schedule`;

export const getESPN = async (
  sport: Sport,
  teamName: string,
  fullName: string
): Promise<SportRow> => {
  try {
    const espnResp = await axios.get<ScheduleResponse>(
      scheduleURL(sport, teamName)
    );

    const events = espnResp.data.events;

    const startIndex = events.findIndex(
      event =>
        !['STATUS_FINAL', 'STATUS_POSTPONED'].includes(
          event.competitions[0].status.type.name
        )
    );

    // when no active games return empty response
    if (startIndex === -1) return;

    const gameRows = [...events].slice(startIndex, startIndex + 3);

    const parsedRows = gameRows.map(game => {
      const title = game.shortName;
      const competition = game.competitions[0];
      const status = competition.status.type.shortDetail;

      const tvGames = competition.broadcasts.filter(
        broad => broad.type.shortName.toLowerCase() === 'tv'
      );
      let broadcast;
      const nationalIndex = tvGames.findIndex(
        tv => tv.market.type.toLowerCase() === 'national'
      );
      if (nationalIndex !== -1) {
        broadcast = tvGames[nationalIndex].media.shortName;
      } else {
        broadcast = 'Local Network';
      }

      return [title, status, broadcast].join('\n');
    });

    // edge of season fill cells with space so that it fits in grid
    while (parsedRows.length < 3) parsedRows.push(' ');

    return {
      name: sport,
      games: parsedRows,
      team: fullName
    };
  } catch (error) {
    console.log(`Error getting data for ${sport}`, error);
    return;
  }
};
