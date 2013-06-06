var assert = require('assert');
var util = require('util');
var estraverse = require('estraverse');
var xjst = require('../../xjst');

var Predicate = require('./predicate').Predicate;

function GenericBody(compiler) {
  this.id = null;
  this.compiler = compiler;
  this.size = null;
  this.shared = false;
  this.shareable = true;
};
exports.GenericBody = GenericBody;

GenericBody.prototype.getSize = function getSize() {
  if (this.shared) this.size = 0;
  return this.size = this.size === null ? this._getSize() : this.size;
};

GenericBody.prototype.render = function render(notShared) {
  this.getSize();
  this.shared = this.compiler.registerBody(this);

  if (!notShared && this.shared) {
    return this.compiler.checkRef({
      type: 'CallExpression',
      callee: this.compiler.getBodyName(this),
      arguments: [ this.compiler.ctx ]
    });
  }

  return this._render();
};

function Body(compiler, body, id, rolledOut) {
  GenericBody.call(this, compiler);

  if (body instanceof Body) {
    // Clone
    var parent = body;

    this.id = parent.id;
    this.rolledOut = parent.rolledOut;
    this.body = xjst.utils.cloneAst(parent.body);

    this.applyNext = parent.applyNext;
    this.applyFlag = parent.applyFlag;
  } else {
    this.rolledOut = false;
    this.body = Array.isArray(body) ? body : [ body ];

    this.applyNext = null;
    this.applyFlag = null;
  }

  this.localRef = {};
};
util.inherits(Body, GenericBody);
exports.Body = Body;

Body.prototype.clone = function clone() {
  return new Body(this.compiler, this);
};

Body.prototype.rollOut = function rollOut() {
  if (this.rolledOut) return;

  this.body.forEach(function(stmt) {
    this.compiler.sanitize(stmt);

    estraverse.replace(stmt, {
      enter: this.rollOutSpecific.bind(this),
      leave: this.leaveSpecific.bind(this)
    });
  }, this);

  // Add last return
  if (this.body.length === 0 ||
      this.body[this.body.length - 1].type !== 'ReturnStatement') {
    this.body.push({ type: 'ReturnStatement', argument: null });
  }

  // Jail local vars
  this.body = this.compiler.jailVars(this.body);
  this.rolledOut = true;
};

Body.prototype.rollOutSpecific = function rollOutSpecific(node) {
  if (node.type !== 'CallExpression') return;

  // apply(locals)
  if (node.callee.type === 'Identifier') {
    var name = node.callee.name;
    if (name !== 'apply' && name !== 'applyNext') return;

    return this.rollOutApply(name, node.arguments);
  // local(locals)(body)
  } else if (node.callee.type === 'CallExpression' &&
             node.callee.callee.type === 'Identifier') {
    var name = node.callee.callee.name;
    if (name !== 'local') return;

    return this.rollOutLocal(node.callee.arguments, node.arguments[0]);
  }
};

Body.prototype.leaveSpecific = function leaveSpecific(node) {
  if (node.localMarked === this.localRef) {
    delete node.localMarked;
    this.compiler.revertChange();
  }
};

// Roll-out apply expression
Body.prototype.rollOutApply = function rollOutApply(type, changes) {
  var ctx = this.compiler.ctx;

  // Process changes in local
  if (changes.length > 0) {
    return this.rollOutLocal(changes, function() {
      return this.rollOutApply(type, [])
    });
  }

  if (type !== 'apply') {
    // applyNext, heh
    if (!this.applyNext) {
      this.applyFlag = this.compiler.getApplyFlag();
      this.applyNext = new Predicate(this.compiler, {
        type: 'UnaryExpression',
        prefix: true,
        operator: '!',
        argument: {
          type: 'MemberExpression',
          computed: true,
          object: ctx,
          property: this.applyFlag
        }
      }, {
        type: 'Literal',
        value: true
      });
    }

    return this.rollOutApply('apply', changes.concat({
      type: 'ObjectExpression',
      properties: [{
        type: 'Property',
        key: this.applyFlag,
        value: { type: 'Literal', value: true },
        kind: 'init'
      }]
    }));
  }

  // Optimize apply
  var templates = this.compiler.program.templates,
      predicates = this.compiler.renderStack,
      conflicts = {};

  // Filter conflicting predicates
  predicates = predicates.slice().reverse().filter(function(predicate) {
    if (conflicts[predicate.id]) return false;
    conflicts[predicate.id] = true;

    return true;
  }).reverse();

  function isSimple(expr) {
    // Only member of this, literal or `__$ctx`
    var cur = expr;

    while (true) {
      if (cur.type === 'MemberExpression') {
        if (cur.computed) return false;
        cur = cur.object;
      } else {
        return cur.type === 'Literal' ||
               cur.type === 'Identifier' && cur.name === ctx.name;
      }
    }

    return true;
  }

  // Filter predicates with non-literal rhs and complex lhs
  predicates = predicates.filter(function(predicate) {
    return predicate.value.type === 'Literal' &&
           isSimple(predicate.expr);
  });

  // Filter out templates that are not reachable from apply's call-site
  templates = templates.filter(function(template) {
    return template.predicates.every(function(tpredicate) {
      return predicates.every(function(predicate) {
        return predicate.id !== tpredicate.id ||
               predicate.valueId === tpredicate.valueId;
      });
    });
  });

  var noopt = {
    type: 'CallExpression',
    callee: {
      type: 'Identifier',
      name: 'applyc'
    },
    arguments: [ ctx ]
  };

  // No optimization - generate just `applyc()` call`
  if (templates.length === this.compiler.program.templates.length) {
    return noopt;
  }

  // Clone templates
  templates = templates.map(function(template) {
    return template.clone();
  });

  // Remove predicates with known values
  templates.forEach(function(template) {
    template.predicates = template.predicates.filter(function(tpredicate) {
      return predicates.every(function(predicate) {
        return predicate.id !== tpredicate.id;
      });
    });
  });

  // Do not inline templates if result will be too big
  var size = 0;
  templates.forEach(function(template) {
    size += template.getSize();
  });
  if (size > this.compiler.inlineableApplySize) return noopt;

  var body = this.compiler._translate2({
    templates: templates,
    other: [],
    init: []
  }, true);

  return {
    type: 'CallExpression',
    callee: {
      type: 'FunctionExpression',
      id: null,
      params: [],
      defaults: [],
      rest: null,
      generator: false,
      expression: false,
      body: {
        type: 'BlockStatement',
        body: body
      }
    },
    arguments: []
  };
};

