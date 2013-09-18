var fs = require('fs'),
    path = require('path'),
    watch = require('watch'),
    Q = require('q');

function loadExt(filename, extension) {
  var parsers = {
        js: function(content) {
          return require(filename);
        },
        json: function(content) {
          return JSON.parse(content);
        },
        html: function(content) {
          return content;
        }
      },
      content;

  try {
    content = fs.readFileSync(filename + '.' + extension).toString();

    return parsers[extension] ? parsers[extension](content) : content;
  } catch (e) {
  }
};

exports.load = function(file) {
  var defer = Q.defer(),
      filesLoaded = Q.defer(),
      extension = /\.[^.]*$/;

  filesLoaded.promise.then(function(files) {
    var templates = {};
    files.forEach(function(filename) {
      var basename = path.basename(filename),
          template = {};

      template.js = loadExt(filename, 'js');
      template.xjst = loadExt(filename, 'xjst');
      template.data = loadExt(filename, 'json') || {};
      template.html = loadExt(filename, 'html') || null;
      try {
        if (!template.html && template.js)
          template.html = template.js.apply.call(template.data);
      } catch (e) {
        console.log(e);
      }

      templates[basename.replace(/-/g, ' ')] = template;
    });

    defer.resolve(templates);
  });

  if (!file) {
    watch.walk(__dirname + '/templates/', function(err, files) {
      if (err) {
        filesLoaded.reject(err);
      } else {
        filesLoaded.resolve(Object.keys(files).filter(function(filename) {
          return /\.(xjst|js)$/.test(filename);
        }).map(function(filename) {
          return filename.replace(extension, '');
        }));
      }
    });
  } else {
    filesLoaded.resolve([file.replace(extension, '')])
  }

  return defer.promise;
};
