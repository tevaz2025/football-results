import { Request, Response } from 'express';
import { matchService } from './match.service';
import { asyncHandler } from '../utils/asyncHandler';

export const getTodayMatches = asyncHandler(async (req, res) => {
  const { status, country, competition } = req.query as Record<string, string>;
  const matches = await matchService.getToday({ status, country, competition });
  res.json({
    ok: true,
    date: new Date().toISOString().split('T')[0],
    count: matches.length,
    data: matches,
  });
});

export const getLiveMatches = asyncHandler(async (req, res) => {
  const { country, competition } = req.query as Record<string, string>;
  const matches = await matchService.getLive({ country, competition });
  res.json({ ok: true, count: matches.length, data: matches });
});

export const getMatchesByDate = asyncHandler(async (req, res) => {
  const { date, status, country, competition } = req.query as Record<string, string>;
  if (!date) {
    res.status(400).json({ ok: false, message: 'El parámetro date es obligatorio (YYYY-MM-DD)' });
    return;
  }
  const matches = await matchService.getByDate(date, { status, country, competition });
  res.json({ ok: true, date, count: matches.length, data: matches });
});

export const getMatchesByStatus = asyncHandler(async (req, res) => {
  const { status } = req.params;
  const { date } = req.query as Record<string, string>;
  const matches = await matchService.getByStatus(status, date);
  res.json({ ok: true, status, count: matches.length, data: matches });
});

export const getMatchesByCompetition = asyncHandler(async (req, res) => {
  const competitionId = Number(req.params.competitionId);
  const { date, season } = req.query as Record<string, string>;
  if (isNaN(competitionId)) {
    res.status(400).json({ ok: false, message: 'competitionId debe ser un número' });
    return;
  }
  const seasonNum = season ? Number(season) : undefined;
  const matches = await matchService.getByCompetition(competitionId, date, seasonNum);
  res.json({ ok: true, competitionId, count: matches.length, data: matches });
});

export const getMatchDetail = asyncHandler(async (req, res) => {
  const match = await matchService.getDetail(req.params.id);
  res.json({ ok: true, data: match });
});

export const updateMatch = asyncHandler(async (req, res) => {
  const { homeScore, awayScore, status, statusShort, elapsed } = req.body;
  const match = await matchService.update(req.params.id, { homeScore, awayScore, status, statusShort, elapsed });
  res.json({ ok: true, data: match });
});

export const deleteMatch = asyncHandler(async (req, res) => {
  await matchService.remove(req.params.id);
  res.json({ ok: true, message: 'Partido eliminado' });
});

export const getAllMatches = asyncHandler(async (_req, res) => {
  const matches = await matchService.getAll();
  res.json({ ok: true, count: matches.length, data: matches });
});
