import axios from 'axios';
import basketball from '../data/basketball.json';
import football from '../data/football.json';
import baseball from '../data/baseball.json';
import hockey from '../data/hockey.json';
import { distance } from './helpers';

const getClosest = (loc, data) => {
  return data.reduce(
    (min, team) => {
      const d = distance(loc.lat, loc.lon, team.lat, team.lon);
      if (d < min.d) {
        return {
          abbr: team.abbr,
          name: team.name,
          d
        };
      } else {
        return min;
      }
    },
    {
      abbr: data[0].abbr,
      name: data[0].name,
      d: Infinity
    }
  );
};

const getByAbbreviation = (abbr, data) => data.find(team => team.abbr === abbr);

export const getCity = async req => {
  let geo;
  try {
    if (req.path === '/') {
      // remove ipv4 prefix
      let ip = req.headers['x-forwarded-for'] || req.ip.replace('::ffff:', '');
      if (ip.includes('127.0.0.1') || ip === '::1') {
        // lookup local public ip in development since express says localhost
        const { data } = await axios.get('http://bot.whatismyipaddress.com');
        ip = data;
      }
      const geoResponse = await axios
        .get('https://tools.keycdn.com/geo.json?host=' + ip, {
          headers: { 'user-agent': 'keycdn-tools:https://www.sprt.dev' }
        })
        .catch(err => console.log('Error getting geolocation from ip', err));

      const apiGeo = geoResponse.data.data.geo;
      if (apiGeo.city) {
        geo = {
          name: [apiGeo.city, apiGeo.region_name, apiGeo.country_name].join(
            ', '
          ),
          city: apiGeo.city,
          lat: apiGeo.latitude,
          lon: apiGeo.longitude
        };
      }
    } else {
      const search = req.path.substr(1);
      const googRes = await axios.get(
        `https://maps.googleapis.com/maps/api/geocode/json?address=${search}&components=short_name:CA|short_name:US&region=us&key=${process.env.GOOGLE_API_KEY}`
      );
      const googSearchResults = googRes.data.results;
      if (googSearchResults.length) {
        const res = googSearchResults[0];
        geo = {
          name: res.formatted_address,
          city: res.address_components.reduce(
            (acc, comp) =>
              comp.types.includes('locality') ? comp.long_name : acc,
            ''
          ),
          lat: res.geometry.location.lat,
          lon: res.geometry.location.lng
        };
      }
    }
  } catch {
    // no-op
  }

  return {
    name: geo ? geo.name : 'Unable to detect location - Falling back to Boston',
    sports: {
      baseball: geo
        ? getClosest(geo, baseball)
        : getByAbbreviation('bos', baseball),
      basketball: geo
        ? getClosest(geo, basketball)
        : getByAbbreviation('bos', basketball),
      football: geo
        ? getClosest(geo, football)
        : getByAbbreviation('ne', football),
      hockey: geo ? getClosest(geo, hockey) : getByAbbreviation('bos', hockey)
    }
  };
};
