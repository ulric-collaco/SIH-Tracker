import fs from 'node:fs';
import path from 'node:path';

const srcDir = path.resolve(process.cwd(), 'data');
const destDir = path.resolve(process.cwd(), 'public', 'data');

if (fs.existsSync(srcDir)) {
  fs.cpSync(srcDir, destDir, { recursive: true });
  console.log('Synchronized data/ to public/data/ successfully.');
}
