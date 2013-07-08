var assert = require('assert');
var util = require('util');
var estraverse = require('estraverse');
var xjst = require('../../xjst');

var Predicate = require('./predicate').Predicate;

function GenericBody(compiler) {
  this.id = null;
  this.compiler = compiler;
  this.uid = this.compiler.bodyUid++;
  this.size = null;
  this.shared = false;
  this.shareable = true;
};
exports.GenericBody = GenericBody;

GenericBody.prototype.getChildren = function getChildren() {
  return [];
};

GenericBody.prototype.getSize = function getSize() {
  if (this.shared) this.size = 0;
  if (this.size === null) {
    this.size = this.selfSize() +
                this.getChildren().reduce(function(acc, child) {
      return acc + child.getSize();
    }, 0)
  }
  return this.size;
};

GenericBody.prototype.callExpr = function callExpr(ast) {
  var lazyAst = ast || this._render();
  this.shared = this.compiler.registerBody(this);

  // Fast case - inline returned value
  if (lazyAst.apply &&
      lazyAst.apply.length === 1 &&
      lazyAst.apply[0].type === 'ReturnStatement') {
    this.compiler.unshareBody(this);
    return lazyAst.apply[0].argument;
  }

  return {
    type: 'CallExpression',
    callee: this.compiler.getBodyName(this),
    arguments: [ this.compiler.ctx ]
  };
};

GenericBody.prototype.render = function render(notShared) {
  this.getSize();
  this.shared = this.compiler.registerBody(this);
  var ast = this._render();

  if (!notShared && this.shared) {
    return this.compiler.checkRef(this.callExpr(ast));
  }

  return ast;
};

function Body(compiler, body, id, rolledOut) {
  GenericBody.call(this, compiler);

  if (body instanceof Body) {
    // Clone
    var parent = body;

    this.id = parent.id;
    this.uid = parent.uid;
    this.shared = parent.shared;
    this.rolledOut = parent.shared;
    this.body = xjst.utils.cloneAst(parent.body);

    this.applyNext = parent.applyNext;
    this.applyFlag = parent.applyFlag;
  } else {
    this.body = Array.isArray(body) ? body : [ body ];

    this.rolledOut = false;
    this.applyNext = null;
    this.applyFlag = null;
  }

  this.pairIndex = 0;
  this.lastBlock = null;
  this.blockSubsts = [];
  this.lastStmt = null;
  this.localRef = {};
};
util.inherits(Body, GenericBody);
exports.Body = Body;

Body.prototype.clone = function clone() {
  this.compiler.shareBody(this);
  return new Body(this.compiler, this);
};

Body.prototype.separate = function separate() {
  if (this.shared) {
    this.id = null;
    this.uid = this.compiler.bodyUid++;
    this.shared = false;
    this.rolledOut = false;
  }
};

Body.prototype.rollOut = function rollOut() {
  if (this.rolledOut) return;

  for (var i = this.body.length - 1; i >= 0; i--) {
    var stmt = this.body[i];
    this.compiler.sanitize(stmt);

    var block = {
      type: 'BlockStatement',
      body: [ stmt ]
    };
    estraverse.replace(block, {
      enter: this.rollOutSpecific.bind(this),
      leave: this.leaveSpecific.bind(this)
    });

    // Inline!
    if (block.body.length !== 1 || block.body[0] !== stmt) {
      Array.prototype.splice.apply(this.body, [i, 1].concat(block.body));
    }
  }

  // Add last return
  if (this.body.length === 0 ||
      this.body[this.body.length - 1].type !== 'ReturnStatement') {
    this.body.push({ type: 'ReturnStatement', argument: null });
  }

  // Jail local vars
  this.body = this.compiler.jailVars(this.body);
  this.rolledOut = true;
};

Body.prototype.trackLast = function trackLast(node) {
  if (Array.isArray(node.body)) {
    this.lastBlock = node;
  }
  if (/Statement/.test(node.type) || node.type === 'VariableDeclaration') {
    this.lastStmt = node;
  }
};

Body.prototype.rollOutSpecific = function rollOutSpecific(node) {
  this.trackLast(node);
  if (node.type !== 'CallExpression') return;

  // apply(locals)
  if (node.callee.type === 'Identifier') {
    var name = node.callee.name;
    if (name !== 'apply' && name !== 'applyNext') return;

    return this.rollOutApply(node, name, node.arguments);
  // local(locals)(body)
  } else if (node.callee.type === 'CallExpression' &&
             node.callee.callee.type === 'Identifier') {
    var name = node.callee.callee.name;
    if (name !== 'local') return;

    return this.rollOutLocal(node, node.callee.arguments, node.arguments[0]);
  }
};

