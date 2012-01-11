var xjst = require('../xjst'),
    fs = require('fs'),
    path = require('path'),
    vm = require('vm'),
    uglify = require('uglify-js'),
    utils = xjst.utils,

    XJSTParser = xjst.ometa.XJSTParser,
    XJSTTranslator = xjst.ometa.XJSTTranslator,
    XJSTCompiler = xjst.ometa.XJSTCompiler,
    XJSTLocalAndApplyCompiler = xjst.ometa.XJSTLocalAndApplyCompiler;

//
// ### function parse (code, filename, id)
// #### @code {String} XJST source
// #### @filename {String} (optional) Template's filename
// #### @id {Number} (internal) id
// Returns AST for input string
//
exports.parse = function parse(code, filename, id) {
  if (id === undefined) id = 0;

  var tree = XJSTParser.matchAll(code, 'topLevel', undefined,
                                 utils.errorHandler(code));

  tree = XJSTTranslator.matchAll(tree, 'topLevel', [id],
                                 utils.errorHandler(tree));

  // Load parent templates
  if (filename) {
    var dir = path.dirname(filename),
        templates = tree[1];

    // Store initial id
    tree[3] = [id];

    // Load each dependency
    tree[2].map(function(filename) {
      return path.join(
        dir,
        path.extname(filename) ? filename : filename + '.xjst'
      );
    }).forEach(function(filename) {
      var content = fs.readFileSync(filename).toString(),
          dependency = exports.parse(content, filename, ++id);

      // And add it's templates to current ones
      tree[0] = tree[0].concat(dependency[0]);
      tree[1] = tree[1].concat(dependency[1]);

      // Also propagate it's dependency ids
      tree[3] = tree[3].concat(dependency[3]);
    });

    // If we're in nested dependency or
    // this transformation has at least one dependency
    if (tree[3].length > 1 || id > 0) {
      templates.forEach(function(template) {
        tree[3].forEach(function(id) {
          // Add this.__d%id === undefined to each template statement
          // This will allow us to do super-calls
          template[0].unshift([
            'dep' + id,
            ['get', 'this.__d' + id],
            ['get', 'undefined']
          ]);
        });
      });
    }
  }

  return tree.slice(0, 2);
};

