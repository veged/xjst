var xjst = require('../..');
var assert = require('assert');

describe('XJST Compiler', function () {
  function run(fn, data, expected) {
    var code = fn.toString().replace(/^function[^{]*{|}$/g, '');
    var c = xjst.compiler.create();

    var runtime = c.compile(code, { optimize: false }).apply.call(data || {});
    assert.deepEqual(runtime, expected);

    var optimized = c.compile(code).apply.call(data || {});

    assert.deepEqual(runtime, optimized);
  }

  it('should support all syntax', function() {
    run(function() {
      template()(function() {
        return apply(this)({ x: 1 });
      });

      template(this.x === 1)(function() {
        return local(this)({ y: 2 }, { a: {}, 'a.b': 3 })(function() {
          return applyNext(this)();
        });
      });

      template(this.y === 2, this.x === 1)('yay');

      template(this.y === 3, this.x === 1)(function() {
        return 'ouch';
      });

      "just a code";
    }, {}, 'yay');
  });

  it('should compile template without predicates', function() {
    run(function() {
      template()(function() {
        return 'yay';
      });
    }, {}, 'yay');
  });

  it('should compile multiple two templates', function() {
    run(function() {
      template()(function() {
        return 'ouch';
      });

      template(this.x === 1)(function() {
        return 'yay';
      });
    }, { x: 1 }, 'yay');
  });

  it('should compile multiple (>2) templates', function() {
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

  it('should propagate local\'s context', function() {
    run(function() {
      template()(function() {
        return local(this)({ prop: this.nop })(function() {
          return this.prop;
        });
      });
    }, { nop: 'yay' }, 'yay');
  });

  it('should compile local with dynamic base', function() {
    run(function() {
      var once = 0;
      function base() {
        return {
          x: ++once
        };
      }
      template(!this.$override)(function() {
        return local(base())({ prop: this.nop })(function() {
          return once;
        });
      });
    }, { nop: 'yay' }, 1);
  });

  it('should apply optimizations correctly', function() {
    run(function() {
      template(this.x === 1)(function() {
        return apply(this)({ y: 2 });
      });
      template(this.x === 1, this.y === 3)(function() {
        return 'bad';
      });
      template(this.x === 1, this.y === 2)(function() {
        return 'ok';
      });
    }, { x: 1 }, 'ok')
  });

  it('should support function predicates', function() {
    run(function() {
      template()(function() {
        return 'ok';
      });
      template(function() { return false })(function() {
        return 'bad';
      });
    }, {}, 'ok')
  });
});
