import { Request, Response } from 'express';
import { searchTeams } from '../match/apiFootball.service';
import { asyncHandler } from '../utils/asyncHandler';

// SCRUM-14: buscar equipos
// GET /api/teams/search?name=river
export const searchTeamsHandler = asyncHandler(async (req: Request, res: Response) => {
  const { name } = req.query as { name?: string };

  if (!name || name.trim().length < 3) {
    res.status(400).json({ ok: false, message: 'El parámetro "name" es obligatorio y debe tener al menos 3 caracteres' });
    return;
  }

  const teams = await searchTeams(name.trim());
  res.json({ ok: true, count: teams.length, data: teams });
});
