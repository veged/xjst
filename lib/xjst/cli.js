var fs = require('fs'),
    xjst = require('../xjst');

exports.run = function run(argv) {
    var options = {};

    options.input = argv.input || argv.i;
    options.output = argv.output || arv.o;

    if (argv.h || argv.help) {
      console.log([
          'Usage: xjst [options]',
          '',
          'Options:',
          '  -i, --input : pecifies filename to read the input source, if omit use STDIN',
          '  -o, --output : specifies filename to write the output, if omit use STDOUT',
          '  -h, --help : Output help information'
      ].join('\n'));
      return;
    }

    // Initialize input stream
    if (options.input) {
      options.input = fs.createReadStream(options.input);
    } else {
      options.input = process.stdin;
    }

    // Initialize output stream
    if (options.output) {
      options.output = fs.createWriteStream(options.output);
    } else {
      options.output = process.stdout;
    }

    /*
    error = function(m, i) {
        throw { errorPos: i, toString: function(){ return "match failed" } }
    },
    e.errorPos != undefined &&
        sys.error(
            Array(30).join('-') + '\n' +
            input.slice(0, e.errorPos) +
            "\n--- Parse error ->" +
            input.slice(e.errorPos) + '\n' +
            Array(30).join('-'));
    sys.error(e);
    throw e
    */
};

exports.process = function process(options) {
  var input = [];

  options.input.on('data', function(chunk) {
    input.push(chunk);
  });

  options.input.on('end', function() {
    options.output.write(xjst.compile(input.join('')));
    options.output.end('\n');
  });
};
