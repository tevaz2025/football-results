import mongoose from 'mongoose';
import { connectDB } from '../db/connection';
import { Match } from '../match/match.model';
import { ALLOWED_LEAGUE_IDS } from '../utils/leagueWhitelist';

/**
 * Limpieza puntual de la base de datos.
 *
 * Antes de este fix, el endpoint /api/matches/competition/:id NUNCA refrescaba
 * desde la API, solo leía lo que ya estuviera en Mongo. Si en algún momento se
 * guardaron amistosos, copas no clave, o partidos viejos (2024), van a seguir
 * ahí para siempre a menos que se borren.
 *
 * Este script borra todo lo que NO sea Premier League, La Liga, Serie A,
 * Bundesliga, Ligue 1, Liga Profesional Argentina, Brasileirão o Mundial.
 * Es seguro correrlo: el próximo fetch a la API vuelve a traer los datos
 * actuales de las competiciones permitidas.
 *
 * Uso: npm run cleanup:legacy
 */
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
