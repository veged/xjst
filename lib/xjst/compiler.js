var xjst = require('../xjst'),
    vm = require('vm'),
    uglify = require('uglify-js'),
    utils = xjst.utils,

    XJSTParser = xjst.ometa.XJSTParser,
    XJSTTranslator = xjst.ometa.XJSTTranslator,
    XJSTCompiler = xjst.ometa.XJSTCompiler;
    XJSTLocalAndApplyCompiler = xjst.ometa.XJSTLocalAndApplyCompiler;

function getPredicateValues(templates) {
  var vals = {};

  templates.forEach(function(t) {
    t[0].forEach(function(subMatch) {
      var p = subMatch[0],
          c = JSON.stringify(subMatch[2]);

      vals[p] || (vals[p] = {});
      vals[p][c] = subMatch[2];
    });
  });

  Object.keys(vals).forEach(function(p) {
    vals[p] = Object.keys(vals[p]).map(function(key) {
      return vals[p][key];
    });
  });

  return vals;
};

exports.parse = function parse(code) {
  return XJSTParser.matchAll(code, 'topLevel', undefined,
                             utils.errorHandler(code));
};

exports.translate = function translate(tree) {
  return XJSTTranslator.matchAll(tree, 'topLevel', undefined,
                                 utils.errorHandler(tree));
};

