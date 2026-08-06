import { Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import mongoose from 'mongoose';
import { User } from './user.model';
import { Match } from '../match/match.model';
import { TokenBlacklist } from './tokenBlacklist.model';
import { asyncHandler } from '../utils/asyncHandler';
import { AppError } from '../errors';
import { config } from '../config';
import { searchTeams, fetchTeamById, fetchFixtureDetail } from '../match/apiFootball.service';

function signToken(userId: string, role: string): string {
  return jwt.sign({ userId, role }, config.jwt.secret, {
    expiresIn: config.jwt.expiresIn,
  } as jwt.SignOptions);
}

// ── AUTH ──────────────────────────────────────────────────────────────────────

export const register = asyncHandler(async (req: Request, res: Response) => {
  const { username, email, password } = req.body;
  if (!username || !email || !password)
    throw AppError.badRequest('username, email y password son obligatorios');

  if (password.length < 8)
    throw AppError.badRequest('La contraseña debe tener al menos 8 caracteres');
  if (!/[a-zA-Z]/.test(password) || !/[0-9]/.test(password))
    throw AppError.badRequest('La contraseña debe tener al menos una letra y un número');

  const existing = await User.findOne({ $or: [{ email }, { username }] });
  if (existing) throw AppError.badRequest('El email o username ya está registrado');

  const user = await User.create({ username, email, password });
  const token = signToken(String(user._id), user.role);
  res.status(201).json({ ok: true, token, user });
});

export const login = asyncHandler(async (req: Request, res: Response) => {
  const { email, password } = req.body;
  if (!email || !password)
    throw AppError.badRequest('email y password son obligatorios');

  const user = await User.findOne({ email }).select('+password +loginAttempts +lockUntil');
  if (!user) throw AppError.badRequest('Credenciales inválidas');

  if (user.isLocked()) {
    const minutes = Math.ceil((user.lockUntil!.getTime() - Date.now()) / 60000);
    throw AppError.badRequest(`Cuenta bloqueada. Intentá en ${minutes} minutos`);
  }

  const isValid = await user.comparePassword(password);
  if (!isValid) {
    const attemptsBeforeIncrement = user.loginAttempts + 1;
    await user.incrementLoginAttempts();
    if (attemptsBeforeIncrement >= 5) {
      throw AppError.badRequest('Cuenta bloqueada por 30 minutos por demasiados intentos fallidos');
    }
    const remaining = 5 - attemptsBeforeIncrement;
    throw AppError.badRequest(
      `Credenciales inválidas. Te quedan ${remaining} intento${remaining === 1 ? '' : 's'}`
    );
  }

  await user.resetLoginAttempts();
  const token = signToken(String(user._id), user.role);
  res.json({ ok: true, token, user });
});

export const logout = asyncHandler(async (req: Request, res: Response) => {
  const header = req.headers.authorization;
  const token = header?.split(' ')[1];
  if (!token) throw AppError.badRequest('Token no proporcionado');

  const decoded = jwt.decode(token) as { exp?: number } | null;
  const expiresAt = decoded?.exp
    ? new Date(decoded.exp * 1000)
    : new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

  await TokenBlacklist.updateOne(
    { token },
    { token, expiresAt },
    { upsert: true }
  );

  res.json({ ok: true, message: 'Sesión cerrada correctamente' });
});

export const getMe = asyncHandler(async (req: Request, res: Response) => {
  const user = await User.findById(req.user!.userId)
    .select('-password -loginAttempts -lockUntil')
    .populate('favoriteMatches', 'homeTeam awayTeam date competition status homeScore awayScore homeLogo awayLogo');
  if (!user) throw AppError.notFound('Usuario no encontrado');
  res.json({ ok: true, data: user });
});

// ── FAVORITOS — PARTIDOS ──────────────────────────────────────────────────────

export const addFavoriteMatch = asyncHandler(async (req: Request, res: Response) => {
  const { matchId } = req.params;
  if (!mongoose.Types.ObjectId.isValid(matchId))
    throw AppError.badRequest('ID de partido inválido');

  const match = await Match.findById(matchId).lean();
  if (!match) throw AppError.notFound('Partido no encontrado');

  const user = await User.findByIdAndUpdate(
    req.user!.userId,
    { $addToSet: { favoriteMatches: new mongoose.Types.ObjectId(matchId) } },
    { new: true }
  ).select('-password -loginAttempts -lockUntil');
  if (!user) throw AppError.notFound('Usuario no encontrado');

  res.json({ ok: true, message: 'Partido agregado a favoritos', data: user });
});

export const removeFavoriteMatch = asyncHandler(async (req: Request, res: Response) => {
  const { matchId } = req.params;
  if (!mongoose.Types.ObjectId.isValid(matchId))
    throw AppError.badRequest('ID de partido inválido');

  const user = await User.findByIdAndUpdate(
    req.user!.userId,
    { $pull: { favoriteMatches: new mongoose.Types.ObjectId(matchId) } },
    { new: true }
  ).select('-password -loginAttempts -lockUntil');
  if (!user) throw AppError.notFound('Usuario no encontrado');

  res.json({ ok: true, message: 'Partido eliminado de favoritos', data: user });
});

// ── FAVORITOS — EQUIPOS ───────────────────────────────────────────────────────

export const addFavoriteTeam = asyncHandler(async (req: Request, res: Response) => {
  const { teamId } = req.body;

  if (!teamId || isNaN(Number(teamId)))
    throw AppError.badRequest('teamId es obligatorio y debe ser un número. Buscá el ID con GET /api/teams/search?name=...');

  const id = Number(teamId);

  // Busca el equipo por ID en la API para obtener nombre y logo reales
  const found = await fetchTeamById(id);
  if (!found)
    throw AppError.notFound(`No se encontró ningún equipo con ID ${id}. Verificá el ID con GET /api/teams/search?name=...`);

  // Verificar si ya lo tiene como favorito
  const alreadyExists = await User.findOne({
    _id: req.user!.userId,
    'favoriteTeams.teamId': id,
  }).lean();
  if (alreadyExists)
    throw AppError.badRequest(`${found.name} ya está en tus favoritos`);

  const user = await User.findByIdAndUpdate(
    req.user!.userId,
    {
      $push: {
        favoriteTeams: {
          teamId:   found.id,
          teamName: found.name,
          logo:     found.logo,
        },
      },
    },
    { new: true }
  ).select('-password -loginAttempts -lockUntil');
  if (!user) throw AppError.notFound('Usuario no encontrado');

  res.json({ ok: true, message: `${found.name} agregado a favoritos`, data: user });
});

export const removeFavoriteTeam = asyncHandler(async (req: Request, res: Response) => {
  const teamId = Number(req.params.teamId);
  if (isNaN(teamId))
    throw AppError.badRequest('teamId debe ser un número');

  const user = await User.findByIdAndUpdate(
    req.user!.userId,
    { $pull: { favoriteTeams: { teamId } } },
    { new: true }
  ).select('-password -loginAttempts -lockUntil');
  if (!user) throw AppError.notFound('Usuario no encontrado');

  res.json({ ok: true, message: 'Equipo eliminado de favoritos', data: user });
});

// ── PREDICCIONES ──────────────────────────────────────────────────────────────

export const createPrediction = asyncHandler(async (req: Request, res: Response) => {
  const { matchId, homeScore, awayScore } = req.body;

  if (!matchId || homeScore === undefined || awayScore === undefined)
    throw AppError.badRequest('matchId, homeScore y awayScore son obligatorios');
  if (!mongoose.Types.ObjectId.isValid(matchId))
    throw AppError.badRequest('matchId inválido');

  const hs = Number(homeScore);
  const as_ = Number(awayScore);
  if (isNaN(hs) || isNaN(as_) || hs < 0 || as_ < 0)
    throw AppError.badRequest('homeScore y awayScore deben ser números >= 0');

  const match = await Match.findById(matchId).lean();
  if (!match) throw AppError.notFound('Partido no encontrado');
  if (match.status !== 'scheduled')
    throw AppError.badRequest('Solo se puede predecir un partido que aún no empezó');

  const user = await User.findById(req.user!.userId);
  if (!user) throw AppError.notFound('Usuario no encontrado');

  const idx = user.predictions.findIndex((p) => p.matchId.toString() === matchId);
  const prediction = {
    matchId:   new mongoose.Types.ObjectId(matchId),
    homeScore: hs,
    awayScore: as_,
    createdAt: new Date(),
  };

  if (idx >= 0) {
    user.predictions[idx] = prediction;
  } else {
    user.predictions.push(prediction);
  }
  await user.save();

  res.status(201).json({ ok: true, message: 'Predicción guardada', data: user.predictions });
});

export const getPredictions = asyncHandler(async (req: Request, res: Response) => {
  const user = await User.findById(req.user!.userId).lean();
  if (!user) throw AppError.notFound('Usuario no encontrado');

  const matchIds = user.predictions.map((p) => p.matchId);
  const matches = await Match.find({ _id: { $in: matchIds } })
    .select('homeTeam awayTeam homeScore awayScore status date competition homeLogo awayLogo externalId')
    .lean();

  // FIX: para partidos que no están "finished" en MongoDB pero la fecha ya pasó,
  // refrescamos desde API-Football para tener el resultado real.
  // Esto resuelve el problema de predicciones con resultado "pending" cuando el partido ya terminó.
  const now = new Date();
  const refreshPromises = matches
    .filter((m) => m.status !== 'finished' && new Date(m.date) < now)
    .map(async (m) => {
      try {
        const fresh = await fetchFixtureDetail(m.externalId);
        if (fresh) {
          await Match.updateOne({ _id: m._id }, { $set: fresh });
          // Actualizar en memoria también para la respuesta inmediata
          Object.assign(m, fresh);
        }
      } catch {
        // Si falla el refresh, usamos lo que hay en MongoDB
      }
    });

  await Promise.all(refreshPromises);

  const matchMap = new Map(matches.map((m) => [String(m._id), m]));

  const enriched = user.predictions.map((pred) => {
    const match = matchMap.get(String(pred.matchId)) ?? null;

    let result: 'pending' | 'correct' | 'incorrect' = 'pending';
    if (match?.status === 'finished' && match.homeScore !== null && match.awayScore !== null) {
      result = pred.homeScore === match.homeScore && pred.awayScore === match.awayScore
        ? 'correct'
        : 'incorrect';
    }

    return {
      matchId:      pred.matchId,
      myPrediction: { homeScore: pred.homeScore, awayScore: pred.awayScore },
      actualResult: match ? { homeScore: match.homeScore, awayScore: match.awayScore } : null,
      result,
      match,
      createdAt: pred.createdAt,
    };
  });

  res.json({ ok: true, count: enriched.length, data: enriched });
});

// ── ADMIN ─────────────────────────────────────────────────────────────────────

// GET /api/users — lista todos los usuarios
export const getAllUsers = asyncHandler(async (_req: Request, res: Response) => {
  const users = await User.find()
    .select('-password -loginAttempts -lockUntil')
    .sort({ createdAt: -1 })
    .lean();
  res.json({ ok: true, count: users.length, data: users });
});

// GET /api/users/find/:username — buscar usuario por username
export const getUserByUsername = asyncHandler(async (req: Request, res: Response) => {
  const user = await User.findOne({ username: req.params.username })
    .select('-password -loginAttempts -lockUntil')
    .lean();
  if (!user) throw AppError.notFound(`Usuario "${req.params.username}" no encontrado`);
  res.json({ ok: true, data: user });
});

// PUT /api/users/:username/role — cambiar rol por username
export const changeRole = asyncHandler(async (req: Request, res: Response) => {
  const { role } = req.body;
  if (!['admin', 'viewer'].includes(role))
    throw AppError.badRequest('Rol inválido. Opciones: admin, viewer');

  const user = await User.findOneAndUpdate(
    { username: req.params.username },
    { role },
    { new: true }
  ).select('-password -loginAttempts -lockUntil').lean();
  if (!user) throw AppError.notFound(`Usuario "${req.params.username}" no encontrado`);

  res.json({ ok: true, message: `Rol de "${req.params.username}" actualizado a "${role}"`, data: user });
});

// DELETE /api/users/:username — eliminar por username
export const deleteUser = asyncHandler(async (req: Request, res: Response) => {
  const user = await User.findOneAndDelete({ username: req.params.username }).lean();
  if (!user) throw AppError.notFound(`Usuario "${req.params.username}" no encontrado`);
  res.json({ ok: true, message: `Usuario "${req.params.username}" eliminado` });
});

// PUT /api/users/:username/unlock — desbloquear cuenta bloqueada
export const unlockUser = asyncHandler(async (req: Request, res: Response) => {
  const user = await User.findOneAndUpdate(
    { username: req.params.username },
    { loginAttempts: 0, lockUntil: null },
    { new: true }
  ).select('-password -loginAttempts -lockUntil').lean();
  if (!user) throw AppError.notFound(`Usuario "${req.params.username}" no encontrado`);
  res.json({ ok: true, message: `Cuenta de "${req.params.username}" desbloqueada`, data: user });
});
