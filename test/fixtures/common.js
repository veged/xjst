var common = exports,
    assert = require('assert'),
    path = require('path'),
    fs = require('fs'),
    xjst = require('../../lib/xjst');

common.render = function(name, options) {
  options || (options = {});

  var filename = path.resolve(__dirname + '/../templates/' + name),
      template = fs.readFileSync(filename + '.xjst').toString();

  var sg = xjst.compile(template, name, {
        engine: 'sort-group',
        merge: options.merge
      }),
      fg = xjst.compile(template, name, {
        engine: 'fullgen',
        merge: options.merge
      });

  var apply = fg.apply;

  fg.apply = {
    call: function(context) {
      fg.apply = apply;

      var results = [
        sg.apply.call(context),
        fg.apply.call(context)
      ];

      assert.deepEqual(results[0], results[1]);

      return results[0];
    }
  };

  return fg;
};
