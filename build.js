import fs from 'node:fs';
import { execSync } from 'node:child_process';

if (fs.existsSync('dist/index.html')) {
  console.log('✓ Front déjà pré-compilé dans dist/. Étape de build passée.');
} else {
  console.log('Compilation du front avec Vite...');
  execSync('npx vite build', { stdio: 'inherit' });
}
