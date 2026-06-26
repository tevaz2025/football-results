/**
 * Whitelist EXCLUSIVA de competiciones.
 *
 * Esta es la ÚNICA fuente de verdad sobre qué compite en la API.
 * Cualquier liga, copa, torneo amistoso o competición que NO esté en esta
 * lista queda automáticamente afuera de todos los endpoints (today, live,
 * by date, by competition, standings, fixtures por liga, etc).
 *
 * Pedido del cliente: SOLO estas 7 ligas domésticas + el Mundial 2026.
 * Nada de amistosos, Champions League, Libertadores, Copas locales, etc.
 *
 * Los IDs corresponden a los IDs oficiales de API-Football (v3.football.api-sports.io).
 * Son estables (api-football casi nunca los cambia), pero si alguno no
 * coincidiera con lo que devuelve tu cuenta, podés confirmarlos vos mismo
 * pegándole a GET /leagues?search=<nombre> con tu propia API key y ajustando
 * el "id" acá abajo — es el único lugar del código que hay que tocar.
 */

export type SeasonType = 'euro' | 'calendar';

export interface AllowedLeague {
  id: number;
  country: string;
  name: string;
  /**
   * 'euro'     -> temporada cruza dos años calendario (ago-may/jun)
   * 'calendar' -> la temporada coincide con el año calendario
   */
  seasonType: SeasonType;
}

export const ALLOWED_LEAGUES: AllowedLeague[] = [
  // ── LIGAS DOMÉSTICAS CLAVE ───────────────────────────────────
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

// Mapa ID → datos de la liga, para lookups O(1)
const LEAGUE_MAP = new Map<number, AllowedLeague>(
  ALLOWED_LEAGUES.map((l) => [l.id, l])
);

// Lista plana de IDs permitidos (útil para filtrar queries de Mongo: { $in: ALLOWED_LEAGUE_IDS })
export const ALLOWED_LEAGUE_IDS: number[] = ALLOWED_LEAGUES.map((l) => l.id);

/**
 * Filtra por ID *y* país al mismo tiempo, así una "Premier League" de otro
 * país con el mismo nombre (pero ID distinto) nunca pasa, y viceversa.
 */
export function isAllowedLeague(leagueId: number, country: string): boolean {
  const league = LEAGUE_MAP.get(leagueId);
  if (!league) return false;
  // "World" acepta cualquier país (competiciones internacionales tipo el Mundial)
  if (league.country === 'World') return true;
  return country === league.country;
}

// Igual que isAllowedLeague pero solo por ID (para validar params de ruta tipo /competitions/:id)
export function isAllowedLeagueId(leagueId: number): boolean {
  return LEAGUE_MAP.has(leagueId);
}

export function getLeagueMeta(leagueId: number): AllowedLeague | undefined {
  return LEAGUE_MAP.get(leagueId);
}

export function getSeasonType(leagueId: number): SeasonType {
  return LEAGUE_MAP.get(leagueId)?.seasonType ?? 'calendar';
}
