import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';

const lockFilePath = path.join(process.cwd(), 'package-lock.json');

console.log('Removing corrupted package-lock.json...');
try {
  if (fs.existsSync(lockFilePath)) {
    fs.unlinkSync(lockFilePath);
    console.log('Removed package-lock.json');
  }
} catch (error) {
  console.error('Error removing lock file:', error.message);
  process.exit(1);
}

console.log('Regenerating lock file with npm install...');
try {
  execSync('npm install', { stdio: 'inherit', cwd: process.cwd() });
  console.log('Successfully regenerated package-lock.json');
} catch (error) {
  console.error('Error running npm install:', error.message);
  process.exit(1);
}
