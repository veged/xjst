var exporter = exports;

var xjst = require('../xjst'),
    utils = xjst.utils,
    fs = require('fs');

function stringify(value) {
  return xjst.ometa.XJSTCompiler.match(value, 'trans');
};

function traverse(tree, def) {
  var result = [tree.id];

  if (tree.graph_seen) return;
  tree.graph_seen = true;

  if (tree['switch']) {
    var labels = [];

    tree.cases.forEach(function(branch, i) {
      if (branch[1].tag === 'unexpected') return;

      labels.push('<f' + i + '> ' + stringify(branch[0]));

      result = result.concat(traverse(branch[1]));
      result.push(
        '"' + tree.id + '":f' + i + ' -> ' + branch[1].id
      );
    });

    if (tree['default'].tag !== 'unexpected') {
      result = result.concat(traverse(tree['default'], true));
      result.push(
        '"' + tree.id + '":fd -> ' + tree['default'].id +
        ' [color=red]'
      );

      labels.push('<fd>');
    }

    var label = '{' +
                  '{' + tree.id + ' | ' + stringify(tree['switch']) + '} | ' +
                  '{' +
                  labels.join(' | ') +
                  '}' +
                '}';
    result[0] += ' [label=' + JSON.stringify(label) + ']';
  } else {
    if (def) {
      result[0] += ' [shape=circle, color=red]';
    }

    if (tree.routes) {
      tree.routes.forEach(function(id) {
        result.push(tree.id + ' -> ' + id + ' [color=blue]');
      });
    }
  }

  return result;
};

exporter.write = function write(tree, filename) {
  var content = [
    'digraph {',
    'concentrate=yes',
    'node [shape=record]'
  ].concat(traverse(tree), '}').join('\n');

  fs.writeFileSync(filename, content);
};
