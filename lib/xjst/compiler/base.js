var esprima = require('esprima'),
    uglify = require('uglify-js'),
    estraverse = require('estraverse'),
    vm = require('vm'),
    assert = require('assert');

var xjst = require('../../xjst');
var compiler = require('./');

// Get required constructors
var Inliner = compiler.Inliner;
var Splitter = compiler.Splitter;
var Jailer = compiler.Jailer;
var Template = compiler.Template;
var Predicate = compiler.Predicate;
var Group = compiler.Group;
var Map = compiler.Map;
var utils = xjst.utils;

// Compiler constructor
function Compiler(options) {
  this.options = options || {};
  this.idHash = {};
  this.scores = {};
  this.idCount = 0;
  this.bodyId = 1;
  this.bodyUid = 0;
  this.mapId = 1;
  this.applyFlags = 0;

  this.ctx = { type: 'Identifier', name: '__$ctx' };
  this.ref = { type: 'Identifier', name: '__$ref' };
  this.applyFlag = { type: 'Identifier', name: '__$a' };
  this.resetApply = {
    type: 'ExpressionStatement',
    expression: {
      type: 'AssignmentExpression',
      operator: '=',
      left: {
        type: 'MemberExpression',
        computed: false,
        object: this.ctx,
        property: this.applyFlag
      },
      right: { type: 'Literal', value: 0 }
    }
  };

  this.renderStack = [];
  this.renderHistory = [];
  this.renderCacheMap = {};
  this.sharedBodies = {};
  this.maps = {};

  // Context extensions from local({}) stmts
  this.extensions = {};

  this.program = null;
  this.inputProgram = null;

  this.jailer = Jailer.create();
  this.inliner = Inliner.create();
  this.splitter = Splitter.create(this);
};
exports.Compiler = Compiler;

exports.create = function create(options) {
  return new Compiler(options);
};

// Generate source code from input code
Compiler.prototype.generate = function generate(code) {
  if (this.options['no-opt'] || this.options.optimize === false) {
    return '/// -------------------------------------\n' +
           '/// ---------- Bootstrap start ----------\n' +
           '/// -------------------------------------\n' +
           utils.run.toString() + ';\n' +
           'exports.apply = function apply(ctx) {\n' +
           '  try {\n' +
           '    return applyc(ctx || this);\n' +
           '  } catch (e) {\n' +
           '    e.xjstContext = ctx || this;\n' +
           '    throw e;\n' +
           '  }\n' +
           '};' +
           'function applyc(ctx) {\n' +
           '  return run(templates, ctx);\n' +
           '};\n' +
           'try {\n' +
           '  applyc({\n' +
           '    $init:true,\n' +
           '    $exports: exports,\n' +
           '    $context: { recordExtensions: function() {} }\n' +
           '  });\n' +
           '} catch (e) {\n' +
           '  // Just ignore any errors\n' +
           '}\n' +
           'function templates(template, local, apply, applyNext, oninit) {\n' +
           '/// -------------------------------------\n' +
           '/// ---------- Bootstrap end ------------\n' +
           '/// -------------------------------------\n' +
           '\n' +
           '/// -------------------------------------\n' +
           '/// ---------- User code start ----------\n' +
           '/// -------------------------------------\n' +
           code +
           '/// -------------------------------------\n' +
           '/// ---------- User code end ------------\n' +
           '/// -------------------------------------\n' +
           '};';
  }

  var ast = esprima.parse(code);
  assert.equal(ast.type, 'Program');

  ast = this.translate(ast);

  var uast = uglify.AST_Node.from_mozilla_ast(ast);

  return uast.print_to_string({
    beautify: this.options.beautify === false ? false : true
  });
};

// Compile source to js function
Compiler.prototype.compile = function compile(code) {
  var out = this.generate(code),
      exports = {};

  vm.runInNewContext(
    '(function(exports, console) {\n' +
    out +
    '\n})(exports, console)',
    {
      exports: exports,
      console: console
    }
  );

  return exports;
};

