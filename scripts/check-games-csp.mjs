import { execSync } from 'node:child_process';

function run(cmd) {
  return execSync(cmd, { encoding: 'utf8' }).trim();
}

function getStagedFiles() {
  const out = run('git diff --cached --name-only --diff-filter=ACMR');
  if (!out) return [];
  return out.split('\n').filter(Boolean);
}

function main() {
  const stagedFiles = getStagedFiles();
  const hasStagedGameHtml = stagedFiles.some((file) => /^public\/jeux\/[^/]+\.html$/.test(file));

  if (!hasStagedGameHtml) {
    process.exit(0);
  }

  execSync('npm run csp:hash-jeux', { stdio: 'ignore' });

  let hasUnstagedHtaccessChanges = false;
  try {
    execSync('git diff --quiet -- public/.htaccess');
  } catch {
    hasUnstagedHtaccessChanges = true;
  }

  if (!hasUnstagedHtaccessChanges) {
    process.exit(0);
  }

  console.error('\n[CSP jeux] Des fichiers public/jeux/*.html ont été modifiés.');
  console.error("[CSP jeux] Action requise avant commit :");
  console.error('  1) npm run csp:hash-jeux');
  console.error('  2) git add public/.htaccess');
  console.error('  3) relancer le commit\n');
  process.exit(1);
}

main();
