var xjst = require('../..');
var assert = require('assert');
var path = require('path');

describe('Express.js support', function() {
  it('should export __express function', function() {
    assert.equal(typeof xjst.__express, 'function', 'xjst.__express is not function');
  });

  it('xjst.__express should invoke callback', function(done) {
    xjst.__express(path.resolve(__dirname, '../assets/express.xjst'), {}, done);
  });

  it('xjst.__express should provide template execution result', function(done) {
    xjst.__express(path.resolve(__dirname, '../assets/express.xjst'), {}, function (err, result) {
      assert.equal(result, 'It works!', 'template string should match test one');
      done();
    });
  });
});
