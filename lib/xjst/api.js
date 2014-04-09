var xjst = require('../xjst');

exports.generate = function generate(code, options) {
  return xjst.compiler.create(options).generate(code);
};

exports.compile = function compile(code, options) {
  return xjst.compiler.create(options).compile(code);
};

exports.translate = function translate(ast, code, options) {
  if (typeof code !== 'string') {
    options = code;
    code = null;
  }
  return xjst.compiler.create(options).translate(ast, code);
};
