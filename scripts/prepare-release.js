'use strict';

const fs = require('node:fs');

const version = process.argv[2];
const stableVersion = /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)$/;
if (!stableVersion.test(version || '') || !version.split('.').every(n => Number.isSafeInteger(Number(n)))) {
  throw new Error('Enter a stable version such as 2.1.1, without a v prefix.');
}

const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'));
const lock = JSON.parse(fs.readFileSync('package-lock.json', 'utf8'));
const changelog = fs.readFileSync('CHANGELOG.md', 'utf8');
if (!stableVersion.test(pkg.version) || lock.version !== pkg.version || lock.packages?.['']?.version !== pkg.version) {
  throw new Error('Package and lockfile versions must agree before preparing a release.');
}
const current = pkg.version.split('.').map(Number);
const difference = version.split('.').map((n, i) => Number(n) - current[i]).find(n => n !== 0) || 0;
if (difference < 0) throw new Error('The release version must not be older than package.json.');

const newline = changelog.includes('\r\n') ? '\r\n' : '\n';
const marker = `## Unreleased${newline}`;
if (!changelog.startsWith(marker)) throw new Error('CHANGELOG.md must start with an Unreleased section.');
const notes = changelog.slice(marker.length).split(/^## /m, 1)[0];
const history = changelog.slice(marker.length + notes.length);
const heading = `## v${version}`;
if (difference === 0) {
  if (notes.trim() || !history.startsWith(heading + newline)) {
    throw new Error('This version is not a prepared release with an empty Unreleased section.');
  }
  console.log(`Release v${version} is already prepared.`);
} else {
  if (!/^\s*[-*] /m.test(notes)) throw new Error('Add release notes under Unreleased before releasing.');
  if (changelog.split(/\r?\n/).includes(heading)) throw new Error('This version already appears in CHANGELOG.md.');
  pkg.version = lock.version = lock.packages[''].version = version;
  fs.writeFileSync('package.json', JSON.stringify(pkg, null, 2) + '\n');
  fs.writeFileSync('package-lock.json', JSON.stringify(lock, null, 2) + '\n');
  fs.writeFileSync('CHANGELOG.md', changelog.replace(marker, `${marker}${newline}${heading}${newline}`));
  console.log(`Prepared v${version} in package.json, package-lock.json and CHANGELOG.md.`);
}
