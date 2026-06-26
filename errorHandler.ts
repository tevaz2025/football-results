import axios from 'axios';
import { config } from '../config';
import { IMatch, IEvent, MatchStatus } from './match.model';
import { AppError } from '../errors';
import { isAllowedLeague, isAllowedLeagueId, ALLOWED_LEAGUES } from '../utils/leagueWhitelist';

interface ApiFixture {
  fixture: {
    id: number;
    date: string;
    referee: string | null;
    status: { short: string; elapsed: number | null; long: string };
    venue: { name: string | null };
  };
  league: {
    id: number;
    name: string;
    logo: string;
    country: string;
    flag: string | null;
    round: string;
  };
  teams: {
    home: { name: string; logo: string };
    away: { name: string; logo: string };
  };
  goals: { home: number | null; away: number | null };
  score: {
    halftime:  { home: number | null; away: number | null };
  };
  events?: ApiEvent[];
}

interface ApiEvent {
  time:   { elapsed: number; extra: number | null };
  team:   { name: string };
  player: { name: string };
  type:   string;
  detail: string;
}

interface ApiStanding {
  rank: number;
  team: { id: number; name: string; logo: string };
  points: number;
  goalsDiff: number;
  all: { played: number; win: number; draw: number; lose: number; goals: { for: number; against: number } };
  form: string;
  description: string | null;
}

interface ApiTeam {
  team: { id: number; name: string; logo: string; country: string; founded: number | null };
  venue: { name: string | null; city: string | null };
}

function mapStatus(short: string): MatchStatus {
  const map: Record<string, MatchStatus> = {
    TBD: 'scheduled', NS: 'scheduled',
    '1H': 'live', HT: 'live', '2H': 'live', ET: 'live', BT: 'live', P: 'live', LIVE: 'live',
    FT: 'finished', AET: 'finished', PEN: 'finished', AWD: 'finished', WO: 'finished',
    PST: 'postponed',
    CANC: 'cancelled', ABD: 'cancelled', INT: 'cancelled',
  };
  return map[short] ?? 'scheduled';
}

function normalizeFixture(f: ApiFixture): Partial<IMatch> {
  const events: IEvent[] = (f.events ?? []).map((e) => ({
    time:   e.time.elapsed + (e.time.extra ?? 0),
    team:   e.team.name,
    player: e.player.name,
    type:   e.type,
    detail: e.detail,
  }));

  return {
    externalId:      f.fixture.id,
    homeTeam:        f.teams.home.name,
    awayTeam:        f.teams.away.name,
    homeLogo:        f.teams.home.logo,
    awayLogo:        f.teams.away.logo,
    homeScore:       f.goals.home,
    awayScore:       f.goals.away,
    homeScoreHT:     f.score.halftime.home,
    awayScoreHT:     f.score.halftime.away,
    date:            new Date(f.fixture.date),
    competition:     f.league.name,
    competitionId:   f.league.id,
    competitionLogo: f.league.logo,
    country:         f.league.country,
    countryCode:     f.league.flag ?? '',
    status:          mapStatus(f.fixture.status.short),
    statusShort:     f.fixture.status.short,
    elapsed:         f.fixture.status.elapsed,
    venue:           f.fixture.venue.name ?? '',
    referee:         f.fixture.referee ?? '',
    events,
    round:           f.league.round ?? '',
  };
}

const api = axios.create({
  baseURL: config.apiFootball.url,
  headers: { 'x-apisports-key': config.apiFootball.key },
  timeout: 10000,
});

function handleApiError(err: any): never {
  if (err instanceof AppError) throw err;
  const status = err?.response?.status;
  if (status === 401 || status === 403) throw AppError.internal('API key inválida');
  if (status === 429) throw AppError.internal('Límite de requests de API-Football alcanzado');
  throw AppError.internal(`Error al consultar API-Football: ${err.message}`);
}

