// Note: these deps were removed, so if this needs to get run again it will need to be refactored

import axios from 'axios';
import fs from 'fs';
import { JSDOM } from 'jsdom';

// This code is not run in the app. It exists to get data from espn for a leagues teams
// to save as json in the server/data folder

const prettyJSON = data => JSON.stringify(data, null, 2) + '\n';

const writeToJson = (name, data) =>
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

const wikiLink = 'https://en.wikipedia.org/wiki/';
const wikiMap = {
  basketball: 'List_of_National_Basketball_Association_arenas',
  hockey: 'List_of_National_Hockey_League_arenas',
  football: 'List_of_current_National_Football_League_stadiums',
  baseball: 'List_of_current_Major_League_Baseball_stadiums'
};

const partialHelper = (x, phrase) =>
  x.toLowerCase().includes(phrase.toLowerCase());

const getWikepedia = async sport => {
  const { data } = await axios.get(wikiLink + wikiMap[sport]);
  const dom = new JSDOM(data);
  const table = dom.window.document.querySelector('table.sortable');
  const headers = table.querySelectorAll('th[scope="col"]');
  const headerNames = [...headers].map(h => h.textContent.trim());
  const locIndex = headerNames.findIndex(x => partialHelper(x, 'location'));
  const teamIndex = headerNames.findIndex(x => partialHelper(x, 'team'));
  const rows = [...table.querySelectorAll('tr')];
  let lastTeam;
  return rows.reduce((acc, row) => {
    if (row.children.length !== headerNames.length) {
      // edge case weird row with multiple teams
      if (sport === 'basketball') {
        const location = row.querySelector('a');
        const teamName = location.textContent.trim();
        acc[teamName] = acc[lastTeam];
      }
    } else {
      if (sport === 'football' && row.children[teamIndex].children.length > 1) {
        const teams = [...row.children[teamIndex].children]
          .map(c => c.textContent.trim().replace(/\[.*\]/g, ''))
          .filter(x => x);
        const location = row.children[locIndex].textContent.trim();
        teams.forEach(team => (acc[team] = location));
      } else {
        const teamName = row.children[teamIndex].textContent
          .trim()
          .replace(/\[.*\]/g, '');
        if (partialHelper(teamName, 'team')) return acc;
        lastTeam = teamName;
        acc[teamName] = row.children[locIndex].textContent.trim();
      }
    }
    return acc;
  }, []);
};

const getSport = async (sport, wikiMap) => {
  const teamsResp = await axios.get(
    `http://site.api.espn.com/apis/site/v2/sports/${sport}/${sportMap[sport]}/teams?limit=500`
  );
  const teams = teamsResp.data.sports[0].leagues[0].teams;
  const newTeams = teams.map(team => {
    const actualTeam = team.team;
    const teamName = actualTeam.displayName;
    const name = actualTeam.name;
    const wikiName = Object.keys(wikiMap).find(x => x.includes(name));

    return {
      name: teamName,
      abbr: actualTeam.abbreviation.toLowerCase(),
      city: wikiMap[wikiName]
    };
  });

  let teamsWithLocs = [];
  let i = 0;
  while (teamsWithLocs.length < newTeams.length) {
    const geoResp = await axios.get(
      `https://maps.googleapis.com/maps/api/geocode/json?address=${newTeams[i].city}&components=short_name:CA|short_name:US&region=us&key=TOKEN_HERE`
    );
    const res = geoResp.data.results[0];
    const lat = res.geometry.location.lat;
    const lon = res.geometry.location.lng;

    teamsWithLocs.push({
      lat,
      lon,
      ...newTeams[i]
    });
    console.log(`${sport} - Got team: ${i} - ${newTeams[i].name}`);
    i++;
  }
  writeToJson(sport, teamsWithLocs);
};

const getSportData = async sport => {
  const wiki = await getWikepedia(sport);
  const teamData = await getSport(sport, wiki);
  return teamData;
};

// fetch data for all sports
(async () => {
  const sports = Object.keys(sportMap);
  const promises = sports.map(getSportData);
  await Promise.all(promises);
})();
