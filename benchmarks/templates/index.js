var fs = require('fs'),
    path = require('path'),
    watch = require('watch'),
    Q = require('q');

exports.load = function(file) {
  var defer = Q.defer(),
      filesLoaded = Q.defer();

  filesLoaded.promise.then(function(files) {
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
      defer.reject(e);
      return;
    }

    defer.resolve(templates);
  });

  if (!file) {
   watch.walk(__dirname + '/', function(err, files) {
      if (err) {
        filesLoaded.reject(err);
      } else {
        filesLoaded.resolve(Object.keys(files));
      }
    });
  } else {
    filesLoaded.resolve([file]);
  }

  return defer.promise;
};
