var utils = exports;

var estraverse = require('estraverse');

utils.run = function run(templates, context) {
  var ignore = context.$ignore;
  var globalCtx = __$$globalCtx;
  if (!ignore) {
    context.$ignore = [];
    ignore = context.$ignore;
  }

  var index = 0;
  var currentId = null;
  var last = null;

  function template() {
    var id = index++;
    var match = !context.$override &&
                Array.prototype.every.call(arguments, function(cond) {
      try {
        return typeof cond === 'function' ? cond.call(context) : cond;
      } catch (e) {
        if (/Cannot read property/.test(e.message))
          return false;
      }
    });

    // Respect applyNext
    if (match && ignore.indexOf(id) !== -1) match = false;

    // Ignore body if match failed
    if (!match) return function() {};

    // Set current id
    currentId = id;

    return function bodyHandler(body) {
      last = {
        id: id,
        body: typeof body === 'function' ? body.bind(context)
                                         : function() { return body }
      };

      return null;
    };
  };

  function local() {
    var backup = [];
    var args = Array.prototype.slice.call(arguments);

    args.forEach(function(change) {
      if (change === null)
        return;

      if (typeof change !== 'object')
        throw new Error('apply() and local() accepts only object literals');

      Object.keys(change).forEach(function(key) {
        var parts = key.split('.'),
            newValue = change[key],
            oldValue,
            isGlobal = parts[0] === '$$global',
            subContext = isGlobal ? globalCtx : context;

        if (isGlobal) {
          parts.shift();
        }

        // Dive inside
        for (var i = 0; i < parts.length - 1; i++) {
          subContext = subContext[parts[i]];
        }

        // Set property and remember old value
        oldValue = subContext[parts[i]];
        subContext[parts[i]] = newValue;

        // Push old value to backup list
        backup.push({
          isGlobal: isGlobal,
          key: parts,
          value: oldValue
        });
      });
    });

    return function bodyHandler(body) {
      var result = typeof body === 'function' ? body.call(context) : body;

      // Rollback old values
      for (var i = backup.length - 1; i >= 0; i--) {
        var subContext = backup[i].isGlobal ? globalCtx : context,
            change = backup[i];

        // Dive inside
        for (var j = 0; j < change.key.length - 1; j++) {
          subContext = subContext[change.key[j]];
        }

        // Restore value
        subContext[change.key[j]] = change.value;
      }

      return result;
    };
  };

  function apply() {
    return local.apply(this, arguments)(function() {
      return run(templates, context);
    });
  };

  function applyNext() {
    return local.apply(this, arguments)(function() {
      var len = ignore.push(currentId);
      var ret = run(templates, context);
      if (len === ignore.length)
        ignore.pop();
      return ret;
    });
  };

  function oninit(cb) {
    if (context.$init) {
      if (context.$context && !context.$context.resetApplyNext) {
        context.$context.resetApplyNext = function(context) {
          context.$ignore.length = 0;
        };
      }

      cb(exports, context.$context);
    }
  }

  function fetch(name) {
    var parts = name.split('.'),
        value = globalCtx;

    // Dive inside
    for (var i = 0; i < parts.length; i++) {
      value = value[parts[i]];
    }

    return value;
  }

  function set(name, val) {
    var parts = name.split('.'),
        value = globalCtx;

    // Dive inside
    for (var i = 0; i < parts.length - 1; i++) {
      value = value[parts[i]];
    }
    value[parts[i]] = val;

    return value;
  };

  templates.call(context, template, local, apply, applyNext, oninit, fetch,
                 set);

  if (!last) {
    if (context.$init) return;
    throw new Error('Match failed, no templates found');
  }

  return last.body();
};

utils.cloneAst = function cloneAst(ast) {
  if (ast === null || ast === undefined ||
      typeof ast === 'number' || typeof ast === 'string' ||
      typeof ast === 'boolean' || ast instanceof RegExp) {
    return ast;
  }
  if (Array.isArray(ast)) return ast.map(cloneAst);

  var res = {};
  Object.keys(ast).forEach(function(key) {
    res[key] = cloneAst(ast[key]);
  })

  return res;
};

var visitorKeys = estraverse.VisitorKeys;

var identifyMap = {
  AssignmentExpression: function(ast) {
    return ast.operator;
  },
  BinaryExpression: function(ast) {
    return ast.operator;
  },
  FunctionDeclaration: function(ast) {
    return ast.generator + ':' + ast.expression;
  },
  FunctionExpression: function(ast) {
    return ast.generator + ':' + ast.expression;
  },
  Identifier: function(ast) {
    return ast.name;
  },
  Literal: function(ast) {
    return JSON.stringify(ast.value);
  },
  MemberExpression: function(ast) {
    return ast.computed;
  },
  Property: function(ast) {
    return ast.kind;
  },
  UnaryExpression: function(ast) {
    return ast.operator + ':' + ast.prefix;
  },
  UpdateExpression: function(ast) {
    return ast.prefix;
  },
  VariableDeclaration: function(ast) {
    return ast.kind;
  }
};

utils.identify = identify;
function identify(ast) {
  if (!ast)
    return '';
  if (Array.isArray(ast))
    return '[' + ast.map(identify).join(',') + ']';

  var t = ast.type;
  var out = '{' + t;
  var map = identifyMap[t];
  if (map)
    out += ':' + map(ast);

  var keys = visitorKeys[t];
  if (keys.length)
    out += '->';
  for (var i = 0; i < keys.length; i++) {
    if (i !== 0)
      out += ',';
    out += identify(ast[keys[i]]);
  }

  out += '}';
  return out;
};

utils.isLiteral = function isLiteral(ast) {
  if (ast.type === 'Literal')
    return true;

  if (ast.type === 'Identifier' && ast.name === 'undefined')
    return true;

  if (ast.type === 'ObjectExpression') {
    return ast.properties.every(function(prop) {
      return isLiteral(prop.value);
    });
  }

  if (ast.type === 'ArrayExpression') {
    return ast.elements.every(function(elem) {
      return isLiteral(elem);
    });
  }

  return false;
};

utils.isName = function isName(s) {
  var re = /^[a-z$_][a-z0-9$_]*$/i;
  return re.test(s);
};
