function Splitter() {
};

exports.Splitter = Splitter;

Splitter.create = function create() {
  return new Splitter();
};

Splitter.prototype.split = function split(ast) {
  return ast;
};
