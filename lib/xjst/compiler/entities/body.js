var util = require('util');
var estraverse = require('estraverse');
var entities = require('./');
var utils = require('../../utils');
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

GenericBody.prototype.mapChildren = function mapChildren(fn, ctx) {
  // No-op
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
  } else {
    this.body = Array.isArray(body) ? body : [ body ];

    this.rolledOut = false;
    this.applyNext = null;
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

  // apply(locals) or __$$fetch(identifier)
  if (node.callee.type === 'Identifier') {
    var name = node.callee.name;
    if (name === 'apply' || name === 'applyNext') {
      return this.rollOutApply(node, name, node.arguments);
    } else if (name === '__$$fetch') {
      this.compiler.assertEqual(node, node.arguments.length, 1);
      this.compiler.assertEqual(node, node.arguments[0].type, 'Literal');
      return this.rollOutFetch(node.arguments[0].value);
    } else if (name === '__$$set') {
      this.compiler.assertEqual(node, node.arguments.length, 2);
      this.compiler.assertEqual(node, node.arguments[0].type, 'Literal');
      return this.rollOutSet(node.arguments[0].value,
                             node.arguments[1]);
    }
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
      this.applyNext = this.compiler.getApplyNext(),
      this.applyNext.member = {
        type: 'MemberExpression',
        computed: false,
        object: ctx,
        property: this.applyNext.prop
      };
      this.applyNext.pred = new Predicate(this.compiler, {
        type: 'BinaryExpression',
        operator: '&',
        left: this.applyNext.member,
        right: this.applyNext.value
      }, { type: 'Literal', value: 0 });
    }

    return this.rollOutApply(ast, 'apply', changes.concat({
      type: 'ObjectExpression',
      properties: [{
        type: 'Property',
        key: this.applyNext.prop,
        value: {
          type: 'BinaryExpression',
          operator: '|',
          left: this.applyNext.member,
          right: this.applyNext.value,
        },
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
    if (change.type === 'Literal')
      return;
    this.compiler.assertEqual(
        change,
        change.type,
        'ObjectExpression',
        'apply() and local() accepts only object literals');
    change.properties.forEach(function(property) {
      var keys = (property.key.name || property.key.value).split('.');
      var isGlobal = keys[0] === '$$global';
      if (isGlobal)
        keys.shift();
      if (isGlobal) {
        var prop = this.compiler.fetchGlobal(keys.join('.'));
      } else {
        var prop = keys.reduce(function(left, right, i, l) {
          var isName = utils.isName(right),
              computed = false,
              property = { type: 'Identifier', name: right };

          if (!isName) {
            computed = true;
            property = { type: 'Literal', value: right }
          }
          var sub = {
            type: 'MemberExpression',
            computed: computed,
            object: left,
            property: property
          };

          self.compiler.registerExtension(right);

          return sub;
        }, ctx);
      }

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
    if (left.type === 'MemberExpression' && left.object !== ctx) {
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
        computed: left.computed,
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
    });
    before.push({
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
    id: { type: 'Identifier', name: '__$lb' },
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

Body.prototype.rollOutFetch = function rollOutFetch(id) {
  return this.compiler.fetchGlobal(id);
};

Body.prototype.rollOutSet = function rollOutSet(id, value) {
  return {
    type: 'AssignmentExpression',
    operator: '=',
    left: this.compiler.fetchGlobal(id),
    right: value
  };
};

// Render body
Body.prototype._render = function render() {
  return {
    apply: this.body,
    other: null,
    init: []
  };
};
