#!/usr/bin/env node

/**
 * Vercel Deployment Cleanup Script
 *
 * Purges old non-production deployments to immediately free storage under the 10GB limit.
 *
 * Usage:
 *   $env:VERCEL_TOKEN="your_token_here"; npm run vercel:cleanup
 *   Or (Linux / macOS):
 *   VERCEL_TOKEN="your_token_here" npm run vercel:cleanup
 */

const token = process.env.VERCEL_TOKEN;
const teamId = process.env.VERCEL_TEAM_ID;
const targetProject = process.argv[2] || process.env.VERCEL_PROJECT_NAME || 'sih-2026-tracker';
const KEEP_RECENT = 3; // Keep the N most recent deployments for safety

async function cleanupViaApi(apiToken) {
  console.log(`\n[Vercel Cleanup] Querying deployments via Vercel REST API...`);
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
  console.log('  2. Run in PowerShell:');
  console.log('     $env:VERCEL_TOKEN="your_token_here"; npm run vercel:cleanup\n');
  console.log('Option 2 (Set Retention Policy in Vercel Dashboard):');
  console.log('  1. Go to https://vercel.com -> Your Project -> Settings -> General');
  console.log('  2. Scroll to "Deployment Retention"');
  console.log('  3. Change "Preview Deployments" and "Canceled Deployments" to 1 day.');
  console.log('  4. Vercel automatically cleans up older deployments.\n');
  console.log('Option 3 (Delete from Vercel Web Dashboard):');
  console.log('  1. Go to your Project -> Deployments tab');
  console.log('  2. Filter by status or branch and delete older deployments via the three-dots menu (...).\n');
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
