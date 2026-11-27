'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const { test } = require('node:test');

const prepare = path.join(__dirname, 'prepare-release.js');
const start = path.join(__dirname, 'start-release.sh');
function git(dir, ...args) {
  const result = spawnSync('git', args, { cwd: dir, encoding: 'utf8' });
  assert.equal(result.status, 0, result.stderr);
  return result.stdout.trim();
}
function fixture(t) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'xxhash-release-retry-'));
  t.after(() => fs.rmSync(dir, { recursive: true, force: true }));
  const repo = path.join(dir, 'work');
  const remote = path.join(dir, 'origin.git');
  const bin = path.join(dir, 'bin');
  fs.mkdirSync(repo);
  fs.mkdirSync(bin);
  const pkg = { name: 'xxhash-addon', version: '2.1.0' };
  fs.writeFileSync(path.join(repo, 'package.json'), JSON.stringify(pkg));
  fs.writeFileSync(path.join(repo, 'package-lock.json'), JSON.stringify({ ...pkg, packages: { '': pkg } }));
  fs.writeFileSync(path.join(repo, 'CHANGELOG.md'), '## Unreleased\n- Upgrade xxHash\n\n## v2.1.0\n- Previous release\n');
  fs.writeFileSync(path.join(repo, 'verified-source.c'), 'verified source\n');
  git(repo, 'init', '-b', 'master');
  git(repo, 'config', 'user.name', 'Release Test');
  git(repo, 'config', 'user.email', 'release-test@example.invalid');
  git(repo, 'add', '.');
  git(repo, 'commit', '-m', 'Verified source');
  git(repo, 'init', '--bare', remote);
  git(repo, 'remote', 'add', 'origin', remote);
  git(repo, 'push', 'origin', 'master');
  fs.writeFileSync(path.join(bin, 'gh'), `#!/usr/bin/env node
const fs = require('node:fs');
const args = process.argv.slice(2);
fs.appendFileSync(process.env.TEST_GH_LOG, JSON.stringify(args) + '\\n');
if (args[0] === 'pr' && args[1] === 'list' && fs.existsSync(process.env.TEST_PR)) console.log('https://github.com/test/repo/pull/1');
if (args[0] === 'pr' && args[1] === 'create') {
  if (process.env.FAIL_CREATE) process.exit(1);
  fs.writeFileSync(process.env.TEST_PR, 'open');
  console.log('https://github.com/test/repo/pull/1');
}
if (args[0] === 'pr' && args[1] === 'merge' && process.env.FAIL_MERGE) process.exit(1);
`, { mode: 0o755 });
  return { dir, repo, remote, env: { ...process.env, PATH: bin + path.delimiter + process.env.PATH, RELEASE_VERSION: '2.1.1', DRY_RUN: 'false', GITHUB_OUTPUT: path.join(dir, 'outputs'), GITHUB_STEP_SUMMARY: path.join(dir, 'summary'), GITHUB_SERVER_URL: 'https://github.com', GITHUB_REPOSITORY: 'test/repo', GITHUB_RUN_ID: '1', RUNNER_TEMP: dir, TEST_GH_LOG: path.join(dir, 'calls'), TEST_PR: path.join(dir, 'pr') } };
}
function run(f, extra = {}) {
  const result = spawnSync(process.execPath, [prepare, '2.1.1'], { cwd: f.repo, encoding: 'utf8' });
  assert.equal(result.status, 0, result.stderr);
  return spawnSync('bash', [start], { cwd: f.repo, env: { ...f.env, ...extra }, encoding: 'utf8' });
}
function retry(f) {
  const repo = path.join(f.dir, 'retry');
  git(f.dir, 'clone', '--branch', 'master', f.remote, repo);
  return { ...f, repo };
}
const calls = f => fs.readFileSync(f.env.TEST_GH_LOG, 'utf8').trim().split('\n').map(JSON.parse);
const head = f => git(f.dir, '--git-dir', f.remote, 'rev-parse', 'refs/heads/release/v2.1.1');

for (const failure of ['FAIL_CREATE', 'FAIL_MERGE']) {
  test(`retries ${failure} from a fresh checkout without replacing the existing commit or PR`, t => {
    const f = fixture(t);
    assert.notEqual(run(f, { [failure]: '1', GIT_COMMITTER_DATE: '2026-11-27T00:00:01Z' }).status, 0);
    const commit = head(f);
    const result = run(retry(f), { GIT_COMMITTER_DATE: '2026-11-27T00:00:02Z' });
    assert.equal(result.status, 0, result.stderr);
    assert.equal(head(f), commit);
    const log = calls(f);
    assert.equal(log.filter(args => args[0] === 'workflow').length, 1);
    assert.equal(log.filter(args => args[0] === 'pr' && args[1] === 'create').length, failure === 'FAIL_CREATE' ? 2 : 1);
    assert.equal(log.find(args => args[0] === 'pr' && args[1] === 'merge').at(-1), commit);
  });
}

for (const file of ['CHANGELOG.md', 'verified-source.c']) {
  test(`rejects an existing release branch with different ${file} without overwriting it`, t => {
    const f = fixture(t);
    assert.notEqual(run(f, { FAIL_CREATE: '1' }).status, 0);
    fs.appendFileSync(path.join(f.repo, file), 'Other changes\n');
    git(f.repo, 'add', file);
    git(f.repo, 'commit', '-m', 'Other changes');
    git(f.repo, 'push', 'origin', 'HEAD:refs/heads/release/v2.1.1');
    const commit = head(f);
    const before = calls(f);
    const result = run(retry(f));
    assert.notEqual(result.status, 0);
    assert.match(result.stdout, /differs from the expected release source and metadata/);
    assert.equal(head(f), commit);
    assert.deepEqual(calls(f), before);
  });
}
