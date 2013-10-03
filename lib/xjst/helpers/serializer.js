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
  this.merges = {};
  this.cache = options['force-inline'] && {};
  this.cacheLimit = options['inline-limit'] || 200000;
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
// ### function serialize (node, tails, _parents)
// #### @node {Object} AST Node
// #### @tails {Object} Tails
// #### @_parents {Array} internal (previous parents' ids)
// Returns serialized body of node
//
Serializer.prototype.serialize  = function serialize(node, tails, _parents) {
  var self = this,
      options = this.options;

  if (!tails) tails = {};

  function match(lhs, rhs, tag) {
    var res = lhs + ' === ' + rhs;

    if (options['profile-match']) {
      res = 'profileMatch(' + res + ', ' +
                              JSON.stringify(tag) + ',' +
                              JSON.stringify(rhs) + ')';
    }

    return res;
  }

  // Returns a stringified path from root to current node
  function getParents() {
    return utils.stringify(_parents.map(function(parent) {
      return '$' + parent;
    }));
  }

  // Returns the path from root to current node + current node's id
  function parents() {
    return options.merge ? _parents.concat(node.longId || node.id) : _parents;
  }

  var res = [];

  if (this.cache && typeof node.id === 'number' && this.cache[node.id]) {
    return this.cache[node.id];
  }

  // If we already seen a node with the same id
  // Just call it by it's name
  if (this.merges[node.id] !== undefined) {
    if (this.cache) {
      node.fn = true;
    } else {
      tails[node.id] = node;

      res.push('return ', this.fnList.getName(node) + '.call(this');

      if (options.asyncify) {
        res.push(', __$callback');
      }

      // Add parents information for merging (experimental)
      if (options.merge && node.unexpected) {
        res.push(',', getParents());
      }

      res.push(');');

      return res.join('');
    }
  }

  // If current is not a leaf (i.e. it's a switch)
  if (node.tag) {
    // Compile all predicate values and bodies
    var tag = XJSTCompiler.match(node.tag, 'skipBraces'),
        cases = node.cases.map(function(branch) {
          return [
            XJSTCompiler.match(branch[0], 'skipBraces'),
            self.serialize(branch[1], tails, parents()),
            null // Allocate space for id generation
          ];
        }),
        def = this.serialize(node['default'], tails, parents());

    // Set ids for equal cases
    if (cases.length > 1) {
      cases.sort(function(branch) {
        return branch[1] > branch[2] ? 1 : branch[1] === branch[2] ? 0 : -1;
      });
      cases.reduce(function(prev, curr) {
        if (prev[2] === null) prev[2] = 0;
        if (curr[1] === prev[1]) {
          curr[2] = prev[2];
        } else {
          curr[2] = prev[2] + 1;
        }

        return curr;
      });
    }

    // Just put default body
    if (cases.length === 0) {
      res.push(def);
    // Generate a simple if/else statement if it has only one case
    } else if (cases.length === 1) {
      var c = cases[0];

      res.push(
          'if (', match(tag, c[0], tag), ') {\n',
              c[1],
          '} else {\n',
              def,
          '}\n'
      );

    // Generate multiple if/else if/else statements
    // TODO: determine optimal cases' length maximum
    } else if (cases.length < 32) {
      res.push('var __t = ', tag, '; \n');

      var grouped = [];
      cases.map(function(branch) {
        return [[match('__t', branch[0], tag)], branch[1], branch[2]];
      }).reduce(function(prev, curr) {
        if (prev !== null && prev[2] === curr[2]) {
          prev[0] = prev[0].concat(curr[0]);
          return prev;
        }

        grouped.push(curr);
        return curr;
      }, null);

      grouped.forEach(function(branch, i) {
        if (i !== 0) res.push(' else ');
        res.push(
          '  if (', branch[0].join(' || '), ') {\n',
          branch[1],
          '  } \n'
        );
      });
      res.push(
        ' else {\n',
        def,
        '}'
      );

    } else {
      // Turn switch in the hashmap lookup
      res.push(this.hashList.add(node.id, tag, cases, def));
    }

    if (!this.cache && node.fn) {
      var fnName = this.fnList.add(node.id, res.join(''), node);

      res = ['return ', fnName,
             '.call(this', options.asyncify ? '__$callback' : '', ');'];
    }

  // Compile statement or wrap it into a function
  } else {
    var body = (options.asyncify ? '"enable spoon";\n' : '') +
               XJSTCompiler.match(node.stmt, 'skipBraces') + ';\n' +
               'return;\n';

    // We should wrap into a function, only if statement is big or
    // if we was directly asked to do this
    if (options.asyncify || (!this.cache && (node.size > 1 || node.fn))) {
      // Save function body
      var fnName = this.fnList.add(node.id, body, node);

      res.push('return ', fnName, '.call(this');

      if (options.asyncify) {
        res.push(', __$callback');
      }

      // Tagged statements should be called with a parents list
      // (needed for client-side merging)
      if (options.merge && node.unexpected) {
        res.push(',', getParents());
      }

      res.push(');');
    } else {
      res.push(body);
    }
  }

  var result = res.join('');

  if (this.cache && node.fn &&
      this.merges[node.id] !== undefined &&
      result.length > this.cacheLimit) {
    node.fn = false;
    tails[node.id] = node;

    res = [];
    res.push('return ', this.fnList.getName(node) + '.call(this');

    if (options.asyncify) {
      res.push(', __$callback');
    }

    // Add parents information for merging (experimental)
    if (options.merge && node.unexpected) {
      res.push(',', getParents());
    }

    res.push(');');

    return res.join('');
  }

  if (this.cache && typeof node.id === 'number' && node.fn) {
    this.cache[node.id] = result;
  }

  return result;
}

