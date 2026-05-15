import { execSync } from 'node:child_process';
import { writeFileSync } from 'node:fs';

let sha = 'unknown';
try {
  sha = execSync('git rev-parse --short HEAD', { encoding: 'utf8' }).trim();
} catch {
  sha = process.env.BUILD_ID?.trim() || sha;
}

writeFileSync('.env.build', `NEXT_PUBLIC_BUILD_ID=${sha}\n`);
console.log(`[build-info] NEXT_PUBLIC_BUILD_ID=${sha}`);
