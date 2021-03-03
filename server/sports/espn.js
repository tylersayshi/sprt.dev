import axios from 'axios';

const sportMap = {
  basketball: 'nba',
  hockey: 'nhl',
  football: 'nfl',
  baseball: 'mlb'
};

// helper to get espn url given a team code
const scheduleURL = (sport, team) =>
  `https://site.api.espn.com/apis/site/v2/sports/${sport}/${sportMap[sport]}/teams/${team}/schedule`;

export const getESPN = async (sport, teamName) => {
  try {
    const espnResp = await axios.get(scheduleURL(sport, teamName));

    const events = espnResp.data.events;

    const startIndex = events.findIndex(
      event =>
        !['STATUS_FINAL', 'STATUS_POSTPONED'].includes(
          event.competitions[0].status.type.name
        )
    );

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
    return parsedRows;
  } catch (error) {
    console.log(`Error getting data for ${sport}`, error);
    return;
  }
};
