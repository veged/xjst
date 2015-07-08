var Q = require('q');
var fs = require('fs');
var xjst = require('../..');

var cache = {};

module.exports = function (filePath, options, callback) {
  Q(true)
    .then(function () {
      if (cache.hasOwnProperty(filePath)) {
        return cache[filePath];
      }
      return Q.nfcall(fs.readFile, filePath).then(function (data) {
        // no promise.tap, so just passing the same data
        return cache[filePath] = data;
      });
    })
    .then(function (data) {
      return xjst.compile(data, filePath).apply(options);
    })
    .nodeify(callback);
};
