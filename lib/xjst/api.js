var xjst = require('../xjst');

exports.generate = function generate(code, options) {
  return xjst.compiler.create(options).generate(code);
};

exports.compile = function compile(code, options) {
  return xjst.compiler.create(options).compile(code);
};

exports.translate = function translate(ast, options) {
  return xjst.compiler.create(options).translate(ast);
};
