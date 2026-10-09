import { SeverityLevel } from '../types/flood';

/**
 * Derive a station's severity from its water level (all values in ม.รทก.).
 * - critical: at or above bank level
 * - warning:  at or above warning level
 * - watch:    within one warning-band (bank − warning) below the warning level
 * - normal:   anything lower
 */
export function deriveStationStatus(
  levelM: number,
  warningLevelM: number,
  bankLevelM: number
): SeverityLevel {
  if (levelM >= bankLevelM) return 'critical';
  if (levelM >= warningLevelM) return 'warning';
  const watchLevelM = warningLevelM - (bankLevelM - warningLevelM);
  if (levelM >= watchLevelM) return 'watch';
  return 'normal';
}

/**
 * % of channel capacity, measured from the river bed up to the bank
 * (all values in ม.รทก.). 100% = water exactly at bank level.
 */
export function computeCapacityPercent(
  levelM: number,
  riverBedLevelM: number,
  bankLevelM: number
): number {
  const channelDepthM = bankLevelM - riverBedLevelM;
  if (channelDepthM <= 0) return 0;
  const pct = ((levelM - riverBedLevelM) / channelDepthM) * 100;
  return Number(Math.max(0, pct).toFixed(1));
}
