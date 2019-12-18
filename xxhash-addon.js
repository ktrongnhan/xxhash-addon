const addon = require('./build/Release/addon');
const XXHash32 = addon.XXHash32,
      XXHash64 = addon.XXHash64,
      XXHash3  = addon.XXHash3;
module.exports = {
  XXHash32,
  XXHash64,
  XXHash3,
};