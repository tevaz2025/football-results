import { getSeasonType } from './leagueWhitelist';

export function getCurrentSeason(leagueId: number, reference: Date = new Date()): number {
  const year  = reference.getFullYear();
  const month = reference.getMonth() + 1; // 1-12

  const type = getSeasonType(leagueId);

  if (type === 'euro') {
    return month >= 7 ? year : year - 1;
  }

  return year;
}