//
// ### function shiftTails (tails)
// #### @tails {Object} tails
// Get the first tail from the tails list (ordered by keys)
//
Serializer.prototype.shiftTails = function shiftTails(tails) {
  var ids = Object.keys(tails).sort(function(a, b) { return a - b; }),
      res = tails[ids[0]];

  delete tails[ids[0]];

  return res;
}

//
// ### function detectJoins (node, joins)
// #### @node {Object} AST Node
// #### @joins {Object} internal, may be empty
// Count all nodes' id occurrences
//
Serializer.prototype.detectJoins = function detectJoins(node, joins) {
  var self = this;
  joins || (joins = {});

  if (!node.id) return joins;

  if (joins[node.id] !== undefined) {
    joins[node.id]++;
  } else {
    joins[node.id] = 1;
    if (node.tag) {
      node.cases.forEach(function(branch) {
        self.detectJoins(branch[1], joins);
      });
      this.detectJoins(node['default'], joins);
    }
  }

  return joins;
};

//
// ### function render (ast)
// #### @ast {AST} ast
// #### @type {String|undefined} Result type ('full' by default)
// Renders tree or it's part
//
Serializer.prototype.render = function render(ast, type) {
  if (!type) type = 'full';

  var res = [],
      joins = this.detectJoins(ast),
      merges = this.merges;

  // Create functions for each join that was occurred more than once
  var labels = Object.keys(joins).filter(function(key) {
    return joins[key] > 1;
  }).sort(function(a, b) { return b - a; });

  labels.forEach(function(key) {
    merges[key] = true;
  });

  // Start with one tail
  var tails = {};
  tails[ast.id] = ast;

  // Main serialization loop
  var node,
      first = true,
      id,
      body;

  while (node = this.shiftTails(tails)) {
    delete merges[id = node.id];
    var body = this.serialize(node, tails, []);

    if (first) {
      first = false;
      res.push(body);
    } else {
      if (!this.fnList.has(id)) this.fnList.add(id, body, node);
    }
  }

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
