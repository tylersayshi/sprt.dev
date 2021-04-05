export const sportNames = [
  'hockey',
  'basketball',
  'baseball',
  'football'
] as const;
export type Sport = typeof sportNames[number];

export type League = 'nba' | 'nhl' | 'nfl' | 'mlb';

export type SportMap<T> = Record<Sport, T>;

export const sportsLeagueMap: SportMap<League> = {
  basketball: 'nba',
  hockey: 'nhl',
  football: 'nfl',
  baseball: 'mlb'
};

export interface SportRow {
  name: Sport;
  games: string[];
  team: string;
}

export interface TeamWithLocation {
  lat: number;
  lon: number;
  name: string;
  abbr: string;
  city: string;
}

export type GeoTeam = Omit<TeamWithLocation, 'abbr'>;
