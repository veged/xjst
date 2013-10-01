var assert = require('assert');
var util = require('util');
var estraverse = require('estraverse');
var entities = require('./');

var Predicate = entities.Predicate;

function GenericBody(compiler) {
  this.id = null;
  this.compiler = compiler;
  this.uid = this.compiler.bodyUid++;
  this.shared = false;
  this.shareable = true;
  this.primitive = false;
};
exports.GenericBody = GenericBody;

GenericBody.prototype.getChildren = function getChildren() {
  return [];
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
    arguments: [ this.compiler.ctx, this.compiler.ref ]
  };
};

GenericBody.prototype.wrapResult = function wrapResult(res) {
  var sp = this.compiler.splitter.getSplitPoint();
  var apply = res.apply;

  // Reset apply flag in each body
  if (this instanceof Body)
    apply = [ this.compiler.resetApply ].concat(apply);

  // Add split point
  apply = [ sp ].concat(apply);

  return {
    apply: apply,
    other: res.other,
    init: res.init
  };
};

GenericBody.prototype.render = function render(notShared) {
  this.shared = this.compiler.registerBody(this);
  var ast = this._render();
  var result;

  if (!notShared && this.shared) {
    result = this.compiler.checkRef(this.callExpr(ast));
  } else {
    result = ast;
  }

  return this.wrapResult(result);
};

function Body(compiler, body, id, rolledOut) {
  GenericBody.call(this, compiler);
  this.primitive = true;

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
  this.localRef = {};
};
util.inherits(Body, GenericBody);
exports.Body = Body;

Body.prototype.clone = function clone() {
  this.compiler.shareBody(this);
  return new Body(this.compiler, this);
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

Body.prototype.rollOutSpecific = function rollOutSpecific(node) {
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

Body.prototype.leaveSpecific = function leaveSpecific(node, parent) {
  if (node.localMarked === this.localRef) {
    delete node.localMarked;
    this.compiler.revertChange();
  }
};

// Roll-out apply expression
Body.prototype.rollOutApply = function rollOutApply(ast, type, changes) {
  var ctx = this.compiler.ctx;
  var ref = this.compiler.ref;

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
          type: 'BinaryExpression',
          operator: '!==',
          left: {
            type: 'MemberExpression',
            computed: false,
            object: ctx,
            property: this.compiler.applyFlag
          },
          right: this.applyFlag
        }
      }, { type: 'Literal', value: false });
    }

    return this.rollOutApply(ast, 'apply', changes.concat({
      type: 'ObjectExpression',
      properties: [{
        type: 'Property',
        key: this.compiler.applyFlag,
        value: this.applyFlag,
        kind: 'init'
      }]
    }));
  }

  // Limit inline depth
  return {
    type: 'CallExpression',
    callee: { type: 'Identifier', name: 'applyc' },
    arguments: [ ctx, ref ]
  };
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

            self.compiler.registerExtension(right);

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

    // applyNext flag don't need to be restored
    var applyNextPair = left.property.name === this.compiler.applyFlag.name;

    if (!applyNextPair) {
      before.push({
        type: 'VariableDeclaration',
        kind: 'var',
        declarations: [{
          type: 'VariableDeclarator',
          id: pair.variable,
          init: left
        }]
      });
    }
    before.push({
      type: 'ExpressionStatement',
      expression: {
        type: 'AssignmentExpression',
        operator: '=',
        left: left,
        right: pair.value
      }
    });

    if (!applyNextPair) {
      after.push({
        type: 'ExpressionStatement',
        expression: {
          type: 'AssignmentExpression',
          operator: '=',
          left: left,
          right: pair.variable
        }
      });
    }
  }, this);

  var noreturn = false;
  if (body.type === 'FunctionExpression') {
    body = {
      type: 'CallExpression',
      callee: body,
      arguments: []
    };
  }

  if (body.type === 'ExpressionStatement') {
    body = body.expression;
  }
  body = [].concat(before, {
    type: 'ExpressionStatement',
    expression: {
      type: 'AssignmentExpression',
      operator: '=',
      left: result,
      right: body
    }
  }, after);

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

  ret.callee = func;
  return ret;
};

// Render body
Body.prototype._render = function render() {
  return {
    apply: this.body,
    other: null,
    init: []
  };
};
