import { Match, IMatch } from './match.model';
import {
  fetchFixturesByDate,
  fetchLiveFixtures,
  fetchFixtureDetail,
} from './apiFootball.service';
import { AppError } from '../errors';
import { ALLOWED_LEAGUE_IDS } from '../utils/leagueWhitelist';
import mongoose from 'mongoose';

export function todayStr(): string {
  return new Date().toISOString().split('T')[0];
}

function getDayRange(dateStr: string): { start: Date; end: Date } {
  return {
    start: new Date(`${dateStr}T00:00:00.000Z`),
    end:   new Date(`${dateStr}T23:59:59.999Z`),
  };
}

function validateDate(dateStr: string): void {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateStr))
    throw AppError.badRequest('Formato de fecha inválido. Usar YYYY-MM-DD');

  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const minDate = yesterday.toISOString().split('T')[0];

  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const maxDate = tomorrow.toISOString().split('T')[0];

  if (dateStr < minDate || dateStr > maxDate)
    throw AppError.badRequest('Solo se pueden consultar partidos de ayer, hoy o mañana');
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

  async getToday(filters?: { status?: string; country?: string; competition?: string }) {
    const date = todayStr();
    const fixtures = await fetchFixturesByDate(date);
    await upsertFixtures(fixtures);

    const { start, end } = getDayRange(date);
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

  async getLive(filters?: { country?: string; competition?: string }) {
    const fixtures = await fetchLiveFixtures();
    await upsertFixtures(fixtures);

    const freshExternalIds = fixtures.map((f) => f.externalId).filter(Boolean);
    const staleLive = await Match.find({
      status: 'live',
      externalId: { $nin: freshExternalIds },
    }).lean<IMatch[]>();

    for (const stale of staleLive) {
      const fresh = await fetchFixtureDetail(stale.externalId);
      if (fresh) {
        await Match.updateOne({ _id: stale._id }, { $set: fresh });
      } else {
        await Match.updateOne({ _id: stale._id }, { $set: { status: 'finished' } });
      }
    }

    const query: any = { status: 'live', competitionId: { $in: ALLOWED_LEAGUE_IDS } };
    if (filters?.country)     query.country     = new RegExp(filters.country, 'i');
    if (filters?.competition) query.competition = new RegExp(filters.competition, 'i');

    return Match.find(query).select('-__v').sort({ date: 1 }).lean<IMatch[]>();
  },

  async getDetail(id: string) {
    if (!mongoose.Types.ObjectId.isValid(id))
      throw AppError.badRequest('ID de partido inválido');

    const match = await Match.findById(id).select('-__v').lean<IMatch>();
    if (!match) throw AppError.notFound('Partido no encontrado');

    const isRecent = (Date.now() - new Date(match.date).getTime()) < 3 * 60 * 60 * 1000;
    const missingEvents = !match.events || match.events.length === 0;
    if (match.status === 'live' || (match.status === 'finished' && (isRecent || missingEvents))) {
      const fresh = await fetchFixtureDetail(match.externalId);
      if (fresh) {
        await Match.updateOne({ _id: id }, { $set: fresh });
        const updated = await Match.findById(id).select('-__v').lean<IMatch>();
        return updated ?? match;
      }
    }
    return match;
  },

  async getByStatus(status: string, date?: string) {
    const validStatuses = ['scheduled', 'live', 'finished', 'postponed', 'cancelled'];
    if (!validStatuses.includes(status))
      throw AppError.badRequest(`Estado inválido. Opciones: ${validStatuses.join(', ')}`);

    const targetDate = date ?? todayStr();
    if (date) validateDate(date);

    const fixtures = await fetchFixturesByDate(targetDate);
    await upsertFixtures(fixtures);

    const { start, end } = getDayRange(targetDate);
    const query: any = {
      status,
      date: { $gte: start, $lte: end },
      competitionId: { $in: ALLOWED_LEAGUE_IDS },
    };

    const matches = await Match.find(query).select('-__v').sort({ date: -1 }).lean<IMatch[]>();

    if (status === 'finished') {
      for (const m of matches) {
        if (!m.events || m.events.length === 0) {
          const fresh = await fetchFixtureDetail(m.externalId);
          if (fresh) {
            await Match.updateOne({ _id: m._id }, { $set: fresh });
            Object.assign(m, fresh);
          }
        }
      }
    }

    return matches;
  },

  async getByCompetition(competitionId: number, date?: string) {
    const targetDate = date ?? todayStr();
    if (date) validateDate(date);

    const fixtures = await fetchFixturesByDate(targetDate);
    await upsertFixtures(fixtures);

    const { start, end } = getDayRange(targetDate);
    return Match.find({
      competitionId,
      date: { $gte: start, $lte: end },
    }).select('-__v').sort({ date: 1 }).lean<IMatch[]>();
  },

  async update(id: string, data: Partial<Pick<IMatch, 'homeScore' | 'awayScore' | 'status' | 'statusShort' | 'elapsed'>>) {
    if (!mongoose.Types.ObjectId.isValid(id))
      throw AppError.badRequest('ID de partido inválido');

    const match = await Match.findByIdAndUpdate(id, { $set: data }, {
      new: true, runValidators: true,
    }).select('-__v').lean<IMatch>();
    if (!match) throw AppError.notFound('Partido no encontrado');
    return match;
  },

  async remove(id: string) {
    if (!mongoose.Types.ObjectId.isValid(id))
      throw AppError.badRequest('ID de partido inválido');

    const match = await Match.findByIdAndDelete(id).lean();
    if (!match) throw AppError.notFound('Partido no encontrado');
  },

  async getAll() {
    return Match.find({ competitionId: { $in: ALLOWED_LEAGUE_IDS } })
      .select('-__v').sort({ date: -1 }).lean<IMatch[]>();
  },
};

