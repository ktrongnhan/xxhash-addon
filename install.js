'use strict';

try {
  // Try to load the addon -- works if a prebuild or previous build exists AND is loadable
  require('node-gyp-build')(__dirname);
} catch (_) {
  // Prebuild missing or broken (wrong glibc, corrupt, etc.) -- compile from source
  var result = require('child_process').spawnSync(
    'node-gyp', ['rebuild', '--jobs', 'max'],
    { stdio: 'inherit', cwd: __dirname, shell: true }
  );
  process.exit(result.status != null ? result.status : 1);
}