// Partidos por fecha (SCRUM-5, 7, históricos)
export async function fetchFixturesByDate(date: string): Promise<Partial<IMatch>[]> {
  try {
    const { data } = await api.get('/fixtures', { params: { date } });
    return (data.response as ApiFixture[])
      .filter((f) => isAllowedLeague(f.league.id, f.league.country))   // ← solo ligas permitidas
      .map(normalizeFixture);
  } catch (err) { handleApiError(err); }
}

// Partidos EN VIVO ahora mismo (SCRUM-16)
export async function fetchLiveFixtures(): Promise<Partial<IMatch>[]> {
  try {
    const { data } = await api.get('/fixtures', { params: { live: 'all' } });
    return (data.response as ApiFixture[])
      .filter((f) => isAllowedLeague(f.league.id, f.league.country))   // ← solo ligas permitidas
      .map(normalizeFixture);
  } catch (err) { handleApiError(err); }
}

// Detalle completo de un fixture con eventos (SCRUM-10, 11)
export async function fetchFixtureDetail(fixtureId: number): Promise<Partial<IMatch> | null> {
  try {
    const { data } = await api.get('/fixtures', {
      params: { id: fixtureId, events: true },
    });
    if (!data.response?.length) return null;
    return normalizeFixture(data.response[0]);
  } catch (err) { handleApiError(err); }
}

function rejectIfNotAllowed(leagueId: number): void {
  if (isAllowedLeagueId(leagueId)) return;
  const nombres = ALLOWED_LEAGUES.map((l) => `${l.name} (id ${l.id})`).join(', ');
  throw AppError.badRequest(`Competición no habilitada. Competiciones permitidas: ${nombres}.`);
}

// Tabla de posiciones por liga y temporada (SCRUM-12)
export async function fetchStandings(leagueId: number, season: number) {
  rejectIfNotAllowed(leagueId);  // ← solo ligas permitidas
  try {
    const { data } = await api.get('/standings', { params: { league: leagueId, season } });
    const standings = data.response?.[0]?.league?.standings?.[0] as ApiStanding[] | undefined;
    return standings ?? [];
  } catch (err) { handleApiError(err); }
}

// Fixture completo de una competición (SCRUM-13)
export async function fetchLeagueFixtures(leagueId: number, season: number): Promise<Partial<IMatch>[]> {
  rejectIfNotAllowed(leagueId);  // ← solo ligas permitidas
  try {
    const { data } = await api.get('/fixtures', { params: { league: leagueId, season } });
    return (data.response as ApiFixture[])
      .filter((f) => isAllowedLeague(f.league.id, f.league.country))  // doble chequeo por ID+país
      .map(normalizeFixture);
  } catch (err) { handleApiError(err); }
}

// Buscar equipos por nombre (SCRUM-14)
export async function searchTeams(name: string) {
  try {
    const { data } = await api.get('/teams', { params: { search: name } });
    return (data.response as ApiTeam[]).map((t) => ({
      id:      t.team.id,
      name:    t.team.name,
      logo:    t.team.logo,
      country: t.team.country,
      founded: t.team.founded,
      venue:   t.venue.name,
      city:    t.venue.city,
    }));
  } catch (err) { handleApiError(err); }
}

// Ligas disponibles, opcionalmente por país (SCRUM-9)
export async function fetchLeagues(country?: string) {
  try {
    const params: Record<string, any> = { type: 'league', current: true };
    if (country) params.country = country;
    const { data } = await api.get('/leagues', { params });
    return data.response
      .filter((r: any) => isAllowedLeague(r.league.id, r.country.name))  // ← solo ligas permitidas
      .map((r: any) => ({
        id:      r.league.id,
        name:    r.league.name,
        logo:    r.league.logo,
        country: r.country.name,
        flag:    r.country.flag,
        season:  r.seasons?.find((s: any) => s.current)?.year ?? null,
      }));
  } catch (err) { handleApiError(err); }
}
