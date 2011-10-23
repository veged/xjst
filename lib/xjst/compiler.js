var xjst = require('../xjst'),
    vm = require('vm'),
    utils = xjst.utils,

    XJSTParser = xjst.ometa.XJSTParser,
    XJSTCompiler = xjst.ometa.XJSTCompiler;

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
  return XJSTParser.matchAll(code, 'topLevel', undefined, utils.errorHandler);
};

exports.generate = function generate(templatesAndOther) {
  var templates = templatesAndOther[1],
      predicatesValues = getPredicateValues(templates),
      merger = new utils.Merger(),
      merge = merger.merge.bind(merger);

      p = {};

  function traverse(i, j, predicMemo) {
    var template = templates[i];
    if(!template) return merge({ 'stmt': ['throw', ['get', 'true']] });

    var subMatch = template[0][j];
    if(!subMatch) return { stmt: template[1] };

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
      return merge(result);
    }
  };


  var merges = {};

  function serialize(o, tails) {
    if(merges.hasOwnProperty(o.id)) {
      tails[o.id] = o;
      return 'break l' + o.id + ';';
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
      } else {
        res.push(
            'switch(', XJSTCompiler.match(o.switch, 'trans'), ') {\n',
            o.cases.map(function(c) {
                return [
                  '  case ', XJSTCompiler.match(c[0], 'trans'), ':\n',
                  serialize(c[1], tails), ';\nbreak;'
                ].join('');
            }).join('\n'),
            '  default: ', serialize(o.default, tails),
            '}\n'
        );
      }
    } else {
      res.push(
          o.exprs ?
              'return ' + XJSTCompiler.match(o.exprs, 'tBody')
              :
              XJSTCompiler.match(o.stmt, 'trans') + ';\nreturn;'
      );
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

    var t, first = true;
    while(t = shiftTails(tails)) {
      if (!first) {
        heads.push('l' + t.id + ': {\n');
        res[res.length - 1] = '}';
      }
      first = false;

      delete merges[t.id];
      res.push(serialize(t, tails), '');
    }

    return ['exports.apply = apply;function apply(c) {\n']
        .concat(heads.reverse(), res, '};')
        .join('');
  }

  return [
    '(function(exports) {',
    XJSTCompiler.match(templatesAndOther[0], 'other'),
    serializeTop(traverse(0, 0, {})),
    'return exports})(typeof exports === "undefined"? {} : exports)'
  ].join('\n');
};

exports.compile = function compile(code, filename) {
  var parsed = exports.parse(code),
      compiled = exports.generate(parsed);

  return vm.runInThisContext(compiled, filename);
};
