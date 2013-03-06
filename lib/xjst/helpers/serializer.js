var xjst = require('../../xjst'),
    utils = xjst.utils,

    XJSTCompiler = xjst.ometa.XJSTCompiler;

//
// ### function Serializer (options)
// #### @options {Object} Compiler options object
// Serializer @constructor
//
function Serializer(options) {
  this.options = options;
  this.fnList = xjst.helpers.flist.create(this, options);
  this.hashList = xjst.helpers.hlist.create(this, options);
}

//
// ### function create (options)
// #### @options {Object} Compiler options object
// Returns Serializer instance
//
exports.create = function create(options) {
  return new Serializer(options);
};

Serializer.prototype.addContext = function addContext(body) {
  // Store context if it's used
  if (/__this/.test(body)) {
    return 'var __this = this;' + body;
  } else {
    return body;
  }
};

//
// ### function serialize (node)
// #### @node {Object} AST Node
// Returns serialized body of node
//
Serializer.prototype.serialize  = function serialize(node) {
  var self = this,
      options = this.options;

  function match(lhs, rhs, tag) {
    var res = lhs + ' === ' + rhs;

    if (options['profile-match']) {
      res = 'profileMatch(' + res + ', ' +
                              JSON.stringify(tag) + ',' +
                              JSON.stringify(rhs) + ')';
    }

    return res;
  }

  var res = [];

  // If current is not a leaf (i.e. it's a switch)
  if (node.tag) {
    // Compile all predicate values and bodies
    var tag = XJSTCompiler.match(node.tag, 'skipBraces'),
        cases = node.cases.map(function(branch) {
          return {
            value: XJSTCompiler.match(branch.value, 'skipBraces'),
            body: self.serialize(branch.body)
          };
        }),
        def = '';

    if (node.fallback) {
      def = self.serialize(node.fallback);
    }

    if (cases.length !== 0) {
      res.push('var __t' + node.tagId + ' = ', tag, '; \n');

      cases.forEach(function(branch, i) {
        res.push(
          'if (', match('__t' + node.tagId, branch.value, tag), ') {',
          branch.body,
          '}',
          i !== cases.length - 1 ? ' else ' : ''
        );
      });
    }

    res.push(def);

  // Compile statement or wrap it into a function
  } else {
    var body = (options.asyncify ? '"enable spoon";\n' : '') +
               XJSTCompiler.match(node.stmt, 'skipBraces') + ';\n' +
               'return;\n';

    res.push(body);
  }

  var result = res.join('');

  return result;
};

//
// ### function render (ast)
// #### @ast {AST} ast
// #### @type {String|undefined} Result type ('full' by default)
// Renders tree or it's part
//
Serializer.prototype.render = function render(ast, type) {
  if (!type) type = 'full';

  var res = [ this.serialize(ast), '\nthrow new Error("Match failed");' ];

  // If type === 'partial' - return body without functions and hashmaps
  if (type === 'partial') return res.join('');

  return {
    pre: [
      this.options.merge ?
      'var _c = exports.config = {};' +
      // Insert .mergeWith template function
      'exports.mergeWith = ' + utils.mergeWith.toString() + ';\n'
      :
      ''
    ].concat(this.hashList.render(), this.fnList.render()).join(''),
    post: [
      'exports.apply = apply;\n',
      this.options.asyncify ? utils.dispatch.toString() + ';\n' : '',
      'function ', this.options.asyncify ? 'applySync' : 'apply',
      '(' + (this.options.asyncify ? '__$callback' : '') + ')'
    ].concat(
        '{',
        this.addContext(res.join('')),
        '};\n'
    ).join('')
  };
};
