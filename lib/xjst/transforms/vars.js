var xjst = require('../../xjst'),
    utils = xjst.utils,
    XJSTLocalAndApplyCompiler = xjst.ometa.XJSTLocalAndApplyCompiler;

//
// ### function liftVars (tree)
// #### @ast {AST}
// Adds variable declarations to closest blocks
//
exports.process = function liftVars(tree) {
  utils.reduceTree(tree, function(acc, node) {
    if (!node.stmt) return acc;

    // Get locals and applies sequence:
    // local () { ... apply() ... } => ['localStart', 'apply', 'localEnd']
    var seq = XJSTLocalAndApplyCompiler.match(node.stmt, 'topLevel');

    // Create a state for each individual apply (based on the node's state)
    seq = seq.filter(function(op) {
      return op[0] === 'localStart' && op[2].length > 0;
    }).map(function(op) {
      return op[2].length <= 1 ?
          op[2][0]
          :
          op[2].reduce(function(prev, curr) {
            return prev.concat(curr);
          });
    });

    // No locals - no vars
    if (seq.length === 0) return acc;
    seq = seq.reduce(function(prev, curr) {
      curr.forEach(function(curr) {
        prev = prev.concat(curr);
      });
      return prev;
    }, []).sort(function(a, b) {
      return a[0] > b[0] ? 1 : a[0] === b[0] ? 0 : -1;
    }).reduce(function(prev, curr) {
      if (prev.indexOf(curr) === -1) prev.push(curr);
      return prev;
    }, []).map(function(item) {
      return [item];
    });

    function dig(stmt) {
      if (stmt[0] === 'begin' && Array.isArray(stmt[1]) &&
          stmt[1][0] === 'begin') {
        return dig(stmt[1]);
      } else {
        return stmt;
      }
    }
    var stmt = dig(node.stmt);
    stmt.splice(1, 0, ['var'].concat(seq));
  });

  return tree;
};