// Run compiler in phases to translate AST to AST
Compiler.prototype.translate = function translate(ast) {
  // 1. Get all template()() invokations (and other chunks of code)
  var program = this.getTemplates(ast);

  // 2. Transform template predicates in a compiler-readable form
  program.templates = program.templates.map(this.transformTemplates.bind(this));

  var result = this._translate2(program, false);

  // Prevent apply inlinings
  this.inlineDepth = this.maxInlineDepth;

  // 3. Add maps to result
  // NOTE: this could possibly generate more shared bodies,
  // so order is important here.
  this.addMaps(result);

  // 4. Add shared bodies to result
  this.addBodies(result);

  // 5. Inline function expressions
  result = this.inliner.inline(result);

  // 6. Split big functions into small ones
  result = this.splitter.split(result);

  return result;
};

Compiler.prototype._translate2 = function translate2(program, bodyOnly) {
  var cacheKey = this._renderCacheKey(program.templates);
  var res = this.probeRenderCache(cacheKey);
  if (res && bodyOnly) return xjst.utils.cloneAst(res);

  var old = this.program;

  this.program = program;
  this.inputProgram = this.inputProgram || program;
  this.inlineDepth++;

  // 1. Save render stack from enemies
  var oldRender = { stack: this.renderStack, history: this.renderHistory };
  this.renderStack = [];
  this.renderHistory = [];

  // 2. Roll-out local() and apply/applyNext() calls
  program.templates.forEach(function(template) {
    template.rollOut();
  });

  // 3. Group templates
  program.templates = this.sortGroup(program.templates);

  // Restore `this.program`
  this.program = old;

  // 4. Render program back to AST form
  var res = this.render(program, bodyOnly);

  // 5. Restore render stack
  this.renderStack = oldRender.stack;
  this.renderHistory = oldRender.history;

  // 6. Restore inline depth
  this.inlineDepth--;

  this.renderCache(cacheKey, res);
  return res;
};

// Filter out templates from program's body
Compiler.prototype.getTemplates = function getTemplates(ast) {
  var other = [],
      init = [];

  return {
    templates: ast.body.filter(function(stmt) {
      function fail() {
        other.push(stmt);
        return false;
      };

      if (stmt.type !== 'ExpressionStatement') return fail();

      var expr = stmt.expression;
      if (expr.type !== 'CallExpression') return fail();

      var callee = expr.callee;
      if (callee.type === 'CallExpression') {
        if (callee.callee.type !== 'Identifier' ||
            callee.callee.name !== 'template') {
          return fail();
        }
      } else if (callee.type === 'Identifier' && callee.name === 'oninit') {
        init = init.concat(expr.arguments);
        return false;
      } else {
        return fail();
      }

      return true;
    }).reverse(),
    init: init,
    other: other
  };
};

// Get unique id for a javascript value
Compiler.prototype.getId = function getId(value) {
  var key = JSON.stringify(value);

  if (this.idHash.hasOwnProperty(key)) {
    this.idHash[key].score++;
    return this.idHash[key].id;
  }

  var id = this.idCount++;
  this.idHash[key] = { id: id, value: value};

  return id;
};

Compiler.prototype.accountScore = function accountScore(key, value) {
  if (!this.scores.hasOwnProperty(key)) {
    this.scores[key] = { count: 0, variance: 0, values: {} };
  }

  var item = this.scores[key];
  item.count++;
  if (!item.values.hasOwnProperty(value)) {
    item.values[value] = 1;
    item.variance++;
  } else {
    item.values[value]++;
  }
};

// Get score for unique javascript value
Compiler.prototype.getScore = function getScore(id) {
  if (!this.scores.hasOwnProperty(id)) return 0;

  return this.scores[id].count;
};

// Return unique apply flag
Compiler.prototype.getApplyFlag = function getApplyFlag() {
  return {
    type: 'Literal',
    value: ++this.applyFlags
  };
};

