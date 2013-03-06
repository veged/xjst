var xjst = require('../../xjst'),
    assert = require('assert'),
    utils = xjst.utils,
    XJSTLocalAndApplyCompiler = xjst.ometa.XJSTLocalAndApplyCompiler;

//
// ### function digIn (state, node, options)
// #### @state {Object} source state
// #### @node {AST} target node
// #### @options {Object} options
// Digs into switches sequence if state allows it
//
function digIn(state, node, options) {
  if (!node.tagStr || !state.hasOwnProperty(node.tagStr)) return node;

  var cases = node.cases.map(function(branch) {
        return [utils.stringify(branch[0]), branch[1]];
      }),
      result;

  cases.some(function(branch) {
    if (state.hasOwnProperty(node.tagStr) &&
        state[node.tagStr] === branch[0]) {
      result = branch[1];
      return true;
    }
    return false;
  });

  if (!result) result = node['default'];

  return digIn(state, result, options);
};

function PredicateList() {
  this.map = {};
  this.children = {};
  this.list = [];
};

PredicateList.prototype.add = function add(predicate) {
  var id = predicate[0],
      left = predicate[1];

  if (this.map.hasOwnProperty(id)) return;

  var str = utils.stringify(left),
      item = {
        predicate: predicate,
        str: str
      };

  this.map[id] = item;

  this.list.forEach(function(item) {
    var parent,
        child;
    if (item.str.indexOf(str) !== -1) {
      parent = predicate;
      child = item.predicate;
    } else if (str.indexOf(item.str) !== -1) {
      parent = item.predicate;
      child = predicate;
    } else {
      return;
    }

    if (!this.children[parent[0]]) {
      this.children[parent[0]] = [ child ];
    } else {
      this.children[parent[0]].push(child);
    }
  }, this);

  this.list.push(item);
};

//
// ### function process (tree, source, serializer, recompiled)
// #### @tree {AST}
// #### @source {Array} Original source (XJST AST)
// #### @options {Object} various options
// #### @recompiled {Boolean} Internal flag
// Optimizes `apply()` statements by redirecting recursive calls into the
// middle of the tree
// May change original tree and apply engine again (for ghost cloning)
//
exports.process = function process(tree, source, options, recompiled) {
  var templates = source,
      predicates = new PredicateList();

  templates.forEach(function(template) {
    template[0].forEach(function(predicate) {
      predicates.add(predicate);
    });
  });

  // Traverse tree
  var applies = utils.reduceTree(tree, function(acc, node, stack) {
    if (!node.stmt) return acc;

    // Get locals and applies sequence:
    // local () { ... apply() ... } => ['localStart', 'apply', 'localEnd']
    var seq = XJSTLocalAndApplyCompiler.match(node.stmt, 'topLevel');
    if (seq.length === 0) return acc;

    // Create a state for each individual apply
    var locals = [];
    seq.forEach(function(op) {
      if (op[0] === 'localStart') {
        locals.push(op[1]);
        return;
      } else if (op[0] === 'localEnd') {
        locals.pop();
        return;
      }

      if (op[0] !== 'apply') return;

      var state = {};

      // Apply changes from parent nodes in if() tree
      for (var i = stack.length - 1; i >= 0; i--) {
        var parent = stack[i],
            value;

        if (i === stack.length - 1) {
          value = parent.cases.filter(function(branch) {
            return branch.body === node;
          })[0];
        } else {
          value = parent.cases.filter(function(branch) {
            return branch.body === stack[i + 1];
          })[0];
        }

        if (value) {
          state[parent.tagId] = utils.stringify(value.value);
        }

        // Stop on fallback
        if (i > 0 && parent === stack[i - 1].fallback) break;
      }

      // Apply local changes made right before apply() call
      locals.forEach(function(local) {
        local.forEach(function(as) {
          if (as[2] !== 'reset') predicates.add(as);

          // Remove all nested predicates from state
          if (predicates.children[as[0]]) {
            predicates.children[as[0]].forEach(function(predicate) {
              delete state[predicate[0]];
            });
          }

          if (as[2] === 'reset')
            delete state[as[0]];
          else
            state[as[0]] = utils.stringify(as[2]);
        });
      });

      // Now as we know state - create specialized version of tree, without
      // templates that definitely doesn't match this state.
      var changed = false;

      var specialized = templates.filter(function(template) {
        return template[0].every(function(predicate) {
          if (!state[predicate[0]]) return true;
          return state[predicate[0]] === utils.stringify(predicate[2]);
        });
      // Remove predicates if their value is already known
      }).map(function(template) {
        var predicates = template[0].filter(function(predicate) {
          if (predicate[0] !== 0 && state[predicate[0]]) {
            changed = true;
            return false;
          }
          return true;
        });

        predicates.push([
          0,
          ['get', 'true'],
          ['get', 'true']
        ]);

        return [ predicates ].concat(template.slice(1));
      });

      // Nor template count, nor their predicates has changed, do not create
      // separate tree
      if (specialized.length === templates.length && !changed) return;

      // Generate!
      op[1].code = options.serializer.fnList.add(
        node.id,
        options.compile(specialized),
        node
      ) + '.call(this)';
    });

    return acc;
  }, []);

  return tree;
};
