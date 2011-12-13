var exporter = exports;

var xjst = require('../xjst'),
    utils = xjst.utils,
    fs = require('fs');

//
// ### function stringify (value)
// #### @value {Array} ast
// Returns compiled javascript code.
//
function stringify(value) {
  return xjst.ometa.XJSTCompiler.match(value, 'trans');
}

//
// ### function traverse (tree, def)
// #### @tree {Array} ast
// #### @def {Boolean} Internal, true if we came here from 'default' clause
// Traverse tree and return it's nodes and edges in graphviz format
//
function traverse(tree, def) {
  var result = [tree.id];

  // Do not loop
  if (tree.graph_seen) return;
  tree.graph_seen = true;

  // If we're entering switch - return labeled edges
  if (tree.tag) {
    var labels = [];

    tree.cases.forEach(function(branch, i) {
      // Skip nodes with tag unexpected, because they're having too many
      // predecessors
      if (branch[1].unexpected) return;

      labels.push('<f' + i + '> ' + stringify(branch[0]));

      result = result.concat(traverse(branch[1]));
      result.push(
        '"' + tree.id + '":f' + i + ' -> ' + branch[1].id
      );
    });

    // Enter default clause
    if (!tree['default'].unexpected) {
      result = result.concat(traverse(tree['default'], true));
      result.push(
        '"' + tree.id + '":fd -> ' + tree['default'].id +
        ' [color=red]'
      );

      labels.push('<fd>');
    }

    var label = '{' +
                  '{' + tree.id + ' | ' + stringify(tree.tag) + '} | ' +
                  '{' +
                  labels.join(' | ') +
                  '}' +
                '}';
    result[0] += ' [label=' + JSON.stringify(label) + ']';
  } else {
    // Colorize end-points
    if (def) {
      result[0] += ' [shape=circle, color=red]';
    }

    // Add blue redirection edges
    if (tree.successors) {
      tree.successors.forEach(function(node) {
        if (node.subtree) {
          result = result.concat('subgraph {', traverse(node.subtree), '}');
          result.push(node.id + ' -> ' + node.subtree.id);
        }
        result.push(tree.id + ' -> ' + node.id + ' [color=blue]');
      });
    }
  }

  return result;
}

//
// ### function write (tree, filename)
// #### @tree {Array} AST
// #### @filename {String} Path to output filename
// Export tree in graphviz format
//
exporter.write = function write(tree, filename) {
  var content = [
    'digraph {',
    'concentrate=yes',
    'node [shape=record]'
  ].concat(traverse(tree), '}').join('\n');

  fs.writeFileSync(filename, content);
};