//
// ### function generate (ast, options)
// #### @ast {Array} XJST-specific AST
// #### @options {Object} compiler options
// Compile XJST template and return it's source code (in javascript)
//
exports.generate = function generate(ast, options) {
  var templates = ast[1],
      predicateMap = {},
      predicateValues = utils.getPredicateValues(templates),
      predicateChilds = {},

      identifier = new utils.Identifier(),

      hashs = {},
      fns = {};

  // Set default options
  if (!options) options = {};

  // Wrap module to allow client-side usage
  if (options.wrap !== false) options.wrap = true;

  // Include long function names for merging templates on client-side
  if (options.merge !== true) options.merge = false;

  // Choose optimization engine
  var engine = xjst.engines[options.engine] ||
               xjst.engines[process.env.XJST_ENGINE] ||
               xjst.engines.fullgen;

  // Create predicate map : id => stringified AST
  templates.forEach(function(template) {
    template[0].forEach(function(predicate) {
      if (!predicateMap[predicate[0]]) {
        predicateMap[predicate[0]] = utils.stringify(predicate[1]);
      }
    });
  });

  var predicateIds = Object.keys(predicateMap),
      merges = {};

  // Helper function, used for creating names for switch-tree nodes
  function fnName(o) {
    // Shorten node's id if is exception node
    if (o.tag === 'unexpected') o.id = 'e';

    return (options.merge ? '_c.$' : '$') + o.id;
  }

  // Render subtree
  function serialize(o, tails, _parents) {

    // Returns a stringified path from root to current node
    function getParents() {
      return utils.stringify(_parents.map(function(parent) {
        return '$' + parent;
      }));
    }

    // Returns the path from root to current node + current node's id
    function parents() {
      return options.merge ? _parents.concat(o.longId || o.id) : _parents;
    }

    var res = [];

    // If we already seen a node with the same id
    // Just call it by it's name
    if (merges[o.id] !== undefined) {
      tails[o.id] = o;

      res.push('return ', fnName(o) + '.call(this');

      if (options.merge && o.tag) {
        res.push(',', getParents());
      }

      res.push(');');

      return res.join('');
    }

    // If current is not a leaf (i.e. it's a switch)
    if (o['switch']) {
      // Switch may have only default case
      if (o.cases.length === 0) {
        res.push(serialize(o['default'], tails, parents()));

      // Generate a simple if/else statement if it has only one case
      } else if (o.cases.length === 1) {
        var c = o.cases[0];
        res.push(
            'if (',
            XJSTCompiler.match(o['switch'], 'skipBraces'),
            ' === ',
            XJSTCompiler.match(c[0], 'skipBraces'), ') {\n',
                serialize(c[1], tails, parents()),
            '} else {\n',
                serialize(o['default'], tails, parents()),
            '}\n'
        );

      // Generate multiple if/else if/else statements
      // TODO: determine optimal cases' length maximum
      } else if (o.cases.length < 32) {
        res.push(
          'var __t = ',
          XJSTCompiler.match(o['switch'], 'skipBraces'),
          '; \n'
        );

        o.cases.forEach(function(c, i) {
          if (i !== 0) res.push(' else ');
          res.push(
            '  if (__t === ', XJSTCompiler.match(c[0], 'skipBraces'), ') {\n',
            serialize(c[1], tails, parents()),
            '  } \n'
          );
        });
        res.push(
          ' else {\n',
          serialize(o['default'], tails, parents()),
          '}'
        );

      // Turn switch in the hashmap lookup
      } else {
        var hash = hashs[o.id] = {
          map: {},
          numericMap: {},
          'default': serialize(o['default'], tails, parents())
        };

        o.cases.forEach(function(c) {
          var index = XJSTCompiler.match(c[0], 'skipBraces'),
              body = serialize(c[1], tails, parents());

          index = index.replace(/^\((.*)\)$/, '$1');
          if (index == index - 0) {
            hash.numericMap[index] = body;
          } else {
            hash.map[index] = body;
          }
        });

        var index = XJSTCompiler.match(o['switch'], 'skipBraces');
        res.push(
          'var __i = ', index, ';',
          'return ((typeof __i === "number" ? ',
          '__h', o.id, '.n[__i] : __h', o.id, '.m[__i]) ||',
          '__h', o.id, '.d).call(this)');
      }

      if (o.fn) {
        fns[o.id] = { tag: o.tag, body: res.join(''), alt: o.longId };

        res = ['return ', fnName(o), '.call(this);'];
      }

    // Compile statement or wrap it into a function
    } else {
      var body = XJSTCompiler.match(o.stmt, 'skipBraces') + ';\nreturn;';

      // We should wrap into a function, only if statement is big or
      // if we was directly asked to do this
      if (o.size > 1 || o.fn) {
        // Save function body
        fns[o.id] = { tag: o.tag, body: body, alt: o.longId };

        // Tagged statements should be called with a parents list
        // (needed for client-side merging)
        if (o.tag) {
          res.push(
              'return ', fnName(o), '.call(this,',
              getParents(), ');'
          );
        } else {
          res.push('return ', fnName(o), '.call(this);');
        }
      } else {
        res.push(body);
      }
    }

    return res.join('');
  }

  // Get the first tail from the tails list (ordered by keys)
  function shiftTails(tails) {
    var ids = Object.keys(tails).sort(function(a, b) { return a - b; }),
        res = tails[ids[0]];

    delete tails[ids[0]];

    return res;
  }

  // Count all nodes' id occurrences
  function detectJoins(o, joins) {
    if (o.id) {
      if (joins[o.id] !== undefined) {
        joins[o.id]++;
      } else {
        joins[o.id] = 1;
        if (o['switch']) {
          o.cases.forEach(function(c) { detectJoins(c[1], joins); });
          detectJoins(o['default'], joins);
        }
      }
    }

    return joins;
  }

  // Top serialization function ( @prog {AST} )
  function serializeTop(prog, fn) {
    var res = [],
        joins = detectJoins(prog, {});

    // Create labels for each join that was occurred more than once
    var labels = Object.keys(joins).filter(function(key) {
      return joins[key] !== 1;
    }).sort(function(a, b) { return b - a; });

    labels.forEach(function(key) {
      merges[key] = true;
    });

    // Start with one tail
    var tails = {};
    tails[prog.id] = prog;

    // Main serialization loop
    var t, first = true, id;
    while (t = shiftTails(tails)) {
      delete merges[id = t.id];

      if (first) {
        first = false;
        res.push(serialize(t, tails, []));
      } else {
        var body = serialize(t, tails, []);
        if (!fns[id]) {
          fns[id] = { tag: t.tag, body: body, alt: t.longId};
        }
      }
    }

    // fn == true means that we should return function's body,
    // not whole module
    if (fn) return res.join('');

    // Insert __this if function is using it
    // (Check this by applying following naive regexp)
    var shouldStoreCtx = /__this/,
        storeCtx = 'var __this = this;';

    return [
      options.merge ? 'var _c = exports.config = {};' +
      // Insert .mergeWith template function
      'exports.mergeWith = ' + utils.mergeWith.toString() + ';' : '',
      'exports.apply = apply;',
      'function apply() {',
    ].concat(
        shouldStoreCtx.test(res) ? storeCtx : '',
        res, '};',

        // Insert all switches that was translated to the hashmaps
        Object.keys(hashs).map(function(id) {
          var res = ['var __h', id, ' = {\n'],
              symbolic = Object.keys(hashs[id].map),
              numeric = Object.keys(hashs[id].numericMap);

          function insertKeys(key, i, keys) {
            res.push('    ', key, ': function() {');

            // Push ctx store if needed
            if (shouldStoreCtx.test(hashs[id].map[key])) res.push(storeCtx);

            res.push(hashs[id].numericMap[key] || hashs[id].map[key], '}');

            if (i !== keys.length - 1) res.push(',');
          }

          res.push('  "n": {\n');
          numeric.forEach(insertKeys);
          res.push('  },\n');

          res.push('  "m": {\n');
          symbolic.forEach(insertKeys);
          res.push('  },\n');

          res.push('  "d": function() {') ;

          // Push ctx store if needed
          if (shouldStoreCtx.test(hashs[id]['default'])) res.push(storeCtx);

          res.push(hashs[id]['default'], '}');
          res.push('};\n');

          return res.join('');
        }),

        // Insert all switches that was wrapped in the functions
        Object.keys(fns).map(function(id) {
          var fn = fns[id],
              prefix;

          if (!options.merge) {
            prefix = 'function ' + fnName({id: id}) + '() {';
          } else if (!fn.alt) {
            prefix = fnName({ id: id }) + ' = function() {';
          } else {
            prefix = fnName({ id: fn.alt }) + ' = ' +
                     fnName({ id: id }) + ' = function() {';
          }

          if (fn.tag === 'unexpected') {
            return prefix  + fn.body + '};';
          } else if (shouldStoreCtx.test(fn.body)) {
            return prefix  + storeCtx + fn.body + '};';
          } else {
            return prefix  + fn.body + '};';
          }
        })
    ).join('');
  }

  // Optimizes `apply()` statements by redirecting recursive calls into the
  // middle of the tree
  function optimizeRecursion(tree) {

    // Traverse tree
    var applies = utils.reduceTree(tree, function(acc, node) {
      if (!node.stmt) return acc;
      if (node._visited) return acc;

      node._visited = true;

      // Get locals and applies sequence:
      // local () { ... apply() ... } => ['localStart', 'apply', 'localEnd']
      var seq = XJSTLocalAndApplyCompiler.match(node.stmt, 'topLevel');
      if (seq.length === 0) return acc;

      // Create a state for each individual apply (based on the node's state)
      var locals = [];
      seq.forEach(function(op) {
        if (op[0] === 'apply') {
          var state = utils.clone(node.state);

          locals.forEach(function(local) {
            local.forEach(function(as) {
              // If local was setting not a constant value to the predicate
              // Remove all available information about it (predicate)
              if (as[2] === 'reset') {
                state.unset(predicateMap[as[0]]);
              } else {
                // Update cloned state
                state.set(predicateMap[as[0]], utils.stringify(as[2]));
              }

              if (!predicateChilds[as[0]]) {
                var pred = predicateMap[as[0]];
                predicateChilds[as[0]] = predicateIds.filter(function(id) {
                  if (id === as[0]) return false;
                  return predicateMap[id].indexOf(pred) > 0;
                });
              }

              // Remove all nested predicates from state
              // Like if `as` is `this.x` - remove `this.x.y`
              // see #2 for details
              predicateChilds[as[0]].forEach(function(id) {
                state.unset(predicateMap[id]);
              });
            });
          });

          acc.push({
            node: node,
            op: op[1],
            state: state
          });
        } else if (op[0] === 'localStart') {
          locals.push(op[1]);
        } else {
          locals.pop();
        }
      });

      return acc;
    }, []);

    // Go through all collected applies
    applies.forEach(function(apply) {
      // If nothing was changed before .apply call
      if (apply.node.state.equalTo(apply.state)) {
        // Skip this apply as it can't be optimized
        return;
      }

      // Find a node with state nested into `apply`'s state
      var result = utils.reduceTree(tree, function(acc, node) {
        // Apply should not redirect to itself
        if (node.id === apply.node.id) return acc;

        // Compare states
        var score = apply.state.isReachable(node.state);

        // Find the best match
        if (score !== null && score >= 0 && score < acc.score) {
          acc.score = score;
          acc.node = node;
        }

        return acc;
      }, { score: Infinity, node: null });

      // If apply can be inlined - create subtree
      if (apply.state.isInlineable() && options.engine === 'sort-group') {
        var fnId = identifier.generate(),
            subtree = engine(templates, options, {
              state: apply.state.clone(),
              values: predicateValues,
              id: identifier
            });

        fns[fnId] = { body: serializeTop(subtree, true) };
        result.node = { id: fnId, subtree: subtree };
      }

      // If we found optimal node
      if (result.node !== null) {
        // If the node is matching our condition - we should wrap it into a
        // function
        result.node.fn = true;

        // Mark apply as optimized
        apply.op.code = fnName(result.node) + '.call(this)';
        if (!apply.node.routes) apply.node.routes = [];
        apply.node.routes.push({
          id: result.node.id,
          subtree: result.node.subtree
        });
      }
    });

    return tree;
  }

  var body;

  if (options['no-opt']) {
    // Just compile `template` to `if`, and `local`
    body = [
      XJSTCompiler.match(ast, 'topLevel')
    ];
  } else {
    // Optimize recursion and minimize comparisons tree
    var tree = engine(templates, options, {
      state: xjst.state.create({ values: predicateValues}),
      values: predicateValues,
      id: identifier
    });

    // Inline recursive calls if possible
    tree = optimizeRecursion(tree);

    // Finally render tree
    body = [
      XJSTCompiler.match(ast[0], 'other'),
      serializeTop(tree)
    ];
  }

  if (options['export-graph']) {
    xjst.exporter.write(tree, options['export-graph']);
  }

  // Wrap output for client-side usage
  var result;
  if (options.wrap) {
    result = ['(function(exports) {'].concat(
      body.join('\n'),
      'return exports})(typeof exports === "undefined"? {} : exports)'
    ).join('\n');
  } else {
    result = body.join('\n');
  }

  // Compress or beautify the output
  if (options.uglify) {
    return uglify(result);
  } else {
    return uglify.uglify.gen_code(uglify.parser.parse(result),
                                  { beautify: true });
  }
};

//
// ### function compile(code, filename, options)
// #### @code {String} Input XJST source
// #### @filename {String} Optional filename for better stack traces
// #### @options {Object} Compilation options
// Parses and compiles XJST template to javascript function
//
exports.compile = function compile(code, filename, options) {
  // XXX this is temporary fix to make API compatible
  if (Array.isArray(code)) return exports.generate(code, options || filename);

  // filename is optional argument
  if (options === undefined && typeof filename === 'object') {
    options = filename;
    filename = null;
  }

  // Compile and evaluate source
  var parsed = exports.parse(code, filename),
      compiled = exports.generate(parsed, options),
      evaluated = vm.runInThisContext(compiled, filename);

  // Provide nice API by returning the function instead of object
  function render(locals) {
    return evaluated.apply.call(locals);
  }

  render.apply = evaluated.apply;
  render.mergeWith = evaluated.mergeWith;
  render.config = evaluated.config;

  return render;
};
