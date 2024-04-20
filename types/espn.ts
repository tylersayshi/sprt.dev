export interface Season {
  year: number;
  type: number;
  name: string;
  displayName: string;
  half: number;
}

export interface Parent {
  id: string;
}

export interface Groups {
  id: string;
  parent: Parent;
  isConference: boolean;
}

export interface Team {
  id: string;
  abbreviation: string;
  location: string;
  name: string;
  displayName: string;
  clubhouse: string;
  color: string;
  logo: string;
  recordSummary: string;
  seasonSummary: string;
  standingSummary: string;
  groups: Groups;
}

export interface Season2 {
  year: number;
  displayName: string;
}

export interface SeasonType {
  id: string;
  type: number;
  name: string;
  abbreviation: string;
}

export interface Type {
  id: string;
  text: string;
  abbreviation: string;
}

export interface Address {
  city: string;
  state: string;
}

export interface Venue {
  fullName: string;
  address: Address;
}

export interface Logo {
  href: string;
  width: number;
  height: number;
  alt: string;
  rel: string[];
}

export interface Link {
  rel: string[];
  href: string;
  text: string;
}

export interface Team2 {
  id: string;
  location: string;
  abbreviation: string;
  displayName: string;
  shortDisplayName: string;
  logos: Logo[];
  links: Link[];
}

export interface Score {
  value: number;
  displayValue: string;
}

export interface Link2 {
  rel: string[];
  href: string;
}

export interface Athlete {
  id: string;
  lastName: string;
  displayName: string;
  shortName: string;
  links: Link2[];
}

export interface Leader2 {
  displayValue: string;
  value: number;
  athlete: Athlete;
}

export interface Leader {
  name: string;
  displayName: string;
  abbreviation: string;
  leaders: Leader2[];
}

export interface Record {
  id: string;
  abbreviation: string;
  displayName: string;
  shortDisplayName: string;
  description: string;
  type: string;
  displayValue: string;
}

export interface Competitor {
  id: string;
  type: string;
  order: number;
  homeAway: string;
  winner: boolean;
  team: Team2;
  score: Score;
  leaders: Leader[];
  record: Record[];
}

export interface Type2 {
  id: string;
  shortName: string;
}

export interface Market {
  id: string;
  type: string;
}

export interface Media {
  shortName: string;
}

export interface Broadcast {
  type: Type2;
  market: Market;
  media: Media;
  lang: string;
  region: string;
}

export interface Type3 {
  id: string;
  name: string;
  state: string;
  completed: boolean;
  description: string;
  detail: string;
  shortDetail: string;
  altDetail: string;
}

export interface Status {
  clock: number;
  displayClock: string;
  period: number;
  type: Type3;
}

export interface Link3 {
  rel: string[];
  href: string;
}

export interface Ticket {
  id: string;
  summary: string;
  description: string;
  maxPrice: number;
  startingPrice: number;
  numberAvailable: number;
  totalPostings: number;
  links: Link3[];
}

export interface Competition {
  id: string;
  date: string;
  attendance: number;
  type: Type;
  timeValid: boolean;
  neutralSite: boolean;
  boxscoreAvailable: boolean;
  ticketsAvailable: boolean;
  venue: Venue;
  competitors: Competitor[];
  notes: unknown[];
  broadcasts: Broadcast[];
  status: Status;
  tickets: Ticket[];
}

export interface Link4 {
  language: string;
  rel: string[];
  href: string;
  text: string;
  shortText: string;
  isExternal: boolean;
  isPremium: boolean;
}

export interface Event {
  id: string;
  date: string;
  name: string;
  shortName: string;
  season: Season2;
  seasonType: SeasonType;
  timeValid: boolean;
  competitions: Competition[];
  links: Link4[];
}

export interface RequestedSeason {
  year: number;
  type: number;
  name: string;
  displayName: string;
}

export interface ScheduleResponse {
  timestamp: Date;
  status: string;
  season: Season;
  team: Team;
  events: Event[];
  requestedSeason: RequestedSeason;
}
