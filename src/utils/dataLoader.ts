import type { PSRecord, SnapshotEvent, PSChangeLogEntry } from '../types';
import latestDataRaw from '../../data/latest.json';
import changelogRaw from '../../data/ps-changelog.json';
import snapshotsRaw from '../../data/snapshots.json';

export const latestPSData: PSRecord[] = latestDataRaw as PSRecord[];
export const psChangelog: PSChangeLogEntry[] = changelogRaw as PSChangeLogEntry[];

// Load compacted snapshots directly from pre-processed snapshots.json
export function loadAllSnapshots(): SnapshotEvent[] {
  return (snapshotsRaw as SnapshotEvent[]) || [];
}
