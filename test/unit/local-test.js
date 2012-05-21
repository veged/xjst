var common = require('../fixtures/common'),
    assert = require('assert');

function localTest(name, type) {
  return function() {
    var result = common.render(name).apply.call({ type: type });

    assert.equal(result.a, 3);
    assert.equal(result.x, 1);
  };
};

suite('Local expressions/statements', function () {
  test('simple expression', localTest('local-expr', 'simple'));
  test('compelx expression', localTest('local-expr', 'complex'));
  test('regr-1 expression', localTest('local-expr', 'regr-1'));

  test('expression with hash', localTest('local-expr', 'hash'));

  test('simple statement', localTest('local-stmt', 'simple'));
  test('complex statement', localTest('local-stmt', 'complex'));
});
