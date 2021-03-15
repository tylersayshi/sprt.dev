import express from 'express';
import { table } from 'table';
import { getESPN } from '../utils/espn';
import { getCity } from '../utils/city';

// lookup table to hold emoji for each sport
const emojiMap = {
  hockey: '🏒',
  basketball: '🏀',
  baseball: '⚾',
  football: '🏈'
};

var router = express.Router();
router.get('/*', async function (req, res) {
  const city = await getCity(req);
  const sportsKeys = Object.keys(city.sports);
  const responses = await Promise.allSettled(
    sportsKeys.reduce((acc, sport) => {
      const cityTeams = city.sports[sport];
      cityTeams.forEach(team => acc.push(getESPN(sport, team.abbr)));
      return acc;
    }, [])
  );

  const dataForTable = responses.reduce((acc, res) => {
    if (res.status === 'fulfilled' && res.value) acc.push(res.value);
    return acc;
  }, []);

  const parsedDataForTable = dataForTable.reduce((acc, sport) => {
    if (sport.games) {
      acc.push([`${emojiMap[sport.name]} ${sport.team}`, ...sport.games]);
    }
    return acc;
  }, []);

  const gamesTable = parsedDataForTable.length
    ? table(parsedDataForTable)
    : 'Error: Could not get any sports for schedule table, try again later.';

  const response =
    `Sport schedule: ${city.name}\n\n` +
    gamesTable +
    '\nSee this project @tylerjlawson/sprt.dev on Github for more information\n';

  // Testing for presence of curl in user agent
  // goal of this is to test if the request is coming from a terminal vs a browser
  // Want to return ascii text for curl requests and html for the browser
  if (req.headers['user-agent'].includes('curl')) {
    res.send(response);
  } else {
    // correct spacing so that emojis line up with source code pro font
    const correctionSpace = '\u2004' + '\u2006' + '\u200A';
    const correctedTable = Object.values(emojiMap).reduce(
      (table, emoji) => table.replace(emoji + ' ', emoji + correctionSpace),
      response
    );
    res.render('index', {
      table: correctedTable,
      location: city.name.split(',')[0]
    });
  }
});

export default router;
