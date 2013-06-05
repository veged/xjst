var util = require('util');

var Body = require('./body').Body;
var GenericBody = require('./body').GenericBody;
var Predicate = require('./predicate').Predicate;

// Template constructor
function Template(compiler, predicates, body) {
  GenericBody.call(this, compiler);

  this.shareable = false;
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
util.inherits(Template, GenericBody);
exports.Template = Template;

Template.prototype.clone = function clone() {
  return new Template(this.compiler, this.predicates.map(function(predicate) {
    return predicate.clone();
  }), this.body);
};

// Roll-out apply/applyNext() and local() calls
Template.prototype.rollOut = function rollOut() {
  var body = this.body;

  this.compiler.addChange(this.predicates);
  body.rollOut();
  this.compiler.revertChange();
};

Template.prototype._getSize = function getSize() {
  return this.compiler.getSize(this.getPredicates()) +
         this.body.getSize();
};

Template.prototype.getPredicates = function getPredicates() {
  if (this.predicates.length === 0) return {};

  return {
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
    consequent: null,
    alternate: null
  };
};

// Render template to AST form
Template.prototype._render = function render() {
  // If we came here - we're compiling without optimizations
  var res,
      body = this.body.render();

  if (this.body.applyNext) this.predicates.push(this.body.applyNext);

  // Identity template()
  if (this.predicates.length === 0) return body;

  res = this.getPredicates();
  res.consequent = { type: 'BlockStatement', body: body.apply };

  return {
    apply: res,
    other: body.other,
    init: body.init
  };
};
