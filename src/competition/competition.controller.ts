import { Request, Response } from 'express';
import { fetchLeagueFixtures, fetchLeagues } from '../match/apiFootball.service';
import { isAllowedLeagueId, ALLOWED_LEAGUES } from '../utils/leagueWhitelist';
import { getCurrentSeason } from '../utils/season';
import { asyncHandler } from '../utils/asyncHandler';

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

  const season = Number(req.query.season) || getCurrentSeason(leagueId);

  const fixtures = await fetchLeagueFixtures(leagueId, season);
  res.json({ ok: true, league: leagueId, season, count: fixtures.length, data: fixtures });
});

export const getLeagues = asyncHandler(async (req: Request, res: Response) => {
  const { country } = req.query as { country?: string };
  const leagues = await fetchLeagues(country);
  res.json({ ok: true, count: leagues.length, data: leagues });
});
