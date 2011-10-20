var xjst = require('../xjst'),
    utils = xjst.utils,
    XJSTParser = xjst.ometa.XJSTParser,
    XJSTCompiler = xjst.ometa.XJSTCompiler;

function getPredicateValues(templates) {
  var vals = {};

  templates.forEach(function(t){
    t[0].forEach(function(subMatch){
      var p = subMatch[0],
          c = JSON.stringify(subMatch[2]);

      vals[p] || (vals[p] = {});
      vals[p][c] = subMatch[2];
    });
  });

  for (var p in vals) {
    vals[p] = Object.keys(vals[p]).map(function(key) {
      return vals[p][key];
    });
  }

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

    function doTemplate(i, j, predicMemo) {
        var template = templates[i];
        if(!template) return merge({ 'stmt': ['throw', ['get', 'true']] });

        var subMatch = template[0][j];
        if(!subMatch) return {
            //comment: JSON.stringify([i, j, predicMemo]),
            stmt: template[1] };

        var jj = j, s;
        while(s = template[0][++jj]) {
            var predicate = s[0],
                predicateConst = s[2];

            if(predicate in predicMemo)
                if(predicMemo[predicate] != JSON.stringify(predicateConst))
                    return doTemplate(i + 1, 0, predicMemo);
        }

        var predicate = subMatch[0],
            predicateConst = subMatch[2];

        if(predicate in predicMemo)
            if(predicMemo[predicate] == JSON.stringify(predicateConst))
                return doTemplate(i, j + 1, predicMemo);
            else
                return doTemplate(i + 1, 0, predicMemo);
        else
            return merge({
                //'comment': JSON.stringify([i, j, predicMemo]),
                'switch': subMatch[1],
                'cases': predicatesValues[predicate].map(function(v){
                        return [v, doTemplate(i, j, utils.cloneChanged(predicMemo, predicate, JSON.stringify(v)))]
                    }),
                'default': doTemplate(i, j, utils.cloneChanged(predicMemo, predicate, undefined))
            });
    }


    var merges = {};

    function serialize(o, tails) {
        if(o.id in merges) {
            tails[o.id] = o;
            return 'break l' + o.id + ';';
        }

        var res = '';

        o.comment && (res += '/*' + o.comment + '*/\n');
        o.id && (res += '/*' + o.id + '*/');

        if(o['switch']) {
            if(o.cases.length == 1) {
                var c = o.cases[0];
                res += 'if(' +
                    XJSTCompiler.match(o['switch'], 'trans') +
                    ' === ' +
                    XJSTCompiler.match(c[0], 'trans') + ') {\n' +
                        serialize(c[1], tails) +
                    '} else {\n' +
                        serialize(o['default'], tails) +
                    '}';
            } else {
                res += 'switch(' + XJSTCompiler.match(o['switch'], 'trans') + ') {\n' +
                    o.cases.map(function(c){
                        return 'case ' + XJSTCompiler.match(c[0], 'trans') + ':\n' +
                            serialize(c[1], tails) + '; break;'
                        }).join('\n') +
                    'default: ' + serialize(o['default'], tails) +
                    '}\n';
            }
        } else {
            res += o.exprs ?
                'return ' + XJSTCompiler.match(o.exprs, 'tBody') :
                XJSTCompiler.match(o.stmt, 'trans') + ';return;';
        }
        return res;
    }

    function shiftTails(tails) {
        var ids = [];
        for(var i in tails) ids.push(i);
        ids.sort(function(a, b) { return a - b });
        var res = tails[ids[0]];
        delete tails[ids[0]];
        return res;
    }

    function detectJoins(o, joins) {
        if('id' in o) {
            if(o.id in joins) {
                joins[o.id]++;
            } else {
                joins[o.id] = 1;
                if(o['switch']) {
                    o.cases.forEach(function(c){ detectJoins(c[1], joins) });
                    detectJoins(o['default'], joins);
                }
            }
        }
        return joins;
    }

    function serializeTop(prog) {
        var res = 'exports.apply = function(c){\n',
            joins = detectJoins(prog, {});

        var labels = [];
        for(var k in joins) {
            if(joins[k] == 1) continue
            labels.push(k);
            merges[k] = true;
        }
        labels.sort(function(a, b) { return b - a });

        res += labels.map(function(l){ return 'l' + l + ': {\n' }).join('');

        var tails = {};
        tails[prog.id] = prog;
        var t, first = true;
        while(t = shiftTails(tails)) {
            first || (res += '}');
            first = false;
            delete merges[t.id];
            res += serialize(t, tails);
        }

        return res += '};';
    }

    return '(function(exports){' +
        XJSTCompiler.match(templatesAndOther[0], 'other') + ';' +
        serializeTop(doTemplate(0, 0, {})) +
        'return exports})(typeof exports === "undefined"? {} : exports)';

};

exports.compile = function compile(code) {
  var parsed = exports.parse(code),
      compiled = exports.generate(parsed);

  return eval(compiled);
};
