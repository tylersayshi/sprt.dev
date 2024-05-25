import { type Sport, sportsLeagueMap, type SportRow } from '../../types/sports';
import type { ScheduleResponse } from '../../types/espn';
import { fetchData } from './fetch-data';
import { Temporal } from 'temporal-polyfill';

// helper to get espn url given a team code
const scheduleURL = (sport: Sport, team: string) =>
  `https://site.api.espn.com/apis/site/v2/sports/${sport}/${sportsLeagueMap[sport]}/teams/${team}/schedule`;

export const getESPN = async ({
  fullName,
  teamName,
  sport,
  timezone,
  locale
}: {
  sport: Sport;
  teamName: string;
  fullName: string;
  timezone: string;
  /** @example en-US */
  locale: string;
}): Promise<SportRow | undefined> => {
  try {
    const { events } = await fetchData<ScheduleResponse>(
      scheduleURL(sport, teamName)
    );

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
      let status = competition.status.type.shortDetail;

      if (status.includes('AM') || status.includes('PM')) {
        const splitStatus = status.split(' - ');
        const [month, day] = splitStatus[0].split('/');
        const [time, ampm, tz] = splitStatus[1].split(' ');

        const tzOffset = new Temporal.TimeZone(
          tz === 'EDT' ? '-04:00' : '-05:00'
        );
        const [hour, minute] = time.split(':');

        const date = Temporal.ZonedDateTime.from({
          year: new Date().getFullYear(),
          month: +month,
          day: +day,
          hour: ampm === 'PM' ? +hour + 12 : +hour,
          minute: +minute,
          timeZone: tzOffset
        });

        const tzDate = date.withTimeZone(timezone);

        // hh:mm AM/PM (timezone)
        const timeString = tzDate.toLocaleString(locale, {
          hour12: true,
          hour: 'numeric',
          minute: 'numeric',
          timeZoneName: 'short'
        });

        // mm/dd or dd/mm depending on locale
        const dateString = tzDate.toLocaleString(locale, {
          month: 'numeric',
          day: 'numeric'
        });

        status = `${dateString} - ${timeString}`;
      }

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
