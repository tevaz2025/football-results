import express from 'express';
import helmet from 'helmet';
import matchRoutes       from './match/match.routes';
import standingRoutes    from './standing/standing.routes';
import competitionRoutes from './competition/competition.routes';
import teamRoutes        from './team/team.routes';
import userRoutes        from './user/user.routes';
import { errorHandler }  from './middleware/errorHandler';

const app = express();

app.use(helmet());

app.disable('x-powered-by');

app.use(express.json({ limit: '10kb' })); 

app.use('/api/matches',      matchRoutes);
app.use('/api/standings',    standingRoutes);
app.use('/api/competitions', competitionRoutes);
app.use('/api/teams',        teamRoutes);

app.use('/api/users',        userRoutes);

app.get('/health', (_req, res) => res.json({ ok: true }));

app.use((_req, res) => {
  res.status(404).json({ ok: false, message: 'No encontrado' });
});

app.use(errorHandler);

export default app;
