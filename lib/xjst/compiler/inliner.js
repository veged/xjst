var estraverse = require('estraverse');

function Inliner() {
  this.lastBlock = null;
  this.lastStmt = null;
  this.blockHistory = [];
  this.stmtHistory = [];
  this.blockSubsts = [];
  this.localRef = {};
};
exports.Inliner = Inliner;

Inliner.create = function create() {
  return new Inliner();
};

Inliner.inline = function inline(ast) {
  return new Inliner().inline(ast);
};

Inliner.prototype.inline = function run(ast) {
  estraverse.replace(ast, {
    enter: this.enter.bind(this),
    leave: this.leave.bind(this)
  });
  return ast;
};

Inliner.prototype.enter = function enter(node, parent) {
  if (Array.isArray(node.body)) {
    this.blockHistory.push(node);
    this.lastBlock = node;
  }
  if (/Statement/.test(node.type) || node.type === 'VariableDeclaration') {
    this.stmtHistory.push(node);
    this.lastStmt = node;
  }
};

Inliner.prototype.leave = function leave(node) {
  // Inline stmts if we're leaving block
  this.tryInline(node);

  if (Array.isArray(node.body) && node === this.lastBlock) {
    this.blockHistory.pop();
    this.lastBlock = this.blockHistory[this.blockHistory.length - 1];
  }

  if (node === this.lastStmt) {
    this.stmtHistory.pop();
    this.lastStmt = this.stmtHistory[this.stmtHistory.length - 1];
  }

  // Try inlining closure
  this.inlineClosure(node);
};

Inliner.prototype.inlineClosure = function inlineClosure(node) {
  if (node.type !== 'CallExpression')
    return;

  var callee = node.callee;
  var isCallThis = callee.type === 'MemberExpression' &&
                   callee.object.type === 'FunctionExpression' &&
                   ((callee.property.name ||
                     callee.property.value) === 'call') &&
                   node.arguments.length >= 1 &&
                   node.arguments[0].type === 'ThisExpression';
  var noThis = callee.type === 'FunctionExpression' &&
               node.arguments.length === 0 &&
               this.noThisUsage(callee);
  if (!isCallThis && !noThis)
    return;

  // Skip nested blocks
  // TODO(indutny): figure out where they're created
  var stmts = isCallThis ? node.callee.object.body : node.callee.body;
  do {
    var last = stmts;
    while (stmts.type === 'BlockStatement') stmts = stmts.body;
    while (Array.isArray(stmts) &&
           stmts.length === 1 &&
           stmts[0].type === 'BlockStatement') {
      stmts = stmts[0].body;
    }
  } while (last !== stmts);

  var body;
  var result;
  if (stmts.length === 1 && stmts[0].type === 'ReturnStatement') {
    // local()(function() { return expr })
    result = stmts[0].argument;
  } else {
    var pre = stmts.slice(0, -1),
        last = stmts[stmts.length - 1];

    if (pre.every(this.isNonReturn.bind(this))) {
      if (this.isNonReturn(last)) {
        // (function() { non-return* }).call(this)
        body = stmts;
      } else if (last.type === 'ReturnStatement') {
        // (function() { non-return*; return ... }).call(this)
        body = pre;
        result = last.argument;
      }
    }
  }

  if (!body && !result)
    return;

  // Inline function's body into last block
  if (!this.lastBlock || !this.lastStmt)
    return;

  var index = this.lastBlock.body.indexOf(this.lastStmt);
  if (index === -1)
    return;

  body = body || [];
  result = result || { type: 'Identifier', name: 'undefined' };

  // Try replacing statement when leaving it
  this.blockSubsts.push({
    index: index,
    block: this.lastBlock,
    from: node,
    body: body,
    result: result
  });

  // Sort by decreasing index to ensure replacement order
  // XXX: Use insertion sort
  this.blockSubsts.sort(function(a, b) {
    return b.index - a.index;
  });
};

Inliner.prototype.tryInline = function tryInline(node) {
  if (node !== this.lastBlock || !this.blockSubsts.length)
    return;

  this.blockSubsts = this.blockSubsts.filter(function(item) {
    if (item.block !== this.lastBlock) return true;

    var stmt = item.block.body[item.index],
        subst = null;

    var stmts = item.body.concat(stmt),
        res = item.result;

    if (stmt.type === 'ExpressionStatement' &&
        stmt.expression.type === 'AssignmentExpression' &&
        stmt.expression.right === item.from) {
      subst = stmts;
      stmt.expression.right = res;
    } else if (stmt.type === 'VariableDeclaration' &&
               stmt.declarations.length === 1 &&
               stmt.declarations[0].init === item.from) {
      subst = stmts;
      stmt.declarations[0].init = res;
    } else if (stmt.type === 'ExpressionStatement' &&
               stmt.expression === item.from) {
      subst = stmts.slice(0, -1);
    } else if (stmt.type === 'ReturnStatement' &&
               stmt.argument === item.from) {
      stmt.argument = res;
      subst = stmts;
    }

    if (subst !== null) {
      Array.prototype.splice.apply(item.block.body,
                                   [item.index, 1].concat(subst));
    }
    return false;
  }, this);
};

Inliner.prototype.isNonReturn = function isNonReturn(ast) {
  if (!ast)
    return true;

  if (ast.type === 'BlockStatement')
    return ast.body.every(this.isNonReturn.bind(this));

  if (ast.type === 'IfStatement')
    return this.isNonReturn(ast.consequent) && this.isNonReturn(ast.alternate);

  if (ast.type === 'WhileStatement' ||
      ast.type === 'DoWhileStatement' ||
      ast.type === 'ForStatement' ||
      ast.type === 'ForInStatement')
    return this.isNonReturn(ast.body);

  if (ast.type === 'VarStatement') {
    return ast.declarations.every(function(decl) {
      return /^__\$/.test(decl.id.name);
    });
  }

  return ast.type !== 'ReturnStatement';
};

Inliner.prototype.noThisUsage = function noThisUsage(ast) {
  var res = true;
  estraverse.traverse(ast, {
    enter: function(ast) {
      if (ast.type === 'ThisExpression') {
        res = false;
        this.skip();
      } else if (ast.type === 'FunctionExpression') {
        this.skip();
      }
    }
  });

  return res;
};
