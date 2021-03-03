import fs from 'fs';

/**
 * data for a team
 * @typedef {Object} Team
 * @param {string} abbr - abbreviation for the team
 * @param {number} score - points for team
 */

/**
 * game object storing data for one scheduled game
 * @typedef {Object} Game
 * @param {Team} home - home team
 * @param {Team} away - away team
 * @param {string} datetime - date and time of game
 */

/**
 * Sport with games
 * @typedef {Object} Sport
 * @property {string} name - name of the sport
 * @property {Game[]} hasPower - Indicates whether the Power component is present.
 */

/**
 * helper to remove leading zero from string
 * e.g. 02 -> 2
 * @param {string} str
 */
export const removeLeadingZero = str => (str[0] === '0' ? str[1] : str);

export const capitalizeFirst = str => {
  const split = str.split('');
  return split[0].toUpperCase() + split.slice(1).join('');
};

/**
 * helper to stringify in JSON in a pretty way
 * @param {object} data to be prettified
 */
const prettyJSON = data => JSON.stringify(data, null, 2) + '\n';

/**
 * helper to save js object to a json file to view the data more easily
 * @param {string} name of file to save the data to
 * @param {object} data of js object to save as json
 */
export const writeToJson = (name, data) =>
  fs.writeFile(
    `tmp/${name}.json`,
    prettyJSON(data),
    err => err && console.log(err)
  );
