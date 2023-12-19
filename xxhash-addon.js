try {
  var addon = require('./build/Release/addon');
} catch (e) {
  if (e.code !== 'MODULE_NOT_FOUND') throw e;
  var addon = require('./build/Debug/addon');
}

module.exports = addon;
