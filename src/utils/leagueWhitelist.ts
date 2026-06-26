
export type SeasonType = 'euro' | 'calendar';

export interface AllowedLeague {
  id: number;
  country: string;
  name: string;
 
  seasonType: SeasonType;
}

export const ALLOWED_LEAGUES: AllowedLeague[] = [

  { id: 39,  country: 'England',   name: 'Premier League',             seasonType: 'euro'     },
  { id: 140, country: 'Spain',     name: 'La Liga',                    seasonType: 'euro'     },
  { id: 135, country: 'Italy',     name: 'Serie A',                    seasonType: 'euro'     },
  { id: 78,  country: 'Germany',   name: 'Bundesliga',                 seasonType: 'euro'     },
  { id: 61,  country: 'France',    name: 'Ligue 1',                    seasonType: 'euro'     },
  { id: 128, country: 'Argentina', name: 'Liga Profesional Argentina', seasonType: 'calendar' },
  { id: 71,  country: 'Brazil',    name: 'Brasileirão Série A',        seasonType: 'calendar' },

  // ── MUNDIAL ───────────────────────────────────────────────────
  { id: 1,   country: 'World',     name: 'FIFA World Cup',             seasonType: 'calendar' },
];


const LEAGUE_MAP = new Map<number, AllowedLeague>(
  ALLOWED_LEAGUES.map((l) => [l.id, l])
);


export const ALLOWED_LEAGUE_IDS: number[] = ALLOWED_LEAGUES.map((l) => l.id);

export function isAllowedLeague(leagueId: number, country: string): boolean {
  const league = LEAGUE_MAP.get(leagueId);
  if (!league) return false;

  if (league.country === 'World') return true;
  return country === league.country;
}

export function isAllowedLeagueId(leagueId: number): boolean {
  return LEAGUE_MAP.has(leagueId);
}

export function getLeagueMeta(leagueId: number): AllowedLeague | undefined {
  return LEAGUE_MAP.get(leagueId);
}

export function getSeasonType(leagueId: number): SeasonType {
  return LEAGUE_MAP.get(leagueId)?.seasonType ?? 'calendar';
}
