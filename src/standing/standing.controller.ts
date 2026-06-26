import { Request, Response } from 'express';
import { fetchStandings } from '../match/apiFootball.service';
import { isAllowedLeagueId, ALLOWED_LEAGUES } from '../utils/leagueWhitelist';
import { getCurrentSeason } from '../utils/season';
import { asyncHandler } from '../utils/asyncHandler';

// SCRUM-12: tabla de posiciones
// GET /api/standings?league=39                  → usa automáticamente la temporada vigente
// GET /api/standings?league=39&season=2025       → fuerza una temporada puntual
export const getStandings = asyncHandler(async (req: Request, res: Response) => {
  const leagueId = Number(req.query.league);

  if (isNaN(leagueId) || leagueId <= 0) {
    res.status(400).json({
      ok: false,
      message: 'El parámetro "league" es obligatorio (ej: ?league=39)',
      competicionesPermitidas: ALLOWED_LEAGUES.map((l) => ({ id: l.id, name: l.name, country: l.country })),
    });
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

  const season = Number(req.query.season) || getCurrentSeason(leagueId);

  const standings = await fetchStandings(leagueId, season);
  res.json({ ok: true, league: leagueId, season, count: standings.length, data: standings });
});
