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

    function dumpCtx() {
        return '/*' + JSON.stringify(arguments) + '*/\n';
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
        if(!template) return ['throw', ['get', 'true']];

        var subMatch = template[0][j];
        if(!subMatch) return { comment: dumpCtx(i, j, predicMemo), tBody: template[1] };

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
                'comment': dumpCtx(i, j, predicMemo),
                'switch': subMatch[1],
                'cases': predicatesValues[predicate].map(function(v){
                        return [v, doTemplate(i, j, newPredicMemo(predicMemo, predicate, JSON.stringify(v)))]
                    }),
                'default': doTemplate(i, j, newPredicMemo(predicMemo, predicate, undefined))
            };
    }

    return '(function(c){\n' +
        (function serialize(o){
            return (o['comment'] || '') + (o['switch'] ?
                'switch(' + XJSTCompiler.match(o['switch'], 'trans') + ') {\n' +
                    o.cases.map(function(c){
                        return 'case ' + XJSTCompiler.match(c[0], 'trans') + ':\n' +
                            serialize(c[1]) +
                        '\nbreak;';
                        }).join('\n') +
                    'default: ' + serialize(o['default']) +
                    '}\n' :
                o.tBody ?
                    'return ' + XJSTCompiler.match(o.tBody, 'tBody') :
                    XJSTCompiler.match(o, 'trans'));
        })(doTemplate(0, 0, {})) +
        '})';

};
