var xjst = require('../..');
var assert = require('assert');

describe('XJST Compiler', function () {
  function run(fn, data, expected) {
    var code = fn.toString().replace(/^function[^{]*{|}$/g, '');

    var runtime = xjst.compile(code, {
      optimize: false
    }).apply(data || {});
    assert.deepEqual(runtime, expected);

    var optimized = xjst.compile(code).apply.call(data || {});

    assert.deepEqual(runtime, optimized);

    // Without beautifier
    optimized = xjst.compile(code, {
      beautify: false
    }).apply.call(data || {});

    assert.deepEqual(runtime, optimized);
  }

  it('should support all syntax', function() {
    run(function() {
      template()(function() {
        return apply({ x: 1 });
      });

      template(this.x === 1)(function() {
        return local({ y: 2 }, { a: {}, 'a.b': 3 })(function() {
          return applyNext();
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
        return local({ prop: this.nop })(function() {
          return this.prop;
        });
      });
    }, { nop: 'yay' }, 'yay');
  });

  it('should apply optimizations correctly', function() {
    run(function() {
      template(this.x === 1, this.y === 4)(function() {
        return local({ y: 5 })(apply());
      });
      template(this.x === 1, this.y === 3)(function() {
        return 'bad';
      });
      template(this.x === 1, this.y === 5)(function() {
        return 'ok';
      });
    }, { x: 1, y: 4 }, 'ok')
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

  it('should support oninit', function() {
    run(function() {
      oninit(function(exports) {
        exports.stuff = 'ok';
      });
      template()(function() {
        return exports.stuff;
      });
    }, {}, 'ok')
  });

  it('should not run not-initialized code', function() {
    run(function() {
      oninit(function(exports) {
        var apply = exports.apply;
        exports.apply = function() {
          return apply.call({ a: { b: 'ok' } });
        };
      });
      template(this.a.b === 'ok')(function() {
        return this.a.b;
      });
    }, {}, 'ok')
  });

  it('should not account non-constant predicates', function() {
    run(function() {
      template()(function() {
        return 'oh noes!';
      });
      template(this.a === 'ok')(function() {
        return 'ok';
      });
      template(this.a === 'start')(function() {
        var x = 'ok';
        return apply({ a: x });
      });
    }, { a: 'start' }, 'ok')
  });

  it('should handle maximum call-stack exceptions', function() {
    try {
      run(function() {
        template(this.a === '2')(function() {
          apply();
        });
        template(this.a === '1')(function() {
          apply({ a: '2' });
        });
      }, { a: '1' }, 'no-way-this-could-happen');
    } catch (e) {
      assert(e.xjstContext);
      assert.equal(e.xjstContext.a, 2);
    }
  });

  it('should support applyNext with changes', function() {
    run(function() {
      template()(function() {
        return 'oh noes!';
      });
      template(this.a === 'ok')(function() {
        return 'ok';
      });
      template()(function() {
        var x = 'ok';
        return applyNext({ a: x });
      });
    }, {}, 'ok')
  });

  it('should reset applyNext flag after matching', function() {
    run(function() {
      template()(function() {
        return 'oh noes!';
      });
      template(this.a === 'ok')(function() {
        return 'ok';
      });
      template()(function() {
        return applyNext({ a: this.a === 'pre-ok' ? 'ok' : 'pre-ok' });
      });
      template(this.a === 'pre-ok')(function() {
        return applyNext();
      });
    }, {}, 'ok')
  });
});