exports.generate = function generate(templatesAndOther, options) {
  var templates = templatesAndOther[1],
      predicatesValues = getPredicateValues(templates),
      merger = new utils.Merger(),
      merge = merger.merge.bind(merger),

      hashs = {},
      fns = {};

  // Set default options
  options || (options = {});
  if (typeof options.wrap !== 'boolean') {
    options.wrap = true;
  }

  function traverse(i, j, predicMemo) {
    function addNode(node, memo) {
      if (node.predic) {
        node.predic = utils.intersect(node.predic, memo);
      } else {
        node.predic = utils.clone(memo);
      }

      return node;
    };
    var template = templates[i];
    if(!template) {
      return addNode(
        merge({ stmt: ['throw', ['get', 'true']] }),
        predicMemo
      );
    };

    var subMatch = template[0][j];
    if(!subMatch) return addNode(merge({ stmt: template[1] }), predicMemo);

    var known = template[0].slice(j + 1).some(function(s) {
      var predicate = s[0],
          predicateConst = s[2];

      return predicMemo.hasOwnProperty(predicate) &&
             predicMemo[predicate] != JSON.stringify(predicateConst);
    });
    if (known) return traverse(i + 1, 0, predicMemo);

    var predicate = subMatch[0],
        predicateConst = subMatch[2];

    if(predicMemo.hasOwnProperty(predicate)) {
      if(predicMemo[predicate] === JSON.stringify(predicateConst)) {
        return traverse(i, j + 1, predicMemo);
      } else {
        return traverse(i + 1, 0, predicMemo);
      }
    } else {
      var result = {};

      result.switch = subMatch[1];
      result.cases = predicatesValues[predicate].map(function(v) {
        return [v, traverse(i, j,
                            utils.cloneChanged(predicMemo, predicate,
                                               JSON.stringify(v)))];
      });
      result.default = traverse(i, j, utils.cloneChanged(predicMemo,
                                                         predicate,
                                                         undefined));
      return addNode(merge(result), predicMemo);
    }
  };


  var merges = {};

  function serialize(o, tails) {
    if(merges.hasOwnProperty(o.id)) {
      tails[o.id] = o;
      return 'return __fn' + o.id + '.call(this);';
    }

    var res = [];

    if(o.switch) {
      if(o.cases.length == 1) {
        var c = o.cases[0];
        res.push(
            'if(',
            XJSTCompiler.match(o.switch, 'trans'),
            ' === ',
            XJSTCompiler.match(c[0], 'trans'), ') {\n',
                serialize(c[1], tails),
            '} else {\n',
                serialize(o.default, tails),
            '}\n'
        );
      // TODO: determine optimal cases' length maximum
      } else if (o.cases.length < 32) {
        res.push('var __t = ', XJSTCompiler.match(o.switch, 'trans'), ';\n');

        o.cases.forEach(function(c, i) {
          if (i !== 0) res.push(' else ');
          res.push(
            'if (__t === ', XJSTCompiler.match(c[0], 'trans'), ') {\n',
            serialize(c[1], tails),
            '}\n'
          );
        });
        res.push(
          ' else {',
          serialize(o.default, tails),
          '}\n'
        );
      } else {
        var hash = hashs[o.id] = {
          map: {},
          default: serialize(o.default, tails)
        };

        o.cases.forEach(function(c) {
          hash.map[XJSTCompiler.match(c[0], 'trans')] = serialize(c[1], tails);
        });

        res.push(
          'return (__h', o.id, '.map[', XJSTCompiler.match(o.switch, 'trans'),
          '] ||', '__h', o.id, '.default).call(this)'
        );
      }
      if (o.fn) {
        fns[o.id] = res.join('');
        res = ['return __fn', o.id, '.call(this);'];
      }
    } else {
      var body = XJSTCompiler.match(o.stmt, 'trans') + ';\nreturn;';

      if (o.size > 1 || o.fn) {
        fns[o.id] = body;
        res.push('return __fn', o.id, '.call(this);');
      } else {
        res.push(body);
      }
    }

    return res.join('');
  }

  function shiftTails(tails) {
    var ids = Object.keys(tails).sort(function(a, b) { return a - b }),
        res = tails[ids[0]];

    delete tails[ids[0]];

    return res;
  }

  function detectJoins(o, joins) {
    if(o.id) {
      if(joins.hasOwnProperty(o.id)) {
        joins[o.id]++;
      } else {
        joins[o.id] = 1;
        if(o.switch) {
          o.cases.forEach(function(c) { detectJoins(c[1], joins) });
          detectJoins(o.default, joins);
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
    }).sort(function(a, b) { return b - a });

    labels.forEach(function(key) {
      merges[key] = true;
    });

    var tails = {};
    tails[prog.id] = prog;

    var t, first = true, id;
    while(t = shiftTails(tails)) {
      delete merges[id = t.id];

      if (first) {
        first = false;
        res.push(serialize(t, tails));
      } else {
        fns[id] = serialize(t, tails);
      }
    }

    return [
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
              ': function __', key.replace(/[^a-z]+/gi, ''), '() {',
              hashs[id].map[key], '},'
            );
          });

          res.push('  },\n');
          res.push('  "default": function() {', hashs[id].default, '}');
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
          return [
            'function __fn', id, '() {',
            fns[id],
            '};'
          ].join('');
        })
    ).join('');
  };

  function reduceTree(tree, fn, acc) {
    if (tree.switch) {
      acc = fn(acc, tree);

      acc = tree.cases.reduce(function(acc, c) {
        return reduceTree(c[1], fn, acc);
      }, acc);
      acc = reduceTree(tree.default, fn, acc);
    } else {
      acc = fn(acc, tree);
    }

    return acc;
  };

  function optimizeRecursion(tree) {
    // Update predicates with data in local
    var applies = reduceTree(tree, function(acc, node) {
      if (!node.stmt) return acc;

      var seq = XJSTLocalAndApplyCompiler.match(node.stmt, 'topLevel');
      if (seq.length === 0) return acc;

      var locals = [];
      seq.forEach(function(op) {
        if (op[0] === 'apply') {
          var state = utils.clone(node.predic);

          locals.forEach(function(local) {
            local.forEach(function(as) {
              if (as[2] === 'reset') {
                delete state[as[0]];
              } else {
                state[as[0]] = JSON.stringify(as[2]);
              }
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
      if (JSON.stringify(apply.node.predic) === JSON.stringify(apply.state)) {
        // Skip this apply as it can't be optimized
        return;
      }

      var result = reduceTree(tree, function(acc, node) {
        var score = utils.compareSets(apply.state, node.predic);

        if (score !== null && score >= 0 && score < acc.score) {
          acc.score = score;
          acc.node = node;
        }
        return acc;
      }, { score: Infinity, node: null });

      if (result.node === null) return;

      result.node.fn = true;

      apply.op.code = '__fn' + result.node.id + '.call(this)';
    });

    return tree;
  };

  var body = [
    XJSTCompiler.match(templatesAndOther[0], 'other'),
    serializeTop(optimizeRecursion(traverse(0, 0, {}, [])))
  ];

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

  var parsed = exports.parse(code),
      translated = exports.translate(parsed),
      compiled = exports.generate(translated, options);

  require('fs').writeFileSync('/tmp/b.js', compiled);

  return vm.runInThisContext(compiled, filename);
};
