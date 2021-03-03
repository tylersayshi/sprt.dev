import axios from 'axios';

export const getCity = async req => {
  // remove ipv4 prefix
  let ip = req.ip.replace('::ffff:', '');
  if (ip.includes('127.0.0.1')) {
    // lookup local public ip in development since express says localhost
    const { data } = await axios.get('http://bot.whatismyipaddress.com');
    ip = data;
  }
  console.log('IP ADDRESS:', ip);
  const geoResponse = await axios
    .get('https://tools.keycdn.com/geo.json?host=' + ip, {
      headers: { 'user-agent': 'keycdn-tools:https://www.sprt.dev' }
    })
    .catch(err => console.log('Error getting geolocation from ip', err));

  const geo = geoResponse.data.data.geo;
  console.log('GEO result', geo);
  // TODO dynamic access to city
  // get closest city based on location for each sport
  // keep city in a standard way that will work with espn and hopefully anything else
  // probably keep long name of city, and sport name abbreviation

  return {
    name:
      [geo.city, geo.region_name, geo.country_name].join(', ') +
      '(Schedule hardcoded to Boston for now)',
    sports: {
      baseball: 'bos',
      basketball: 'bos',
      football: 'ne',
      hockey: 'bos'
    }
  };
};
