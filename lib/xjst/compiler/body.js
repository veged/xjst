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
    this.compiler.replaceThis(stmt);

    estraverse.replace(stmt, {
      enter: this.rollOutSpecific.bind(this),
      leave: this.leaveSpecific.bind(this)
    });
  }, this);
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
  if (node.localMarked) {
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
      arguments: [ ctx ]
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
      params: [ ],
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

      addPair(this.compiler.replaceThis(prop),
              this.compiler.replaceThis(property.value));
    }, this);
  }, this);

  var result = { type: 'Identifier', name: '__$r' };
  var before = [];
  var after = [];

  var ret = {
    localMarked: true,
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
    other: null,
    init: []
  };
};
