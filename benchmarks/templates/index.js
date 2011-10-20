var fs = require('fs'),
    path = require('path'),
    watch = require('watch'),
    Q = require('q');

exports.load = function() {
  var defer = Q.defer();

  watch.walk(__dirname + '/', function(err, files) {
    files = Object.keys(files);

    var templates = {};
    try {
      files.filter(function(filename) {
        return /\.xjst$/.test(filename);
      }).forEach(function(filename) {
        var basename = path.basename(filename).replace(/\.xjst$/, '');

        templates[basename.replace(/-/g, ' ')] = {
          xjst: fs.readFileSync(filename).toString(),
          data: JSON.parse(
              fs.readFileSync(filename.replace(/\.xjst$/, '.json')).toString()
          )
        };
      });
    } catch (e) {
      return defer.reject(e);
    }

    return defer.resolve(templates);
  });

  return defer.promise;
};
