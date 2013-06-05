// Predicate constructor
function Predicate(compiler, expr, value) {
  this.compiler = compiler;

  this.expr = this.compiler.sanitize(expr);
  this.value = value;

  this.id = compiler.getId(JSON.stringify(expr), expr);
  this.valueId = compiler.getId(JSON.stringify(value), value);

  compiler.accountScore(this.id, this.valueId);
};
exports.Predicate = Predicate;

Predicate.prototype.clone = function clone() {
  return new Predicate(this.compiler,
                       JSON.parse(JSON.stringify(this.expr)),
                       JSON.parse(JSON.stringify(this.value)));
};

Predicate.prototype.getScore = function getScore() {
  return this.compiler.getScore(this.id);
};
