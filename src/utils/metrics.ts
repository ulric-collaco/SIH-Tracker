import type { PSRecord, SnapshotEvent, PSMetrics, TimeWindow, GemAnalysis } from '../types';

export function calculatePSMetrics(
  record: PSRecord,
  snapshots: SnapshotEvent[]
): PSMetrics {
  // Filter and sort snapshots for this PS chronologically
  const psSnapshots = snapshots
    .filter((s) => s.ps_id === record.ps_id)
    .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

  if (psSnapshots.length < 2) {
    return {
      delta_6h: null,
      delta_12h: null,
      delta_24h: null,
      delta_48h: null,
      delta_7d: null,
      avg_daily_rate: 0,
      days_to_cap: null,
      hasEnoughHistory: false
    };
  }

  const latestSnap = psSnapshots[psSnapshots.length - 1];
  const nowMs = new Date(latestSnap.timestamp).getTime();

  // Helper to find snapshot closest to a target past time, resilient to CI runner delays
  function findSnapshotAtWindow(hoursAgo: number): SnapshotEvent | null {
    const targetMs = nowMs - hoursAgo * 60 * 60 * 1000;
    let closest: SnapshotEvent | null = null;
    let minDiff = Infinity;

    for (const snap of psSnapshots) {
      if (snap === latestSnap) continue;
      const snapMs = new Date(snap.timestamp).getTime();
      const diff = Math.abs(snapMs - targetMs);
      if (diff < minDiff) {
        minDiff = diff;
        closest = snap;
      }
    }

    // Flexible tolerance for real-world CI runner timing variations (up to +/- 5h for 6h, 12h for 24h)
    const maxTolerance = Math.max(5 * 60 * 60 * 1000, hoursAgo * 0.5 * 60 * 60 * 1000);
    if (closest && minDiff <= maxTolerance) {
      return closest;
    }
    return null;
  }

  // Fallback to immediately preceding scrape if within reasonable single-cycle range (up to 12h)
  const prevCycleSnap =
    psSnapshots.length >= 2 && (nowMs - new Date(psSnapshots[psSnapshots.length - 2].timestamp).getTime() <= 14 * 60 * 60 * 1000)
      ? psSnapshots[psSnapshots.length - 2]
      : null;

  const snap6h = findSnapshotAtWindow(6) ?? prevCycleSnap;
  const snap12h = findSnapshotAtWindow(12);
  const snap24h = findSnapshotAtWindow(24);
  const snap48h = findSnapshotAtWindow(48);
  const snap7d = findSnapshotAtWindow(24 * 7);

  const delta_6h = snap6h !== null ? Math.max(0, latestSnap.submitted_count - snap6h.submitted_count) : null;
  const delta_12h = snap12h !== null ? Math.max(0, latestSnap.submitted_count - snap12h.submitted_count) : null;
  const delta_24h = snap24h !== null ? Math.max(0, latestSnap.submitted_count - snap24h.submitted_count) : null;
  const delta_48h = snap48h !== null ? Math.max(0, latestSnap.submitted_count - snap48h.submitted_count) : null;
  const delta_7d = snap7d !== null ? Math.max(0, latestSnap.submitted_count - snap7d.submitted_count) : null;

  // Average daily rate: over trailing 7 days (or total observed history if shorter)
  const earliestSnap = snap7d ?? psSnapshots[0];
  const durationDays = Math.max(
    0.25,
    (nowMs - new Date(earliestSnap.timestamp).getTime()) / (24 * 60 * 60 * 1000)
  );
  const totalIncrease = Math.max(0, latestSnap.submitted_count - earliestSnap.submitted_count);
  const avg_daily_rate = Number((totalIncrease / durationDays).toFixed(2));

  // Days to cap
  let days_to_cap: number | null = null;
  if (record.remaining_slots !== null && record.remaining_slots !== undefined && record.remaining_slots > 0) {
    if (avg_daily_rate > 0) {
      days_to_cap = Math.ceil(record.remaining_slots / avg_daily_rate);
    }
  }

  return {
    delta_6h,
    delta_12h,
    delta_24h,
    delta_48h,
    delta_7d,
    avg_daily_rate,
    days_to_cap,
    hasEnoughHistory: true
  };
}

export function getDeltaForWindow(metrics: PSMetrics, window: TimeWindow): number | null {
  switch (window) {
    case '6h':
      return metrics.delta_6h;
    case '12h':
      return metrics.delta_12h;
    case '24h':
      return metrics.delta_24h;
    case '48h':
      return metrics.delta_48h;
    default:
      return metrics.delta_24h;
  }
}

