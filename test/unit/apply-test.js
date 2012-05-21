var common = require('../fixtures/common'),
    assert = require('assert');

function applyTest(name, type) {
  return function() {
    var result = common.render(name).apply.call({ type: type });

    assert.equal(result, 'ok');
  };
};

suite('XJST', function() {
  test('apply keyword: simple', applyTest('apply', 'simple'));
  test('apply keyword: complex', applyTest('apply', 'complex'));
  test(
      'apply keyword - non-optimizable',
       applyTest('apply', 'non-optimizable')
  );
  test(
      'apply keyword - non-optimizable complex',
       applyTest('apply', 'non-optimizable-complex')
  );
  test(
      'apply keyword - invalidating nested',
       applyTest('apply', 'invalidating')
  );
});
