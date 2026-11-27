'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const { test } = require('node:test');

const script = path.join(__dirname, 'prepare-release.js');
const files = ['package.json', 'package-lock.json', 'CHANGELOG.md'];
function fixture(t) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'xxhash-release-test-'));
  t.after(() => fs.rmSync(dir, { recursive: true, force: true }));
  const pkg = { name: 'xxhash-addon', version: '2.1.0', dependencies: { 'node-gyp-build': '^4.8.0' } };
  const lock = { name: pkg.name, version: pkg.version, lockfileVersion: 2, packages: { '': pkg, 'node_modules/node-gyp-build': { version: '4.8.4', integrity: 'unchanged' } } };
  fs.writeFileSync(path.join(dir, files[0]), JSON.stringify(pkg, null, 2) + '\n');
  fs.writeFileSync(path.join(dir, files[1]), JSON.stringify(lock, null, 2) + '\n');
  fs.writeFileSync(path.join(dir, files[2]), '## Unreleased\n### Dependencies\n- Upgrade xxHash\n\n## v2.1.0\n- Previous release\n');
  return dir;
}
const read = dir => files.map(file => fs.readFileSync(path.join(dir, file), 'utf8'));
const run = (dir, version) => spawnSync(process.execPath, [script, version], { cwd: dir, encoding: 'utf8' });

test('prepares all version fields and release notes, preserves dependencies, and can resume', t => {
  const dir = fixture(t);
  const before = read(dir);
  const result = run(dir, '2.1.1');
  assert.equal(result.status, 0, result.stderr);
  const after = read(dir);
  assert.equal(JSON.parse(after[0]).version, '2.1.1');
  const lock = JSON.parse(after[1]);
  assert.equal(lock.version, '2.1.1');
  assert.equal(lock.packages[''].version, '2.1.1');
  assert.deepEqual(lock.packages['node_modules/node-gyp-build'], JSON.parse(before[1]).packages['node_modules/node-gyp-build']);
  assert.equal(after[2], before[2].replace('## Unreleased\n', '## Unreleased\n\n## v2.1.1\n'));
  assert.equal(run(dir, '2.1.1').status, 0);
  assert.deepEqual(read(dir), after);
});

test('preserves CRLF changelog notes and resumes without changes', t => {
  const dir = fixture(t);
  const changelog = path.join(dir, 'CHANGELOG.md');
  fs.writeFileSync(changelog, fs.readFileSync(changelog, 'utf8').replace(/\n/g, '\r\n'));
  assert.equal(run(dir, '2.1.1').status, 0);
  const after = read(dir);
  assert.match(after[2], /^## Unreleased\r\n\r\n## v2\.1\.1\r\n/);
  assert.equal(run(dir, '2.1.1').status, 0);
  assert.deepEqual(read(dir), after);
});

for (const version of ['2.10.0', '3.0.0']) {
  test(`accepts ${version} using numeric version ordering`, t => {
    const dir = fixture(t);
    assert.equal(run(dir, version).status, 0);
    assert.equal(JSON.parse(read(dir)[0]).version, version);
  });
}

for (const version of ['2.0.9', '2.1.0', 'v2.1.1', '2.01.1', '2.1.1-beta.1', '2.1.1; echo unsafe', '9007199254740992.0.0']) {
  test(`rejects ${JSON.stringify(version)} without modifying files`, t => {
    const dir = fixture(t);
    const before = read(dir);
    assert.notEqual(run(dir, version).status, 0);
    assert.deepEqual(read(dir), before);
  });
}

for (const invalid of ['missing notes', 'missing section', 'duplicate version', 'lockfile mismatch']) {
  test(`rejects ${invalid} without partially updating metadata`, t => {
    const dir = fixture(t);
    if (invalid === 'missing notes') fs.writeFileSync(path.join(dir, files[2]), '## Unreleased\n\n## v2.1.0\n- Old notes\n');
    if (invalid === 'missing section') fs.writeFileSync(path.join(dir, files[2]), '## v2.1.0\n- Old notes\n');
    if (invalid === 'duplicate version') fs.appendFileSync(path.join(dir, files[2]), '\n## v2.1.1\n- Already released\n');
    if (invalid === 'lockfile mismatch') {
      const lock = JSON.parse(fs.readFileSync(path.join(dir, files[1]), 'utf8'));
      lock.packages[''].version = '2.0.0';
      fs.writeFileSync(path.join(dir, files[1]), JSON.stringify(lock));
    }
    const before = read(dir);
    assert.notEqual(run(dir, '2.1.1').status, 0);
    assert.deepEqual(read(dir), before);
  });
}