Body.prototype.leaveSpecific = function leaveSpecific(node) {
  if (node.localMarked === this.localRef) {
    delete node.localMarked;
    this.compiler.revertChange();
  }
  this.trackLast(node);

  if (node === this.lastBlock && this.blockSubsts.length) {
    this.blockSubsts = this.blockSubsts.filter(function(item) {
      if (item.block !== this.lastBlock) return true;

      var stmt = item.block.body[item.index],
          subst = null;

      if (item.ast.type === 'CallExpression' &&
          item.ast.callee.type === 'FunctionExpression') {
        var body = item.ast.callee.body.body;
        if (body[body.length - 1].type === 'ReturnStatement') {
          var stmts = body.slice(0, -1).concat(stmt),
              res = body[body.length - 1].argument;
          if (stmt.type === 'ExpressionStatement' &&
              stmt.expression.type === 'AssignmentExpression' &&
              stmt.expression.right === item.ast) {
            subst = stmts;
            stmt.expression.right = res;
          } else if (stmt.type === 'VariableDeclaration' &&
                     stmt.declarations.length === 1 &&
                     stmt.declarations[0].init === item.ast) {
            subst = stmts;
            stmt.declarations[0].init = res;
          } else if (stmt.type === 'ExpressionStatement' &&
                     stmt.expression === item.ast) {
            subst = stmts.slice(0, -1);
          }
        }
      }

      if (subst !== null) {
        Array.prototype.splice.apply(item.block.body,
                                     [item.index, 1].concat(subst));
      }
      return false;
    }, this);
  }
};

// Roll-out apply expression
Body.prototype.rollOutApply = function rollOutApply(ast, type, changes) {
  var ctx = this.compiler.ctx;

  // Process changes in local
  if (changes.length > 0) {
    return this.rollOutLocal(ast, changes, function() {
      return this.rollOutApply(ast, type, [])
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

    return this.rollOutApply(ast, 'apply', changes.concat({
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
  var templates = this.compiler.inputProgram.templates,
      predicates = this.compiler.renderStack,
      conflicts = {};

  // Limit inline depth
  var noopt = {
    type: 'CallExpression',
    callee: { type: 'Identifier', name: 'applyc' },
    arguments: [ ctx ]
  };
  if (this.shared ||
      this.compiler.inlineDepth > this.compiler.maxInlineDepth) {
    return noopt;
  }

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

  // No optimization - generate just `applyc()` call`
  if (templates.length === this.compiler.inputProgram.templates.length) {
    return noopt;
  }

  this.separate();

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

  var res;

  if (res) {
    res = xjst.utils.cloneAst(res);
  } else {
    res = new Body(this.compiler, this.compiler._translate2({
      templates: templates,
      other: [],
      init: []
    }, true));

    this.compiler.shareBody(res);

    res = res.callExpr();
  }
  return res;
};

// Roll-out local expression
Body.prototype.rollOutLocal = function rollOutLocal(ast, changes, body) {
  var self = this,
      ctx = this.compiler.ctx,
      pairs = [],
      predicates = [];

  function getVar() {
    return { type: 'Identifier', name: '__$l' + self.pairIndex++ };
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

  var noreturn = false;
  if (body.type === 'FunctionExpression') {
    var stmts = body.body;
    while (stmts.type === 'BlockStatement') stmts = stmts.body;
    if (stmts.length === 1 && stmts[0].type === 'ReturnStatement') {
      // local()(function() { return expr })
      body = { type: 'ExpressionStatement', expression: stmts[0].argument };
    } else if (stmts.length === 1 && stmts[0].type === 'ExpressionStatement') {
      // local()(function() { expr })
      body = stmts[0];
      noreturn = true;
    } else {
      body = {
        type: 'CallExpression',
        callee: body,
        arguments: []
      };
    }
  }

  if (noreturn) {
    body = [].concat(before, body, after);
  } else {
    body = [].concat(before, {
      type: 'ExpressionStatement',
      expression: {
        type: 'AssignmentExpression',
        operator: '=',
        left: result,
        right: body
      }
    }, after);
  }

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
      body: body.concat({
        type: 'ReturnStatement',
        argument: result
      })
    }
  };

  // Inline function's body into last block
  if (this.lastBlock &&
      this.lastStmt &&
      this.lastBlock.body.indexOf(this.lastStmt) !== -1) {
    var index = this.lastBlock.body.indexOf(this.lastStmt);

    // Try replacing statement when leaving it
    this.blockSubsts.push({
      index: index,
      block: this.lastBlock,
      ast: ret
    });
    // Sort by decreasing index
    this.blockSubsts.sort(function(a, b) {
      return b.index - a.index;
    });
  }

  ret.callee = func;
  return ret;
};

// Get AST JSON size
Body.prototype.selfSize = function getSize() {
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