// Roll-out local expression
Body.prototype.rollOutLocal = function rollOutLocal(changes, body) {
  var self = this,
      ctx = this.compiler.ctx,
      pairs = [],
      predicates = [],
      pairIndex = 0;

  function getVar() {
    return { type: 'Identifier', name: '__$l' + pairIndex++ };
  }

  function addPair(prop, value) {
    predicates.push(new Predicate(self.compiler, prop, value));

    pairs.push({
      prop: prop,
      value: value,
      variable: getVar()
    });
  }

  // Generate list of prop/value pairs
  changes.forEach(function(change) {
    assert.equal(change.type, 'ObjectExpression');
    change.properties.forEach(function(property) {
      var keys = (property.key.name || property.key.value).split('.'),
          prop = keys.reduce(function(left, right, i, l) {
            var sub = {
              type: 'MemberExpression',
              computed: false,
              object: left,
              property: { type: 'Identifier', name: right }
            };

            return sub;
          }, ctx);

      addPair(this.compiler.sanitize(prop),
              this.compiler.sanitize(property.value));
    }, this);
  }, this);

  var result = { type: 'Identifier', name: '__$r' };
  var before = [];
  var after = [];

  var ret = {
    localMarked: this.localRef,
    type: 'CallExpression',
    callee: null,
    arguments: []
  };

  this.compiler.addChange(predicates);
  if (typeof body === 'function') {
    body = body.call(this);
  }

  // Replace `this` in body
  if (body.type === 'FunctionExpression') {
    body.body = this.compiler.sanitize(body.body);
  } else {
    body = this.compiler.sanitize(body);
  }

  // Declare __$r var
  before.push({
    type: 'VariableDeclaration',
    kind: 'var',
    declarations: [{
      type: 'VariableDeclarator',
      id: result,
      init: null
    }]
  });

  pairs.forEach(function(pair) {
    var left = pair.prop;

    // Store object
    if (left.object !== ctx) {
      var tmp = getVar();
      before.push({
        type: 'VariableDeclaration',
        kind: 'var',
        declarations: [{
          type: 'VariableDeclarator',
          id: tmp,
          init: left.object
        }]
      });

      left = {
        type: 'MemberExpression',
        computed: false,
        object: tmp,
        property: left.property
      };
    }

    before.push({
      type: 'VariableDeclaration',
      kind: 'var',
      declarations: [{
        type: 'VariableDeclarator',
        id: pair.variable,
        init: left
      }]
    }, {
      type: 'ExpressionStatement',
      expression: {
        type: 'AssignmentExpression',
        operator: '=',
        left: left,
        right: pair.value
      }
    });

    after.push({
      type: 'ExpressionStatement',
      expression: {
        type: 'AssignmentExpression',
        operator: '=',
        left: left,
        right: pair.variable
      }
    });
  }, this);

  var func = {
    type: 'FunctionExpression',
    id: null,
    params: [],
    defaults: [],
    rest: null,
    generator: false,
    expression: false,
    body: {
      type: 'BlockStatement',
      body: [].concat(before, {
        type: 'ExpressionStatement',
        expression: {
          type: 'AssignmentExpression',
          operator: '=',
          left: result,
          right: body.type === 'FunctionExpression' ? {
            type: 'CallExpression',
            callee: body,
            arguments: []
          } : body
        }
      }, after, {
        type: 'ReturnStatement',
        argument: result
      })
    }
  };

  ret.callee = func;
  return ret;
};

// Get AST JSON size
Body.prototype._getSize = function getSize() {
  return this.compiler.getSize(this._render());
};

// Render body
Body.prototype._render = function render() {
  return {
    apply: this.body,
    other: null,
    init: []
  };
};
