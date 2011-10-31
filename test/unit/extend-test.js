var common = require('../fixtures/common'),
    assert = require('assert');

exports['extend'] = function(test) {
  var a = common.render('extend-a'),
      b = common.render('extend-b');

  a.mergeWith(b);

  assert.equal(a.apply.call({ type: 'simple', mod: 'a'}), 'a');
  assert.equal(a.apply.call({ type: 'simple', mod: 'b'}), 'b');

  test.done();
};
