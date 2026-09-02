import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import zlib from 'node:zlib';
import * as cheerio from 'cheerio';

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

const DATA_DIR = path.resolve(process.cwd(), 'data');
const HISTORY_DIR = path.resolve(DATA_DIR, 'history');
const LATEST_PATH = path.resolve(DATA_DIR, 'latest.json');
const CHANGELOG_PATH = path.resolve(DATA_DIR, 'ps-changelog.json');

const USER_AGENT = 'sih26-tracker-bot/1.0 (personal project; contact: https://github.com)';
const HEADERS = {
  'User-Agent': USER_AGENT,
  'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
  'Accept-Language': 'en-US,en;q=0.9',
  'Cache-Control': 'no-cache'
};

import { execFileSync } from 'node:child_process';

const BROWSER_USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36';

async function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// Pre-flight check: robots.txt via curl
async function checkRobotsTxt(): Promise<boolean> {
  console.log('Checking https://sih.gov.in/robots.txt...');
  try {
    const args = [
      '-sS',
      '-L',
      '--max-time',
      '30',
      '--compressed',
      '-H',
      `User-Agent: ${BROWSER_USER_AGENT}`,
      'https://sih.gov.in/robots.txt'
    ];
    const text = execFileSync('curl', args, { encoding: 'utf-8' });
    const lines = text.split('\n').map((l) => l.trim().toLowerCase());
    let appliesToAll = false;
    for (const line of lines) {
      if (line.startsWith('user-agent:')) {
        const agent = line.replace('user-agent:', '').trim();
        appliesToAll = agent === '*';
      } else if (appliesToAll && line.startsWith('disallow:')) {
        const pathBlocked = line.replace('disallow:', '').trim();
        if (pathBlocked && '/sih2026ps'.startsWith(pathBlocked.toLowerCase())) {
          console.error(`SCRAPE BLOCKED by robots.txt rule: "${line}"`);
          return false;
        }
      }
    }
    console.log('robots.txt check passed. /sih2026PS is permitted.');
    return true;
  } catch (err: any) {
    console.warn('robots.txt check encountered error, proceeding to fetch page:', err.message);
    return true;
  }
}

// Fetch with Cloudflare Worker proxy (bypasses CI runner IP blocks) or direct curl fallback
async function fetchPageWithRetry(url: string, retries = 4): Promise<string> {
  const workerUrl = process.env.WORKER_PROXY_URL || 'https://sih-2026-proxy.collacou.workers.dev/api/fetch-sih';
  const workerSecret = process.env.WORKER_AUTH_SECRET;

  let delay = 5000;

  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      // 1. If Cloudflare Worker credentials are present, route through secure edge proxy
      if (workerSecret) {
        console.log(`Fetching via Cloudflare Worker proxy: ${workerUrl} (attempt ${attempt}/${retries})...`);
        const res = await fetch(workerUrl, {
          headers: {
            'Authorization': `Bearer ${workerSecret}`,
            'User-Agent': BROWSER_USER_AGENT
          }
        });

        if (!res.ok) {
          const errBody = await res.text();
          throw new Error(`Cloudflare Worker proxy returned HTTP ${res.status}: ${errBody}`);
        }

        const output = await res.text();
        const preview = output.substring(0, 250).replace(/\s+/g, ' ');
        console.log(`Received ${output.length} characters via Cloudflare Worker. Preview: "${preview}"`);

        const hasTable =
          output.toLowerCase().includes('<table') ||
          output.includes('dataTablePS') ||
          output.includes('colomn_border');

        if (!hasTable) {
          throw new Error(`Worker response missing problem statement table`);
        }

        return output;
      }

      // 2. Fallback: Direct curl execution (works locally on residential IPs)
      console.log(`Fetching ${url} using direct browser TLS curl (attempt ${attempt}/${retries})...`);
      const cookiePath = path.resolve(os.tmpdir(), 'sih_cookie.txt');
      const curlArgs = [
        '-sS',
        '-L',
        '--max-time',
        '90',
        '-c',
        cookiePath,
        '-b',
        cookiePath,
        '-H',
        `User-Agent: ${BROWSER_USER_AGENT}`,
        '-H',
        'Accept: text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
        '-H',
        'Accept-Language: en-US,en;q=0.9',
        '-H',
        'Referer: https://sih.gov.in/',
        '-H',
        'Sec-Fetch-Dest: document',
        '-H',
        'Sec-Fetch-Mode: navigate',
        '-H',
        'Sec-Fetch-Site: same-origin',
        url
      ];

      const rawBuffer = execFileSync('curl', curlArgs, {
        maxBuffer: 30 * 1024 * 1024
      });

      if (!rawBuffer || rawBuffer.length === 0) {
        throw new Error('Empty response buffer received from curl');
      }

      let output = '';
      if (rawBuffer.length >= 2 && rawBuffer[0] === 0x1f && rawBuffer[1] === 0x8b) {
        output = zlib.gunzipSync(rawBuffer).toString('utf-8');
      } else {
        output = rawBuffer.toString('utf-8');
      }

      const preview = output.substring(0, 250).replace(/\s+/g, ' ');
      console.log(`Received ${output.length} characters. Preview: "${preview}"`);

      const hasTable =
        output.toLowerCase().includes('<table') ||
        output.includes('dataTablePS') ||
        output.includes('colomn_border');

      if (!hasTable) {
        console.warn(`Attempt ${attempt}: response does not contain table marker. Content snippet: "${preview}"`);
        if (attempt < retries) {
          throw new Error(`Response missing table (snippet: "${preview.slice(0, 100)}")`);
        }
      }

      return output;
    } catch (err: any) {
      console.error(`Attempt ${attempt} failed: ${err.message}`);
      if (attempt === retries) {
        throw new Error(`Failed to fetch ${url} after ${retries} attempts: ${err.message}`);
      }
      console.log(`Waiting ${delay / 1000}s before retry...`);
      await sleep(delay);
      delay *= 2;
    }
  }
  throw new Error('Unexpected fetch error');
}

