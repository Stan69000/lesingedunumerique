import fs from 'node:fs';
import crypto from 'node:crypto';
import path from 'node:path';

const ROOT_HTACCESS = 'public/.htaccess';
const GAMES_DIR = 'public/jeux';

function sha256Source(value) {
  return `'sha256-${crypto.createHash('sha256').update(value, 'utf8').digest('base64')}'`;
}

function collectHashes() {
  const scriptHashes = new Set();
  const attrHashes = new Set();
  const gameFiles = fs.readdirSync(GAMES_DIR)
    .filter((fileName) => fileName.endsWith('.html'))
    .map((fileName) => path.join(GAMES_DIR, fileName))
    .sort();

  if (gameFiles.length === 0) {
    throw new Error(`No .html game files found in ${GAMES_DIR}`);
  }

  for (const filePath of gameFiles) {
    const html = fs.readFileSync(filePath, 'utf8');

    const scriptRe = /<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/gi;
    let match;
    while ((match = scriptRe.exec(html)) !== null) {
      scriptHashes.add(sha256Source(match[1]));
    }

    const attrRe = /\son[a-z]+\s*=\s*"([^"]*)"/gi;
    while ((match = attrRe.exec(html)) !== null) {
      attrHashes.add(sha256Source(match[1]));
    }
  }

  return {
    files: gameFiles,
    script: [...scriptHashes].sort(),
    attr: [...attrHashes].sort(),
  };
}

function buildGamesPolicy({ script, attr }) {
  const scriptSrc = [`'self'`, ...script].join(' ');
  const scriptSrcAttr = attr.join(' ');

  return [
    "default-src 'self'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'self'",
    "object-src 'none'",
    "img-src 'self' data: https:",
    `script-src ${scriptSrc}`,
    `script-src-attr ${scriptSrcAttr}`,
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    "font-src 'self' data: https://fonts.gstatic.com",
    "connect-src 'self'",
    "frame-src 'self'",
    'upgrade-insecure-requests',
  ].join('; ');
}

function updateHtaccess(policy) {
  const text = fs.readFileSync(ROOT_HTACCESS, 'utf8');

  const lineRe = /(Header always set Content-Security-Policy ")(.*?)(" "expr=%\{env:IS_GAME_PAGE\} == '1'")/;
  if (!lineRe.test(text)) {
    throw new Error('CSP line for game pages not found in public/.htaccess');
  }

  const updated = text.replace(lineRe, `$1${policy}$3`);
  fs.writeFileSync(ROOT_HTACCESS, updated);
}

function main() {
  const hashes = collectHashes();
  const policy = buildGamesPolicy(hashes);
  updateHtaccess(policy);

  console.log(`Updated games CSP in ${ROOT_HTACCESS}`);
  console.log(`- game files: ${hashes.files.length}`);
  console.log(`- script hashes: ${hashes.script.length}`);
  console.log(`- script-src-attr hashes: ${hashes.attr.length}`);
}

main();
