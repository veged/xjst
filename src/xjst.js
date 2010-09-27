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
        if(!template) return ' throw true ';

        var subMatch = template[0][j];
        if(!subMatch) return 'return ' + XJSTCompiler.match(template[1], 'tBody') + ';';

        var predicate = subMatch[0],
            predicateConst = subMatch[2];

        if(predicate in predicMemo)
            if(predicMemo[predicate] == JSON.stringify(predicateConst))
                return doTemplate(i, j + 1, predicMemo);
            else
                return doTemplate(i + 1, 0, predicMemo);
        else
            return 'switch(' + XJSTCompiler.match(subMatch[1], 'trans') + ') {\n' +
                    predicatesValues[predicate].map(function(v){
                        return 'case ' + XJSTCompiler.match(v, 'trans') + ':\n' +
                            doTemplate(i, j, newPredicMemo(predicMemo, predicate, JSON.stringify(v))) +
                            '\nbreak;';
                    }).join('\n') +
                    'default: ' + doTemplate(i, j, newPredicMemo(predicMemo, predicate, undefined)) +
                '}\n';
    }

    return '(function(c){\n' + doTemplate(0, 0, {}) + '})';

};
