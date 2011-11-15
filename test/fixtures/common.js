var common = exports,
    assert = require('assert'),
    path = require('path'),
    fs = require('fs'),
    xjst = require('../../lib/xjst');

common.render = function(name) {
  var filename = path.resolve(__dirname + '/../templates/' + name),
      template = fs.readFileSync(filename + '.xjst').toString();

  var sg = xjst.compile(template, name, { engine: 'sort-group' }),
      fg = xjst.compile(template, name, { engine: 'fullgen' });

  fg.apply.call = function(context) {
    var results = [
      sg.apply.call(context),
      fg.apply.apply(context)
    ];

    assert.deepEqual(results[0], results[1]);

    return results[0];
  };

  return fg;
};
