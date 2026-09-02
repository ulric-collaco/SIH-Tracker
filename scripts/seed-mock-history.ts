import fs from 'node:fs';
import path from 'node:path';
import type { PSRecord, SnapshotEvent } from './scrape.ts';

const DATA_DIR = path.resolve(process.cwd(), 'data');
const HISTORY_DIR = path.resolve(DATA_DIR, 'history');
const LATEST_PATH = path.resolve(DATA_DIR, 'latest.json');

export async function seedMockHistory() {
  if (!fs.existsSync(LATEST_PATH)) {
    console.error('latest.json not found! Run npm run scrape first.');
    process.exit(1);
  }

  if (!fs.existsSync(HISTORY_DIR)) {
    fs.mkdirSync(HISTORY_DIR, { recursive: true });
  }

  const latestRecords: PSRecord[] = JSON.parse(fs.readFileSync(LATEST_PATH, 'utf-8'));
  console.log(`Generating 7 days of realistic 6-hour history snapshots for ${latestRecords.length} PS...`);

  // We generate timestamps for the last 7 days at 00:00, 06:00, 12:00, 18:00 UTC
  const now = new Date();
  const dayIntervals: Date[] = [];
  const TOTAL_SNAPSHOTS = 28; // 7 days * 4 snapshots/day

  for (let i = TOTAL_SNAPSHOTS - 1; i >= 0; i--) {
    const d = new Date(now.getTime() - i * 6 * 60 * 60 * 1000);
    // Align to 00, 06, 12, 18
    const h = d.getUTCHours();
    const alignedH = Math.floor(h / 6) * 6;
    d.setUTCHours(alignedH, 0, 0, 0);
    dayIntervals.push(d);
  }

  // Pre-calculate pseudo-random trajectories for each PS
  // Some PS have recent spikes (e.g. 20 submissions in last 24h)
  // Some PS have 0-2 submissions total
  // Some are moderately active
  const trajectoryMap = new Map<string, number[]>();

  latestRecords.forEach((ps, idx) => {
    // Current total
    const currentCount = ps.submitted_count;
    // Determine profile:
    // profile 0: silent low candidate (0-5)
    // profile 1: sudden recent spike (0 -> 18)
    // profile 2: steady climber (5 -> 30)
    // profile 3: high competition popular (40 -> 120)
    const profile = idx % 5;
    let targetFinal = currentCount;

    // For realistic demo data if currentCount is small (< 5)
    if (profile === 1 && currentCount < 10) {
      targetFinal = Math.max(currentCount, 24); // sudden spike in last 24h
    } else if (profile === 2 && currentCount < 5) {
      targetFinal = Math.max(currentCount, 38);
    } else if (profile === 3 && currentCount < 10) {
      targetFinal = Math.max(currentCount, 65);
    }

    const counts: number[] = new Array(TOTAL_SNAPSHOTS).fill(0);
    for (let s = 0; s < TOTAL_SNAPSHOTS; s++) {
      const progress = s / (TOTAL_SNAPSHOTS - 1);
      let val = 0;
      if (profile === 1) {
        // Flat until last 6 snapshots (last 36h), then sharp ramp
        if (s < TOTAL_SNAPSHOTS - 6) {
          val = Math.floor(targetFinal * 0.1 * (s / (TOTAL_SNAPSHOTS - 6)));
        } else {
          const spikeProgress = (s - (TOTAL_SNAPSHOTS - 6)) / 6;
          val = Math.floor(targetFinal * 0.1 + targetFinal * 0.9 * Math.pow(spikeProgress, 1.5));
        }
      } else if (profile === 2) {
        // Linear steady climber
        val = Math.floor(targetFinal * progress);
      } else if (profile === 3) {
        // High early, continues climbing
        val = Math.floor(targetFinal * Math.sqrt(progress));
      } else {
        // Low count, flat or minor change
        val = Math.min(targetFinal, Math.floor(targetFinal * progress));
      }
      counts[s] = Math.max(0, val);
    }
    // Make sure it doesn't decrease
    for (let s = 1; s < TOTAL_SNAPSHOTS; s++) {
      if (counts[s] < counts[s - 1]) counts[s] = counts[s - 1];
    }
    trajectoryMap.set(ps.ps_id, counts);

    // Update latest record to match final count if we boosted it for realistic demo
    if (targetFinal > ps.submitted_count) {
      ps.submitted_count = targetFinal;
      if (ps.cap) {
        ps.remaining_slots = Math.max(0, ps.cap - ps.submitted_count);
        ps.is_frozen = ps.remaining_slots <= 0;
      }
    }
  });

  // Write updated latest.json
  fs.writeFileSync(LATEST_PATH, JSON.stringify(latestRecords, null, 2), 'utf-8');

  // Group snapshots by YYYY-MM-DD
  const filesMap = new Map<string, SnapshotEvent[]>();

  for (let s = 0; s < TOTAL_SNAPSHOTS; s++) {
    const timestamp = dayIntervals[s].toISOString();
    const dateKey = timestamp.split('T')[0];
    if (!filesMap.has(dateKey)) {
      filesMap.set(dateKey, []);
    }

    const dayList = filesMap.get(dateKey)!;
    for (const ps of latestRecords) {
      const trajectory = trajectoryMap.get(ps.ps_id) || [];
      const subCount = trajectory[s] ?? ps.submitted_count;
      const rem = ps.cap ? Math.max(0, ps.cap - subCount) : null;
      dayList.push({
        ps_id: ps.ps_id,
        timestamp,
        submitted_count: subCount,
        remaining_slots: rem
      });
    }
  }

  for (const [dateKey, events] of filesMap.entries()) {
    const filePath = path.resolve(HISTORY_DIR, `${dateKey}.jsonl`);
    const content = events.map((ev) => JSON.stringify(ev)).join('\n') + '\n';
    fs.writeFileSync(filePath, content, 'utf-8');
    console.log(`Wrote ${events.length} history events to ${filePath}`);
  }

  console.log('Seed completed successfully!');
}

seedMockHistory().catch(console.error);
