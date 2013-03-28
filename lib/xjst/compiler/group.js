var assert = require('assert');

function Group(compiler, pairs) {
  assert(pairs.length > 0);

  this.compiler = compiler;
  this.predicate = pairs[0].predicate;
  this.pairs = pairs;
};
exports.Group = Group;

Group.prototype.render = function render() {
  var t = { type: 'Identifier', name: '__$t' };

  var result = [],
      other = [];

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
      this.compiler.addChange(pair.predicate, function() {
        var local = body.render();

        assert(!body.applyNext);

        if (local.apply) out = out.concat(local.apply);
        if (local.other) other = other.concat(local.other);
      });
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
    other: other
  };
};
