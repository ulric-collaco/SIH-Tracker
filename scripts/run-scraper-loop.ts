import { execSync } from 'node:child_process';

const INTERVAL_MS = 30 * 60 * 1000; // 30 minutes
const MAX_TOTAL_RUNTIME_MS = 4 * 60 * 60 * 1000; // 4 hours per runner job
const startTime = Date.now();

function getNextBoundary(): { nextTarget: number; waitMs: number; nextIST: string } {
  const now = Date.now();
  // Ensure target is at least 5 seconds into the future
  const nextTarget = Math.ceil((now + 5000) / INTERVAL_MS) * INTERVAL_MS;
  const waitMs = nextTarget - now;
  const nextIST = new Date(nextTarget).toLocaleTimeString('en-US', {
    timeZone: 'Asia/Kolkata',
    hour: 'numeric',
    minute: '2-digit',
    second: '2-digit',
    hour12: true
  });
  return { nextTarget, waitMs, nextIST };
}

function runSingleCycle(cycleNum: number) {
  const currentIST = new Date().toLocaleTimeString('en-US', {
    timeZone: 'Asia/Kolkata',
    hour: 'numeric',
    minute: '2-digit',
    second: '2-digit',
    hour12: true
  });
  console.log(`\n==================================================`);
  console.log(`[Cycle #${cycleNum}] Starting Scrape at ${currentIST} IST`);
  console.log(`==================================================`);

  try {
    // 1. Scrape SIH portal
    console.log('\n[1/3] Running scraper...');
    execSync('npm run scrape', { stdio: 'inherit' });

    // 2. Sync to public data directory
    console.log('\n[2/3] Syncing public data...');
    execSync('node scripts/sync-public-data.js', { stdio: 'inherit' });

    // 3. Commit and push if changes detected
    console.log('\n[3/3] Checking for git changes...');
    const status = execSync('git status --porcelain data/ public/data/', {
      encoding: 'utf-8'
    }).trim();

    if (status) {
      console.log('Data changes detected. Committing and pushing...');
      execSync('git add data/ public/data/', { stdio: 'inherit' });
      execSync('git commit -m "chore(data): auto-update SIH 2026 problem statements"', {
        stdio: 'inherit'
      });
      // Pull rebase to handle any potential concurrent commits cleanly
      execSync('git pull --rebase origin main', { stdio: 'inherit' });
      execSync('git push origin main', { stdio: 'inherit' });
      console.log('Push complete. Data updated successfully.');
    } else {
      console.log('No data changes detected in this cycle. Skipping commit.');
    }
  } catch (err: any) {
    console.error(`Error during cycle #${cycleNum}:`, err.message || err);
    console.log('Cycle error caught. Continuing loop to next scheduled interval.');
  }
}

async function startLoop() {
  console.log('Initializing SIH 2026 30-Minute Continuous Scraper Loop...');
  console.log(`Max job duration: ${MAX_TOTAL_RUNTIME_MS / (60 * 60 * 1000)} hours`);

  let cycle = 1;

  while (true) {
    // Execute scrape for current cycle
    runSingleCycle(cycle);

    // Check if remaining time allows another cycle
    const elapsedMs = Date.now() - startTime;
    if (elapsedMs >= MAX_TOTAL_RUNTIME_MS) {
      console.log(
        `\n[Loop Complete] Job runtime reached ${(elapsedMs / (60 * 60 * 1000)).toFixed(2)} hours.`
      );
      console.log('Exiting cleanly. Next scheduled runner will take over seamlessly.');
      break;
    }

    // Calculate exact sleep to the next wall-clock :00 or :30 minute mark
    const { waitMs, nextIST } = getNextBoundary();
    const waitSec = Math.round(waitMs / 1000);
    const waitMin = (waitMs / 60000).toFixed(1);

    console.log(`\nNext scrape scheduled at: ${nextIST} IST`);
    console.log(`Sleeping for ${waitSec}s (${waitMin} min) to align precisely with 30m boundary...`);

    await new Promise((resolve) => setTimeout(resolve, waitMs));
    cycle++;
  }
}

startLoop().catch((err) => {
  console.error('Fatal error in scraper loop:', err);
  process.exit(1);
});
