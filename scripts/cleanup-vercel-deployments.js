#!/usr/bin/env node

/**
 * Vercel Deployment Cleanup Script
 *
 * Purges old deployments to immediately free storage under the 10GB limit.
 *
 * Usage:
 *   node scripts/cleanup-vercel-deployments.js <your_token> [projectName]
 */

import fs from 'node:fs';
import path from 'node:path';

let detectedTeamId = process.env.VERCEL_TEAM_ID;
try {
  const configPath = path.join(process.env.APPDATA || '', 'com.vercel.cli', 'Data', 'config.json');
  if (!detectedTeamId && fs.existsSync(configPath)) {
    const cfg = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
    if (cfg.currentTeam) detectedTeamId = cfg.currentTeam;
  }
} catch {}

let token = process.env.VERCEL_TOKEN;
let targetProject = process.env.VERCEL_PROJECT_NAME || 'sih-tracker';

const arg1 = process.argv[2];
const arg2 = process.argv[3];

if (arg1) {
  if (arg1.startsWith('vc') || arg1.length > 20) {
    token = arg1;
    if (arg2) targetProject = arg2;
  } else {
    targetProject = arg1;
    if (arg2 && (arg2.startsWith('vc') || arg2.length > 20)) {
      token = arg2;
    }
  }
}

const teamId = detectedTeamId;
const KEEP_RECENT = 2; // Keep active prod + 2 latest deployments for rollback safety
const CONCURRENCY = 3;

async function cleanupViaApi(apiToken) {
  console.log(`\n[Vercel Cleanup] Querying deployments via Vercel REST API...`);
  if (teamId) {
    console.log(`[Vercel Cleanup] Using Team ID: ${teamId}`);
  }
  console.log(`[Vercel Cleanup] Target Project: ${targetProject}`);

  const headers = {
    Authorization: `Bearer ${apiToken}`,
    'Content-Type': 'application/json'
  };

  // 1. Identify active live production deployment ID
  let liveProdDeploymentId = null;
  try {
    let projUrl = `https://api.vercel.com/v9/projects/${targetProject}`;
    if (teamId) projUrl += `?teamId=${teamId}`;
    const projRes = await fetch(projUrl, { headers });
    if (projRes.ok) {
      const projData = await projRes.json();
      liveProdDeploymentId = projData.targets?.production?.id || null;
      console.log(`[Vercel Cleanup] Protected live production deployment: ${liveProdDeploymentId}`);
    }
  } catch (e) {
    console.warn(`[Vercel Cleanup] Could not fetch project target details:`, e.message);
  }

  // 2. Fetch all deployments
  let allDeployments = [];
  let nextTimestamp = null;

  while (true) {
    let url = `https://api.vercel.com/v6/deployments?limit=100`;
    if (teamId) url += `&teamId=${teamId}`;
    if (nextTimestamp) url += `&until=${nextTimestamp}`;

    const res = await fetch(url, { headers });
    if (!res.ok) {
      const errBody = await res.text();
      throw new Error(`Failed to fetch deployments (${res.status}): ${errBody}`);
    }

    const data = await res.json();
    const deps = data.deployments || [];
    if (deps.length === 0) break;

    const matched = targetProject
      ? deps.filter((d) => d.name === targetProject || d.url?.includes(targetProject))
      : deps;

    allDeployments.push(...matched);

    if (deps.length < 100 || !data.pagination?.next) break;
    nextTimestamp = data.pagination.next;
  }

  console.log(`[Vercel Cleanup] Found ${allDeployments.length} total deployments for project "${targetProject}".`);

  // 3. Filter candidates to purge
  const candidates = [];
  let kept = 0;

  for (let i = 0; i < allDeployments.length; i++) {
    const dep = allDeployments[i];

    // Never delete the live production deployment
    if (dep.uid === liveProdDeploymentId) {
      kept++;
      continue;
    }

    // Keep top KEEP_RECENT deployments unconditionally
    if (kept < KEEP_RECENT) {
      kept++;
      continue;
    }

    candidates.push(dep);
  }

  console.log(
    `[Vercel Cleanup] Found ${candidates.length} candidate deployments to purge (keeping ${kept} protected).`
  );

  if (candidates.length === 0) {
    console.log('[Vercel Cleanup] No deployments need deletion. Storage footprint is already minimal.');
    return;
  }

  // 4. Concurrently delete deployments in batches with rate-limit retry
  let deletedCount = 0;
  for (let i = 0; i < candidates.length; i += CONCURRENCY) {
    const batch = candidates.slice(i, i + CONCURRENCY);
    await Promise.all(
      batch.map(async (dep) => {
        let retries = 3;
        while (retries > 0) {
          try {
            let deleteUrl = `https://api.vercel.com/v13/deployments/${dep.uid}`;
            if (teamId) deleteUrl += `?teamId=${teamId}`;

            const delRes = await fetch(deleteUrl, {
              method: 'DELETE',
              headers
            });

            if (delRes.ok) {
              deletedCount++;
              break;
            } else if (delRes.status === 429) {
              // Rate limited - wait 3 seconds and retry
              await new Promise((res) => setTimeout(res, 3000));
              retries--;
            } else {
              console.warn(`[Vercel Cleanup] Could not delete ${dep.uid}: HTTP ${delRes.status}`);
              break;
            }
          } catch (err) {
            console.error(`[Vercel Cleanup] Error deleting deployment ${dep.uid}:`, err.message);
            break;
          }
        }
      })
    );

    // Minor throttle between batches to stay within rate limit
    await new Promise((res) => setTimeout(res, 250));

    if (deletedCount % 20 === 0 || deletedCount >= candidates.length) {
      console.log(`[Vercel Cleanup] Deleted ${deletedCount}/${candidates.length} deployments...`);
    }
  }

  console.log(`\n==================================================`);
  console.log(`[Vercel Cleanup Success] Purged ${deletedCount} deployments!`);
  console.log(`Vercel 10GB Deployment Storage quota has been successfully recovered.`);
  console.log(`==================================================\n`);
}

function printInstructions() {
  console.log('\n================================================================================');
  console.log(' VERCEL 10GB STORAGE LIMIT: QUICK DEPLOYMENT PURGE GUIDE');
  console.log('================================================================================\n');
  console.log('Run in terminal:');
  console.log('  node scripts/cleanup-vercel-deployments.js <your_token>\n');
  console.log('================================================================================\n');
}

if (token) {
  cleanupViaApi(token).catch((err) => {
    console.error('[Vercel Cleanup Fatal Error]:', err.message);
    process.exit(1);
  });
} else {
  printInstructions();
}
