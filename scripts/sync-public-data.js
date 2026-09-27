import fs from 'node:fs';
import path from 'node:path';

const srcDir = path.resolve(process.cwd(), 'data');
const destDir = path.resolve(process.cwd(), 'public', 'data');

if (fs.existsSync(srcDir)) {
  if (!fs.existsSync(destDir)) {
    fs.mkdirSync(destDir, { recursive: true });
  }

  // Clean up legacy history directory from public/data if present
  const legacyHistoryDir = path.resolve(destDir, 'history');
  if (fs.existsSync(legacyHistoryDir)) {
    fs.rmSync(legacyHistoryDir, { recursive: true, force: true });
  }

  // Only copy essential production JSON files (exclude raw history/ directory)
  const filesToSync = ['latest.json', 'ps-changelog.json', 'snapshots.json'];
  for (const file of filesToSync) {
    const srcFile = path.resolve(srcDir, file);
    const destFile = path.resolve(destDir, file);
    if (fs.existsSync(srcFile)) {
      fs.copyFileSync(srcFile, destFile);
    }
  }

  console.log('Synchronized essential data files to public/data/ successfully.');
}
