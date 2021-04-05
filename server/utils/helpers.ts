import fs from 'fs';
import { AnyObject } from '../../types/general';

/**
 * helper to remove leading zero from string
 * e.g. 02 -> 2
 * @param {string} str
 */
export const removeLeadingZero = (str: string) =>
  str[0] === '0' ? str[1] : str;

export const capitalizeFirst = (str: string) => {
  const split = str.split('');
  return split[0].toUpperCase() + split.slice(1).join('');
};

/**
 * helper to stringify in JSON in a pretty way
 * @param {object} data to be prettified
 */
const prettyJSON = (data: AnyObject) => JSON.stringify(data, null, 2) + '\n';

/**
 * helper to save js object to a json file to view the data more easily
 * @param {string} name of file to save the data to
 * @param {object} data of js object to save as json
 */
export const writeToJson = (name: string, data: AnyObject) =>
  fs.writeFile(
    `tmp/${name}.json`,
    prettyJSON(data),
    err => err && console.log(err)
  );

type DistanceUnit = 'K' | 'N';

/**
 * Helper to get distance between two points
 * @see https://www.geodatasource.com/developers/javascript
 */
export const distance = (
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number,
  unit?: DistanceUnit
) => {
  const radlat1 = (Math.PI * lat1) / 180;
  const radlat2 = (Math.PI * lat2) / 180;
  const theta = lon1 - lon2;
  const radtheta = (Math.PI * theta) / 180;
  let dist =
    Math.sin(radlat1) * Math.sin(radlat2) +
    Math.cos(radlat1) * Math.cos(radlat2) * Math.cos(radtheta);
  if (dist > 1) {
    dist = 1;
  }
  dist = Math.acos(dist);
  dist = (dist * 180) / Math.PI;
  dist = dist * 60 * 1.1515;
  if (unit == 'K') {
    dist = dist * 1.609344;
  }
  if (unit == 'N') {
    dist = dist * 0.8684;
  }
  return dist;
};
