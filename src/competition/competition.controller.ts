import { Request, Response } from 'express';
import { fetchLeagueFixtures, fetchLeagues } from '../match/apiFootball.service';
import { isAllowedLeagueId, ALLOWED_LEAGUES } from '../utils/leagueWhitelist';
import { getCurrentSeason } from '../utils/season';
import { asyncHandler } from '../utils/asyncHandler';

// SCRUM-13: fixture completo de una competición
// GET /api/competitions/39/fixtures               → usa automáticamente la temporada vigente
// GET /api/competitions/39/fixtures?season=2025    → fuerza una temporada puntual
export const getLeagueFixtures = asyncHandler(async (req: Request, res: Response) => {
  const leagueId = Number(req.params.leagueId);

  if (isNaN(leagueId)) {
    res.status(400).json({ ok: false, message: 'leagueId debe ser un número' });
    return;
  }

  if (!isAllowedLeagueId(leagueId)) {
    res.status(400).json({
      ok: false,
      message: 'Esa competición no está habilitada en esta API.',
      competicionesPermitidas: ALLOWED_LEAGUES.map((l) => ({ id: l.id, name: l.name, country: l.country })),
    });
    return;
  }

  // Si no se pasa ?season, se calcula la temporada vigente automáticamente
  // (ya no queda fijo en un año hardcodeado)
  const season = Number(req.query.season) || getCurrentSeason(leagueId);

  const fixtures = await fetchLeagueFixtures(leagueId, season);
  res.json({ ok: true, league: leagueId, season, count: fixtures.length, data: fixtures });
});

// SCRUM-9: ligas disponibles, filtrar por país
// GET /api/competitions?country=Argentina
export const getLeagues = asyncHandler(async (req: Request, res: Response) => {
  const { country } = req.query as { country?: string };
  const leagues = await fetchLeagues(country);
  res.json({ ok: true, count: leagues.length, data: leagues });
});
