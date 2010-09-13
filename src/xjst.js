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

    function extendNew(o, k, v, vv) {
        var r = {};
        for(var i in o) r[i] = o[i];
        if(arguments.length == 4) {
            r[k][vv] = true;
        } else {
            r[k] = v;
        }
        return r;
    }

    function emit(o) {
        return JSON.stringify(o);
    }

    function doT(i, j, ps) {
        console.log('== ' + i + ', ' + j + ', ' + JSON.stringify(ps))
        var t = templates[i];
        if(!t) return ' throw {} ';

        var m = t[0][j];
        if(!m) return 'return ' + emit(t[1]) + ';';

        var p = m[0],
            c = m[2];


        if(p in ps) {
            if(typeof ps[p] == 'string') {
                if(ps[p] == JSON.stringify(c)) {
                    return dot(i, j + 1, ps);
                } else {
                    return doT(i + 1, 0, ps);
                }
            } else {
                 if(JSON.stringify(c) in ps[p]) {
                    return doT(i + 1, 0, ps);
                 } else {
                    return 'if(p' + p + '==' + emit(c) + '){\n'
                        doT(i, j + 1, extendNew(ps, p, JSON.stringify(c))) + '}else{\n' +
                        doT(i + 1, 0, extendNew(ps, p, undefined, JSON.stringify(c))) + '}\n';
                 }
            }
        } else {
            return 'var p' + p + '=' + emit(m[1]) + ';\n'
                doT(i, j, extendNew(ps, p, {}));
        }
    }

    return doT(0, 0, {});

};

exports.compile1 = function(templates) {

    function eqMatches(m1, m2) { return m1[0] == m2[0] && m1[2] == m2[2] }

    function groupByMatches(templates) {
        var byMatches = [],
            tsByMatch,
            i = templates.length;

        while(i--) {
            var template = templates[i],
                match = template[0][0],
                bla = console.log('x ' + i + ' -- ' + JSON.stringify(match)),
                tByMatch = [template[0].slice(1), template[1]];

            console.log('1 ' + JSON.stringify(tsByMatch) + ' -=-=-=-=- ' + tByMatch);
            if(tsByMatch && match.length && eqMatches(tsByMatch[0], match)) {
                tsByMatch[1].unshift(tByMatch);
            } else {
                tsByMatch && byMatches.unshift([
                    tsByMatch[0],
                    groupByMatches(tsByMatch[1])]);
                tsByMatch && console.log('2 ' + JSON.stringify(byMatches) + ' --==--==--==-- ' + JSON.stringify(tsByMatch[1]));
                tsByMatch = [match, [tByMatch]];
            }
        }

        return byMatches;
    }

    return groupByMatches(templates.reverse());

};
