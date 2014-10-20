var common = require('../fixtures/common'),
    assert = require('assert');

function localTest(name, type) {
  return function() {
    var result = common.render(name).apply.call({
      type: type,
      a: { b: { c: { d: 1 } } }
    });

    assert.equal(result.a, 3);
    assert.equal(result.x, 1);
  };
};

suite('Local expressions/statements', function () {
  test('simple expression', localTest('local-expr', 'simple'));
  test('compelx expression', localTest('local-expr', 'complex'));
  test('regr-1 expression', localTest('local-expr', 'regr-1'));
  test('regr-2 expression', localTest('local-expr', 'regr-2'));

  test('expression with hash', localTest('local-expr', 'hash'));

  test('simple statement', localTest('local-stmt', 'simple'));
  test('complex statement', localTest('local-stmt', 'complex'));
  test('complex statement with hash-arg',
       localTest('local-stmt-hash', 'complex'));
});