Compiler.prototype.sanitize = function sanitize(stmt) {
  return this.replaceThis(stmt);
};

// Replace `this` with `__$ctx`
Compiler.prototype.replaceThis = function replaceThis(stmt) {
  var ctx = this.ctx;
  estraverse.replace(stmt, {
    enter: function(node, parent, notify) {
      if (node.type === 'ThisExpression') {
        return ctx;
      } else if (node.type === 'FunctionDeclaration' ||
                 node.type === 'FunctionExpression') {
        this.skip();
      }
    }
  });
  return stmt;
};

Compiler.prototype.jailVars = function jailVars(stmt) {
  return this.jailer.jail(stmt);
};

Compiler.prototype.addChange = function addChange(predicate) {
  var predicates = Array.isArray(predicate) ? predicate : [ predicate ];

  this.renderHistory.push(predicates.length);
  for (var i = 0; i < predicates.length; i++) {
    this.renderStack.push(predicates[i]);
  }
};

Compiler.prototype.revertChange = function revertChange() {
  if (this.renderHistory.length === 0) throw new Error('Render OOB');
  var n = this.renderHistory.pop();
  for (var i = 0; i < n; i++) {
    this.renderStack.pop();
  }
};

Compiler.prototype.registerBody = function registerBody(body) {
  if (body.shareable && this.sharedBodies.hasOwnProperty(body.id)) {
    this.shareBody(body);
    return true;
  }
  if (body.shareable && body.primitive) {
    this.shareBody(body);
    return true;
  }

  return false;
};

Compiler.prototype.shareBody = function shareBody(body) {
  assert(body.shareable);
  body.id = body.id === null ? this.bodyId++ : body.id;
  this.sharedBodies[body.id] = body;
};

Compiler.prototype.unshareBody = function unshareBody(body) {
  assert(body.shareable);
  delete this.sharedBodies[body.id];
};

Compiler.prototype._renderCacheKey = function _renderCacheKey(templates) {
  return templates.map(function(t) {
    return t.uid.toString(36);
  }).join(':');
};

Compiler.prototype.probeRenderCache = function probeRenderCache(key) {
  return this.renderCacheMap[key];
};

Compiler.prototype.renderCache = function renderCache(key, body) {
  this.renderCacheMap[key] = body;
};

Compiler.prototype.addBodies = function addBodies(result) {
  var changed = true,
      visited = {};

  while (changed) {
    changed = false;
    Object.keys(this.sharedBodies).forEach(function(id) {
      if (visited.hasOwnProperty(id)) return;
      visited[id] = true;
      changed = true;

      var body = this.sharedBodies[id];
      assert.equal(body.id, id);

      var out = body.render(true).apply;
      out = Array.isArray(out) ? out.slice() : [out];

      // Optimization:
      // If last statement isn't return - return
      if (out.length === 0 || out[out.length - 1].type !== 'ReturnStatement') {
        out = out.concat({
          type: 'ReturnStatement',
          argument: this.ref
        });
      }

      result.body.push({
        type: 'FunctionDeclaration',
        id: this.getBodyName(body),
        params: [ this.ctx, this.ref ],
        defaults: [],
        rest: null,
        generator: false,
        expression: false,
        body: {
          type: 'BlockStatement',
          body: out
        }
      });
    }, this);
  }
};

Compiler.prototype.registerMap = function registerMap(map) {
  if (map.id) return;
  map.id = this.mapId++;
  this.maps[map.id] = map;
};

Compiler.prototype.addMaps = function addMaps(result) {
  Object.keys(this.maps).forEach(function(id) {
    var map = this.maps[id];
    result.body.push(map.getMap());
  }, this);
};

Compiler.prototype.getBodyName = function getBodyName(body) {
  assert(body.shared);
  assert(this.sharedBodies.hasOwnProperty(body.id));
  return { type: 'Identifier', name: '__$b' + body.id };
};

