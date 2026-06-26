import mongoose from 'mongoose';
import { connectDB } from '../db/connection';
import { Match } from '../match/match.model';
import { ALLOWED_LEAGUE_IDS } from '../utils/leagueWhitelist';

async function run() {
  await connectDB();

  const result = await Match.deleteMany({ competitionId: { $nin: ALLOWED_LEAGUE_IDS } });
  console.log(`🧹 Eliminados ${result.deletedCount} partidos de competiciones no permitidas (amistosos, copas no clave, datos viejos, etc.)`);

  await mongoose.disconnect();
  process.exit(0);
}

run().catch((err) => {
  console.error('Error al limpiar la base:', err);
  process.exit(1);
});
