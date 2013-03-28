var Body = require('./body').Body;
var Predicate = require('./predicate').Predicate;

// Template constructor
function Template(compiler, predicates, body) {
  this.compiler = compiler;
  this.predicates = predicates;

  if (body.type === 'FunctionExpression') {
    // function() { body } => body
    this.body = body.body.body;
  } else if (!Array.isArray(body)) {
    // stmt => return stmt;
    this.body = [ { type: 'ReturnStatement', argument: body } ];
  }

  if (body instanceof Body) {
    this.body = body.clone();
  } else {
    this.body = new Body(compiler, this.body);
  }
};
exports.Template = Template;

Template.prototype.clone = function clone() {
  return new Template(this.compiler, this.predicates, this.body);
};

// Roll-out apply/applyNext() and local() calls
Template.prototype.rollOut = function rollOut() {
  var body = this.body;

  this.compiler.addChange(this.predicates, function() {
    body.rollOut();
  });
};

// Render template to AST form
Template.prototype.render = function render() {
  // If we came here - we're compiling without optimizations
  var res,
      body = this.body.render();

  if (this.body.applyNext) this.predicates.push(this.body.applyNext);

  // Identity template()
  if (this.predicates.length === 0) return body;

  res = {
    type: 'IfStatement',
    test: this.predicates.map(function(pred) {
      return {
        type: 'BinaryExpression',
        operator: '===',
        left: pred.expr,
        right: pred.value
      };
    }).reduce(function(left, right) {
      return {
        type: 'BinaryExpression',
        operator: '&&',
        left: left,
        right: right
      };
    }),
    consequent: { type: 'BlockStatement', body: body.apply },
    alternate: null
  };

  return {
    apply: res,
    other: body.other
  };
};
