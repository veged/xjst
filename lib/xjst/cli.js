var xjst = require('../xjst'),
    q = require('q'),
    fs = require('fs');

//
// ### function run (options)
// #### @options {Object} Compiler options
// Compiles input stream or file and writes result to output stream or file
//
exports.run = function run(options) {
  var input = [],
      deferred = q.defer();

  options.input.on('data', function(chunk) {
    input.push(chunk);
  });

  options.input.once('end', function() {
    finish(input.join(''));
  });

  options.input.resume();

  function finish(source) {
    var out = xjst.generate(source, options);

    options.output.write(out);

    if (options.output === process.stdout) {
      options.output.write('\n');
    } else {
      options.output.end();
    }

    deferred.resolve();
  }

  return deferred.promise;
};
