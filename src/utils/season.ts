import { getSeasonType } from './leagueWhitelist';

/**
 * Calcula la temporada ("season") vigente para una liga según la fecha actual.
 *
 * API-Football identifica cada temporada por el AÑO EN QUE ARRANCA:
 * - Ligas "euro" (Premier League, La Liga, Serie A, Bundesliga, Ligue 1):
 *   arrancan en julio/agosto y terminan en mayo/junio del año siguiente.
 *   Ej: la temporada 2025-26 (vigente entre ago-2025 y jun-2026) se pide
 *   con season=2025, NO season=2026, aunque ya estemos en 2026.
 * - Ligas "calendar" (Liga Arg., Brasileirão, Mundial): el torneo coincide
 *   con el año calendario, así que season = año actual.
 *
 * Esto evita tener que hardcodear el año en ningún lado: siempre se calcula
 * en base a la fecha real del sistema.
 */
export function getCurrentSeason(leagueId: number, reference: Date = new Date()): number {
  const year  = reference.getFullYear();
  const month = reference.getMonth() + 1; // 1-12

  const type = getSeasonType(leagueId);

  if (type === 'euro') {
    // Antes de julio todavía estamos dentro de la temporada que arrancó
    // el año calendario anterior (ej: en abril 2026 seguimos en season 2025).
    return month >= 7 ? year : year - 1;
  }

  return year;
}