Compiler.prototype.getMapName = function getMapName(map) {
  assert(this.maps.hasOwnProperty(map.id));
  return { type: 'Identifier', name: '__$m' + map.id };
};

Compiler.prototype.renderArray = function renderArray(bodies) {
  var out = { apply: [], other: [], init: [] };

  bodies.forEach(function(body) {
    var ast = body.render();
    if (ast.apply) out.apply = out.apply.concat(ast.apply);
    if (ast.other) out.other = ast.other.concat(out.other);
    if (ast.init) out.init = out.init.concat(ast.init);
  }, this);

  return out;
};

Compiler.prototype.checkRef = function checkRef(expr) {
  var self = this;
  var res = { type: 'Identifier', name: '__$r' };

  function cantBeRef(value) {
    if (value.type === 'Literal' ||
        value.type === 'ObjectExpression' ||
        value.type === 'ArrayExpression') {
      return true;
    }

    if (value.type === 'ExpressionStatement')
      return cantBeRef(value.expression);

    if (value.type === 'BinaryExpression')
      return cantBeRef(value.left) && cantBeRef(value.right);

    if (value.type === 'CallExpression')
      return false;

    if (value.type === 'Identifier' && value.name !== 'undefined')
      return false;

    return true;
  }

  // Fastest case, just literal
  if (cantBeRef(expr))
    return { apply: [{ type: 'ReturnStatement', argument: expr }] };

  // Simple case
  // if (expr !== __$ref) return expr;
  if (expr.type === 'Identifier') {
    return {
      apply: [{
        type: 'IfStatement',
        test: {
          type: 'BinaryExpression',
          operator: '!==',
          left: expr,
          right: this.ref
        },
        consequent: {
          type: 'ReturnStatement',
          argument: expr
        },
        alternate: null
      }]
    };
  }

  // var __$r = expr
  // if (__$r !== __$ref) return __$r;
  return {
    apply: [{
      type: 'VariableDeclaration',
      kind: 'var',
      declarations: [{
        type: 'VariableDeclarator',
        id: res,
        init: expr
      }]
    }, {
      type: 'IfStatement',
      test: {
        type: 'BinaryExpression',
        operator: '!==',
        left: res,
        right: this.ref
      },
      consequent: {
        type: 'ReturnStatement',
        argument: res
      },
      alternate: null
    }]
  };
};

// Transform AST templates into readable form
Compiler.prototype.transformTemplates = function transformTemplates(template) {
  var expr = template.expression,
      predicates = expr.callee.arguments,
      body = expr.arguments[0] || { type: 'Identifier', name: 'undefined' };

  function isConst(val) {
    return val.type === 'Literal';
  }

  // Translate all predicates to `a === c` form
  // and map as { expr, value } pair
  predicates = predicates.map(function(pred) {
    var expr,
        value;

    if (pred.type === 'FunctionExpression') {
      if (pred.body.body.length === 1 &&
          pred.body.body[0].type === 'ReturnStatement') {
        pred = pred.body.body[0].argument;
      } else {
        pred = {
          type: 'CallExpression',
          callee: {
            type: 'MemberExpression',
            computed: false,
            object: pred,
            property: { type: 'Identifier', name: 'call' }
          },
          arguments: [ { type: 'ThisExpression'} ]
        };
      }
    }

    if (pred.type === 'BinaryExpression' && pred.operator === '===') {
      if (isConst(pred.right)) {
        // expr === const
        expr = pred.left;
        value = pred.right;
      } else {
        // const === expr
        expr = pred.right;
        value = pred.left;
      }
    } else {
      // expr <=> !(expr) === false
      expr = {
        type: 'UnaryExpression',
        prefix: true,
        operator: '!',
        argument: pred
      };
      value = { type: 'Literal', value: false };
    }

    return new Predicate(this, expr, value);
  }, this);

  return new Template(this, predicates, body);
};