export interface GemResults {
  safePicks: GemAnalysis[];
  surgingPicks: GemAnalysis[];
  p25Cutoff: number;
  totalAnalyzed: number;
}

export function computeGemAnalyses(
  records: PSRecord[],
  snapshots: SnapshotEvent[]
): GemResults {
  // Pre-calculate metrics for all active, non-frozen records
  const activeRecords = records.filter((r) => r.status !== 'removed' && !r.is_frozen);
  if (activeRecords.length === 0) {
    return { safePicks: [], surgingPicks: [], p25Cutoff: 0, totalAnalyzed: 0 };
  }

  // Determine dynamic bottom 25% cutoff for submitted_count
  const sortedCounts = activeRecords.map((r) => r.submitted_count).sort((a, b) => a - b);
  const p25Index = Math.floor(sortedCounts.length * 0.25);
  // Floor at minimum 5 submissions so early tracking doesn't over-restrict
  const p25Cutoff = Math.max(sortedCounts[p25Index] ?? 0, 5);

  const safePicks: GemAnalysis[] = [];
  const surgingPicks: GemAnalysis[] = [];
  const nowMs = Date.now();

  for (const record of activeRecords) {
    // Cutoff check: must be in bottom 25% of submission counts
    if (record.submitted_count > p25Cutoff) continue;

    const metrics = calculatePSMetrics(record, snapshots);
    // Exclude records with insufficient history
    if (!metrics.hasEnoughHistory) continue;

    // Aggressive Surge Detection
    let isSurging = false;
    let surgeReason: string | null = null;

    const delta12 = metrics.delta_12h ?? 0;
    const delta24 = metrics.delta_24h ?? 0;
    const delta48 = metrics.delta_48h ?? 0;

    if (record.submitted_count > 0 && delta12 > 0 && delta12 / record.submitted_count > 0.20) {
      isSurging = true;
      surgeReason = `+${delta12} in last 12h (${Math.round((delta12 / record.submitted_count) * 100)}% surge)`;
    } else if (record.submitted_count > 0 && delta48 > 0 && delta48 / record.submitted_count > 0.25) {
      isSurging = true;
      surgeReason = `+${delta48} in last 48h (${Math.round((delta48 / record.submitted_count) * 100)}% surge)`;
    } else if (delta24 >= 10) {
      isSurging = true;
      surgeReason = `+${delta24} in last 24h (rapid surge)`;
    }

    // Safety Score (0–100)
    // 1. Submission Count Score (40%)
    const subScore = Math.max(0, 100 - (record.submitted_count / (p25Cutoff || 1)) * 100);

    // 2. Slots Buffer Score (25%)
    let bufferScore = 70;
    if (record.cap && record.cap > 0) {
      const bufferRatio = (record.remaining_slots ?? 0) / record.cap;
      bufferScore = Math.min(100, Math.max(0, bufferRatio * 100));
    }

    // 3. Age without Traction (20%)
    const daysLive = Math.max(
      0.1,
      (nowMs - new Date(record.first_seen_at).getTime()) / (24 * 60 * 60 * 1000)
    );
    const ageScore = Math.min(100, (daysLive / (metrics.avg_daily_rate + 0.1)) * 15);

    // 4. Velocity Trend (15%)
    const trendScore =
      metrics.avg_daily_rate <= 0.1 ? 100 : Math.max(0, 100 - metrics.avg_daily_rate * 25);

    const rawScore = Math.round(
      subScore * 0.40 + bufferScore * 0.25 + ageScore * 0.20 + trendScore * 0.15
    );
    const safetyScore = Math.min(99, Math.max(15, rawScore));

    // Reason Tag
    const reasonTag = `${record.submitted_count} subs · ${Math.floor(daysLive)}d live · ${metrics.avg_daily_rate.toFixed(1)}/day · ${record.remaining_slots ?? 500} slots`;

    const analysis: GemAnalysis = {
      record,
      metrics,
      safetyScore,
      isSurging,
      surgeReason,
      reasonTag
    };

    if (isSurging) {
      surgingPicks.push(analysis);
    } else {
      safePicks.push(analysis);
    }
  }

  // Sort safe picks by Safety Score descending, tiebreaker by lowest submissions
  safePicks.sort((a, b) => b.safetyScore - a.safetyScore || a.record.submitted_count - b.record.submitted_count);
  // Sort surging picks by Safety Score descending
  surgingPicks.sort((a, b) => b.safetyScore - a.safetyScore);

  return {
    safePicks,
    surgingPicks,
    p25Cutoff,
    totalAnalyzed: activeRecords.length
  };
}
