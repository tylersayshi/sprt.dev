import axios from 'axios';
import basketball from '../data/basketball.json';
import football from '../data/football.json';
import baseball from '../data/baseball.json';
import hockey from '../data/hockey.json';
import { distance } from './helpers';

const getClosest = (loc, data) => {
  const closestTeam = data.reduce(
    (min, team) => {
      const d = distance(loc.latitude, loc.longitude, team.lat, team.lon);
      if (d < min.d) {
        return {
          abbr: team.abbr,
          d
        };
      } else {
        return min;
      }
    },
    {
      abbr: data[0].abbr,
      d: Infinity
    }
  );
  return closestTeam.abbr;
};

export const getCity = async req => {
  // remove ipv4 prefix
  let ip = req.headers['x-forwarded-for'] || req.ip.replace('::ffff:', '');
  if (ip.includes('127.0.0.1')) {
    // lookup local public ip in development since express says localhost
    const { data } = await axios.get('http://bot.whatismyipaddress.com');
    ip = data;
  }
  const geoResponse = await axios
    .get('https://tools.keycdn.com/geo.json?host=' + ip, {
      headers: { 'user-agent': 'keycdn-tools:https://www.sprt.dev' }
    })
    .catch(err => console.log('Error getting geolocation from ip', err));

  const geo = geoResponse.data.data.geo;

  return {
    name:
      (geo.city
        ? [geo.city, geo.region_name, geo.country_name].join(', ') + ' '
        : '') + '(Schedule hardcoded to Boston for now)',
    sports: {
      baseball: getClosest(geo, baseball),
      basketball: getClosest(geo, basketball),
      football: getClosest(geo, football),
      hockey: getClosest(geo, hockey)
    }
  };
};
