import axios from 'axios';
import { JSDOM } from 'jsdom';

export const getESPN = async (url, teamName) => {
  const espnResp = await axios.get(url);

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

    // TODO check for live
    const time = [...row.querySelectorAll('td a')]
      .find((row) => row.textContent.match(/([AaPp][Mm])/))
      .textContent.trim();

    // handle live differently
    const datetime = `${date} @ ${time}`;

    return {
      datetime,
      title
    };
  });
  return parsedRows;
};
