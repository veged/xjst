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
  var other = source[0],
      templates = source[1];

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

      if (op[0] !== 'apply') return;

      var state = {};
      locals.forEach(function(local) {
        local.forEach(function(as) {
          state
          console.log(as);
        });
      });
    });

    return acc;
  }, []);

  return tree;
};
