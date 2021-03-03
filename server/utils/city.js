export const getCity = () => {
  // TODO dynamic access to city
  // get closest city based on location for each sport
  // keep city in a standard way that will work with espn and hopefully anything else
  // probably keep long name of city, and sport name abbreviation

  return {
    name: 'Boston', // user's current city (i.e. Newton -> show boston sports)
    sports: {
      baseball: 'bos',
      basketball: 'bos',
      football: 'ne',
      hockey: 'bos'
    }
  };
};
