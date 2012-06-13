var common = require('../fixtures/common'),
    fs = require('fs'),
    assert = require('assert');

suite('Super/extends', function () {
  test('basic extension', function () {
    var apply = common.render('super-2').apply;

    assert.equal(apply.call({ name: 'main' }), 'ok');
  });
});
