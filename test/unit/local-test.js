var common = require('../fixtures/common'),
    assert = require('assert');

function localTest(name, type) {
  return function(test) {
    var result = common.render(name).apply.call({ type: type });

    assert.equal(result.a, 3);
    assert.equal(result.x, 1);

    test.done();
  };
};

exports['simple local expression'] = localTest('local-expr', 'simple');
exports['complex local expression'] = localTest('local-expr', 'complex');
exports['regr-1 local expression'] = localTest('local-expr', 'regr-1');

exports['simple local statement'] = localTest('local-stmt', 'simple');
exports['complex local statement'] = localTest('local-stmt', 'complex');
exports['hash local expression'] = localTest('local-expr', 'hash');
