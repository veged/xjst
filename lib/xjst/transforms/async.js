var xjst = require('../../xjst'),
    utils = xjst.utils,
    XJSTLocalAndApplyCompiler = xjst.ometa.XJSTLocalAndApplyCompiler;

function Translator() {
  this.vars = 0;
  this.root = null;
  this.current = null;
  this.blocks = [];

  this.createBlock();
};

Translator.prototype.createBlock = function createBlock() {
  this.current = [];
  this.blocks.push();
};

Translator.prototype.traverse = function traverse(stmt) {
  
};

Translator.prototype.render = function render() {
  return this.blocks.reduce(function() {

  }, []);
};

//
// ### function optimizeRecursion (tree, source, options)
// #### @tree {AST}
// #### @source {Array} Original source (XJST AST)
// #### @options {Object} various options
// Transforms `apply()` statements to async callback style
//
exports.process = function asyncify(tree, source, options) {
  var bodies = utils.reduceTree(tree, function(acc, node) {
    if (!node.tag) acc.push(node);
    return acc;
  }, []);

  bodies.forEach(function(body) {
    var queue = [],
        head = [];

    var trans = new Translator();
    trans.traverse(stmt)

    body.stmt = trans.render();
  });

  return tree;
};
