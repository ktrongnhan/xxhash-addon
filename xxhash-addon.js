const binding = require('node-gyp-build')(__dirname);

exports.XXHash32 = binding.XXHash32;
exports.XXHash64 = binding.XXHash64;
exports.XXHash3 = binding.XXHash3;
exports.XXHash128 = binding.XXHash128;
