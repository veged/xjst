var xjst = require('../../xjst'),
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
}

//
// ### function optimizeRecursion (tree, source, serializer, recompiled)
// #### @tree {AST}
// #### @source {Array} Original source (XJST AST)
// #### @options {Object} various options
// #### @recompiled {Boolean} Internal flag
// Optimizes `apply()` statements by redirecting recursive calls into the
// middle of the tree
// May change original tree and apply engine again (for ghost cloning)
//
exports.process = function optimizeRecursion(tree, source, options,
                                             recompiled) {
  if (options.engine.name !== 'sort-group' || options['force-inline'] ||
      options.asyncify) {
    return tree;
  }

  var forceRecompile = false,
      other = source[0],
      templates = source[1],
      ids = Object.keys(options.map),
      childMap = {},
      serializer = options.serializer,
      fnList = serializer.fnList,
      hashList = serializer.hashList;

  // Traverse tree
  var applies = utils.reduceTree(tree, function(acc, node) {
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

      // Skip apply's without local changes
      if (op[0] !== 'apply' || locals.length === 0) return;

      var state = {};

      Object.keys(node.state.states.high).forEach(function(key) {
        var values = node.state.states.high[key];
        if (values.length !== 1 || typeof values[0] !== 'string') return;
        state[key] = values[0];
      }, node.state.states.high);

      locals.forEach(function(local) {
        local.forEach(function(as) {
          if (!options.map[as[0]]) {
            options.map[as[0]] = utils.stringify(as[1]);
            options.values[options.map[as[0]]] = [];
          }

          var skey = options.map[as[0]];

          // If local was setting not a constant value to the predicate
          // Remove all available information about it (predicate)
          if (as[2] === 'reset') {
            delete state[skey];
          } else {
            // Update cloned state
            state[skey] = utils.stringify(as[2]);
          }

          if (!childMap[as[0]]) {
            var pred = options.map[as[0]];
            childMap[as[0]] = ids.filter(function(id) {
              if (id === as[0]) return false;
              return options.map[id].indexOf(pred) > 0;
            });
          }

          // Remove all nested predicates from state
          // Like if `as` is `this.x` - remove `this.x.y`
          // see #2 for details
          childMap[as[0]].forEach(function(id) {
            delete state[options.map[id]];
          });
        });
      });

      acc.push({
        node: node,
        op: op[1],
        state: state
      });
    });

    return acc;
  }, []);

  var groups = {};

  // Group applies by home node
  applies.forEach(function(apply) {
    if (!groups[apply.node.id]) groups[apply.node.id] = [];
    groups[apply.node.id].push(apply);
  });

  // Go through all collected applies
  Object.keys(groups).forEach(function(group) {
    groups[group].forEach(function(apply) {
      // If the node is matching our condition - we should wrap it into a
      // function
      var target = digIn(apply.state, tree, options);
      if (!target) return;
      target.fn = true;

      // Mark apply as optimized
      apply.op.code = fnList.getName(target) + '.call(this)';
      apply.op.node = target.id;
      apply.op.host = apply.node.id;

      if (!apply.node.successors) apply.node.successors = [];
      apply.node.successors.push({
        id: target.id,
        subtree: target.subtree
      });
    });
  });

  return tree;
};
