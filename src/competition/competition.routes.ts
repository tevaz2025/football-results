import { Router } from 'express';
import { getLeagueFixtures, getLeagues } from './competition.controller';

const router = Router();
router.get('/',                         getLeagues);           // SCRUM-9
router.get('/:leagueId/fixtures',       getLeagueFixtures);    // SCRUM-13
export default router;