export async function scrapeSIH(): Promise<{
  scrapedCount: number;
  changed: boolean;
}> {
  // Ensure directories exist
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
  if (!fs.existsSync(HISTORY_DIR)) fs.mkdirSync(HISTORY_DIR, { recursive: true });

  const robotsOk = await checkRobotsTxt();
  if (!robotsOk) {
    throw new Error('Scraping halted: /sih2026PS disallowed in robots.txt');
  }

  const html = await fetchPageWithRetry('https://sih.gov.in/sih2026PS');
  const $ = cheerio.load(html);

  // Load existing data
  let existingMap = new Map<string, PSRecord>();
  if (fs.existsSync(LATEST_PATH)) {
    try {
      const prevData: PSRecord[] = JSON.parse(fs.readFileSync(LATEST_PATH, 'utf-8'));
      for (const item of prevData) {
        existingMap.set(item.ps_id, item);
      }
      console.log(`Loaded ${existingMap.size} existing PS records from latest.json.`);
    } catch (e) {
      console.warn('Failed to parse existing latest.json, starting fresh.');
    }
  }

  let changelog: PSChangeLogEntry[] = [];
  if (fs.existsSync(CHANGELOG_PATH)) {
    try {
      changelog = JSON.parse(fs.readFileSync(CHANGELOG_PATH, 'utf-8'));
    } catch (e) {
      changelog = [];
    }
  }

  const nowISO = new Date().toISOString();
  const dateKey = nowISO.split('T')[0];
  const historyFile = path.resolve(HISTORY_DIR, `${dateKey}.jsonl`);

  const records: PSRecord[] = [];
  const snapshotEvents: SnapshotEvent[] = [];
  let changesDetected = false;

  // The main table rows in tbody
  $('table tbody tr').each((_, tr) => {
    const $tr = $(tr);
    const tds = $tr.children('td');
    if (tds.length < 5) return;

    // S.No. is tds[0]
    const sNoText = $(tds[0]).text().trim();
    if (!sNoText || isNaN(Number(sNoText))) return;

    const org = $(tds[1]).text().trim();

    // Title and modal are in tds[2]
    const $titleTd = $(tds[2]);
    const title = $titleTd.find('a[data-toggle="modal"]').first().text().trim() || $titleTd.text().trim();

    // Modal details
    let psId = '';
    let description = '';
    let department = '';
    let datasetLink: string | null = null;
    let youtubeLink: string | null = null;

    $titleTd.find('table#settings tr').each((_, mTr) => {
      const th = $(mTr).find('th').text().trim().toLowerCase();
      const tdVal = $(mTr).find('td').text().trim();
      if (th.includes('problem statement id')) {
        psId = tdVal;
      } else if (th.includes('description')) {
        description = tdVal;
      } else if (th.includes('department')) {
        department = tdVal;
      } else if (th.includes('dataset link')) {
        const link = $(mTr).find('td a').attr('href')?.trim();
        if (link && link.startsWith('http')) datasetLink = link;
      } else if (th.includes('youtube link')) {
        const yLink = $(mTr).find('td a').attr('href')?.trim();
        if (yLink && yLink.startsWith('http')) youtubeLink = yLink;
      }
    });

    // Column 3: Category (Software/Hardware)
    const categoryRaw = $(tds[3]).text().trim();
    const category: 'Software' | 'Hardware' = categoryRaw.toLowerCase().includes('hard')
      ? 'Hardware'
      : 'Software';

    // Column 4: PS Number (e.g. SIH26001)
    const psNumberRaw = $(tds[4]).text().trim();
    const finalPsId = psNumberRaw || psId || `SIH26${String(sNoText).padStart(3, '0')}`;

    // Column 5: Submitted Idea(s) Count (e.g. "1/500" or "0/500")
    const countRaw = $(tds[5]).text().trim();
    let submittedCount = 0;
    let cap: number | null = null;
    let remainingSlots: number | null = null;

    if (countRaw.includes('/')) {
      const parts = countRaw.split('/');
      submittedCount = parseInt(parts[0], 10) || 0;
      cap = parseInt(parts[1], 10) || null;
      if (cap !== null) {
        remainingSlots = Math.max(0, cap - submittedCount);
      }
    } else {
      submittedCount = parseInt(countRaw, 10) || 0;
      // Cap not exposed in this format
      cap = null;
      remainingSlots = null;
    }

    const isFrozen = remainingSlots !== null ? remainingSlots <= 0 : false;

    // Column 6: Theme
    const theme = $(tds[6]).text().trim() || 'General';

    // Column 7: Deadline
    const deadline = $(tds[7]).text().trim() || '';

    const existing = existingMap.get(finalPsId);
    const firstSeen = existing ? existing.first_seen_at : nowISO;

    // Detect field changes
    if (existing) {
      const fieldsToCheck: Array<keyof PSRecord> = ['title', 'category', 'theme', 'organization'];
      for (const f of fieldsToCheck) {
        if (existing[f] !== undefined && (existing as any)[f] !== ({} as any)[f]) {
          const oldVal = existing[f];
          const newVal = f === 'title' ? title : f === 'category' ? category : f === 'theme' ? theme : org;
          if (oldVal !== newVal) {
            changelog.push({
              date: nowISO,
              ps_id: finalPsId,
              field: f,
              old_value: oldVal,
              new_value: newVal
            });
            changesDetected = true;
          }
        }
      }

      if (existing.submitted_count !== submittedCount || existing.remaining_slots !== remainingSlots) {
        changesDetected = true;
      }
    } else {
      // New PS appeared
      changelog.push({
        date: nowISO,
        ps_id: finalPsId,
        field: 'status',
        old_value: null,
        new_value: 'new_problem_statement'
      });
      changesDetected = true;
    }

    const record: PSRecord = {
      ps_id: finalPsId,
      title,
      category,
      theme,
      organization: org,
      department: department || undefined,
      submitted_count: submittedCount,
      cap,
      remaining_slots: remainingSlots,
      is_frozen: isFrozen,
      dataset_link: datasetLink,
      youtube_link: youtubeLink || undefined,
      description: description || undefined,
      deadline: deadline || undefined,
      status: 'active',
      first_seen_at: firstSeen,
      last_scraped_at: nowISO
    };

    records.push(record);

    snapshotEvents.push({
      ps_id: finalPsId,
      timestamp: nowISO,
      submitted_count: submittedCount,
      remaining_slots: remainingSlots
    });
  });

  // Resilience check: Sanity check record count
  console.log(`Scraped ${records.length} problem statements.`);
  if (records.length < 150 || records.length > 400) {
    throw new Error(
      `VALIDATION REJECTED: Unexpected PS count (${records.length}). Expected between 150 and 400. Aborting write to avoid committing corrupt data.`
    );
  }

  // Check for withdrawn/removed PS
  const currentIdSet = new Set(records.map((r) => r.ps_id));
  for (const [id, oldRecord] of existingMap.entries()) {
    if (!currentIdSet.has(id)) {
      if (oldRecord.status !== 'removed') {
        oldRecord.status = 'removed';
        oldRecord.last_scraped_at = nowISO;
        changelog.push({
          date: nowISO,
          ps_id: id,
          field: 'status',
          old_value: 'active',
          new_value: 'removed'
        });
        changesDetected = true;
      }
      records.push(oldRecord);
    }
  }

  // Sort records deterministically by ps_id
  records.sort((a, b) => a.ps_id.localeCompare(b.ps_id));

  // Write outputs
  fs.writeFileSync(LATEST_PATH, JSON.stringify(records, null, 2), 'utf-8');
  console.log(`Saved ${records.length} records to ${LATEST_PATH}`);

  fs.writeFileSync(CHANGELOG_PATH, JSON.stringify(changelog, null, 2), 'utf-8');
  console.log(`Updated ${CHANGELOG_PATH} with ${changelog.length} entries`);

  // Append snapshots to daily JSONL
  const jsonlLines = snapshotEvents.map((ev) => JSON.stringify(ev)).join('\n') + '\n';
  fs.appendFileSync(historyFile, jsonlLines, 'utf-8');
  console.log(`Appended ${snapshotEvents.length} events to ${historyFile}`);

  return {
    scrapedCount: records.length,
    changed: changesDetected
  };
}

// Always execute when run as script
scrapeSIH()
  .then((res) => {
    console.log('Scrape run completed successfully.', res);
    process.exit(0);
  })
  .catch((err) => {
    console.error('Fatal scrape error:', err);
    process.exit(1);
  });

