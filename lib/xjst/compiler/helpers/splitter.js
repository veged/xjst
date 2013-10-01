var assert = require('assert');
var estraverse = require('estraverse');

function Splitter(compiler) {
  this.compiler = compiler;
  this.splitPoint = 'xjst::split_point';
  this.groupId = 0;
  this.groups = [];

  this.currentBody = null;
  this.inApplyc = false;
  this.sizeLimit = 32;
};

exports.Splitter = Splitter;

Splitter.create = function create(compiler) {
  return new Splitter(compiler);
};

Splitter.prototype.getSplitPoint = function getSplitPoint() {
  return {
    type: 'ExpressionStatement',
    expression: {
      type: 'Literal',
      value: this.splitPoint
    }
  };
};

Splitter.prototype.split = function split(ast) {
  assert(ast.body);
  this.findFunctions(ast).forEach(function(fn) {
    this.inApplyc = fn.type === 'FunctionDeclaration' &&
                    fn.id &&
                    fn.id.name === 'applyc';
    fn.body = this.splitBody(fn.body);
  }, this);
  ast.body = ast.body.concat(this.getGroups());
  return ast;
};

Splitter.prototype.getGroups = function getGroups() {
  var result = [];
  this.groups.forEach(function(group) {
    result = result.concat(group.render());
  });
  return result;
};

Splitter.prototype.findFunctions = function findFunctions(ast) {
  var result = [];
  var self = this;

  estraverse.traverse(ast, {
    leave: function(node) {
      if (node.type !== 'FunctionExpression' &&
          node.type !== 'FunctionDeclaration') {
        return;
      }

      var hasCtx = node.params.some(function(arg) {
        return arg.name === self.compiler.ctx.name;
      });
      var hasRef = node.params.some(function(arg) {
        return arg.name === self.compiler.ref.name;
      });
      if (hasCtx && hasRef)
        result.push(node);
    }
  });

  return result;
};

Splitter.prototype.splitBody = function splitBody(body) {
  // NOTE: We'll modify bodies in-place
  estraverse.traverse(body, {
    enter: function(node) {
      if (node.type === 'FunctionExpression' ||
          node.type === 'FunctionStatement') {
        return this.skip();
      }
    },
    leave: this.splitBodyLeave.bind(this)
  });

  return body;
};

Splitter.prototype.isSplitPoint = function isSplitPoint(node) {
  return node.type === 'ExpressionStatement' &&
         node.expression.type === 'Literal' &&
         node.expression.value === this.splitPoint;
};

Splitter.prototype.splitBodyLeave = function splitBodyLeave(node, parent) {
  if (node.type !== 'BlockStatement')
    return;

  // Count statements in all nested bodies and split where limit is reached
  this.currentBody = parent ? undefined : node;
  this.countAndSplit(node);
};

Splitter.prototype.countAndSplit = function countAndSplit(stmt) {
  var currentSize = 0;

  if (!stmt)
    return currentSize;

  // Cache results to prevent exponential time
  if (stmt._splitState)
    return stmt._splitState.stmtCount;
  assert(stmt.type !== 'BodyStatement');

  // Visit bodies
  if (stmt.type === 'BlockStatement') {
    var groups = [];
    var stmts = [];
    var calls = [];

    // Do it from end to start to inline code at beginning
    stmt.body.slice().reverse().forEach(function(stmt) {
      // Split group if size limit is reached
      if (this.isSplitPoint(stmt) && currentSize > this.sizeLimit) {
        var group = this.createGroup(stmts, currentSize);
        stmts = [];

        groups.push(group);
        currentSize = 0;
        calls = [group.callStmts()].concat(calls);
      }

      stmts.push(stmt);
      currentSize += this.countAndSplit(stmt);
    }, this);

    // Smallest group should be inlined anyway if everything is split
    if (this.currentBody === stmt &&
        stmts.length === groups.length &&
        groups.length > 0) {
      var minSize = Infinity;
      var minGroup = null;
      var minIndex;
      groups.forEach(function(group, i) {
        if (group.size > minSize)
          return;
        minSize = group.size;
        minGroup = group;
        minIndex = i;
      });
      calls.splice(calls.length - minIndex - 1, 1);
      stmts = minGroup.body.concat(stmts);
      currentSize += minSize;
      minGroup.remove();
    }

    stmt.body = stmts.slice().reverse();
    calls.forEach(function(call) {
      stmt.body = stmt.body.concat(call);
    });
    stmt.body = stmt.body.filter(function(stmt) {
      return !this.isSplitPoint(stmt);
    }, this);

    // Add return __$ref in top-level body
    if (this.currentBody === stmt &&
        !this.inApplyc &&
        stmt.body[stmt.body.length - 1].type !== 'ReturnStatement') {
      stmt.body.push({
        type: 'ReturnStatement',
        argument: this.compiler.ref
      })
    }
    stmt._splitState = { stmtCount: currentSize };
    return currentSize;
  }

  // Each statement counts
  if (!this.isSplitPoint(stmt))
    currentSize++;

  // Nested statements too
  if (stmt.type === 'IfStatement') {
    currentSize += this.countAndSplit(stmt.consequent);
    currentSize += this.countAndSplit(stmt.alternate);
    return currentSize;
  }

  // Visit blocks and loops
  if (stmt.body) {
    currentSize += this.countAndSplit(stmt.body);
    return currentSize;
  }

  return currentSize;
};

Splitter.prototype.createGroup = function createGroup(stmts, size) {
  return new Group(this, stmts, size);
};

Splitter.prototype.groupName = function groupName(id) {
  return {
    type: 'Identifier',
    name: '__$g' + id
  };
};

function Group(splitter, stmts, size) {
  this.splitter = splitter;

  // NOTE: body is reversed here
  this.id = this.splitter.groupId++;
  this.name = this.splitter.groupName(this.id);
  this.body = stmts;
  this.size = size;

  this.splitter.groups.push(this);
};

Group.prototype.remove = function remove() {
  var index = this.splitter.groups.indexOf(this);
  if (index === -1)
    return;
  this.splitter.groups.splice(index, 1);
};

Group.prototype.callStmts = function callStmts() {
  return this.splitter.compiler.checkRef({
    type: 'CallExpression',
    callee: this.name,
    arguments: [
      this.splitter.compiler.ctx,
      this.splitter.compiler.ref
    ]
  }).apply;
};

Group.prototype.render = function render() {
  return {
    type: 'FunctionDeclaration',
    id: this.name,
    params: [ this.splitter.compiler.ctx, this.splitter.compiler.ref ],
    defaults: [],
    rest: null,
    generator: false,
    expression: false,
    body: {
      type: 'BlockStatement',
      body: this.body.slice().reverse().filter(function(stmt) {
        return !this.splitter.isSplitPoint(stmt);
      }, this).concat({
        type: 'ReturnStatement',
        argument: this.splitter.compiler.ref
      })
    }
  };
};
