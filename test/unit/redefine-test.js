var common = require('../fixtures/common'),
    fs = require('fs'),
    assert = require('assert');

exports['redefine test'] = function(test) {
  assert.equal(common.render('redefine').apply.call({x: 1}), 'ok');
  test.done();
};
