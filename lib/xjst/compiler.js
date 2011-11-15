var xjst = require('../xjst'),
    vm = require('vm'),
    uglify = require('uglify-js'),
    utils = xjst.utils,

    XJSTParser = xjst.ometa.XJSTParser,
    XJSTTranslator = xjst.ometa.XJSTTranslator,
    XJSTCompiler = xjst.ometa.XJSTCompiler,
    XJSTLocalAndApplyCompiler = xjst.ometa.XJSTLocalAndApplyCompiler;

exports.parse = function parse(code) {
  var tree = XJSTParser.matchAll(code, 'topLevel', undefined,
                                 utils.errorHandler(code));

  return  XJSTTranslator.matchAll(tree, 'topLevel', undefined,
                                  utils.errorHandler(tree));
};

exports.generate = function generate(templatesAndOther, options) {
  var templates = templatesAndOther[1],
      predicateMap = {},
      predicateChilds = {},

      hashs = {},
      fns = {};

  // Set default options
  if (!options) options = {};

  if (options.wrap !== false) options.wrap = true;
  if (options.merge !== true) options.merge = false;

  templates.forEach(function(template) {
    template[0].forEach(function(predicate) {
      if (!predicateMap[predicate[0]]) {
        predicateMap[predicate[0]] = utils.stringify(predicate[1]);
      }
    });
  });

  var predicateIds = Object.keys(predicateMap),
      merges = {};

  function fnName(o) {
    if (options.merge) {
      return '_c.$' + o.id;
    } else {
      return '$' + o.id;
    }
  }

  // Render part of tree
  function serialize(o, tails, _parents) {
    function getParents() {
      return utils.stringify(_parents.map(function(parent) {
        return '$' + parent;
      }));
    }

    function parents() {
      return options.merge ? _parents.concat(o.longId || o.id) : _parents;
    }

    if(merges[o.id] !== undefined) {
      tails[o.id] = o;
      if (options.merge && o.tag) {
        return [
          'return ', fnName(o), '.call(this,',
          getParents(),
          ');'
        ].join('');
      } else {
        return 'return ' + fnName(o) + '.call(this);';
      }
    }

    var res = [];

    if (o['switch']) {
      if(o.cases.length == 1) {
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
      } else {
        var hash = hashs[o.id] = {
          map: {},
          'def': serialize(o['default'], tails, parents())
        };

        o.cases.forEach(function(c) {
          hash.map[XJSTCompiler.match(c[0], 'skipBraces')] =
              serialize(c[1], tails, parents());
        });

        res.push(
          'return (__h', o.id, '.map[',
          XJSTCompiler.match(o['switch'], 'skipBraces'),
          '] ||', '__h', o.id
        );

        res.push('.def).call(this)');
      }

      fns[o.id] = { body: res.join(''), alt: o.longId };

      res = ['return ', fnName(o), '.call(this);'];
    } else {
      var body = XJSTCompiler.match(o.stmt, 'skipBraces') + ';\nreturn;';

      if (o.size > 1 || o.fn) {
        fns[o.id] = { body: body, alt: o.longId };

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

  function shiftTails(tails) {
    var ids = Object.keys(tails).sort(function(a, b) { return a - b; }),
        res = tails[ids[0]];

    delete tails[ids[0]];

    return res;
  }

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

  function serializeTop(prog) {
    var res = [],
        heads = [],
        joins = detectJoins(prog, {});

    var labels = Object.keys(joins).filter(function(key) {
      return joins[key] !== 1;
    }).sort(function(a, b) { return b - a; });

    labels.forEach(function(key) {
      merges[key] = true;
    });

    var tails = {};
    tails[prog.id] = prog;

    var t, first = true, id;
    while (t = shiftTails(tails)) {
      delete merges[id = t.id];

      if (first) {
        first = false;
        res.push(serialize(t, tails, []));
      } else {
        var body = serialize(t, tails, []);
        if (!fns[id]) {
          fns[id] = { body: body, alt: t.longId};
        }
      }
    }

    return [
      options.merge ? 'var _c = exports.config = {};' +
      'exports.mergeWith = ' + utils.mergeWith.toString() + ';' : '',
      'exports.apply = apply;',
      'function apply() {'
    ].concat(
        heads.reverse(), res, '};',
        Object.keys(hashs).map(function(id) {
          var res = ['var __h', id, ' = {\n'];

          res.push('  "map": {\n');

          var keys = Object.keys(hashs[id].map).reduce(function(acc, key) {
                if (/^\".*\"$/.test(key)) {
                  acc.others.push(key);
                } else {
                  acc.numeric.push(key);
                }
                return acc;
              }, { numeric: [], others: [] });

          keys.others.forEach(function(key) {
            res.push(
              '    ', key,
              ': function() {',
              hashs[id].map[key], '},'
            );
          });

          res.push('  },\n');
          res.push('  "def": function() {', hashs[id]['default'], '}');
          res.push('};\n');

          keys.numeric.forEach(function(key) {
            res.push(
              '__h', id, '.map[', key, '] = function() {',
              hashs[id].map[key], '};\n'
            );
          });

          return res.join('');
        }),
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

          return prefix  + fn.body + '};';
        })
    ).join('');
  }

  function reduceTree(tree, fn, acc) {
    if (tree['switch']) {
      acc = fn(acc, tree);

      acc = tree.cases.reduce(function(acc, c) {
        return reduceTree(c[1], fn, acc);
      }, acc);
      acc = reduceTree(tree['default'], fn, acc);
    } else {
      acc = fn(acc, tree);
    }

    return acc;
  }

  function optimizeRecursion(tree) {
    // Update predicates with data in local
    var applies = reduceTree(tree, function(acc, node) {
      if (!node.stmt) return acc;
      if (node._visited) return acc;

      node._visited = true;

      var seq = XJSTLocalAndApplyCompiler.match(node.stmt, 'topLevel');
      if (seq.length === 0) return acc;

      var locals = [];
      seq.forEach(function(op) {
        if (op[0] === 'apply') {
          var state = utils.clone(node.state);

          locals.forEach(function(local) {
            local.forEach(function(as) {
              if (as[2] === 'reset') {
                delete state[predicateMap[as[0]]];
              } else {
                state[predicateMap[as[0]]] = utils.stringify(as[2]);
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
                delete state[predicateMap[id]];
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

    applies.forEach(function(apply) {
      // If nothing was changed before .apply call
      if (utils.stringify(apply.node.state) === utils.stringify(apply.state)) {
        // Skip this apply as it can't be optimized
        return;
      }

      var result = reduceTree(tree, function(acc, node) {
        // Apply should not redirect to itself
        if (node.id === apply.node.id) return acc;

        var score = utils.compareSets(apply.state, node.state);

        if (score !== null && score >= 0 && score < acc.score) {
          acc.score = score;
          acc.node = node;
        }

        return acc;
      }, { score: Infinity, node: null });

      if (result.node === null) return;

      result.node.fn = true;

      apply.op.code = fnName(result.node) + '.call(this)';
    });

    return tree;
  }

  if (options['no-opt']) {
    return XJSTCompiler.match(templatesAndOther, 'topLevel');
  }

  var engine = xjst.engines[options.engine] || xjst.engines.fullgen,
      body = [
        XJSTCompiler.match(templatesAndOther[0], 'other'),
        serializeTop(optimizeRecursion(
          engine(templates, predicateMap, options)
        ))
      ];

  var result;
  if (options.wrap) {
    result = ['(function(exports) {'].concat(
      body.join('\n'),
      'return exports})(typeof exports === "undefined"? {} : exports)'
    ).join('\n');
  } else {
    result = body.join('\n');
  }

  return uglify.uglify.gen_code(uglify.parser.parse(result),
                                { beautify: true });
};

exports.compile = function compile(code, filename, options) {
  // XXX this is temporary fix to make API compatible
  if (Array.isArray(code)) return exports.generate(code);

  // filename is optional argument
  if (options === undefined && typeof filename === 'object') {
    options = filename;
    filename = null;
  }

  var parsed = exports.parse(code),
      compiled = exports.generate(parsed, options),
      evaluated = vm.runInThisContext(compiled, filename);

  function render(locals) {
    return evaluated.apply.call(locals);
  }

  render.apply = evaluated.apply;
  render.mergeWith = evaluated.mergeWith;
  render.config = evaluated.config;

  return render;
};
