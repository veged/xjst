var xjst = require('../xjst');

exports.run = function run(options) {
  var input = [];

  options.input.on('data', function(chunk) {
    input.push(chunk);
  });

  options.input.once('end', function() {
    options.output.write(xjst.generate(xjst.parse(input.join(''))));
    options.output.end('\n');
  });
};
