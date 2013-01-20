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
    numericMap: {},
    'default': def
  };

  cases.forEach(function(branch) {
    var index = branch[0],
        body = branch[1];

    index = index.toString().replace(/^\((.*)\)$/, '$1');
    if (index == index - 0) {
      hash.numericMap[index] = body;
    } else {
      hash.map[index] = body;
    }
  });

  var match = '(typeof __i === "number" ? __h' + id + '.n[__i] : ' +
              '__h' + id + '.m[__i])';

  if (this.options['profile-match']) {
    match = 'profileMatch(' + match + ', ' +
                              JSON.stringify(tag) + ',' +
                              '__i)';
  }

  return [
    'var __i = ', tag, ';',
    'return (', match, ' || ', '__h', id, '.d).call(this',
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
    var arg = self.options.asyncify ? '__$callback' : '',
        res = ['var __h', id, ' = {\n'],
        symbolic = Object.keys(hashs[id].map),
        numeric = Object.keys(hashs[id].numericMap);

    function insertKeys(key, i, keys) {
      res.push('    ', key, ': function(', arg, ') {');

      res.push(
        serializer.addContext(hashs[id].numericMap[key] || hashs[id].map[key]),
        '}'
      );

      if (i !== keys.length - 1) res.push(',');
    }

    res.push('  "n": {\n');
    numeric.forEach(insertKeys);
    res.push('  },\n');

    res.push('  "m": {\n');
    symbolic.forEach(insertKeys);
    res.push('  },\n');

    res.push('  "d": function(', arg, ') {') ;

    res.push(serializer.addContext(hashs[id]['default']));

    res.push('}');
    res.push('};\n');

    return res.join('');
  })
};
