import { execSync } from 'child_process';
import { unlinkSync, existsSync } from 'fs';
import { resolve } from 'path';

const projectDir = '/vercel/share/v0-project';
const lockFilePath = resolve(projectDir, 'package-lock.json');

try {
  console.log('[v0] Regenerating package-lock.json...');
  
  // Remove old lock file if it exists
  if (existsSync(lockFilePath)) {
    unlinkSync(lockFilePath);
    console.log('[v0] Removed old lock file');
  }

  // Run npm install to create a fresh lock file
  console.log('[v0] Running npm install...');
  execSync('npm install', { 
    cwd: projectDir,
    stdio: 'inherit'
  });

  console.log('[v0] Lock file regenerated successfully!');
} catch (error) {
  console.error('[v0] Error regenerating lock file:', error.message);
  process.exit(1);
}
