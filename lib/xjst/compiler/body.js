var assert = require('assert'),
    estraverse = require('estraverse');

var Predicate = require('./predicate').Predicate;

function Body(compiler, body) {
  if (body instanceof Body) return body.clone();

  this.compiler = compiler;
  this.body = Array.isArray(body) ? body : [ body ];
  this.applyNext = null;
  this.applyFlag = null;

  this.id = this.compiler.bodyId++;
  this.shared = false;
};
exports.Body = Body;

Body.prototype.clone = function clone() {
  this.shared = true;

  this.compiler.registerBody(this);

  return this;
};

Body.prototype.rollOut = function rollOut() {
  this.body.forEach(function(stmt) {
    var self = this;

    estraverse.replace(stmt, {
      leave: function(node) {
        if (node.type !== 'CallExpression') return;

        var callee = node.callee;
        if (callee.type !== 'CallExpression') return;

        // apply(ctx)(locals)
        if (callee.callee.type === 'Identifier') {
          var name = callee.callee.name;
          if (name !== 'apply' && name !== 'applyNext') return;

          return self.rollOutApply(name,
                                   node.callee.arguments[0],
                                   node.arguments);
        // local(ctx)(locals)(body)
        } else if (callee.callee.type === 'CallExpression' &&
                   callee.callee.callee.type === 'Identifier') {
          var name = callee.callee.callee.name;
          if (name !== 'local') return;

          return self.rollOutLocal(node.callee.callee.arguments[0],
                                   node.callee.arguments,
                                   node.arguments[0]);
        } else {
          return;
        }
      }
    });

    this.compiler.replaceThis(stmt);
  }, this);
};

// Roll-out apply expression
Body.prototype.rollOutApply = function rollOutApply(type, ctx, changes) {
  // Process changes in local
  if (changes.length > 0) {
    return this.rollOutLocal(ctx, changes, function() {
      return this.rollOutApply(type, ctx, [])
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
          object: this.compiler.ctx,
          property: this.applyFlag
        }
      }, {
        type: 'Literal',
        value: true
      });
    }

    return this.rollOutApply('apply', ctx, changes.concat({
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

  // Filter out templates that are not reachable from apply's call-site
  templates = templates.filter(function(template) {
    return template.predicates.every(function(tpredicate) {
      return predicates.every(function(predicate) {
        return predicate.id !== tpredicate.id ||
               predicate.valueId === tpredicate.valueId;
      });
    });
  });

  // No optimization - generate just `applyc()` call`
  if (templates.length === this.compiler.program.templates.length) {
    return {
      type: 'CallExpression',
      callee: {
        type: 'Identifier',
        name: 'applyc'
      },
      arguments: [ ctx || this.compiler.ctx ]
    };
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

  var body = this.compiler._translate2({ templates: templates, other: [] },
                                       true);

  return {
    type: 'FunctionExpression',
    id: null,
    params: [ ],
    defaults: [],
    rest: null,
    generator: false,
    expression: false,
    body: {
      type: 'BlockStatement',
      body: body
    }
  };
};

// Roll-out local expression
Body.prototype.rollOutLocal = function rollOutLocal(ctx, changes, body) {
  var self = this,
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
          }, ctx || this.compiler.ctx);

      addPair(this.compiler.replaceThis(prop),
              this.compiler.replaceThis(property.value));
    }, this);
  }, this);

  var result = { type: 'Identifier', name: '__$r' };
  var before = [];
  var after = [];

  if (typeof body === 'function') {
    this.compiler.addChange(predicates, function() {
      body = body.call(self);
    });
  }

  // Replace `this` in body
  if (body.type === 'FunctionExpression') {
    body.body = this.compiler.replaceThis(body.body);
  } else {
    body = this.compiler.replaceThis(body);
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
    if (left.object !== this.compiler.ctx) {
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

  return {
    type: 'CallExpression',
    callee: func,
    arguments: []
  };
};

// Render body
Body.prototype.render = function render(notShared) {
  // Add last return
  if (this.body.length === 0 ||
      this.body[this.body.length - 1].type !== 'ReturnStatement') {
    this.body.push({ type: 'ReturnStatement', argument: null });
  }

  if (!notShared && this.shared) {
    return {
      apply: [{
        type: 'ReturnStatement',
        argument: {
          type: 'CallExpression',
          callee: this.compiler.getBodyName(this),
          arguments: [ this.compiler.ctx ]
        }
      }]
    };
  }

  return {
    apply: this.body,
    other: null
  };
};
