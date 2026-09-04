import type { PSRecord, SnapshotEvent, PSMetrics, TimeWindow } from '../types';

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
