var assert = require('assert');
var util = require('util');
var entities = require('./');

var GenericBody = entities.GenericBody;
var Map = entities.Map;

function Pair(compiler, left, right) {
  GenericBody.call(this, compiler);

  this.left = left;
  this.right = right;
};
util.inherits(Pair, GenericBody);
exports.Pair = Pair;

Pair.prototype.getChildren = function getChildren() {
  return [ this.left, this.right ];
};

Pair.prototype.mapChildren = function mapChildren(fn, ctx) {
  this.left = fn.call(ctx, this.left);
  this.right = fn.call(ctx, this.right);
};

Pair.prototype._render = function render() {
  var left = this.left.render();
  var right = this.right.render();

  return {
    apply: (left.apply || []).concat(right.apply || []),
    other: (left.other || []).concat(right.other || []),
    init: (left.init || []).concat(right.init || [])
  };
};
