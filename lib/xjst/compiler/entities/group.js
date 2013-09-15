var assert = require('assert');
var util = require('util');
var entities = require('./');

var GenericBody = entities.GenericBody;
var Map = entities.Map;

function Group(compiler, pairs) {
  if (pairs.length > 16) return new Map(compiler, pairs);

  GenericBody.call(this, compiler);
  assert(pairs.length > 0);

  this.predicate = pairs[0].predicate;
  this.pairs = pairs;
};
util.inherits(Group, GenericBody);
exports.Group = Group;

Group.prototype.getChildren = function getChildren() {
  return this.pairs.map(function(pair) {
    return pair.bodies;
  }).reduce(function(left, right) {
    return left.concat(right);
  }, []);
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
      test: pair.predicate.value ? {
        type: 'BinaryExpression',
        operator: '===',
        left: t,
        right: pair.predicate.value
      } : t,
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
