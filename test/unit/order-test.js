var common = require('../fixtures/common'),
    fs = require('fs'),
    assert = require('assert');

suite('Templates order', function () {
  test('execution order check', function () {
    var apply = common.render('order').apply;

    assert.equal(apply.call({ x: 1 }), 1);
    assert.equal(apply.call({ x: 1, y: 2 }), 2);
    assert.equal(apply.call({ y: 2, x: 3 }), 3);
    assert.equal(apply.call({ x: 3 }), 3);
  });

  test('redefined templates', function () {
    assert.equal(common.render('redefine').apply.call({x: 1}), 'ok');
  });
});
