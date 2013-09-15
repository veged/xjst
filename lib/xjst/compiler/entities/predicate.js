var xjst = require('../../../xjst');

// Predicate constructor
function Predicate(compiler, expr, value) {
  this.compiler = compiler;

  this.expr = this.compiler.sanitize(expr);
  this.value = value;

  this.id = compiler.getId(JSON.stringify(expr), expr);
  this.valueId = compiler.getId(JSON.stringify(value), value);

  this.simplify();

  compiler.accountScore(this.id, this.valueId);
};
exports.Predicate = Predicate;

Predicate.prototype.clone = function clone() {
  return new Predicate(this.compiler,
                       xjst.utils.cloneAst(this.expr),
                       xjst.utils.cloneAst(this.value));
};

Predicate.prototype.getScore = function getScore() {
  return this.compiler.getScore(this.id);
};

Predicate.prototype.render = function render() {
  if (this.value !== null) {
    return {
      type: 'BinaryExpression',
      operator: '===',
      left: this.expr,
      right: this.value
    };
  } else {
    return this.expr;
  }
};

Predicate.prototype.simplify = function simplify() {
  // !(something) === false => something
  if (this.value.type === 'Literal' &&
      this.value.value === false &&
      this.expr.type === 'UnaryExpression' &&
      this.expr.operator === '!') {
    this.expr = this.expr.argument;
    this.value = null;
  }
};
