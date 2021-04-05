export interface Geo {
  host: string;
  ip: string;
  rdns: string;
  asn: number;
  isp: string;
  country_name: string;
  country_code: string;
  region_name: string;
  region_code: string;
  city: string;
  postal_code: string;
  continent_name: string;
  continent_code: string;
  latitude: number;
  longitude: number;
  metro_code: number;
  timezone: string;
  datetime: string;
}

export interface Data {
  geo: Geo;
}

export interface GeoSearchResponse {
  status: string;
  description: string;
  data: Data;
}
