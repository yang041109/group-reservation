import { execSync } from 'node:child_process';
import { writeFileSync } from 'node:fs';

let sha = process.env.NEXT_PUBLIC_BUILD_ID?.trim() || process.env.BUILD_ID?.trim() || '';
if (!sha) {
  try {
    sha = execSync('git rev-parse --short HEAD', { encoding: 'utf8', timeout: 3000 }).trim();
  } catch {
    sha = 'unknown';
  }
}

writeFileSync('.env.build', `NEXT_PUBLIC_BUILD_ID=${sha}\n`);
console.log(`[build-info] NEXT_PUBLIC_BUILD_ID=${sha}`);
