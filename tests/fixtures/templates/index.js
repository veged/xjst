var fs = require('fs'),
    path = require('path'),
    watch = require('watch');

exports.load = function(callback) {
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
      return callback(e);
    }

    callback(null, templates);
  });
};
