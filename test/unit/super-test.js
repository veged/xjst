var common = require('../fixtures/common'),
    fs = require('fs'),
    assert = require('assert');

exports['super test'] = function(test) {
  var apply = common.render('super-2').apply;

  assert.equal(apply.call({ name: 'main' }), 'ok');

  test.done();
};
