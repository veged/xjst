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
  var tree = XJSTParser.matchAll(code, 'topLevel', undefined,
                                 utils.errorHandler(code));

  return  XJSTTranslator.matchAll(tree, 'topLevel', undefined,
                                  utils.errorHandler(tree));
};

exports.generate = function generate(templatesAndOther, options) {
  var templates = templatesAndOther[1],
      predicatesValues = getPredicateValues(templates),
      predicateMap = {},
      merger = new utils.Merger(),
      merge = merger.merge.bind(merger),

      hashs = {},
      fns = {};

  // Set default options
  options || (options = {});
  if (options.wrap !== false) options.wrap = true;
  if (options.merge !== true) options.merge = false;

  templates.forEach(function(template) {
    template[0].forEach(function(predicate) {
      predicateMap[predicate[0]] = JSON.stringify(predicate[1]);
    });
  });

  function traverse(i, j, predicMemo) {
    function addNode(node, memo) {
      if (node.predic) {
        // Do not intersect if we already now that predicates are mutual
        if (!node.mutual) {
          node.predic = utils.intersect(node.predic, memo);
        }

        node.joinedPredic = utils.join(node.joinedPredic, memo,
                                       predicateMap);
      } else {
        node.predic = utils.clone(memo, true);

        // Remember if node's joined state was mutual
        // (with `unop` and `call` predicates)
        node.mutual = utils.isMutual(node.predic, predicateMap);

        node.joinedPredic = utils.join({}, memo,
                                       predicateMap);
      }

      if (node.switch) {
        node.longId = utils.sha1(JSON.stringify(node.joinedPredic));
      }

      return node;
    };
    var template = templates[i];
    if(!template) {
      return addNode(
        merge({ tag: 'unexpected', fn: true, stmt: ['throw', ['get', 'true']] }),
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
                                               utils.stringify(v)))];
      });
      result.default = traverse(i, j, utils.cloneChanged(predicMemo,
                                                         predicate,
                                                         undefined));
      return addNode(merge(result), predicMemo);
    }
  };


  var merges = {};

  function serialize(o, tails, _parents) {
    function getParents() {
      return JSON.stringify(_parents.map(function(parent) {
        return '$' + parent;
      }));
    };

    function parents() {
      return _parents.concat(o.longId || o.id);
    };

    if(merges.hasOwnProperty(o.id)) {
      tails[o.id] = o;
      if (o.tag) {
        return [
          'return _c.$', o.id, '.call(this,',
          getParents(),
          ');'
        ].join('');
      } else {
        return 'return _c.$' + o.id + '.call(this);';
      }
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
                serialize(c[1], tails, parents()),
            '} else {\n',
                serialize(o.default, tails, parents()),
            '}\n'
        );
      // TODO: determine optimal cases' length maximum
      } else if (o.cases.length < 32) {
        res.push('switch (', XJSTCompiler.match(o.switch, 'trans'), ') {');

        o.cases.forEach(function(c, i) {
          res.push(
            '  case ', XJSTCompiler.match(c[0], 'trans'), ':\n',
            serialize(c[1], tails, parents()),
            '  break;\n'
          );
        });
        res.push(
          '  default:\n',
          serialize(o.default, tails, parents()),
          '}'
        );
      } else {
        var hash = hashs[o.id] = {
          map: {},
          default: serialize(o.default, tails, parents())
        };

        o.cases.forEach(function(c) {
          hash.map[XJSTCompiler.match(c[0], 'trans')] =
              serialize(c[1], tails, parents());
        });

        res.push(
          'return (__h', o.id, '.map[', XJSTCompiler.match(o.switch, 'trans'),
          '] ||', '__h', o.id
        );

        res.push('.default).call(this)');
      }

      fns[o.id] = { body: res.join(''), alt: o.longId };

      res = ['return _c.$', o.id, '.call(this);'];
    } else {
      var body = XJSTCompiler.match(o.stmt, 'trans') + ';\nreturn;';

      if (o.size > 1 || o.fn) {
        fns[o.id] = { body: body, alt: o.longId };

        if (o.tag) {
          res.push(
              'return _c.$', o.id, '.call(this,',
              getParents(), ');'
          );
        } else {
          res.push('return _c.$', o.id, '.call(this);');
        }
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
        res.push(serialize(t, tails, []));
      } else {
        var body = serialize(t, tails, []);
        if (!fns[id]) {
          fns[id] = { body: body, alt: t.longId};
        }
      }
    }

    return [
      'var _c = exports.config = {};',
      'exports.mergeWith = ', utils.mergeWith.toString(), ';',
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
          var fn = fns[id];
          if (!fn.alt || !options.merge) {
            return [
              '_c.$', id, ' = function() {\n',
              fn.body,
              '\n};'
            ].join('');
          } else {
            return [
              '_c.$', fn.alt, ' = _c.$', id,
              ' = function() {', fn.body, '};'
            ].join('');
          }
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
      if (node.mutual) return acc;
      if (node._visited) return acc;

      node._visited = true;

      var seq = XJSTLocalAndApplyCompiler.match(node.stmt, 'topLevel');
      if (seq.length === 0) return acc;

      var locals = [];
      seq.forEach(function(op) {
        if (op[0] === 'apply') {
          var state = utils.clone(node.predic, true);

          locals.forEach(function(local) {
            local.forEach(function(as) {
              if (as[2] === 'reset') {
                delete state[as[0]];
              } else {
                state[as[0]] = utils.stringify(as[2]);
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
        // Skip nodes with mutual state
        if (node.mutual === true) return acc;

        var score = utils.compareSets(apply.state, node.predic);

        if (score !== null && score >= 0 && score < acc.score) {
          acc.score = score;
          acc.node = node;
        }

        return acc;
      }, { score: Infinity, node: null });

      if (result.node === null) return;

      result.node.fn = true;

      apply.op.code = '_c.$' + result.node.id + '.call(this)';
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
      compiled = exports.generate(parsed, options);

  return vm.runInThisContext(compiled, filename);
};