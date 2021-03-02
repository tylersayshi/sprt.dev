import axios from 'axios';
import { JSDOM } from 'jsdom';

const sportMap = {
  basketball: 'nba',
  hockey: 'nhl',
  football: 'nfl',
  baseball: 'mlb'
};

// helper to get espn url given a team code
const scheduleURL = (league, team) =>
  `https://www.espn.com/${league}/team/schedule/_/name/${team}`;

export const getESPN = async (sport, teamName) => {
  const espnResp = await axios.get(scheduleURL(sportMap[sport], teamName));

  const dom = new JSDOM(espnResp.data);

  dom.window.addEventListener('loadeddata', () => {
    const score = dom.window.document.body.querySelector('.ScoreCell__Link');
    console.log(score.innerHTML);
  });

  const table = dom.window.document.body.querySelector('table');
  const tableRows = table.querySelectorAll('tr');
  const currDateBar = table.querySelector(
    'tr[data-idx]:not([data-idx="0"]) .small-col'
  );
  const startIndex = parseInt(currDateBar.parentElement.dataset.idx);

  const gameRows = [...tableRows].slice(startIndex + 1, startIndex + 4);

  const parsedRows = gameRows.map((row) => {
    const opponentCell = row.querySelector('.opponent-logo');
    const opponentParsedLink = opponentCell.querySelector('a').href.split('/');
    const opponentCode = opponentParsedLink[
      opponentParsedLink.length - 2
    ].toUpperCase();
    const [vsOrAt] = opponentCell.textContent.trim().split(' ');
    const title = `${teamName.toUpperCase()} ${vsOrAt} ${opponentCode}`;

    const date = row.childNodes[0].textContent.trim();
    const time = row.childNodes[2].textContent.trim();

    let datetime, network;
    // handle live differently
    const networkCell = row.childNodes[3];
    if (networkCell.textContent !== '') {
      network = networkCell.textContent;
    } else {
      const networkLogo = networkCell.querySelector('.network-container_link');
      if (networkLogo) {
        // refer to local network when on ESPN+
        if (networkLogo.href.includes('plus')) {
          network = 'Local Network';
        } else {
          network = 'ESPN/ABC';
        }
      } else {
        network = 'Local Network';
      }
    }

    if (time.toLowerCase() === 'live') {
      network = `Live on ${network}`;
    } else {
      datetime = `${date} @ ${time}`;
    }

    return {
      datetime,
      title,
      network
    };
  });
  return parsedRows;
};
