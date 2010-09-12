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
