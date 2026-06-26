import { Match, IMatch } from './match.model';
import {
  fetchFixturesByDate,
  fetchLiveFixtures,
  fetchFixtureDetail,
  fetchLeagueFixtures,
} from './apiFootball.service';
import { AppError } from '../errors';
import { ALLOWED_LEAGUE_IDS, isAllowedLeagueId, ALLOWED_LEAGUES } from '../utils/leagueWhitelist';
import { getCurrentSeason } from '../utils/season';

export function todayStr(): string {
  return new Date().toISOString().split('T')[0];
}

function getDayRange(dateStr: string): { start: Date; end: Date } {
  const [y, m, d] = dateStr.split('-').map(Number);
  return {
    start: new Date(y, m - 1, d, 0, 0, 0),
    end:   new Date(y, m - 1, d, 23, 59, 59, 999),
  };
}

function validateDate(dateStr: string): void {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateStr))
    throw AppError.badRequest('Formato de fecha inválido. Usar YYYY-MM-DD');

  const date = new Date(dateStr);
  if (isNaN(date.getTime()))
    throw AppError.badRequest('Fecha inválida');

  // Límite: no más de 2 meses atrás
  const twoMonthsAgo = new Date();
  twoMonthsAgo.setMonth(twoMonthsAgo.getMonth() - 2);
  if (date < twoMonthsAgo)
    throw AppError.badRequest('Solo se pueden consultar partidos de los últimos 2 meses');

  // Límite: no más de 7 días en el futuro
  const oneWeekAhead = new Date();
  oneWeekAhead.setDate(oneWeekAhead.getDate() + 7);
  if (date > oneWeekAhead)
    throw AppError.badRequest('Solo se pueden consultar partidos hasta 7 días en el futuro');
}

async function upsertFixtures(fixtures: Partial<IMatch>[]): Promise<void> {
  if (!fixtures.length) return;
  const ops = fixtures.map((f) => ({
    updateOne: {
      filter: { externalId: f.externalId },
      update: { $set: f },
      upsert: true,
    },
  }));
  await Match.bulkWrite(ops, { ordered: false });
}

export const matchService = {

  // SCRUM-5: partidos de hoy
  async getToday(filters?: { status?: string; country?: string; competition?: string }) {
    const date = todayStr();
    const fixtures = await fetchFixturesByDate(date);
    await upsertFixtures(fixtures);

    const { start, end } = getDayRange(date);
    // competitionId siempre filtrado por whitelist, incluso si quedaron
    // partidos viejos (amistosos, copas no clave) cargados en Mongo de antes.
    const query: any = { date: { $gte: start, $lte: end }, competitionId: { $in: ALLOWED_LEAGUE_IDS } };
    if (filters?.status)      query.status      = filters.status;
    if (filters?.country)     query.country     = new RegExp(filters.country, 'i');
    if (filters?.competition) query.competition = new RegExp(filters.competition, 'i');

    return Match.find(query).select('-__v').sort({ date: 1 }).lean<IMatch[]>();
  },
  async getByDate(dateStr: string, filters?: { status?: string; country?: string; competition?: string }) {
    validateDate(dateStr);
    const fixtures = await fetchFixturesByDate(dateStr);
    await upsertFixtures(fixtures);

    const { start, end } = getDayRange(dateStr);
    const query: any = { date: { $gte: start, $lte: end }, competitionId: { $in: ALLOWED_LEAGUE_IDS } };
    if (filters?.status)      query.status      = filters.status;
    if (filters?.country)     query.country     = new RegExp(filters.country, 'i');
    if (filters?.competition) query.competition = new RegExp(filters.competition, 'i');

    return Match.find(query).select('-__v').sort({ date: 1 }).lean<IMatch[]>();
  },

  // SCRUM-16: partidos EN VIVO ahora mismo
  async getLive(filters?: { country?: string; competition?: string }) {
    const fixtures = await fetchLiveFixtures();
    await upsertFixtures(fixtures);

    const query: any = { status: 'live', competitionId: { $in: ALLOWED_LEAGUE_IDS } };
    if (filters?.country)     query.country     = new RegExp(filters.country, 'i');
    if (filters?.competition) query.competition = new RegExp(filters.competition, 'i');

    return Match.find(query).select('-__v').sort({ date: 1 }).lean<IMatch[]>();
  },
  async getDetail(id: string) {
    const match = await Match.findById(id).select('-__v').lean<IMatch>();
    if (!match) throw AppError.notFound('Partido no encontrado');
    const isRecent = (Date.now() - new Date(match.date).getTime()) < 3 * 60 * 60 * 1000;
    if (match.status === 'live' || (match.status === 'finished' && isRecent)) {
      const fresh = await fetchFixtureDetail(match.externalId);
      if (fresh) {
        await Match.updateOne({ _id: id }, { $set: fresh });
        return { ...match, ...fresh };
      }
    }

    return match;
  },

  // SCRUM-6: filtrar partidos por estado
  async getByStatus(status: string, date?: string) {
    const validStatuses = ['scheduled', 'live', 'finished', 'postponed', 'cancelled'];
    if (!validStatuses.includes(status))
      throw AppError.badRequest(`Estado inválido. Opciones: ${validStatuses.join(', ')}`);

    const query: any = { status, competitionId: { $in: ALLOWED_LEAGUE_IDS } };
    if (date) {
      validateDate(date);
      const { start, end } = getDayRange(date);
      query.date = { $gte: start, $lte: end };
    }

    return Match.find(query).select('-__v').sort({ date: -1 }).lean<IMatch[]>();
  },

  // SCRUM-8: partidos por competición
  // Antes esto SOLO leía lo que ya estuviera en Mongo (por eso quedaba
  // "pegado" en datos viejos). Ahora trae el fixture fresco desde la API
  // con la temporada vigente, lo guarda, y recién ahí responde.
  async getByCompetition(competitionId: number, date?: string, season?: number) {
    if (!isAllowedLeagueId(competitionId)) {
      const nombres = ALLOWED_LEAGUES.map((l) => `${l.name} (id ${l.id})`).join(', ');
      throw AppError.badRequest(`Competición no habilitada. Competiciones permitidas: ${nombres}.`);
    }

    const finalSeason = season ?? getCurrentSeason(competitionId);
    const fixtures = await fetchLeagueFixtures(competitionId, finalSeason);
    await upsertFixtures(fixtures);

    const query: any = { competitionId };
    if (date) {
      validateDate(date);
      const { start, end } = getDayRange(date);
      query.date = { $gte: start, $lte: end };
    }
    return Match.find(query).select('-__v').sort({ date: -1 }).lean<IMatch[]>();
  },

  // Actualizar estado/resultado manualmente (SCRUM-16)
  async update(id: string, data: Partial<Pick<IMatch, 'homeScore' | 'awayScore' | 'status' | 'statusShort' | 'elapsed'>>) {
    const match = await Match.findByIdAndUpdate(id, { $set: data }, {
      new: true, runValidators: true,
    }).select('-__v').lean<IMatch>();
    if (!match) throw AppError.notFound('Partido no encontrado');
    return match;
  },

  async remove(id: string) {
    const match = await Match.findByIdAndDelete(id).lean();
    if (!match) throw AppError.notFound('Partido no encontrado');
  },

  async getAll() {
    return Match.find({ competitionId: { $in: ALLOWED_LEAGUE_IDS } }).select('-__v').sort({ date: -1 }).lean<IMatch[]>();
  },
};
