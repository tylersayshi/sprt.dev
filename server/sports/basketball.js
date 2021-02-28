import axios from 'axios';
import { JSDOM } from 'jsdom';

// helper to get espn url given a team code
const url = (team) => `https://www.espn.com/nba/team/schedule/_/name/${team}`;

const teamName = 'bos';
export const getBasketball = async () => {
  const espnResp = await axios.get(url(teamName));

  const dom = new JSDOM(espnResp.data);

  const currDateBarChildren = dom.window.document.querySelectorAll(
    'tr[data-idx]:not([data-idx="0"]) .small-col'
  );
  const startIndex = parseInt(currDateBarChildren[0].parentElement.dataset.idx);

  let gameRows = [];
  for (let i = startIndex + 1; i < startIndex + 4; i++) {
    const row = dom.window.document.querySelector(`[data-idx="${i}"]`);
    gameRows.push(row);
  }

  const parsedRows = gameRows.map((row) => {
    const opponentCell = row.querySelector('.opponent-logo');
    const opponentParsedLink = opponentCell.querySelector('a').href.split('/');
    const opponentCode = opponentParsedLink[
      opponentParsedLink.length - 2
    ].toUpperCase();
    const [vsOrAt] = opponentCell.textContent.trim().split(' ');
    const title = `${teamName.toUpperCase()} ${vsOrAt} ${opponentCode}`;

    const date = row.childNodes[0].textContent.trim();
    const time = [...row.querySelectorAll('td a')]
      .find((row) => row.textContent.match(/([AaPp][Mm])/))
      .textContent.trim();
    const datetime = `${date} ${time}`;

    return {
      datetime,
      title
    };
  });
  return parsedRows;
};
