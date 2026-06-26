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

router.get('/today',                          getTodayMatches);          
router.get('/live',                           getLiveMatches);           
router.get('/status/:status',                 getMatchesByStatus);      
router.get('/competition/:competitionId',     getMatchesByCompetition);  
router.get('/all',                            getAllMatches);
router.get('/',                               getMatchesByDate);         

router.get('/:id/detail',                     getMatchDetail);           
router.put('/:id',                            updateMatch);              
router.delete('/:id',                         deleteMatch);

export default router;
