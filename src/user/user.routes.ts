import { Router } from 'express';
import {
  register, login, logout, getMe,
  addFavoriteMatch, removeFavoriteMatch,
  addFavoriteTeam, removeFavoriteTeam,
  createPrediction, getPredictions,
  getAllUsers, getUserByUsername, changeRole, deleteUser, unlockUser,
} from './user.controller';
import { authenticate, requireAdmin } from '../middleware/auth.middleware';
import { authLimiter } from '../middleware/rateLimiter';

const router = Router();

// ── Públicas ──────────────────────────────────────────────────────────────────
router.post('/register', authLimiter, register);
router.post('/login',    authLimiter, login);

// ── Requieren token válido ────────────────────────────────────────────────────
router.post('/logout',  authenticate, logout);
router.get('/me',       authenticate, getMe);

router.post('/favorites/matches/:matchId',   authenticate, addFavoriteMatch);
router.delete('/favorites/matches/:matchId', authenticate, removeFavoriteMatch);

router.post('/favorites/teams',           authenticate, addFavoriteTeam);
router.delete('/favorites/teams/:teamId', authenticate, removeFavoriteTeam);

router.post('/predictions', authenticate, createPrediction);
router.get('/predictions',  authenticate, getPredictions);

// ── Solo admin ────────────────────────────────────────────────────────────────
// IMPORTANTE: rutas fijas antes de /:username para que no colisionen
router.get('/', authenticate, requireAdmin, getAllUsers);

router.get('/find/:username',        authenticate, requireAdmin, getUserByUsername);
router.put('/:username/role',        authenticate, requireAdmin, changeRole);
router.put('/:username/unlock',      authenticate, requireAdmin, unlockUser);
router.delete('/:username',          authenticate, requireAdmin, deleteUser);

export default router;
