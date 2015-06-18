var xjst = require('../../../xjst');

// Predicate constructor
function Predicate(compiler, expr, value) {
  this.compiler = compiler;

  this.expr = this.compiler.sanitize(expr);
  this.value = this.compiler.sanitize(value);

  this.id = compiler.getId(expr, expr);
  this.valueId = compiler.getId(value, value);

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
      left: this.getExpr(),
      right: this.compiler.replaceFetch(this.value)
    };
  } else {
    return this.getExpr();
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

Predicate.prototype.getExpr = function getExpr() {
  return this.compiler.replaceFetch(this.expr);
};
