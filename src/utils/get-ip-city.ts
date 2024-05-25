import type { GeoSearchResponse, Geo } from '../../types/geoSearch';
import { fetchData } from './fetch-data';

export const getIpCity = async (
  ip: string | null | undefined
): Promise<Geo | undefined> => {
  let ipAddress = ip;
  if (ipAddress === '127.0.0.1' || ipAddress === '::1' || ipAddress == null) {
    // lookup local public ip in development since express says localhost
    const data = await fetchData<{ ip: string }>(
      'https://api64.ipify.org?format=json'
    );
    ipAddress = data.ip;
  }

  const geoResponse = await fetchData<GeoSearchResponse>(
    'https://tools.keycdn.com/geo.json?host=' + ipAddress,
    {
      headers: { 'user-agent': 'keycdn-tools:https://sprt.dev' }
    }
  );

  if (geoResponse.status === 'error' || !geoResponse.data) {
    return undefined;
  }

  console.log('ip:', ipAddress, 'city:', geoResponse.data.geo.city);

  return geoResponse.data.geo;
};
