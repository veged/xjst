var common = exports,
    path = require('path'),
    fs = require('fs'),
    xjst = require('../../lib/xjst');

common.render = function(name) {
  var filename = path.resolve(__dirname + '/../templates/' + name),
      template = fs.readFileSync(filename + '.xjst').toString();

  return xjst.compile(template, name);
};
