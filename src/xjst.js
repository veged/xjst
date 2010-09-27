var ometa = require('ometajs'),
    OMeta = ometa.OMeta,
    Parser = ometa.Parser,
    BSJSParser = exports.BSJSParser = ometa.BSJSParser,
    BSJSTranslator = exports.BSJSTranslator = ometa.BSJSTranslator;

function Identifier () {
    this.counter = 0;
    this.cache = {};
}

Identifier.prototype.identify = function(o) {
    var key = JSON.stringify(o);
    return key in this.cache ?
        this.cache[key] :
        this.cache[key] = ++this.counter;
};

exports.compile = function(templates) {

    function newPredicMemo(o, k, v) {
        var r = {};
        for(var i in o) r[i] = o[i];
        r[k] = v;
        return r;
    }

    var predicatesValues = (function() {
            var vals = {};

            templates.forEach(function(t){
                t[0].forEach(function(subMatch){
                    var p = subMatch[0],
                        c = JSON.stringify(subMatch[2]);
                    (vals[p] || (vals[p] = {}))[c] = subMatch[2];
                });
            });

            for(var p in vals) {
                var vs = [];
                for(var v in vals[p]) vs.push(vals[p][v]);
                vals[p] = vs;
            }

            return vals;
        })();

    function doTemplate(i, j, predicMemo) {
        var template = templates[i];
        if(!template) return { 'stmt': ['throw', ['get', 'true']] };

        var subMatch = template[0][j];
        if(!subMatch) return {
            //comment: JSON.stringify([i, j, predicMemo]),
            exprs: template[1] };

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
            return {
                //'comment': JSON.stringify([i, j, predicMemo]),
                'switch': subMatch[1],
                'cases': predicatesValues[predicate].map(function(v){
                        return [v, doTemplate(i, j, newPredicMemo(predicMemo, predicate, JSON.stringify(v)))]
                    }),
                'default': doTemplate(i, j, newPredicMemo(predicMemo, predicate, undefined))
            };
    }

    var cache = {},
        idCounter = 1,
        merges = {};

    function merge(o) {
        var hash,
            id = idCounter++;

        if(o['switch']) {
            hash += 'switch ' + JSON.stringify(o['switch']) + '{';
            o.cases.forEach(function(c){
                c[1] = merge(c[1]);
                hash += c[1].hash + " ";
            });
            o['default'] = merge(o['default']);
            hash += o['default'].hash + "}";
        } else {
            hash = JSON.stringify(o.exprs || o.stmt);
        }

        (hash in cache) || (cache[o.hash = hash] = o);
        cache[hash].id = id;

        return cache[hash];
    }

    function serialize(o, tails) {
        if(o.id in merges) {
            tails[o.id] = o;
            return 'break l' + o.id + ';';
        }

        return (o.comment? '/*' + o.comment + '*/\n' : '') +
            (o.id? '/*' + o.id + '*/' : '') +
            (o['switch'] ?
                'switch(' + XJSTCompiler.match(o['switch'], 'trans') + ') {\n' +
                    o.cases.map(function(c){
                        return 'case ' + XJSTCompiler.match(c[0], 'trans') + ':\n' +
                            serialize(c[1], tails) + ';'
                        }).join('\n') +
                    'default: ' + serialize(o['default'], tails) +
                    '}\n' :
                o.exprs ?
                    'return ' + XJSTCompiler.match(o.exprs, 'tBody') :
                    XJSTCompiler.match(o.stmt, 'trans'));
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
        if(o.id in joins) {
            joins[o.id]++;
        } else {
            joins[o.id] = 1;
            if(o['switch']) {
                o.cases.forEach(function(c){ detectJoins(c[1], joins) });
                detectJoins(o['default'], joins);
            }
        }
        return joins;
    }

    function serializeTop(prog) {
        var res = '(function(c){\n',
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

        return res += '})';
    }

    return serializeTop(merge(doTemplate(0, 0, {})));

};
