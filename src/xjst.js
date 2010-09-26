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

    function newPredicMemo(o, k, v, vv) {
        var r = {};
        for(var i in o) r[i] = o[i];

        arguments.length == 4 ?
            (r[k][vv] = true) :
            (r[k] = v);

        return r;
    }

    function doTemplate(i, j, predicMemo) {
        var template = templates[i];
        if(!template) return " throw true ";

        var subMatch = template[0][j];
        if(!subMatch) return 'return ' + XJSTCompiler.match(template[1], 'tBody') + ';';

        var predicate = subMatch[0],
            predicateConst = subMatch[2];

        if(predicate in predicMemo)
            if(typeof predicMemo[predicate] == 'string')
                if(predicMemo[predicate] == JSON.stringify(predicateConst))
                    return doTemplate(i, j + 1, predicMemo);
                else
                    return doTemplate(i + 1, 0, predicMemo);
            else
                 if(JSON.stringify(predicateConst) in predicMemo[predicate])
                    return doTemplate(i + 1, 0, predicMemo);
                 else
                    return 'if(p' + predicate + '==' + XJSTCompiler.match(predicateConst, 'trans') + '){\n' +
                        doTemplate(i, j + 1, newPredicMemo(predicMemo, predicate, JSON.stringify(predicateConst))) + '}else{\n' +
                        doTemplate(i + 1, 0, newPredicMemo(predicMemo, predicate, undefined, JSON.stringify(predicateConst))) + '}\n';
        else
            return 'var p' + predicate + '=' + XJSTCompiler.match(subMatch[1], 'trans') + ';\n' +
                doTemplate(i, j, newPredicMemo(predicMemo, predicate, {}));
    }

    return '(function(c){\n' + doTemplate(0, 0, {}) + '})';

};