// Sort and group templates by first predicate
// (recursively)
Compiler.prototype.sortGroup = function sortGroup(templates) {
  var self = this,
      out = templates.slice();

  // Sort predicates in templates by popularity
  templates.forEach(function(template) {
    template.predicates.sort(function(a, b) {
      return b.getScore() - a.getScore();
    });
  });

  var groups = [];

  // Group templates by first predicate
  groups.push(templates.reduce(function(acc, template) {
    if (acc.length === 0) return [ template ];

    if (template.predicates.length === 0 ||
        acc[0].predicates.length === 0 ||
        acc[0].predicates[0].id !== template.predicates[0].id) {
      groups.push(acc);
      return [ template ];
    }

    acc.push(template);
    return acc;
  }, []));

  // Create `Group` instance for each group and .sortGroup() them again
  out = groups.reduce(function(acc, group) {
    if (group.length <= 1) return acc.concat(group);

    // Remove first predicate
    var pairs = group.map(function(member) {
      return { predicate: member.predicates.shift(), body: member };
    });

    // Pairs all have the same predicate,
    // find pairs with same constant and .sortGroup() them too
    var subgroups = {};
    pairs.forEach(function(pair) {
      var id = pair.predicate.valueId;
      if (!subgroups[id]) {
        subgroups[id] = [ pair ];
      } else {
        subgroups[id].push(pair);
      }
    });

    // Sort group each subgroup again
    pairs = Object.keys(subgroups).reduce(function(acc, key) {
      var subgroup = subgroups[key];
      if (subgroup.length === 0) return acc;

      var predicate = subgroup[0].predicate;
      acc.push({
        predicate: predicate,
        bodies: self.sortGroup(subgroup.map(function(member) {
          return member.body;
        }))
      });

      return acc;
    }, []);

    return acc.concat(new Group(self, pairs));
  }, []);

  return out;
};

Compiler.prototype.registerExtension = function registerExtension(name) {
  if (name !== '__proto__')
    this.extensions[name] = true;
};

