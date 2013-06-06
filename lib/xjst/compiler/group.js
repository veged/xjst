var assert = require('assert');
var util = require('util');

var GenericBody = require('./body').GenericBody;
var Map = require('./map').Map;

function Group(compiler, pairs) {
  if (pairs.length > 32) return new Map(compiler, pairs);

  GenericBody.call(this, compiler);
  assert(pairs.length > 0);

  this.predicate = pairs[0].predicate;
  this.pairs = pairs;
};
util.inherits(Group, GenericBody);
exports.Group = Group;

Group.prototype._getSize = function getSize() {
  var total = this.compiler.getSize(this.predicate.expr);
  this.pairs.forEach(function(pair) {
    pair.bodies.forEach(function(body) {
      total += body.getSize();
    });
  }, this);
  return total;
};

Group.prototype._render = function render() {
  var t = { type: 'Identifier', name: '__$t' };

  var result = [],
      other = [],
      init = [];

  result.push({
    type: 'VariableDeclaration',
    kind: 'var',
    declarations: [{
      type: 'VariableDeclarator',
      id: t,
      init: this.predicate.expr
    }]
  });

  result.push(this.pairs.map(function(pair) {
    var out = [];
    pair.bodies.forEach(function(body) {
      this.compiler.addChange(pair.predicate);
      var local = body.render();

      assert(!body.applyNext);

      if (local.apply) out = out.concat(local.apply);
      if (local.other) other = other.concat(local.other);
      if (local.init) init = init.concat(local.init);
      this.compiler.revertChange();
    }, this);

    return {
      type: 'IfStatement',
      test: {
        type: 'BinaryExpression',
        operator: '===',
        left: t,
        right: pair.predicate.value
      },
      consequent: {
        type: 'BlockStatement',
        body: out
      },
      alternate: null
    };
  }, this).reduceRight(function(prev, next) {
    next.alternate = prev;
    return next;
  }));

  return {
    apply: result,
    other: other,
    init: init
  };
};
