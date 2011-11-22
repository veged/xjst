var xjst = require('../xjst'),
    fs = require('fs');

//
// ### function run (options)
// #### @options {Object} Compiler options
// Compiles input stream or file and writes result to output stream or file
//
exports.run = function run(options) {
  var input = [];

  if (typeof options.input === 'string') {
    return finish(fs.readFileSync(options.input).toString());
  }

  options.input.on('data', function(chunk) {
    input.push(chunk);
  });

  options.input.once('end', function() {
    finish(input.join(''));
  });

  function finish(source) {
    var out = xjst.generate(xjst.parse(source), options);

    if (typeof options.output === 'string') {
      fs.writeFileSync(options.output, out);
    } else {
      options.output.write(out);

      if (options.output === process.stdout) {
        options.output.write('\n');
      } else {
        options.output.end();
      }
    }
  }
};
