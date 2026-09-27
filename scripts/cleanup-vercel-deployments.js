#!/usr/bin/env node

/**
 * Vercel Deployment Cleanup Script
 *
 * Purges old non-production deployments to immediately free storage under the 10GB limit.
 *
 * Usage:
 *   node scripts/cleanup-vercel-deployments.js <your_token>
 *   Or:
 *   $env:VERCEL_TOKEN="your_token"; npm run vercel:cleanup
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

// Token can be passed as 1st argument (e.g. starting with vc) or via VERCEL_TOKEN env var
let token = process.env.VERCEL_TOKEN;
let targetProject = process.env.VERCEL_PROJECT_NAME || 'sih-2026-tracker';

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
const KEEP_RECENT = 3; // Keep the N most recent deployments for safety

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

    // Filter for the specific project if specified
    const matched = targetProject
      ? deps.filter((d) => d.name === targetProject || d.url?.includes(targetProject))
      : deps;

    allDeployments.push(...matched);

    if (deps.length < 100 || !data.pagination?.next) break;
    nextTimestamp = data.pagination.next;
  }

  console.log(`[Vercel Cleanup] Found ${allDeployments.length} total deployments for project "${targetProject}".`);

  // Keep the active production deployment and the N latest deployments
  const nonProductionOrOld = [];
  let kept = 0;

  for (let i = 0; i < allDeployments.length; i++) {
    const dep = allDeployments[i];
    const isTargetProd = dep.target === 'production';

    // Keep the top KEEP_RECENT deployments unconditionally
    if (kept < KEEP_RECENT) {
      kept++;
      continue;
    }

    // Never delete an active production deployment
    if (isTargetProd && dep.state === 'READY') {
      continue;
    }

    nonProductionOrOld.push(dep);
  }

  console.log(
    `[Vercel Cleanup] Found ${nonProductionOrOld.length} candidate deployments to purge (keeping ${kept} latest).`
  );

  if (nonProductionOrOld.length === 0) {
    console.log('[Vercel Cleanup] No deployments need deletion. Storage footprint is already minimal.');
    return;
  }

  let deletedCount = 0;
  for (const dep of nonProductionOrOld) {
    try {
      let deleteUrl = `https://api.vercel.com/v13/deployments/${dep.uid}`;
      if (teamId) deleteUrl += `?teamId=${teamId}`;

      const delRes = await fetch(deleteUrl, {
        method: 'DELETE',
        headers
      });

      if (delRes.ok) {
        deletedCount++;
        if (deletedCount % 10 === 0 || deletedCount === nonProductionOrOld.length) {
          console.log(`[Vercel Cleanup] Deleted ${deletedCount}/${nonProductionOrOld.length} deployments...`);
        }
      } else {
        console.warn(`[Vercel Cleanup] Could not delete ${dep.uid} (${dep.url}): HTTP ${delRes.status}`);
      }
    } catch (err) {
      console.error(`[Vercel Cleanup] Error deleting deployment ${dep.uid}:`, err.message);
    }
  }

  console.log(`\n==================================================`);
  console.log(`[Vercel Cleanup Success] Purged ${deletedCount} deployments.`);
  console.log(`Check your Vercel dashboard: Usage -> Deployment Storage should drop dramatically!`);
  console.log(`==================================================\n`);
}

function printInstructions() {
  console.log('\n================================================================================');
  console.log(' VERCEL 10GB STORAGE LIMIT: QUICK DEPLOYMENT PURGE GUIDE');
  console.log('================================================================================\n');
  console.log('To clean up old deployments and immediately recover your 10GB storage quota:\n');
  console.log('Option 1 (Automated 1-Command Purge via API Token):');
  console.log('  1. Create a personal token at: https://vercel.com/account/tokens');
  console.log('  2. Run in terminal:');
  console.log('     node scripts/cleanup-vercel-deployments.js <your_token>\n');
  console.log('Option 2 (Set Retention Policy in Vercel Dashboard):');
  console.log('  1. Go to https://vercel.com -> Your Project -> Settings -> General');
  console.log('  2. Scroll to "Deployment Retention"');
  console.log('  3. Change "Preview Deployments" and "Canceled Deployments" to 1 day.');
  console.log('  4. Vercel automatically cleans up older deployments.\n');
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
