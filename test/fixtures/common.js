var common = exports,
    assert = require('assert'),
    path = require('path'),
    fs = require('fs'),
    xjst = require('../../lib/xjst');

common.render = function(name, options) {
  options || (options = {});

  var filename = path.resolve(__dirname + '/../templates/' + name) + '.xjst',
      template = fs.readFileSync(filename).toString();

  var ng = xjst.compile(template, filename, {
        'no-opt': true,
        merge: options.merge
      }),
      sg = xjst.compile(template, filename, {
        engine: 'sort-group',
        merge: options.merge
      }),
      fg = xjst.compile(template, filename, {
        engine: 'fullgen',
        merge: options.merge
      });

  var apply = fg.apply;

  fg.apply = {
    call: function(context) {
      fg.apply = apply;

      var results = [
        ng.apply.call(context),
        sg.apply.call(context),
        fg.apply.call(context)
      ];

      assert.deepEqual(results[0], results[1]);
      assert.deepEqual(results[1], results[2]);

      return results[0];
    }
  };

  return fg;
};
