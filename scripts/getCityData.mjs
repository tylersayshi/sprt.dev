import axios from 'axios';
import fs from 'fs';

// This code is not run in the app. It exists to get data from espn for a leagues teams
// to save as json in the server/data folder

const prettyJSON = data => JSON.stringify(data, null, 2) + '\n';

export const writeToJson = (name, data) =>
  fs.writeFile(
    `./server/data/${name}.json`,
    prettyJSON(data),
    err => err && console.log(err)
  );

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

const sportMap = {
  basketball: 'nba',
  hockey: 'nhl',
  football: 'nfl',
  baseball: 'mlb'
};

const getSport = async sport => {
  const teamsResp = await axios.get(
    `http://site.api.espn.com/apis/site/v2/sports/${sport}/${sportMap[sport]}/teams?limit=500`
  );
  const teams = teamsResp.data.sports[0].leagues[0].teams;
  const newTeams = teams.map(team => {
    const actualTeam = team.team;
    return {
      name: actualTeam.displayName,
      abbr: actualTeam.abbreviation.toLowerCase(),
      city: actualTeam.location
    };
  });

  let teamsWithLocs = [];
  let i = 0;
  while (teamsWithLocs.length < newTeams.length) {
    try {
      const geoResp = await axios.get(
        `https://geocode.xyz/${newTeams[i].city}?json=1`
      );
      const lat = parseFloat(geoResp.data.latt);
      const lon = parseFloat(geoResp.data.longt);

      teamsWithLocs.push({
        lat,
        lon,
        ...newTeams[i]
      });
      await sleep(2000);
      console.log(`Got team: ${i} - ${newTeams[i].name}`);
      i++;
    } catch {
      await sleep(2000);
    }
  }
  writeToJson(sport, teamsWithLocs);
};

// fetch data for all sports
(async () => {
  await getSport('basketball');
  await getSport('baseball');
  await getSport('hockey');
  await getSport('football');
})();
