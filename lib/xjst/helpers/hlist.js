var xjst = require('../../xjst'),
    utils = xjst.utils;

//
// ### function HashList (serialize, options)
// #### @serializer {Serializer} renderer object
// #### @options {Object} compiler options
// Creates hashs list
//
function HashList(serializer, options) {
  this.hashs = {};
  this.serializer = serializer;
  this.options = options;
};

//
// ### function create (serialize, options)
// #### @serializer {Serializer} renderer object
// #### @options {Object} compiler options
// HashList constructor wrapper
//
exports.create = function create(serializer, options) {
  return new HashList(serializer, options);
};

//
// ### function add (id, tag, cases, def)
// #### @id {String|Number} switch's name identificator
// #### @tag {String} compiled tag
// #### @cases {Array} compiled switch's cases
// #### @def {String} compiled default's body
// Adds switch to hash
//
HashList.prototype.add = function add(id, tag, cases, def) {
  var hash = this.hashs[id] = {
    map: {},
    'default': def
  };

  cases.forEach(function(branch) {
    var index = branch[0],
        body = branch[1];

    index = index.toString().replace(/^\((.*)\)$/, '$1');
    hash.map[index] = body;
  });

  var match = '__h' + id + '_m[__i]';

  if (this.options['profile-match']) {
    match = 'profileMatch(' + match + ', ' +
                              JSON.stringify(tag) + ',' +
                              '__i)';
  }

  return [
    'var __i = ', tag, ';',
    'return (', match, ' || ', '__h', id, '_d)(__$ctx',
    this.options.asyncify ? ', __$callback' : '',
    ');',
  ].join('');
};

//
// ### function render ()
// Renders function list into js code
//
HashList.prototype.render = function render() {
  var self = this,
      hashs = this.hashs,
      serializer = this.serializer;

  return Object.keys(hashs).map(function(id) {
    var arg = self.options.asyncify ? ', __$callback' : '',
        res = [],
        symbolic = Object.keys(hashs[id].map);

    function insertKeys(key, i, keys) {
      var body = hashs[id].map[key];
      var match = body.match(
        /^\s*return\s*(\$\d+)\(\__\$ctx\);\s*(return;\s*)?$/
      );
      res.push('    ', key, ': ');
      if (match !== null)
        res.push(match[1]);
      else
        res.push('function(__$ctx', arg, ') {', body, '}');
      if (i !== keys.length - 1) res.push(',');
    }

    res.push('var __h', id, '_m = {\n');
    symbolic.forEach(insertKeys);
    res.push('};\n');

    res.push('var __h', id, '_d = function(__$ctx', arg, ') {') ;

    res.push(hashs[id]['default']);

    res.push('};\n');

    return res.join('');
  })
};
