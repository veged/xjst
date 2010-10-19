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

exports.compile = function(templatesAndOther) {

    var templates = templatesAndOther[1];

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
{var XJSTParser=exports.XJSTParser=objectThatDelegatesTo(BSJSParser,{
"const":function(){var $elf=this,_fromIdx=this.input.idx,s,n;return this._or((function(){return this._form((function(){return (function(){this._applyWithArgs("exactly","string");return s=this._apply("anything")}).call(this)}))}),(function(){return this._form((function(){return (function(){this._applyWithArgs("exactly","number");return n=this._apply("anything")}).call(this)}))}))},
"isKeyword":function(){var $elf=this,_fromIdx=this.input.idx,x;return (function(){x=this._apply("anything");return this._pred(((BSJSParser._isKeyword(x) || (x === "local")) || (x === "template")))}).call(this)},
"stmt":function(){var $elf=this,_fromIdx=this.input.idx,c,t;return this._or((function(){return (function(){this._applyWithArgs("token","local");this._applyWithArgs("token","(");c=this._apply("expr");this._applyWithArgs("token",")");t=this._apply("stmt");return XJSTParser.match(["local",c,t],"local")}).call(this)}),(function(){return BSJSParser._superApplyWithArgs(this,'stmt')}))},
"local":function(){var $elf=this,_fromIdx=this.input.idx,es,t;return (function(){this._form((function(){return (function(){this._applyWithArgs("exactly","local");es=this._apply("localExprs");return t=this._apply("anything")}).call(this)}));return (function (){var id = XJSTParser._getLocalId(),res = ["begin"];es.forEach((function (x){res["push"].apply(res,x[(0)])}));res.push(t);es.reverse().forEach((function (x){res["push"].apply(res,x[(1)])}));return res}).call(this)}).call(this)},
"localExprs":function(){var $elf=this,_fromIdx=this.input.idx,e1,es,e2;return this._or((function(){return (function(){e1=this._apply("localExpr");return [e1]}).call(this)}),(function(){return (function(){this._form((function(){return (function(){this._applyWithArgs("exactly","binop");this._applyWithArgs("exactly",",");es=this._apply("localExprs");return e2=this._apply("localExpr")}).call(this)}));return (function (){es.push(e2);return es}).call(this)}).call(this)}))},
"localExpr":function(){var $elf=this,_fromIdx=this.input.idx,n,p,v,k,o,p,v,k,o,p,v;return this._or((function(){return (function(){this._form((function(){return (function(){this._applyWithArgs("exactly","set");p=this._form((function(){return (function(){this._applyWithArgs("exactly","get");return n=this._apply("anything")}).call(this)}));return v=this._apply("anything")}).call(this)}));return (function (){var id = XJSTParser._getLocalId();return [[["var",[("__v" + id),p]],["set",["get",n],v]],[["set",["get",n],["get",("__v" + id)]]]]}).call(this)}).call(this)}),(function(){return (function(){this._form((function(){return (function(){this._applyWithArgs("exactly","set");p=this._form((function(){return (function(){this._applyWithArgs("exactly","getp");k=this._apply("const");return o=this._apply("anything")}).call(this)}));return v=this._apply("anything")}).call(this)}));return (function (){var id = XJSTParser._getLocalId(),vTree = ["getp",k,["get",("__o" + id)]];return [[["var",[("__o" + id),o],[("__v" + id),vTree]],["set",vTree,v]],[["set",vTree,["get",("__v" + id)]]]]}).call(this)}).call(this)}),(function(){return (function(){this._form((function(){return (function(){this._applyWithArgs("exactly","set");p=this._form((function(){return (function(){this._applyWithArgs("exactly","getp");k=this._apply("anything");return o=this._apply("anything")}).call(this)}));return v=this._apply("anything")}).call(this)}));return (function (){var id = XJSTParser._getLocalId(),vTree = ["getp",["get",("__k" + id)],["get",("__o" + id)]];return [[["var",[("__o" + id),o],[("__k" + id),k],[("__v" + id),vTree]],["set",vTree,v]],[["set",vTree,["get",("__v" + id)]]]]}).call(this)}).call(this)}))},
"subMatch":function(){var $elf=this,_fromIdx=this.input.idx,e1,c,c,e2,e3;return this._or((function(){return (function(){this._form((function(){return (function(){this._applyWithArgs("exactly","binop");this._applyWithArgs("exactly","===");e1=this._apply("anything");return c=this._apply("const")}).call(this)}));return [e1,c]}).call(this)}),(function(){return (function(){this._form((function(){return (function(){this._applyWithArgs("exactly","binop");this._applyWithArgs("exactly","===");c=this._apply("const");return e2=this._apply("anything")}).call(this)}));return [e2,c]}).call(this)}),(function(){return (function(){e3=this._apply("anything");return [["unop","!",e3],["get","false"]]}).call(this)}))},
"expr2match":function(){var $elf=this,_fromIdx=this.input.idx,ms,m1,m2;return this._or((function(){return (function(){this._form((function(){return (function(){this._applyWithArgs("exactly","binop");this._applyWithArgs("exactly","&&");ms=this._apply("expr2match");return m1=this._apply("subMatch")}).call(this)}));return (function (){ms.push(m1);return ms}).call(this)}).call(this)}),(function(){return (function(){m2=this._apply("subMatch");return [m2]}).call(this)}))},
"template":function(){var $elf=this,_fromIdx=this.input.idx,m,b;return (function(){this._applyWithArgs("token","template");this._applyWithArgs("token","(");m=this._apply("expr");this._applyWithArgs("token",")");b=this._apply("stmt");return [XJSTParser.match(m,"expr2match"),b]}).call(this)},
"topLevel":function(){var $elf=this,_fromIdx=this.input.idx,t,s,ts;return (function(){ts=this._many1((function(){return this._or((function(){return (function(){t=this._apply("template");return ["template",t]}).call(this)}),(function(){return (function(){s=this._apply("srcElem");return ["stmt",s]}).call(this)}))}));this._apply("spaces");this._apply("end");return XJSTParser._splitTemplates(ts)}).call(this)}});(XJSTParser["_getLocalIdCounter"]=(0));(XJSTParser["_getLocalId"]=(function (){return this["_getLocalIdCounter"]++}));(XJSTParser["_splitTemplates"]=(function (ts){var templates = [],other = [],i = undefined;while((i=ts.shift())){((i[(0)] == "template")?templates.unshift(i[(1)]):other.push(i[(1)]))};return [other,XJSTParser._identify(templates)]}));(XJSTParser["_identify"]=(function (templates){var predicates = new Identifier();templates.forEach((function (template){template[(0)].forEach((function (subMatch){subMatch.unshift(predicates.identify(subMatch[(0)]))}))}));return templates}));var XJSTCompiler=exports.XJSTCompiler=objectThatDelegatesTo(BSJSTranslator,{
"subMatch":function(){var $elf=this,_fromIdx=this.input.idx,id,m,id,e,c;return this._or((function(){return (function(){this._form((function(){return (function(){id=this._apply("anything");m=this._apply("trans");return this._form((function(){return (function(){this._applyWithArgs("exactly","get");return this._applyWithArgs("exactly","true")}).call(this)}))}).call(this)}));return m}).call(this)}),(function(){return (function(){this._form((function(){return (function(){id=this._apply("anything");e=this._apply("trans");return c=this._apply("trans")}).call(this)}));return ((e + " === ") + c)}).call(this)}))},
"tMatch":function(){var $elf=this,_fromIdx=this.input.idx,m,ms;return this._or((function(){return (function(){this._form((function(){return m=this._apply("subMatch")}));return m}).call(this)}),(function(){return (function(){this._form((function(){return ms=this._many1((function(){return this._apply("subMatch")}))}));return ms.join(" && ")}).call(this)}))},
"tBody":function(){var $elf=this,_fromIdx=this.input.idx,e;return (function(){e=this._apply("trans");return e}).call(this)},
"template":function(){var $elf=this,_fromIdx=this.input.idx,m,b;return (function(){this._form((function(){return (function(){m=this._apply("tMatch");return b=this._apply("tBody")}).call(this)}));return (((("    if(" + m) + ") {") + b) + ";return}")}).call(this)},
"templates":function(){var $elf=this,_fromIdx=this.input.idx,ts;return (function(){this._form((function(){return ts=this._many((function(){return this._apply("template")}))}));return (("exports.apply = function(c){\n" + ts.join("\n")) + "\n};")}).call(this)},
"other":function(){var $elf=this,_fromIdx=this.input.idx,o;return (function(){this._form((function(){return o=this._many((function(){return this._apply("trans")}))}));return o.join(";")}).call(this)},
"topLevel":function(){var $elf=this,_fromIdx=this.input.idx,o,t;return (function(){this._form((function(){return (function(){o=this._apply("other");return t=this._apply("templates")}).call(this)}));return (((("(function(exports){" + o) + ";") + t) + "return exports})(typeof exports === \"undefined\"? {} : exports)")}).call(this)}})}
