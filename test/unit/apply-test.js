var common = require('../fixtures/common'),
    assert = require('assert');

function applyTest(name, type) {
  return function(test) {
    var result = common.render(name).apply.call({ type: type });

    assert.equal(result, 'ok');

    test.done();
  };
};

exports['apply keyword'] = applyTest('apply', 'first');
exports['apply keyword w/o locals'] = applyTest('apply', 'third');
