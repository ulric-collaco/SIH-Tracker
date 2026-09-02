import type { PSRecord, SnapshotEvent, PSChangeLogEntry } from '../types';
import latestDataRaw from '../../data/latest.json';
import changelogRaw from '../../data/ps-changelog.json';

export const latestPSData: PSRecord[] = latestDataRaw as PSRecord[];
export const psChangelog: PSChangeLogEntry[] = changelogRaw as PSChangeLogEntry[];

// Load all daily history jsonl files using Vite's eager import
export function loadAllSnapshots(): SnapshotEvent[] {
  const snapshots: SnapshotEvent[] = [];

  try {
    const jsonlModules = import.meta.glob('/data/history/*.jsonl', {
      query: '?raw',
      eager: true,
      import: 'default'
    }) as Record<string, string>;

    for (const [filePath, content] of Object.entries(jsonlModules)) {
      if (!content || typeof content !== 'string') continue;
      const lines = content.split('\n');
      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed) continue;
        try {
          const parsed = JSON.parse(trimmed) as SnapshotEvent;
          snapshots.push(parsed);
        } catch (e) {
          console.warn(`Error parsing line in ${filePath}:`, e);
        }
      }
    }
  } catch (err) {
    console.error('Failed to load history modules via glob:', err);
  }

  // Sort snapshots chronologically
  snapshots.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
  return snapshots;
}
