var xjst = require('../../xjst'),
    utils = xjst.utils;

//
// ### function FunctionList (serialize, options)
// #### @serializer {Serializer} renderer object
// #### @options {Object} compiler options
// Creates functions list
//
function FunctionList(serializer, options) {
  this.fns = {};
  this.serializer = serializer;
  this.options = options;
};

//
// ### function create (serialize, options)
// #### @serializer {Serializer} renderer object
// #### @options {Object} compiler options
// FunctionList constructor wrapper
//
exports.create = function create(serializer, options) {
  return new FunctionList(serializer, options);
};

//
// ### function add (id, body, node)
// #### @id {String|Number} function's name identificator
// #### @body {String|AST} function's body
// #### @node {Object} Optional a tree node
// Adds and renders function to list
//
FunctionList.prototype.add = function add(id, body, node) {
  var fn = this.fns[id] = {
    id: id,
    alt: node && node.longId,
    args: this.options.asyncify ? ['__$callback'] : [],
    body: typeof body === 'string' ?
        body
        :
        this.serializer.render(body, 'partial'),
    unexpected: node && node.unexpected
  };

  return this.getName(fn);
};

//
// ### function has (id)
// #### @id {String} function id to check
// Returns true if function is in the list
//
FunctionList.prototype.has = function has(id) {
  return !!this.fns[id];
};

//
// ### function getName (id)
// #### @id {String|Object} function id or AST node
// Returns function name
//
FunctionList.prototype.getName = function getName(id) {
  var name = typeof id === 'object' ? id.unexpected ? 'e' : id.id : id;

  // Prefix name if needed
  return (this.options.merge ? '_c.$' : '$') + name;
};

//
// ### function render ()
// Renders function list into js code
//
FunctionList.prototype.render = function render() {
  var self = this,
      serializer = this.serializer,
      fns = this.fns,
      options = this.options;

  return Object.keys(fns).map(function(id) {
    var fn = fns[id],
        name = self.getName(fn),
        args = fn.args ? fn.args.join(', ') : '',
        prefix;

    if (!options.merge) {
      prefix = 'function ' + name;
    } else if (fn.alt) {
      prefix = self.getName(fn.alt) + ' = ' +
               name + ' = function';
    } else {
      prefix = name + ' = function';
    }

    return prefix + '(' + args + ') {' +
      serializer.addContext(fn.body) +
      '};';
  });
};
