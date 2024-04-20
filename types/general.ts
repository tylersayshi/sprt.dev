import type { SportMap } from './sports';

export type AnyObject = Record<string, unknown>;

export interface CityTeam {
  /**
   * name of the team in closest city
   */
  name: string;
  /**
   * teams abbreviation (used with espn search)
   */
  abbr: string;
}

export interface CityResponse {
  /**
   * name of the city being searched with
   */
  name: string;
  /**
   * map of all sports returned for a given city
   */
  sports: SportMap<CityTeam[]>;
}