Compiler.prototype.getRecordExtensions = function getRecordExtensions() {
  var ctx = { type: 'Identifier', name: 'ctx' };
  var body = [];

  Object.keys(this.extensions).forEach(function(name) {
    body.push({
      type: 'ExpressionStatement',
      expression: {
        type: 'AssignmentExpression',
        operator: '=',
        left: {
          type: 'MemberExpression',
          computed: false,
          object: ctx,
          property: { type: 'Identifier', name: name }
        },

        // Old apply flags should have boolean value
        // New flags - number
        // Other - undefined
        right: /^__\$anflg/.test(name) ? { type: 'Literal', value: false } :
               name === this.applyFlag.name ?
                  { type: 'Literal', value: 0 } :
                  { type: 'Identifier', name: 'undefined' }
      }
    });
  }, this);

  return {
    type: 'FunctionExpression',
    id: null,
    params: [ ctx ],
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

Compiler.prototype.render = function render(program, bodyOnly) {
  var stmts = [],
      initializers = program.init.slice(),
      applyBody = program.other.map(function(stmt) {
        return this.sanitize(stmt);
      }, this),
      applyContext = {
        type: 'LogicalExpression',
        operator: '||',
        left: { type: 'Identifier', name: 'ctx' },
        right: { type: 'ThisExpression' }
      },
      apply = {
        type: 'FunctionDeclaration',
        id: { type: 'Identifier', name: 'apply' },
        params: [{ type: 'Identifier', name: 'ctx' }],
        defaults: [],
        rest: null,
        generator: false,
        expression: false,
        body: {
          type: 'BlockStatement',
          body: [{
            type: 'TryStatement',
            block: {
              type: 'BlockStatement',
              body: [{
                type: 'ReturnStatement',
                argument: {
                  type: 'CallExpression',
                  callee: { type: 'Identifier', name: 'applyc' },
                  arguments: [applyContext, this.ref]
                }
              }]
            },
            guardedHandlers: [],
            handlers: [{
              type: 'CatchClause',
              param: { type: 'Identifier', name: 'e' },
              body: {
                type: 'BlockStatement',
                body: [{
                  type: 'ExpressionStatement',
                  expression: {
                    type: 'AssignmentExpression',
                    operator: '=',
                    left: {
                      type: 'MemberExpression',
                      computed: false,
                      object: applyContext,
                      property: { type: 'Identifier', name: 'xjstContext' }
                    },
                    right: { type: 'Identifier', name: 'e' }
                  }
                }, {
                  type: 'ThrowStatement',
                  argument: { type: 'Identifier', name: 'e' }
                }]
              }
            }],
            finalizer: null
          }]
        }
      },
      applyc = {
        type: 'FunctionDeclaration',
        id: { type: 'Identifier', name: 'applyc' },
        params: [ this.ctx, this.ref ],
        defaults: [],
        rest: null,
        generator: false,
        expression: false,
        body: {
          type: 'BlockStatement',
          body: null
        }
      };

  // var __$ref = {};
  stmts.push({
    type: 'VariableDeclaration',
    kind: 'var',
    declarations: [{
      type: 'VariableDeclarator',
      id: this.ref,
      init: { type: 'ObjectExpression', properties: [] }
    }]
  });

  // exports.apply = apply
  stmts.push(apply);
  stmts.push({
    type: 'ExpressionStatement',
    expression: {
      type: 'AssignmentExpression',
      operator: '=',
      left: {
        type: 'MemberExpression',
        computed: false,
        object: { type: 'Identifier', name: 'exports' },
        property: { type: 'Identifier', name: 'apply' }
      },
      right: { type: 'Identifier', name: 'apply' }
    }
  });

  // applyc
  stmts.push(applyc);

  // Call applyc once to allow users override exports
  // [init functions].forEach(function(fn) { fn(exports, this) }, ctx);
  stmts.push({
    type: 'ExpressionStatement',
    expression: {
      type: 'CallExpression',
      callee: {
        type: 'MemberExpression',
        computed: false,
        property: { type: 'Identifier', name: 'forEach'},
        object: {
          type: 'ArrayExpression',
          elements: initializers
        }
      },
      arguments: [{
        type: 'FunctionExpression',
        id: null,
        params: [ { type: 'Identifier', name: 'fn' } ],
        defaults: [],
        rest: null,
        generator: false,
        expression: false,
        body: {
          type: 'BlockStatement',
          body: [{
            type: 'ExpressionStatement',
            expression: {
              type: 'CallExpression',
              callee: { type: 'Identifier', name: 'fn' },
              arguments: [
                { type: 'Identifier', name: 'exports' },
                { type: 'ThisExpression' }
              ]
            }
          }]
        }
      }, {
        type: 'ObjectExpression',
        properties: [{
          type: 'Property',
          key: { type: 'Literal', value: 'recordExtensions' },
          value: this.getRecordExtensions(),
          kind: 'init'
        }]
      }]
    }
  });

  // Render each template
  var out = this.renderArray(program.templates);

  /// Apply to the bottom
  if (out.apply) applyBody = applyBody.concat(out.apply);

  // Other to the top
  if (out.other) applyBody = out.other.concat(applyBody);

  // Initializers to the initializers array
  if (out.init) {
    if (Array.isArray(out.init)) {
      initializers.push.apply(initializers, out.init);
    } else {
      initializers.push(out.init);
    }
  }

  if (bodyOnly)
    return applyBody;

  // Set function's body
  applyc.body.body = applyBody;

  // Reset apply flag at last
  if (applyBody.length === 0 ||
      applyBody[applyBody.length - 1].type !== 'ReturnStatement') {
    applyBody.push(this.resetApply);
  }

  return {
    type: 'Program',
    body: stmts
  };
};
