import express from 'express';
import matchRoutes       from './match/match.routes';
import standingRoutes    from './standing/standing.routes';
import competitionRoutes from './competition/competition.routes';
import teamRoutes        from './team/team.routes';
import { errorHandler }  from './middleware/errorHandler';

const app = express();

app.use(express.json());

app.use('/api/matches',      matchRoutes);
app.use('/api/standings',    standingRoutes);
app.use('/api/competitions', competitionRoutes);
app.use('/api/teams',        teamRoutes);

app.get('/health', (_req, res) => res.json({ ok: true }));

app.use((_req, res) => res.status(404).json({ ok: false, message: 'Ruta no encontrada' }));
app.use(errorHandler);

export default app;
