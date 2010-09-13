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
                    return doT(i, j + 1, ps);
                } else {
                    return doT(i + 1, 0, ps);
                }
            } else {
                 if(JSON.stringify(c) in ps[p]) {
                    return doT(i + 1, 0, ps);
                 } else {
                    return 'if(p' + p + '==' + emit(c) + '){\n' +
                        doT(i, j + 1, extendNew(ps, p, JSON.stringify(c))) + '}else{\n' +
                        doT(i + 1, 0, extendNew(ps, p, undefined, JSON.stringify(c))) + '}\n';
                 }
            }
        } else {
            return 'var p' + p + '=' + emit(m[1]) + ';\n' +
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
{var XJSTParser=exports.XJSTParser=objectThatDelegatesTo(BSJSParser,{
"special":function(){var $elf=this,_fromIdx=this.input.idx,s;return this._or((function(){return (function(){s=(function(){switch(this._apply('anything')){case ":":return (function(){this._applyWithArgs("exactly",":");return "::"}).call(this);case "-":return (function(){this._applyWithArgs("exactly",">");return "->"}).call(this);default: throw fail}}).call(this);return [s,s]}).call(this)}),(function(){return BSJSParser._superApplyWithArgs(this,'special')}))},
"exprs":function(){var $elf=this,_fromIdx=this.input.idx,as,e;return this._or((function(){return (function(){this._applyWithArgs("token","(");as=this._applyWithArgs("listOf","expr",",");this._applyWithArgs("token",")");return as}).call(this)}),(function(){return (function(){e=this._apply("expr");return [e]}).call(this)}))},
"const":function(){var $elf=this,_fromIdx=this.input.idx,s,n;return this._or((function(){return (function(){s=this._applyWithArgs("token","string");return ["string",s]}).call(this)}),(function(){return (function(){n=this._applyWithArgs("token","number");return ["number",n]}).call(this)}))},
"tBody":function(){var $elf=this,_fromIdx=this.input.idx;return this._apply("exprs")},
"subMatch":function(){var $elf=this,_fromIdx=this.input.idx,e1,c,e2;return this._or((function(){return (function(){e1=this._apply("expr");this._applyWithArgs("token","::");c=this._apply("const");return [e1,c]}).call(this)}),(function(){return (function(){e2=this._apply("expr");return [e2,["get","true"]]}).call(this)}))},
"tMatch":function(){var $elf=this,_fromIdx=this.input.idx,ms,m;return this._or((function(){return (function(){this._applyWithArgs("token","[");ms=this._applyWithArgs("listOf","subMatch",",");this._applyWithArgs("token","]");return ms}).call(this)}),(function(){return (function(){m=this._apply("subMatch");return [m]}).call(this)}))},
"template":function(){var $elf=this,_fromIdx=this.input.idx,m,b;return (function(){m=this._apply("tMatch");this._applyWithArgs("token","->");b=this._apply("tBody");return [m,b]}).call(this)},
"topLevel":function(){var $elf=this,_fromIdx=this.input.idx,r;return (function(){r=this._many1((function(){return this._apply("template")}));this._many((function(){return this._applyWithArgs("exactly","\n")}));this._apply("end");return XJSTParser._identify(r)}).call(this)}});(XJSTParser["_identify"]=(function (templates){var predicates=new Identifier();templates.forEach((function (template){template[(0)].forEach((function (subMatch){subMatch.unshift(predicates.identify(subMatch[(0)]))}))}));return templates}));var XJSTBeautifier=exports.XJSTBeautifier=objectThatDelegatesTo(OMeta,{
"jsTrans":function(){var $elf=this,_fromIdx=this.input.idx,t,ans;return (function(){this._form((function(){return (function(){t=this._apply("anything");return ans=this._applyWithArgs("apply",t)}).call(this)}));return ans}).call(this)},
"number":function(){var $elf=this,_fromIdx=this.input.idx,n;return (function(){n=this._apply("anything");return n}).call(this)},
"string":function(){var $elf=this,_fromIdx=this.input.idx,s;return (function(){s=this._apply("anything");return s.toProgramString()}).call(this)},
"arr":function(){var $elf=this,_fromIdx=this.input.idx,xs;return (function(){xs=this._many((function(){return this._apply("jsTrans")}));return (("[" + xs.join(", ")) + "]")}).call(this)},
"unop":function(){var $elf=this,_fromIdx=this.input.idx,op,x;return (function(){op=this._apply("anything");x=this._apply("jsTrans");return (op + x)}).call(this)},
"getp":function(){var $elf=this,_fromIdx=this.input.idx,fd,x;return (function(){fd=this._apply("jsTrans");x=this._apply("jsTrans");return (((x + "[") + fd) + "]")}).call(this)},
"get":function(){var $elf=this,_fromIdx=this.input.idx,x;return (function(){x=this._apply("anything");return x}).call(this)},
"set":function(){var $elf=this,_fromIdx=this.input.idx,lhs,rhs;return (function(){lhs=this._apply("jsTrans");rhs=this._apply("jsTrans");return ((lhs + " = ") + rhs)}).call(this)},
"mset":function(){var $elf=this,_fromIdx=this.input.idx,lhs,op,rhs;return (function(){lhs=this._apply("jsTrans");op=this._apply("anything");rhs=this._apply("jsTrans");return ((((lhs + " ") + op) + "= ") + rhs)}).call(this)},
"binop":function(){var $elf=this,_fromIdx=this.input.idx,op,x,y;return (function(){op=this._apply("anything");x=this._apply("jsTrans");y=this._apply("jsTrans");return ((((x + " ") + op) + " ") + y)}).call(this)},
"preop":function(){var $elf=this,_fromIdx=this.input.idx,op,x;return (function(){op=this._apply("anything");x=this._apply("jsTrans");return (op + x)}).call(this)},
"postop":function(){var $elf=this,_fromIdx=this.input.idx,op,x;return (function(){op=this._apply("anything");x=this._apply("jsTrans");return (x + op)}).call(this)},
"subMatch":function(){var $elf=this,_fromIdx=this.input.idx,id,m,id,e,c;return this._or((function(){return (function(){this._form((function(){return (function(){id=this._apply("anything");m=this._apply("jsTrans");return this._form((function(){return (function(){this._applyWithArgs("exactly","get");return this._applyWithArgs("exactly","true")}).call(this)}))}).call(this)}));return m}).call(this)}),(function(){return (function(){this._form((function(){return (function(){id=this._apply("anything");e=this._apply("jsTrans");return c=this._apply("jsTrans")}).call(this)}));return ((e + " :: ") + c)}).call(this)}))},
"tMatch":function(){var $elf=this,_fromIdx=this.input.idx,m,ms;return this._or((function(){return (function(){this._form((function(){return m=this._apply("subMatch")}));return m}).call(this)}),(function(){return (function(){this._form((function(){return ms=this._many1((function(){return this._apply("subMatch")}))}));return (("[" + ms.join(", ")) + "]")}).call(this)}))},
"tBody":function(){var $elf=this,_fromIdx=this.input.idx,e,es;return this._or((function(){return (function(){this._form((function(){return e=this._apply("jsTrans")}));return ("\n    " + e)}).call(this)}),(function(){return (function(){this._form((function(){return es=this._many1((function(){return this._apply("jsTrans")}))}));return ((" (\n    " + es.join(",\n    ")) + " )")}).call(this)}))},
"template":function(){var $elf=this,_fromIdx=this.input.idx,m,b;return (function(){this._form((function(){return (function(){m=this._apply("tMatch");return b=this._apply("tBody")}).call(this)}));return ((m + " ->") + b)}).call(this)},
"topLevel":function(){var $elf=this,_fromIdx=this.input.idx,ts;return (function(){ts=this._many1((function(){return this._apply("template")}));return ts.join("\n\n")}).call(this)}});var XJSTCompiler=exports.XJSTCompiler=objectThatDelegatesTo(BSJSTranslator,{
"subMatch":function(){var $elf=this,_fromIdx=this.input.idx,id,m,id,e,c;return this._or((function(){return (function(){this._form((function(){return (function(){id=this._apply("anything");m=this._apply("trans");return this._form((function(){return (function(){this._applyWithArgs("exactly","get");return this._applyWithArgs("exactly","true")}).call(this)}))}).call(this)}));return m}).call(this)}),(function(){return (function(){this._form((function(){return (function(){id=this._apply("anything");e=this._apply("trans");return c=this._apply("trans")}).call(this)}));return ((e + " == ") + c)}).call(this)}))},
"tMatch":function(){var $elf=this,_fromIdx=this.input.idx,m,ms;return this._or((function(){return (function(){this._form((function(){return m=this._apply("subMatch")}));return m}).call(this)}),(function(){return (function(){this._form((function(){return ms=this._many1((function(){return this._apply("subMatch")}))}));return ms.join(" && ")}).call(this)}))},
"tBody":function(){var $elf=this,_fromIdx=this.input.idx,e,es;return this._or((function(){return (function(){this._form((function(){return e=this._apply("trans")}));return e}).call(this)}),(function(){return (function(){this._form((function(){return es=this._many1((function(){return this._apply("trans")}))}));return ((" (\n        " + es.join(",\n        ")) + " )")}).call(this)}))},
"template":function(){var $elf=this,_fromIdx=this.input.idx,m,b;return (function(){this._form((function(){return (function(){m=this._apply("tMatch");return b=this._apply("tBody")}).call(this)}));return (((("    if(" + m) + ") return ") + b) + ";")}).call(this)},
"topLevel":function(){var $elf=this,_fromIdx=this.input.idx,ts;return (function(){ts=this._many1((function(){return this._apply("template")}));return (("function(){\n" + ts.join("\n")) + "\n}")}).call(this)},
"topLevel2":function(){var $elf=this,_fromIdx=this.input.idx,ts;return (function(){ts=this._apply("anything");return XJSTCompiler.matchAll(ts.reverse(),"topLevel2")}).call(this)}})}
