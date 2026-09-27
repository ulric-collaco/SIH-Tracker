import fs from 'node:fs';
import path from 'node:path';

interface SnapshotEvent {
  ps_id: string;
  timestamp: string;
  submitted_count: number;
  remaining_slots: number | null;
}

const DATA_DIR = path.resolve(process.cwd(), 'data');
const HISTORY_DIR = path.resolve(DATA_DIR, 'history');
const COMPACT_OUTPUT_PATH = path.resolve(DATA_DIR, 'snapshots.json');

export function compactHistory() {
  if (!fs.existsSync(HISTORY_DIR)) {
    console.log('No history directory found at', HISTORY_DIR);
    return;
  }

  const files = fs.readdirSync(HISTORY_DIR).filter((f) => f.endsWith('.jsonl')).sort();
  console.log(`Found ${files.length} history files to process.`);

  // Group events by problem statement
  const psEvents = new Map<string, SnapshotEvent[]>();
  let totalRawCount = 0;

  for (const file of files) {
    const filePath = path.join(HISTORY_DIR, file);
    const content = fs.readFileSync(filePath, 'utf-8');
    const lines = content.split('\n');

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed) continue;
      totalRawCount++;
      try {
        const ev = JSON.parse(trimmed) as SnapshotEvent;
        if (!psEvents.has(ev.ps_id)) {
          psEvents.set(ev.ps_id, []);
        }
        psEvents.get(ev.ps_id)!.push(ev);
      } catch (err) {
        // Skip malformed lines
      }
    }
  }

  console.log(`Total raw snapshots read: ${totalRawCount}`);

  // Deduplicate per PS:
  // 1. Keep baseline (first seen)
  // 2. Keep any snapshot where count or slots changed
  // 3. Keep 1 checkpoint per calendar day (last of the day)
  // 4. Keep the absolute latest snapshot
  const keptEvents: SnapshotEvent[] = [];
  const eventsByDay = new Map<string, SnapshotEvent[]>();

  for (const [psId, events] of psEvents.entries()) {
    // Sort chronologically
    events.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
    if (events.length === 0) continue;

    const psKept: SnapshotEvent[] = [];
    let lastRecorded: SnapshotEvent | null = null;
    let lastDateKey = '';

    for (let i = 0; i < events.length; i++) {
      const ev = events[i];
      const dateKey = ev.timestamp.slice(0, 10); // YYYY-MM-DD
      const isFirst = i === 0;
      const isLast = i === events.length - 1;
      const hasChanged =
        !lastRecorded ||
        lastRecorded.submitted_count !== ev.submitted_count ||
        lastRecorded.remaining_slots !== ev.remaining_slots;
      const isNewDay = dateKey !== lastDateKey;

      if (isFirst || hasChanged || isNewDay || isLast) {
        psKept.push(ev);
        lastRecorded = ev;
        lastDateKey = dateKey;
      }
    }

    // Ensure the last event of each day is preserved if changed
    keptEvents.push(...psKept);

    // Group into days for rewriting daily files cleanly
    for (const ev of psKept) {
      const day = ev.timestamp.slice(0, 10);
      if (!eventsByDay.has(day)) {
        eventsByDay.set(day, []);
      }
      eventsByDay.get(day)!.push(ev);
    }
  }

  // Sort all kept events chronologically
  keptEvents.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

  console.log(
    `Kept ${keptEvents.length} snapshots (was ${totalRawCount}). Reduction: ${(
      (1 - keptEvents.length / totalRawCount) *
      100
    ).toFixed(1)}%`
  );

  // Write compacted snapshots.json
  fs.writeFileSync(COMPACT_OUTPUT_PATH, JSON.stringify(keptEvents), 'utf-8');
  const compactSizeKb = (fs.statSync(COMPACT_OUTPUT_PATH).size / 1024).toFixed(1);
  console.log(`Saved ${COMPACT_OUTPUT_PATH} (${compactSizeKb} KB)`);

  // Rewrite daily jsonl files with compacted events
  for (const [day, dayEvents] of eventsByDay.entries()) {
    dayEvents.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
    const dayFilePath = path.join(HISTORY_DIR, `${day}.jsonl`);
    const content = dayEvents.map((ev) => JSON.stringify(ev)).join('\n') + '\n';
    fs.writeFileSync(dayFilePath, content, 'utf-8');
  }
  console.log(`Updated daily history files with deduplicated entries.`);
}

if (process.argv[1] && process.argv[1].includes('compact-history')) {
  compactHistory();
}
