var xjst = require('../..');
var assert = require('assert');

suite('XJST Compiler', function () {
  function run(fn, data, expected) {
    var code = fn.toString().replace(/^function[^{]*{|}$/g, '');
    var c = xjst.compiler.create();

    var runtime = c.compile(code, { optimize: false }).apply.call(data || {});
    assert.deepEqual(runtime, expected);

    var optimized = c.compile(code).apply.call(data || {});

    assert.deepEqual(runtime, optimized);
  }

  test('all syntax works', function() {
    run(function() {
      template()(function() {
        return apply(this)({ x: 1 });
      });

      template(this.x === 1)(function() {
        return local(this)({ y: 2, a: {}, 'a.b': 3 })(function() {
          return applyNext(this)();
        });
      });

      template(this.y === 2, this.x === 1)(function() {
        return 'yay';
      });

      template(this.y === 3, this.x === 1)(function() {
        return 'ouch';
      });

      "just a code";
    }, {}, 'yay');
  });

  test('base template', function() {
    run(function() {
      template()(function() {
        return 'yay';
      });
    }, {}, 'yay');
  });

  test('two templates', function() {
    run(function() {
      template()(function() {
        return 'ouch';
      });

      template(this.x === 1)(function() {
        return 'yay';
      });
    }, { x: 1 }, 'yay');
  });

  test('>2 templates', function() {
    run(function() {
      template()(function() {
        return 'ouch';
      });

      template(this.x === 1)(function() {
        return 'ouch';
      });

      template(this.x === 1 && this.y === 2)(function() {
        return 'yay';
      });

      template(this.x === 2 && this.y === 2)(function() {
        return 'ouch';
      });

      template(this.x === 1 && this.z === 3)(function() {
        return 'ouch';
      });
    }, { x: 1, y: 2 }, 'yay');
  });
});
