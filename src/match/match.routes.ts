import { Router } from 'express';
import {
  getTodayMatches,
  getLiveMatches,
  getMatchesByDate,
  getMatchesByStatus,
  getMatchesByCompetition,
  getMatchDetail,
  updateMatch,
  deleteMatch,
  getAllMatches,
} from './match.controller';

const router = Router();

// Rutas fijas PRIMERO (antes de /:id para que no colisionen)
router.get('/today',                          getTodayMatches);          // SCRUM-5
router.get('/live',                           getLiveMatches);           // SCRUM-16
router.get('/status/:status',                 getMatchesByStatus);       // SCRUM-6
router.get('/competition/:competitionId',     getMatchesByCompetition);  // SCRUM-8
router.get('/all',                            getAllMatches);
router.get('/',                               getMatchesByDate);         // SCRUM-7  ?date=

// Rutas con parámetro dinámico DESPUÉS
router.get('/:id/detail',                     getMatchDetail);           // SCRUM-10+11
router.put('/:id',                            updateMatch);              // SCRUM-16
router.delete('/:id',                         deleteMatch);

export default router;
