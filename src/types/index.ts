export interface PSRecord {
  ps_id: string;
  title: string;
  category: 'Software' | 'Hardware';
  theme: string;
  organization: string;
  department?: string;
  submitted_count: number;
  cap: number | null;
  remaining_slots: number | null;
  is_frozen: boolean;
  dataset_link: string | null;
  youtube_link?: string | null;
  description?: string;
  deadline?: string;
  status: 'active' | 'removed';
  first_seen_at: string;
  last_scraped_at: string;
}

export interface SnapshotEvent {
  ps_id: string;
  timestamp: string;
  submitted_count: number;
  remaining_slots: number | null;
}

export interface PSChangeLogEntry {
  date: string;
  ps_id: string;
  field: string;
  old_value: any;
  new_value: any;
}

export interface PSMetrics {
  delta_6h: number | null;
  delta_12h: number | null;
  delta_24h: number | null;
  delta_48h: number | null;
  delta_7d: number | null;
  avg_daily_rate: number;
  days_to_cap: number | null;
  hasEnoughHistory: boolean;
}

export type TimeWindow = '6h' | '12h' | '24h' | '48h';

export interface GemAnalysis {
  record: PSRecord;
  metrics: PSMetrics;
  safetyScore: number;
  isSurging: boolean;
  surgeReason: string | null;
  reasonTag: string;
}
